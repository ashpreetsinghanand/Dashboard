package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.response.DashboardResponse;
import com.krsi.security.CurrentUser;
import com.krsi.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = OpenApiConfig.TAG_DASHBOARD)
public class DashboardController {
    private final DashboardService dashboard;
    private final CurrentUser currentUser;

    public DashboardController(DashboardService dashboard, CurrentUser currentUser) {
        this.dashboard = dashboard;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Home screen for the signed-in role",
            description = "Farmer: stored produce, loans, sales, repayments. Merchant: holdings, bids, purchases. "
                    + "Warehouse owner: capacity, occupancy, bookings, revenue. Auditor: inspections and audits due, ledger size.")
    @GetMapping("/dashboard")
    public ApiResponse<DashboardResponse> dashboard() {
        return ApiResponse.ok(dashboard.dashboard(currentUser.require()));
    }
}
