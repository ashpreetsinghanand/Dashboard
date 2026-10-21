package com.krsi.service;

import com.krsi.dto.response.NotificationResponses;
import com.krsi.ledger.LedgerEvent;
import com.krsi.repository.NotificationRepository;
import com.krsi.security.AuthUser;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * In-app notifications. Every ledger event is published by the ledger; once the business transaction commits,
 * this turns it into a notification for each person it affects (never the person who acted). Runs in its own
 * transaction, so a notification problem can never undo the business change.
 */
@Service
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    record Note(List<Long> to, String title, String body, String link) {}

    private final NotificationRepository notifications;

    public NotificationService(NotificationRepository notifications) { this.notifications = notifications; }

    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(LedgerEvent event) {
        try {
            for (Note note : notesFor(event))
                for (long user : note.to())
                    if (event.actor() == null || user != event.actor().id())
                        notifications.insert(user, event.type().name(), note.title(), note.body(), note.link());
        } catch (RuntimeException e) {
            log.warn("Notifications for {} {}#{} not written: {}", event.type(), event.entityType(), event.entityId(), e.toString());
        }
    }

    public NotificationResponses.Feed feed(AuthUser me, int limit) { return notifications.feed(me.id(), Math.max(1, Math.min(limit, 50))); }

    public void markRead(AuthUser me, long id) { notifications.markRead(me.id(), id); }

    public void markAllRead(AuthUser me) { notifications.markAllRead(me.id()); }

    List<Note> notesFor(LedgerEvent e) {
        Map<String, ?> p = e.payload();
        return switch (e.type()) {
            case BOOKING_REQUESTED -> List.of(new Note(notifications.warehouseOwnerOfBooking(id(e)), "New booking request",
                    code("BK", id(e)) + ": " + qty(p.get("quantityQtl")) + " qtl of " + p.get("commodity") + ", arriving " + day(p.get("preferredDate")),
                    "/store/booking"));
            case BOOKING_ACCEPTED -> List.of(new Note(notifications.depositorOfBooking(id(e)), "Booking accepted",
                    code("BK", id(e)) + " was accepted. Bring your produce on the agreed date.", "/store/booking"));
            case BOOKING_REJECTED -> List.of(new Note(notifications.depositorOfBooking(id(e)), "Booking rejected",
                    code("BK", id(e)) + " was rejected" + reason(p.get("note")), "/store/booking"));
            case BOOKING_CANCELLED -> List.of(new Note(notifications.warehouseOwnerOfBooking(id(e)), "Booking cancelled",
                    code("BK", id(e)) + " was cancelled by the depositor.", "/store/booking"));
            case PRODUCE_DEPOSITED -> List.of(
                    new Note(List.of(num(p.get("depositorId"))), "Produce received", qty(p.get("netWeightMt")) + " MT of " + p.get("commodity")
                            + " is stored. Receipt " + code("ENWR", id(e)) + " is waiting for quality inspection.", "/trade/enwr"),
                    new Note(notifications.auditors(), "Lot waiting for inspection",
                            code("ENWR", id(e)) + ": " + qty(p.get("netWeightMt")) + " MT of " + p.get("commodity"), "/audit/inspections"));
            case ENWR_ISSUED -> List.of(new Note(List.of(num(p.get("ownerId"))), "Receipt approved",
                    p.get("receiptNo") + " passed inspection. You can now sell it or take a loan against it.", "/trade/enwr"));
            case ENWR_REJECTED -> List.of(new Note(List.of(num(p.get("ownerId"))), "Receipt rejected",
                    p.get("receiptNo") + " did not pass quality inspection.", "/store/booking"));
            case ENWR_RELEASED -> List.of(new Note(List.of(num(p.get("ownerId"))), "Goods released",
                    p.get("receiptNo") + ": " + qty(p.get("quantityMt")) + " MT handed back. The receipt is now closed.", "/trade/enwr"));
            case BID_PLACED -> List.of(new Note(notifications.sellerOfBid(id(e)), "New bid",
                    qty(p.get("quantityMt")) + " MT at ₹" + qty(p.get("pricePerMt")) + "/MT on " + code("LST", num(p.get("listingId"))), "/trade/listing"));
            case BID_REJECTED -> List.of(new Note(notifications.buyerOfBid(id(e)), "Bid rejected",
                    code("BID", id(e)) + " was rejected" + reason(p.get("reason")), "/trade/bid"));
            case BID_WITHDRAWN -> List.of(new Note(notifications.sellerOfBid(id(e)), "Bid withdrawn",
                    code("BID", id(e)) + " was withdrawn by the buyer.", "/trade/listing"));
            case TRADE_SETTLED -> List.of(new Note(List.of(num(p.get("buyerId"))), "Bid accepted",
                    "You bought " + qty(p.get("quantityMt")) + " MT of " + p.get("commodity") + " for ₹" + qty(p.get("totalValue"))
                            + ". Receipt " + code("ENWR", num(p.get("buyerEnwrId"))) + " is now yours.", "/trade/enwr"));
            case INVOICE_ISSUED -> List.of(new Note(notifications.holderOfInvoice(id(e)), "Storage invoice",
                    code("INV", id(e)) + ": ₹" + qty(p.get("amount")) + ", due " + day(p.get("dueDate")), "/store/invoice"));
            case INVOICE_PAID -> List.of(new Note(notifications.warehouseOwnerOfInvoice(id(e)), "Invoice paid",
                    code("INV", id(e)) + ": ₹" + qty(p.get("amount")) + " received.", "/store/invoice"));
            case WAREHOUSE_AUDITED -> List.of(new Note(notifications.warehouseOwner(String.valueOf(p.get("warehouseId"))), "Warehouse audited",
                    "Audit " + code("AUD", id(e)) + " result: " + String.valueOf(p.get("result")).replace('_', ' ').toLowerCase(Locale.ROOT) + ".",
                    "/owner/warehouses"));
            default -> List.of();
        };
    }

    private static long id(LedgerEvent e) { return Long.parseLong(String.valueOf(e.entityId())); }

    private static long num(Object v) { return ((Number) v).longValue(); }

    private static String code(String prefix, long id) { return String.format("%s-%06d", prefix, id); }

    private static String qty(Object v) { return v instanceof BigDecimal d ? d.stripTrailingZeros().toPlainString() : String.valueOf(v); }

    private static String day(Object v) { return v instanceof LocalDate d ? DAY.format(d) : String.valueOf(v); }

    private static String reason(Object v) { return v == null || v.toString().isBlank() ? "." : ": " + v.toString().trim() + "."; }
}
