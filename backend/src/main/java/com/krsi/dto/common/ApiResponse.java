package com.krsi.dto.common;

import com.krsi.config.TraceIdFilter;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Envelope used by every endpoint so the UI can handle success and failure the same way:
 * check {@code success}, read {@code data} or {@code error}, and quote {@code traceId} when reporting a problem.
 */
@Schema(description = "Standard response envelope")
public record ApiResponse<T>(
        @Schema(description = "True when the request succeeded", example = "true") boolean success,
        @Schema(description = "Payload; present when success is true") T data,
        @Schema(description = "Error; present when success is false", nullable = true) ApiError error,
        @Schema(description = "Request trace ID, also in the X-Trace-Id header") String traceId,
        @Schema(description = "Server time of the response") Instant timestamp) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, TraceIdFilter.currentTraceId(), Instant.now());
    }

    public static <T> ApiResponse<T> failure(ApiError error) {
        return new ApiResponse<>(false, null, error, TraceIdFilter.currentTraceId(), Instant.now());
    }
}
