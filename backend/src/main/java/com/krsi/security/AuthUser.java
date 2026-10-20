package com.krsi.security;

import com.krsi.model.Role;

/** The signed-in user, read from the JWT. {@code address} is the user's identity on the ledger. */
public record AuthUser(long id, Role role, String phone, String address) {
    public boolean is(Role r) { return role == r; }
}
