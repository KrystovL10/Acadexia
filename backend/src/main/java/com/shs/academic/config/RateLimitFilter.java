package com.shs.academic.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> passwordChangeBuckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Only rate limit POST requests to sensitive endpoints
        if ("POST".equalsIgnoreCase(method)) {
            if (path.endsWith("/auth/login")) {
                String clientIp = resolveClientIp(request);
                Bucket bucket = loginBuckets.computeIfAbsent(clientIp, k -> createLoginBucket());
                if (!bucket.tryConsume(1)) {
                    log.warn("Rate limit exceeded for login from IP: {}", clientIp);
                    sendRateLimitResponse(response, "Too many login attempts. Please try again later.");
                    return;
                }
            } else if (path.endsWith("/auth/change-password")) {
                String clientIp = resolveClientIp(request);
                Bucket bucket = passwordChangeBuckets.computeIfAbsent(clientIp, k -> createPasswordChangeBucket());
                if (!bucket.tryConsume(1)) {
                    log.warn("Rate limit exceeded for password change from IP: {}", clientIp);
                    sendRateLimitResponse(response, "Too many password change attempts. Please try again later.");
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private Bucket createLoginBucket() {
        // 5 attempts per minute
        Bandwidth limit = Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createPasswordChangeBucket() {
        // 3 attempts per hour
        Bandwidth limit = Bandwidth.classic(3, Refill.intervally(3, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            String ip = xForwardedFor.split(",")[0].trim();
            // Basic validation: only trust if it looks like an IP address
            if (ip.matches("^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}$") || ip.contains(":")) {
                return ip;
            }
        }
        return request.getRemoteAddr();
    }

    private void sendRateLimitResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", "60");
        response.getWriter().write(
            "{\"success\":false,\"message\":\"" + message + "\",\"data\":null,\"timestamp\":\"" +
            java.time.LocalDateTime.now() + "\"}"
        );
    }
}
