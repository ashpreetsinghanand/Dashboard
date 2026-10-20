package com.krsi.dto.response;

import com.krsi.model.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Home screen for the signed-in role")
public record DashboardResponse(
        Role role,
        @Schema(description = "For 'Good Morning, <name>'", example = "Suraj Kumar") String displayName,
        @Schema(description = "Location chip in the header", nullable = true, example = "Dichaon Kalan") String location,
        String currency,
        @Schema(description = "Your Activity rows (4-6 per role)") List<StatTile> activity,
        @Schema(description = "Things waiting for this user, newest first") List<Task> tasks,
        @Schema(description = "Market Prices cards") List<CommodityPriceResponse> marketPrices) {

    @Schema(description = "A to-do item. route is a suggested UI path")
    public record Task(@Schema(example = "BOOKING") String type, long id, String title, String subtitle, String status,
                       @Schema(example = "/store/booking") String route) {}
}
