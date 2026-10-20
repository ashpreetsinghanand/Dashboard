package com.krsi.model;

import java.time.Instant;

/** A registered account. {@code walletAddress} is the user's identity on the ledger. */
public record User(long id, String phone, String fullName, Role role, UserCategory category, String language,
                   String passwordHash, String district, String state, Double latitude, Double longitude,
                   String walletAddress, String status, Instant createdAt) {

    public String displayName() {
        return fullName != null && !fullName.isBlank() ? fullName : category.label();
    }
}
