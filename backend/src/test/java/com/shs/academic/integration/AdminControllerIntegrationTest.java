package com.shs.academic.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shs.academic.model.dto.CreateStudentRequest;
import com.shs.academic.model.dto.CreateTeacherRequest;
import com.shs.academic.model.dto.auth.LoginRequest;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.*;
import com.shs.academic.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AdminControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private ProgramRepository programRepository;
    @Autowired private TeacherRepository teacherRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final String ADMIN_EMAIL = "admin-inttest@acadexa.gh";
    private static final String ADMIN_PASSWORD = "AdminTest@123";
    private static final String TEACHER_EMAIL_PREFIX = "teacher-inttest";
    private static final String STUDENT_EMAIL_PREFIX = "student-inttest";

    private static Long schoolId;
    private static Long programId;

    @BeforeEach
    void setUp() {
        // Create admin user if not exists
        if (!userRepository.existsByEmail(ADMIN_EMAIL)) {
            userRepository.save(User.builder()
                    .userId("GES-ADM-7001")
                    .firstName("Admin")
                    .lastName("IntTest")
                    .email(ADMIN_EMAIL)
                    .password(passwordEncoder.encode(ADMIN_PASSWORD))
                    .role(UserRole.SUPER_ADMIN)
                    .isActive(true)
                    .isFirstLogin(false)
                    .build());
        }

        // Get seeded school and program IDs (created by AdminSeeder/DataSeeder)
        if (schoolId == null) {
            schoolId = schoolRepository.findAll().stream()
                    .findFirst().map(School::getId).orElse(null);
        }
        if (programId == null) {
            programId = programRepository.findAll().stream()
                    .findFirst().map(Program::getId).orElse(null);
        }
    }

    // ── Helper ──

    private String loginAsAdmin() throws Exception {
        LoginRequest req = new LoginRequest(ADMIN_EMAIL, ADMIN_PASSWORD);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .at("/data/accessToken").asText();
    }

    // ==================== Teacher CRUD Tests ====================

    @Test
    @Order(1)
    @DisplayName("POST /admin/users/teachers - create teacher with valid data succeeds")
    void createTeacher_validData_returns201() throws Exception {
        assertNotNull(schoolId, "Seeded school must exist");
        String token = loginAsAdmin();

        CreateTeacherRequest request = CreateTeacherRequest.builder()
                .firstName("John")
                .lastName("Mensah")
                .email(TEACHER_EMAIL_PREFIX + "-1@acadexa.gh")
                .staffId("STAFF-INT-001")
                .schoolId(schoolId)
                .department("Science")
                .qualification("BSc Chemistry")
                .build();

        mockMvc.perform(post("/api/v1/admin/users/teachers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.firstName").value("John"))
                .andExpect(jsonPath("$.data.lastName").value("Mensah"))
                .andExpect(jsonPath("$.data.staffId").isNotEmpty());
    }

    @Test
    @Order(2)
    @DisplayName("POST /admin/users/teachers - duplicate email returns 409")
    void createTeacher_duplicateEmail_returns409() throws Exception {
        String token = loginAsAdmin();

        CreateTeacherRequest request = CreateTeacherRequest.builder()
                .firstName("Duplicate")
                .lastName("Teacher")
                .email(TEACHER_EMAIL_PREFIX + "-1@acadexa.gh")
                .staffId("STAFF-INT-DUP")
                .schoolId(schoolId)
                .build();

        mockMvc.perform(post("/api/v1/admin/users/teachers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @Order(3)
    @DisplayName("POST /admin/users/teachers - missing required fields returns 400")
    void createTeacher_missingFields_returns400() throws Exception {
        String token = loginAsAdmin();

        // Missing firstName, staffId, schoolId
        String invalidJson = "{\"lastName\":\"Test\",\"email\":\"incomplete@test.gh\"}";

        mockMvc.perform(post("/api/v1/admin/users/teachers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(4)
    @DisplayName("GET /admin/users/teachers - list teachers returns paginated results")
    void getTeachers_returnsPaginated() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/v1/admin/users/teachers")
                        .header("Authorization", "Bearer " + token)
                        .param("schoolId", String.valueOf(schoolId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @Order(5)
    @DisplayName("GET /admin/users/teachers/{id} - get teacher by ID returns teacher details")
    void getTeacherById_returns200() throws Exception {
        String token = loginAsAdmin();

        Teacher teacher = teacherRepository.findAll().stream().findFirst().orElse(null);
        assertNotNull(teacher, "At least one teacher should exist");

        mockMvc.perform(get("/api/v1/admin/users/teachers/" + teacher.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.staffId").isNotEmpty());
    }

    @Test
    @Order(6)
    @DisplayName("PATCH /admin/users/teachers/{id}/deactivate - deactivate teacher")
    void deactivateTeacher_succeeds() throws Exception {
        String token = loginAsAdmin();

        Teacher teacher = teacherRepository.findAll().stream().findFirst().orElse(null);
        assertNotNull(teacher);

        mockMvc.perform(patch("/api/v1/admin/users/teachers/" + teacher.getId() + "/deactivate")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(7)
    @DisplayName("PATCH /admin/users/teachers/{id}/reactivate - reactivate teacher")
    void reactivateTeacher_succeeds() throws Exception {
        String token = loginAsAdmin();

        Teacher teacher = teacherRepository.findAll().stream().findFirst().orElse(null);
        assertNotNull(teacher);

        mockMvc.perform(patch("/api/v1/admin/users/teachers/" + teacher.getId() + "/reactivate")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ==================== Student CRUD Tests ====================

    @Test
    @Order(10)
    @DisplayName("POST /admin/users/students - create student with valid data succeeds")
    void createStudent_validData_returnsCreated() throws Exception {
        assertNotNull(schoolId, "Seeded school must exist");
        assertNotNull(programId, "Seeded program must exist");
        String token = loginAsAdmin();

        CreateStudentRequest request = CreateStudentRequest.builder()
                .firstName("Kwame")
                .lastName("Asante")
                .email(STUDENT_EMAIL_PREFIX + "-1@acadexa.gh")
                .studentIndex("SHS-INT-001")
                .dateOfBirth(LocalDate.of(2006, 5, 15))
                .gender("Male")
                .yearGroup(YearGroup.SHS1)
                .schoolId(schoolId)
                .programId(programId)
                .build();

        mockMvc.perform(post("/api/v1/admin/users/students")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.firstName").value("Kwame"))
                .andExpect(jsonPath("$.data.studentIndex").value("SHS-INT-001"));
    }

    @Test
    @Order(11)
    @DisplayName("POST /admin/users/students - duplicate student index returns 409")
    void createStudent_duplicateIndex_returns409() throws Exception {
        String token = loginAsAdmin();

        CreateStudentRequest request = CreateStudentRequest.builder()
                .firstName("Duplicate")
                .lastName("Student")
                .email(STUDENT_EMAIL_PREFIX + "-dup@acadexa.gh")
                .studentIndex("SHS-INT-001")
                .dateOfBirth(LocalDate.of(2006, 1, 1))
                .gender("Female")
                .yearGroup(YearGroup.SHS1)
                .schoolId(schoolId)
                .programId(programId)
                .build();

        mockMvc.perform(post("/api/v1/admin/users/students")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @Order(12)
    @DisplayName("POST /admin/users/students - future date of birth returns 400")
    void createStudent_futureDob_returns400() throws Exception {
        String token = loginAsAdmin();

        CreateStudentRequest request = CreateStudentRequest.builder()
                .firstName("Future")
                .lastName("Student")
                .email(STUDENT_EMAIL_PREFIX + "-future@acadexa.gh")
                .studentIndex("SHS-INT-FUT")
                .dateOfBirth(LocalDate.of(2030, 1, 1))
                .gender("Male")
                .yearGroup(YearGroup.SHS1)
                .schoolId(schoolId)
                .programId(programId)
                .build();

        mockMvc.perform(post("/api/v1/admin/users/students")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(13)
    @DisplayName("GET /admin/users/students - list students returns paginated results")
    void getStudents_returnsPaginated() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/v1/admin/users/students")
                        .header("Authorization", "Bearer " + token)
                        .param("schoolId", String.valueOf(schoolId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @Order(14)
    @DisplayName("GET /admin/users/students/{id} - get student by ID returns student details")
    void getStudentById_returns200() throws Exception {
        String token = loginAsAdmin();

        Student student = studentRepository.findAll().stream().findFirst().orElse(null);
        assertNotNull(student, "At least one student should exist");

        mockMvc.perform(get("/api/v1/admin/users/students/" + student.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.studentIndex").isNotEmpty());
    }

    // ==================== Access Control Tests ====================

    @Test
    @Order(20)
    @DisplayName("Admin endpoints without token return 403")
    void adminEndpoints_noToken_return403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users/teachers"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/users/students"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(21)
    @DisplayName("Admin endpoints with non-admin role return 403")
    void adminEndpoints_wrongRole_return403() throws Exception {
        // Create a student user and try to access admin endpoints
        String studentEmail = "student-role-test@acadexa.gh";
        if (!userRepository.existsByEmail(studentEmail)) {
            userRepository.save(User.builder()
                    .userId("GES-STD-7001")
                    .firstName("Student")
                    .lastName("NoAccess")
                    .email(studentEmail)
                    .password(passwordEncoder.encode("StudentPass@123"))
                    .role(UserRole.STUDENT)
                    .isActive(true)
                    .isFirstLogin(false)
                    .build());
        }

        LoginRequest loginReq = new LoginRequest(studentEmail, "StudentPass@123");
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String studentToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .at("/data/accessToken").asText();

        mockMvc.perform(get("/api/v1/admin/users/teachers")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    // ==================== Academic Management Tests ====================

    @Test
    @Order(30)
    @DisplayName("GET /admin/my-context returns admin context with school info")
    void getAdminContext_returnsSchoolInfo() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/v1/admin/my-context")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(31)
    @DisplayName("GET /admin/subjects returns list of subjects")
    void getSubjects_returnsList() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/v1/admin/subjects")
                        .header("Authorization", "Bearer " + token)
                        .param("schoolId", String.valueOf(schoolId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @Order(32)
    @DisplayName("GET /admin/programs returns list of programs")
    void getPrograms_returnsList() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/v1/admin/programs")
                        .header("Authorization", "Bearer " + token)
                        .param("schoolId", String.valueOf(schoolId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @Order(33)
    @DisplayName("GET /admin/classrooms returns list of classrooms")
    void getClassrooms_returnsList() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/v1/admin/classrooms")
                        .header("Authorization", "Bearer " + token)
                        .param("schoolId", String.valueOf(schoolId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @Order(34)
    @DisplayName("GET /admin/academic-years returns academic years")
    void getAcademicYears_returnsList() throws Exception {
        String token = loginAsAdmin();

        mockMvc.perform(get("/api/v1/admin/academic-years")
                        .header("Authorization", "Bearer " + token)
                        .param("schoolId", String.valueOf(schoolId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }
}
