package com.krsi.service;

import com.krsi.dto.request.WarehouseRequests;
import com.krsi.dto.response.WarehouseResponses;
import com.krsi.dto.response.WarehouseResponses.AuditView;
import com.krsi.exception.ApiException;
import com.krsi.ledger.BlockchainLedger;
import com.krsi.ledger.EntityProof;
import com.krsi.ledger.LedgerBlock;
import com.krsi.ledger.LedgerEvent;
import com.krsi.ledger.LedgerEventType;
import com.krsi.ledger.LedgerVerification;
import com.krsi.ledger.Payload;
import com.krsi.repository.EnwrRepository;
import com.krsi.repository.WarehouseRepository;
import com.krsi.security.AuthUser;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Physical warehouse audits and read access to the ledger. Quality inspections of receipts live in {@link EnwrService}. */
@Service
public class AuditService {
    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    public static final Set<String> ENTITY_TYPES = Set.of("USER", "WAREHOUSE", "BOOKING", "ENWR", "LISTING", "BID", "TRADE", "INVOICE",
            "LOAN", "AUDIT", "SYSTEM");

    private final WarehouseRepository warehouses;
    private final EnwrRepository enwrs;
    private final BlockchainLedger ledger;

    public AuditService(WarehouseRepository warehouses, EnwrRepository enwrs, BlockchainLedger ledger) {
        this.warehouses = warehouses;
        this.enwrs = enwrs;
        this.ledger = ledger;
    }

    /** Records a site audit: compares stock counted on site with the receipts on record and updates the warehouse's verified flag and rating. */
    @Transactional
    public AuditView auditWarehouse(AuthUser me, String warehouseId, WarehouseRequests.Audit r) {
        warehouses.core(warehouseId).orElseThrow(() -> ApiException.notFound("Warehouse", warehouseId));
        BigDecimal recorded = enwrs.storedAt(warehouseId);
        LocalDate on = r.auditedOn() == null ? LocalDate.now() : r.auditedOn();
        long id = warehouses.insertAudit(warehouseId, me.id(), on, r.result(), r.rating(), recorded, r.stockVerifiedMt(), r.findings().trim());
        warehouses.applyAudit(warehouseId, r.result());
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.WAREHOUSE_AUDITED, "AUDIT", id, me, Payload.of(
                "auditId", id, "warehouseId", warehouseId, "auditedOn", on, "result", r.result(), "rating", r.rating(),
                "stockRecordedMt", recorded, "stockVerifiedMt", r.stockVerifiedMt(),
                "varianceMt", r.stockVerifiedMt().subtract(recorded)))).hash();
        warehouses.setAuditLedgerHash(id, hash);
        warehouses.setLedgerHash(warehouseId, hash);
        log.info("Warehouse {} audited by {}: {}", warehouseId, me.id(), r.result());
        return warehouses.audit(id).orElseThrow();
    }

    public List<AuditView> audits(String warehouseId, int limit) {
        if (warehouseId != null && !warehouses.exists(warehouseId)) throw ApiException.notFound("Warehouse", warehouseId);
        return warehouses.audits(warehouseId, limit);
    }

    public List<WarehouseResponses.Summary> dueForAudit(int days, int limit) {
        return warehouses.dueForAudit(LocalDate.now().minusDays(days), limit);
    }

    public LedgerVerification verify() { return ledger.verify(); }

    public List<LedgerBlock> blocks(int limit, Long beforeHeight) {
        return ledger.latest(limit, beforeHeight == null ? Long.MAX_VALUE : beforeHeight);
    }

    public EntityProof proof(String entityType, String entityId) {
        String type = entityType.toUpperCase();
        if (!ENTITY_TYPES.contains(type)) throw ApiException.invalid("entityType must be one of " + ENTITY_TYPES);
        return ledger.proof(type, entityId);
    }
}
