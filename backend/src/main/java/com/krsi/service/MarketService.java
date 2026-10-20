package com.krsi.service;

import com.krsi.dto.response.CommodityPriceResponse;
import com.krsi.dto.response.CommodityResponse;
import com.krsi.exception.ApiException;
import com.krsi.repository.MarketRepository;
import com.krsi.security.AuthUser;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** Commodity reference data, prices and watchlists. */
@Service
public class MarketService {
    public enum InsightType { GAINERS, LOSERS, WATCHLIST }

    private static final long ANONYMOUS = -1;
    private final MarketRepository market;

    public MarketService(MarketRepository market) { this.market = market; }

    public List<CommodityResponse> commodities() { return market.commodities(); }

    public List<CommodityPriceResponse> prices(Optional<AuthUser> viewer, String category, int limit) {
        return market.prices(viewerId(viewer), category, limit);
    }

    public List<CommodityPriceResponse> insights(Optional<AuthUser> viewer, InsightType type, int limit) {
        return switch (type) {
            case GAINERS -> market.byChange(viewerId(viewer), true, limit);
            case LOSERS -> market.byChange(viewerId(viewer), false, limit);
            case WATCHLIST -> viewer.map(v -> market.watchlist(v.id())).orElse(List.of());
        };
    }

    public List<CommodityPriceResponse> watch(AuthUser me, String commodity) {
        market.watch(me.id(), canonical(commodity));
        return market.watchlist(me.id());
    }

    public List<CommodityPriceResponse> unwatch(AuthUser me, String commodity) {
        market.unwatch(me.id(), canonical(commodity));
        return market.watchlist(me.id());
    }

    /** Validates a commodity name and returns its canonical spelling. */
    public String canonical(String commodity) {
        if (commodity == null || commodity.isBlank()) throw ApiException.invalid("Commodity is required");
        return market.canonicalCommodity(commodity)
                .orElseThrow(() -> ApiException.invalid("Unknown commodity '" + commodity + "'. Use a name from /api/reference/commodities"));
    }

    private static long viewerId(Optional<AuthUser> viewer) { return viewer.map(AuthUser::id).orElse(ANONYMOUS); }
}
