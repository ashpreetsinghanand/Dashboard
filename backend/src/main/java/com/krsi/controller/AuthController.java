package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.request.AuthRequests;
import com.krsi.dto.response.AuthResponses.OtpSent;
import com.krsi.dto.response.AuthResponses.OtpVerified;
import com.krsi.dto.response.AuthResponses.Profile;
import com.krsi.dto.response.AuthResponses.Session;
import com.krsi.security.CurrentUser;
import com.krsi.service.AuthService;
import com.krsi.service.OtpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = OpenApiConfig.TAG_AUTH)
public class AuthController {
    private final AuthService auth;
    private final OtpService otp;
    private final CurrentUser currentUser;

    public AuthController(AuthService auth, OtpService otp, CurrentUser currentUser) {
        this.auth = auth;
        this.otp = otp;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Send an OTP (Phone screen)",
            description = "SIGNUP fails with 409 CONFLICT if the number is registered; LOGIN/RESET_PASSWORD fail with 404 if it is not. "
                    + "429 RATE_LIMITED if requested again within resendAfterSeconds or more than 5 times an hour.")
    @PostMapping("/auth/otp/send")
    public ApiResponse<OtpSent> sendOtp(@Valid @RequestBody AuthRequests.SendOtp request) {
        return ApiResponse.ok(otp.send(request.phone(), request.purposeOrDefault()));
    }

    @Operation(summary = "Verify the OTP (OTP screen)",
            description = "Returns a one-time verificationToken valid for 15 minutes. 400 OTP_INVALID for a wrong code, 410 OTP_EXPIRED when expired.")
    @PostMapping("/auth/otp/verify")
    public ApiResponse<OtpVerified> verifyOtp(@Valid @RequestBody AuthRequests.VerifyOtp request) {
        return ApiResponse.ok(otp.verify(request.challengeId(), request.otp()));
    }

    @Operation(summary = "Create the account (Create Password screen)",
            description = "Uses the verificationToken plus the language and category picked on the earlier screens. Returns a signed-in session.")
    @PostMapping("/auth/signup")
    public ApiResponse<Session> signup(@Valid @RequestBody AuthRequests.Signup request) {
        return ApiResponse.ok(auth.signup(request));
    }

    @Operation(summary = "Sign in with phone and password", description = "401 UNAUTHORIZED when the phone or password is wrong.")
    @PostMapping("/auth/login")
    public ApiResponse<Session> login(@Valid @RequestBody AuthRequests.Login request) {
        return ApiResponse.ok(auth.login(request));
    }

    @Operation(summary = "Reset the password after an OTP with purpose RESET_PASSWORD")
    @PostMapping("/auth/password/reset")
    public ApiResponse<Session> resetPassword(@Valid @RequestBody AuthRequests.ResetPassword request) {
        return ApiResponse.ok(auth.resetPassword(request));
    }

    @Operation(summary = "The signed-in user (top bar name and role)")
    @GetMapping("/me")
    public ApiResponse<Profile> me() {
        return ApiResponse.ok(auth.profile(currentUser.require()));
    }

    @Operation(summary = "Update name, language or location", description = "Latitude/longitude let the warehouse search sort by distance.")
    @PatchMapping("/me")
    public ApiResponse<Profile> updateMe(@Valid @RequestBody AuthRequests.UpdateProfile request) {
        return ApiResponse.ok(auth.updateProfile(currentUser.require(), request));
    }
}
