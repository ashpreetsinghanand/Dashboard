package com.krsi.service;

import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.EnwrRequests;
import com.krsi.dto.response.EnwrResponse;
import com.krsi.exception.ApiException;
import com.krsi.ledger.BlockchainLedger;
import com.krsi.ledger.EntityProof;
import com.krsi.ledger.LedgerEvent;
import com.krsi.ledger.LedgerEventType;
import com.krsi.ledger.Payload;
import com.krsi.model.EnwrStatus;
import com.krsi.model.InspectionDecision;
import com.krsi.model.Role;
import com.krsi.repository.BookingRepository;
import com.krsi.repository.EnwrRepository;
import com.krsi.repository.EnwrRepository.ActionsResolver;
import com.krsi.repository.EnwrRepository.Core;
import com.krsi.repository.FinanceRepository;
import com.krsi.repository.WarehouseRepository;
import com.krsi.security.AuthUser;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Electronic negotiable warehouse receipts. Lifecycle:
 * PENDING_AUDIT (deposited) -> ACTIVE (auditor approved) -> LISTED / PLEDGED -> SOLD (transferred) or RELEASED (goods taken out).
 */
@Service
public class EnwrService {
    private static final Logger log = LoggerFactory.getLogger(EnwrService.class);

    private final EnwrRepository enwrs;
    private final WarehouseRepository warehouses;
    private final FinanceRepository finance;
    private final BlockchainLedger ledger;
    private final BookingRepository bookings;

    public EnwrService(EnwrRepository enwrs, WarehouseRepository warehouses, FinanceRepository finance, BlockchainLedger ledger,
                       BookingRepository bookings) {
        this.enwrs = enwrs;
        this.warehouses = warehouses;
        this.finance = finance;
        this.ledger = ledger;
        this.bookings = bookings;
    }

    /** Which buttons the viewer may use on a receipt. */
    public ActionsResolver actionsFor(AuthUser me) {
        return core -> {
            boolean holder = core.ownerId() == me.id();
            boolean valid = !core.validTill().isBefore(LocalDate.now());
            boolean trader = me.role() == Role.FARMER || me.role() == Role.MERCHANT;
            return new EnwrResponse.Actions(
                    holder && trader && valid && core.status() == EnwrStatus.ACTIVE,
                    holder && trader && valid && core.status() == EnwrStatus.ACTIVE,
                    me.role() == Role.AUDITOR && core.status() == EnwrStatus.PENDING_AUDIT,
                    core.warehouseOwnerId() == me.id() && core.status() == EnwrStatus.ACTIVE);
        };
    }

    public PageResponse<EnwrResponse> search(AuthUser me, EnwrRequests.Search s) {
        EnwrRepository.Scope scope = switch (me.role()) {
            case FARMER, MERCHANT -> new EnwrRepository.Scope(me.id(), null);
            case WAREHOUSE_OWNER -> new EnwrRepository.Scope(null, me.id());
            case AUDITOR -> EnwrRepository.Scope.all();
        };
        return enwrs.search(s, scope, actionsFor(me));
    }

    public EnwrResponse get(AuthUser me, long id) {
        Core core = enwrs.core(id).orElseThrow(() -> ApiException.notFound("Receipt", id));
        boolean allowed = me.role() == Role.AUDITOR || core.ownerId() == me.id() || core.depositorId() == me.id()
                || core.warehouseOwnerId() == me.id();
        if (!allowed) throw ApiException.notFound("Receipt", id);
        return view(me, id);
    }

    public EntityProof history(AuthUser me, long id) {
        get(me, id);
        // The receipt's own blocks plus listings, trades, splits, invoices and loans that name it: a full provenance trail.
        return ledger.proofWithReferences("ENWR", Long.toString(id), List.of("enwrId", "sourceEnwrId", "buyerEnwrId", "parentEnwrId"));
    }

    public List<EnwrResponse> pendingInspection(AuthUser me, int limit) {
        return enwrs.byStatus(EnwrStatus.PENDING_AUDIT, limit, actionsFor(me));
    }

    @Transactional
    public EnwrResponse inspect(AuthUser me, long id, EnwrRequests.Inspection r) {
        Core core = enwrs.coreForUpdate(id).orElseThrow(() -> ApiException.notFound("Receipt", id));
        if (core.status() != EnwrStatus.PENDING_AUDIT) throw ApiException.state("Receipt " + core.receiptNo() + " is not waiting for inspection");
        boolean approve = r.decision() == InspectionDecision.APPROVE;
        EnwrStatus next = approve ? EnwrStatus.ACTIVE : EnwrStatus.REJECTED;
        enwrs.recordInspection(id, next, r.grade().trim(), r.moisturePct(), r.foreignMatterPct(), r.remarks(), me.id());
        if (!approve) {
            warehouses.releaseCapacity(core.warehouseId(), core.quantityMt());
            finance.cancelPendingForEnwr(id);
            String why = r.remarks() == null || r.remarks().isBlank() ? "" : ": " + r.remarks().trim();
            bookings.rejectForReceipt(id, "Receipt " + core.receiptNo() + " rejected at inspection" + why);
        }
        String hash = ledger.record(LedgerEvent.of(approve ? LedgerEventType.ENWR_ISSUED : LedgerEventType.ENWR_REJECTED, "ENWR", id, me,
                Payload.of("enwrId", id, "receiptNo", core.receiptNo(), "ownerId", core.ownerId(), "warehouseId", core.warehouseId(),
                        "commodity", core.commodity(), "grade", r.grade().trim(), "quantityMt", core.quantityMt(),
                        "storedOn", core.storedOn(), "validTill", core.validTill(), "moisturePct", r.moisturePct(),
                        "foreignMatterPct", r.foreignMatterPct()))).hash();
        enwrs.setLedgerHash(id, hash);
        log.info("Receipt {} {} by auditor {}", core.receiptNo(), next, me.id());
        return view(me, id);
    }

    /** Warehouse owner hands the goods back to the holder; the receipt is closed and capacity freed. */
    @Transactional
    public EnwrResponse release(AuthUser me, long id) {
        Core core = enwrs.coreForUpdate(id).orElseThrow(() -> ApiException.notFound("Receipt", id));
        if (core.warehouseOwnerId() != me.id()) throw ApiException.forbidden("Only the warehouse owner can release stock");
        if (core.status() != EnwrStatus.ACTIVE)
            throw ApiException.state("Only ACTIVE receipts can be released (withdraw listings and repay loans first)");
        if (finance.unpaidCountForEnwr(id) > 0) throw ApiException.state("Storage invoices for this receipt must be paid before release");
        enwrs.transition(id, List.of(EnwrStatus.ACTIVE), EnwrStatus.RELEASED);
        warehouses.releaseCapacity(core.warehouseId(), core.quantityMt());
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.ENWR_RELEASED, "ENWR", id, me, Payload.of(
                "enwrId", id, "receiptNo", core.receiptNo(), "ownerId", core.ownerId(), "quantityMt", core.quantityMt()))).hash();
        enwrs.setLedgerHash(id, hash);
        return view(me, id);
    }

    EnwrResponse view(AuthUser me, long id) {
        return enwrs.find(id, actionsFor(me)).orElseThrow(() -> ApiException.notFound("Receipt", id));
    }
}
