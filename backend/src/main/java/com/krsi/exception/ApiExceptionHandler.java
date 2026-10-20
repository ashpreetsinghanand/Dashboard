package com.krsi.exception;

import com.krsi.dto.common.ApiError;
import com.krsi.dto.common.ApiResponse;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.BindException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Turns every exception into the standard {@link ApiResponse} error envelope and logs it once. */
@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiResponse<Void>> handleApi(ApiException e) {
        log.warn("Request rejected [{}]: {}", e.code(), e.getMessage());
        return respond(e.code(), e.getMessage(), List.of());
    }

    /** Role checks from @PreAuthorize: 401 when not signed in, 403 when signed in with the wrong role. */
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResponse<Void>> handleDenied(AccessDeniedException e) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth instanceof AnonymousAuthenticationToken || !auth.isAuthenticated()) {
            return respond(ErrorCode.UNAUTHORIZED, "Sign in to continue", List.of());
        }
        log.warn("Access denied for {}: {}", auth.getName(), e.getMessage());
        return respond(ErrorCode.FORBIDDEN, "Your role is not allowed to perform this action", List.of());
    }

    /** Body (@Valid @RequestBody) and query-object (@ModelAttribute) validation failures. */
    @ExceptionHandler(BindException.class)
    ResponseEntity<ApiResponse<Void>> handleBind(BindException e) {
        List<ApiError.FieldIssue> issues = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new ApiError.FieldIssue(f.getField(), f.getDefaultMessage())).toList();
        log.warn("Validation failed: {}", issues);
        return respond(ErrorCode.INVALID_REQUEST, "One or more fields are invalid", issues);
    }

    /** Constraint violations on @PathVariable / @RequestParam. */
    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<ApiResponse<Void>> handleMethodValidation(HandlerMethodValidationException e) {
        List<ApiError.FieldIssue> issues = e.getParameterValidationResults().stream()
                .flatMap(r -> r.getResolvableErrors().stream()
                        .map(err -> new ApiError.FieldIssue(r.getMethodParameter().getParameterName(), err.getDefaultMessage())))
                .toList();
        log.warn("Parameter validation failed: {}", issues);
        return respond(ErrorCode.INVALID_REQUEST, "One or more parameters are invalid", issues);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiResponse<Void>> handleUnreadable(Exception e) {
        log.warn("Malformed request: {}", e.getClass().getSimpleName());
        return respond(ErrorCode.INVALID_REQUEST, "Malformed request: check the JSON body and parameters", List.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException e) {
        return respond(ErrorCode.NOT_FOUND, "No endpoint at this path", List.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiResponse<Void>> handleMethod(HttpRequestMethodNotSupportedException e) {
        return respond(ErrorCode.METHOD_NOT_ALLOWED, "HTTP method " + e.getMethod() + " is not supported here", List.of());
    }

    /** A database constraint caught a race (e.g. two sign-ups with one phone, capacity going negative). */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResponse<Void>> handleIntegrity(DataIntegrityViolationException e) {
        log.warn("Constraint violation: {}", e.getMostSpecificCause().getMessage());
        return respond(ErrorCode.CONFLICT, "The change conflicts with existing data; refresh and try again", List.of());
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ApiResponse<Void>> handleDatabase(DataAccessException e) {
        log.error("Database error", e);
        return respond(ErrorCode.DEPENDENCY_UNAVAILABLE, "Database unavailable. Check that PostgreSQL is running.", List.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception e) {
        log.error("Unexpected error", e);
        return respond(ErrorCode.INTERNAL_ERROR, "Unexpected server error", List.of());
    }

    private static ResponseEntity<ApiResponse<Void>> respond(ErrorCode code, String message, List<ApiError.FieldIssue> details) {
        return ResponseEntity.status(code.status())
                .body(ApiResponse.failure(new ApiError(code.name(), message, details)));
    }
}
