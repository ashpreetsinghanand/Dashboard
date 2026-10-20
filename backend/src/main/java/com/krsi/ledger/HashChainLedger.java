package com.krsi.ledger;

import com.krsi.config.AppProperties;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tamper-evident ledger: an append-only SHA-256 hash chain in PostgreSQL. Each block commits to the previous
 * block's hash, so changing, inserting or deleting any historical block breaks {@link #verify()}.
 * Appends take a transaction-scoped advisory lock, so heights are gap-free even with several app instances.
 */
@Service
public class HashChainLedger implements BlockchainLedger {
    private static final Logger log = LoggerFactory.getLogger(HashChainLedger.class);
    public static final String SYSTEM_ACTOR = "system";

    private final LedgerRepository blocks;
    private final AppProperties properties;

    public HashChainLedger(LedgerRepository blocks, AppProperties properties) {
        this.blocks = blocks;
        this.properties = properties;
    }

    /** Creates block 0 on first start. Runs before the demo seeder. */
    @EventListener(ApplicationReadyEvent.class)
    @Order(Ordered.HIGHEST_PRECEDENCE)
    @Transactional
    public void ensureGenesis() {
        blocks.lockForAppend();
        if (blocks.head().isPresent()) {
            log.info("Ledger ready: {} blocks", blocks.count());
            return;
        }
        long now = Instant.now().toEpochMilli();
        String payload = CanonicalJson.write(Map.of("chainId", properties.ledger().chainId(), "hashAlgorithm", "SHA-256"));
        String hash = BlockHasher.hash(0, BlockHasher.ZERO_HASH, now, LedgerEventType.GENESIS.name(), "SYSTEM", "genesis", SYSTEM_ACTOR, payload);
        blocks.insert(new LedgerBlock(0, hash, BlockHasher.ZERO_HASH, now, Instant.ofEpochMilli(now), LedgerEventType.GENESIS,
                "SYSTEM", "genesis", SYSTEM_ACTOR, payload));
        log.info("Ledger genesis block created: {}", hash);
    }

    @Override
    @Transactional
    public LedgerBlock record(LedgerEvent event) {
        blocks.lockForAppend();
        LedgerBlock head = blocks.head().orElseThrow(() -> new IllegalStateException("Ledger has no genesis block"));
        long height = head.height() + 1;
        // Never go backwards in time, even if the clock does: keeps block timestamps monotonic.
        long now = Math.max(Instant.now().toEpochMilli(), head.createdAtMs());
        String actor = event.actor() == null ? SYSTEM_ACTOR : event.actor().address();
        String entityId = String.valueOf(event.entityId());
        String payload = CanonicalJson.write(event.payload());
        String hash = BlockHasher.hash(height, head.hash(), now, event.type().name(), event.entityType(), entityId, actor, payload);
        LedgerBlock block = new LedgerBlock(height, hash, head.hash(), now, Instant.ofEpochMilli(now), event.type(),
                event.entityType(), entityId, actor, payload);
        blocks.insert(block);
        log.info("Ledger block {} {} {}#{} {}", height, event.type(), event.entityType(), entityId, hash.substring(0, 12));
        return block;
    }

    @Override
    public List<LedgerBlock> history(String entityType, String entityId) { return blocks.byEntity(entityType, entityId); }

    @Override
    public EntityProof proof(String entityType, String entityId) {
        return proofOf(entityType, entityId, blocks.byEntity(entityType, entityId));
    }

    @Override
    public EntityProof proofWithReferences(String entityType, String entityId, List<String> payloadKeys) {
        return proofOf(entityType, entityId, blocks.byEntityOrReference(entityType, entityId, payloadKeys));
    }

    private EntityProof proofOf(String entityType, String entityId, List<LedgerBlock> history) {
        boolean intact = history.stream().allMatch(b -> b.intact()
                && blocks.byHeight(b.height() - 1).map(prev -> prev.hash().equals(b.prevHash())).orElse(b.height() == 0));
        return new EntityProof(entityType, entityId, intact, history);
    }

    @Override
    public List<LedgerBlock> latest(int limit, long beforeHeight) { return blocks.latest(limit, beforeHeight); }

    @Override
    public LedgerVerification verify() {
        long start = System.nanoTime();
        AtomicReference<LedgerBlock> previous = new AtomicReference<>();
        AtomicReference<String> problem = new AtomicReference<>();
        AtomicReference<Long> badHeight = new AtomicReference<>();
        long[] checked = {0};
        blocks.forEachInOrder(500, block -> {
            checked[0]++;
            LedgerBlock prev = previous.get();
            if (problem.get() == null) {
                long expectedHeight = prev == null ? 0 : prev.height() + 1;
                String expectedPrev = prev == null ? BlockHasher.ZERO_HASH : prev.hash();
                if (block.height() != expectedHeight) fail(problem, badHeight, block, "Block missing before height " + block.height());
                else if (!block.prevHash().equals(expectedPrev)) fail(problem, badHeight, block, "Link to previous block is broken");
                else if (!block.intact()) fail(problem, badHeight, block, "Block content does not match its hash");
            }
            previous.set(block);
        });
        LedgerBlock head = previous.get();
        long ms = (System.nanoTime() - start) / 1_000_000;
        boolean valid = problem.get() == null && head != null;
        if (!valid) log.error("Ledger verification FAILED at {}: {}", badHeight.get(), problem.get());
        return new LedgerVerification(valid, checked[0], head == null ? -1 : head.height(), head == null ? null : head.hash(),
                badHeight.get(), head == null ? "Ledger is empty" : problem.get(), ms, Instant.now());
    }

    private static void fail(AtomicReference<String> problem, AtomicReference<Long> badHeight, LedgerBlock block, String why) {
        problem.set(why);
        badHeight.set(block.height());
    }
}
