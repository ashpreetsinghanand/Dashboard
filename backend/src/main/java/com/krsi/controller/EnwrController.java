package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.EnwrRequests;
import com.krsi.dto.response.EnwrResponse;
import com.krsi.dto.response.FinanceResponses.Invoice;
import com.krsi.ledger.EntityProof;
import com.krsi.security.CurrentUser;
import com.krsi.service.EnwrService;
import com.krsi.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springdoc.core.annotations.ParameterObject;
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
@RequestMapping("/api/enwrs")
@Tag(name = OpenApiConfig.TAG_ENWR)
public class EnwrController {
    private final EnwrService enwrs;
    private final InvoiceService invoices;
    private final CurrentUser currentUser;

    public EnwrController(EnwrService enwrs, InvoiceService invoices, CurrentUser currentUser) {
        this.enwrs = enwrs;
        this.invoices = invoices;
        this.currentUser = currentUser;
    }

    @Operation(summary = "My eNWR list",
            description = "Farmers/merchants: receipts they hold. Warehouse owners: receipts at their warehouses. Auditors: all. "
                    + "Each row carries actions flags (canList, canApplyLoan, canInspect, canRelease) for the buttons.")
    @GetMapping
    public ApiResponse<PageResponse<EnwrResponse>> search(@ParameterObject @Valid @ModelAttribute EnwrRequests.Search search) {
        return ApiResponse.ok(enwrs.search(currentUser.require(), search));
    }

    @Operation(summary = "Receipts waiting for quality inspection (auditor)")
    @PreAuthorize("hasRole('AUDITOR')")
    @GetMapping("/pending-inspection")
    public ApiResponse<List<EnwrResponse>> pending(@RequestParam(defaultValue = "50") @Min(1) @Max(200) int limit) {
        return ApiResponse.ok(enwrs.pendingInspection(currentUser.require(), limit));
    }

    @Operation(summary = "One receipt (View Details)")
    @GetMapping("/{id}")
    public ApiResponse<EnwrResponse> get(@PathVariable long id) { return ApiResponse.ok(enwrs.get(currentUser.require(), id)); }

    @Operation(summary = "Ledger history of a receipt", description = "Every block that touched it, with an integrity flag. Show as a provenance timeline.")
    @GetMapping("/{id}/ledger")
    public ApiResponse<EntityProof> ledger(@PathVariable long id) { return ApiResponse.ok(enwrs.history(currentUser.require(), id)); }

    @Operation(summary = "Quality inspection (auditor)", description = "PENDING_AUDIT -> ACTIVE (APPROVE) or REJECTED (frees capacity, cancels unpaid invoices).")
    @PreAuthorize("hasRole('AUDITOR')")
    @PostMapping("/{id}/inspection")
    public ApiResponse<EnwrResponse> inspect(@PathVariable long id, @Valid @RequestBody EnwrRequests.Inspection request) {
        return ApiResponse.ok(enwrs.inspect(currentUser.require(), id, request));
    }

    @Operation(summary = "Release stock to the holder (warehouse owner)", description = "ACTIVE -> RELEASED; invoices must be paid.")
    @PreAuthorize("hasRole('WAREHOUSE_OWNER')")
    @PostMapping("/{id}/release")
    public ApiResponse<EnwrResponse> release(@PathVariable long id) { return ApiResponse.ok(enwrs.release(currentUser.require(), id)); }

    @Operation(summary = "Bill the next storage period (warehouse owner)")
    @PreAuthorize("hasRole('WAREHOUSE_OWNER')")
    @PostMapping("/{id}/invoices")
    public ApiResponse<Invoice> bill(@PathVariable long id) { return ApiResponse.ok(invoices.issueNextPeriod(currentUser.require(), id)); }
}
