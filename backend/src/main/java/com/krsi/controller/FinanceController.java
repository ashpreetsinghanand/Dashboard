package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.FinanceRequests;
import com.krsi.dto.response.FinanceResponses.Invoice;
import com.krsi.dto.response.FinanceResponses.Loan;
import com.krsi.dto.response.FinanceResponses.LoanEligibility;
import com.krsi.security.CurrentUser;
import com.krsi.service.InvoiceService;
import com.krsi.service.LoanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class FinanceController {
    private final InvoiceService invoices;
    private final LoanService loans;
    private final CurrentUser currentUser;

    public FinanceController(InvoiceService invoices, LoanService loans, CurrentUser currentUser) {
        this.invoices = invoices;
        this.loans = loans;
        this.currentUser = currentUser;
    }

    @Tag(name = OpenApiConfig.TAG_INVOICES)
    @Operation(summary = "Storage Invoice list",
            description = "Depositors: invoices billed to them. Warehouse owners: invoices of their warehouses. Auditors: all. "
                    + "status OVERDUE is derived from the due date.")
    @GetMapping("/invoices")
    public ApiResponse<PageResponse<Invoice>> invoices(@ParameterObject @Valid @ModelAttribute FinanceRequests.InvoiceSearch search) {
        return ApiResponse.ok(invoices.search(currentUser.require(), search));
    }

    @Tag(name = OpenApiConfig.TAG_INVOICES)
    @Operation(summary = "One invoice (View Details)")
    @GetMapping("/invoices/{id}")
    public ApiResponse<Invoice> invoice(@PathVariable long id) { return ApiResponse.ok(invoices.get(currentUser.require(), id)); }

    @Tag(name = OpenApiConfig.TAG_INVOICES)
    @Operation(summary = "Download: printable HTML invoice", description = "Fetch with the bearer token, then open the blob in a new tab.")
    @GetMapping("/invoices/{id}/download")
    public ResponseEntity<String> download(@PathVariable long id) {
        String html = invoices.renderHtml(currentUser.require(), id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"invoice-" + id + ".html\"")
                .contentType(new MediaType(MediaType.TEXT_HTML, java.nio.charset.StandardCharsets.UTF_8))
                .body(html);
    }

    @Tag(name = OpenApiConfig.TAG_INVOICES)
    @Operation(summary = "Pay an invoice (depositor)", description = "Records the payment; plug a payment gateway in front of this call.")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @PostMapping("/invoices/{id}/pay")
    public ApiResponse<Invoice> pay(@PathVariable long id, @Valid @RequestBody(required = false) FinanceRequests.PayInvoice body) {
        return ApiResponse.ok(invoices.pay(currentUser.require(), id, body == null ? null : body.paymentRef()));
    }

    @Tag(name = OpenApiConfig.TAG_INVOICES)
    @Operation(summary = "Cancel an unpaid invoice (warehouse owner)")
    @PreAuthorize("hasRole('WAREHOUSE_OWNER')")
    @PostMapping("/invoices/{id}/cancel")
    public ApiResponse<Invoice> cancel(@PathVariable long id) { return ApiResponse.ok(invoices.cancel(currentUser.require(), id)); }

    @Tag(name = OpenApiConfig.TAG_LOANS)
    @Operation(summary = "How much can I borrow against a receipt?")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @GetMapping("/loans/eligibility")
    public ApiResponse<LoanEligibility> eligibility(@RequestParam long enwrId) {
        return ApiResponse.ok(loans.eligibility(currentUser.require(), enwrId));
    }

    @Tag(name = OpenApiConfig.TAG_LOANS)
    @Operation(summary = "Apply For Loan (sanctioned instantly by the demo lender)", description = "The receipt becomes PLEDGED until repaid.")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @PostMapping("/loans")
    public ApiResponse<Loan> apply(@Valid @RequestBody FinanceRequests.ApplyLoan request) {
        return ApiResponse.ok(loans.apply(currentUser.require(), request));
    }

    @Tag(name = OpenApiConfig.TAG_LOANS)
    @Operation(summary = "My Loans")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @GetMapping("/loans/mine")
    public ApiResponse<PageResponse<Loan>> myLoans(@ParameterObject @Valid @ModelAttribute FinanceRequests.LoanSearch search) {
        return ApiResponse.ok(loans.mine(currentUser.require(), search));
    }

    @Tag(name = OpenApiConfig.TAG_LOANS)
    @Operation(summary = "One loan")
    @GetMapping("/loans/{id}")
    public ApiResponse<Loan> loan(@PathVariable long id) { return ApiResponse.ok(loans.get(currentUser.require(), id)); }

    @Tag(name = OpenApiConfig.TAG_LOANS)
    @Operation(summary = "Repay Loan", description = "Repaying the full outstanding amount closes the loan and releases the pledge.")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @PostMapping("/loans/{id}/repay")
    public ApiResponse<Loan> repay(@PathVariable long id, @Valid @RequestBody FinanceRequests.Repay request) {
        return ApiResponse.ok(loans.repay(currentUser.require(), id, request.amount()));
    }
}
