package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.TradeRequests;
import com.krsi.dto.response.StatTile;
import com.krsi.dto.response.TradeResponses.Bid;
import com.krsi.dto.response.TradeResponses.Listing;
import com.krsi.dto.response.TradeResponses.Settlement;
import com.krsi.dto.response.TradeResponses.Trade;
import com.krsi.ledger.EntityProof;
import com.krsi.security.CurrentUser;
import com.krsi.service.TradeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.Map;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = OpenApiConfig.TAG_TRADE)
public class TradeController {
    private final TradeService trade;
    private final CurrentUser currentUser;

    public TradeController(TradeService trade, CurrentUser currentUser) {
        this.trade = trade;
        this.currentUser = currentUser;
    }

    // ---------- marketplace (public) ----------

    @Operation(summary = "Marketplace lots (public)", description = "Open listings (ACTIVE or UNDER_OFFER) with remaining quantity.")
    @GetMapping("/marketplace")
    public ApiResponse<PageResponse<Listing>> marketplace(@ParameterObject @Valid @ModelAttribute TradeRequests.MarketSearch search) {
        return ApiResponse.ok(trade.marketplace(search));
    }

    @Operation(summary = "Values for the Region and Quality Grade dropdowns (public)")
    @GetMapping("/marketplace/filters")
    public ApiResponse<Map<String, List<String>>> marketplaceFilters() { return ApiResponse.ok(trade.marketplaceFilters()); }

    @Operation(summary = "One lot (View Details, public)")
    @GetMapping("/marketplace/{listingId}")
    public ApiResponse<Listing> lot(@PathVariable long listingId) { return ApiResponse.ok(trade.listing(listingId)); }

    // ---------- listings ----------

    @Operation(summary = "List On Market", description = "Holder lists an ACTIVE receipt; the receipt becomes LISTED.")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @PostMapping("/listings")
    public ApiResponse<Listing> createListing(@Valid @RequestBody TradeRequests.CreateListing request) {
        return ApiResponse.ok(trade.createListing(currentUser.require(), request));
    }

    @Operation(summary = "My Listing")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @GetMapping("/listings/mine")
    public ApiResponse<PageResponse<Listing>> myListings(@ParameterObject @Valid @ModelAttribute TradeRequests.ListingSearch search) {
        return ApiResponse.ok(trade.myListings(currentUser.require(), search));
    }

    @Operation(summary = "My Listing stat cards")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @GetMapping("/listings/mine/stats")
    public ApiResponse<List<StatTile>> listingStats() { return ApiResponse.ok(trade.listingStats(currentUser.require())); }

    @Operation(summary = "One listing")
    @GetMapping("/listings/{id}")
    public ApiResponse<Listing> listing(@PathVariable long id) {
        currentUser.require();
        return ApiResponse.ok(trade.listing(id));
    }

    @Operation(summary = "Edit Listing (seller)")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @PatchMapping("/listings/{id}")
    public ApiResponse<Listing> updateListing(@PathVariable long id, @Valid @RequestBody TradeRequests.UpdateListing request) {
        return ApiResponse.ok(trade.updateListing(currentUser.require(), id, request));
    }

    @Operation(summary = "Withdraw a listing (seller)", description = "Rejects its active bids and returns the receipt to ACTIVE.")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @PostMapping("/listings/{id}/withdraw")
    public ApiResponse<Listing> withdraw(@PathVariable long id) { return ApiResponse.ok(trade.withdrawListing(currentUser.require(), id)); }

    @Operation(summary = "View Offer: bids on my listing (seller)")
    @GetMapping("/listings/{id}/bids")
    public ApiResponse<List<Bid>> bidsForListing(@PathVariable long id) {
        return ApiResponse.ok(trade.bidsForListing(currentUser.require(), id));
    }

    @Operation(summary = "Ledger history of a listing")
    @GetMapping("/listings/{id}/ledger")
    public ApiResponse<EntityProof> listingLedger(@PathVariable long id) {
        currentUser.require();
        return ApiResponse.ok(trade.listingHistory(id));
    }

    // ---------- bids ----------

    @Operation(summary = "Buy / Request Quote: place a bid (merchant)",
            description = "Quantity between the listing's minimum and what is left. One active bid per buyer per listing.")
    @PreAuthorize("hasRole('MERCHANT')")
    @PostMapping("/listings/{id}/bids")
    public ApiResponse<Bid> placeBid(@PathVariable long id, @Valid @RequestBody TradeRequests.PlaceBid request) {
        return ApiResponse.ok(trade.placeBid(currentUser.require(), id, request));
    }

    @Operation(summary = "My Bid")
    @PreAuthorize("hasRole('MERCHANT')")
    @GetMapping("/bids/mine")
    public ApiResponse<PageResponse<Bid>> myBids(@ParameterObject @Valid @ModelAttribute TradeRequests.BidSearch search) {
        return ApiResponse.ok(trade.myBids(currentUser.require(), search));
    }

    @Operation(summary = "My Bid stat cards")
    @PreAuthorize("hasRole('MERCHANT')")
    @GetMapping("/bids/mine/stats")
    public ApiResponse<List<StatTile>> bidStats() { return ApiResponse.ok(trade.bidStats(currentUser.require())); }

    @Operation(summary = "One bid (buyer or seller)")
    @GetMapping("/bids/{id}")
    public ApiResponse<Bid> bid(@PathVariable long id) { return ApiResponse.ok(trade.bid(currentUser.require(), id)); }

    @Operation(summary = "Accept a bid (seller)",
            description = "Settles the trade: transfers the receipt (or a split-off part) to the buyer and records it on the ledger.")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @PostMapping("/bids/{id}/accept")
    public ApiResponse<Settlement> accept(@PathVariable long id) { return ApiResponse.ok(trade.acceptBid(currentUser.require(), id)); }

    @Operation(summary = "Reject a bid (seller)")
    @PreAuthorize("hasAnyRole('FARMER', 'MERCHANT')")
    @PostMapping("/bids/{id}/reject")
    public ApiResponse<Bid> reject(@PathVariable long id) { return ApiResponse.ok(trade.rejectBid(currentUser.require(), id)); }

    @Operation(summary = "Withdraw my bid (buyer)")
    @PreAuthorize("hasRole('MERCHANT')")
    @PostMapping("/bids/{id}/withdraw")
    public ApiResponse<Bid> withdrawBid(@PathVariable long id) { return ApiResponse.ok(trade.withdrawBid(currentUser.require(), id)); }

    // ---------- trades ----------

    @Operation(summary = "Trade History", description = "Trades where I am the buyer or the seller; side says which.")
    @GetMapping("/trades/mine")
    public ApiResponse<PageResponse<Trade>> trades(@RequestParam(required = false) String q,
                                                   @RequestParam(required = false) @Min(0) Integer page,
                                                   @RequestParam(required = false) @Min(1) @Max(100) Integer size) {
        return ApiResponse.ok(trade.myTrades(currentUser.require(), q, page, size));
    }

    @Operation(summary = "One trade")
    @GetMapping("/trades/{id}")
    public ApiResponse<Trade> tradeDetail(@PathVariable long id) { return ApiResponse.ok(trade.trade(currentUser.require(), id)); }

    @Operation(summary = "Ledger history of a trade")
    @GetMapping("/trades/{id}/ledger")
    public ApiResponse<EntityProof> tradeLedger(@PathVariable long id) { return ApiResponse.ok(trade.tradeHistory(currentUser.require(), id)); }
}
