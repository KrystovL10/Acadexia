package com.shs.academic.util;

import com.shs.academic.model.enums.UserRole;
import com.shs.academic.security.CustomUserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtil {

    private SecurityUtil() {}

    public static CustomUserPrincipal getCurrentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserPrincipal principal) {
            return principal;
        }
        throw new IllegalStateException("No authenticated user in security context");
    }

    public static Long getCurrentUserId() {
        return getCurrentPrincipal().getUser().getId();
    }

    public static String getCurrentUserEmail() {
        return getCurrentPrincipal().getUser().getEmail();
    }

    public static UserRole getCurrentUserRole() {
        return getCurrentPrincipal().getUser().getRole();
    }

    public static boolean hasRole(UserRole role) {
        return getCurrentUserRole() == role;
    }

    public static boolean isAdmin() {
        return hasRole(UserRole.SUPER_ADMIN);
    }

    public static boolean isClassTeacher() {
        return hasRole(UserRole.CLASS_TEACHER);
    }

    public static boolean isTutor() {
        return hasRole(UserRole.TUTOR);
    }

    public static boolean isStudent() {
        return hasRole(UserRole.STUDENT);
    }
}
