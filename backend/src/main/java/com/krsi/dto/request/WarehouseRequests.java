package com.krsi.dto.request;

import com.krsi.model.AuditResult;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class WarehouseRequests {
    private WarehouseRequests() {}

    public enum Sort { NEAREST, CAPACITY, NAME, RATING }

    @Schema(description = "Find A Warehouse filters (all optional)")
    public record Search(
            @Schema(description = "Matches name, address, district, state or a crop", example = "Lalitpur") @Size(max = 80) String q,
            @Schema(example = "Coffee") @Size(max = 60) String commodity,
            @Schema(description = "Search origin; defaults to the signed-in user's saved location", example = "24.69") @DecimalMin("-90") @DecimalMax("90") Double lat,
            @Schema(example = "78.42") @DecimalMin("-180") @DecimalMax("180") Double lng,
            @Schema(description = "Only with a known origin. 'Within 20 Km' -> 20", example = "100") @Positive @Max(2000) Integer radiusKm,
            @Schema(description = "'3,500 MT and above' -> 3500") @PositiveOrZero BigDecimal minAvailableMt,
            @Schema(description = "'Up to 3,000 MT' -> 3000") @Positive BigDecimal maxAvailableMt,
            @Schema(description = "Only warehouses verified by an auditor") Boolean verifiedOnly,
            @Schema(description = "NEAREST (default), CAPACITY, NAME or RATING") Sort sort,
            @Min(0) Integer page,
            @Min(1) @Max(100) Integer size) {

        public int pageOrDefault() { return page == null ? 0 : page; }

        public int sizeOrDefault() { return size == null ? 12 : size; }
    }

    @Schema(description = "A label/value row of the Infrastructure Details card")
    public record Attribute(@NotBlank @Size(max = 60) String label, @NotBlank @Size(max = 120) String value) {}

    @Schema(description = "Create or update a warehouse (warehouse owner)")
    public record Upsert(
            @Pattern(regexp = "[a-z0-9][a-z0-9-]{1,39}", message = "must be 2-40 lowercase letters, digits or '-'")
            @Schema(description = "URL id used in /store/:id. Create only; generated from the name when omitted", example = "nayak") String slug,
            @NotBlank @Size(max = 100) @Schema(example = "Nayak Warehouse") String name,
            @NotBlank @Size(max = 120) @Schema(example = "Nayak Stone Industries") String legalName,
            @NotBlank @Size(max = 40) @Schema(description = "WDRA / state registration code", example = "WAH-UP-0823") String code,
            @NotBlank @Size(max = 120) String operator,
            @Size(max = 40) @Schema(example = "Private") String type,
            @Size(max = 1000) String description,
            @NotBlank @Size(max = 160) @Schema(example = "Lalitpur, Uttar Pradesh") String address,
            @NotBlank @Size(max = 80) @Schema(example = "Lalitpur, UP") String district,
            @NotBlank @Size(max = 60) @Schema(example = "Uttar Pradesh") String state,
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
            @NotNull @Positive @Schema(example = "5000") BigDecimal totalCapacityMt,
            @NotNull @Positive @Schema(description = "Storage charge per MT per month", example = "120") BigDecimal storageRatePerMtMonth,
            @NotEmpty @Size(max = 30) List<@NotBlank String> crops,
            @Size(max = 60) List<@NotBlank String> amenities,
            @Size(max = 20) List<@NotBlank String> licenses,
            @Size(max = 12) List<@NotBlank String> photos,
            @Size(max = 200) String suitableFor,
            @Size(max = 40) String accessHours,
            @Size(max = 200) String connectivity,
            @Min(1900) @Max(2100) Integer yearEstablished,
            @Positive Integer totalAreaSqft,
            Boolean wdraRegistered,
            @Size(max = 40) List<@Valid Attribute> infrastructure) {}

    @Schema(description = "Physical audit of a warehouse (auditor)")
    public record Audit(
            @NotNull AuditResult result,
            @NotNull @DecimalMin("0.0") @DecimalMax("5.0") @Schema(example = "4.5") BigDecimal rating,
            @NotNull @PositiveOrZero @Schema(description = "Stock counted on site; compared with the receipts on record") BigDecimal stockVerifiedMt,
            @NotBlank @Size(max = 2000) String findings,
            @PastOrPresent @Schema(description = "Defaults to today") LocalDate auditedOn) {}
}
