package com.krsi.dto.request;

import com.krsi.model.EnwrStatus;
import com.krsi.model.InspectionDecision;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public final class EnwrRequests {
    private EnwrRequests() {}

    @Schema(description = "My eNWR filters (all optional)")
    public record Search(
            @Schema(description = "Matches commodity, grade, warehouse or receipt number") @Size(max = 80) String q,
            @Size(max = 60) String commodity,
            EnwrStatus status,
            @Size(max = 60) String warehouseId,
            @Min(0) Integer page,
            @Min(1) @Max(100) Integer size) {}

    @Schema(description = "Auditor's quality inspection of a newly deposited lot")
    public record Inspection(
            @NotNull InspectionDecision decision,
            @NotBlank @Size(max = 40) @Schema(example = "Grade A") String grade,
            @DecimalMin("0") @DecimalMax("100") @Schema(example = "11.2") BigDecimal moisturePct,
            @DecimalMin("0") @DecimalMax("100") @Schema(example = "0.8") BigDecimal foreignMatterPct,
            @Size(max = 1000) String remarks) {}
}
