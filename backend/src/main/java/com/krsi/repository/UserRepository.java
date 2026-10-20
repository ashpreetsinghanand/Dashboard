package com.krsi.repository;

import com.krsi.model.Role;
import com.krsi.model.User;
import com.krsi.model.UserCategory;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public long insert(String phone, String fullName, UserCategory category, String language, String passwordHash,
                       String district, String state, Double lat, Double lng, String walletAddress) {
        Long id = jdbc.queryForObject("""
                INSERT INTO users (phone, full_name, role, category, language, password_hash, district, state, latitude, longitude, wallet_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""", Long.class,
                phone, fullName, category.role().name(), category.id(), language, passwordHash, district, state, lat, lng, walletAddress);
        return id;
    }

    public Optional<User> findById(long id) {
        return jdbc.query("SELECT * FROM users WHERE id = ?", UserRepository::map, id).stream().findFirst();
    }

    public Optional<User> findByPhone(String phone) {
        return jdbc.query("SELECT * FROM users WHERE phone = ?", UserRepository::map, phone).stream().findFirst();
    }

    public boolean existsByPhone(String phone) {
        Boolean exists = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM users WHERE phone = ?)", Boolean.class, phone);
        return Boolean.TRUE.equals(exists);
    }

    public void updateProfile(long id, String fullName, String language, String district, String state, Double lat, Double lng) {
        jdbc.update("""
                UPDATE users SET full_name = COALESCE(?, full_name), language = COALESCE(?, language),
                  district = COALESCE(?, district), state = COALESCE(?, state),
                  latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude)
                WHERE id = ?""", fullName, language, district, state, lat, lng, id);
    }

    public void updatePassword(long id, String passwordHash) {
        jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", passwordHash, id);
    }

    public void touchLogin(long id) { jdbc.update("UPDATE users SET last_login_at = now() WHERE id = ?", id); }

    public long count() {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class);
        return n == null ? 0 : n;
    }

    static User map(ResultSet rs, int row) throws SQLException {
        return new User(rs.getLong("id"), rs.getString("phone"), rs.getString("full_name"), Role.valueOf(rs.getString("role")),
                UserCategory.fromId(rs.getString("category")), rs.getString("language"), rs.getString("password_hash"),
                rs.getString("district"), rs.getString("state"), Rows.doubleOrNull(rs, "latitude"), Rows.doubleOrNull(rs, "longitude"),
                rs.getString("wallet_address"), rs.getString("status"), Rows.instant(rs, "created_at"));
    }
}
