package com.shs.academic.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ScoreControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private AcademicYearRepository academicYearRepository;
    @Autowired private TermRepository termRepository;
    @Autowired private ProgramRepository programRepository;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private ClassRoomRepository classRoomRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private TeacherRepository teacherRepository;
    @Autowired private ClassSubjectAssignmentRepository classSubjectAssignmentRepository;
    @Autowired private ScoreRepository scoreRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final String TUTOR_EMAIL = "tutor-score-inttest@acadexa.gh";
    private static final String TUTOR_PASSWORD = "TutorTest@123";

    private static Long tutorUserId;
    private static Long classRoomId;
    private static Long subjectId;
    private static Long termId;
    private static Long studentId;
    private static Long academicYearId;
    private static boolean dataSetUp = false;

    @BeforeEach
    void setUp() {
        if (dataSetUp) return;

        // Get seeded school
        School school = schoolRepository.findAll().stream().findFirst().orElse(null);
        if (school == null) return;

        // Get seeded academic year and term
        AcademicYear year = academicYearRepository.findAll().stream()
                .filter(AcademicYear::isCurrent).findFirst().orElse(null);
        if (year == null) return;
        academicYearId = year.getId();

        Term term = termRepository.findAll().stream()
                .filter(Term::isCurrent).findFirst().orElse(null);
        if (term == null) return;
        termId = term.getId();

        // Get seeded program and subject
        Program program = programRepository.findAll().stream().findFirst().orElse(null);
        if (program == null) return;

        Subject subject = subjectRepository.findAll().stream().findFirst().orElse(null);
        if (subject == null) return;
        subjectId = subject.getId();

        // Create classroom
        ClassRoom classRoom = classRoomRepository.save(ClassRoom.builder()
                .school(school)
                .academicYear(year)
                .program(program)
                .classCode("SCR-INT-01")
                .displayName("Science 1 (Int Test)")
                .yearGroup(YearGroup.SHS1)
                .capacity(45)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
        classRoomId = classRoom.getId();

        // Create tutor user
        if (!userRepository.existsByEmail(TUTOR_EMAIL)) {
            User tutorUser = userRepository.save(User.builder()
                    .userId("GES-TUT-6001")
                    .firstName("Tutor")
                    .lastName("ScoreTest")
                    .email(TUTOR_EMAIL)
                    .password(passwordEncoder.encode(TUTOR_PASSWORD))
                    .role(UserRole.TUTOR)
                    .isActive(true)
                    .isFirstLogin(false)
                    .build());
            tutorUserId = tutorUser.getId();

            // Create teacher record
            teacherRepository.save(Teacher.builder()
                    .user(tutorUser)
                    .school(school)
                    .staffId("STAFF-SCR-001")
                    .isClassTeacher(false)
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .build());

            // Assign tutor to class+subject
            classSubjectAssignmentRepository.save(ClassSubjectAssignment.builder()
                    .classRoom(classRoom)
                    .subject(subject)
                    .tutor(tutorUser)
                    .academicYear(year)
                    .isActive(true)
                    .build());
        } else {
            tutorUserId = userRepository.findByEmail(TUTOR_EMAIL).map(User::getId).orElse(null);
        }

        // Create student in that class
        String studentEmail = "student-score-inttest@acadexa.gh";
        if (!userRepository.existsByEmail(studentEmail)) {
            User studentUser = userRepository.save(User.builder()
                    .userId("GES-STD-6001")
                    .firstName("Student")
                    .lastName("ScoreTest")
                    .email(studentEmail)
                    .password(passwordEncoder.encode("Student@123"))
                    .role(UserRole.STUDENT)
                    .isActive(true)
                    .isFirstLogin(false)
                    .build());

            Student student = studentRepository.save(Student.builder()
                    .user(studentUser)
                    .school(school)
                    .currentProgram(program)
                    .currentClass(classRoom)
                    .studentIndex("SCR-STD-001")
                    .currentYearGroup(YearGroup.SHS1)
                    .dateOfBirth(LocalDate.of(2006, 3, 15))
                    .gender("Male")
                    .nationality("Ghanaian")
                    .isActive(true)
                    .hasGraduated(false)
                    .createdAt(LocalDateTime.now())
                    .build());
            studentId = student.getId();
        } else {
            studentId = studentRepository.findAll().stream()
                    .filter(s -> s.getUser().getEmail().equals(studentEmail))
                    .findFirst().map(Student::getId).orElse(null);
        }

        dataSetUp = true;
    }

    // ── Helper ──

    private String loginAsTutor() throws Exception {
        LoginRequest req = new LoginRequest(TUTOR_EMAIL, TUTOR_PASSWORD);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .at("/data/accessToken").asText();
    }

    // ==================== Tutor Assignment Tests ====================

    @Test
    @Order(1)
    @DisplayName("GET /tutor/assignments returns tutor's class-subject assignments")
    void getAssignments_returnsList() throws Exception {
        String token = loginAsTutor();

        mockMvc.perform(get("/api/tutor/assignments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(2)
    @DisplayName("GET /tutor/assignments/subjects returns assigned subjects")
    void getAssignedSubjects_returnsList() throws Exception {
        String token = loginAsTutor();

        mockMvc.perform(get("/api/tutor/assignments/subjects")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ==================== Score Entry Tests ====================

    @Test
    @Order(3)
    @DisplayName("POST /tutor/scores - enter valid score succeeds")
    void enterScore_validData_succeeds() throws Exception {
        String token = loginAsTutor();

        String scoreJson = String.format("""
                {
                    "studentId": %d,
                    "subjectId": %d,
                    "classRoomId": %d,
                    "termId": %d,
                    "classScore": 25.0,
                    "examScore": 60.0
                }
                """, studentId, subjectId, classRoomId, termId);

        mockMvc.perform(post("/api/tutor/scores")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scoreJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(4)
    @DisplayName("POST /tutor/scores - re-entering score for same student+subject+term upserts (updates)")
    void enterScore_existingScore_upserts() throws Exception {
        String token = loginAsTutor();

        // The service upserts: if score exists, it updates instead of rejecting
        String scoreJson = String.format("""
                {
                    "studentId": %d,
                    "subjectId": %d,
                    "classRoomId": %d,
                    "termId": %d,
                    "classScore": 20.0,
                    "examScore": 50.0
                }
                """, studentId, subjectId, classRoomId, termId);

        mockMvc.perform(post("/api/tutor/scores")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scoreJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(5)
    @DisplayName("POST /tutor/scores - class score > 30 returns 400")
    void enterScore_classScoreOver30_returns400() throws Exception {
        String token = loginAsTutor();

        // Use a different student to avoid duplicate constraint
        String studentEmail2 = "student-score-inttest2@acadexa.gh";
        if (!userRepository.existsByEmail(studentEmail2)) {
            School school = schoolRepository.findAll().stream().findFirst().orElse(null);
            Program program = programRepository.findAll().stream().findFirst().orElse(null);
            ClassRoom classRoom = classRoomRepository.findById(classRoomId).orElse(null);

            User studentUser2 = userRepository.save(User.builder()
                    .userId("GES-STD-6002")
                    .firstName("Student2")
                    .lastName("ScoreTest")
                    .email(studentEmail2)
                    .password(passwordEncoder.encode("Student@123"))
                    .role(UserRole.STUDENT)
                    .isActive(true)
                    .isFirstLogin(false)
                    .build());

            Student student2 = studentRepository.save(Student.builder()
                    .user(studentUser2)
                    .school(school)
                    .currentProgram(program)
                    .currentClass(classRoom)
                    .studentIndex("SCR-STD-002")
                    .currentYearGroup(YearGroup.SHS1)
                    .dateOfBirth(LocalDate.of(2006, 6, 20))
                    .gender("Female")
                    .nationality("Ghanaian")
                    .isActive(true)
                    .hasGraduated(false)
                    .createdAt(LocalDateTime.now())
                    .build());

            String scoreJson = String.format("""
                    {
                        "studentId": %d,
                        "subjectId": %d,
                        "classRoomId": %d,
                        "termId": %d,
                        "classScore": 35.0,
                        "examScore": 50.0
                    }
                    """, student2.getId(), subjectId, classRoomId, termId);

            mockMvc.perform(post("/api/tutor/scores")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(scoreJson))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    @Order(6)
    @DisplayName("POST /tutor/scores - exam score > 70 returns 400")
    void enterScore_examScoreOver70_returns400() throws Exception {
        String token = loginAsTutor();

        // Find the second student
        Student student2 = studentRepository.findAll().stream()
                .filter(s -> s.getStudentIndex().equals("SCR-STD-002"))
                .findFirst().orElse(null);
        if (student2 == null) return;

        String scoreJson = String.format("""
                {
                    "studentId": %d,
                    "subjectId": %d,
                    "classRoomId": %d,
                    "termId": %d,
                    "classScore": 20.0,
                    "examScore": 75.0
                }
                """, student2.getId(), subjectId, classRoomId, termId);

        mockMvc.perform(post("/api/tutor/scores")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scoreJson))
                .andExpect(status().isBadRequest());
    }

    // ==================== Score Update Tests ====================

    @Test
    @Order(7)
    @DisplayName("PUT /tutor/scores/{id} - update existing score succeeds")
    void updateScore_validData_succeeds() throws Exception {
        String token = loginAsTutor();

        Score score = scoreRepository.findAll().stream().findFirst().orElse(null);
        if (score == null) return;

        String updateJson = """
                {
                    "classScore": 28.0,
                    "examScore": 65.0
                }
                """;

        mockMvc.perform(put("/api/tutor/scores/" + score.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ==================== Score Sheet Tests ====================

    @Test
    @Order(8)
    @DisplayName("GET /tutor/scores/sheet returns score sheet for assigned class")
    void getScoreSheet_returnsData() throws Exception {
        String token = loginAsTutor();

        mockMvc.perform(get("/api/tutor/scores/sheet")
                        .header("Authorization", "Bearer " + token)
                        .param("classRoomId", String.valueOf(classRoomId))
                        .param("subjectId", String.valueOf(subjectId))
                        .param("termId", String.valueOf(termId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @Order(9)
    @DisplayName("GET /tutor/scores/completion returns completion stats")
    void getCompletion_returnsStats() throws Exception {
        String token = loginAsTutor();

        mockMvc.perform(get("/api/tutor/scores/completion")
                        .header("Authorization", "Bearer " + token)
                        .param("classRoomId", String.valueOf(classRoomId))
                        .param("subjectId", String.valueOf(subjectId))
                        .param("termId", String.valueOf(termId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ==================== Mark Absent Tests ====================

    @Test
    @Order(10)
    @DisplayName("PATCH /tutor/scores/mark-absent marks student as absent")
    void markAbsent_succeeds() throws Exception {
        String token = loginAsTutor();

        // Create another student + subject combination for absent marking
        School school = schoolRepository.findAll().stream().findFirst().orElse(null);
        Subject subject2 = subjectRepository.findAll().stream()
                .filter(s -> !s.getId().equals(subjectId))
                .findFirst().orElse(null);

        if (subject2 == null || school == null) return;

        AcademicYear year = academicYearRepository.findById(academicYearId).orElse(null);
        User tutorUser = userRepository.findByEmail(TUTOR_EMAIL).orElse(null);

        // Assign tutor to the second subject
        classSubjectAssignmentRepository.save(ClassSubjectAssignment.builder()
                .classRoom(classRoomRepository.findById(classRoomId).orElse(null))
                .subject(subject2)
                .tutor(tutorUser)
                .academicYear(year)
                .isActive(true)
                .build());

        String absentJson = String.format("""
                {
                    "studentId": %d,
                    "subjectId": %d,
                    "classRoomId": %d,
                    "termId": %d
                }
                """, studentId, subject2.getId(), classRoomId, termId);

        mockMvc.perform(patch("/api/tutor/scores/mark-absent")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(absentJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ==================== Access Control Tests ====================

    @Test
    @Order(20)
    @DisplayName("Tutor endpoints without token return 403")
    void tutorEndpoints_noToken_returns403() throws Exception {
        mockMvc.perform(get("/api/tutor/assignments"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(21)
    @DisplayName("Student role cannot access tutor endpoints")
    void tutorEndpoints_studentRole_returns403() throws Exception {
        // Login as a student
        String studentEmail = "student-score-inttest@acadexa.gh";
        LoginRequest req = new LoginRequest(studentEmail, "Student@123");
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String studentToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .at("/data/accessToken").asText();

        mockMvc.perform(get("/api/tutor/assignments")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }
}
