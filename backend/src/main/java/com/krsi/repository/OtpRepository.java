package com.krsi.repository;

import com.krsi.model.OtpPurpose;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class OtpRepository {
    public record Challenge(String id, String phone, OtpPurpose purpose, String codeHash, int attempts, Instant createdAt,
                            Instant expiresAt, Instant verifiedAt, Instant consumedAt) {}

    private final JdbcTemplate jdbc;

    public OtpRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void insert(String id, String phone, OtpPurpose purpose, String codeHash, Instant expiresAt) {
        jdbc.update("INSERT INTO otp_challenges (id, phone, purpose, code_hash, expires_at) VALUES (?, ?, ?, ?, ?)",
                id, phone, purpose.name(), codeHash, Rows.ts(expiresAt));
    }

    public Optional<Challenge> find(String id) {
        return jdbc.query("SELECT * FROM otp_challenges WHERE id = ?", OtpRepository::map, id).stream().findFirst();
    }

    public Optional<Challenge> latestFor(String phone) {
        return jdbc.query("SELECT * FROM otp_challenges WHERE phone = ? ORDER BY created_at DESC LIMIT 1", OtpRepository::map, phone)
                .stream().findFirst();
    }

    public int sentSince(String phone, Instant since) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM otp_challenges WHERE phone = ? AND created_at > ?", Integer.class,
                phone, Rows.ts(since));
        return n == null ? 0 : n;
    }

    public void incrementAttempts(String id) { jdbc.update("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?", id); }

    public void markVerified(String id) { jdbc.update("UPDATE otp_challenges SET verified_at = now() WHERE id = ?", id); }

    /** Marks a verified challenge as used; returns false if someone else used it first. */
    public boolean consume(String id) {
        return jdbc.update("UPDATE otp_challenges SET consumed_at = now() WHERE id = ? AND consumed_at IS NULL AND verified_at IS NOT NULL", id) == 1;
    }

    public int purgeOlderThan(Instant cutoff) {
        return jdbc.update("DELETE FROM otp_challenges WHERE created_at < ?", Rows.ts(cutoff));
    }

    static Challenge map(ResultSet rs, int row) throws SQLException {
        return new Challenge(rs.getString("id"), rs.getString("phone"), OtpPurpose.valueOf(rs.getString("purpose")),
                rs.getString("code_hash"), rs.getInt("attempts"), Rows.instant(rs, "created_at"), Rows.instant(rs, "expires_at"),
                Rows.instant(rs, "verified_at"), Rows.instant(rs, "consumed_at"));
    }
}
