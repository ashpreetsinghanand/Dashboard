package com.krsi.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

public final class KycResponses {
    private KycResponses() {}

    @Schema(description = "The signed-in user's KYC state")
    public record Status(
            @Schema(description = "NONE or VERIFIED") String status,
            Instant verifiedAt,
            @Schema(description = "Name on the Aadhaar record") String fullName,
            @Schema(description = "Last 4 digits of Aadhaar; the full number is never stored") String aadhaarLast4,
            @Schema(description = "mock or setu") String provider) {}

    @Schema(description = "Open url in the browser; DigiLocker sends the user back to redirectUrl?id=<requestId>")
    public record Start(String requestId, String url, String provider) {}
}
