package com.krsi.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

/** One labelled number: the Your Activity rows and the stat cards on My Listing / My Bid. */
@Schema(description = "A labelled figure. Format value with unit: MT -> '24.5 MT', CURRENCY -> '₹10,000', COUNT -> '12'")
public record StatTile(
        @Schema(example = "storedProduce") String key,
        @Schema(example = "Stored Produce") String label,
        BigDecimal value,
        @Schema(description = "MT, QTL, CURRENCY or COUNT") String unit,
        @Schema(description = "Small caption under the value, e.g. '+2 this week'", nullable = true) String note) {

    public static StatTile count(String key, String label, long value, String note) {
        return new StatTile(key, label, BigDecimal.valueOf(value), "COUNT", note);
    }

    public static StatTile mt(String key, String label, BigDecimal value, String note) {
        return new StatTile(key, label, value, "MT", note);
    }

    public static StatTile money(String key, String label, BigDecimal value, String note) {
        return new StatTile(key, label, value, "CURRENCY", note);
    }
}
