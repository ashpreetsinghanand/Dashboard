package com.krsi.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Gives every request a trace ID (reused from the {@code X-Trace-Id} header when the UI sends one),
 * puts it in the logging context, returns it in the response header, and logs one access line per request.
 * Runs before Spring Security so 401/403 responses carry the trace ID too.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter extends OncePerRequestFilter {
    public static final String TRACE_HEADER = "X-Trace-Id";
    public static final String MDC_KEY = "traceId";
    private static final Logger log = LoggerFactory.getLogger(TraceIdFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String traceId = resolveTraceId(request.getHeader(TRACE_HEADER));
        long start = System.nanoTime();
        MDC.put(MDC_KEY, traceId);
        response.setHeader(TRACE_HEADER, traceId);
        try {
            chain.doFilter(request, response);
        } finally {
            long elapsedMs = (System.nanoTime() - start) / 1_000_000;
            String uri = request.getRequestURI();
            if (uri.startsWith("/api/")) log.info("{} {} -> {} ({} ms)", request.getMethod(), uri, response.getStatus(), elapsedMs);
            else log.debug("{} {} -> {} ({} ms)", request.getMethod(), uri, response.getStatus(), elapsedMs);
            MDC.remove(MDC_KEY);
        }
    }

    static String resolveTraceId(String incoming) {
        return incoming != null && incoming.matches("[A-Za-z0-9-]{8,64}") ? incoming : UUID.randomUUID().toString();
    }

    public static String currentTraceId() { return MDC.get(MDC_KEY); }
}
