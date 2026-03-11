package com.shs.academic.service;

import com.shs.academic.exception.BadRequestException;
import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.exception.UnauthorizedException;
import com.shs.academic.model.dto.auth.*;
import com.shs.academic.model.entity.ClassSubjectAssignment;
import com.shs.academic.model.entity.Teacher;
import com.shs.academic.model.entity.User;
import com.shs.academic.repository.ClassSubjectAssignmentRepository;
import com.shs.academic.repository.SchoolRepository;
import com.shs.academic.repository.TeacherRepository;
import com.shs.academic.security.CustomUserPrincipal;
import com.shs.academic.util.JwtUtil;
import com.shs.academic.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final ClassSubjectAssignmentRepository classSubjectAssignmentRepository;
    private final SchoolRepository schoolRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!user.isActive()) {
            throw new UnauthorizedException("Account is deactivated. Contact your administrator.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        CustomUserPrincipal principal = new CustomUserPrincipal(user);
        String accessToken = jwtUtil.generateAccessToken(principal, user);
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        UserSessionDto sessionDto = buildUserSession(user);

        log.info("User logged in: {} ({})", user.getEmail(), user.getRole());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration)
                .requiresPasswordChange(user.isFirstLogin())
                .user(sessionDto)
                .build();
    }

    @Transactional
    @PreAuthorize("isAuthenticated()")
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new UnauthorizedException("Current password is incorrect");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("New password and confirm password do not match");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setFirstLogin(false);
        userRepository.save(user);

        log.info("Password changed for user: {}", user.getEmail());

        auditLogService.logAction("PASSWORD_CHANGED", userId, "USER", userId, "Password changed");
    }

    public LoginResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (jwtUtil.isTokenExpired(refreshToken)) {
            throw new UnauthorizedException("Refresh token has expired. Please login again.");
        }

        String email = jwtUtil.extractEmail(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (!user.isActive()) {
            throw new UnauthorizedException("Account is deactivated");
        }

        CustomUserPrincipal principal = new CustomUserPrincipal(user);
        String newAccessToken = jwtUtil.generateAccessToken(principal, user);

        UserSessionDto sessionDto = buildUserSession(user);

        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration)
                .requiresPasswordChange(user.isFirstLogin())
                .user(sessionDto)
                .build();
    }

    @PreAuthorize("isAuthenticated()")
    public UserSessionDto getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return buildUserSession(user);
    }

    private UserSessionDto buildUserSession(User user) {
        UserSessionDto.UserSessionDtoBuilder builder = UserSessionDto.builder()
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .isFirstLogin(user.isFirstLogin())
                .requiresPasswordChange(user.isFirstLogin());

        switch (user.getRole()) {
            case SUPER_ADMIN -> {
                schoolRepository.findFirstByIsActiveTrue()
                        .ifPresent(school -> builder.schoolName(school.getName()));
            }
            case CLASS_TEACHER -> {
                Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
                teacherOpt.ifPresent(teacher -> {
                    if (teacher.getAssignedClass() != null) {
                        builder.assignedClassName(teacher.getAssignedClass().getDisplayName());
                    }
                    builder.schoolName(teacher.getSchool().getName());
                });
            }
            case TUTOR -> {
                Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
                teacherOpt.ifPresent(teacher -> {
                    List<ClassSubjectAssignment> assignments =
                            classSubjectAssignmentRepository.findByTutorId(user.getId());
                    List<String> subjectNames = assignments.stream()
                            .filter(ClassSubjectAssignment::isActive)
                            .map(a -> a.getSubject().getName() + " (" + a.getClassRoom().getDisplayName() + ")")
                            .distinct()
                            .toList();
                    builder.assignedSubjects(subjectNames);
                    builder.schoolName(teacher.getSchool().getName());
                });
            }
            case STUDENT, PARENT -> {
                // Student/parent session info can be extended later
            }
        }

        return builder.build();
    }
}
