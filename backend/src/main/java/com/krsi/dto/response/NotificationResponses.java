package com.krsi.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

public final class NotificationResponses {
    private NotificationResponses() {}

    @Schema(description = "One in-app notification")
    public record Item(
            long id,
            @Schema(description = "Ledger event that caused it", example = "BOOKING_ACCEPTED") String eventType,
            @Schema(example = "Booking accepted") String title,
            @Schema(example = "BK-000007 was accepted. Bring your produce on the agreed date.") String body,
            @Schema(description = "Dashboard route to open", example = "/store/booking") String link,
            Instant createdAt,
            boolean read) {}

    @Schema(description = "The signed-in user's latest notifications, newest first")
    public record Feed(@Schema(description = "Unread count across all notifications") long unread, List<Item> items) {}
}
