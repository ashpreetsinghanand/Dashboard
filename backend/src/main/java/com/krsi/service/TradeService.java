package com.krsi.service;

import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.TradeRequests;
import com.krsi.dto.response.StatTile;
import com.krsi.dto.response.TradeResponses.Bid;
import com.krsi.dto.response.TradeResponses.Listing;
import com.krsi.dto.response.TradeResponses.Settlement;
import com.krsi.dto.response.TradeResponses.Trade;
import com.krsi.exception.ApiException;
import com.krsi.ledger.BlockchainLedger;
import com.krsi.ledger.EntityProof;
import com.krsi.ledger.LedgerEvent;
import com.krsi.ledger.LedgerEventType;
import com.krsi.ledger.Payload;
import com.krsi.model.BidStatus;
import com.krsi.model.EnwrStatus;
import com.krsi.model.Role;
import com.krsi.repository.EnwrRepository;
import com.krsi.repository.TradeRepository;
import com.krsi.repository.TradeRepository.BidCore;
import com.krsi.repository.TradeRepository.ListingCore;
import com.krsi.security.AuthUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Receipt trading. A holder lists an ACTIVE receipt; merchants bid (whole or part, at least the minimum quantity);
 * the seller accepts one bid, which settles a trade: the receipt (or a split-off part of it) moves to the buyer.
 * Settlement is recorded on the ledger; money settlement/escrow is outside this service.
 */
@Service
public class TradeService {
    private static final Logger log = LoggerFactory.getLogger(TradeService.class);
    private static final int DEFAULT_LISTING_DAYS = 30;

    private final TradeRepository trades;
    private final EnwrRepository enwrs;
    private final EnwrService enwrService;
    private final BlockchainLedger ledger;

    public TradeService(TradeRepository trades, EnwrRepository enwrs, EnwrService enwrService, BlockchainLedger ledger) {
        this.trades = trades;
        this.enwrs = enwrs;
        this.enwrService = enwrService;
        this.ledger = ledger;
    }

    // ---------- listings ----------

