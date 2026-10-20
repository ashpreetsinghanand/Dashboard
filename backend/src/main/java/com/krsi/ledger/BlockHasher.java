package com.krsi.ledger;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * The block hash rule, kept in one place so writing and verifying can never drift apart:
 * {@code sha256(height|prevHash|createdAtMs|eventType|entityType|entityId|actorAddress|payload)} as lowercase hex.
 */
public final class BlockHasher {
    public static final String ZERO_HASH = "0".repeat(64);

    private BlockHasher() {}

    public static String hash(long height, String prevHash, long createdAtMs, String eventType, String entityType,
                              String entityId, String actorAddress, String payload) {
        String material = height + "|" + prevHash + "|" + createdAtMs + "|" + eventType + "|" + entityType + "|"
                + entityId + "|" + actorAddress + "|" + payload;
        return sha256(material);
    }

    public static String sha256(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    /** A stable, address-like identity for a user on the ledger (no personal data in it). */
    public static String addressFor(String phone) {
        return "0x" + sha256("krsi:account:" + phone).substring(0, 40);
    }
}
