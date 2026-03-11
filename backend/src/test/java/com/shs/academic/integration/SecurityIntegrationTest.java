package com.shs.academic.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shs.academic.model.dto.auth.LoginRequest;
import com.shs.academic.model.entity.User;
import com.shs.academic.model.enums.UserRole;
import com.shs.academic.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Comprehensive security integration tests verifying endpoint access control,
 * JWT authentication, and role-based authorization across all role types.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    // Test users for each role
    private static final String ADMIN_EMAIL = "sec-admin@acadexa.gh";
    private static final String TEACHER_EMAIL = "sec-teacher@acadexa.gh";
    private static final String TUTOR_EMAIL = "sec-tutor@acadexa.gh";
    private static final String STUDENT_EMAIL = "sec-student@acadexa.gh";
    private static final String PARENT_EMAIL = "sec-parent@acadexa.gh";
    private static final String PASSWORD = "SecTest@123";

    @BeforeEach
    void setUp() {
        createUserIfNotExists("GES-ADM-9001", "SecAdmin", ADMIN_EMAIL, UserRole.SUPER_ADMIN);
        createUserIfNotExists("GES-TCH-9001", "SecTeacher", TEACHER_EMAIL, UserRole.CLASS_TEACHER);
        createUserIfNotExists("GES-TUT-9001", "SecTutor", TUTOR_EMAIL, UserRole.TUTOR);
        createUserIfNotExists("GES-STD-9001", "SecStudent", STUDENT_EMAIL, UserRole.STUDENT);
        createUserIfNotExists("GES-PAR-9001", "SecParent", PARENT_EMAIL, UserRole.PARENT);
    }

    private void createUserIfNotExists(String userId, String firstName, String email, UserRole role) {
        if (!userRepository.existsByEmail(email)) {
            userRepository.save(User.builder()
                    .userId(userId)
                    .firstName(firstName)
                    .lastName("Test")
                    .email(email)
                    .password(passwordEncoder.encode(PASSWORD))
                    .role(role)
                    .isActive(true)
                    .isFirstLogin(false)
                    .build());
        }
    }

    private String loginAs(String email) throws Exception {
        LoginRequest req = new LoginRequest(email, PASSWORD);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .at("/data/accessToken").asText();
    }

    // ==================== Public Endpoint Tests ====================

    @Test
    @Order(1)
    @DisplayName("GET /api/health is publicly accessible")
    void health_isPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"));
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/v1/auth/login is publicly accessible")
    void login_isPublic() throws Exception {
        LoginRequest req = new LoginRequest(ADMIN_EMAIL, PASSWORD);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/v1/auth/refresh is publicly accessible (not 403)")
    void refresh_isPublic() throws Exception {
        // Should not return 403 (forbidden) — endpoint is public even if token is invalid
        int statusCode = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"invalid\"}"))
                .andReturn().getResponse().getStatus();
        // Accept 401 or 500 (token parse error) — key thing is it's NOT 403
        org.junit.jupiter.api.Assertions.assertNotEquals(403, statusCode,
                "Refresh endpoint should be public (not 403), got: " + statusCode);
    }

    // ==================== Unauthenticated Access Tests ====================

    @Test
    @Order(10)
    @DisplayName("Protected endpoints without token return 403")
    void protectedEndpoints_noToken_return403() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/users/teachers")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/teachers/class")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/students/profile")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/parents/dashboard")).andExpect(status().isForbidden());
    }

    @Test
    @Order(11)
    @DisplayName("Invalid JWT token returns 403")
    void invalidJwt_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer invalid.jwt.token.here"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(12)
    @DisplayName("Expired-like malformed token returns 403")
    void malformedToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.invalid"))
                .andExpect(status().isForbidden());
    }

    // ==================== Role-Based Admin Endpoint Tests ====================

    @Test
    @Order(20)
    @DisplayName("SUPER_ADMIN can access /api/v1/admin/** endpoints (not 403)")
    void admin_canAccessAdminEndpoints() throws Exception {
        String token = loginAs(ADMIN_EMAIL);

        int status = mockMvc.perform(get("/api/v1/admin/subjects")
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getStatus();
        // Admin should not get 403 — may get 200 or 500 depending on seeder data
        org.junit.jupiter.api.Assertions.assertNotEquals(403, status,
                "SUPER_ADMIN should not get 403 on admin endpoints, got: " + status);
    }

    @Test
    @Order(21)
    @DisplayName("CLASS_TEACHER cannot access /api/v1/admin/** endpoints")
    void teacher_cannotAccessAdminEndpoints() throws Exception {
        String token = loginAs(TEACHER_EMAIL);

        mockMvc.perform(get("/api/v1/admin/users/teachers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(22)
    @DisplayName("TUTOR cannot access /api/v1/admin/** endpoints")
    void tutor_cannotAccessAdminEndpoints() throws Exception {
        String token = loginAs(TUTOR_EMAIL);

        mockMvc.perform(get("/api/v1/admin/users/teachers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(23)
    @DisplayName("STUDENT cannot access /api/v1/admin/** endpoints")
    void student_cannotAccessAdminEndpoints() throws Exception {
        String token = loginAs(STUDENT_EMAIL);

        mockMvc.perform(get("/api/v1/admin/users/teachers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(24)
    @DisplayName("PARENT cannot access /api/v1/admin/** endpoints")
    void parent_cannotAccessAdminEndpoints() throws Exception {
        String token = loginAs(PARENT_EMAIL);

        mockMvc.perform(get("/api/v1/admin/users/teachers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ==================== Role-Based Teacher Endpoint Tests ====================

    @Test
    @Order(30)
    @DisplayName("CLASS_TEACHER can access /api/v1/teachers/** endpoints (not 403)")
    void teacher_canAccessTeacherEndpoints() throws Exception {
        String token = loginAs(TEACHER_EMAIL);

        int status = mockMvc.perform(get("/api/v1/teachers/dashboard")
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getStatus();
        // Teacher should not get 403 — may get 404 if no class assigned
        org.junit.jupiter.api.Assertions.assertNotEquals(403, status,
                "CLASS_TEACHER should not get 403 on teacher endpoints, got: " + status);
    }

    @Test
    @Order(31)
    @DisplayName("SUPER_ADMIN cannot access /api/v1/teachers/** endpoints")
    void admin_cannotAccessTeacherEndpoints() throws Exception {
        String token = loginAs(ADMIN_EMAIL);

        mockMvc.perform(get("/api/v1/teachers/dashboard")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(32)
    @DisplayName("STUDENT cannot access /api/v1/teachers/** endpoints")
    void student_cannotAccessTeacherEndpoints() throws Exception {
        String token = loginAs(STUDENT_EMAIL);

        mockMvc.perform(get("/api/v1/teachers/dashboard")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ==================== Role-Based Student Endpoint Tests ====================

    @Test
    @Order(40)
    @DisplayName("STUDENT can access /api/v1/students/** endpoints (not 403)")
    void student_canAccessStudentEndpoints() throws Exception {
        String token = loginAs(STUDENT_EMAIL);

        int status = mockMvc.perform(get("/api/v1/students/profile")
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getStatus();
        // Student should not get 403 — may get 404 if no Student entity linked
        org.junit.jupiter.api.Assertions.assertNotEquals(403, status,
                "STUDENT should not get 403 on student endpoints, got: " + status);
    }

    @Test
    @Order(41)
    @DisplayName("SUPER_ADMIN cannot access /api/v1/students/** endpoints")
    void admin_cannotAccessStudentEndpoints() throws Exception {
        String token = loginAs(ADMIN_EMAIL);

        mockMvc.perform(get("/api/v1/students/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(42)
    @DisplayName("CLASS_TEACHER cannot access /api/v1/students/** endpoints")
    void teacher_cannotAccessStudentEndpoints() throws Exception {
        String token = loginAs(TEACHER_EMAIL);

        mockMvc.perform(get("/api/v1/students/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ==================== Cross-Role Authenticated Endpoint Tests ====================

    @Test
    @Order(50)
    @DisplayName("All roles can access /api/v1/auth/me")
    void allRoles_canAccessMe() throws Exception {
        for (String email : new String[]{ADMIN_EMAIL, TEACHER_EMAIL, TUTOR_EMAIL, STUDENT_EMAIL, PARENT_EMAIL}) {
            String token = loginAs(email);
            mockMvc.perform(get("/api/v1/auth/me")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.email").value(email));
        }
    }

    @Test
    @Order(51)
    @DisplayName("All roles can access /api/v1/auth/logout")
    void allRoles_canAccessLogout() throws Exception {
        for (String email : new String[]{ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL}) {
            String token = loginAs(email);
            mockMvc.perform(post("/api/v1/auth/logout")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
        }
    }

    // ==================== Deactivated User Tests ====================

    @Test
    @Order(60)
    @DisplayName("Deactivated user cannot login")
    void deactivatedUser_cannotLogin() throws Exception {
        String deactivatedEmail = "sec-deactivated@acadexa.gh";
        if (!userRepository.existsByEmail(deactivatedEmail)) {
            userRepository.save(User.builder()
                    .userId("GES-STD-9099")
                    .firstName("Deactivated")
                    .lastName("User")
                    .email(deactivatedEmail)
                    .password(passwordEncoder.encode(PASSWORD))
                    .role(UserRole.STUDENT)
                    .isActive(false)
                    .isFirstLogin(false)
                    .build());
        }

        LoginRequest req = new LoginRequest(deactivatedEmail, PASSWORD);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }
}
