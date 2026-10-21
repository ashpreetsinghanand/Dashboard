package com.krsi.repository;

import com.krsi.dto.response.NotificationResponses;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Notifications plus the "who should hear about this" lookups NotificationService needs. */
@Repository
public class NotificationRepository {
    private final JdbcTemplate jdbc;

    public NotificationRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void insert(long userId, String eventType, String title, String body, String link) {
        jdbc.update("INSERT INTO notifications (user_id, event_type, title, body, link) VALUES (?, ?, ?, ?, ?)",
                userId, eventType, title, body, link);
    }

    public NotificationResponses.Feed feed(long userId, int limit) {
        List<NotificationResponses.Item> items = jdbc.query("""
                SELECT id, event_type, title, body, link, created_at, read_at IS NOT NULL AS read
                FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?""",
                (rs, i) -> new NotificationResponses.Item(rs.getLong("id"), rs.getString("event_type"), rs.getString("title"),
                        rs.getString("body"), rs.getString("link"), Rows.instant(rs, "created_at"), rs.getBoolean("read")),
                userId, limit);
        Long unread = jdbc.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL", Long.class, userId);
        return new NotificationResponses.Feed(unread == null ? 0 : unread, items);
    }

    public void markRead(long userId, long id) {
        jdbc.update("UPDATE notifications SET read_at = now() WHERE id = ? AND user_id = ? AND read_at IS NULL", id, userId);
    }

    public void markAllRead(long userId) {
        jdbc.update("UPDATE notifications SET read_at = now() WHERE user_id = ? AND read_at IS NULL", userId);
    }

    // ---------- recipients ----------

    public List<Long> warehouseOwnerOfBooking(long bookingId) {
        return ids("SELECT w.owner_id FROM bookings b JOIN warehouses w ON w.id = b.warehouse_id WHERE b.id = ?", bookingId);
    }

    public List<Long> depositorOfBooking(long bookingId) { return ids("SELECT depositor_id FROM bookings WHERE id = ?", bookingId); }

    public List<Long> sellerOfBid(long bidId) {
        return ids("SELECT l.seller_id FROM bids b JOIN listings l ON l.id = b.listing_id WHERE b.id = ?", bidId);
    }

    public List<Long> buyerOfBid(long bidId) { return ids("SELECT buyer_id FROM bids WHERE id = ?", bidId); }

    public List<Long> holderOfInvoice(long invoiceId) { return ids("SELECT depositor_id FROM invoices WHERE id = ?", invoiceId); }

    public List<Long> warehouseOwnerOfInvoice(long invoiceId) {
        return ids("SELECT w.owner_id FROM invoices i JOIN warehouses w ON w.id = i.warehouse_id WHERE i.id = ?", invoiceId);
    }

    public List<Long> warehouseOwner(String warehouseId) { return ids("SELECT owner_id FROM warehouses WHERE id = ?", warehouseId); }

    public List<Long> auditors() { return ids("SELECT id FROM users WHERE role = 'AUDITOR' AND status = 'ACTIVE'"); }

    private List<Long> ids(String sql, Object... args) { return jdbc.queryForList(sql, Long.class, args); }
}
