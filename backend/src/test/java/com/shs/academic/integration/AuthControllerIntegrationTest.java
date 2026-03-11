package com.shs.academic.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shs.academic.model.dto.auth.ChangePasswordRequest;
import com.shs.academic.model.dto.auth.LoginRequest;
import com.shs.academic.model.dto.auth.RefreshTokenRequest;
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
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final String AUTH_EMAIL = "auth-test@acadexa.gh";
    private static final String AUTH_PASSWORD = "AuthTest@123";

    @BeforeEach
    void setUp() {
        if (!userRepository.existsByEmail(AUTH_EMAIL)) {
            userRepository.save(User.builder()
                    .userId("GES-ADM-8001")
                    .firstName("Auth")
                    .lastName("Tester")
                    .email(AUTH_EMAIL)
                    .password(passwordEncoder.encode(AUTH_PASSWORD))
                    .role(UserRole.SUPER_ADMIN)
                    .isActive(true)
                    .isFirstLogin(true)
                    .build());
        }
    }

    @AfterAll
    static void cleanup(@Autowired UserRepository userRepository) {
        userRepository.findByEmail(AUTH_EMAIL).ifPresent(userRepository::delete);
        userRepository.findByEmail("auth-changepw@acadexa.gh").ifPresent(userRepository::delete);
    }

    // ── Helper ──

    private String login(String email, String password) throws Exception {
        LoginRequest req = new LoginRequest(email, password);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.at("/data/accessToken").asText();
    }

    // ==================== Login Tests ====================

    @Test
    @Order(1)
    @DisplayName("Login with valid credentials returns tokens and user data")
    void login_validCredentials_returnsTokensAndUser() throws Exception {
        LoginRequest request = new LoginRequest(AUTH_EMAIL, AUTH_PASSWORD);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").isNumber())
                .andExpect(jsonPath("$.data.user.email").value(AUTH_EMAIL))
                .andExpect(jsonPath("$.data.user.role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$.data.user.firstName").value("Auth"));
    }

    @Test
    @Order(2)
    @DisplayName("Login with wrong password returns 401")
    void login_wrongPassword_returns401() throws Exception {
        LoginRequest request = new LoginRequest(AUTH_EMAIL, "WrongPass@999");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @Order(3)
    @DisplayName("Login with non-existent email returns 401")
    void login_nonExistentEmail_returns401() throws Exception {
        LoginRequest request = new LoginRequest("nobody@acadexa.gh", "SomePass@123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @Order(4)
    @DisplayName("Login with invalid email format returns 400")
    void login_invalidEmailFormat_returns400() throws Exception {
        LoginRequest request = new LoginRequest("not-an-email", "Password@123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(5)
    @DisplayName("Login with blank password returns 400")
    void login_blankPassword_returns400() throws Exception {
        LoginRequest request = new LoginRequest(AUTH_EMAIL, "");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ==================== Token Refresh Tests ====================

    @Test
    @Order(6)
    @DisplayName("Refresh with valid refresh token returns new tokens")
    void refresh_validToken_returnsNewTokens() throws Exception {
        // Login first to get refresh token
        LoginRequest loginReq = new LoginRequest(AUTH_EMAIL, AUTH_PASSWORD);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String refreshToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .at("/data/refreshToken").asText();

        RefreshTokenRequest refreshReq = new RefreshTokenRequest(refreshToken);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test
    @Order(7)
    @DisplayName("Refresh with invalid token returns error (not 200)")
    void refresh_invalidToken_returnsError() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest("invalid.jwt.token");

        int status = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn().getResponse().getStatus();
        // Invalid token should not return 200 — may return 401 or 500 depending on error handling
        assertNotEquals(200, status, "Invalid refresh token should not return 200");
    }

    // ==================== /me Endpoint Tests ====================

    @Test
    @Order(8)
    @DisplayName("GET /me with valid token returns current user session")
    void me_withValidToken_returnsUserSession() throws Exception {
        String token = login(AUTH_EMAIL, AUTH_PASSWORD);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value(AUTH_EMAIL))
                .andExpect(jsonPath("$.data.role").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$.data.firstName").value("Auth"))
                .andExpect(jsonPath("$.data.lastName").value("Tester"));
    }

    @Test
    @Order(9)
    @DisplayName("GET /me without token returns 403")
    void me_withoutToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isForbidden());
    }

    // ==================== Change Password Tests ====================

    @Test
    @Order(10)
    @DisplayName("Change password with correct current password succeeds")
    void changePassword_valid_succeeds() throws Exception {
        // Create a separate user for password change test
        String cpEmail = "auth-changepw@acadexa.gh";
        String cpOldPassword = "OldPass@123";
        if (!userRepository.existsByEmail(cpEmail)) {
            userRepository.save(User.builder()
                    .userId("GES-ADM-8002")
                    .firstName("CP")
                    .lastName("User")
                    .email(cpEmail)
                    .password(passwordEncoder.encode(cpOldPassword))
                    .role(UserRole.SUPER_ADMIN)
                    .isActive(true)
                    .isFirstLogin(true)
                    .build());
        }

        String token = login(cpEmail, cpOldPassword);

        ChangePasswordRequest cpReq = new ChangePasswordRequest(
                cpOldPassword, "NewPass@456", "NewPass@456");

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cpReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify new password works
        login(cpEmail, "NewPass@456");
    }

    @Test
    @Order(11)
    @DisplayName("Change password with wrong current password returns 401")
    void changePassword_wrongCurrent_returns401() throws Exception {
        String token = login(AUTH_EMAIL, AUTH_PASSWORD);

        ChangePasswordRequest cpReq = new ChangePasswordRequest(
                "WrongCurrent@1", "NewPass@456", "NewPass@456");

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cpReq)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(12)
    @DisplayName("Change password without token returns 403")
    void changePassword_noToken_returns403() throws Exception {
        ChangePasswordRequest cpReq = new ChangePasswordRequest(
                "whatever", "NewPass@456", "NewPass@456");

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cpReq)))
                .andExpect(status().isForbidden());
    }

    // ==================== Logout Tests ====================

    @Test
    @Order(13)
    @DisplayName("POST /logout with valid token returns 200")
    void logout_withToken_returns200() throws Exception {
        String token = login(AUTH_EMAIL, AUTH_PASSWORD);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(14)
    @DisplayName("POST /logout without token returns 403")
    void logout_withoutToken_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isForbidden());
    }
}
