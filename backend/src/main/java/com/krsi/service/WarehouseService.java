package com.krsi.service;

import com.krsi.config.AppProperties;
import com.krsi.dto.common.PageResponse;
import com.krsi.dto.request.WarehouseRequests;
import com.krsi.dto.response.WarehouseResponses.Details;
import com.krsi.dto.response.WarehouseResponses.Stats;
import com.krsi.dto.response.WarehouseResponses.Summary;
import com.krsi.exception.ApiException;
import com.krsi.ledger.BlockchainLedger;
import com.krsi.ledger.LedgerEvent;
import com.krsi.ledger.LedgerEventType;
import com.krsi.ledger.Payload;
import com.krsi.model.User;
import com.krsi.repository.UserRepository;
import com.krsi.repository.WarehouseRepository;
import com.krsi.security.AuthUser;
import java.text.Normalizer;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Warehouse search (public), details, and registration/updates by warehouse owners. */
@Service
public class WarehouseService {
    private static final Logger log = LoggerFactory.getLogger(WarehouseService.class);

    private final WarehouseRepository warehouses;
    private final UserRepository users;
    private final MarketService market;
    private final BlockchainLedger ledger;
    private final AppProperties properties;

    public WarehouseService(WarehouseRepository warehouses, UserRepository users, MarketService market,
                            BlockchainLedger ledger, AppProperties properties) {
        this.warehouses = warehouses;
        this.users = users;
        this.market = market;
        this.ledger = ledger;
        this.properties = properties;
    }

    public PageResponse<Summary> search(WarehouseRequests.Search s, Optional<AuthUser> viewer) {
        if ((s.lat() == null) != (s.lng() == null)) throw ApiException.invalid("Send lat and lng together");
        Double lat = s.lat();
        Double lng = s.lng();
        if (lat == null && viewer.isPresent()) {
            Optional<User> user = users.findById(viewer.get().id());
            if (user.isPresent() && user.get().latitude() != null) {
                lat = user.get().latitude();
                lng = user.get().longitude();
            }
        }
        WarehouseRepository.Page page = warehouses.search(s, lat, lng);
        return PageResponse.of(page.items(), s.pageOrDefault(), s.sizeOrDefault(), page.total());
    }

    public Stats stats() { return warehouses.stats(); }

    public Details details(String id) {
        return warehouses.details(id, properties.business().currency()).orElseThrow(() -> ApiException.notFound("Warehouse", id));
    }

    public List<Summary> nearby(String id, int limit) {
        if (!warehouses.exists(id)) throw ApiException.notFound("Warehouse", id);
        return warehouses.nearby(id, limit);
    }

    public List<Summary> mine(AuthUser me) { return warehouses.byOwner(me.id()); }

    @Transactional
    public Details create(AuthUser me, WarehouseRequests.Upsert r) {
        List<String> crops = canonicalCrops(r.crops());
        if (warehouses.codeTaken(r.code(), null)) throw ApiException.conflict("Registration code " + r.code() + " is already in use");
        String id;
        if (r.slug() != null && !r.slug().isBlank()) {
            if (warehouses.exists(r.slug())) throw ApiException.conflict("Warehouse id '" + r.slug() + "' is taken");
            id = r.slug();
        } else id = uniqueSlug(r.name());
        warehouses.insert(id, me.id(), r, crops);
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.WAREHOUSE_REGISTERED, "WAREHOUSE", id, me, Payload.of(
                "warehouseId", id, "code", r.code(), "totalCapacityMt", r.totalCapacityMt(), "state", r.state(),
                "district", r.district(), "crops", crops))).hash();
        warehouses.setLedgerHash(id, hash);
        log.info("Warehouse {} registered by user {}", id, me.id());
        return details(id);
    }

    @Transactional
    public Details update(AuthUser me, String id, WarehouseRequests.Upsert r) {
        WarehouseRepository.Core current = warehouses.core(id).orElseThrow(() -> ApiException.notFound("Warehouse", id));
        if (current.ownerId() != me.id()) throw ApiException.forbidden("Only the owner can edit this warehouse");
        List<String> crops = canonicalCrops(r.crops());
        if (warehouses.codeTaken(r.code(), id)) throw ApiException.conflict("Registration code " + r.code() + " is already in use");
        java.math.BigDecimal used = current.totalCapacityMt().subtract(current.availableCapacityMt());
        if (r.totalCapacityMt().compareTo(used) < 0)
            throw ApiException.state("Total capacity cannot be below the " + used.stripTrailingZeros().toPlainString() + " MT currently stored");
        warehouses.update(id, r, crops);
        String hash = ledger.record(LedgerEvent.of(LedgerEventType.WAREHOUSE_UPDATED, "WAREHOUSE", id, me, Payload.of(
                "warehouseId", id, "code", r.code(), "totalCapacityMt", r.totalCapacityMt(), "crops", crops))).hash();
        warehouses.setLedgerHash(id, hash);
        return details(id);
    }

    private List<String> canonicalCrops(List<String> crops) {
        return crops.stream().map(market::canonical).distinct().toList();
    }

    private String uniqueSlug(String name) {
        String base = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase()
                .replaceAll("\\bwarehouse\\b", "").replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "warehouse";
        if (base.length() > 40) base = base.substring(0, 40).replaceAll("-$", "");
        String candidate = base;
        for (int i = 2; warehouses.exists(candidate); i++) candidate = base + "-" + i;
        return candidate;
    }
}
