package com.krsi.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;

/** Market Prices cards and the Market Insights list. */
@Schema(description = "Latest price of a commodity")
public record CommodityPriceResponse(
        @Schema(example = "Coffee") String commodity,
        @Schema(example = "Coffee & Tea") String category,
        @Schema(example = "Cherry") String grade,
        @Schema(example = "/assets/coffee.png") String imageUrl,
        @Schema(example = "250.00") BigDecimal pricePerKg,
        @Schema(example = "250000.00") BigDecimal pricePerMt,
        BigDecimal previousPricePerKg,
        @Schema(description = "Change against the previous price, in percent", example = "2.4") BigDecimal changePct,
        @Schema(example = "Chikmagalur") String bestMarket,
        Instant updatedAt,
        @Schema(description = "True if on the signed-in user's watchlist") boolean watched) {}
