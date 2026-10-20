package com.krsi.repository;

import com.krsi.dto.request.WarehouseRequests;
import com.krsi.dto.response.WarehouseResponses.Attribute;
import com.krsi.dto.response.WarehouseResponses.AuditView;
import com.krsi.dto.response.WarehouseResponses.Details;
import com.krsi.dto.response.WarehouseResponses.Stats;
import com.krsi.dto.response.WarehouseResponses.Summary;
import com.krsi.model.AuditResult;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Data access for warehouses, their infrastructure rows and audits. */
@Repository
public class WarehouseRepository {
    /** Great-circle distance in km from (?, ?) [lat, lat, lng] to the warehouse, rounded to 0.1 km. */
    private static final String DISTANCE = """
            ROUND((6371 * 2 * ASIN(LEAST(1, SQRT(POWER(SIN(RADIANS(w.latitude - ?) / 2), 2)
              + COS(RADIANS(?)) * COS(RADIANS(w.latitude)) * POWER(SIN(RADIANS(w.longitude - ?) / 2), 2)))))::numeric, 1)""";

    public record Page(List<Summary> items, long total) {}

    /** The fields services need for rules (capacity, owner, rate). */
    public record Core(String id, String name, String district, long ownerId, BigDecimal totalCapacityMt,
                       BigDecimal availableCapacityMt, BigDecimal storageRatePerMtMonth, List<String> crops, boolean verified) {}

    private final JdbcTemplate jdbc;

    public WarehouseRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Page search(WarehouseRequests.Search s, Double lat, Double lng) {
        boolean hasOrigin = lat != null && lng != null;
        List<Object> selectArgs = hasOrigin ? List.of(lat, lat, lng) : List.of();
        String inner = "SELECT w.*, " + (hasOrigin ? DISTANCE : "NULL::numeric") + " AS distance_km FROM warehouses w WHERE w.status = 'ACTIVE'";

        SqlFilter f = new SqlFilter()
                .search(s.q(), "w.name", "w.address", "w.district", "w.state", "array_to_string(w.crops, ' ')")
                .rawIf(Rows.present(s.commodity()), "EXISTS (SELECT 1 FROM unnest(w.crops) c WHERE LOWER(c) = LOWER(?))",
                        s.commodity() == null ? "" : s.commodity().trim())
                .rawIf(hasOrigin && s.radiusKm() != null, "w.distance_km <= ?", s.radiusKm() == null ? 0 : s.radiusKm())
                .rawIf(s.minAvailableMt() != null, "w.available_capacity_mt >= ?", s.minAvailableMt())
                .rawIf(s.maxAvailableMt() != null, "w.available_capacity_mt <= ?", s.maxAvailableMt())
                .rawIf(Boolean.TRUE.equals(s.verifiedOnly()), "w.verified");

        WarehouseRequests.Sort sort = s.sort() == null ? WarehouseRequests.Sort.NEAREST : s.sort();
        String order = switch (sort) {
            case NEAREST -> hasOrigin ? "w.distance_km, w.name" : "w.name";
            case CAPACITY -> "w.available_capacity_mt DESC, w.name";
            case NAME -> "w.name";
            case RATING -> "w.rating DESC, w.name";
        };
        String from = " FROM (" + inner + ") w" + f.where();
        List<Object> countArgs = new ArrayList<>(selectArgs);
        countArgs.addAll(List.of(f.args()));
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + from, Long.class, countArgs.toArray());

