package com.krsi.ledger;

import java.util.LinkedHashMap;
import java.util.Map;

/** Builds ledger payloads from key/value pairs (null values allowed, unlike Map.of). */
public final class Payload {
    private Payload() {}

    public static Map<String, Object> of(Object... keysAndValues) {
        if (keysAndValues.length % 2 != 0) throw new IllegalArgumentException("Payload needs key/value pairs");
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keysAndValues.length; i += 2) map.put(String.valueOf(keysAndValues[i]), keysAndValues[i + 1]);
        return map;
    }
}
