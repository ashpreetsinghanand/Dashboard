package com.krsi.repository;

import com.krsi.dto.response.KycResponses;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class KycRepository {
    private final JdbcTemplate jdbc;

    public KycRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public KycResponses.Status status(long userId) {
        return jdbc.queryForObject("""
                SELECT u.kyc_status, u.kyc_verified_at, r.full_name, r.aadhaar_last4, r.provider
                FROM users u
                LEFT JOIN LATERAL (SELECT full_name, aadhaar_last4, provider FROM kyc_records
                                   WHERE user_id = u.id AND status = 'VERIFIED' ORDER BY id DESC LIMIT 1) r ON true
                WHERE u.id = ?""", (rs, i) -> new KycResponses.Status(rs.getString("kyc_status"), Rows.instant(rs, "kyc_verified_at"),
                rs.getString("full_name"), rs.getString("aadhaar_last4"), rs.getString("provider")), userId);
    }

    public boolean isVerified(long userId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT kyc_status = 'VERIFIED' FROM users WHERE id = ?", Boolean.class, userId));
    }

    public void insertRequest(long userId, String provider, String requestId) {
        jdbc.update("INSERT INTO kyc_records (user_id, provider, request_id) VALUES (?, ?, ?)", userId, provider, requestId);
    }

    /** Provider of this user's request, or empty when the id is unknown or belongs to someone else. */
    public Optional<String> providerOf(long userId, String requestId) {
        return jdbc.queryForList("SELECT provider FROM kyc_records WHERE user_id = ? AND request_id = ?", String.class, userId, requestId)
                .stream().findFirst();
    }

    public void verify(long userId, String requestId, String fullName, String dob, String gender, String last4) {
        jdbc.update("""
                UPDATE kyc_records SET status = 'VERIFIED', full_name = ?, date_of_birth = ?, gender = ?, aadhaar_last4 = ?, updated_at = now()
                WHERE user_id = ? AND request_id = ?""", fullName, dob, gender, last4, userId, requestId);
        jdbc.update("UPDATE users SET kyc_status = 'VERIFIED', kyc_verified_at = now() WHERE id = ?", userId);
    }

    public void fail(long userId, String requestId) {
        jdbc.update("UPDATE kyc_records SET status = 'FAILED', updated_at = now() WHERE user_id = ? AND request_id = ?", userId, requestId);
    }
}
