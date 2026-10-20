package com.krsi.dto.request;

import com.krsi.model.InvoiceStatus;
import com.krsi.model.LoanStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public final class FinanceRequests {
    private FinanceRequests() {}

    @Schema(description = "Storage Invoice filters")
    public record InvoiceSearch(
            @Schema(description = "Matches commodity, warehouse, location or invoice number") @Size(max = 80) String q,
            @Schema(description = "PENDING, OVERDUE, PAID or CANCELLED") InvoiceStatus status,
            @Size(max = 60) String commodity,
            @Min(0) Integer page, @Min(1) @Max(100) Integer size) {}

    @Schema(description = "Record a payment. No payment gateway is wired in; pass the gateway's reference when you add one")
    public record PayInvoice(@Size(max = 80) @Schema(example = "UPI-4185-2299") String paymentRef) {}

    @Schema(description = "Get Loan / Apply For Loan against a receipt")
    public record ApplyLoan(
            @NotNull Long enwrId,
            @NotNull @Positive @DecimalMax("1000000000") @Schema(description = "Must not exceed eligibility.maxAmount", example = "100000") BigDecimal amount) {}

    @Schema(description = "Repay Loan")
    public record Repay(@NotNull @Positive @DecimalMax("1000000000") BigDecimal amount) {}

    public record LoanSearch(LoanStatus status, @Min(0) Integer page, @Min(1) @Max(100) Integer size) {}
}
