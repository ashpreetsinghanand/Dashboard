package com.krsi.ledger;

import com.fasterxml.jackson.annotation.JsonRawValue;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** One block of the ledger as stored and returned to the UI. */
@Schema(description = "A ledger block. hash = sha256(height|prevHash|createdAtMs|eventType|entityType|entityId|actorAddress|payload)")
public record LedgerBlock(
        @Schema(example = "42") long height,
        @Schema(description = "This block's SHA-256 hash (the transaction ID shown in the UI)") String hash,
        @Schema(description = "Hash of the previous block") String prevHash,
        @Schema(description = "Milliseconds since epoch; part of the hashed content") long createdAtMs,
        Instant timestamp,
        LedgerEventType eventType,
        @Schema(example = "ENWR") String entityType,
        @Schema(example = "17") String entityId,
        @Schema(description = "Ledger address of the user who caused the event, or 'system'") String actorAddress,
        @Schema(description = "Event details as canonical JSON (ids, quantities, prices; never phone numbers)", type = "object")
        @JsonRawValue String payload) {

    /** Recomputes this block's hash from its content. */
    public String computeHash() {
        return BlockHasher.hash(height, prevHash, createdAtMs, eventType.name(), entityType, entityId, actorAddress, payload);
    }

    public boolean intact() { return hash.equals(computeHash()); }
}
