package com.krsi.repository;

import java.util.ArrayList;
import java.util.List;

/** Builds a WHERE clause from optional filters. Only column expressions written in code are appended. */
public final class SqlFilter {
    private final StringBuilder where = new StringBuilder(" WHERE 1=1");
    private final List<Object> args = new ArrayList<>();

    public SqlFilter eq(String column, Object value) {
        if (value == null || (value instanceof String s && s.isBlank())) return this;
        where.append(" AND ").append(column).append(" = ?");
        args.add(value instanceof String s ? s.trim() : value);
        return this;
    }

    public SqlFilter ieq(String column, String value) {
        if (!Rows.present(value)) return this;
        where.append(" AND LOWER(").append(column).append(") = LOWER(?)");
        args.add(value.trim());
        return this;
    }

    /** Case-insensitive "contains" across one or more columns (OR-ed). */
    public SqlFilter search(String text, String... columns) {
        if (!Rows.present(text)) return this;
        where.append(" AND (");
        for (int i = 0; i < columns.length; i++) {
            if (i > 0) where.append(" OR ");
            where.append(columns[i]).append(" ILIKE ? ESCAPE '\\'");
            args.add(Rows.like(text));
        }
        where.append(")");
        return this;
    }

    public SqlFilter raw(String condition, Object... values) {
        where.append(" AND ").append(condition);
        args.addAll(List.of(values));
        return this;
    }

    public SqlFilter rawIf(boolean apply, String condition, Object... values) {
        return apply ? raw(condition, values) : this;
    }

    public String where() { return where.toString(); }

    public Object[] args(Object... extra) {
        List<Object> all = new ArrayList<>(args);
        all.addAll(List.of(extra));
        return all.toArray();
    }
}
