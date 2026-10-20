package com.krsi.ledger;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** Result of re-hashing the whole chain. */
@Schema(description = "Result of recomputing every block hash and every link in the chain")
public record LedgerVerification(
        @Schema(description = "True when every block hash and link checks out") boolean valid,
        long blocksChecked,
        long headHeight,
        String headHash,
        @Schema(description = "First block that failed, or null", nullable = true) Long firstInvalidHeight,
        @Schema(description = "What failed, or null", nullable = true) String problem,
        long durationMs,
        Instant verifiedAt) {}
