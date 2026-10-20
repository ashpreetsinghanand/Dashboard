package com.krsi.dto.response;

import com.krsi.model.Role;
import com.krsi.model.User;
import com.krsi.model.UserCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** Response bodies of /api/auth and /api/me. */
public final class AuthResponses {
    private AuthResponses() {}

    @Schema(description = "OTP sent. devOtp is only present when app.otp.expose-in-response=true (local development)")
    public record OtpSent(String challengeId, @Schema(example = "******3210") String phoneMasked, long expiresInSeconds,
                          @Schema(description = "Drives the 'Resend in 00:57' countdown") long resendAfterSeconds,
                          @Schema(nullable = true) String devOtp) {}

    @Schema(description = "OTP accepted. Pass verificationToken to /auth/signup or /auth/password/reset")
    public record OtpVerified(String verificationToken, long expiresInSeconds,
                              @Schema(description = "True if this phone already has an account (send the user to Sign In)") boolean phoneRegistered) {}

    @Schema(description = "Signed in. Send accessToken as 'Authorization: Bearer <token>'")
    public record Session(String accessToken, @Schema(example = "Bearer") String tokenType, long expiresInSeconds, Instant expiresAt,
                          Profile user) {}

    @Schema(description = "The signed-in user's profile")
    public record Profile(long id, String phone, String fullName, String displayName, Role role, UserCategory category,
                          String categoryLabel, String language, String district, String state, Double latitude, Double longitude,
                          @Schema(description = "Ledger identity shown on receipts and trades") String walletAddress, Instant createdAt) {

        public static Profile from(User u) {
            return new Profile(u.id(), u.phone(), u.fullName(), u.displayName(), u.role(), u.category(), u.category().label(),
                    u.language(), u.district(), u.state(), u.latitude(), u.longitude(), u.walletAddress(), u.createdAt());
        }
    }
}
