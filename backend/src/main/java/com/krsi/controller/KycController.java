package com.krsi.controller;

import com.krsi.config.OpenApiConfig;
import com.krsi.dto.common.ApiResponse;
import com.krsi.dto.request.KycRequests;
import com.krsi.dto.response.KycResponses;
import com.krsi.security.CurrentUser;
import com.krsi.service.KycService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/kyc")
@Tag(name = OpenApiConfig.TAG_KYC)
public class KycController {
    private final KycService kyc;
    private final CurrentUser currentUser;

    public KycController(KycService kyc, CurrentUser currentUser) {
        this.kyc = kyc;
        this.currentUser = currentUser;
    }

    @Operation(summary = "My KYC status")
    @GetMapping
    public ApiResponse<KycResponses.Status> status() { return ApiResponse.ok(kyc.status(currentUser.require())); }

    @Operation(summary = "Start DigiLocker verification", description = "Returns the DigiLocker URL to open. With the mock provider it points straight back to redirectUrl.")
    @PostMapping("/digilocker")
    public ApiResponse<KycResponses.Start> start(@Valid @RequestBody KycRequests.Start request) {
        return ApiResponse.ok(kyc.start(currentUser.require(), request.redirectUrl()));
    }

    @Operation(summary = "Finish DigiLocker verification", description = "Call when DigiLocker redirects back with ?id=. Status stays NONE until the user completes consent.")
    @PostMapping("/digilocker/{requestId}/complete")
    public ApiResponse<KycResponses.Status> complete(@PathVariable String requestId) {
        return ApiResponse.ok(kyc.complete(currentUser.require(), requestId));
    }
}
