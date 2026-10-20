package com.krsi.security;

import com.krsi.exception.ApiException;
import com.krsi.model.Role;
import java.util.List;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/** Reads the signed-in user from the security context. */
@Component
public class CurrentUser {

    public AuthUser require() {
        return optional().orElseThrow(() -> ApiException.unauthorized("Sign in to continue"));
    }

    public Optional<AuthUser> optional() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken token) return Optional.of(fromJwt(token.getToken()));
        return Optional.empty();
    }

    static AuthUser fromJwt(Jwt jwt) {
        List<String> roles = jwt.getClaimAsStringList("roles");
        Role role = Role.valueOf(roles == null || roles.isEmpty() ? "FARMER" : roles.get(0));
        return new AuthUser(Long.parseLong(jwt.getSubject()), role, jwt.getClaimAsString("phone"), jwt.getClaimAsString("addr"));
    }
}
