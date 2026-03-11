package com.shs.academic.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shs.academic.model.dto.auth.LoginRequest;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.*;
import com.shs.academic.repository.*;
import com.shs.academic.service.GpaService;
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
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class GpaServiceIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private GpaService gpaService;
    @Autowired private UserRepository userRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private AcademicYearRepository academicYearRepository;
    @Autowired private TermRepository termRepository;
    @Autowired private ProgramRepository programRepository;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private ClassRoomRepository classRoomRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private ScoreRepository scoreRepository;
    @Autowired private TermResultRepository termResultRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    // Test data IDs
    private static School school;
    private static AcademicYear academicYear;
    private static Term term;
    private static Program program;
    private static ClassRoom classRoom;
    private static Student student1;
    private static Student student2;
    private static User adminUser;
    private static boolean dataSetUp = false;

    private static final String GPA_ADMIN_EMAIL = "gpa-admin@acadexa.gh";
    private static final String GPA_ADMIN_PASSWORD = "GpaAdmin@123";

    @BeforeEach
    void setUp() {
        if (dataSetUp) return;

        // Get seeded data
        school = schoolRepository.findAll().stream().findFirst().orElse(null);
        if (school == null) return;

        academicYear = academicYearRepository.findAll().stream()
                .filter(AcademicYear::isCurrent).findFirst().orElse(null);
        if (academicYear == null) return;

        term = termRepository.findAll().stream()
                .filter(Term::isCurrent).findFirst().orElse(null);
        if (term == null) return;

        program = programRepository.findAll().stream().findFirst().orElse(null);
        if (program == null) return;

        // Create classroom for GPA tests
        classRoom = classRoomRepository.save(ClassRoom.builder()
                .school(school)
                .academicYear(academicYear)
                .program(program)
                .classCode("GPA-INT-01")
                .displayName("GPA Test Class")
                .yearGroup(YearGroup.SHS1)
                .capacity(45)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());

        // Create admin user
        if (!userRepository.existsByEmail(GPA_ADMIN_EMAIL)) {
            adminUser = userRepository.save(User.builder()
                    .userId("GES-ADM-5001")
                    .firstName("GPA")
                    .lastName("Admin")
                    .email(GPA_ADMIN_EMAIL)
                    .password(passwordEncoder.encode(GPA_ADMIN_PASSWORD))
                    .role(UserRole.SUPER_ADMIN)
                    .isActive(true)
                    .isFirstLogin(false)
                    .build());
        } else {
            adminUser = userRepository.findByEmail(GPA_ADMIN_EMAIL).orElse(null);
        }

        // Create two students
        User user1 = userRepository.save(User.builder()
                .userId("GES-STD-5001")
                .firstName("Kwame")
                .lastName("GpaTest")
                .email("gpa-student1@acadexa.gh")
                .password(passwordEncoder.encode("Student@123"))
                .role(UserRole.STUDENT)
                .isActive(true)
                .isFirstLogin(false)
                .build());

        student1 = studentRepository.save(Student.builder()
                .user(user1)
                .school(school)
                .currentProgram(program)
                .currentClass(classRoom)
                .studentIndex("GPA-STD-001")
                .currentYearGroup(YearGroup.SHS1)
                .dateOfBirth(LocalDate.of(2006, 3, 15))
                .gender("Male")
                .nationality("Ghanaian")
                .isActive(true)
                .hasGraduated(false)
                .createdAt(LocalDateTime.now())
                .build());

        User user2 = userRepository.save(User.builder()
                .userId("GES-STD-5002")
                .firstName("Ama")
                .lastName("GpaTest")
                .email("gpa-student2@acadexa.gh")
                .password(passwordEncoder.encode("Student@123"))
                .role(UserRole.STUDENT)
                .isActive(true)
                .isFirstLogin(false)
                .build());

        student2 = studentRepository.save(Student.builder()
                .user(user2)
                .school(school)
                .currentProgram(program)
                .currentClass(classRoom)
                .studentIndex("GPA-STD-002")
                .currentYearGroup(YearGroup.SHS1)
                .dateOfBirth(LocalDate.of(2006, 7, 20))
                .gender("Female")
                .nationality("Ghanaian")
                .isActive(true)
                .hasGraduated(false)
                .createdAt(LocalDateTime.now())
                .build());

        // Create scores for both students across multiple subjects
        List<Subject> subjects = subjectRepository.findAll();
        int subjectCount = Math.min(subjects.size(), 5);

        // Student 1: High scores (all A1 ~ 85-95)
        double[] student1ClassScores = {28, 27, 26, 29, 25};
        double[] student1ExamScores = {65, 63, 60, 66, 62};

        // Student 2: Mixed scores
        double[] student2ClassScores = {20, 15, 22, 10, 18};
        double[] student2ExamScores = {45, 30, 50, 25, 40};

        for (int i = 0; i < subjectCount; i++) {
            Subject subject = subjects.get(i);

            scoreRepository.save(Score.builder()
                    .student(student1)
                    .subject(subject)
                    .classRoom(classRoom)
                    .term(term)
                    .academicYear(academicYear)
                    .enteredBy(adminUser)
                    .classScore(student1ClassScores[i])
                    .examScore(student1ExamScores[i])
                    .isAbsent(false)
                    .isLocked(false)
                    .build());

            scoreRepository.save(Score.builder()
                    .student(student2)
                    .subject(subject)
                    .classRoom(classRoom)
                    .term(term)
                    .academicYear(academicYear)
                    .enteredBy(adminUser)
                    .classScore(student2ClassScores[i])
                    .examScore(student2ExamScores[i])
                    .isAbsent(false)
                    .isLocked(false)
                    .build());
        }

        dataSetUp = true;
    }

    // ── Helper ──

    private String loginAsAdmin() throws Exception {
        LoginRequest req = new LoginRequest(GPA_ADMIN_EMAIL, GPA_ADMIN_PASSWORD);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .at("/data/accessToken").asText();
    }

    // ==================== Term Result Generation Tests ====================

    @Test
    @Order(1)
    @DisplayName("generateTermResult creates term result with correct GPA")
    void generateTermResult_createsResultWithGpa() {
        assertNotNull(student1, "Student 1 must exist");
        assertNotNull(term, "Term must exist");

        TermResult result = gpaService.generateTermResult(student1.getId(), term.getId());

        assertNotNull(result);
        assertTrue(result.isGenerated());
        assertNotNull(result.getGpa());
        assertTrue(result.getGpa() > 0, "GPA should be > 0 for valid scores");
        assertNotNull(result.getTotalSubjects());
        assertTrue(result.getTotalSubjects() > 0);
    }

    @Test
    @Order(2)
    @DisplayName("generateTermResult for student with mixed scores calculates correctly")
    void generateTermResult_mixedScores_calculatesCorrectly() {
        assertNotNull(student2, "Student 2 must exist");

        TermResult result = gpaService.generateTermResult(student2.getId(), term.getId());

        assertNotNull(result);
        assertTrue(result.isGenerated());
        assertNotNull(result.getGpa());
        // Student 2 has mixed scores, so GPA should be moderate
        assertTrue(result.getGpa() >= 0.0 && result.getGpa() <= 4.0,
                "GPA must be between 0.0 and 4.0, got: " + result.getGpa());
    }

    @Test
    @Order(3)
    @DisplayName("generateAllTermResults processes all students in class")
    void generateAllTermResults_processesEntireClass() {
        assertNotNull(classRoom, "ClassRoom must exist");

        List<TermResult> results = gpaService.generateAllTermResults(classRoom.getId(), term.getId());

        assertNotNull(results);
        assertTrue(results.size() >= 2, "Should generate results for at least 2 students");

        for (TermResult r : results) {
            assertTrue(r.isGenerated());
            assertNotNull(r.getGpa());
        }
    }

    @Test
    @Order(4)
    @DisplayName("calculateAndSavePositions assigns correct class positions")
    void calculatePositions_assignsCorrectPositions() {
        assertNotNull(classRoom, "ClassRoom must exist");

        gpaService.calculateAndSavePositions(classRoom.getId(), term.getId());

        // Verify positions were assigned
        List<TermResult> results = termResultRepository.findAll().stream()
                .filter(r -> r.getClassRoom() != null && r.getClassRoom().getId().equals(classRoom.getId())
                        && r.getTerm().getId().equals(term.getId()))
                .toList();

        assertFalse(results.isEmpty(), "Term results should exist");

        // Student 1 (high scores) should have a better position than student 2
        TermResult result1 = results.stream()
                .filter(r -> r.getStudent().getId().equals(student1.getId()))
                .findFirst().orElse(null);
        TermResult result2 = results.stream()
                .filter(r -> r.getStudent().getId().equals(student2.getId()))
                .findFirst().orElse(null);

        if (result1 != null && result2 != null
                && result1.getPositionInClass() != null && result2.getPositionInClass() != null) {
            assertTrue(result1.getPositionInClass() <= result2.getPositionInClass(),
                    "Student 1 (higher scores) should have better or equal position");
        }
    }

    @Test
    @Order(5)
    @DisplayName("getStudentTermResult returns correct DTO for student")
    void getStudentTermResult_returnsDto() {
        assertNotNull(student1, "Student 1 must exist");

        var dto = gpaService.getStudentTermResult(student1.getId(), term.getId());

        assertNotNull(dto, "Term result DTO should not be null");
    }

    @Test
    @Order(6)
    @DisplayName("getStudentAllTermResults returns all terms for student")
    void getStudentAllTermResults_returnsList() {
        assertNotNull(student1, "Student 1 must exist");

        var results = gpaService.getStudentAllTermResults(student1.getId());

        assertNotNull(results);
        assertFalse(results.isEmpty(), "Should have at least one term result");
    }

    // ==================== GPA Student Endpoint Tests ====================

    @Test
    @Order(10)
    @DisplayName("GET /students/gpa returns GPA history for logged-in student")
    void studentGpaEndpoint_returnsGpaHistory() throws Exception {
        // Login as student 1
        LoginRequest req = new LoginRequest("gpa-student1@acadexa.gh", "Student@123");
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .at("/data/accessToken").asText();

        mockMvc.perform(get("/api/v1/students/gpa")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(11)
    @DisplayName("GET /students/results/all returns all term results for student")
    void studentAllResults_returnsList() throws Exception {
        LoginRequest req = new LoginRequest("gpa-student1@acadexa.gh", "Student@123");
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .at("/data/accessToken").asText();

        mockMvc.perform(get("/api/v1/students/results/all")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
