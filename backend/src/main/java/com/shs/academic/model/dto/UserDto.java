package com.shs.academic.model.dto;

import com.shs.academic.model.entity.User;
import com.shs.academic.model.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {

    private Long id;
    private String userId;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private UserRole role;
    private String phoneNumber;
    private String profilePhotoUrl;
    private boolean isActive;
    private boolean isFirstLogin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;

    public static UserDto fromEntity(User user) {
        return UserDto.builder()
                .id(user.getId())
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .phoneNumber(user.getPhoneNumber())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .isActive(user.isActive())
                .isFirstLogin(user.isFirstLogin())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .createdBy(user.getCreatedBy())
                .build();
    }
}
