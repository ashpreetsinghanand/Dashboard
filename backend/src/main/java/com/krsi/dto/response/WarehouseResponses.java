package com.krsi.dto.response;

import com.krsi.model.AuditResult;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class WarehouseResponses {
    private WarehouseResponses() {}

    @Schema(description = "Warehouse card on Find A Warehouse")
    public record Summary(
            @Schema(example = "nayak") String id, String name, @Schema(example = "Lalitpur, Uttar Pradesh") String address,
            @Schema(example = "Lalitpur, UP") String district, String state,
            @Schema(description = "Null when no search origin is known", nullable = true, example = "12.4") BigDecimal distanceKm,
            BigDecimal totalCapacityMt, BigDecimal availableCapacityMt, BigDecimal storageRatePerMtMonth,
            List<String> crops, String imageUrl, boolean wdraRegistered, boolean verified, BigDecimal rating, int ratingCount) {}

    @Schema(description = "Warehouse Details screen")
    public record Details(
            String id, String name, String legalName, String code, String operator, String type, String description,
            String address, String district, String state, double latitude, double longitude,
            BigDecimal totalCapacityMt, BigDecimal availableCapacityMt, BigDecimal occupancyMt, BigDecimal storageRatePerMtMonth,
            String currency, List<String> crops, List<String> amenities, List<String> licenses, List<String> photos,
            List<Attribute> infrastructure, String suitableFor, String accessHours, String connectivity,
            Integer yearEstablished, Integer totalAreaSqft, BigDecimal rating, int ratingCount,
            boolean wdraRegistered, boolean verified, long ownerId, String ownerName,
            @Schema(nullable = true) AuditView latestAudit, String ledgerHash, Instant createdAt) {}

    public record Attribute(String label, String value) {}

    @Schema(description = "The four stat tiles on Find A Warehouse")
    public record Stats(long verifiedWarehouses, long totalWarehouses, BigDecimal totalCapacityMt,
                        @Schema(description = "Share of warehouses whose latest audit passed") BigDecimal qualityVerifiedPercent,
                        long statesCovered) {}

    @Schema(description = "A physical audit of a warehouse")
    public record AuditView(long id, String code, String warehouseId, String warehouseName, long auditorId, String auditorName,
                            LocalDate auditedOn, AuditResult result, BigDecimal rating, BigDecimal stockRecordedMt,
                            BigDecimal stockVerifiedMt, @Schema(description = "verified - recorded") BigDecimal varianceMt,
                            String findings, String ledgerHash, Instant createdAt) {}
}
