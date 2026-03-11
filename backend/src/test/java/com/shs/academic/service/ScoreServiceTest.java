package com.shs.academic.service;

import com.shs.academic.exception.InvalidScoreRangeException;
import com.shs.academic.exception.ScoreLockedException;
import com.shs.academic.exception.UnauthorizedScoreAccessException;
import com.shs.academic.model.dto.BulkScoreEntryRequest;
import com.shs.academic.model.dto.BulkScoreResultDto;
import com.shs.academic.model.dto.ScoreDto;
import com.shs.academic.model.dto.ScoreEntryRequest;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.TermType;
import com.shs.academic.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class ScoreServiceTest {

    @Mock private ScoreRepository scoreRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private ClassSubjectAssignmentRepository classSubjectAssignmentRepository;
    @Mock private TermRepository termRepository;
    @Mock private UserRepository userRepository;
    @Mock private ClassRoomRepository classRoomRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private AcademicYearRepository academicYearRepository;

    @InjectMocks
    private ScoreService scoreService;

    // ── Shared test data ──
    private static final Long TUTOR_ID = 1L;
    private static final Long STUDENT_ID = 10L;
    private static final Long SUBJECT_ID = 20L;
    private static final Long CLASSROOM_ID = 30L;
    private static final Long TERM_ID = 40L;

    private User tutorUser;
    private Student student;
    private Subject subject;
    private ClassRoom classRoom;
    private Term term;
    private AcademicYear academicYear;

    @BeforeEach
    void setUp() {
        academicYear = AcademicYear.builder().id(1L).yearLabel("2025/2026").build();

        tutorUser = new User();
        tutorUser.setId(TUTOR_ID);
        tutorUser.setFirstName("John");
        tutorUser.setLastName("Doe");

        User studentUser = new User();
        studentUser.setId(100L);
        studentUser.setFirstName("Kwame");
        studentUser.setLastName("Mensah");

        classRoom = ClassRoom.builder()
                .id(CLASSROOM_ID)
                .displayName("SHS 1A")
                .classCode("S1A")
                .build();

        student = new Student();
        student.setId(STUDENT_ID);
        student.setUser(studentUser);
        student.setStudentIndex("GES-STD-1001");
        student.setCurrentClass(classRoom);

        subject = new Subject();
        subject.setId(SUBJECT_ID);
        subject.setName("Mathematics");
        subject.setSubjectCode("MATH");

        term = Term.builder()
                .id(TERM_ID)
                .termType(TermType.TERM_1)
                .academicYear(academicYear)
                .isScoresLocked(false)
                .build();
    }

    private ScoreEntryRequest buildRequest(Double classScore, Double examScore, boolean absent) {
        return ScoreEntryRequest.builder()
                .studentId(STUDENT_ID)
                .subjectId(SUBJECT_ID)
                .classRoomId(CLASSROOM_ID)
                .termId(TERM_ID)
                .classScore(classScore)
                .examScore(examScore)
                .isAbsent(absent)
                .build();
    }

    private void stubValidEntryPath() {
        when(classSubjectAssignmentRepository
                .existsByTutorIdAndClassRoomIdAndSubjectIdAndIsActiveTrue(TUTOR_ID, CLASSROOM_ID, SUBJECT_ID))
                .thenReturn(true);
        when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));
        when(studentRepository.findById(STUDENT_ID)).thenReturn(Optional.of(student));
        lenient().when(userRepository.findById(TUTOR_ID)).thenReturn(Optional.of(tutorUser));
        lenient().when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(subject));
        lenient().when(classRoomRepository.findById(CLASSROOM_ID)).thenReturn(Optional.of(classRoom));
    }

    // ==================== enterScore() ====================

    @Nested
    @DisplayName("enterScore()")
    class EnterScoreTests {

        @Test
        void testEnterScore_success() {
            stubValidEntryPath();
            ScoreEntryRequest req = buildRequest(25.0, 60.0, false);
            when(scoreRepository.findByStudentIdAndSubjectIdAndTermId(STUDENT_ID, SUBJECT_ID, TERM_ID))
                    .thenReturn(Optional.empty());

            Score saved = Score.builder()
                    .id(1L).student(student).subject(subject).classRoom(classRoom)
                    .term(term).academicYear(academicYear).enteredBy(tutorUser)
                    .classScore(25.0).examScore(60.0).totalScore(85.0)
                    .grade("A1").gradePoint(4.0).remarks("Excellent")
                    .isAbsent(false).isLocked(false).build();
            when(scoreRepository.save(any(Score.class))).thenReturn(saved);

            ScoreDto result = scoreService.enterScore(TUTOR_ID, req);

            assertNotNull(result);
            assertEquals("A1", result.getGrade());
            verify(scoreRepository).save(any(Score.class));
        }

        @Test
        void testEnterScore_termLocked() {
            term.setScoresLocked(true);
            when(classSubjectAssignmentRepository
                    .existsByTutorIdAndClassRoomIdAndSubjectIdAndIsActiveTrue(TUTOR_ID, CLASSROOM_ID, SUBJECT_ID))
                    .thenReturn(true);
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));

            ScoreEntryRequest req = buildRequest(25.0, 60.0, false);

            assertThrows(ScoreLockedException.class, () ->
                    scoreService.enterScore(TUTOR_ID, req));
        }

        @Test
        void testEnterScore_unauthorizedTutor() {
            when(classSubjectAssignmentRepository
                    .existsByTutorIdAndClassRoomIdAndSubjectIdAndIsActiveTrue(TUTOR_ID, CLASSROOM_ID, SUBJECT_ID))
                    .thenReturn(false);

            ScoreEntryRequest req = buildRequest(25.0, 60.0, false);

            assertThrows(UnauthorizedScoreAccessException.class, () ->
                    scoreService.enterScore(TUTOR_ID, req));
        }

        @Test
        void testEnterScore_classScoreTooHigh() {
            stubValidEntryPath();
            ScoreEntryRequest req = buildRequest(31.0, 60.0, false);

            assertThrows(InvalidScoreRangeException.class, () ->
                    scoreService.enterScore(TUTOR_ID, req));
        }

        @Test
        void testEnterScore_examScoreTooHigh() {
            stubValidEntryPath();
            ScoreEntryRequest req = buildRequest(25.0, 71.0, false);

            assertThrows(InvalidScoreRangeException.class, () ->
                    scoreService.enterScore(TUTOR_ID, req));
        }

        @Test
        void testEnterScore_negativeScore() {
            stubValidEntryPath();
            ScoreEntryRequest req = buildRequest(-1.0, 60.0, false);

            assertThrows(InvalidScoreRangeException.class, () ->
                    scoreService.enterScore(TUTOR_ID, req));
        }

        @Test
        void testEnterScore_updatesExisting() {
            stubValidEntryPath();
            Score existing = Score.builder()
                    .id(99L).student(student).subject(subject).classRoom(classRoom)
                    .term(term).academicYear(academicYear).enteredBy(tutorUser)
                    .classScore(10.0).examScore(30.0)
                    .isAbsent(false).isLocked(false).build();

            when(scoreRepository.findByStudentIdAndSubjectIdAndTermId(STUDENT_ID, SUBJECT_ID, TERM_ID))
                    .thenReturn(Optional.of(existing));

            Score saved = Score.builder()
                    .id(99L).student(student).subject(subject).classRoom(classRoom)
                    .term(term).academicYear(academicYear).enteredBy(tutorUser)
                    .classScore(25.0).examScore(60.0).totalScore(85.0)
                    .grade("A1").gradePoint(4.0).remarks("Excellent")
                    .isAbsent(false).isLocked(false).build();
            when(scoreRepository.save(any(Score.class))).thenReturn(saved);

            ScoreEntryRequest req = buildRequest(25.0, 60.0, false);
            ScoreDto result = scoreService.enterScore(TUTOR_ID, req);

            assertNotNull(result);
            assertEquals(99L, result.getId());
            verify(scoreRepository).save(existing);
        }

        @Test
        void testEnterScore_calculatesCorrectTotal() {
            stubValidEntryPath();
            ScoreEntryRequest req = buildRequest(25.0, 60.0, false);
            when(scoreRepository.findByStudentIdAndSubjectIdAndTermId(STUDENT_ID, SUBJECT_ID, TERM_ID))
                    .thenReturn(Optional.empty());

            Score saved = Score.builder()
                    .id(1L).student(student).subject(subject).classRoom(classRoom)
                    .term(term).academicYear(academicYear).enteredBy(tutorUser)
                    .classScore(25.0).examScore(60.0).totalScore(85.0)
                    .grade("A1").gradePoint(4.0).remarks("Excellent")
                    .isAbsent(false).isLocked(false).build();
            when(scoreRepository.save(any(Score.class))).thenReturn(saved);

            ScoreDto result = scoreService.enterScore(TUTOR_ID, req);

            assertEquals(85.0, result.getTotalScore());
            assertEquals("A1", result.getGrade());
        }

        @Test
        void testMarkAbsent_setsScoresNull() {
            stubValidEntryPath();
            ScoreEntryRequest req = buildRequest(null, null, true);
            when(scoreRepository.findByStudentIdAndSubjectIdAndTermId(STUDENT_ID, SUBJECT_ID, TERM_ID))
                    .thenReturn(Optional.empty());

            Score saved = Score.builder()
                    .id(1L).student(student).subject(subject).classRoom(classRoom)
                    .term(term).academicYear(academicYear).enteredBy(tutorUser)
                    .classScore(null).examScore(null).totalScore(null)
                    .grade(null).gradePoint(null).remarks("Absent")
                    .isAbsent(true).isLocked(false).build();
            when(scoreRepository.save(any(Score.class))).thenReturn(saved);

            ScoreDto result = scoreService.enterScore(TUTOR_ID, req);

            assertTrue(result.isAbsent());
            assertNull(result.getClassScore());
            assertNull(result.getExamScore());
            assertNull(result.getTotalScore());
        }
    }

    // ==================== enterBulkScores() ====================

    @Nested
    @DisplayName("enterBulkScores()")
    class EnterBulkScoresTests {

        @Test
        void testBulkScores_allValid() {
            when(classSubjectAssignmentRepository
                    .existsByTutorIdAndClassRoomIdAndSubjectIdAndIsActiveTrue(TUTOR_ID, CLASSROOM_ID, SUBJECT_ID))
                    .thenReturn(true);
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));
            when(userRepository.findById(TUTOR_ID)).thenReturn(Optional.of(tutorUser));
            when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(subject));
            when(classRoomRepository.findById(CLASSROOM_ID)).thenReturn(Optional.of(classRoom));

            // Create 3 students
            List<ScoreEntryRequest> entries = List.of(
                    buildStudentEntry(10L, 20.0, 50.0),
                    buildStudentEntry(11L, 25.0, 60.0),
                    buildStudentEntry(12L, 15.0, 40.0)
            );

            Student s10 = createStudent(10L);
            Student s11 = createStudent(11L);
            Student s12 = createStudent(12L);
            when(studentRepository.findById(10L)).thenReturn(Optional.of(s10));
            when(studentRepository.findById(11L)).thenReturn(Optional.of(s11));
            when(studentRepository.findById(12L)).thenReturn(Optional.of(s12));

            for (long id : List.of(10L, 11L, 12L)) {
                when(scoreRepository.findByStudentIdAndSubjectIdAndTermId(id, SUBJECT_ID, TERM_ID))
                        .thenReturn(Optional.empty());
            }

            Score saved = Score.builder()
                    .id(1L).student(s10).subject(subject)
                    .classRoom(classRoom).term(term).academicYear(academicYear)
                    .enteredBy(tutorUser).classScore(20.0)
                    .examScore(50.0).isAbsent(false).isLocked(false)
                    .build();
            when(scoreRepository.save(any(Score.class))).thenReturn(saved);

            BulkScoreEntryRequest bulkReq = BulkScoreEntryRequest.builder()
                    .subjectId(SUBJECT_ID)
                    .classRoomId(CLASSROOM_ID)
                    .termId(TERM_ID)
                    .scores(entries)
                    .build();

            BulkScoreResultDto result = scoreService.enterBulkScores(TUTOR_ID, bulkReq);

            assertEquals(3, result.getSuccessCount());
            assertEquals(0, result.getFailureCount());
            assertEquals(3, result.getTotalProcessed());
        }

        @Test
        void testBulkScores_partialFailure() {
            when(classSubjectAssignmentRepository
                    .existsByTutorIdAndClassRoomIdAndSubjectIdAndIsActiveTrue(TUTOR_ID, CLASSROOM_ID, SUBJECT_ID))
                    .thenReturn(true);
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));
            when(userRepository.findById(TUTOR_ID)).thenReturn(Optional.of(tutorUser));
            when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(subject));
            when(classRoomRepository.findById(CLASSROOM_ID)).thenReturn(Optional.of(classRoom));

            // 2 valid students
            Student s1 = createStudent(10L);
            when(studentRepository.findById(10L)).thenReturn(Optional.of(s1));
            when(scoreRepository.findByStudentIdAndSubjectIdAndTermId(10L, SUBJECT_ID, TERM_ID))
                    .thenReturn(Optional.empty());
            Score saved1 = Score.builder()
                    .id(10L).student(s1).subject(subject).classRoom(classRoom)
                    .term(term).academicYear(academicYear).enteredBy(tutorUser)
                    .classScore(20.0).examScore(50.0).isAbsent(false).isLocked(false).build();
            when(scoreRepository.save(any(Score.class))).thenReturn(saved1);

            // 1 student not found — will fail
            when(studentRepository.findById(999L)).thenReturn(Optional.empty());

            List<ScoreEntryRequest> entries = List.of(
                    buildStudentEntry(10L, 20.0, 50.0),
                    buildStudentEntry(999L, 20.0, 50.0)  // nonexistent student
            );

            BulkScoreEntryRequest bulkReq = BulkScoreEntryRequest.builder()
                    .subjectId(SUBJECT_ID)
                    .classRoomId(CLASSROOM_ID)
                    .termId(TERM_ID)
                    .scores(entries)
                    .build();

            BulkScoreResultDto result = scoreService.enterBulkScores(TUTOR_ID, bulkReq);

            assertEquals(1, result.getSuccessCount());
            assertEquals(1, result.getFailureCount());
            assertEquals(2, result.getTotalProcessed());
        }

        @Test
        void testBulkScores_returnsCorrectCounts() {
            when(classSubjectAssignmentRepository
                    .existsByTutorIdAndClassRoomIdAndSubjectIdAndIsActiveTrue(TUTOR_ID, CLASSROOM_ID, SUBJECT_ID))
                    .thenReturn(true);
            when(termRepository.findById(TERM_ID)).thenReturn(Optional.of(term));
            when(userRepository.findById(TUTOR_ID)).thenReturn(Optional.of(tutorUser));
            when(subjectRepository.findById(SUBJECT_ID)).thenReturn(Optional.of(subject));
            when(classRoomRepository.findById(CLASSROOM_ID)).thenReturn(Optional.of(classRoom));

            // 3 valid, 2 invalid
            Student s1 = createStudent(10L);
            Student s2 = createStudent(11L);
            Student s3 = createStudent(12L);
            when(studentRepository.findById(10L)).thenReturn(Optional.of(s1));
            when(studentRepository.findById(11L)).thenReturn(Optional.of(s2));
            when(studentRepository.findById(12L)).thenReturn(Optional.of(s3));
            when(studentRepository.findById(998L)).thenReturn(Optional.empty());
            when(studentRepository.findById(999L)).thenReturn(Optional.empty());

            for (long id : List.of(10L, 11L, 12L)) {
                when(scoreRepository.findByStudentIdAndSubjectIdAndTermId(id, SUBJECT_ID, TERM_ID))
                        .thenReturn(Optional.empty());
            }

            Score saved = Score.builder()
                    .id(1L).student(s1).subject(subject).classRoom(classRoom)
                    .term(term).academicYear(academicYear).enteredBy(tutorUser)
                    .classScore(20.0).examScore(50.0).isAbsent(false).isLocked(false).build();
            when(scoreRepository.save(any(Score.class))).thenReturn(saved);

            List<ScoreEntryRequest> entries = List.of(
                    buildStudentEntry(10L, 20.0, 50.0),
                    buildStudentEntry(11L, 25.0, 55.0),
                    buildStudentEntry(12L, 15.0, 45.0),
                    buildStudentEntry(998L, 20.0, 50.0),
                    buildStudentEntry(999L, 20.0, 50.0)
            );

            BulkScoreEntryRequest bulkReq = BulkScoreEntryRequest.builder()
                    .subjectId(SUBJECT_ID)
                    .classRoomId(CLASSROOM_ID)
                    .termId(TERM_ID)
                    .scores(entries)
                    .build();

            BulkScoreResultDto result = scoreService.enterBulkScores(TUTOR_ID, bulkReq);

            assertEquals(3, result.getSuccessCount());
            assertEquals(2, result.getFailureCount());
            assertEquals(5, result.getTotalProcessed());
        }

        // ── Helpers ──

        private ScoreEntryRequest buildStudentEntry(Long studentId, Double classScore, Double examScore) {
            return ScoreEntryRequest.builder()
                    .studentId(studentId)
                    .subjectId(SUBJECT_ID)
                    .classRoomId(CLASSROOM_ID)
                    .termId(TERM_ID)
                    .classScore(classScore)
                    .examScore(examScore)
                    .isAbsent(false)
                    .build();
        }

        private Student createStudent(Long id) {
            User u = new User();
            u.setId(id + 100);
            u.setFirstName("Student");
            u.setLastName("" + id);

            ClassRoom cr = ClassRoom.builder()
                    .id(CLASSROOM_ID).displayName("SHS 1A").classCode("S1A").build();

            Student s = new Student();
            s.setId(id);
            s.setUser(u);
            s.setStudentIndex("GES-STD-" + id);
            s.setCurrentClass(cr);
            return s;
        }
    }
}
