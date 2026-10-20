package com.krsi.service;

import com.krsi.config.AppProperties;
import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.TradeRequests;
import com.krsi.dto.response.BookingResponse;
import com.krsi.dto.response.DashboardResponse;
import com.krsi.dto.response.DashboardResponse.Task;
import com.krsi.dto.response.StatTile;
import com.krsi.dto.response.TradeResponses.Bid;
import com.krsi.dto.response.WarehouseResponses.Summary;
import com.krsi.ledger.LedgerRepository;
import com.krsi.model.BidStatus;
import com.krsi.model.BookingStatus;
import com.krsi.model.EnwrStatus;
import com.krsi.model.User;
import com.krsi.repository.BookingRepository;
import com.krsi.repository.EnwrRepository;
import com.krsi.repository.FinanceRepository;
import com.krsi.repository.MarketRepository;
import com.krsi.repository.TradeRepository;
import com.krsi.repository.WarehouseRepository;
import com.krsi.security.AuthUser;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

/** Builds the role-specific home screen. */
@Service
public class DashboardService {
    private final AuthService auth;
    private final EnwrRepository enwrs;
    private final EnwrService enwrService;
    private final TradeRepository trades;
    private final FinanceRepository finance;
    private final BookingRepository bookings;
    private final WarehouseRepository warehouses;
    private final MarketRepository market;
    private final LedgerRepository ledger;
    private final String currency;

    public DashboardService(AuthService auth, EnwrRepository enwrs, EnwrService enwrService, TradeRepository trades,
                            FinanceRepository finance, BookingRepository bookings, WarehouseRepository warehouses,
                            MarketRepository market, LedgerRepository ledger, AppProperties properties) {
        this.auth = auth;
        this.enwrs = enwrs;
        this.enwrService = enwrService;
        this.trades = trades;
        this.finance = finance;
        this.bookings = bookings;
        this.warehouses = warehouses;
        this.market = market;
        this.ledger = ledger;
        this.currency = properties.business().currency();
    }

