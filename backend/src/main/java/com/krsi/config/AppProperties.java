package com.krsi.config;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** All application settings in one typed object (bound from the {@code app.*} keys in application.yml). */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @DefaultValue Auth auth,
        @DefaultValue Otp otp,
        @DefaultValue Business business,
        @DefaultValue Ledger ledger,
        @DefaultValue Demo demo,
        @DefaultValue Cors cors) {

    /** JWT signing and sign-up rules. */
    public record Auth(
            @DefaultValue("local-dev-only-change-me-krsi-jwt-secret-0123456789") String jwtSecret,
            @DefaultValue("krsi-backend") String issuer,
            @DefaultValue("12h") Duration tokenTtl,
            @DefaultValue("false") boolean allowAuditorSignup) {}

    /** Phone OTP rules. {@code exposeInResponse} returns the code in the API response for local testing only. */
    public record Otp(
            @DefaultValue("6") int length,
            @DefaultValue("5m") Duration ttl,
            @DefaultValue("60s") Duration resendAfter,
            @DefaultValue("5") int maxAttempts,
            @DefaultValue("5") int maxSendsPerHour,
            @DefaultValue("true") boolean exposeInResponse,
            @DefaultValue("15m") Duration verificationTtl) {}

    /** Commercial defaults. */
    public record Business(
            @DefaultValue("INR") String currency,
            @DefaultValue("180") int receiptValidityDays,
            @DefaultValue("15") int invoiceDueDays,
            @DefaultValue("30") int storagePeriodDays,
            @DefaultValue("0.70") BigDecimal loanToValue,
            @DefaultValue("9.0") BigDecimal loanInterestRatePct) {}

    /** Ledger network name written into the genesis block. */
    public record Ledger(@DefaultValue("krsi-ledger-local") String chainId) {}

    /** Demo data seeded into an empty database. */
    public record Demo(@DefaultValue("true") boolean seed, @DefaultValue("Krsi@1234") String password) {}

    /** Browser origins (the React app) allowed to call the API. */
    public record Cors(
            @DefaultValue({"http://localhost:5173", "http://localhost:3000"}) List<String> allowedOrigins) {}
}
