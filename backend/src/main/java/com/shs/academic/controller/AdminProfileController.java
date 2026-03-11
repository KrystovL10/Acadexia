package com.shs.academic.controller;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.ApiResponse;
import com.shs.academic.model.dto.admin.UpdateProfileRequest;
import com.shs.academic.model.dto.auth.UserSessionDto;
import com.shs.academic.model.entity.User;
import com.shs.academic.repository.UserRepository;
import com.shs.academic.security.CustomUserPrincipal;
import com.shs.academic.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/profile")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Admin Profile", description = "Admin profile management endpoints")
public class AdminProfileController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @Operation(summary = "Get current admin profile")
    @GetMapping
    public ResponseEntity<ApiResponse> getProfile(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        UserSessionDto session = authService.getCurrentUser(principal.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success("Admin profile retrieved", session));
    }

    @Operation(summary = "Update admin profile")
    @PutMapping
    @Transactional
    public ResponseEntity<ApiResponse> updateProfile(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request) {

        User user = userRepository.findById(principal.getUser().getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setProfilePhotoUrl(request.getProfilePhotoUrl());
        userRepository.save(user);

        UserSessionDto session = authService.getCurrentUser(user.getId());
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", session));
    }
}
