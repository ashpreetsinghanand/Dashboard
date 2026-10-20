package com.krsi.repository;

import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.FinanceRequests;
import com.krsi.dto.response.FinanceResponses.Invoice;
import com.krsi.dto.response.FinanceResponses.Loan;
import com.krsi.model.InvoiceStatus;
import com.krsi.model.LoanStatus;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Storage invoices and loans. */
@Repository
public class FinanceRepository {
    private static final String INVOICE_VIEW = """
            SELECT i.id, i.invoice_no, i.commodity, i.grade, c.image_url, i.quantity_mt, i.enwr_id, e.receipt_no, i.warehouse_id,
                   w.name AS warehouse_name, w.district AS warehouse_location, w.owner_id AS warehouse_owner_id, i.depositor_id,
                   COALESCE(u.full_name, 'Depositor') AS depositor_name, i.period_from, i.period_to, i.rate_per_mt_month, i.amount,
                   i.due_date, CASE WHEN i.status = 'PENDING' AND i.due_date < CURRENT_DATE THEN 'OVERDUE' ELSE i.status END AS status,
                   i.paid_at, i.payment_ref, i.created_at, i.ledger_hash
            FROM invoices i
            JOIN enwrs e ON e.id = i.enwr_id
            JOIN warehouses w ON w.id = i.warehouse_id
            JOIN users u ON u.id = i.depositor_id
            JOIN commodities c ON c.name = i.commodity""";

    private static final String LOAN_VIEW = """
            SELECT n.*, e.receipt_no, e.commodity, e.quantity_mt FROM loans n JOIN enwrs e ON e.id = n.enwr_id""";

    public record InvoiceCore(long id, long depositorId, long warehouseOwnerId, String status, BigDecimal amount) {}

    public record LoanCore(long id, long enwrId, long borrowerId, BigDecimal outstanding, LoanStatus status) {}

    private final JdbcTemplate jdbc;

    public FinanceRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    // ---------- invoices ----------

    public long insertInvoice(long enwrId, long depositorId, String warehouseId, String commodity, String grade, BigDecimal qty,
                              LocalDate from, LocalDate to, BigDecimal rate, BigDecimal amount, LocalDate due) {
        Long id = jdbc.queryForObject("""
                INSERT INTO invoices (enwr_id, depositor_id, warehouse_id, commodity, grade, quantity_mt, period_from, period_to,
                  rate_per_mt_month, amount, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING') RETURNING id""",
                Long.class, enwrId, depositorId, warehouseId, commodity, grade, qty, from, to, rate, amount, due);
        return id;
    }

    public Optional<Invoice> invoice(long id, String currency) {
        return jdbc.query("SELECT * FROM (" + INVOICE_VIEW + ") v WHERE v.id = ?", (rs, i) -> mapInvoice(rs, currency), id).stream().findFirst();
    }

    public Optional<InvoiceCore> invoiceCoreForUpdate(long id) {
        return jdbc.query("""
                SELECT i.id, i.depositor_id, w.owner_id, i.status, i.amount FROM invoices i JOIN warehouses w ON w.id = i.warehouse_id
                WHERE i.id = ? FOR UPDATE OF i""", (rs, i) -> new InvoiceCore(rs.getLong(1), rs.getLong(2), rs.getLong(3),
                rs.getString(4), rs.getBigDecimal(5)), id).stream().findFirst();
    }