        List<Object> args = new ArrayList<>(countArgs);
        args.add(s.sizeOrDefault());
        args.add(s.pageOrDefault() * s.sizeOrDefault());
        List<Summary> items = jdbc.query("SELECT w.*" + from + " ORDER BY " + order + " LIMIT ? OFFSET ?",
                WarehouseRepository::mapSummary, args.toArray());
        return new Page(items, total == null ? 0 : total);
    }

    public List<Summary> nearby(String id, int limit) {
        return jdbc.query("""
                SELECT w.*, ROUND((6371 * 2 * ASIN(LEAST(1, SQRT(POWER(SIN(RADIANS(w.latitude - o.latitude) / 2), 2)
                  + COS(RADIANS(o.latitude)) * COS(RADIANS(w.latitude)) * POWER(SIN(RADIANS(w.longitude - o.longitude) / 2), 2)))))::numeric, 1) AS distance_km
                FROM warehouses w, warehouses o
                WHERE o.id = ? AND w.id <> o.id AND w.status = 'ACTIVE'
                ORDER BY distance_km, w.name LIMIT ?""", WarehouseRepository::mapSummary, id, limit);
    }

    public List<Summary> byOwner(long ownerId) {
        return jdbc.query("SELECT w.*, NULL::numeric AS distance_km FROM warehouses w WHERE owner_id = ? ORDER BY name",
                WarehouseRepository::mapSummary, ownerId);
    }

    public Optional<Details> details(String id, String currency) {
        List<Attribute> attributes = jdbc.query(
                "SELECT label, value FROM warehouse_attributes WHERE warehouse_id = ? ORDER BY sort_order",
                (rs, i) -> new Attribute(rs.getString("label"), rs.getString("value")), id);
        Optional<AuditView> audit = latestAudit(id);
        return jdbc.query("""
                SELECT w.*, COALESCE(u.full_name, 'Warehouse owner') AS owner_name
                FROM warehouses w JOIN users u ON u.id = w.owner_id WHERE w.id = ?""",
                (rs, i) -> mapDetails(rs, attributes, audit.orElse(null), currency), id).stream().findFirst();
    }

    public Optional<Core> core(String id) {
        return jdbc.query("SELECT * FROM warehouses WHERE id = ?", (rs, i) -> new Core(rs.getString("id"), rs.getString("name"),
                rs.getString("district"), rs.getLong("owner_id"), rs.getBigDecimal("total_capacity_mt"),
                rs.getBigDecimal("available_capacity_mt"), rs.getBigDecimal("storage_rate_per_mt_month"), Rows.strings(rs, "crops"),
                rs.getBoolean("verified")), id).stream().findFirst();
    }

    public boolean exists(String id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM warehouses WHERE id = ?)", Boolean.class, id));
    }

    public boolean codeTaken(String code, String exceptId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM warehouses WHERE LOWER(code) = LOWER(?) AND id <> ?)",
                Boolean.class, code, exceptId == null ? "" : exceptId));
    }

    public void insert(String id, long ownerId, WarehouseRequests.Upsert r, List<String> crops) {
        jdbc.update("""
                INSERT INTO warehouses (id, owner_id, name, legal_name, code, operator, type, description, address, district, state,
                  latitude, longitude, total_capacity_mt, available_capacity_mt, storage_rate_per_mt_month, crops, amenities, licenses,
                  photos, suitable_for, access_hours, connectivity, year_established, total_area_sqft, wdra_registered)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                id, ownerId, r.name().trim(), r.legalName().trim(), r.code().trim(), r.operator().trim(), orDefault(r.type(), "Private"),
                orDefault(r.description(), ""), r.address().trim(), r.district().trim(), r.state().trim(), r.latitude(), r.longitude(),
                r.totalCapacityMt(), r.totalCapacityMt(), r.storageRatePerMtMonth(), array(crops), array(r.amenities()),
                array(r.licenses()), array(r.photos()), orDefault(r.suitableFor(), ""), orDefault(r.accessHours(), "24/7"),
                orDefault(r.connectivity(), ""), r.yearEstablished(), r.totalAreaSqft(), Boolean.TRUE.equals(r.wdraRegistered()));
        replaceAttributes(id, r.infrastructure());
    }

    /** Updates details; changing total capacity moves available capacity by the same amount. */
    public int update(String id, WarehouseRequests.Upsert r, List<String> crops) {
        int n = jdbc.update("""
                UPDATE warehouses SET name = ?, legal_name = ?, code = ?, operator = ?, type = ?, description = ?, address = ?,
                  district = ?, state = ?, latitude = ?, longitude = ?,
                  available_capacity_mt = available_capacity_mt + (? - total_capacity_mt), total_capacity_mt = ?,
                  storage_rate_per_mt_month = ?, crops = ?, amenities = ?, licenses = ?, photos = ?, suitable_for = ?,
                  access_hours = ?, connectivity = ?, year_established = ?, total_area_sqft = ?, wdra_registered = ?
                WHERE id = ?""",
                r.name().trim(), r.legalName().trim(), r.code().trim(), r.operator().trim(), orDefault(r.type(), "Private"),
                orDefault(r.description(), ""), r.address().trim(), r.district().trim(), r.state().trim(), r.latitude(), r.longitude(),
                r.totalCapacityMt(), r.totalCapacityMt(), r.storageRatePerMtMonth(), array(crops), array(r.amenities()),
                array(r.licenses()), array(r.photos()), orDefault(r.suitableFor(), ""), orDefault(r.accessHours(), "24/7"),
                orDefault(r.connectivity(), ""), r.yearEstablished(), r.totalAreaSqft(), Boolean.TRUE.equals(r.wdraRegistered()), id);
        replaceAttributes(id, r.infrastructure());
        return n;
    }

    /** Takes capacity for a deposit; false if not enough is free (checked atomically). */
    public boolean reserveCapacity(String id, BigDecimal mt) {
        return jdbc.update("UPDATE warehouses SET available_capacity_mt = available_capacity_mt - ? WHERE id = ? AND available_capacity_mt >= ?",
                mt, id, mt) == 1;
    }

    public void releaseCapacity(String id, BigDecimal mt) {
        jdbc.update("UPDATE warehouses SET available_capacity_mt = LEAST(total_capacity_mt, available_capacity_mt + ?) WHERE id = ?", mt, id);
    }

    public void setLedgerHash(String id, String hash) { jdbc.update("UPDATE warehouses SET ledger_hash = ? WHERE id = ?", hash, id); }

    public Stats stats() {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FILTER (WHERE w.verified) AS verified, COUNT(*) AS total,
                       COALESCE(SUM(w.total_capacity_mt), 0) AS capacity, COUNT(DISTINCT w.state) AS states,
                       COALESCE(ROUND(COUNT(*) FILTER (WHERE la.result IN ('PASSED', 'PASSED_WITH_OBSERVATIONS')) * 100.0
                         / NULLIF(COUNT(*), 0), 1), 0) AS quality
                FROM warehouses w
                LEFT JOIN LATERAL (SELECT a.result FROM warehouse_audits a WHERE a.warehouse_id = w.id
                                   ORDER BY a.audited_on DESC, a.id DESC LIMIT 1) la ON true
                WHERE w.status = 'ACTIVE'""",
                (rs, i) -> new Stats(rs.getLong("verified"), rs.getLong("total"), rs.getBigDecimal("capacity"),
                        rs.getBigDecimal("quality"), rs.getLong("states")));
    }

    // ---------- audits ----------

    private static final String AUDIT_SELECT = """
            SELECT a.*, w.name AS warehouse_name, COALESCE(u.full_name, 'Auditor') AS auditor_name
            FROM warehouse_audits a JOIN warehouses w ON w.id = a.warehouse_id JOIN users u ON u.id = a.auditor_id""";

    public long insertAudit(String warehouseId, long auditorId, LocalDate on, AuditResult result, BigDecimal rating,
                            BigDecimal recorded, BigDecimal verified, String findings) {
        Long id = jdbc.queryForObject("""
                INSERT INTO warehouse_audits (warehouse_id, auditor_id, audited_on, result, rating, stock_recorded_mt, stock_verified_mt, findings)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""", Long.class,
                warehouseId, auditorId, on, result.name(), rating, recorded, verified, findings);
        return id;
    }

    /** Rating = average of audit ratings; verified = latest audit did not fail. */
    public void applyAudit(String warehouseId, AuditResult latest) {
        jdbc.update("""
                UPDATE warehouses SET verified = ?,
                  rating = (SELECT ROUND(AVG(rating), 1) FROM warehouse_audits WHERE warehouse_id = ?),
                  rating_count = (SELECT COUNT(*) FROM warehouse_audits WHERE warehouse_id = ?)
                WHERE id = ?""", latest != AuditResult.FAILED, warehouseId, warehouseId, warehouseId);
    }

    public void setAuditLedgerHash(long id, String hash) { jdbc.update("UPDATE warehouse_audits SET ledger_hash = ? WHERE id = ?", hash, id); }

    public Optional<AuditView> audit(long id) {
        return jdbc.query(AUDIT_SELECT + " WHERE a.id = ?", WarehouseRepository::mapAudit, id).stream().findFirst();
    }

    public Optional<AuditView> latestAudit(String warehouseId) {
        return jdbc.query(AUDIT_SELECT + " WHERE a.warehouse_id = ? ORDER BY a.audited_on DESC, a.id DESC LIMIT 1",
                WarehouseRepository::mapAudit, warehouseId).stream().findFirst();
    }

    public List<AuditView> audits(String warehouseId, int limit) {
        if (warehouseId == null)
            return jdbc.query(AUDIT_SELECT + " ORDER BY a.audited_on DESC, a.id DESC LIMIT ?", WarehouseRepository::mapAudit, limit);
        return jdbc.query(AUDIT_SELECT + " WHERE a.warehouse_id = ? ORDER BY a.audited_on DESC, a.id DESC LIMIT ?",
                WarehouseRepository::mapAudit, warehouseId, limit);
    }

    public long countAuditsSince(long auditorId, LocalDate since) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM warehouse_audits WHERE auditor_id = ? AND audited_on >= ?", Long.class, auditorId, since);
        return n == null ? 0 : n;
    }

    /** Warehouses never audited or last audited before the cutoff: the auditor's to-do list. */
    public List<Summary> dueForAudit(LocalDate before, int limit) {
        return jdbc.query("""
                SELECT w.*, NULL::numeric AS distance_km FROM warehouses w
                WHERE w.status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM warehouse_audits a WHERE a.warehouse_id = w.id AND a.audited_on >= ?)
                ORDER BY w.name LIMIT ?""", WarehouseRepository::mapSummary, before, limit);
    }

    // ---------- mapping ----------

    private void replaceAttributes(String id, List<WarehouseRequests.Attribute> attributes) {
        jdbc.update("DELETE FROM warehouse_attributes WHERE warehouse_id = ?", id);
        if (attributes == null) return;
        int order = 0;
        for (WarehouseRequests.Attribute a : attributes) {
            jdbc.update("INSERT INTO warehouse_attributes (warehouse_id, label, value, sort_order) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
                    id, a.label().trim(), a.value().trim(), order++);
        }
    }

    private static String[] array(List<String> values) {
        return values == null ? new String[0] : values.stream().map(String::trim).distinct().toArray(String[]::new);
    }

    private static String orDefault(String value, String fallback) { return value == null || value.isBlank() ? fallback : value.trim(); }

    private static String firstPhoto(List<String> photos) { return photos.isEmpty() ? "/assets/warehouse.png" : photos.get(0); }

    static Summary mapSummary(ResultSet rs, int row) throws SQLException {
        List<String> photos = Rows.strings(rs, "photos");
        return new Summary(rs.getString("id"), rs.getString("name"), rs.getString("address"), rs.getString("district"),
                rs.getString("state"), rs.getBigDecimal("distance_km"), rs.getBigDecimal("total_capacity_mt"),
                rs.getBigDecimal("available_capacity_mt"), rs.getBigDecimal("storage_rate_per_mt_month"), Rows.strings(rs, "crops"),
                firstPhoto(photos), rs.getBoolean("wdra_registered"), rs.getBoolean("verified"), rs.getBigDecimal("rating"),
                rs.getInt("rating_count"));
    }

    private static Details mapDetails(ResultSet rs, List<Attribute> attributes, AuditView audit, String currency) throws SQLException {
        BigDecimal total = rs.getBigDecimal("total_capacity_mt");
        BigDecimal available = rs.getBigDecimal("available_capacity_mt");
        Integer year = (Integer) rs.getObject("year_established");
        Integer area = (Integer) rs.getObject("total_area_sqft");
        List<String> photos = Rows.strings(rs, "photos");
        return new Details(rs.getString("id"), rs.getString("name"), rs.getString("legal_name"), rs.getString("code"),
                rs.getString("operator"), rs.getString("type"), rs.getString("description"), rs.getString("address"),
                rs.getString("district"), rs.getString("state"), rs.getDouble("latitude"), rs.getDouble("longitude"),
                total, available, total.subtract(available).setScale(2, RoundingMode.HALF_UP), rs.getBigDecimal("storage_rate_per_mt_month"),
                currency, Rows.strings(rs, "crops"), Rows.strings(rs, "amenities"), Rows.strings(rs, "licenses"),
                photos.isEmpty() ? List.of("/assets/warehouse.png") : photos, attributes, rs.getString("suitable_for"),
                rs.getString("access_hours"), rs.getString("connectivity"), year, area, rs.getBigDecimal("rating"),
                rs.getInt("rating_count"), rs.getBoolean("wdra_registered"), rs.getBoolean("verified"), rs.getLong("owner_id"),
                rs.getString("owner_name"), audit, rs.getString("ledger_hash"), Rows.instant(rs, "created_at"));
    }

    static AuditView mapAudit(ResultSet rs, int row) throws SQLException {
        BigDecimal recorded = rs.getBigDecimal("stock_recorded_mt");
        BigDecimal verified = rs.getBigDecimal("stock_verified_mt");
        return new AuditView(rs.getLong("id"), rs.getString("code"), rs.getString("warehouse_id"), rs.getString("warehouse_name"),
                rs.getLong("auditor_id"), rs.getString("auditor_name"), Rows.date(rs, "audited_on"),
                AuditResult.valueOf(rs.getString("result")), rs.getBigDecimal("rating"), recorded, verified,
                verified.subtract(recorded), rs.getString("findings"), rs.getString("ledger_hash"), Rows.instant(rs, "created_at"));
    }
}
