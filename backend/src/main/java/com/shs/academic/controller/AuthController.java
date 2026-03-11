package com.shs.academic.controller;

import com.shs.academic.model.dto.ApiResponse;
import com.shs.academic.model.dto.auth.*;
import com.shs.academic.security.CustomUserPrincipal;
import com.shs.academic.service.AuthService;
import com.shs.academic.service.TokenBlacklistService;
import com.shs.academic.util.JwtUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Date;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication and authorization endpoints")
public class AuthController {

    private final AuthService authService;
    private final TokenBlacklistService tokenBlacklistService;
    private final JwtUtil jwtUtil;

    @Operation(summary = "Login with email and password")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @Operation(summary = "Refresh access token")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        LoginResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed", response));
    }

    @Operation(summary = "Change password")
    @PostMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> changePassword(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(principal.getUser().getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully"));
    }

    @Operation(summary = "Get current authenticated user info")
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> getCurrentUser(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        UserSessionDto session = authService.getCurrentUser(principal.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success("User session retrieved", session));
    }

    @Operation(summary = "Logout current user")
    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Date expiry = jwtUtil.extractExpiration(token);
                tokenBlacklistService.blacklistToken(token, expiry.getTime());
            } catch (Exception e) {
                log.warn("Could not blacklist token on logout: {}", e.getMessage());
            }
        }
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }
}
