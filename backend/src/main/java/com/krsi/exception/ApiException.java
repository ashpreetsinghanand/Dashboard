package com.krsi.exception;

/** Base class for errors that should reach the client with a specific {@link ErrorCode}. */
public class ApiException extends RuntimeException {
    private final ErrorCode code;

    public ApiException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() { return code; }

    public static ApiException notFound(String what, Object id) {
        return new ApiException(ErrorCode.NOT_FOUND, what + " not found: " + id);
    }

    public static ApiException invalid(String message) { return new ApiException(ErrorCode.INVALID_REQUEST, message); }

    public static ApiException state(String message) { return new ApiException(ErrorCode.INVALID_STATE, message); }

    public static ApiException forbidden(String message) { return new ApiException(ErrorCode.FORBIDDEN, message); }

    public static ApiException conflict(String message) { return new ApiException(ErrorCode.CONFLICT, message); }

    public static ApiException unauthorized(String message) { return new ApiException(ErrorCode.UNAUTHORIZED, message); }
}
