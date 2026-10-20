package com.krsi.dto.request;

import com.krsi.model.OtpPurpose;
import com.krsi.model.UserCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request bodies of /api/auth and /api/me. */
public final class AuthRequests {
    private AuthRequests() {}

    public static final String PHONE_REGEX = "[6-9][0-9]{9}";
    public static final String PHONE_MESSAGE = "must be a 10-digit Indian mobile number";
    /** At least 8 characters with a letter and a digit. */
    public static final String PASSWORD_REGEX = "^(?=.*[A-Za-z])(?=.*[0-9]).{8,72}$";
    public static final String PASSWORD_MESSAGE = "must be 8-72 characters with at least one letter and one digit";

    @Schema(description = "Phone screen: send a one-time password")
    public record SendOtp(
            @Schema(example = "9876543210") @NotBlank @Pattern(regexp = PHONE_REGEX, message = PHONE_MESSAGE) String phone,
            @Schema(description = "SIGNUP (default), LOGIN or RESET_PASSWORD") OtpPurpose purpose) {

        public OtpPurpose purposeOrDefault() { return purpose == null ? OtpPurpose.SIGNUP : purpose; }
    }

    @Schema(description = "OTP screen: verify the 6 digits")
    public record VerifyOtp(
            @Schema(description = "challengeId from /auth/otp/send") @NotBlank @Size(max = 64) String challengeId,
            @Schema(example = "123456") @NotBlank @Pattern(regexp = "[0-9]{4,8}", message = "must be the digits you received") String otp) {}

    @Schema(description = "Create Password screen: finish sign-up with the values collected on the earlier screens")
    public record Signup(
            @Schema(description = "verificationToken from /auth/otp/verify") @NotBlank @Size(max = 64) String verificationToken,
            @NotBlank @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MESSAGE) String password,
            @NotBlank String confirmPassword,
            @Schema(description = "Category card id: farmer, fpo, trader, fpu, warehouse_owner (auditor only when enabled)", example = "farmer")
            @NotNull UserCategory category,
            @Schema(description = "Language label from the language screen", example = "English") @Size(max = 40) String language,
            @Schema(description = "Optional; the UI can ask for it later on the profile", example = "Suraj Kumar") @Size(max = 80) String fullName) {}

    @Schema(description = "Sign In screen")
    public record Login(
            @Schema(example = "9000000001") @NotBlank @Pattern(regexp = PHONE_REGEX, message = PHONE_MESSAGE) String phone,
            @Schema(example = "Krsi@1234") @NotBlank @Size(max = 72) String password) {}

    @Schema(description = "Forgot password: OTP (purpose RESET_PASSWORD) then a new password")
    public record ResetPassword(
            @NotBlank @Size(max = 64) String verificationToken,
            @NotBlank @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MESSAGE) String password,
            @NotBlank String confirmPassword) {}

    @Schema(description = "Profile update; omitted fields are unchanged")
    public record UpdateProfile(
            @Size(max = 80) String fullName,
            @Size(max = 40) String language,
            @Schema(example = "Dichaon Kalan") @Size(max = 80) String district,
            @Schema(example = "Delhi") @Size(max = 80) String state,
            @Schema(description = "Used to sort warehouses by distance", example = "28.61") @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @Schema(example = "76.95") @DecimalMin("-180") @DecimalMax("180") Double longitude) {}
}
