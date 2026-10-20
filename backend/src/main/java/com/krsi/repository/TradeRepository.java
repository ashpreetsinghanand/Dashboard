package com.krsi.repository;

import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.TradeRequests;
import com.krsi.dto.response.TradeResponses.Bid;
import com.krsi.dto.response.TradeResponses.Listing;
import com.krsi.dto.response.TradeResponses.Trade;
import com.krsi.model.BidStatus;
import com.krsi.model.ListingStatus;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Listings, bids and settled trades. */
@Repository
public class TradeRepository {
    /** Listing with joined receipt/warehouse data and the derived display status. */
    private static final String LISTING_VIEW = """
            SELECT l.id, l.code, l.enwr_id, e.receipt_no, e.commodity, e.grade, c.category, c.image_url,
                   w.id AS warehouse_id, w.name AS warehouse_name, w.district AS region, w.state, w.verified AS warehouse_verified,
                   l.seller_id, COALESCE(u.full_name, 'Seller') AS seller_name, l.quantity_mt, l.original_quantity_mt,
                   l.asking_price_per_mt, l.min_quantity_mt, e.stored_on, e.valid_till, l.valid_until, l.status AS stored_status,
                   ab.offers, ab.best_bid,
                   CASE WHEN l.status = 'ACTIVE' AND l.valid_until < CURRENT_DATE THEN 'EXPIRED'
                        WHEN l.status = 'ACTIVE' AND ab.offers > 0 THEN 'UNDER_OFFER'
                        ELSE l.status END AS status,
                   l.created_at, l.ledger_hash
            FROM listings l
            JOIN enwrs e ON e.id = l.enwr_id
            JOIN warehouses w ON w.id = e.warehouse_id
            JOIN commodities c ON c.name = e.commodity
            JOIN users u ON u.id = l.seller_id
            CROSS JOIN LATERAL (SELECT COUNT(*) AS offers, MAX(b.price_per_mt) AS best_bid
                                FROM bids b WHERE b.listing_id = l.id AND b.status = 'ACTIVE') ab""";

    private static final String BID_VIEW = """
            SELECT b.id, b.code, b.listing_id, l.code AS listing_code, e.receipt_no, e.commodity, e.grade, c.image_url,
                   w.name AS warehouse_name, b.buyer_id, COALESCE(u.full_name, 'Buyer') AS buyer_name, l.seller_id,
                   b.quantity_mt, b.price_per_mt, ROUND(b.quantity_mt * b.price_per_mt, 2) AS total_value, b.status,
                   b.created_at, b.decided_at, t.id AS trade_id, b.ledger_hash
            FROM bids b
            JOIN listings l ON l.id = b.listing_id
            JOIN enwrs e ON e.id = l.enwr_id
            JOIN warehouses w ON w.id = e.warehouse_id
            JOIN commodities c ON c.name = e.commodity
            JOIN users u ON u.id = b.buyer_id
            LEFT JOIN trades t ON t.bid_id = b.id""";

    private static final String TRADE_VIEW = """
            SELECT t.*, se.receipt_no AS source_receipt_no, be.receipt_no AS buyer_receipt_no, be.grade, c.image_url,
                   w.name AS warehouse_name, COALESCE(s.full_name, 'Seller') AS seller_name, COALESCE(b.full_name, 'Buyer') AS buyer_name
            FROM trades t
            JOIN enwrs se ON se.id = t.source_enwr_id
            JOIN enwrs be ON be.id = t.buyer_enwr_id
            JOIN warehouses w ON w.id = be.warehouse_id
            JOIN commodities c ON c.name = t.commodity
            JOIN users s ON s.id = t.seller_id
            JOIN users b ON b.id = t.buyer_id""";

    /** Raw listing state for business rules. */
    public record ListingCore(long id, long enwrId, long sellerId, BigDecimal quantityMt, BigDecimal askingPricePerMt,
                              BigDecimal minQuantityMt, LocalDate validUntil, String storedStatus) {}

    public record BidCore(long id, long listingId, long buyerId, BigDecimal quantityMt, BigDecimal pricePerMt, BidStatus status) {}

    private final JdbcTemplate jdbc;

    public TradeRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    // ---------- listings ----------

