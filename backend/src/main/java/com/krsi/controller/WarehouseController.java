package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.WarehouseRequests;
import com.krsi.dto.response.WarehouseResponses.AuditView;
import com.krsi.dto.response.WarehouseResponses.Details;
import com.krsi.dto.response.WarehouseResponses.Stats;
import com.krsi.dto.response.WarehouseResponses.Summary;
import com.krsi.security.CurrentUser;
import com.krsi.service.AuditService;
import com.krsi.service.WarehouseService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/warehouses")
@Tag(name = OpenApiConfig.TAG_WAREHOUSES)
public class WarehouseController {
    private final WarehouseService warehouses;
    private final AuditService audits;
    private final CurrentUser currentUser;

    public WarehouseController(WarehouseService warehouses, AuditService audits, CurrentUser currentUser) {
        this.warehouses = warehouses;
        this.audits = audits;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Find A Warehouse (public)",
            description = "Filters map to the screen's dropdowns. With lat/lng (or a signed-in user with a saved location) results "
                    + "include distanceKm and can be limited by radiusKm and sorted NEAREST.")
    @GetMapping
    public ApiResponse<PageResponse<Summary>> search(@ParameterObject @Valid @ModelAttribute WarehouseRequests.Search search) {
        return ApiResponse.ok(warehouses.search(search, currentUser.optional()));
    }

    @Operation(summary = "The four stat tiles on Find A Warehouse (public)")
    @GetMapping("/stats")
    public ApiResponse<Stats> stats() { return ApiResponse.ok(warehouses.stats()); }

    @Operation(summary = "My warehouses (warehouse owner)")
    @PreAuthorize("hasRole('WAREHOUSE_OWNER')")
    @GetMapping("/mine")
    public ApiResponse<List<Summary>> mine() { return ApiResponse.ok(warehouses.mine(currentUser.require())); }

    @Operation(summary = "Warehouse Details (public)", description = "Overview, Inventory, Amenities, Licenses and Location tabs, plus the latest audit.")
    @GetMapping("/{id}")
    public ApiResponse<Details> details(@PathVariable String id) { return ApiResponse.ok(warehouses.details(id)); }

    @Operation(summary = "Nearby Warehouses tab (public)")
    @GetMapping("/{id}/nearby")
    public ApiResponse<List<Summary>> nearby(@PathVariable String id, @RequestParam(defaultValue = "4") @Min(1) @Max(20) int limit) {
        return ApiResponse.ok(warehouses.nearby(id, limit));
    }

    @Operation(summary = "Register a warehouse (warehouse owner)",
            description = "Starts unverified; an auditor's PASSED audit marks it verified. Crops must be names from /api/reference/commodities.")
    @PreAuthorize("hasRole('WAREHOUSE_OWNER')")
    @PostMapping
    public ApiResponse<Details> create(@Valid @RequestBody WarehouseRequests.Upsert request) {
        return ApiResponse.ok(warehouses.create(currentUser.require(), request));
    }

    @Operation(summary = "Update my warehouse (warehouse owner)", description = "Changing total capacity moves free capacity by the same amount.")
    @PreAuthorize("hasRole('WAREHOUSE_OWNER')")
    @PutMapping("/{id}")
    public ApiResponse<Details> update(@PathVariable String id, @Valid @RequestBody WarehouseRequests.Upsert request) {
        return ApiResponse.ok(warehouses.update(currentUser.require(), id, request));
    }

    @Operation(summary = "Audit history of a warehouse (signed-in users)")
    @GetMapping("/{id}/audits")
    public ApiResponse<List<AuditView>> audits(@PathVariable String id, @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        currentUser.require();
        return ApiResponse.ok(audits.audits(id, limit));
    }

    @Operation(summary = "Record a site audit (auditor)",
            description = "Compares stockVerifiedMt with the receipts on record, updates the verified badge and rating, and writes a ledger block.")
    @PreAuthorize("hasRole('AUDITOR')")
    @PostMapping("/{id}/audits")
    public ApiResponse<AuditView> audit(@PathVariable String id, @Valid @RequestBody WarehouseRequests.Audit request) {
        return ApiResponse.ok(audits.auditWarehouse(currentUser.require(), id, request));
    }
}
