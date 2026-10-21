package com.krsi.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class KycRequests {
    private KycRequests() {}

    public record Start(
            @NotBlank @Size(max = 500)
            @Schema(description = "Page DigiLocker returns to; must be on an allowed app origin", example = "http://localhost:5173/kyc/callback")
            String redirectUrl) {}
}
