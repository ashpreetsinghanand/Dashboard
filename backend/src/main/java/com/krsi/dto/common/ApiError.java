package com.krsi.dto.common;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Error body. {@code details} lists per-field validation problems when there are any. */
@Schema(description = "Error information")
public record ApiError(
        @Schema(description = "Stable error code to switch on in the UI", example = "INVALID_STATE",
                allowableValues = {"INVALID_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "METHOD_NOT_ALLOWED",
                        "CONFLICT", "INVALID_STATE", "OTP_INVALID", "OTP_EXPIRED", "RATE_LIMITED",
                        "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"}) String code,
        @Schema(description = "Message safe to show to the user", example = "Only PENDING bookings can be accepted") String message,
        @Schema(description = "Per-field validation problems (empty when not a validation error)") List<FieldIssue> details) {

    @Schema(description = "A validation problem with one request field")
    public record FieldIssue(
            @Schema(example = "quantityQtl") String field,
            @Schema(example = "must be greater than 0") String message) {}

    public static ApiError of(String code, String message) { return new ApiError(code, message, List.of()); }
}
