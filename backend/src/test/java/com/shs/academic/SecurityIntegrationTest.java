package com.shs.academic;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String TEST_EMAIL = "test-security@acadexa.gh";
    private static final String TEST_PASSWORD = "TestPass@123";

    @BeforeEach
    void setUp() {
        if (!userRepository.existsByEmail(TEST_EMAIL)) {
            User user = User.builder()
                    .userId("GES-ADM-9999")
                    .firstName("Test")
                    .lastName("Admin")
                    .email(TEST_EMAIL)
                    .password(passwordEncoder.encode(TEST_PASSWORD))
                    .role(UserRole.SUPER_ADMIN)
                    .isActive(true)
                    .isFirstLogin(true)
                    .build();
            userRepository.save(user);
        }
    }

    @AfterAll
    static void cleanup(@Autowired UserRepository userRepository) {
        userRepository.findByEmail(TEST_EMAIL).ifPresent(userRepository::delete);
    }

    @Test
    @Order(1)
    @DisplayName("GET /api/health returns 200 without authentication")
    void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"));
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/v1/auth/login with wrong credentials returns 401")
    void loginWithWrongCredentialsReturns401() throws Exception {
        LoginRequest request = new LoginRequest(TEST_EMAIL, "wrongpassword");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/v1/auth/login with correct credentials returns 200 with tokens")
    void loginWithCorrectCredentialsReturns200() throws Exception {
        LoginRequest request = new LoginRequest(TEST_EMAIL, TEST_PASSWORD);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").isNumber())
                .andExpect(jsonPath("$.data.user.userId").value("GES-ADM-9999"))
                .andExpect(jsonPath("$.data.user.role").value("SUPER_ADMIN"));
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/v1/admin/... without token returns 403")
    void adminEndpointWithoutTokenReturns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/v1/auth/me without token returns 403")
    void meEndpointWithoutTokenReturns403() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(6)
    @DisplayName("GET /api/v1/auth/me with valid token returns 200")
    void meEndpointWithTokenReturns200() throws Exception {
        // First login to get a token
        LoginRequest loginRequest = new LoginRequest(TEST_EMAIL, TEST_PASSWORD);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        String token = objectMapper.readTree(responseBody).at("/data/accessToken").asText();

        // Use token to access /me
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value(TEST_EMAIL))
                .andExpect(jsonPath("$.data.role").value("SUPER_ADMIN"));
    }

    @Test
    @Order(7)
    @DisplayName("GET /api/v1/students/... with ADMIN token returns 403 (wrong role)")
    void studentEndpointWithAdminTokenReturns403() throws Exception {
        LoginRequest loginRequest = new LoginRequest(TEST_EMAIL, TEST_PASSWORD);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        String token = objectMapper.readTree(responseBody).at("/data/accessToken").asText();

        // SUPER_ADMIN should NOT access student endpoints
        mockMvc.perform(get("/api/v1/students/dashboard")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(8)
    @DisplayName("POST /api/v1/auth/login with invalid email format returns 400")
    void loginWithInvalidEmailReturns400() throws Exception {
        LoginRequest request = new LoginRequest("not-an-email", "password");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
