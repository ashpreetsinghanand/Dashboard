package com.krsi.dto.common;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** Documentation-only shape of a failed {@link ApiResponse}, used by the OpenAPI spec for every 4xx/5xx response. */
@Schema(name = "ErrorEnvelope", description = "Body of every error response")
public record ErrorEnvelope(
        @Schema(description = "Always false for errors", example = "false") boolean success,
        @Schema(description = "Always null for errors", nullable = true) Object data,
        ApiError error,
        @Schema(description = "Request trace ID, also in the X-Trace-Id header", example = "3f1c2a9e-6b1d-4c1e-9d0a-2b7f5e8c1a44") String traceId,
        @Schema(description = "Server time of the response") Instant timestamp) {}
