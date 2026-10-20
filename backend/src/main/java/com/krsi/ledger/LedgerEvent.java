package com.krsi.ledger;

import com.krsi.security.AuthUser;
import java.util.Map;

/** What a service asks the ledger to record. {@code actor} is null for system actions (seeding, expiry jobs). */
public record LedgerEvent(LedgerEventType type, String entityType, Object entityId, AuthUser actor, Map<String, ?> payload) {
    public static LedgerEvent of(LedgerEventType type, String entityType, Object entityId, AuthUser actor, Map<String, ?> payload) {
        return new LedgerEvent(type, entityType, entityId, actor, payload);
    }
}
