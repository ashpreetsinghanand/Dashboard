package com.krsi.ledger;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** The on-ledger history of one record (a booking, a receipt, a trade ...) with an integrity check. */
@Schema(description = "Ledger history of one record; intact is false if any of its blocks was altered")
public record EntityProof(String entityType, String entityId, boolean intact, List<LedgerBlock> blocks) {}
