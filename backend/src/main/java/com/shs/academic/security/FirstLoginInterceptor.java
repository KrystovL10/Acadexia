package com.shs.academic.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shs.academic.model.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class FirstLoginInterceptor implements HandlerInterceptor {

    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler) throws IOException {
        String path = request.getRequestURI();

        // Skip auth endpoints that should always be accessible
        if (path.startsWith("/api/v1/auth/change-password")
                || path.startsWith("/api/v1/auth/logout")
                || path.startsWith("/api/v1/auth/me")) {
            return true;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserPrincipal principal)) {
            return true;
        }

        if (principal.getUser().isFirstLogin()) {
            log.warn("First-login user {} attempted to access {} without changing password",
                    principal.getUser().getEmail(), path);

            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            ApiResponse apiResponse = ApiResponse.builder()
                    .success(false)
                    .message("Password change required. Please update your password before continuing.")
                    .data(Map.of("requiresPasswordChange", true))
                    .build();

            objectMapper.writeValue(response.getOutputStream(), apiResponse);
            return false;
        }

        return true;
    }
}
