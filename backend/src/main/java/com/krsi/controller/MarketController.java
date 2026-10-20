package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.response.CommodityPriceResponse;
import com.krsi.security.CurrentUser;
import com.krsi.service.MarketService;
import com.krsi.service.MarketService.InsightType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/market")
@Tag(name = OpenApiConfig.TAG_MARKET)
public class MarketController {
    private final MarketService market;
    private final CurrentUser currentUser;

    public MarketController(MarketService market, CurrentUser currentUser) {
        this.market = market;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Latest prices (Market Prices cards)", description = "Public. Optional category filter, e.g. Spices.")
    @GetMapping("/prices")
    public ApiResponse<List<CommodityPriceResponse>> prices(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return ApiResponse.ok(market.prices(currentUser.optional(), category, limit));
    }

    @Operation(summary = "Market Insights tabs", description = "GAINERS (Top Gainers), LOSERS (Top Loser) or WATCHLIST (empty when signed out).")
    @GetMapping("/insights")
    public ApiResponse<List<CommodityPriceResponse>> insights(
            @Parameter(description = "GAINERS, LOSERS or WATCHLIST") @RequestParam(defaultValue = "GAINERS") InsightType type,
            @RequestParam(defaultValue = "5") @Min(1) @Max(50) int limit) {
        return ApiResponse.ok(market.insights(currentUser.optional(), type, limit));
    }

    @Operation(summary = "Add a commodity to my watchlist", description = "Returns the updated watchlist.")
    @PutMapping("/watchlist/{commodity}")
    public ApiResponse<List<CommodityPriceResponse>> watch(@PathVariable String commodity) {
        return ApiResponse.ok(market.watch(currentUser.require(), commodity));
    }

    @Operation(summary = "Remove a commodity from my watchlist", description = "Returns the updated watchlist.")
    @DeleteMapping("/watchlist/{commodity}")
    public ApiResponse<List<CommodityPriceResponse>> unwatch(@PathVariable String commodity) {
        return ApiResponse.ok(market.unwatch(currentUser.require(), commodity));
    }
}
