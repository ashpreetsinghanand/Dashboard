package com.krsi.dto.request;

import com.krsi.model.BookingStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;

public final class BookingRequests {
    private BookingRequests() {}

    @Schema(description = "Book Now modal")
    public record Create(
            @NotBlank @Size(max = 60) @Schema(example = "nayak") String warehouseId,
            @NotBlank @Size(max = 60) @Schema(example = "Wheat") String commodity,
            @Size(max = 40) @Schema(description = "Defaults to Raw", example = "Raw") String grade,
            @NotNull @Positive @DecimalMax("1000000") @Schema(description = "Quantity (in Quintal); 10 Qtl = 1 MT", example = "23") BigDecimal quantityQtl,
            @NotNull @Schema(description = "ISO date yyyy-MM-dd (the UI shows dd/MM/yyyy)", example = "2026-11-02") LocalDate preferredDate) {}

    @Schema(description = "Booking Request filters (all optional)")
    public record Search(
            @Schema(description = "Matches commodity, warehouse, location or booking code") @Size(max = 80) String q,
            BookingStatus status,
            @Size(max = 60) String commodity,
            @Schema(description = "Requested on this date (yyyy-MM-dd)") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Size(max = 60) String warehouseId,
            @Min(0) Integer page,
            @Min(1) @Max(100) Integer size) {}

    @Schema(description = "Accept / reject with an optional note to the depositor")
    public record Decision(@Size(max = 500) @Schema(example = "Bring produce between 9 am and 5 pm") String note) {}

    @Schema(description = "Warehouse owner records the actual arrival; this issues an eNWR pending quality inspection")
    public record Deposit(
            @Positive @DecimalMax("100000") @Schema(description = "Net weight received in MT; defaults to the booked quantity / 10", example = "2.3") BigDecimal netWeightMt,
            @Size(max = 40) @Schema(description = "Grade observed at intake; defaults to the booked grade") String grade,
            @PastOrPresent @Schema(description = "Defaults to today") LocalDate storedOn,
            @DecimalMin("0") @DecimalMax("100") @Schema(example = "11.5") BigDecimal moisturePct) {}
}
