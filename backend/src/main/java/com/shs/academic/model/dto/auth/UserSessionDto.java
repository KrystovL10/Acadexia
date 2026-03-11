package com.shs.academic.model.dto.auth;

import com.shs.academic.model.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSessionDto {

    private String userId;
    private String firstName;
    private String lastName;
    private String email;
    private UserRole role;
    private String profilePhotoUrl;
    private boolean isFirstLogin;
    private boolean requiresPasswordChange;
    private String schoolName;
    private String assignedClassName;
    private List<String> assignedSubjects;
}
