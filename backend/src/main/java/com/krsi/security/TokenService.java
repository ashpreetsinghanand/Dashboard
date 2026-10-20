package com.krsi.security;

import com.krsi.config.AppProperties;
import com.krsi.model.User;
import java.time.Instant;
import java.util.List;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** Issues signed HS256 access tokens. Claims: sub = user id, roles = [ROLE], phone, addr = ledger address. */
@Service
public class TokenService {
    public record IssuedToken(String value, Instant expiresAt, long expiresInSeconds) {}

    private final JwtEncoder encoder;
    private final AppProperties properties;

    public TokenService(JwtEncoder encoder, AppProperties properties) {
        this.encoder = encoder;
        this.properties = properties;
    }

    public IssuedToken issue(User user) {
        Instant now = Instant.now();
        Instant expires = now.plus(properties.auth().tokenTtl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.auth().issuer())
                .issuedAt(now)
                .expiresAt(expires)
                .subject(Long.toString(user.id()))
                .claim("roles", List.of(user.role().name()))
                .claim("phone", user.phone())
                .claim("addr", user.walletAddress())
                .build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new IssuedToken(token, expires, properties.auth().tokenTtl().toSeconds());
    }
}
