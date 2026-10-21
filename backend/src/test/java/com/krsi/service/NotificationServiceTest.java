package com.krsi.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.krsi.ledger.LedgerEvent;
import com.krsi.ledger.LedgerEventType;
import com.krsi.ledger.Payload;
import com.krsi.model.Role;
import com.krsi.repository.NotificationRepository;
import com.krsi.security.AuthUser;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class NotificationServiceTest {
    /** Owner of every warehouse is user 3, every booking's depositor is user 1, auditors are 4 and 5. */
    static class FakeRepository extends NotificationRepository {
        final List<String> sent = new ArrayList<>();

        FakeRepository() { super(null); }

        @Override public void insert(long userId, String eventType, String title, String body, String link) {
            sent.add(userId + "|" + title + "|" + body + "|" + link);
        }
        @Override public List<Long> warehouseOwnerOfBooking(long bookingId) { return List.of(3L); }
        @Override public List<Long> depositorOfBooking(long bookingId) { return List.of(1L); }
        @Override public List<Long> auditors() { return List.of(4L, 5L); }
    }

    final FakeRepository repo = new FakeRepository();
    final NotificationService service = new NotificationService(repo);
    final AuthUser farmer = new AuthUser(1, Role.FARMER, null, "0xfarmer");
    final AuthUser owner = new AuthUser(3, Role.WAREHOUSE_OWNER, null, "0xowner");

    @Test void bookingRequestGoesToTheWarehouseOwner() {
        service.on(LedgerEvent.of(LedgerEventType.BOOKING_REQUESTED, "BOOKING", 7L, farmer, Payload.of(
                "quantityQtl", new BigDecimal("50.00"), "commodity", "Maize", "preferredDate", LocalDate.of(2026, 10, 25))));
        assertThat(repo.sent).containsExactly("3|New booking request|BK-000007: 50 qtl of Maize, arriving 25 Oct 2026|/store/booking");
    }

    @Test void depositNotifiesTheDepositorAndEveryAuditor() {
        service.on(LedgerEvent.of(LedgerEventType.PRODUCE_DEPOSITED, "ENWR", 12L, owner, Payload.of(
                "depositorId", 1L, "netWeightMt", new BigDecimal("5.000"), "commodity", "Maize")));
        assertThat(repo.sent).extracting(s -> s.split("\\|")[0]).containsExactly("1", "4", "5");
        assertThat(repo.sent.get(0)).contains("Receipt ENWR-000012 is waiting for quality inspection");
    }

    @Test void theActorIsNeverNotifiedOfTheirOwnAction() {
        // A warehouse owner who books at their own warehouse must not be told about it.
        service.on(LedgerEvent.of(LedgerEventType.BOOKING_REQUESTED, "BOOKING", 8L, owner, Payload.of(
                "quantityQtl", BigDecimal.TEN, "commodity", "Maize", "preferredDate", LocalDate.of(2026, 10, 25))));
        assertThat(repo.sent).isEmpty();
    }

    @Test void rejectionCarriesTheOwnersNote() {
        service.on(LedgerEvent.of(LedgerEventType.BOOKING_REJECTED, "BOOKING", 9L, owner, Payload.of("bookingId", 9L, "note", "Full this month")));
        assertThat(repo.sent).containsExactly("1|Booking rejected|BK-000009 was rejected: Full this month.|/store/booking");
    }

    @Test void eventsWithoutAnAudienceAreIgnored() {
        service.on(LedgerEvent.of(LedgerEventType.LOAN_SANCTIONED, "LOAN", 1L, farmer, Payload.of("loanId", 1L)));
        assertThat(repo.sent).isEmpty();
    }
}
