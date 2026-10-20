package com.krsi.dto.response;

import com.krsi.model.BidStatus;
import com.krsi.model.ListingStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class TradeResponses {
    private TradeResponses() {}

    @Schema(description = "A listing: a row of My Listing and a lot card in the Marketplace")
    public record Listing(
            long id, @Schema(example = "LST-000003") String code, long enwrId, String receiptNo, String commodity, String grade,
            String category, String imageUrl, String warehouseId, String warehouseName,
            @Schema(description = "Warehouse district, shown as the lot's location", example = "Chikmagalur, KA") String region,
            String state, boolean warehouseVerified, long sellerId, String sellerName,
            @Schema(description = "Quantity still available") BigDecimal quantityMt, BigDecimal originalQuantityMt,
            BigDecimal askingPricePerMt, BigDecimal minQuantityMt, @Schema(description = "quantity x asking price") BigDecimal totalValue,
            LocalDate storedOn, @Schema(description = "Receipt validity") LocalDate validTill, long receiptDaysRemaining,
            @Schema(description = "Listing open until") LocalDate validUntil,
            ListingStatus status, @Schema(description = "'Offers' column: ACTIVE bids") long offers,
            @Schema(nullable = true) BigDecimal bestBidPerMt, Instant createdAt, String ledgerHash) {}

    @Schema(description = "A bid: a row of My Bid, or an offer on one of my listings")
    public record Bid(
            long id, @Schema(example = "BID-000004") String code, long listingId, String listingCode, String receiptNo,
            String commodity, String grade, String imageUrl, String warehouseName, long buyerId, String buyerName, long sellerId,
            BigDecimal quantityMt, BigDecimal pricePerMt, @Schema(description = "'Total Bid Value'") BigDecimal totalValue,
            BidStatus status, Instant createdAt, Instant decidedAt, @Schema(nullable = true) Long tradeId, String ledgerHash) {}

    @Schema(description = "A settled trade (Trade History)")
    public record Trade(
            long id, @Schema(example = "TRD-000002") String code, long listingId, long bidId, String commodity, String grade,
            String imageUrl, BigDecimal quantityMt, BigDecimal pricePerMt, BigDecimal totalValue, long sellerId, String sellerName,
            long buyerId, String buyerName, @Schema(description = "BUY or SELL from the signed-in user's side") String side,
            String sourceReceiptNo, @Schema(description = "Receipt now held by the buyer") String buyerReceiptNo, long buyerEnwrId,
            String warehouseName, Instant settledAt, String ledgerHash) {}

    @Schema(description = "Result of accepting a bid")
    public record Settlement(Trade trade, Listing listing, EnwrResponse buyerReceipt) {}
}
