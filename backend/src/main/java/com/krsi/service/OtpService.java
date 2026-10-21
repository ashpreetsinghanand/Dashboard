package com.krsi.service;

import com.krsi.config.AppProperties;
import com.krsi.dto.response.AuthResponses.OtpSent;
import com.krsi.dto.response.AuthResponses.OtpVerified;
import com.krsi.exception.ApiException;
import com.krsi.exception.ErrorCode;
import com.krsi.ledger.BlockHasher;
import com.krsi.model.OtpPurpose;
import com.krsi.repository.OtpRepository;
import com.krsi.repository.OtpRepository.Challenge;
import com.krsi.repository.UserRepository;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phone verification. Codes are stored only as salted SHA-256 hashes, expire after app.otp.ttl, allow
 * app.otp.max-attempts guesses, and are rate-limited per phone. A verified challenge ID doubles as the
 * one-time "verification token" that sign-up or password reset consumes.
 */
@Service
public class OtpService {
    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private final SecureRandom random = new SecureRandom();

    private final OtpRepository otps;
    private final UserRepository users;
    private final OtpSender sms;
    private final AppProperties.Otp config;

    public OtpService(OtpRepository otps, UserRepository users, OtpSender sms, AppProperties properties) {
        this.otps = otps;
        this.users = users;
        this.sms = sms;
        this.config = properties.otp();
    }

    // one transaction: if the SMS fails, the stored challenge rolls back, so the user is not told to wait for a code that never came
    @Transactional
    public OtpSent send(String phone, OtpPurpose purpose) {
        boolean registered = users.existsByPhone(phone);
        if (purpose == OtpPurpose.SIGNUP && registered) throw ApiException.conflict("This phone number is already registered. Sign in instead.");
        if (purpose != OtpPurpose.SIGNUP && !registered) throw ApiException.notFound("Account for phone", mask(phone));

        Instant now = Instant.now();
        otps.latestFor(phone).ifPresent(last -> {
            long wait = Duration.between(now, last.createdAt().plus(config.resendAfter())).toSeconds();
            if (wait > 0) throw new ApiException(ErrorCode.RATE_LIMITED, "Please wait " + wait + " seconds before requesting another code");
        });
        if (otps.sentSince(phone, now.minus(Duration.ofHours(1))) >= config.maxSendsPerHour())
            throw new ApiException(ErrorCode.RATE_LIMITED, "Too many codes requested for this number. Try again in an hour.");

        String code = randomCode();
        String id = UUID.randomUUID().toString();
        otps.insert(id, phone, purpose, hash(id, code), now.plus(config.ttl()));
        sms.sendOtp(phone, code);
        log.info("OTP challenge {} created for {} ({})", id, mask(phone), purpose);
        return new OtpSent(id, mask(phone), config.ttl().toSeconds(), config.resendAfter().toSeconds(),
                config.exposeInResponse() ? code : purpose == OtpPurpose.SIGNUP && bypassOn() ? config.bypassCode() : null);
    }

    public OtpVerified verify(String challengeId, String code) {
        Challenge c = otps.find(challengeId).orElseThrow(() -> new ApiException(ErrorCode.OTP_INVALID, "Code not recognised. Request a new one."));
        if (c.verifiedAt() != null) throw new ApiException(ErrorCode.OTP_INVALID, "This code was already used. Request a new one.");
        if (Instant.now().isAfter(c.expiresAt())) throw new ApiException(ErrorCode.OTP_EXPIRED, "The code has expired. Request a new one.");
        if (c.attempts() >= config.maxAttempts()) throw new ApiException(ErrorCode.OTP_EXPIRED, "Too many wrong attempts. Request a new code.");
        otps.incrementAttempts(c.id());
        // sign-up only: a bypass on password reset would let anyone take over any account
        boolean bypass = c.purpose() == OtpPurpose.SIGNUP && bypassOn() && config.bypassCode().equals(code);
        if (bypass) log.warn("OTP bypass code used for sign-up of {}", mask(c.phone()));
        if (!bypass && !MessageDigest.isEqual(hash(c.id(), code).getBytes(StandardCharsets.UTF_8), c.codeHash().getBytes(StandardCharsets.UTF_8))) {
            int left = config.maxAttempts() - c.attempts() - 1;
            throw new ApiException(ErrorCode.OTP_INVALID, "Incorrect code. " + Math.max(left, 0) + " attempts left.");
        }
        otps.markVerified(c.id());
        return new OtpVerified(c.id(), config.verificationTtl().toSeconds(), users.existsByPhone(c.phone()));
    }

    /** Uses up a verification token and returns the phone number it proves, or throws. */
    public String consume(String verificationToken, OtpPurpose expectedPurpose) {
        Challenge c = otps.find(verificationToken).orElseThrow(() -> new ApiException(ErrorCode.OTP_INVALID, "Verify your phone number first"));
        if (c.purpose() != expectedPurpose || c.verifiedAt() == null)
            throw new ApiException(ErrorCode.OTP_INVALID, "Verify your phone number first");
        if (Instant.now().isAfter(c.verifiedAt().plus(config.verificationTtl())))
            throw new ApiException(ErrorCode.OTP_EXPIRED, "Phone verification expired. Request a new code.");
        if (!otps.consume(c.id())) throw new ApiException(ErrorCode.OTP_INVALID, "This verification was already used");
        return c.phone();
    }

    private boolean bypassOn() { return config.bypassCode() != null && !config.bypassCode().isBlank(); }

    private String randomCode() {
        int bound = (int) Math.pow(10, config.length());
        return String.format("%0" + config.length() + "d", random.nextInt(bound));
    }

    private static String hash(String challengeId, String code) { return BlockHasher.sha256(challengeId + ":" + code); }

    static String mask(String phone) { return "******" + phone.substring(Math.max(0, phone.length() - 4)); }
}
