package com.krsi.repository;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;

/** Small ResultSet helpers shared by the repositories (null-safe column reads). */
public final class Rows {
    private Rows() {}

    public static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp t = rs.getTimestamp(column);
        return t == null ? null : t.toInstant();
    }

    public static LocalDate date(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, LocalDate.class);
    }

    public static BigDecimal dec(ResultSet rs, String column) throws SQLException {
        return rs.getBigDecimal(column);
    }

    public static Long longOrNull(ResultSet rs, String column) throws SQLException {
        long v = rs.getLong(column);
        return rs.wasNull() ? null : v;
    }

    public static Double doubleOrNull(ResultSet rs, String column) throws SQLException {
        double v = rs.getDouble(column);
        return rs.wasNull() ? null : v;
    }

    public static List<String> strings(ResultSet rs, String column) throws SQLException {
        Array array = rs.getArray(column);
        if (array == null) return List.of();
        return Arrays.stream((Object[]) array.getArray()).map(String::valueOf).toList();
    }

    public static boolean has(ResultSet rs, String column) throws SQLException {
        int n = rs.getMetaData().getColumnCount();
        for (int i = 1; i <= n; i++) if (rs.getMetaData().getColumnLabel(i).equalsIgnoreCase(column)) return true;
        return false;
    }

    /** Value for a TIMESTAMPTZ parameter (the PostgreSQL driver does not accept Instant directly). */
    public static OffsetDateTime ts(Instant instant) {
        return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
    }

    /** Escapes LIKE wildcards in user text and wraps it in %...%. Used with ILIKE ... ESCAPE '\'. */
    public static String like(String text) {
        return "%" + text.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }

    public static boolean present(String s) { return s != null && !s.isBlank(); }
}
