package com.krsi.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

/**
 * The cards on the "Select Your Category" sign-up screen, plus the two operator personas.
 * Farmer Producer Organisations act as farmers (they deposit and sell); traders and food processing units
 * act as merchants (they bid and buy).
 */
public enum UserCategory {
    FARMER("farmer", "Farmer", Role.FARMER),
    FPO("fpo", "Farmer Producer Organization", Role.FARMER),
    TRADER("trader", "Trader", Role.MERCHANT),
    FPU("fpu", "Food Processing Unit", Role.MERCHANT),
    WAREHOUSE_OWNER("warehouse_owner", "Warehouse Owner", Role.WAREHOUSE_OWNER),
    AUDITOR("auditor", "Auditor", Role.AUDITOR);

    private final String id;
    private final String label;
    private final Role role;

    UserCategory(String id, String label, Role role) {
        this.id = id;
        this.label = label;
        this.role = role;
    }

    @JsonValue
    public String id() { return id; }

    public String label() { return label; }

    public Role role() { return role; }

    @JsonCreator
    public static UserCategory fromId(String value) {
        return Arrays.stream(values()).filter(c -> c.id.equalsIgnoreCase(value) || c.name().equalsIgnoreCase(value))
                .findFirst().orElseThrow(() -> new IllegalArgumentException("Unknown category: " + value));
    }
}
