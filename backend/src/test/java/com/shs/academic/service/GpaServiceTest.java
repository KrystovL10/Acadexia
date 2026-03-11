package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.TermType;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.repository.*;
import com.shs.academic.util.GpaCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class GpaServiceTest {

    @Mock private StudentRepository studentRepository;
    @Mock private ScoreRepository scoreRepository;
    @Mock private TermResultRepository termResultRepository;
    @Mock private CumulativeGPARepository cumulativeGPARepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private TermRepository termRepository;
    @Mock private ClassRoomRepository classRoomRepository;
    @Mock private ClassSubjectAssignmentRepository classSubjectAssignmentRepository;
    @Mock private GpaCalculator gpaCalculator;

    @InjectMocks
    private GpaService gpaService;

    private static final Long STUDENT_ID = 10L;
    private static final Long TERM_ID = 40L;
    private static final Long CLASSROOM_ID = 30L;

    private AcademicYear academicYear;
    private School school;
    private ClassRoom classRoom;
    private Student student;
    private Term term;
    private User studentUser;

    @BeforeEach
    void setUp() {
        school = School.builder().id(1L).name("Test SHS").build();
        academicYear = AcademicYear.builder().id(1L).yearLabel("2025/2026").build();

        studentUser = new User();
        studentUser.setId(100L);
        studentUser.setFirstName("Kwame");
        studentUser.setLastName("Mensah");

        classRoom = ClassRoom.builder()
                .id(CLASSROOM_ID)
                .displayName("SHS 1A")
                .classCode("S1A")
                .school(school)
                .build();

        student = new Student();
        student.setId(STUDENT_ID);
        student.setUser(studentUser);
        student.setStudentIndex("GES-STD-1001");
        student.setCurrentClass(classRoom);
        student.setCurrentYearGroup(YearGroup.SHS1);

        term = Term.builder()
                .id(TERM_ID)
                .termType(TermType.TERM_1)
                .academicYear(academicYear)
                .isScoresLocked(false)
                .build();
    }

    private Score buildScore(Long subjectId, String subjectName, double gradePoint, String grade) {
        Subject subj = new Subject();
        subj.setId(subjectId);
        subj.setName(subjectName);
        subj.setSubjectCode("S" + subjectId);

        return Score.builder()
                .id(subjectId)
                .student(student)
                .subject(subj)
                .classRoom(classRoom)
                .term(term)
                .academicYear(academicYear)
                .enteredBy(studentUser)
                .classScore(20.0)
                .examScore(60.0)
                .totalScore(80.0)
                .grade(grade)
                .gradePoint(gradePoint)
                .remarks("Excellent")
                .isAbsent(false)
                .isLocked(false)
                .build();
    }

    private ClassSubjectAssignment buildAssignment(Long subjectId, String name) {
        Subject subj = new Subject();
        subj.setId(subjectId);
        subj.setName(name);
        return ClassSubjectAssignment.builder()
                .id(subjectId)
                .classRoom(classRoom)
                .subject(subj)
                .isActive(true)
                .build();
    }

    // ==================== generateTermResult() ====================

    @Nested
    @DisplayName("generateTermResult()")
    class GenerateTermResultTests {

        @Test
        void testGenerateTermResult_success() {
            when(studentRepository.findById(STUDENT_ID)).thenReturn(Optional.of(student));
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));

            // 3 subjects assigned and all scored
            List<ClassSubjectAssignment> assignments = List.of(
                    buildAssignment(1L, "Math"),
                    buildAssignment(2L, "English"),
                    buildAssignment(3L, "Science")
            );
            when(classSubjectAssignmentRepository.findByClassRoomIdAndIsActiveTrue(CLASSROOM_ID))
                    .thenReturn(assignments);

            List<Score> scores = List.of(
                    buildScore(1L, "Math", 4.0, "A1"),
                    buildScore(2L, "English", 3.2, "B2"),
                    buildScore(3L, "Science", 2.4, "C4")
            );
            when(scoreRepository.findByStudentIdAndTermId(STUDENT_ID, TERM_ID)).thenReturn(scores);

            // Attendance
            when(attendanceRepository.countByStudentIdAndTermIdAndIsPresent(STUDENT_ID, TERM_ID, true))
                    .thenReturn(45L);
            when(attendanceRepository.countByStudentIdAndTermIdAndIsPresent(STUDENT_ID, TERM_ID, false))
                    .thenReturn(5L);

            // No existing term result
            when(termResultRepository.findByStudentIdAndTermId(STUDENT_ID, TERM_ID))
                    .thenReturn(Optional.empty());

            TermResult saved = TermResult.builder()
                    .id(1L).student(student).term(term).classRoom(classRoom)
                    .yearGroup(YearGroup.SHS1).academicYear(academicYear)
                    .gpa(3.2).totalSubjects(3).subjectsPassed(3).subjectsFailed(0)
                    .totalDaysPresent(45).totalDaysAbsent(5).attendancePercentage(90.0)
                    .isGenerated(true).build();
            when(termResultRepository.save(any(TermResult.class))).thenReturn(saved);

            // Cumulative GPA
            when(termResultRepository.findByStudentIdOrderByTermAcademicYearYearLabelAsc(STUDENT_ID))
                    .thenReturn(List.of(saved));
            when(cumulativeGPARepository.findByStudentId(STUDENT_ID)).thenReturn(Optional.empty());
            when(cumulativeGPARepository.save(any(CumulativeGPA.class)))
                    .thenReturn(CumulativeGPA.builder().build());

            TermResult result = gpaService.generateTermResult(STUDENT_ID, TERM_ID);

            assertNotNull(result);
            assertTrue(result.isGenerated());
            verify(termResultRepository).save(any(TermResult.class));
        }

        @Test
        void testGenerateTermResult_missingScores() {
            when(studentRepository.findById(STUDENT_ID)).thenReturn(Optional.of(student));
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));

            // 3 subjects assigned, only 1 scored
            List<ClassSubjectAssignment> assignments = List.of(
                    buildAssignment(1L, "Math"),
                    buildAssignment(2L, "English"),
                    buildAssignment(3L, "Science")
            );
            when(classSubjectAssignmentRepository.findByClassRoomIdAndIsActiveTrue(CLASSROOM_ID))
                    .thenReturn(assignments);

            List<Score> scores = List.of(
                    buildScore(1L, "Math", 4.0, "A1")
            );
            when(scoreRepository.findByStudentIdAndTermId(STUDENT_ID, TERM_ID)).thenReturn(scores);

            IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                    gpaService.generateTermResult(STUDENT_ID, TERM_ID));

            assertTrue(ex.getMessage().contains("Not all scores"));
            assertTrue(ex.getMessage().contains("English"));
            assertTrue(ex.getMessage().contains("Science"));
        }

        @Test
        void testGenerateTermResult_studentNotFound() {
            when(studentRepository.findById(STUDENT_ID)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () ->
                    gpaService.generateTermResult(STUDENT_ID, TERM_ID));
        }

        @Test
        void testGenerateTermResult_termNotFound() {
            when(studentRepository.findById(STUDENT_ID)).thenReturn(Optional.of(student));
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () ->
                    gpaService.generateTermResult(STUDENT_ID, TERM_ID));
        }

        @Test
        void testGenerateTermResult_studentNotInClass() {
            student.setCurrentClass(null);
            when(studentRepository.findById(STUDENT_ID)).thenReturn(Optional.of(student));
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));

            assertThrows(IllegalStateException.class, () ->
                    gpaService.generateTermResult(STUDENT_ID, TERM_ID));
        }

        @Test
        void testGenerateTermResult_updatesExisting() {
            when(studentRepository.findById(STUDENT_ID)).thenReturn(Optional.of(student));
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));

            List<ClassSubjectAssignment> assignments = List.of(
                    buildAssignment(1L, "Math")
            );
            when(classSubjectAssignmentRepository.findByClassRoomIdAndIsActiveTrue(CLASSROOM_ID))
                    .thenReturn(assignments);

            List<Score> scores = List.of(buildScore(1L, "Math", 4.0, "A1"));
            when(scoreRepository.findByStudentIdAndTermId(STUDENT_ID, TERM_ID)).thenReturn(scores);

            when(attendanceRepository.countByStudentIdAndTermIdAndIsPresent(STUDENT_ID, TERM_ID, true))
                    .thenReturn(50L);
            when(attendanceRepository.countByStudentIdAndTermIdAndIsPresent(STUDENT_ID, TERM_ID, false))
                    .thenReturn(0L);

            // Existing term result
            TermResult existing = TermResult.builder()
                    .id(99L).student(student).term(term).classRoom(classRoom)
                    .yearGroup(YearGroup.SHS1).academicYear(academicYear)
                    .gpa(3.0).isGenerated(true).build();
            when(termResultRepository.findByStudentIdAndTermId(STUDENT_ID, TERM_ID))
                    .thenReturn(Optional.of(existing));
            when(termResultRepository.save(any(TermResult.class))).thenReturn(existing);

            when(termResultRepository.findByStudentIdOrderByTermAcademicYearYearLabelAsc(STUDENT_ID))
                    .thenReturn(List.of(existing));
            when(cumulativeGPARepository.findByStudentId(STUDENT_ID)).thenReturn(Optional.empty());
            when(cumulativeGPARepository.save(any(CumulativeGPA.class)))
                    .thenReturn(CumulativeGPA.builder().build());

            TermResult result = gpaService.generateTermResult(STUDENT_ID, TERM_ID);

            // Verify save was called with the existing entity (update, not create)
            ArgumentCaptor<TermResult> captor = ArgumentCaptor.forClass(TermResult.class);
            verify(termResultRepository).save(captor.capture());
            assertEquals(99L, captor.getValue().getId());
        }

        @Test
        void testGenerateTermResult_calculatesAttendance() {
            when(studentRepository.findById(STUDENT_ID)).thenReturn(Optional.of(student));
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));

            List<ClassSubjectAssignment> assignments = List.of(buildAssignment(1L, "Math"));
            when(classSubjectAssignmentRepository.findByClassRoomIdAndIsActiveTrue(CLASSROOM_ID))
                    .thenReturn(assignments);
            when(scoreRepository.findByStudentIdAndTermId(STUDENT_ID, TERM_ID))
                    .thenReturn(List.of(buildScore(1L, "Math", 4.0, "A1")));

            when(attendanceRepository.countByStudentIdAndTermIdAndIsPresent(STUDENT_ID, TERM_ID, true))
                    .thenReturn(36L);
            when(attendanceRepository.countByStudentIdAndTermIdAndIsPresent(STUDENT_ID, TERM_ID, false))
                    .thenReturn(14L);

            when(termResultRepository.findByStudentIdAndTermId(STUDENT_ID, TERM_ID))
                    .thenReturn(Optional.empty());

            TermResult savedResult = TermResult.builder()
                    .id(1L).student(student).term(term).classRoom(classRoom)
                    .yearGroup(YearGroup.SHS1).academicYear(academicYear)
                    .totalDaysPresent(36).totalDaysAbsent(14).attendancePercentage(72.0)
                    .gpa(4.0).isGenerated(true).build();
            when(termResultRepository.save(any(TermResult.class))).thenReturn(savedResult);

            when(termResultRepository.findByStudentIdOrderByTermAcademicYearYearLabelAsc(STUDENT_ID))
                    .thenReturn(List.of(savedResult));
            when(cumulativeGPARepository.findByStudentId(STUDENT_ID)).thenReturn(Optional.empty());
            when(cumulativeGPARepository.save(any(CumulativeGPA.class)))
                    .thenReturn(CumulativeGPA.builder().build());

            gpaService.generateTermResult(STUDENT_ID, TERM_ID);

            ArgumentCaptor<TermResult> captor = ArgumentCaptor.forClass(TermResult.class);
            verify(termResultRepository).save(captor.capture());
            TermResult captured = captor.getValue();

            assertEquals(36, captured.getTotalDaysPresent());
            assertEquals(14, captured.getTotalDaysAbsent());
            assertEquals(72.0, captured.getAttendancePercentage());
        }
    }

    // ==================== generateAllTermResults() ====================

    @Nested
    @DisplayName("generateAllTermResults()")
    class GenerateAllTermResultsTests {

        @Test
        void testGenerateAllTermResults_callsPositionCalculation() {
            when(classRoomRepository.findById(CLASSROOM_ID)).thenReturn(Optional.of(classRoom));
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));

            // 2 active students
            Student s1 = createStudentWithUser(10L, "Alice");
            Student s2 = createStudentWithUser(11L, "Bob");
            when(studentRepository.findByCurrentClassId(CLASSROOM_ID)).thenReturn(List.of(s1, s2));

            // Stub full generateTermResult path for each student
            stubTermResultGeneration(s1);
            stubTermResultGeneration(s2);

            // After generation, re-fetch results
            TermResult r1 = TermResult.builder().id(1L).student(s1).gpa(3.5).classRoom(classRoom)
                    .term(term).yearGroup(YearGroup.SHS1).academicYear(academicYear)
                    .positionInClass(1).totalStudentsInClass(2).isGenerated(true).build();
            TermResult r2 = TermResult.builder().id(2L).student(s2).gpa(2.8).classRoom(classRoom)
                    .term(term).yearGroup(YearGroup.SHS1).academicYear(academicYear)
                    .positionInClass(2).totalStudentsInClass(2).isGenerated(true).build();
            when(termResultRepository.findByClassRoomIdAndTermId(CLASSROOM_ID, TERM_ID))
                    .thenReturn(List.of(r1, r2));

            List<TermResult> results = gpaService.generateAllTermResults(CLASSROOM_ID, TERM_ID);

            assertFalse(results.isEmpty());
            verify(gpaCalculator).calculateAndSavePositions(TERM_ID, school.getId());
        }

        private Student createStudentWithUser(Long id, String name) {
            User u = new User();
            u.setId(id + 100);
            u.setFirstName(name);
            u.setLastName("Test");

            Student s = new Student();
            s.setId(id);
            s.setUser(u);
            s.setStudentIndex("GES-STD-" + id);
            s.setCurrentClass(classRoom);
            s.setCurrentYearGroup(YearGroup.SHS1);
            s.setActive(true);
            return s;
        }

        private void stubTermResultGeneration(Student s) {
            lenient().when(studentRepository.findById(s.getId())).thenReturn(Optional.of(s));

            List<ClassSubjectAssignment> assignments = List.of(buildAssignment(1L, "Math"));
            lenient().when(classSubjectAssignmentRepository.findByClassRoomIdAndIsActiveTrue(CLASSROOM_ID))
                    .thenReturn(assignments);

            List<Score> scores = List.of(buildScore(1L, "Math", 3.5, "A2"));
            lenient().when(scoreRepository.findByStudentIdAndTermId(s.getId(), TERM_ID)).thenReturn(scores);

            lenient().when(attendanceRepository.countByStudentIdAndTermIdAndIsPresent(s.getId(), TERM_ID, true))
                    .thenReturn(40L);
            lenient().when(attendanceRepository.countByStudentIdAndTermIdAndIsPresent(s.getId(), TERM_ID, false))
                    .thenReturn(5L);

            lenient().when(termResultRepository.findByStudentIdAndTermId(s.getId(), TERM_ID))
                    .thenReturn(Optional.empty());

            TermResult saved = TermResult.builder()
                    .id(s.getId()).student(s).term(term).classRoom(classRoom)
                    .yearGroup(YearGroup.SHS1).academicYear(academicYear)
                    .gpa(3.5).isGenerated(true).build();
            lenient().when(termResultRepository.save(any(TermResult.class))).thenReturn(saved);

            lenient().when(termResultRepository.findByStudentIdOrderByTermAcademicYearYearLabelAsc(s.getId()))
                    .thenReturn(List.of(saved));
            lenient().when(cumulativeGPARepository.findByStudentId(s.getId())).thenReturn(Optional.empty());
            lenient().when(cumulativeGPARepository.save(any(CumulativeGPA.class)))
                    .thenReturn(CumulativeGPA.builder().build());
        }
    }
}
