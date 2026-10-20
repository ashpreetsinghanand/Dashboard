package com.krsi.exception;

import org.springframework.http.HttpStatus;

/** Stable error codes the React app can switch on; each maps to one HTTP status. */
public enum ErrorCode {
    INVALID_REQUEST(HttpStatus.BAD_REQUEST),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED),
    FORBIDDEN(HttpStatus.FORBIDDEN),
    NOT_FOUND(HttpStatus.NOT_FOUND),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED),
    /** Duplicate resource, e.g. a phone number that is already registered. */
    CONFLICT(HttpStatus.CONFLICT),
    /** The action is not allowed in the resource's current state, e.g. accepting a booking twice. */
    INVALID_STATE(HttpStatus.CONFLICT),
    OTP_INVALID(HttpStatus.BAD_REQUEST),
    OTP_EXPIRED(HttpStatus.GONE),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS),
    DEPENDENCY_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus status;

    ErrorCode(HttpStatus status) { this.status = status; }

    public HttpStatus status() { return status; }
}
