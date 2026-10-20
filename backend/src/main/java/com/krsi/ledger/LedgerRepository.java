package com.krsi.ledger;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.stereotype.Repository;

/** Data access for {@code ledger_blocks}. Rows are only ever inserted. */
@Repository
public class LedgerRepository {
    /** Transaction-scoped advisory lock that serialises block appends across all app instances. */
    private static final long APPEND_LOCK_KEY = 7_342_001L;

    private final JdbcTemplate jdbc;

    public LedgerRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void lockForAppend() {
        jdbc.query("SELECT pg_advisory_xact_lock(?)", (ResultSetExtractor<Void>) rs -> null, APPEND_LOCK_KEY);
    }

    public Optional<LedgerBlock> head() {
        return jdbc.query("SELECT * FROM ledger_blocks ORDER BY height DESC LIMIT 1", LedgerRepository::map).stream().findFirst();
    }

    public void insert(LedgerBlock b) {
        jdbc.update("""
                INSERT INTO ledger_blocks (height, block_hash, prev_hash, created_at_ms, event_type, entity_type, entity_id, actor_address, payload)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                b.height(), b.hash(), b.prevHash(), b.createdAtMs(), b.eventType().name(), b.entityType(), b.entityId(),
                b.actorAddress(), b.payload());
    }

    public List<LedgerBlock> byEntity(String entityType, String entityId) {
        return jdbc.query("SELECT * FROM ledger_blocks WHERE entity_type = ? AND entity_id = ? ORDER BY height",
                LedgerRepository::map, entityType, entityId);
    }

    /**
     * Blocks recorded on the entity plus blocks of other entities whose payload references it under one of
     * {@code payloadKeys} (e.g. a listing or trade that names a receipt as enwrId / sourceEnwrId).
     * Keys come from code, never from users.
     */
    public List<LedgerBlock> byEntityOrReference(String entityType, String entityId, List<String> payloadKeys) {
        StringBuilder sql = new StringBuilder("SELECT * FROM ledger_blocks WHERE (entity_type = ? AND entity_id = ?)");
        List<Object> args = new java.util.ArrayList<>(List.of(entityType, entityId));
        for (String key : payloadKeys) {
            if (!key.matches("[A-Za-z]+")) throw new IllegalArgumentException("Bad payload key " + key);
            sql.append(" OR payload::jsonb ->> '").append(key).append("' = ?");
            args.add(entityId);
        }
        return jdbc.query(sql.append(" ORDER BY height").toString(), LedgerRepository::map, args.toArray());
    }

    public Optional<LedgerBlock> byHeight(long height) {
        return jdbc.query("SELECT * FROM ledger_blocks WHERE height = ?", LedgerRepository::map, height).stream().findFirst();
    }

    public List<LedgerBlock> latest(int limit, long beforeHeight) {
        return jdbc.query("SELECT * FROM ledger_blocks WHERE height < ? ORDER BY height DESC LIMIT ?",
                LedgerRepository::map, beforeHeight, limit);
    }

    /** Streams the chain in height order, in pages, so verification does not load everything at once. */
    public void forEachInOrder(int pageSize, Consumer<LedgerBlock> consumer) {
        long from = -1;
        while (true) {
            List<LedgerBlock> page = jdbc.query("SELECT * FROM ledger_blocks WHERE height > ? ORDER BY height LIMIT ?",
                    LedgerRepository::map, from, pageSize);
            if (page.isEmpty()) return;
            page.forEach(consumer);
            from = page.get(page.size() - 1).height();
        }
    }

    public long count() {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM ledger_blocks", Long.class);
        return n == null ? 0 : n;
    }

    static LedgerBlock map(ResultSet rs, int row) throws SQLException {
        long ms = rs.getLong("created_at_ms");
        return new LedgerBlock(rs.getLong("height"), rs.getString("block_hash"), rs.getString("prev_hash"), ms,
                Instant.ofEpochMilli(ms), LedgerEventType.valueOf(rs.getString("event_type")), rs.getString("entity_type"),
                rs.getString("entity_id"), rs.getString("actor_address"), rs.getString("payload"));
    }
}
