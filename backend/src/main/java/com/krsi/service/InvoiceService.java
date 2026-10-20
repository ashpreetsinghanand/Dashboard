package com.krsi.service;

import com.krsi.config.AppProperties;
import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.FinanceRequests;
import com.krsi.dto.response.FinanceResponses.Invoice;
import com.krsi.exception.ApiException;
import com.krsi.ledger.BlockchainLedger;
import com.krsi.ledger.LedgerEvent;
import com.krsi.ledger.LedgerEventType;
import com.krsi.ledger.Payload;
import com.krsi.model.EnwrStatus;
import com.krsi.model.Role;
import com.krsi.repository.EnwrRepository;
import com.krsi.repository.FinanceRepository;
import com.krsi.repository.FinanceRepository.InvoiceCore;
import com.krsi.repository.WarehouseRepository;
import com.krsi.security.AuthUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

/**
 * Storage invoices: issued for the first storage period when produce is deposited, and for later periods on demand
 * by the warehouse owner. amount = quantity (MT) x monthly rate x days / 30.
 */
@Service
public class InvoiceService {
    private final FinanceRepository finance;
    private final EnwrRepository enwrs;
    private final WarehouseRepository warehouses;
    private final BlockchainLedger ledger;
    private final AppProperties.Business business;

    public InvoiceService(FinanceRepository finance, EnwrRepository enwrs, WarehouseRepository warehouses, BlockchainLedger ledger,
                          AppProperties properties) {
        this.finance = finance;
        this.enwrs = enwrs;
        this.warehouses = warehouses;
        this.ledger = ledger;
        this.business = properties.business();
    }

