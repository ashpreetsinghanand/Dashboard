package com.krsi.ledger;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LedgerHashingTest {

    @Test void canonicalJsonSortsKeysAndIsStable() {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("quantityMt", new BigDecimal("40.000"));
        a.put("commodity", "Coffee \"Grade A\"");
        a.put("storedOn", LocalDate.of(2026, 10, 20));
        a.put("note", null);
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("storedOn", LocalDate.of(2026, 10, 20));
        b.put("note", null);
        b.put("commodity", "Coffee \"Grade A\"");
        b.put("quantityMt", new BigDecimal("40"));
        assertThat(CanonicalJson.write(a)).isEqualTo(CanonicalJson.write(b))
                .isEqualTo("{\"commodity\":\"Coffee \\\"Grade A\\\"\",\"note\":null,\"quantityMt\":40,\"storedOn\":\"2026-10-20\"}");
        assertThat(CanonicalJson.write(Map.of("ids", List.of(3, 1)))).isEqualTo("{\"ids\":[3,1]}");
    }

    @Test void blockHashCoversEveryField() {
        LedgerBlock block = block("{\"a\":1}");
        assertThat(block.intact()).isTrue();
        assertThat(block("{\"a\":2}").hash()).isNotEqualTo(block.hash());
        LedgerBlock tampered = new LedgerBlock(block.height(), block.hash(), block.prevHash(), block.createdAtMs(), block.timestamp(),
                block.eventType(), block.entityType(), block.entityId(), block.actorAddress(), "{\"a\":2}");
        assertThat(tampered.intact()).isFalse();
    }

    @Test void addressIsStableAndHidesPhone() {
        String address = BlockHasher.addressFor("9000000001");
        assertThat(address).startsWith("0x").hasSize(42).isEqualTo(BlockHasher.addressFor("9000000001")).doesNotContain("9000000001");
    }

    private static LedgerBlock block(String payload) {
        long ms = 1_760_000_000_000L;
        String hash = BlockHasher.hash(5, BlockHasher.ZERO_HASH, ms, "TRADE_SETTLED", "TRADE", "1", "0xabc", payload);
        return new LedgerBlock(5, hash, BlockHasher.ZERO_HASH, ms, Instant.ofEpochMilli(ms), LedgerEventType.TRADE_SETTLED,
                "TRADE", "1", "0xabc", payload);
    }
}