    public long insertListing(long enwrId, long sellerId, BigDecimal qty, BigDecimal price, BigDecimal minQty, LocalDate validUntil) {
        Long id = jdbc.queryForObject("""
                INSERT INTO listings (enwr_id, seller_id, quantity_mt, original_quantity_mt, asking_price_per_mt, min_quantity_mt, valid_until, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE') RETURNING id""", Long.class, enwrId, sellerId, qty, qty, price, minQty, validUntil);
        return id;
    }

    public Optional<Listing> listing(long id) {
        return jdbc.query("SELECT * FROM (" + LISTING_VIEW + ") v WHERE v.id = ?", TradeRepository::mapListing, id).stream().findFirst();
    }

    public Optional<ListingCore> listingForUpdate(long id) {
        return jdbc.query("SELECT * FROM listings WHERE id = ? FOR UPDATE", (rs, i) -> new ListingCore(rs.getLong("id"),
                rs.getLong("enwr_id"), rs.getLong("seller_id"), rs.getBigDecimal("quantity_mt"), rs.getBigDecimal("asking_price_per_mt"),
                rs.getBigDecimal("min_quantity_mt"), Rows.date(rs, "valid_until"), rs.getString("status")), id).stream().findFirst();
    }

    public void updateListing(long id, BigDecimal price, BigDecimal minQty, LocalDate validUntil) {
        jdbc.update("""
                UPDATE listings SET asking_price_per_mt = COALESCE(?, asking_price_per_mt), min_quantity_mt = COALESCE(?, min_quantity_mt),
                  valid_until = COALESCE(?, valid_until), updated_at = now() WHERE id = ?""", price, minQty, validUntil, id);
    }

    public void setListingStatus(long id, String status) {
        jdbc.update("UPDATE listings SET status = ?, updated_at = now() WHERE id = ?", status, id);
    }

    public void reduceListing(long id, BigDecimal by) {
        jdbc.update("UPDATE listings SET quantity_mt = quantity_mt - ?, updated_at = now() WHERE id = ?", by, id);
    }

    public void setListingLedgerHash(long id, String hash) { jdbc.update("UPDATE listings SET ledger_hash = ? WHERE id = ?", hash, id); }

    public PageResponse<Listing> myListings(long sellerId, TradeRequests.ListingSearch s) {
        SqlFilter f = new SqlFilter().eq("v.seller_id", sellerId)
                .search(s.q(), "v.commodity", "v.warehouse_name", "v.region", "v.receipt_no", "v.code")
                .ieq("v.commodity", s.commodity())
                .eq("v.status", s.status() == null ? null : s.status().name());
        return pageListings(f, "v.created_at DESC, v.id DESC", s.page(), s.size());
    }

    public PageResponse<Listing> marketplace(TradeRequests.MarketSearch s) {
        SqlFilter f = new SqlFilter().raw("v.status IN ('ACTIVE', 'UNDER_OFFER')").raw("v.quantity_mt > 0")
                .search(s.q(), "v.commodity", "v.warehouse_name", "v.region", "v.state")
                .ieq("v.category", s.category())
                .search(s.region(), "v.region", "v.state")
                .ieq("v.grade", s.grade())
                .rawIf(s.minQuantityMt() != null, "v.quantity_mt >= ?", s.minQuantityMt())
                .rawIf(s.maxQuantityMt() != null, "v.quantity_mt <= ?", s.maxQuantityMt())
                .rawIf(Boolean.TRUE.equals(s.verifiedOnly()), "v.warehouse_verified");
        TradeRequests.MarketSort sort = s.sort() == null ? TradeRequests.MarketSort.LATEST : s.sort();
        String order = switch (sort) {
            case LATEST -> "v.created_at DESC, v.id DESC";
            case NAME -> "v.commodity, v.id";
            case PRICE_LOW -> "v.asking_price_per_mt, v.id";
            case PRICE_HIGH -> "v.asking_price_per_mt DESC, v.id";
        };
        return pageListings(f, order, s.page(), s.size());
    }

    /** Distinct regions and grades currently on sale, for the Marketplace filter dropdowns. */
    public List<String> marketplaceValues(String column) {
        String col = switch (column) {
            case "region" -> "v.region";
            case "grade" -> "v.grade";
            default -> throw new IllegalArgumentException(column);
        };
        return jdbc.query("SELECT DISTINCT " + col + " FROM (" + LISTING_VIEW + ") v WHERE v.status IN ('ACTIVE', 'UNDER_OFFER') ORDER BY 1",
                (rs, i) -> rs.getString(1));
    }

