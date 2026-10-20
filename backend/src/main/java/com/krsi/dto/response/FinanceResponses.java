package com.krsi.dto.response;

import com.krsi.model.InvoiceStatus;
import com.krsi.model.LoanStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class FinanceResponses {
    private FinanceResponses() {}

    @Schema(description = "A storage invoice (a row of Storage Invoice)")
    public record Invoice(
            long id, @Schema(example = "INV-000125") String invoiceNo, String commodity, String grade, String imageUrl,
            BigDecimal quantityMt, long enwrId, String receiptNo, String warehouseId, String warehouseName, String warehouseLocation,
            long depositorId, String depositorName, @Schema(description = "Storage Period start") LocalDate periodFrom,
            LocalDate periodTo, int storageDays, BigDecimal ratePerMtMonth,
            @Schema(description = "Total Amount") BigDecimal amount, String currency, LocalDate dueDate,
            @Schema(description = "PENDING, OVERDUE (derived), PAID or CANCELLED") InvoiceStatus status,
            Instant paidAt, String paymentRef, Instant createdAt, String ledgerHash) {}

    @Schema(description = "A loan against a receipt")
    public record Loan(
            long id, @Schema(example = "LN-000001") String code, long borrowerId, long enwrId, String receiptNo, String commodity, BigDecimal quantityMt,
            BigDecimal principal, BigDecimal outstanding, BigDecimal interestRatePct, String currency, LoanStatus status,
            Instant sanctionedAt, Instant closedAt, String ledgerHash) {}

    @Schema(description = "How much can be borrowed against a receipt")
    public record LoanEligibility(long enwrId, String receiptNo, boolean eligible, @Schema(nullable = true) String reason,
                                  BigDecimal marketValue, BigDecimal loanToValue, BigDecimal maxAmount, BigDecimal interestRatePct,
                                  String currency) {}
}