    @Transactional
    public Listing createListing(AuthUser me, TradeRequests.CreateListing r) {
        EnwrRepository.Core receipt = enwrs.coreForUpdate(r.enwrId()).orElseThrow(() -> ApiException.notFound("Receipt", r.enwrId()));
        if (receipt.ownerId() != me.id()) throw ApiException.forbidden("You can only list receipts you hold");
        if (receipt.status() != EnwrStatus.ACTIVE) throw ApiException.state("Only ACTIVE receipts can be listed (status is " + receipt.status() + ")");
        if (receipt.validTill().isBefore(LocalDate.now().plusDays(1))) throw ApiException.state("This receipt has expired");
        BigDecimal qty = receipt.quantityMt();
        BigDecimal minQty = r.minQuantityMt() == null ? qty : r.minQuantityMt();
        if (minQty.compareTo(qty) > 0) throw ApiException.invalid("Minimum quantity cannot exceed the receipt's " + qty.toPlainString() + " MT");
        LocalDate validUntil = min(LocalDate.now().plusDays(r.validDays() == null ? DEFAULT_LISTING_DAYS : r.validDays()), receipt.validTill());

        enwrs.transition(receipt.id(), List.of(EnwrStatus.ACTIVE), EnwrStatus.LISTED);
        long id = trades.insertListing(receipt.id(), me.id(), qty, r.askingPricePerMt(), minQty, validUntil);
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.LISTING_CREATED, "LISTING", id, me, Payload.of(
                "listingId", id, "enwrId", receipt.id(), "receiptNo", receipt.receiptNo(), "commodity", receipt.commodity(),
                "quantityMt", qty, "askingPricePerMt", r.askingPricePerMt(), "minQuantityMt", minQty, "validUntil", validUntil))).hash();
        trades.setListingLedgerHash(id, hash);
        enwrs.setLedgerHash(receipt.id(), hash);
        log.info("Listing {} created for receipt {}", id, receipt.receiptNo());
        return listing(id);
    }

    @Transactional
    public Listing updateListing(AuthUser me, long id, TradeRequests.UpdateListing r) {
        ListingCore l = trades.listingForUpdate(id).orElseThrow(() -> ApiException.notFound("Listing", id));
        if (l.sellerId() != me.id()) throw ApiException.forbidden("You can only edit your own listings");
        if (!"ACTIVE".equals(l.storedStatus())) throw ApiException.state("Only open listings can be edited");
        if (r.minQuantityMt() != null && r.minQuantityMt().compareTo(l.quantityMt()) > 0)
            throw ApiException.invalid("Minimum quantity cannot exceed the " + l.quantityMt().toPlainString() + " MT on offer");
        LocalDate validUntil = null;
        if (r.validDays() != null) {
            LocalDate receiptValidTill = enwrs.core(l.enwrId()).orElseThrow().validTill();
            validUntil = min(LocalDate.now().plusDays(r.validDays()), receiptValidTill);
        }
        trades.updateListing(id, r.askingPricePerMt(), r.minQuantityMt(), validUntil);
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.LISTING_UPDATED, "LISTING", id, me, Payload.of(
                "listingId", id, "askingPricePerMt", r.askingPricePerMt(), "minQuantityMt", r.minQuantityMt(), "validUntil", validUntil))).hash();
        trades.setListingLedgerHash(id, hash);
        return listing(id);
    }

    @Transactional
    public Listing withdrawListing(AuthUser me, long id) {
        ListingCore l = trades.listingForUpdate(id).orElseThrow(() -> ApiException.notFound("Listing", id));
        if (l.sellerId() != me.id()) throw ApiException.forbidden("You can only withdraw your own listings");
        if (!"ACTIVE".equals(l.storedStatus())) throw ApiException.state("This listing is already closed");
        enwrs.coreForUpdate(l.enwrId());
        trades.setListingStatus(id, "WITHDRAWN");
        List<Long> rejected = trades.rejectAllActiveBids(id);
        enwrs.transition(l.enwrId(), List.of(EnwrStatus.LISTED), EnwrStatus.ACTIVE);
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.LISTING_WITHDRAWN, "LISTING", id, me,
                Payload.of("listingId", id, "enwrId", l.enwrId(), "rejectedBidIds", rejected))).hash();
        trades.setListingLedgerHash(id, hash);
        enwrs.setLedgerHash(l.enwrId(), hash);
        return listing(id);
    }

    public PageResponse<Listing> myListings(AuthUser me, TradeRequests.ListingSearch s) { return trades.myListings(me.id(), s); }

    public List<StatTile> listingStats(AuthUser me) {
        TradeRepository.ListingStats s = trades.listingStats(me.id());
        return List.of(
                StatTile.count("activeListings", "Active Listings", s.active(), s.newThisWeek() + " new this week"),
                StatTile.mt("listedQuantity", "Total Listed Quantity", s.listedMt(), null),
                StatTile.money("askingValue", "Total Asking Value", s.askingValue(), null),
                StatTile.count("offersReceived", "Offers Received", s.offers(), s.newOffersThisWeek() + " new this week"));
    }

    public PageResponse<Listing> marketplace(TradeRequests.MarketSearch s) { return trades.marketplace(s); }

    public Map<String, List<String>> marketplaceFilters() {
        return Map.of("regions", trades.marketplaceValues("region"), "grades", trades.marketplaceValues("grade"));
    }

    public Listing listing(long id) { return trades.listing(id).orElseThrow(() -> ApiException.notFound("Listing", id)); }

    public EntityProof listingHistory(long id) {
        listing(id);
        return ledger.proof("LISTING", Long.toString(id));
    }

    // ---------- bids ----------

    @Transactional
    public Bid placeBid(AuthUser me, long listingId, TradeRequests.PlaceBid r) {
        ListingCore l = trades.listingForUpdate(listingId).orElseThrow(() -> ApiException.notFound("Listing", listingId));
        if (l.sellerId() == me.id()) throw ApiException.state("You cannot bid on your own listing");
        requireOpen(l);
        BigDecimal remaining = l.quantityMt();
        if (r.quantityMt().compareTo(remaining) > 0) throw ApiException.invalid("Only " + remaining.toPlainString() + " MT is available");
        BigDecimal min = l.minQuantityMt().min(remaining);
        if (r.quantityMt().compareTo(min) < 0) throw ApiException.invalid("Minimum order is " + min.toPlainString() + " MT");
        if (trades.hasActiveBid(listingId, me.id())) throw ApiException.conflict("You already have an active bid on this listing; withdraw it first");
        long id = trades.insertBid(listingId, me.id(), r.quantityMt(), r.pricePerMt());
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.BID_PLACED, "BID", id, me, Payload.of(
                "bidId", id, "listingId", listingId, "quantityMt", r.quantityMt(), "pricePerMt", r.pricePerMt()))).hash();
        trades.setBidLedgerHash(id, hash);
        return bid(id);
    }

    @Transactional
    public Bid withdrawBid(AuthUser me, long id) {
        BidCore b = trades.bidForUpdate(id).orElseThrow(() -> ApiException.notFound("Bid", id));
        if (b.buyerId() != me.id()) throw ApiException.forbidden("You can only withdraw your own bids");
        if (!trades.decideBid(id, BidStatus.WITHDRAWN)) throw ApiException.state("Only ACTIVE bids can be withdrawn");
        recordBid(me, id, LedgerEventType.BID_WITHDRAWN, "withdrawn by buyer");
        return bid(id);
    }

    @Transactional
    public Bid rejectBid(AuthUser me, long id) {
        BidCore b = trades.bidForUpdate(id).orElseThrow(() -> ApiException.notFound("Bid", id));
        ListingCore l = trades.listingForUpdate(b.listingId()).orElseThrow();
        if (l.sellerId() != me.id()) throw ApiException.forbidden("Only the seller can reject this bid");
        if (!trades.decideBid(id, BidStatus.REJECTED)) throw ApiException.state("Only ACTIVE bids can be rejected");
        recordBid(me, id, LedgerEventType.BID_REJECTED, "rejected by seller");
        return bid(id);
    }

    /**
     * Seller accepts a bid: settles a trade. Whole quantity -> the receipt itself moves to the buyer.
     * Part -> a new receipt is split off for the buyer and the seller's receipt and listing shrink.
     */
    @Transactional
    public Settlement acceptBid(AuthUser me, long bidId) {
        BidCore b = trades.bidForUpdate(bidId).orElseThrow(() -> ApiException.notFound("Bid", bidId));
        ListingCore l = trades.listingForUpdate(b.listingId()).orElseThrow();
        if (l.sellerId() != me.id()) throw ApiException.forbidden("Only the seller can accept this bid");
        if (b.status() != BidStatus.ACTIVE) throw ApiException.state("Only ACTIVE bids can be accepted");
        requireOpen(l);
        EnwrRepository.Core source = enwrs.coreForUpdate(l.enwrId()).orElseThrow();
        if (source.status() != EnwrStatus.LISTED) throw ApiException.state("The receipt is no longer available for sale");
        if (b.quantityMt().compareTo(l.quantityMt()) > 0) throw ApiException.state("Not enough quantity left to fill this bid");

        BigDecimal remaining = l.quantityMt().subtract(b.quantityMt());
        boolean whole = remaining.signum() == 0;
        long buyerEnwrId;
        if (whole) {
            enwrs.transferOwnership(source.id(), b.buyerId(), EnwrStatus.ACTIVE);
            buyerEnwrId = source.id();
            trades.reduceListing(l.id(), b.quantityMt());
            trades.setListingStatus(l.id(), "SOLD");
        } else {
            buyerEnwrId = enwrs.insert(null, source.id(), b.buyerId(), source.depositorId(), source.warehouseId(), source.commodity(),
                    source.grade(), b.quantityMt(), source.storedOn(), source.validTill(), EnwrStatus.ACTIVE, null);
            enwrs.copyQuality(source.id(), buyerEnwrId);
            enwrs.reduceQuantity(source.id(), b.quantityMt());
            trades.reduceListing(l.id(), b.quantityMt());
            if (l.minQuantityMt().compareTo(remaining) > 0) trades.updateListing(l.id(), null, remaining, null);
        }
        trades.decideBid(bidId, BidStatus.ACCEPTED);
        BigDecimal total = b.quantityMt().multiply(b.pricePerMt()).setScale(2, RoundingMode.HALF_UP);
        long tradeId = trades.insertTrade(l.id(), bidId, me.id(), b.buyerId(), source.id(), buyerEnwrId, source.commodity(),
                b.quantityMt(), b.pricePerMt(), total);

        String tradeHash = ledger.record(LedgerEvent.of(LedgerEventType.TRADE_SETTLED, "TRADE", tradeId, me, Payload.of(
                "tradeId", tradeId, "listingId", l.id(), "bidId", bidId, "sellerId", me.id(), "buyerId", b.buyerId(),
                "commodity", source.commodity(), "quantityMt", b.quantityMt(), "pricePerMt", b.pricePerMt(), "totalValue", total,
                "sourceEnwrId", source.id(), "buyerEnwrId", buyerEnwrId))).hash();
        trades.setTradeLedgerHash(tradeId, tradeHash);
        trades.setBidLedgerHash(bidId, tradeHash);
        trades.setListingLedgerHash(l.id(), tradeHash);

        if (whole) {
            String h = ledger.record(LedgerEvent.of(LedgerEventType.ENWR_TRANSFERRED, "ENWR", source.id(), me, Payload.of(
                    "enwrId", source.id(), "fromUserId", me.id(), "toUserId", b.buyerId(), "quantityMt", b.quantityMt(), "tradeId", tradeId))).hash();
            enwrs.setLedgerHash(source.id(), h);
        } else {
            String h = ledger.record(LedgerEvent.of(LedgerEventType.ENWR_SPLIT, "ENWR", buyerEnwrId, me, Payload.of(
                    "enwrId", buyerEnwrId, "parentEnwrId", source.id(), "toUserId", b.buyerId(), "quantityMt", b.quantityMt(),
                    "parentRemainingMt", source.quantityMt().subtract(b.quantityMt()), "tradeId", tradeId))).hash();
            enwrs.setLedgerHash(buyerEnwrId, h);
            enwrs.setLedgerHash(source.id(), h);
        }

        List<Long> rejected = whole ? trades.rejectAllActiveBids(l.id()) : trades.rejectUnfillableBids(l.id(), remaining);
        for (Long other : rejected) recordBid(me, other, LedgerEventType.BID_REJECTED, "listing quantity no longer available");

        log.info("Trade {} settled: bid {} on listing {} ({} MT)", tradeId, bidId, l.id(), b.quantityMt());
        AuthUser buyerView = new AuthUser(b.buyerId(), Role.MERCHANT, null, null);
        return new Settlement(trade(me, tradeId), listing(l.id()), enwrService.view(buyerView, buyerEnwrId));
    }

    public List<Bid> bidsForListing(AuthUser me, long listingId) {
        Listing l = listing(listingId);
        if (l.sellerId() != me.id() && me.role() != Role.AUDITOR) throw ApiException.forbidden("Only the seller can see offers on this listing");
        return trades.bidsForListing(listingId);
    }

    public PageResponse<Bid> myBids(AuthUser me, TradeRequests.BidSearch s) { return trades.myBids(me.id(), s); }

    public List<StatTile> bidStats(AuthUser me) {
        TradeRepository.BidStats s = trades.bidStats(me.id());
        return List.of(
                StatTile.count("activeBids", "Active Bids", s.active(), s.newThisWeek() + " placed this week"),
                StatTile.money("activeBidValue", "Total Bid Value", s.activeValue(), null),
                StatTile.count("successfulBids", "Successful Bids", s.accepted(), null),
                StatTile.count("pendingResponse", "Pending Response", s.active(), null));
    }

    public Bid bid(AuthUser me, long id) {
        Bid b = bid(id);
        if (b.buyerId() != me.id() && b.sellerId() != me.id() && me.role() != Role.AUDITOR) throw ApiException.notFound("Bid", id);
        return b;
    }

    // ---------- trades ----------

    public PageResponse<Trade> myTrades(AuthUser me, String q, Integer page, Integer size) { return trades.tradesFor(me.id(), q, page, size); }

    public Trade trade(AuthUser me, long id) {
        Trade t = trades.trade(id, me.id()).orElseThrow(() -> ApiException.notFound("Trade", id));
        if (t.buyerId() != me.id() && t.sellerId() != me.id() && me.role() != Role.AUDITOR) throw ApiException.notFound("Trade", id);
        return t;
    }

    public EntityProof tradeHistory(AuthUser me, long id) {
        trade(me, id);
        return ledger.proof("TRADE", Long.toString(id));
    }

    // ---------- helpers ----------

    private void recordBid(AuthUser me, long bidId, LedgerEventType type, String reason) {
        String hash = ledger.record(LedgerEvent.of(type, "BID", bidId, me, Payload.of("bidId", bidId, "reason", reason))).hash();
        trades.setBidLedgerHash(bidId, hash);
    }

    private static void requireOpen(ListingCore l) {
        if (!"ACTIVE".equals(l.storedStatus())) throw ApiException.state("This listing is closed");
        if (l.validUntil().isBefore(LocalDate.now())) throw ApiException.state("This listing has expired");
    }

    private Bid bid(long id) { return trades.bid(id).orElseThrow(() -> ApiException.notFound("Bid", id)); }

    private static LocalDate min(LocalDate a, LocalDate b) { return a.isBefore(b) ? a : b; }
}
