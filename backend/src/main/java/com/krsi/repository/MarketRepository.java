package com.krsi.repository;

import com.krsi.dto.response.CommodityPriceResponse;
import com.krsi.dto.response.CommodityResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Commodities, their latest prices and per-user watchlists. */
@Repository
public class MarketRepository {
    private static final String PRICE_SELECT = """
            SELECT c.name, c.category, c.image_url, p.grade, p.price_per_kg, p.previous_price_per_kg, p.best_market, p.updated_at,
                   CASE WHEN p.previous_price_per_kg = 0 THEN 0
                        ELSE ROUND((p.price_per_kg - p.previous_price_per_kg) * 100 / p.previous_price_per_kg, 2) END AS change_pct,
                   EXISTS (SELECT 1 FROM watchlist w WHERE w.user_id = ? AND w.commodity = c.name) AS watched
            FROM commodity_prices p JOIN commodities c ON c.name = p.commodity""";

    private final JdbcTemplate jdbc;

    public MarketRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void upsertCommodity(String name, String category, String imageUrl) {
        jdbc.update("""
                INSERT INTO commodities (name, category, image_url) VALUES (?, ?, ?)
                ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category, image_url = EXCLUDED.image_url""", name, category, imageUrl);
    }

    public void upsertPrice(String commodity, String grade, BigDecimal pricePerKg, BigDecimal previous, String bestMarket) {
        jdbc.update("""
                INSERT INTO commodity_prices (commodity, grade, price_per_kg, previous_price_per_kg, best_market, updated_at)
                VALUES (?, ?, ?, ?, ?, now())
                ON CONFLICT (commodity) DO UPDATE SET grade = EXCLUDED.grade, previous_price_per_kg = commodity_prices.price_per_kg,
                  price_per_kg = EXCLUDED.price_per_kg, best_market = EXCLUDED.best_market, updated_at = now()""",
                commodity, grade, pricePerKg, previous, bestMarket);
    }

    public List<CommodityResponse> commodities() {
        return jdbc.query("SELECT * FROM commodities ORDER BY name",
                (rs, i) -> new CommodityResponse(rs.getString("name"), rs.getString("category"), rs.getString("image_url")));
    }

    /** Case-insensitive lookup; returns the canonical spelling. */
    public Optional<String> canonicalCommodity(String name) {
        return jdbc.query("SELECT name FROM commodities WHERE LOWER(name) = LOWER(?)", (rs, i) -> rs.getString(1), name.trim())
                .stream().findFirst();
    }

    public Optional<String> imageFor(String commodity) {
        return jdbc.query("SELECT image_url FROM commodities WHERE name = ?", (rs, i) -> rs.getString(1), commodity).stream().findFirst();
    }

    /** Price per MT (price per kg x 1000), used to value receipts for loans and dashboards. */
    public Optional<BigDecimal> pricePerMt(String commodity) {
        return jdbc.query("SELECT price_per_kg * 1000 FROM commodity_prices WHERE commodity = ?", (rs, i) -> rs.getBigDecimal(1), commodity)
                .stream().findFirst();
    }

    public List<CommodityPriceResponse> prices(long viewerId, String category, int limit) {
        if (category == null || category.isBlank())
            return jdbc.query(PRICE_SELECT + " ORDER BY c.name LIMIT ?", MarketRepository::map, viewerId, limit);
        return jdbc.query(PRICE_SELECT + " WHERE LOWER(c.category) = LOWER(?) ORDER BY c.name LIMIT ?", MarketRepository::map,
                viewerId, category.trim(), limit);
    }

    public List<CommodityPriceResponse> byChange(long viewerId, boolean gainers, int limit) {
        return jdbc.query(PRICE_SELECT + " ORDER BY change_pct " + (gainers ? "DESC" : "ASC") + ", c.name LIMIT ?",
                MarketRepository::map, viewerId, limit);
    }

    public List<CommodityPriceResponse> watchlist(long viewerId) {
        return jdbc.query("SELECT * FROM (" + PRICE_SELECT + ") x WHERE watched ORDER BY name", MarketRepository::map, viewerId);
    }

    public void watch(long userId, String commodity) {
        jdbc.update("INSERT INTO watchlist (user_id, commodity) VALUES (?, ?) ON CONFLICT DO NOTHING", userId, commodity);
    }

    public void unwatch(long userId, String commodity) {
        jdbc.update("DELETE FROM watchlist WHERE user_id = ? AND commodity = ?", userId, commodity);
    }

    static CommodityPriceResponse map(ResultSet rs, int row) throws SQLException {
        BigDecimal perKg = rs.getBigDecimal("price_per_kg");
        return new CommodityPriceResponse(rs.getString("name"), rs.getString("category"), rs.getString("grade"),
                rs.getString("image_url"), perKg, perKg.multiply(BigDecimal.valueOf(1000)).setScale(2, RoundingMode.HALF_UP),
                rs.getBigDecimal("previous_price_per_kg"), rs.getBigDecimal("change_pct"), rs.getString("best_market"),
                Rows.instant(rs, "updated_at"), rs.getBoolean("watched"));
    }
}
