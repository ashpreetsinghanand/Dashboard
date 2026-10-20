package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.response.WarehouseResponses.AuditView;
import com.krsi.dto.response.WarehouseResponses.Summary;
import com.krsi.ledger.EntityProof;
import com.krsi.ledger.LedgerBlock;
import com.krsi.ledger.LedgerVerification;
import com.krsi.security.CurrentUser;
import com.krsi.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = OpenApiConfig.TAG_AUDIT)
public class LedgerController {
    private final AuditService audit;
    private final CurrentUser currentUser;

    public LedgerController(AuditService audit, CurrentUser currentUser) {
        this.audit = audit;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Verify the whole ledger (auditor)",
            description = "Recomputes every block hash and link. valid=false names the first bad block: proof that data was altered outside the app.")
    @PreAuthorize("hasRole('AUDITOR')")
    @GetMapping("/ledger/verify")
    public ApiResponse<LedgerVerification> verify() { return ApiResponse.ok(audit.verify()); }

    @Operation(summary = "Latest ledger blocks (auditor)", description = "Newest first. Page with beforeHeight = the last height you received.")
    @PreAuthorize("hasRole('AUDITOR')")
    @GetMapping("/ledger/blocks")
    public ApiResponse<List<LedgerBlock>> blocks(@RequestParam(defaultValue = "50") @Min(1) @Max(500) int limit,
                                                 @RequestParam(required = false) Long beforeHeight) {
        return ApiResponse.ok(audit.blocks(limit, beforeHeight));
    }

    @Operation(summary = "Ledger history of any record",
            description = "entityType: USER, WAREHOUSE, BOOKING, ENWR, LISTING, BID, TRADE, INVOICE, LOAN, AUDIT. Payloads hold ids and amounts, never phone numbers.")
    @GetMapping("/ledger/entities/{entityType}/{entityId}")
    public ApiResponse<EntityProof> entity(@PathVariable String entityType, @PathVariable String entityId) {
        currentUser.require();
        return ApiResponse.ok(audit.proof(entityType, entityId));
    }

    @Operation(summary = "Recent audits across all warehouses (auditor)")
    @PreAuthorize("hasRole('AUDITOR')")
    @GetMapping("/audits")
    public ApiResponse<List<AuditView>> audits(@RequestParam(defaultValue = "50") @Min(1) @Max(200) int limit) {
        return ApiResponse.ok(audit.audits(null, limit));
    }

    @Operation(summary = "Warehouses due for audit (auditor)", description = "Not audited in the last `days` days.")
    @PreAuthorize("hasRole('AUDITOR')")
    @GetMapping("/audits/due")
    public ApiResponse<List<Summary>> due(@RequestParam(defaultValue = "90") @Min(1) @Max(3650) int days,
                                          @RequestParam(defaultValue = "50") @Min(1) @Max(200) int limit) {
        return ApiResponse.ok(audit.dueForAudit(days, limit));
    }
}
