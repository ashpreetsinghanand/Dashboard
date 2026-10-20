package com.krsi.service;

import com.krsi.config.AppProperties;
import com.krsi.dto.request.AuthRequests;
import com.krsi.dto.response.AuthResponses.Profile;
import com.krsi.dto.response.AuthResponses.Session;
import com.krsi.exception.ApiException;
import com.krsi.ledger.BlockHasher;
import com.krsi.ledger.BlockchainLedger;
import com.krsi.ledger.LedgerEvent;
import com.krsi.ledger.LedgerEventType;
import com.krsi.model.OtpPurpose;
import com.krsi.model.User;
import com.krsi.model.UserCategory;
import com.krsi.repository.UserRepository;
import com.krsi.security.AuthUser;
import com.krsi.security.TokenService;
import com.krsi.security.TokenService.IssuedToken;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sign-up (phone OTP + password), sign-in, password reset and profile. */
@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository users;
    private final OtpService otp;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final BlockchainLedger ledger;
    private final AppProperties properties;
    /** Compared against when the phone is unknown, so response time does not reveal which numbers are registered. */
    private final String dummyHash;

    public AuthService(UserRepository users, OtpService otp, PasswordEncoder passwords, TokenService tokens,
                       BlockchainLedger ledger, AppProperties properties) {
        this.users = users;
        this.otp = otp;
        this.passwords = passwords;
        this.tokens = tokens;
        this.ledger = ledger;
        this.properties = properties;
        this.dummyHash = passwords.encode("krsi-timing-guard-not-a-password");
    }

    @Transactional
    public Session signup(AuthRequests.Signup request) {
        requireSamePassword(request.password(), request.confirmPassword());
        if (request.category() == UserCategory.AUDITOR && !properties.auth().allowAuditorSignup())
            throw ApiException.forbidden("Auditor accounts are created by the KRSI platform team");
        String phone = otp.consume(request.verificationToken(), OtpPurpose.SIGNUP);
        if (users.existsByPhone(phone)) throw ApiException.conflict("This phone number is already registered. Sign in instead.");
        User user = register(phone, request.fullName(), request.category(), request.language(), request.password(), null, null, null, null);
        log.info("User {} signed up as {}", user.id(), user.role());
        return session(user);
    }

    /** Creates the account and its ledger identity. Also used by the demo seeder. */
    @Transactional
    public User register(String phone, String fullName, UserCategory category, String language, String password,
                         String district, String state, Double lat, Double lng) {
        String address = BlockHasher.addressFor(phone);
        long id = users.insert(phone, blankToNull(fullName), category, language == null || language.isBlank() ? "English" : language.trim(),
                passwords.encode(password), district, state, lat, lng, address);
        User user = users.findById(id).orElseThrow();
        ledger.record(LedgerEvent.of(LedgerEventType.USER_REGISTERED, "USER", id, asAuthUser(user),
                Map.of("role", user.role().name(), "category", category.id(), "address", address)));
        return user;
    }

    public Session login(AuthRequests.Login request) {
        User user = users.findByPhone(request.phone()).orElse(null);
        boolean ok = passwords.matches(request.password(), user == null ? dummyHash : user.passwordHash());
        if (user == null || !ok) throw ApiException.unauthorized("Phone number or password is incorrect");
        if (!"ACTIVE".equals(user.status())) throw ApiException.forbidden("This account is disabled");
        users.touchLogin(user.id());
        return session(user);
    }

    @Transactional
    public Session resetPassword(AuthRequests.ResetPassword request) {
        requireSamePassword(request.password(), request.confirmPassword());
        String phone = otp.consume(request.verificationToken(), OtpPurpose.RESET_PASSWORD);
        User user = users.findByPhone(phone).orElseThrow(() -> ApiException.notFound("Account", "for this phone"));
        users.updatePassword(user.id(), passwords.encode(request.password()));
        return session(user);
    }

    public Profile profile(AuthUser me) { return Profile.from(load(me.id())); }

    public Profile updateProfile(AuthUser me, AuthRequests.UpdateProfile request) {
        if ((request.latitude() == null) != (request.longitude() == null))
            throw ApiException.invalid("Send latitude and longitude together");
        users.updateProfile(me.id(), blankToNull(request.fullName()), blankToNull(request.language()), blankToNull(request.district()),
                blankToNull(request.state()), request.latitude(), request.longitude());
        return Profile.from(load(me.id()));
    }

    public User load(long id) { return users.findById(id).orElseThrow(() -> ApiException.unauthorized("Account no longer exists")); }

    private Session session(User user) {
        IssuedToken token = tokens.issue(user);
        return new Session(token.value(), "Bearer", token.expiresInSeconds(), token.expiresAt(), Profile.from(user));
    }

    public static AuthUser asAuthUser(User u) { return new AuthUser(u.id(), u.role(), u.phone(), u.walletAddress()); }

    private static void requireSamePassword(String password, String confirm) {
        if (!password.equals(confirm)) throw ApiException.invalid("Passwords do not match");
    }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
