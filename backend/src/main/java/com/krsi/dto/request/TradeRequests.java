package com.krsi.dto.request;

import com.krsi.model.BidStatus;
import com.krsi.model.ListingStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public final class TradeRequests {
    private TradeRequests() {}

    public enum MarketSort { LATEST, NAME, PRICE_LOW, PRICE_HIGH }

    @Schema(description = "List On Market (from My eNWR). The whole receipt is offered; buyers may bid for part of it")
    public record CreateListing(
            @NotNull @Schema(example = "7") Long enwrId,
            @NotNull @Positive @DecimalMax("100000000") @Schema(description = "Asking price per MT", example = "250000") BigDecimal askingPricePerMt,
            @Positive @Schema(description = "Smallest quantity a buyer may bid for; defaults to the whole receipt", example = "10") BigDecimal minQuantityMt,
            @Min(1) @Max(180) @Schema(description = "Days the listing stays open (default 30)", example = "30") Integer validDays) {}

    @Schema(description = "Edit Listing; omitted fields are unchanged")
    public record UpdateListing(
            @Positive @DecimalMax("100000000") BigDecimal askingPricePerMt,
            @Positive BigDecimal minQuantityMt,
            @Min(1) @Max(180) @Schema(description = "Extends validity to today + validDays") Integer validDays) {}

    @Schema(description = "My Listing filters")
    public record ListingSearch(@Size(max = 80) String q, @Size(max = 60) String commodity,
                                @Schema(description = "ACTIVE, UNDER_OFFER, SOLD, WITHDRAWN or EXPIRED") ListingStatus status,
                                @Min(0) Integer page, @Min(1) @Max(100) Integer size) {}

    @Schema(description = "Marketplace filters (all optional)")
    public record MarketSearch(
            @Schema(description = "Matches commodity, warehouse or region") @Size(max = 80) String q,
            @Schema(description = "Grain, Pulses, Oilseeds, Spices or Coffee & Tea") @Size(max = 40) String category,
            @Schema(description = "Warehouse district or state", example = "Chikmagalur") @Size(max = 80) String region,
            @Size(max = 40) @Schema(example = "Grade A") String grade,
            @Positive BigDecimal minQuantityMt,
            @Positive @Schema(description = "'Under 1000 MT' -> 1000") BigDecimal maxQuantityMt,
            @Schema(description = "Warehouse Verified: Only") Boolean verifiedOnly,
            MarketSort sort,
            @Min(0) Integer page, @Min(1) @Max(100) Integer size) {}

    @Schema(description = "Buy / Request Quote: place a bid on a listing")
    public record PlaceBid(
            @NotNull @Positive @Schema(example = "10") BigDecimal quantityMt,
            @NotNull @Positive @DecimalMax("100000000") @Schema(description = "Offered price per MT", example = "245000") BigDecimal pricePerMt) {}

    @Schema(description = "My Bid filters")
    public record BidSearch(@Size(max = 80) String q, @Size(max = 60) String commodity, BidStatus status,
                            @Min(0) Integer page, @Min(1) @Max(100) Integer size) {}
}
