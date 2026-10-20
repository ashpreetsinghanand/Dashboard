package com.krsi.repository;

import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.EnwrRequests;
import com.krsi.dto.response.EnwrResponse;
import com.krsi.model.EnwrStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class EnwrRepository {
    private static final String SELECT = """
            SELECT e.*, w.name AS warehouse_name, w.district AS warehouse_location, w.owner_id AS warehouse_owner_id,
                   COALESCE(o.full_name, 'Holder') AS owner_name, COALESCE(i.full_name, 'Auditor') AS inspector_name, c.image_url,
                   p.price_per_kg * 1000 AS market_price_per_mt,
                   (SELECT l.id FROM listings l WHERE l.enwr_id = e.id AND l.status = 'ACTIVE' ORDER BY l.id DESC LIMIT 1) AS active_listing_id,
                   (SELECT n.id FROM loans n WHERE n.enwr_id = e.id AND n.status = 'ACTIVE' ORDER BY n.id DESC LIMIT 1) AS active_loan_id
            FROM enwrs e
            JOIN warehouses w ON w.id = e.warehouse_id
            JOIN users o ON o.id = e.owner_id
            JOIN commodities c ON c.name = e.commodity
            LEFT JOIN users i ON i.id = e.inspected_by
            LEFT JOIN commodity_prices p ON p.commodity = e.commodity""";

    /** Raw receipt state for business rules. */
    public record Core(long id, String receiptNo, long ownerId, long depositorId, String warehouseId, long warehouseOwnerId,
                       String commodity, String grade, BigDecimal quantityMt, LocalDate storedOn, LocalDate validTill, EnwrStatus status) {}

    public record Scope(Long ownerId, Long warehouseOwnerId) {
        public static Scope all() { return new Scope(null, null); }
    }

    /** Fills in the per-viewer action flags while mapping rows. */
    public interface ActionsResolver extends Function<Core, EnwrResponse.Actions> {}

    private final JdbcTemplate jdbc;

    public EnwrRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public long insert(Long bookingId, Long parentId, long ownerId, long depositorId, String warehouseId, String commodity, String grade,
                       BigDecimal quantityMt, LocalDate storedOn, LocalDate validTill, EnwrStatus status, BigDecimal moisturePct) {
        Long id = jdbc.queryForObject("""
                INSERT INTO enwrs (booking_id, parent_id, owner_id, depositor_id, warehouse_id, commodity, grade, quantity_mt,
                  stored_on, valid_till, status, moisture_pct)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""", Long.class,
                bookingId, parentId, ownerId, depositorId, warehouseId, commodity, grade, quantityMt, storedOn, validTill,
                status.name(), moisturePct);
        return id;
    }

    /** Copies quality data from the parent when a receipt is split by a partial sale. */
    public void copyQuality(long fromId, long toId) {
        jdbc.update("""
                UPDATE enwrs t SET moisture_pct = f.moisture_pct, foreign_matter_pct = f.foreign_matter_pct,
                  quality_remarks = f.quality_remarks, inspected_by = f.inspected_by, inspected_at = f.inspected_at
                FROM enwrs f WHERE f.id = ? AND t.id = ?""", fromId, toId);
    }

    public Optional<Core> core(long id) {
        return jdbc.query("""
                SELECT e.*, w.owner_id AS warehouse_owner_id FROM enwrs e JOIN warehouses w ON w.id = e.warehouse_id WHERE e.id = ?""",
                EnwrRepository::mapCore, id).stream().findFirst();
    }

    /** Locks the receipt row for the rest of the transaction (prevents double list/pledge/sell). */
    public Optional<Core> coreForUpdate(long id) {
        return jdbc.query("""
                SELECT e.*, w.owner_id AS warehouse_owner_id FROM enwrs e JOIN warehouses w ON w.id = e.warehouse_id
                WHERE e.id = ? FOR UPDATE OF e""", EnwrRepository::mapCore, id).stream().findFirst();
    }

    public Optional<EnwrResponse> find(long id, ActionsResolver actions) {
        return jdbc.query(SELECT + " WHERE e.id = ?", (rs, i) -> map(rs, actions), id).stream().findFirst();
    }

    public PageResponse<EnwrResponse> search(EnwrRequests.Search s, Scope scope, ActionsResolver actions) {
        SqlFilter f = new SqlFilter()
                .eq("e.owner_id", scope.ownerId())
                .eq("w.owner_id", scope.warehouseOwnerId())
                .search(s.q(), "e.commodity", "e.grade", "w.name", "w.district", "e.receipt_no")
                .ieq("e.commodity", s.commodity())
                .eq("e.status", s.status() == null ? null : s.status().name())
                .eq("e.warehouse_id", s.warehouseId());
        int size = s.size() == null ? 20 : s.size();
        int page = s.page() == null ? 0 : s.page();
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM enwrs e JOIN warehouses w ON w.id = e.warehouse_id" + f.where(), Long.class, f.args());
        List<EnwrResponse> items = jdbc.query(SELECT + f.where() + " ORDER BY e.created_at DESC, e.id DESC LIMIT ? OFFSET ?",
                (rs, i) -> map(rs, actions), f.args(size, page * size));
        return PageResponse.of(items, page, size, total == null ? 0 : total);
    }

    public boolean transition(long id, List<EnwrStatus> from, EnwrStatus to) {
        String placeholders = String.join(",", from.stream().map(x -> "?").toList());
        Object[] args = new Object[from.size() + 2];
        args[0] = to.name();
        args[1] = id;
        for (int i = 0; i < from.size(); i++) args[i + 2] = from.get(i).name();
        return jdbc.update("UPDATE enwrs SET status = ?, updated_at = now() WHERE id = ? AND status IN (" + placeholders + ")", args) == 1;
    }

    public void recordInspection(long id, EnwrStatus status, String grade, BigDecimal moisture, BigDecimal foreignMatter,
                                 String remarks, long inspectorId) {
        jdbc.update("""
                UPDATE enwrs SET status = ?, grade = ?, moisture_pct = COALESCE(?, moisture_pct), foreign_matter_pct = ?,
                  quality_remarks = ?, inspected_by = ?, inspected_at = now(), updated_at = now()
                WHERE id = ?""", status.name(), grade, moisture, foreignMatter, remarks, inspectorId, id);
    }

    public void reduceQuantity(long id, BigDecimal by) {
        jdbc.update("UPDATE enwrs SET quantity_mt = quantity_mt - ?, updated_at = now() WHERE id = ?", by, id);
    }

    public void transferOwnership(long id, long newOwnerId, EnwrStatus status) {
        jdbc.update("UPDATE enwrs SET owner_id = ?, status = ?, updated_at = now() WHERE id = ?", newOwnerId, status.name(), id);
    }

    public void setLedgerHash(long id, String hash) { jdbc.update("UPDATE enwrs SET ledger_hash = ? WHERE id = ?", hash, id); }

    /** MT held by a user in receipts that still represent stored produce. */
    public BigDecimal heldBy(long ownerId) {
        return jdbc.queryForObject("""
                SELECT COALESCE(SUM(quantity_mt), 0) FROM enwrs
                WHERE owner_id = ? AND status IN ('PENDING_AUDIT', 'ACTIVE', 'LISTED', 'PLEDGED')""", BigDecimal.class, ownerId);
    }

    /** MT on record at a warehouse (what an audit should find on site). */
    public BigDecimal storedAt(String warehouseId) {
        return jdbc.queryForObject("""
                SELECT COALESCE(SUM(quantity_mt), 0) FROM enwrs
                WHERE warehouse_id = ? AND status IN ('PENDING_AUDIT', 'ACTIVE', 'LISTED', 'PLEDGED')""", BigDecimal.class, warehouseId);
    }

    public long countByStatus(EnwrStatus status) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM enwrs WHERE status = ?", Long.class, status.name());
        return n == null ? 0 : n;
    }

    public List<EnwrResponse> byStatus(EnwrStatus status, int limit, ActionsResolver actions) {
        return jdbc.query(SELECT + " WHERE e.status = ? ORDER BY e.created_at LIMIT ?", (rs, i) -> map(rs, actions), status.name(), limit);
    }

    static Core mapCore(ResultSet rs, int row) throws SQLException {
        return new Core(rs.getLong("id"), rs.getString("receipt_no"), rs.getLong("owner_id"), rs.getLong("depositor_id"),
                rs.getString("warehouse_id"), rs.getLong("warehouse_owner_id"), rs.getString("commodity"), rs.getString("grade"),
                rs.getBigDecimal("quantity_mt"), Rows.date(rs, "stored_on"), Rows.date(rs, "valid_till"),
                EnwrStatus.valueOf(rs.getString("status")));
    }

    private static EnwrResponse map(ResultSet rs, ActionsResolver actions) throws SQLException {
        Core core = mapCore(rs, 0);
        BigDecimal price = rs.getBigDecimal("market_price_per_mt");
        BigDecimal value = price == null ? null : price.multiply(core.quantityMt()).setScale(2, RoundingMode.HALF_UP);
        long days = Math.max(0, ChronoUnit.DAYS.between(LocalDate.now(), core.validTill()));
        boolean inspected = rs.getTimestamp("inspected_at") != null;
        return new EnwrResponse(core.id(), core.receiptNo(), core.commodity(), core.grade(), rs.getString("image_url"),
                core.quantityMt(), core.warehouseId(), rs.getString("warehouse_name"), rs.getString("warehouse_location"),
                core.ownerId(), rs.getString("owner_name"), core.depositorId(), core.storedOn(), core.validTill(), days, core.status(),
                rs.getBigDecimal("moisture_pct"), rs.getBigDecimal("foreign_matter_pct"), rs.getString("quality_remarks"),
                inspected ? rs.getString("inspector_name") : null, Rows.instant(rs, "inspected_at"),
                price == null ? null : price.setScale(2, RoundingMode.HALF_UP), value,
                Rows.longOrNull(rs, "booking_id"), Rows.longOrNull(rs, "parent_id"), Rows.longOrNull(rs, "active_listing_id"),
                Rows.longOrNull(rs, "active_loan_id"), actions.apply(core), rs.getString("ledger_hash"), Rows.instant(rs, "created_at"));
    }
}
