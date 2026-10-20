package com.krsi.dto.response;

import com.krsi.model.EnwrStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Schema(description = "Electronic negotiable warehouse receipt (a row of My eNWR)")
public record EnwrResponse(
        long id, @Schema(example = "ENWR-000007") String receiptNo, String commodity, String grade, String imageUrl,
        BigDecimal quantityMt, String warehouseId, String warehouseName, String warehouseLocation,
        long ownerId, String ownerName, long depositorId,
        @Schema(description = "'Stored On' column") LocalDate storedOn, LocalDate validTill,
        @Schema(description = "'Valid Till: 180 Days' = days from today to validTill") long daysRemaining,
        @Schema(description = "PENDING_AUDIT, ACTIVE, LISTED, PLEDGED, SOLD, RELEASED or REJECTED") EnwrStatus status,
        BigDecimal moisturePct, BigDecimal foreignMatterPct, String qualityRemarks,
        @Schema(nullable = true) String inspectedBy, @Schema(nullable = true) Instant inspectedAt,
        @Schema(description = "Latest market price per MT for this commodity", nullable = true) BigDecimal marketPricePerMt,
        @Schema(description = "quantity x market price", nullable = true) BigDecimal estimatedValue,
        @Schema(nullable = true) Long bookingId, @Schema(description = "Receipt this one was split from", nullable = true) Long parentId,
        @Schema(nullable = true) Long activeListingId, @Schema(nullable = true) Long activeLoanId,
        @Schema(description = "Actions the signed-in user can take on this receipt now") Actions actions,
        String ledgerHash, Instant createdAt) {

    @Schema(description = "Drive the action buttons from these flags")
    public record Actions(boolean canList, boolean canApplyLoan, boolean canInspect, boolean canRelease) {}
}
