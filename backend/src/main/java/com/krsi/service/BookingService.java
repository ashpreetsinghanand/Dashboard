package com.krsi.service;

import com.krsi.config.AppProperties;
import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.BookingRequests;
import com.krsi.dto.response.BookingResponse;
import com.krsi.dto.response.DepositResult;
import com.krsi.dto.response.EnwrResponse;
import com.krsi.dto.response.FinanceResponses.Invoice;
import com.krsi.exception.ApiException;
import com.krsi.ledger.BlockchainLedger;
import com.krsi.ledger.EntityProof;
import com.krsi.ledger.LedgerEvent;
import com.krsi.ledger.LedgerEventType;
import com.krsi.ledger.Payload;
import com.krsi.model.BookingStatus;
import com.krsi.model.EnwrStatus;
import com.krsi.model.Role;
import com.krsi.repository.BookingRepository;
import com.krsi.repository.EnwrRepository;
import com.krsi.repository.WarehouseRepository;
import com.krsi.security.AuthUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Storage bookings: depositor requests -> warehouse owner accepts/rejects -> owner records the deposit,
 * which issues a receipt (pending inspection) and the first storage invoice.
 */
@Service
public class BookingService {
    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookings;
    private final WarehouseRepository warehouses;
    private final EnwrRepository enwrs;
    private final EnwrService enwrService;
    private final InvoiceService invoices;
    private final MarketService market;
    private final BlockchainLedger ledger;
    private final AppProperties.Business business;
    private final KycService kyc;

    public BookingService(BookingRepository bookings, WarehouseRepository warehouses, EnwrRepository enwrs, EnwrService enwrService,
                          InvoiceService invoices, MarketService market, BlockchainLedger ledger, AppProperties properties, KycService kyc) {
        this.kyc = kyc;
        this.bookings = bookings;
        this.warehouses = warehouses;
        this.enwrs = enwrs;
        this.enwrService = enwrService;
        this.invoices = invoices;
        this.market = market;
        this.ledger = ledger;
        this.business = properties.business();
    }

    @Transactional
    public BookingResponse create(AuthUser me, BookingRequests.Create r) {
        kyc.requireVerifiedForBooking(me);
        WarehouseRepository.Core w = warehouses.core(r.warehouseId()).orElseThrow(() -> ApiException.notFound("Warehouse", r.warehouseId()));
        String commodity = market.canonical(r.commodity());
        if (w.crops().stream().noneMatch(c -> c.equalsIgnoreCase(commodity)))
            throw ApiException.invalid(w.name() + " does not store " + commodity + ". Accepted: " + String.join(", ", w.crops()));
        if (r.preferredDate().isBefore(LocalDate.now())) throw ApiException.invalid("Date cannot be in the past");
        BigDecimal mt = toMt(r.quantityQtl());
        if (mt.compareTo(w.availableCapacityMt()) > 0)
            throw ApiException.state(w.name() + " has only " + w.availableCapacityMt().stripTrailingZeros().toPlainString() + " MT free");
        String grade = r.grade() == null || r.grade().isBlank() ? "Raw" : r.grade().trim();
        long id = bookings.insert(me.id(), w.id(), commodity, grade, r.quantityQtl(), r.preferredDate());
        record(me, id, LedgerEventType.BOOKING_REQUESTED, Payload.of("bookingId", id, "warehouseId", w.id(), "commodity", commodity,
                "grade", grade, "quantityQtl", r.quantityQtl(), "preferredDate", r.preferredDate()));
        log.info("Booking {} requested by user {} at {}", id, me.id(), w.id());
        return find(id);
    }

    public PageResponse<BookingResponse> search(AuthUser me, BookingRequests.Search s) {
        return bookings.search(s, scope(me));
    }

    public BookingResponse get(AuthUser me, long id) {
        BookingResponse b = find(id);
        if (!canView(me, b)) throw ApiException.notFound("Booking", id);
        return b;
    }

    public EntityProof history(AuthUser me, long id) {
        get(me, id);
        return ledger.proof("BOOKING", Long.toString(id));
    }

    @Transactional
    public BookingResponse accept(AuthUser me, long id, String note) {
        requireWarehouseOwner(me, id);
        BookingResponse b = find(id);
        if (toMt(b.quantityQtl()).compareTo(warehouses.core(b.warehouseId()).orElseThrow().availableCapacityMt()) > 0)
            throw ApiException.state("Not enough free capacity to accept this booking");
        if (!bookings.transition(id, List.of(BookingStatus.PENDING), BookingStatus.ACCEPTED, note))
            throw ApiException.state("Only PENDING bookings can be accepted");
        record(me, id, LedgerEventType.BOOKING_ACCEPTED, Payload.of("bookingId", id, "note", note));
        return find(id);
    }