    public PageResponse<Invoice> invoices(FinanceRequests.InvoiceSearch s, Long depositorId, Long warehouseOwnerId, String currency) {
        SqlFilter f = new SqlFilter().eq("v.depositor_id", depositorId).eq("v.warehouse_owner_id", warehouseOwnerId)
                .search(s.q(), "v.commodity", "v.warehouse_name", "v.warehouse_location", "v.invoice_no", "v.receipt_no")
                .eq("v.status", s.status() == null ? null : s.status().name())
                .ieq("v.commodity", s.commodity());
        int size = s.size() == null ? 20 : s.size();
        int page = s.page() == null ? 0 : s.page();
        String from = " FROM (" + INVOICE_VIEW + ") v" + f.where();
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + from, Long.class, f.args());
        List<Invoice> items = jdbc.query("SELECT v.*" + from + " ORDER BY v.created_at DESC, v.id DESC LIMIT ? OFFSET ?",
                (rs, i) -> mapInvoice(rs, currency), f.args(size, page * size));
        return PageResponse.of(items, page, size, total == null ? 0 : total);
    }

    public void markPaid(long id, String paymentRef) {
        jdbc.update("UPDATE invoices SET status = 'PAID', paid_at = now(), payment_ref = ? WHERE id = ?", paymentRef, id);
    }

    public void markCancelled(long id) { jdbc.update("UPDATE invoices SET status = 'CANCELLED' WHERE id = ?", id); }

    public List<Long> cancelPendingForEnwr(long enwrId) {
        return jdbc.query("UPDATE invoices SET status = 'CANCELLED' WHERE enwr_id = ? AND status = 'PENDING' RETURNING id",
                (rs, i) -> rs.getLong(1), enwrId);
    }

    public long unpaidCountForEnwr(long enwrId) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM invoices WHERE enwr_id = ? AND status = 'PENDING'", Long.class, enwrId);
        return n == null ? 0 : n;
    }

    /** End of the latest billed storage period for a receipt (or of any receipt it was split from). */
    public Optional<LocalDate> lastBilledUntil(long enwrId) {
        return Optional.ofNullable(jdbc.queryForObject("SELECT MAX(period_to) FROM invoices WHERE enwr_id = ? AND status <> 'CANCELLED'",
                LocalDate.class, enwrId));
    }

    public void setInvoiceLedgerHash(long id, String hash) { jdbc.update("UPDATE invoices SET ledger_hash = ? WHERE id = ?", hash, id); }

    public BigDecimal unpaidForDepositor(long depositorId) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE depositor_id = ? AND status = 'PENDING'",
                BigDecimal.class, depositorId);
    }

    public record OwnerInvoiceTotals(BigDecimal collected, BigDecimal outstanding, long overdue) {}

    public OwnerInvoiceTotals ownerTotals(long ownerId) {
        return jdbc.queryForObject("""
                SELECT COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'PAID'), 0) AS collected,
                       COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'PENDING'), 0) AS outstanding,
                       COUNT(*) FILTER (WHERE i.status = 'PENDING' AND i.due_date < CURRENT_DATE) AS overdue
                FROM invoices i JOIN warehouses w ON w.id = i.warehouse_id WHERE w.owner_id = ?""",
                (rs, i) -> new OwnerInvoiceTotals(rs.getBigDecimal(1), rs.getBigDecimal(2), rs.getLong(3)), ownerId);
    }

    // ---------- loans ----------

    public long insertLoan(long enwrId, long borrowerId, BigDecimal principal, BigDecimal ratePct) {
        Long id = jdbc.queryForObject("""
                INSERT INTO loans (enwr_id, borrower_id, principal, outstanding, interest_rate_pct, status)
                VALUES (?, ?, ?, ?, ?, 'ACTIVE') RETURNING id""", Long.class, enwrId, borrowerId, principal, principal, ratePct);
        return id;
    }

    public Optional<Loan> loan(long id, String currency) {
        return jdbc.query(LOAN_VIEW + " WHERE n.id = ?", (rs, i) -> mapLoan(rs, currency), id).stream().findFirst();
    }

    public Optional<LoanCore> loanForUpdate(long id) {
        return jdbc.query("SELECT * FROM loans WHERE id = ? FOR UPDATE", (rs, i) -> new LoanCore(rs.getLong("id"), rs.getLong("enwr_id"),
                rs.getLong("borrower_id"), rs.getBigDecimal("outstanding"), LoanStatus.valueOf(rs.getString("status"))), id).stream().findFirst();
    }

    public PageResponse<Loan> loans(long borrowerId, FinanceRequests.LoanSearch s, String currency) {
        SqlFilter f = new SqlFilter().eq("n.borrower_id", borrowerId).eq("n.status", s.status() == null ? null : s.status().name());
        int size = s.size() == null ? 20 : s.size();
        int page = s.page() == null ? 0 : s.page();
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM loans n" + f.where(), Long.class, f.args());
        List<Loan> items = jdbc.query(LOAN_VIEW + f.where() + " ORDER BY n.sanctioned_at DESC LIMIT ? OFFSET ?",
                (rs, i) -> mapLoan(rs, currency), f.args(size, page * size));
        return PageResponse.of(items, page, size, total == null ? 0 : total);
    }

    public void repay(long id, BigDecimal amount, boolean close) {
        jdbc.update("UPDATE loans SET outstanding = outstanding - ?, status = ?, closed_at = CASE WHEN ? THEN now() ELSE closed_at END WHERE id = ?",
                amount, close ? "CLOSED" : "ACTIVE", close, id);
    }

    public void setLoanLedgerHash(long id, String hash) { jdbc.update("UPDATE loans SET ledger_hash = ? WHERE id = ?", hash, id); }

    public record LoanTotals(BigDecimal activePrincipal, BigDecimal outstanding) {}

    public LoanTotals loanTotals(long borrowerId) {
        return jdbc.queryForObject("""
                SELECT COALESCE(SUM(principal) FILTER (WHERE status = 'ACTIVE'), 0) AS active_principal,
                       COALESCE(SUM(outstanding) FILTER (WHERE status = 'ACTIVE'), 0) AS outstanding
                FROM loans WHERE borrower_id = ?""", (rs, i) -> new LoanTotals(rs.getBigDecimal(1), rs.getBigDecimal(2)), borrowerId);
    }

    // ---------- mapping ----------

    static Invoice mapInvoice(ResultSet rs, String currency) throws SQLException {
        LocalDate from = Rows.date(rs, "period_from");
        LocalDate to = Rows.date(rs, "period_to");
        return new Invoice(rs.getLong("id"), rs.getString("invoice_no"), rs.getString("commodity"), rs.getString("grade"),
                rs.getString("image_url"), rs.getBigDecimal("quantity_mt"), rs.getLong("enwr_id"), rs.getString("receipt_no"),
                rs.getString("warehouse_id"), rs.getString("warehouse_name"), rs.getString("warehouse_location"),
                rs.getLong("depositor_id"), rs.getString("depositor_name"), from, to, (int) ChronoUnit.DAYS.between(from, to),
                rs.getBigDecimal("rate_per_mt_month"), rs.getBigDecimal("amount"), currency, Rows.date(rs, "due_date"),
                InvoiceStatus.valueOf(rs.getString("status")), Rows.instant(rs, "paid_at"), rs.getString("payment_ref"),
                Rows.instant(rs, "created_at"), rs.getString("ledger_hash"));
    }

    static Loan mapLoan(ResultSet rs, String currency) throws SQLException {
        return new Loan(rs.getLong("id"), rs.getString("code"), rs.getLong("borrower_id"), rs.getLong("enwr_id"), rs.getString("receipt_no"), rs.getString("commodity"),
                rs.getBigDecimal("quantity_mt"), rs.getBigDecimal("principal"), rs.getBigDecimal("outstanding"),
                rs.getBigDecimal("interest_rate_pct"), currency, LoanStatus.valueOf(rs.getString("status")),
                Rows.instant(rs, "sanctioned_at"), Rows.instant(rs, "closed_at"), rs.getString("ledger_hash"));
    }
}