    public DashboardResponse dashboard(AuthUser me) {
        User user = auth.load(me.id());
        List<StatTile> activity = new ArrayList<>();
        List<Task> tasks = new ArrayList<>();
        switch (me.role()) {
            case FARMER -> {
                FinanceRepository.LoanTotals loans = finance.loanTotals(me.id());
                activity.add(StatTile.mt("storedProduce", "Stored Produce", enwrs.heldBy(me.id()), null));
                activity.add(StatTile.money("activeLoan", "Active Loan", loans.activePrincipal(), null));
                activity.add(StatTile.money("totalSales", "Total Sales", trades.salesTotal(me.id()), null));
                activity.add(StatTile.money("pendingRepayment", "Pending Repayment", loans.outstanding(), null));
                activity.add(StatTile.money("unpaidStorage", "Unpaid Storage Invoices", finance.unpaidForDepositor(me.id()), null));
                depositorTasks(me, tasks);
                long offers = trades.pendingOffersForSeller(me.id());
                if (offers > 0) tasks.add(new Task("OFFERS", 0, offers + " offer(s) on your listings", "Review and accept or reject", "ACTIVE", "/trade/listing"));
            }
            case MERCHANT -> {
                TradeRepository.BidStats bids = trades.bidStats(me.id());
                activity.add(StatTile.mt("holdings", "Stored Produce", enwrs.heldBy(me.id()), null));
                activity.add(StatTile.count("activeBids", "Active Bids", bids.active(), null));
                activity.add(StatTile.money("totalPurchases", "Total Purchases", trades.purchasesTotal(me.id()), null));
                activity.add(StatTile.money("totalSales", "Total Sales", trades.salesTotal(me.id()), null));
                activity.add(StatTile.money("unpaidStorage", "Unpaid Storage Invoices", finance.unpaidForDepositor(me.id()), null));
                PageResponse<Bid> recent = trades.myBids(me.id(), new TradeRequests.BidSearch(null, null, BidStatus.ACTIVE, 0, 5));
                recent.items().forEach(b -> tasks.add(new Task("BID", b.id(), b.commodity() + " - " + b.quantityMt().stripTrailingZeros().toPlainString() + " MT",
                        "At " + b.warehouseName() + " - waiting for the seller", b.status().name(), "/trade/bid")));
                depositorTasks(me, tasks);
            }
            case WAREHOUSE_OWNER -> {
                List<Summary> mine = warehouses.byOwner(me.id());
                BigDecimal total = mine.stream().map(Summary::totalCapacityMt).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal free = mine.stream().map(Summary::availableCapacityMt).reduce(BigDecimal.ZERO, BigDecimal::add);
                FinanceRepository.OwnerInvoiceTotals invoices = finance.ownerTotals(me.id());
                activity.add(StatTile.count("warehouses", "My Warehouses", mine.size(), null));
                activity.add(StatTile.mt("totalCapacity", "Total Capacity", total, null));
                activity.add(StatTile.mt("occupancy", "Current Occupancy", total.subtract(free), null));
                activity.add(StatTile.count("pendingBookings", "Pending Bookings", bookings.countForOwner(me.id(), BookingStatus.PENDING), null));
                activity.add(StatTile.money("collected", "Storage Revenue", invoices.collected(), null));
                activity.add(StatTile.money("outstanding", "Outstanding Invoices", invoices.outstanding(),
                        invoices.overdue() > 0 ? invoices.overdue() + " overdue" : null));
                BookingRepository.Scope scope = new BookingRepository.Scope(null, me.id());
                bookings.latest(scope, BookingStatus.PENDING, 5).forEach(b -> tasks.add(bookingTask(b, "Accept or reject")));
                bookings.latest(scope, BookingStatus.ACCEPTED, 5).forEach(b -> tasks.add(bookingTask(b, "Record arrival when produce comes in")));
            }
            case AUDITOR -> {
                List<Summary> due = warehouses.dueForAudit(LocalDate.now().minusDays(90), 5);
                activity.add(StatTile.count("pendingInspections", "Receipts Awaiting Inspection", enwrs.countByStatus(EnwrStatus.PENDING_AUDIT), null));
                activity.add(StatTile.count("warehousesDue", "Warehouses Due For Audit", warehouses.dueForAudit(LocalDate.now().minusDays(90), 1000).size(), "not audited in 90 days"));
                activity.add(StatTile.count("auditsThisMonth", "My Audits This Month", warehouses.countAuditsSince(me.id(), LocalDate.now().withDayOfMonth(1)), null));
                activity.add(StatTile.count("ledgerBlocks", "Ledger Blocks", ledger.count(), null));
                enwrService.pendingInspection(me, 5).forEach(e -> tasks.add(new Task("ENWR", e.id(), e.receiptNo() + " - " + e.commodity(),
                        e.quantityMt().stripTrailingZeros().toPlainString() + " MT at " + e.warehouseName(), e.status().name(), "/audit/inspections")));
                due.forEach(w -> tasks.add(new Task("WAREHOUSE", 0, w.name(), "Due for audit - " + w.district(), "DUE", "/store/" + w.id())));
            }
        }
        String location = user.district() != null ? user.district() : user.state();
        return new DashboardResponse(me.role(), user.displayName(), location, currency, activity, tasks, market.prices(me.id(), null, 4));
    }

    private void depositorTasks(AuthUser me, List<Task> tasks) {
        BookingRepository.Scope scope = new BookingRepository.Scope(me.id(), null);
        bookings.latest(scope, BookingStatus.ACCEPTED, 3).forEach(b -> tasks.add(bookingTask(b, "Accepted - take produce to the warehouse")));
        bookings.latest(scope, BookingStatus.PENDING, 3).forEach(b -> tasks.add(bookingTask(b, "Waiting for the warehouse")));
    }

    private static Task bookingTask(BookingResponse b, String subtitle) {
        return new Task("BOOKING", b.id(), b.commodity() + " - " + b.quantityQtl().stripTrailingZeros().toPlainString() + " Qtl at " + b.warehouseName(),
                subtitle, b.status().name(), "/store/booking");
    }

}