    /** Issues an invoice for one storage period starting at {@code from}. Runs inside the caller's transaction. */
    @Transactional
    public Invoice issue(AuthUser actor, EnwrRepository.Core receipt, LocalDate from) {
        WarehouseRepository.Core w = warehouses.core(receipt.warehouseId()).orElseThrow();
        LocalDate to = from.plusDays(business.storagePeriodDays());
        BigDecimal amount = receipt.quantityMt().multiply(w.storageRatePerMtMonth())
                .multiply(BigDecimal.valueOf(business.storagePeriodDays())).divide(BigDecimal.valueOf(30), 2, RoundingMode.HALF_UP);
        LocalDate due = LocalDate.now().plusDays(business.invoiceDueDays());
        long id = finance.insertInvoice(receipt.id(), receipt.ownerId(), receipt.warehouseId(), receipt.commodity(), receipt.grade(),
                receipt.quantityMt(), from, to, w.storageRatePerMtMonth(), amount, due);
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.INVOICE_ISSUED, "INVOICE", id, actor, Payload.of(
                "invoiceId", id, "enwrId", receipt.id(), "warehouseId", receipt.warehouseId(), "quantityMt", receipt.quantityMt(),
                "periodFrom", from, "periodTo", to, "amount", amount, "currency", business.currency(), "dueDate", due))).hash();
        finance.setInvoiceLedgerHash(id, hash);
        return get(id);
    }

    /** Warehouse owner bills the next storage period for a receipt still in store. */
    @Transactional
    public Invoice issueNextPeriod(AuthUser me, long enwrId) {
        EnwrRepository.Core receipt = enwrs.coreForUpdate(enwrId).orElseThrow(() -> ApiException.notFound("Receipt", enwrId));
        if (receipt.warehouseOwnerId() != me.id()) throw ApiException.forbidden("Only the warehouse owner can bill this receipt");
        if (!List.of(EnwrStatus.ACTIVE, EnwrStatus.LISTED, EnwrStatus.PLEDGED).contains(receipt.status()))
            throw ApiException.state("Only receipts still in store can be billed (status is " + receipt.status() + ")");
        LocalDate from = finance.lastBilledUntil(enwrId).orElse(receipt.storedOn());
        return issue(me, receipt, from);
    }

    public PageResponse<Invoice> search(AuthUser me, FinanceRequests.InvoiceSearch s) {
        return switch (me.role()) {
            case FARMER, MERCHANT -> finance.invoices(s, me.id(), null, business.currency());
            case WAREHOUSE_OWNER -> finance.invoices(s, null, me.id(), business.currency());
            case AUDITOR -> finance.invoices(s, null, null, business.currency());
        };
    }

    public Invoice get(AuthUser me, long id) {
        Invoice invoice = get(id);
        boolean allowed = me.role() == Role.AUDITOR || invoice.depositorId() == me.id()
                || warehouses.core(invoice.warehouseId()).map(w -> w.ownerId() == me.id()).orElse(false);
        if (!allowed) throw ApiException.notFound("Invoice", id);
        return invoice;
    }

    @Transactional
    public Invoice pay(AuthUser me, long id, String paymentRef) {
        InvoiceCore core = finance.invoiceCoreForUpdate(id).orElseThrow(() -> ApiException.notFound("Invoice", id));
        if (core.depositorId() != me.id()) throw ApiException.forbidden("Only the depositor can pay this invoice");
        if (!"PENDING".equals(core.status())) throw ApiException.state("This invoice is " + core.status() + " and cannot be paid");
        String ref = paymentRef == null || paymentRef.isBlank() ? "DEMO-" + System.currentTimeMillis() : paymentRef.trim();
        finance.markPaid(id, ref);
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.INVOICE_PAID, "INVOICE", id, me,
                Payload.of("invoiceId", id, "amount", core.amount(), "currency", business.currency(), "paymentRef", ref))).hash();
        finance.setInvoiceLedgerHash(id, hash);
        return get(id);
    }

    @Transactional
    public Invoice cancel(AuthUser me, long id) {
        InvoiceCore core = finance.invoiceCoreForUpdate(id).orElseThrow(() -> ApiException.notFound("Invoice", id));
        if (core.warehouseOwnerId() != me.id()) throw ApiException.forbidden("Only the warehouse owner can cancel this invoice");
        if (!"PENDING".equals(core.status())) throw ApiException.state("Only unpaid invoices can be cancelled");
        finance.markCancelled(id);
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.INVOICE_CANCELLED, "INVOICE", id, me, Payload.of("invoiceId", id))).hash();
        finance.setInvoiceLedgerHash(id, hash);
        return get(id);
    }

    /** Printable HTML invoice (the UI opens it in a new tab; the browser can save it as PDF). */
    public String renderHtml(AuthUser me, long id) {
        Invoice i = get(me, id);
        DateTimeFormatter d = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String row = "<tr><th>%s</th><td>%s</td></tr>";
        StringBuilder rows = new StringBuilder();
        rows.append(row.formatted("Invoice", esc(i.invoiceNo())))
                .append(row.formatted("Status", i.status()))
                .append(row.formatted("Depositor", esc(i.depositorName())))
                .append(row.formatted("Warehouse", esc(i.warehouseName() + ", " + i.warehouseLocation())))
                .append(row.formatted("Receipt", esc(i.receiptNo())))
                .append(row.formatted("Commodity", esc(i.commodity() + " (" + i.grade() + ")")))
                .append(row.formatted("Quantity", i.quantityMt().stripTrailingZeros().toPlainString() + " MT"))
                .append(row.formatted("Storage period", d.format(i.periodFrom()) + " to " + d.format(i.periodTo()) + " (" + i.storageDays() + " days)"))
                .append(row.formatted("Rate", i.ratePerMtMonth().toPlainString() + " " + i.currency() + " per MT per month"))
                .append(row.formatted("Amount", i.amount().toPlainString() + " " + i.currency()))
                .append(row.formatted("Due date", d.format(i.dueDate())))
                .append(row.formatted("Ledger transaction", esc(i.ledgerHash() == null ? "-" : i.ledgerHash())));
        return """
                <!doctype html><html><head><meta charset="utf-8"><title>%s</title>
                <style>body{font-family:system-ui,sans-serif;margin:40px;color:#1e1e1e}h1{color:#1F8955}
                table{border-collapse:collapse;width:100%%;max-width:720px}th,td{text-align:left;padding:8px;border-bottom:1px solid #eee}
                th{width:200px;color:#667085;font-weight:500}td{word-break:break-all}</style></head>
                <body><h1>KRSI Storage Invoice</h1><table>%s</table></body></html>""".formatted(esc(i.invoiceNo()), rows);
    }

    Invoice get(long id) {
        return finance.invoice(id, business.currency()).orElseThrow(() -> ApiException.notFound("Invoice", id));
    }

    private static String esc(String s) { return HtmlUtils.htmlEscape(s == null ? "" : s); }
}
