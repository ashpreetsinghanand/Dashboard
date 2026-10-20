package com.krsi.dto.response;

import com.krsi.model.BookingStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Schema(description = "A row of the Booking Request table")
public record BookingResponse(
        long id, @Schema(example = "BK-000012") String code, String commodity, String grade, String imageUrl,
        BigDecimal quantityQtl, BigDecimal quantityMt, LocalDate preferredDate,
        @Schema(description = "PENDING, ACCEPTED, REJECTED, CANCELLED or DEPOSITED") BookingStatus status,
        String warehouseId, String warehouseName, @Schema(example = "Lalitpur, UP") String warehouseLocation,
        long depositorId, String depositorName, String decisionNote,
        @Schema(description = "'Requested On' column") Instant createdAt, Instant decidedAt,
        @Schema(description = "Receipt issued for this booking, once deposited", nullable = true) Long enwrId,
        @Schema(description = "Latest ledger block for this booking") String ledgerHash) {}
