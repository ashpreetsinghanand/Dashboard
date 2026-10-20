package com.krsi.ledger;

import java.util.List;

/**
 * The ledger the business services write to. The built-in implementation ({@link HashChainLedger}) is a
 * SHA-256 hash chain in PostgreSQL, written in the same database transaction as the business change, so the
 * two can never disagree. To anchor on a public or permissioned chain (Polygon, Hyperledger Fabric ...),
 * add another implementation, or publish {@link #verify()}'s head hash to that chain periodically.
 */
public interface BlockchainLedger {
    /** Appends one block and returns it. Must be called inside the business transaction. */
    LedgerBlock record(LedgerEvent event);

    List<LedgerBlock> history(String entityType, String entityId);

    EntityProof proof(String entityType, String entityId);

    /** Like {@link #proof} but also includes other records' blocks that reference this one in their payload. */
    EntityProof proofWithReferences(String entityType, String entityId, List<String> payloadKeys);

    List<LedgerBlock> latest(int limit, long beforeHeight);

    LedgerVerification verify();
}
