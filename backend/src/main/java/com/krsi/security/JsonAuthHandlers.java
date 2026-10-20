package com.krsi.security;

import com.krsi.config.TraceIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * Writes 401/403 from the security filter chain in the same envelope as every other error, so the UI
 * can handle "token missing/expired" in one place. Messages are fixed strings, so no JSON escaping is needed.
 */
@Component
public class JsonAuthHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException e) throws IOException {
        write(response, HttpServletResponse.SC_UNAUTHORIZED, "UNAUTHORIZED", "Sign in again: your session is missing or has expired");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException e) throws IOException {
        write(response, HttpServletResponse.SC_FORBIDDEN, "FORBIDDEN", "Your role is not allowed to perform this action");
    }

    private static void write(HttpServletResponse response, int status, String code, String message) throws IOException {
        String traceId = TraceIdFilter.currentTraceId();
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"success\":false,\"data\":null,\"error\":{\"code\":\"" + code + "\",\"message\":\"" + message
                + "\",\"details\":[]},\"traceId\":" + (traceId == null ? "null" : "\"" + traceId + "\"")
                + ",\"timestamp\":\"" + Instant.now() + "\"}");
    }
}