    private PageResponse<Listing> pageListings(SqlFilter f, String order, Integer pageParam, Integer sizeParam) {
        int size = sizeParam == null ? 20 : sizeParam;
        int page = pageParam == null ? 0 : pageParam;
        String from = " FROM (" + LISTING_VIEW + ") v" + f.where();
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + from, Long.class, f.args());
        List<Listing> items = jdbc.query("SELECT v.*" + from + " ORDER BY " + order + " LIMIT ? OFFSET ?",
                TradeRepository::mapListing, f.args(size, page * size));
        return PageResponse.of(items, page, size, total == null ? 0 : total);
    }

    public record ListingStats(long active, long newThisWeek, BigDecimal listedMt, BigDecimal askingValue, long offers, long newOffersThisWeek) {}

    public ListingStats listingStats(long sellerId) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FILTER (WHERE v.status IN ('ACTIVE', 'UNDER_OFFER')) AS active,
                       COUNT(*) FILTER (WHERE v.status IN ('ACTIVE', 'UNDER_OFFER') AND v.created_at > now() - interval '7 days') AS new_week,
                       COALESCE(SUM(v.quantity_mt) FILTER (WHERE v.status IN ('ACTIVE', 'UNDER_OFFER')), 0) AS listed,
                       COALESCE(ROUND(SUM(v.quantity_mt * v.asking_price_per_mt) FILTER (WHERE v.status IN ('ACTIVE', 'UNDER_OFFER')), 2), 0) AS value,
                       (SELECT COUNT(*) FROM bids b JOIN listings l ON l.id = b.listing_id WHERE l.seller_id = ? AND b.status = 'ACTIVE') AS offers,
                       (SELECT COUNT(*) FROM bids b JOIN listings l ON l.id = b.listing_id WHERE l.seller_id = ?
                          AND b.created_at > now() - interval '7 days') AS new_offers
                FROM (""" + LISTING_VIEW + ") v WHERE v.seller_id = ?",
                (rs, i) -> new ListingStats(rs.getLong("active"), rs.getLong("new_week"), rs.getBigDecimal("listed"),
                        rs.getBigDecimal("value"), rs.getLong("offers"), rs.getLong("new_offers")), sellerId, sellerId, sellerId);
    }

    // ---------- bids ----------

    public long insertBid(long listingId, long buyerId, BigDecimal qty, BigDecimal price) {
        Long id = jdbc.queryForObject("""
                INSERT INTO bids (listing_id, buyer_id, quantity_mt, price_per_mt, status) VALUES (?, ?, ?, ?, 'ACTIVE') RETURNING id""",
                Long.class, listingId, buyerId, qty, price);
        return id;
    }

    public Optional<Bid> bid(long id) {
        return jdbc.query(BID_VIEW + " WHERE b.id = ?", TradeRepository::mapBid, id).stream().findFirst();
    }

    public Optional<BidCore> bidForUpdate(long id) {
        return jdbc.query("SELECT * FROM bids WHERE id = ? FOR UPDATE", (rs, i) -> new BidCore(rs.getLong("id"), rs.getLong("listing_id"),
                rs.getLong("buyer_id"), rs.getBigDecimal("quantity_mt"), rs.getBigDecimal("price_per_mt"),
                BidStatus.valueOf(rs.getString("status"))), id).stream().findFirst();
    }

    public boolean hasActiveBid(long listingId, long buyerId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM bids WHERE listing_id = ? AND buyer_id = ? AND status = 'ACTIVE')",
                Boolean.class, listingId, buyerId));
    }

    public boolean decideBid(long id, BidStatus to) {
        return jdbc.update("UPDATE bids SET status = ?, decided_at = now() WHERE id = ? AND status = 'ACTIVE'", to.name(), id) == 1;
    }

    /** After a sale, bids that ask for more than what is left can no longer be filled. */
    public List<Long> rejectUnfillableBids(long listingId, BigDecimal remainingMt) {
        return jdbc.query("""
                UPDATE bids SET status = 'REJECTED', decided_at = now()
                WHERE listing_id = ? AND status = 'ACTIVE' AND quantity_mt > ? RETURNING id""", (rs, i) -> rs.getLong(1), listingId, remainingMt);
    }

    public List<Long> rejectAllActiveBids(long listingId) {
        return rejectUnfillableBids(listingId, BigDecimal.valueOf(-1));
    }

    public void setBidLedgerHash(long id, String hash) { jdbc.update("UPDATE bids SET ledger_hash = ? WHERE id = ?", hash, id); }

    public PageResponse<Bid> myBids(long buyerId, TradeRequests.BidSearch s) {
        SqlFilter f = new SqlFilter().eq("b.buyer_id", buyerId)
                .search(s.q(), "e.commodity", "w.name", "w.district", "e.receipt_no", "b.code")
                .ieq("e.commodity", s.commodity())
                .eq("b.status", s.status() == null ? null : s.status().name());
        int size = s.size() == null ? 20 : s.size();
        int page = s.page() == null ? 0 : s.page();
        Long total = jdbc.queryForObject("""
                SELECT COUNT(*) FROM bids b JOIN listings l ON l.id = b.listing_id JOIN enwrs e ON e.id = l.enwr_id
                JOIN warehouses w ON w.id = e.warehouse_id""" + f.where(), Long.class, f.args());
        List<Bid> items = jdbc.query(BID_VIEW + f.where() + " ORDER BY b.created_at DESC, b.id DESC LIMIT ? OFFSET ?",
                TradeRepository::mapBid, f.args(size, page * size));
        return PageResponse.of(items, page, size, total == null ? 0 : total);
    }

    public List<Bid> bidsForListing(long listingId) {
        return jdbc.query(BID_VIEW + " WHERE b.listing_id = ? ORDER BY (b.status = 'ACTIVE') DESC, b.price_per_mt DESC, b.created_at",
                TradeRepository::mapBid, listingId);
    }

    public record BidStats(long active, long newThisWeek, BigDecimal activeValue, long accepted, long rejected) {}

    public BidStats bidStats(long buyerId) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active,
                       COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') AS new_week,
                       COALESCE(ROUND(SUM(quantity_mt * price_per_mt) FILTER (WHERE status = 'ACTIVE'), 2), 0) AS active_value,
                       COUNT(*) FILTER (WHERE status = 'ACCEPTED') AS accepted,
                       COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected
                FROM bids WHERE buyer_id = ?""",
                (rs, i) -> new BidStats(rs.getLong("active"), rs.getLong("new_week"), rs.getBigDecimal("active_value"),
                        rs.getLong("accepted"), rs.getLong("rejected")), buyerId);
    }

    /** ACTIVE bids on a seller's listings that are waiting for an answer. */
    public long pendingOffersForSeller(long sellerId) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM bids b JOIN listings l ON l.id = b.listing_id WHERE l.seller_id = ? AND b.status = 'ACTIVE'",
                Long.class, sellerId);
        return n == null ? 0 : n;
    }

    // ---------- trades ----------

    public long insertTrade(long listingId, long bidId, long sellerId, long buyerId, long sourceEnwrId, long buyerEnwrId,
                            String commodity, BigDecimal qty, BigDecimal price, BigDecimal total) {
        Long id = jdbc.queryForObject("""
                INSERT INTO trades (listing_id, bid_id, seller_id, buyer_id, source_enwr_id, buyer_enwr_id, commodity, quantity_mt,
                  price_per_mt, total_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""", Long.class,
                listingId, bidId, sellerId, buyerId, sourceEnwrId, buyerEnwrId, commodity, qty, price, total);
        return id;
    }

    public void setTradeLedgerHash(long id, String hash) { jdbc.update("UPDATE trades SET ledger_hash = ? WHERE id = ?", hash, id); }

    public Optional<Trade> trade(long id, long viewerId) {
        return jdbc.query(TRADE_VIEW + " WHERE t.id = ?", (rs, i) -> mapTrade(rs, viewerId), id).stream().findFirst();
    }

    public PageResponse<Trade> tradesFor(long userId, String q, Integer pageParam, Integer sizeParam) {
        SqlFilter f = new SqlFilter().raw("(t.seller_id = ? OR t.buyer_id = ?)", userId, userId)
                .search(q, "t.commodity", "t.code", "w.name");
        int size = sizeParam == null ? 20 : sizeParam;
        int page = pageParam == null ? 0 : pageParam;
        Long total = jdbc.queryForObject("""
                SELECT COUNT(*) FROM trades t JOIN enwrs be ON be.id = t.buyer_enwr_id JOIN warehouses w ON w.id = be.warehouse_id"""
                + f.where(), Long.class, f.args());
        List<Trade> items = jdbc.query(TRADE_VIEW + f.where() + " ORDER BY t.settled_at DESC, t.id DESC LIMIT ? OFFSET ?",
                (rs, i) -> mapTrade(rs, userId), f.args(size, page * size));
        return PageResponse.of(items, page, size, total == null ? 0 : total);
    }

    public BigDecimal salesTotal(long sellerId) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(total_value), 0) FROM trades WHERE seller_id = ?", BigDecimal.class, sellerId);
    }

    public BigDecimal purchasesTotal(long buyerId) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(total_value), 0) FROM trades WHERE buyer_id = ?", BigDecimal.class, buyerId);
    }

    // ---------- mapping ----------

    static Listing mapListing(ResultSet rs, int row) throws SQLException {
        BigDecimal qty = rs.getBigDecimal("quantity_mt");
        BigDecimal price = rs.getBigDecimal("asking_price_per_mt");
        LocalDate validTill = Rows.date(rs, "valid_till");
        return new Listing(rs.getLong("id"), rs.getString("code"), rs.getLong("enwr_id"), rs.getString("receipt_no"),
                rs.getString("commodity"), rs.getString("grade"), rs.getString("category"), rs.getString("image_url"),
                rs.getString("warehouse_id"), rs.getString("warehouse_name"), rs.getString("region"), rs.getString("state"),
                rs.getBoolean("warehouse_verified"), rs.getLong("seller_id"), rs.getString("seller_name"), qty,
                rs.getBigDecimal("original_quantity_mt"), price, rs.getBigDecimal("min_quantity_mt"),
                qty.multiply(price).setScale(2, java.math.RoundingMode.HALF_UP), Rows.date(rs, "stored_on"), validTill,
                Math.max(0, ChronoUnit.DAYS.between(LocalDate.now(), validTill)), Rows.date(rs, "valid_until"),
                ListingStatus.valueOf(rs.getString("status")), rs.getLong("offers"), rs.getBigDecimal("best_bid"),
                Rows.instant(rs, "created_at"), rs.getString("ledger_hash"));
    }

    static Bid mapBid(ResultSet rs, int row) throws SQLException {
        return new Bid(rs.getLong("id"), rs.getString("code"), rs.getLong("listing_id"), rs.getString("listing_code"),
                rs.getString("receipt_no"), rs.getString("commodity"), rs.getString("grade"), rs.getString("image_url"),
                rs.getString("warehouse_name"), rs.getLong("buyer_id"), rs.getString("buyer_name"), rs.getLong("seller_id"),
                rs.getBigDecimal("quantity_mt"), rs.getBigDecimal("price_per_mt"), rs.getBigDecimal("total_value"),
                BidStatus.valueOf(rs.getString("status")), Rows.instant(rs, "created_at"), Rows.instant(rs, "decided_at"),
                Rows.longOrNull(rs, "trade_id"), rs.getString("ledger_hash"));
    }

    static Trade mapTrade(ResultSet rs, long viewerId) throws SQLException {
        long buyer = rs.getLong("buyer_id");
        return new Trade(rs.getLong("id"), rs.getString("code"), rs.getLong("listing_id"), rs.getLong("bid_id"),
                rs.getString("commodity"), rs.getString("grade"), rs.getString("image_url"), rs.getBigDecimal("quantity_mt"),
                rs.getBigDecimal("price_per_mt"), rs.getBigDecimal("total_value"), rs.getLong("seller_id"), rs.getString("seller_name"),
                buyer, rs.getString("buyer_name"), buyer == viewerId ? "BUY" : "SELL", rs.getString("source_receipt_no"),
                rs.getString("buyer_receipt_no"), rs.getLong("buyer_enwr_id"), rs.getString("warehouse_name"),
                Rows.instant(rs, "settled_at"), rs.getString("ledger_hash"));
    }
}