    @Transactional
    public BookingResponse reject(AuthUser me, long id, String note) {
        requireWarehouseOwner(me, id);
        if (!bookings.transition(id, List.of(BookingStatus.PENDING, BookingStatus.ACCEPTED), BookingStatus.REJECTED, note))
            throw ApiException.state("Only PENDING or ACCEPTED bookings can be rejected");
        record(me, id, LedgerEventType.BOOKING_REJECTED, Payload.of("bookingId", id, "note", note));
        return find(id);
    }

    @Transactional
    public BookingResponse cancel(AuthUser me, long id) {
        BookingResponse b = find(id);
        if (b.depositorId() != me.id()) throw ApiException.forbidden("Only the depositor can cancel this booking");
        if (!bookings.transition(id, List.of(BookingStatus.PENDING, BookingStatus.ACCEPTED), BookingStatus.CANCELLED, null))
            throw ApiException.state("Only PENDING or ACCEPTED bookings can be cancelled");
        record(me, id, LedgerEventType.BOOKING_CANCELLED, Payload.of("bookingId", id));
        return find(id);
    }

    @Transactional
    public DepositResult deposit(AuthUser me, long id, BookingRequests.Deposit r) {
        requireWarehouseOwner(me, id);
        BookingResponse b = find(id);
        if (b.status() != BookingStatus.ACCEPTED) throw ApiException.state("Produce can only be received for ACCEPTED bookings");
        BigDecimal mt = r.netWeightMt() != null ? r.netWeightMt() : toMt(b.quantityQtl());
        LocalDate storedOn = r.storedOn() != null ? r.storedOn() : LocalDate.now();
        String grade = r.grade() != null && !r.grade().isBlank() ? r.grade().trim() : b.grade();
        if (!warehouses.reserveCapacity(b.warehouseId(), mt)) throw ApiException.state("Not enough free capacity for " + mt.toPlainString() + " MT");
        if (!bookings.transition(id, List.of(BookingStatus.ACCEPTED), BookingStatus.DEPOSITED, null))
            throw ApiException.state("Booking changed while recording the deposit; refresh and retry");

        LocalDate validTill = storedOn.plusDays(business.receiptValidityDays());
        long enwrId = enwrs.insert(id, null, b.depositorId(), b.depositorId(), b.warehouseId(), b.commodity(), grade, mt, storedOn,
                validTill, EnwrStatus.PENDING_AUDIT, r.moisturePct());
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.PRODUCE_DEPOSITED, "ENWR", enwrId, me, Payload.of(
                "bookingId", id, "enwrId", enwrId, "warehouseId", b.warehouseId(), "depositorId", b.depositorId(),
                "commodity", b.commodity(), "grade", grade, "netWeightMt", mt, "storedOn", storedOn, "validTill", validTill,
                "moisturePct", r.moisturePct()))).hash();
        enwrs.setLedgerHash(enwrId, hash);
        bookings.setLedgerHash(id, hash);

        Invoice invoice = invoices.issue(me, enwrs.core(enwrId).orElseThrow(), storedOn);
        log.info("Booking {} deposited: {} MT, receipt {}", id, mt, enwrId);
        EnwrResponse receipt = enwrService.view(me, enwrId);
        return new DepositResult(find(id), receipt, invoice);
    }

    private void record(AuthUser me, long id, LedgerEventType type, java.util.Map<String, Object> payload) {
        bookings.setLedgerHash(id, ledger.record(LedgerEvent.of(type, "BOOKING", id, me, payload)).hash());
    }

    private void requireWarehouseOwner(AuthUser me, long bookingId) {
        long owner = bookings.warehouseOwner(bookingId).orElseThrow(() -> ApiException.notFound("Booking", bookingId));
        if (owner != me.id()) throw ApiException.forbidden("Only the warehouse owner can do this");
    }

    private BookingResponse find(long id) { return bookings.find(id).orElseThrow(() -> ApiException.notFound("Booking", id)); }

    private boolean canView(AuthUser me, BookingResponse b) {
        return me.role() == Role.AUDITOR || b.depositorId() == me.id()
                || warehouses.core(b.warehouseId()).map(w -> w.ownerId() == me.id()).orElse(false);
    }

    BookingRepository.Scope scope(AuthUser me) {
        return switch (me.role()) {
            case FARMER, MERCHANT -> new BookingRepository.Scope(me.id(), null);
            case WAREHOUSE_OWNER -> new BookingRepository.Scope(null, me.id());
            case AUDITOR -> BookingRepository.Scope.all();
        };
    }

    static BigDecimal toMt(BigDecimal qtl) { return qtl.divide(BigDecimal.TEN, 3, RoundingMode.HALF_UP); }
}
