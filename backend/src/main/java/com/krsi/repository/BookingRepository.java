package com.krsi.repository;

import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.BookingRequests;
import com.krsi.dto.response.BookingResponse;
import com.krsi.model.BookingStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BookingRepository {
    private static final String SELECT = """
            SELECT b.*, w.name AS warehouse_name, w.district AS warehouse_location, w.owner_id AS warehouse_owner_id,
                   COALESCE(u.full_name, 'Depositor') AS depositor_name, c.image_url,
                   (SELECT e.id FROM enwrs e WHERE e.booking_id = b.id ORDER BY e.id LIMIT 1) AS enwr_id
            FROM bookings b
            JOIN warehouses w ON w.id = b.warehouse_id
            JOIN users u ON u.id = b.depositor_id
            JOIN commodities c ON c.name = b.commodity""";

    /** Who may see which bookings: depositors their own, owners their warehouses', auditors all. */
    public record Scope(Long depositorId, Long warehouseOwnerId) {
        public static Scope all() { return new Scope(null, null); }
    }

    private final JdbcTemplate jdbc;

    public BookingRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public long insert(long depositorId, String warehouseId, String commodity, String grade, BigDecimal qtl, LocalDate preferredDate) {
        Long id = jdbc.queryForObject("""
                INSERT INTO bookings (depositor_id, warehouse_id, commodity, grade, quantity_qtl, preferred_date, status)
                VALUES (?, ?, ?, ?, ?, ?, 'PENDING') RETURNING id""", Long.class,
                depositorId, warehouseId, commodity, grade, qtl, preferredDate);
        return id;
    }

    public Optional<BookingResponse> find(long id) {
        return jdbc.query(SELECT + " WHERE b.id = ?", BookingRepository::map, id).stream().findFirst();
    }

    /** Owner of the warehouse a booking is for. */
    public Optional<Long> warehouseOwner(long bookingId) {
        return jdbc.query("SELECT w.owner_id FROM bookings b JOIN warehouses w ON w.id = b.warehouse_id WHERE b.id = ?",
                (rs, i) -> rs.getLong(1), bookingId).stream().findFirst();
    }

    public PageResponse<BookingResponse> search(BookingRequests.Search s, Scope scope) {
        SqlFilter f = filter(s, scope);
        int size = s.size() == null ? 20 : s.size();
        int page = s.page() == null ? 0 : s.page();
        String from = " FROM bookings b JOIN warehouses w ON w.id = b.warehouse_id" + f.where();
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + from, Long.class, f.args());
        List<BookingResponse> items = jdbc.query(SELECT + f.where() + " ORDER BY b.created_at DESC, b.id DESC LIMIT ? OFFSET ?",
                BookingRepository::map, f.args(size, page * size));
        return PageResponse.of(items, page, size, total == null ? 0 : total);
    }

    /** Moves PENDING/ACCEPTED -> new status atomically; false if the booking was not in an allowed state. */
    public boolean transition(long id, List<BookingStatus> from, BookingStatus to, String note) {
        String placeholders = String.join(",", from.stream().map(x -> "?").toList());
        Object[] args = new Object[from.size() + 3];
        args[0] = to.name();
        args[1] = note;
        args[2] = id;
        for (int i = 0; i < from.size(); i++) args[i + 3] = from.get(i).name();
        return jdbc.update("UPDATE bookings SET status = ?, decision_note = COALESCE(?, decision_note), decided_at = now() "
                + "WHERE id = ? AND status IN (" + placeholders + ")", args) == 1;
    }

    public void setLedgerHash(long id, String hash) { jdbc.update("UPDATE bookings SET ledger_hash = ? WHERE id = ?", hash, id); }

    public long countForOwner(long ownerId, BookingStatus status) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM bookings b JOIN warehouses w ON w.id = b.warehouse_id WHERE w.owner_id = ? AND b.status = ?",
                Long.class, ownerId, status.name());
        return n == null ? 0 : n;
    }

    public List<BookingResponse> latest(Scope scope, BookingStatus status, int limit) {
        SqlFilter f = filter(new BookingRequests.Search(null, status, null, null, null, 0, limit), scope);
        return jdbc.query(SELECT + f.where() + " ORDER BY b.created_at DESC LIMIT ?", BookingRepository::map, f.args(limit));
    }

    private static SqlFilter filter(BookingRequests.Search s, Scope scope) {
        return new SqlFilter()
                .eq("b.depositor_id", scope.depositorId())
                .eq("w.owner_id", scope.warehouseOwnerId())
                .search(s.q(), "b.commodity", "w.name", "w.district", "w.address", "b.code")
                .eq("b.status", s.status() == null ? null : s.status().name())
                .ieq("b.commodity", s.commodity())
                .rawIf(s.date() != null, "b.created_at::date = ?", s.date())
                .eq("b.warehouse_id", s.warehouseId());
    }

    static BookingResponse map(ResultSet rs, int row) throws SQLException {
        BigDecimal qtl = rs.getBigDecimal("quantity_qtl");
        return new BookingResponse(rs.getLong("id"), rs.getString("code"), rs.getString("commodity"), rs.getString("grade"),
                rs.getString("image_url"), qtl, qtl.divide(BigDecimal.TEN, 3, RoundingMode.HALF_UP), Rows.date(rs, "preferred_date"),
                BookingStatus.valueOf(rs.getString("status")), rs.getString("warehouse_id"), rs.getString("warehouse_name"),
                rs.getString("warehouse_location"), rs.getLong("depositor_id"), rs.getString("depositor_name"),
                rs.getString("decision_note"), Rows.instant(rs, "created_at"), Rows.instant(rs, "decided_at"),
                Rows.longOrNull(rs, "enwr_id"), rs.getString("ledger_hash"));
    }
}
