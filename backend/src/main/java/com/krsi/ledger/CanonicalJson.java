package com.krsi.ledger;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Map;
import java.util.TreeMap;

/**
 * Deterministic JSON for ledger payloads: keys sorted, no whitespace, numbers as plain decimals.
 * The exact string is stored and hashed, so a verifier only needs the stored text, not this class.
 */
public final class CanonicalJson {
    private CanonicalJson() {}

    public static String write(Map<String, ?> payload) {
        StringBuilder out = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, ?> e : new TreeMap<>(payload).entrySet()) {
            if (!first) out.append(',');
            first = false;
            string(out, e.getKey());
            out.append(':');
            value(out, e.getValue());
        }
        return out.append('}').toString();
    }

    private static void value(StringBuilder out, Object v) {
        if (v == null) out.append("null");
        else if (v instanceof BigDecimal d) out.append(d.stripTrailingZeros().toPlainString());
        else if (v instanceof Number || v instanceof Boolean) out.append(v);
        else if (v instanceof Collection<?> items) {
            out.append('[');
            boolean first = true;
            for (Object item : items) {
                if (!first) out.append(',');
                first = false;
                value(out, item);
            }
            out.append(']');
        } else if (v instanceof Map<?, ?> map) {
            Map<String, Object> nested = new TreeMap<>();
            map.forEach((k, val) -> nested.put(String.valueOf(k), val));
            out.append(write(nested));
        } else string(out, v.toString());
    }

    private static void string(StringBuilder out, String s) {
        out.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) out.append(String.format("\\u%04x", (int) c));
                    else out.append(c);
                }
            }
        }
        out.append('"');
    }
}
