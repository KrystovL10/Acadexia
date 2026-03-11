package com.shs.academic.service;

import com.shs.academic.exception.InvalidScoreRangeException;
import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.exception.ScoreLockedException;
import com.shs.academic.exception.UnauthorizedScoreAccessException;
import com.shs.academic.model.dto.*;
import com.shs.academic.model.entity.*;
import com.shs.academic.repository.*;
import com.shs.academic.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScoreService {

    private final ScoreRepository scoreRepository;
    private final StudentRepository studentRepository;
    private final ClassSubjectAssignmentRepository classSubjectAssignmentRepository;
    private final TermRepository termRepository;
    private final UserRepository userRepository;
    private final ClassRoomRepository classRoomRepository;
    private final SubjectRepository subjectRepository;
    private final AcademicYearRepository academicYearRepository;
    private final AuditLogService auditLogService;

    // ==================== CACHE EVICTION ====================

    /**
     * Call after any score create/update/delete to invalidate cached statistics.
     */
    @Caching(evict = {
            @CacheEvict(value = "dashboardStats", allEntries = true),
            @CacheEvict(value = "termComparison", allEntries = true),
            @CacheEvict(value = "gradeDistribution", allEntries = true),
            @CacheEvict(value = "classPerformance", allEntries = true),
            @CacheEvict(value = "subjectWeakness", allEntries = true),
            @CacheEvict(value = "powerRanking", allEntries = true)
    })
    public void evictStatsCaches() {
        // Cache eviction handled by annotations
    }

    // ==================== VALIDATION HELPERS ====================

    private void validateTutorAssignment(Long tutorId, Long classRoomId, Long subjectId) {
        if (!classSubjectAssignmentRepository
                .existsByTutorIdAndClassRoomIdAndSubjectIdAndIsActiveTrue(tutorId, classRoomId, subjectId)) {
            throw new UnauthorizedScoreAccessException(
                    "You are not assigned to teach this subject in this class");
        }
    }

    private Term validateTermNotLocked(Long termId) {
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));
        if (term.isScoresLocked()) {
            throw new ScoreLockedException(
                    "Score entry is closed. This term has been locked by the administrator.");
        }
        return term;
    }

    private Student validateStudentInClass(Long studentId, Long classRoomId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));
        if (student.getCurrentClass() == null
                || !student.getCurrentClass().getId().equals(classRoomId)) {
            throw new ResourceNotFoundException(
                    "Student", "classRoomId", classRoomId + " (student not in this class)");
        }
        return student;
    }

    private void validateScoreRanges(Double classScore, Double examScore, boolean isAbsent) {
        if (isAbsent) return;
        if (classScore != null && (classScore < 0.0 || classScore > 30.0)) {
            throw new InvalidScoreRangeException("Class score must be between 0.0 and 30.0");
        }
        if (examScore != null && (examScore < 0.0 || examScore > 70.0)) {
            throw new InvalidScoreRangeException("Exam score must be between 0.0 and 70.0");
        }
    }

    private String buildTermLabel(Term term) {
        String num = term.getTermType().name().replace("TERM_", "");
        return "Term " + num + " - " + term.getAcademicYear().getYearLabel();
    }

    // ==================== SCORE ENTRY ====================

    @Transactional
    public ScoreDto enterScore(Long tutorId, ScoreEntryRequest request) {
        validateTutorAssignment(tutorId, request.getClassRoomId(), request.getSubjectId());
        Term term = validateTermNotLocked(request.getTermId());
        Student student = validateStudentInClass(request.getStudentId(), request.getClassRoomId());
        validateScoreRanges(request.getClassScore(), request.getExamScore(), request.isAbsent());

        User tutor = userRepository.findById(tutorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", tutorId));
        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", request.getSubjectId()));
        ClassRoom classRoom = classRoomRepository.findById(request.getClassRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", request.getClassRoomId()));

        Optional<Score> existing = scoreRepository.findByStudentIdAndSubjectIdAndTermId(
                request.getStudentId(), request.getSubjectId(), request.getTermId());

        Score score;
        if (existing.isPresent()) {
            score = existing.get();
            score.setClassScore(request.isAbsent() ? null : request.getClassScore());
            score.setExamScore(request.isAbsent() ? null : request.getExamScore());
            score.setAbsent(request.isAbsent());
            score.setEnteredBy(tutor);
        } else {
            score = Score.builder()
                    .student(student)
                    .subject(subject)
                    .classRoom(classRoom)
                    .term(term)
                    .academicYear(term.getAcademicYear())
                    .enteredBy(tutor)
                    .classScore(request.isAbsent() ? null : request.getClassScore())
                    .examScore(request.isAbsent() ? null : request.getExamScore())
                    .isAbsent(request.isAbsent())
                    .build();
        }
        score = scoreRepository.save(score);
        evictStatsCaches();

        log.info("Score entered by tutor {} for student {} subject {} term {}",
                tutorId, request.getStudentId(), request.getSubjectId(), request.getTermId());

        auditLogService.logAction("SCORE_ENTERED", SecurityUtil.getCurrentUserId(), "SCORE", score.getId(), "Score entered for student " + request.getStudentId() + " in subject " + request.getSubjectId());

        return ScoreDto.fromEntity(score);
    }

    @Transactional
    public BulkScoreResultDto enterBulkScores(Long tutorId, BulkScoreEntryRequest request) {
        validateTutorAssignment(tutorId, request.getClassRoomId(), request.getSubjectId());
        Term term = validateTermNotLocked(request.getTermId());

        User tutor = userRepository.findById(tutorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", tutorId));
        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", request.getSubjectId()));
        ClassRoom classRoom = classRoomRepository.findById(request.getClassRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", request.getClassRoomId()));

        List<ScoreDto> saved = new ArrayList<>();
        List<BulkScoreResultDto.ScoreEntryError> errors = new ArrayList<>();

        for (ScoreEntryRequest entry : request.getScores()) {
            try {
                Student student = validateStudentInClass(entry.getStudentId(), request.getClassRoomId());
                validateScoreRanges(entry.getClassScore(), entry.getExamScore(), entry.isAbsent());

                Optional<Score> existing = scoreRepository.findByStudentIdAndSubjectIdAndTermId(
                        entry.getStudentId(), request.getSubjectId(), request.getTermId());

                Score score;
                if (existing.isPresent()) {
                    score = existing.get();
                    score.setClassScore(entry.isAbsent() ? null : entry.getClassScore());
                    score.setExamScore(entry.isAbsent() ? null : entry.getExamScore());
                    score.setAbsent(entry.isAbsent());
                    score.setEnteredBy(tutor);
                } else {
                    score = Score.builder()
                            .student(student)
                            .subject(subject)
                            .classRoom(classRoom)
                            .term(term)
                            .academicYear(term.getAcademicYear())
                            .enteredBy(tutor)
                            .classScore(entry.isAbsent() ? null : entry.getClassScore())
                            .examScore(entry.isAbsent() ? null : entry.getExamScore())
                            .isAbsent(entry.isAbsent())
                            .build();
                }
                saved.add(ScoreDto.fromEntity(scoreRepository.save(score)));

            } catch (Exception e) {
                errors.add(BulkScoreResultDto.ScoreEntryError.builder()
                        .studentId(entry.getStudentId())
                        .studentName(resolveStudentName(entry.getStudentId()))
                        .errorMessage(e.getMessage())
                        .build());
                log.warn("Bulk score error for student {}: {}", entry.getStudentId(), e.getMessage());
            }
        }

        if (!saved.isEmpty()) evictStatsCaches();

        log.info("Bulk score entry by tutor {}: {}/{} saved",
                tutorId, saved.size(), request.getScores().size());
        return BulkScoreResultDto.builder()
                .successCount(saved.size())
                .failureCount(errors.size())
                .totalProcessed(request.getScores().size())
                .saved(saved)
                .errors(errors)
                .message(String.format("Processed %d scores: %d saved, %d failed",
                        request.getScores().size(), saved.size(), errors.size()))
                .build();
    }

    @Transactional
    public ScoreDto updateScore(Long tutorId, Long scoreId, ScoreUpdateRequest request) {
        Score score = scoreRepository.findById(scoreId)
                .orElseThrow(() -> new ResourceNotFoundException("Score", "id", scoreId));
        if (!score.getEnteredBy().getId().equals(tutorId)) {
            throw new UnauthorizedScoreAccessException("You can only update scores you have entered");
        }
        validateTermNotLocked(score.getTerm().getId());
        validateScoreRanges(request.getClassScore(), request.getExamScore(), false);

        score.setClassScore(request.getClassScore());
        score.setExamScore(request.getExamScore());
        score = scoreRepository.save(score);
        evictStatsCaches();

        log.info("Score {} updated by tutor {}", scoreId, tutorId);
        return ScoreDto.fromEntity(score);
    }

    // ==================== SCORE RETRIEVAL ====================

    @Transactional(readOnly = true)
    public TutorScoreSheetDto getScoreSheet(Long tutorId, Long classRoomId, Long subjectId, Long termId) {
        validateTutorAssignment(tutorId, classRoomId, subjectId);
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", subjectId));
        return buildScoreSheet(classRoom, subject, term);
    }

    /** Shared score-sheet builder used by both tutor and admin endpoints. */
    private TutorScoreSheetDto buildScoreSheet(ClassRoom classRoom, Subject subject, Term term) {
        List<Student> students = studentRepository.findByCurrentClassId(classRoom.getId());

        Map<Long, Score> scoreMap = scoreRepository
                .findByClassSubjectAndTerm(classRoom.getId(), subject.getId(), term.getId())
                .stream()
                .collect(Collectors.toMap(s -> s.getStudent().getId(), s -> s));

        List<TutorScoreSheetDto.StudentScoreRow> rows = students.stream()
                .map(student -> {
                    Score score = scoreMap.get(student.getId());
                    boolean submitted = score != null;
                    return TutorScoreSheetDto.StudentScoreRow.builder()
                            .studentId(student.getId())
                            .studentIndex(student.getStudentIndex())
                            .fullName(student.getUser().getFullName())
                            .classScore(submitted ? score.getClassScore() : null)
                            .examScore(submitted ? score.getExamScore() : null)
                            .total(submitted ? score.getTotalScore() : null)
                            .grade(submitted ? score.getGrade() : null)
                            .gradePoint(submitted ? score.getGradePoint() : null)
                            .remarks(submitted ? score.getRemarks() : null)
                            .isSubmitted(submitted)
                            .isAbsent(submitted && score.isAbsent())
                            .build();
                })
                .collect(Collectors.toList());

        int total = rows.size();
        int submitted = (int) rows.stream().filter(TutorScoreSheetDto.StudentScoreRow::isSubmitted).count();
        int pending = total - submitted;
        double percentage = total > 0
                ? Math.round(submitted * 100.0 / total * 10.0) / 10.0 : 0.0;

        return TutorScoreSheetDto.builder()
                .subjectId(subject.getId())
                .subjectName(subject.getName())
                .subjectCode(subject.getSubjectCode())
                .classRoomId(classRoom.getId())
                .className(classRoom.getDisplayName())
                .termId(term.getId())
                .termLabel(buildTermLabel(term))
                .isLocked(term.isScoresLocked())
                .students(rows)
                .completionStats(TutorScoreSheetDto.CompletionStats.builder()
                        .total(total)
                        .submitted(submitted)
                        .pending(pending)
                        .percentage(percentage)
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public List<TutorAssignmentDto> getTutorAssignments(Long tutorId, Long termId) {
        final Long resolvedTermId;
        if (termId == null) {
            Long current = resolveCurrentTermIdForTutor(tutorId);
            if (current == null) return List.of();
            resolvedTermId = current;
        } else {
            resolvedTermId = termId;
        }
        Term term = termRepository.findById(resolvedTermId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", resolvedTermId));
        Long academicYearId = term.getAcademicYear().getId();

        List<ClassSubjectAssignment> assignments =
                classSubjectAssignmentRepository.findByTutorIdAndAcademicYearId(tutorId, academicYearId);

        return assignments.stream()
                .filter(ClassSubjectAssignment::isActive)
                .map(assignment -> {
                    Long cId = assignment.getClassRoom().getId();
                    Long sId = assignment.getSubject().getId();
                    int studentsCount = studentRepository.findByCurrentClassId(cId).size();
                    long scoresSubmitted = scoreRepository.countSubmittedScores(cId, sId, resolvedTermId);
                    long remaining = Math.max(0, studentsCount - scoresSubmitted);
                    double completion = studentsCount > 0
                            ? Math.round(scoresSubmitted * 100.0 / studentsCount * 10.0) / 10.0
                            : 0.0;

                    return TutorAssignmentDto.builder()
                            .classRoomId(cId)
                            .className(assignment.getClassRoom().getDisplayName())
                            .subjectId(sId)
                            .subjectName(assignment.getSubject().getName())
                            .yearGroup(assignment.getClassRoom().getYearGroup())
                            .programName(assignment.getClassRoom().getProgram().getDisplayName())
                            .termId(resolvedTermId)
                            .termLabel(buildTermLabel(term))
                            .studentsCount(studentsCount)
                            .scoresSubmitted(scoresSubmitted)
                            .scoresRemaining(remaining)
                            .completionPercentage(completion)
                            .isTermLocked(term.isScoresLocked())
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ==================== ADDITIONAL TUTOR ENDPOINTS ====================

    /** All subjects this tutor currently teaches (across all active assignments). */
    @Transactional(readOnly = true)
    public List<SubjectDto> getTutorSubjects(Long tutorId) {
        List<ClassSubjectAssignment> assignments =
                classSubjectAssignmentRepository.findByTutorIdAndIsActiveTrue(tutorId);
        return assignments.stream()
                .collect(Collectors.toMap(
                        a -> a.getSubject().getId(),
                        ClassSubjectAssignment::getSubject,
                        (a, b) -> a))
                .values().stream()
                .map(SubjectDto::fromEntity)
                .collect(Collectors.toList());
    }

    /** Mark a student as absent for a subject/term. Creates or updates the score record. */
    @Transactional
    public ScoreDto markAbsent(Long tutorId, MarkAbsentRequest request) {
        ScoreEntryRequest entry = ScoreEntryRequest.builder()
                .studentId(request.getStudentId())
                .subjectId(request.getSubjectId())
                .classRoomId(request.getClassRoomId())
                .termId(request.getTermId())
                .isAbsent(true)
                .classScore(null)
                .examScore(null)
                .build();
        return enterScore(tutorId, entry);
    }

    /** Completion statistics for one subject in a class for a term, including list of pending students. */
    @Transactional(readOnly = true)
    public ScoreCompletionDto getScoreCompletion(Long tutorId, Long classRoomId,
            Long subjectId, Long termId) {
        validateTutorAssignment(tutorId, classRoomId, subjectId);

        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", subjectId));

        List<Student> allStudents = studentRepository.findByCurrentClassId(classRoomId);
        List<Score> submitted = scoreRepository.findByClassSubjectAndTerm(classRoomId, subjectId, termId);
        java.util.Set<Long> submittedIds = submitted.stream()
                .map(s -> s.getStudent().getId())
                .collect(java.util.stream.Collectors.toSet());

        List<StudentSummaryDto> pending = allStudents.stream()
                .filter(s -> !submittedIds.contains(s.getId()))
                .map(StudentSummaryDto::fromEntity)
                .collect(Collectors.toList());

        int total = allStudents.size();
        int submittedCount = submitted.size();
        int pendingCount = pending.size();
        double pct = total > 0 ? Math.round(submittedCount * 100.0 / total * 10.0) / 10.0 : 0.0;

        return ScoreCompletionDto.builder()
                .classRoomId(classRoom.getId())
                .className(classRoom.getDisplayName())
                .subjectId(subject.getId())
                .subjectName(subject.getName())
                .termId(term.getId())
                .termLabel(buildTermLabel(term))
                .totalStudents(total)
                .submitted(submittedCount)
                .pending(pendingCount)
                .completionPercentage(pct)
                .isLocked(term.isScoresLocked())
                .pendingStudents(pending)
                .build();
    }

    /**
     * Resolve the current term for a given tutor by looking up their school via active assignments.
     * Returns null if no assignments found.
     */
    public Long resolveCurrentTermIdForTutor(Long tutorId) {
        List<ClassSubjectAssignment> assignments =
                classSubjectAssignmentRepository.findByTutorIdAndIsActiveTrue(tutorId);
        if (assignments.isEmpty()) return null;
        Long schoolId = assignments.get(0).getClassRoom().getSchool().getId();
        return academicYearRepository.findBySchoolIdAndIsCurrentTrue(schoolId)
                .flatMap(year -> termRepository.findByAcademicYearIdAndIsCurrentTrue(year.getId()))
                .map(Term::getId)
                .orElse(null);
    }

    // ==================== ADMIN SCORE OPERATIONS ====================

    /** Admin view of any class score sheet — no tutor assignment check. */
    @Transactional(readOnly = true)
    public TutorScoreSheetDto adminGetScoreSheet(Long classRoomId, Long subjectId, Long termId) {
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", subjectId));
        return buildScoreSheet(classRoom, subject, term);
    }

    /**
     * Admin can override any score even if the term is locked.
     * The enteredBy field is updated to the admin performing the override.
     */
    @Transactional
    public ScoreDto adminUpdateScore(Long adminId, Long scoreId, ScoreUpdateRequest request) {
        Score score = scoreRepository.findById(scoreId)
                .orElseThrow(() -> new ResourceNotFoundException("Score", "id", scoreId));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", adminId));

        validateScoreRanges(request.getClassScore(), request.getExamScore(), false);

        score.setClassScore(request.getClassScore());
        score.setExamScore(request.getExamScore());
        score.setEnteredBy(admin);
        score = scoreRepository.save(score);
        evictStatsCaches();

        log.info("Admin {} overrode score {} (term may be locked)", adminId, scoreId);
        return ScoreDto.fromEntity(score);
    }

    /** Hard-delete a score record. Admin only. */
    @Transactional
    public void adminDeleteScore(Long scoreId) {
        Score score = scoreRepository.findById(scoreId)
                .orElseThrow(() -> new ResourceNotFoundException("Score", "id", scoreId));
        scoreRepository.delete(score);
        evictStatsCaches();
        log.info("Admin deleted score {}", scoreId);
    }

    /**
     * For a class + term, return all subjects that have students with missing scores,
     * grouped by subject and showing the responsible tutor.
     */
    @Transactional(readOnly = true)
    public ScoreCompletionStatusDto getMissingScores(Long classRoomId, Long termId) {
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        List<Student> allStudents = studentRepository.findByCurrentClassId(classRoomId);
        List<ClassSubjectAssignment> assignments =
                classSubjectAssignmentRepository.findByClassRoomIdAndIsActiveTrue(classRoomId);

        List<ScoreCompletionStatusDto.SubjectCompletionDto> subjectStats = assignments.stream()
                .map(assignment -> {
                    Long sId = assignment.getSubject().getId();
                    List<Score> scores = scoreRepository.findByClassSubjectAndTerm(
                            classRoomId, sId, termId);
                    java.util.Set<Long> scoredIds = scores.stream()
                            .map(s -> s.getStudent().getId())
                            .collect(java.util.stream.Collectors.toSet());

                    List<StudentSummaryDto> missing = allStudents.stream()
                            .filter(s -> !scoredIds.contains(s.getId()))
                            .map(StudentSummaryDto::fromEntity)
                            .collect(Collectors.toList());

                    String tutorName = assignment.getTutor().getFullName();

                    return ScoreCompletionStatusDto.SubjectCompletionDto.builder()
                            .subjectId(sId)
                            .subjectName(assignment.getSubject().getName())
                            .tutorName(tutorName)
                            .studentsWithScores(scores.size())
                            .studentsWithoutScores(missing.size())
                            .missingStudents(missing)
                            .build();
                })
                .filter(s -> s.getStudentsWithoutScores() > 0)
                .collect(Collectors.toList());

        int totalStudents = allStudents.size();
        int totalSubjects = assignments.size();
        long totalSubmitted = subjectStats.stream()
                .mapToLong(ScoreCompletionStatusDto.SubjectCompletionDto::getStudentsWithScores).sum();
        long totalPossible = (long) totalStudents * totalSubjects;
        double overallPct = totalPossible > 0
                ? Math.round(totalSubmitted * 100.0 / totalPossible * 10.0) / 10.0 : 0.0;

        return ScoreCompletionStatusDto.builder()
                .classRoomId(classRoomId)
                .className(classRoom.getDisplayName())
                .termId(termId)
                .termName(buildTermLabel(term))
                .totalStudents(totalStudents)
                .totalSubjects(totalSubjects)
                .overallCompletionPercentage(overallPct)
                .allComplete(subjectStats.isEmpty())
                .subjects(subjectStats)
                .build();
    }

    // ==================== EXCEL IMPORT / EXPORT ====================

    @Transactional
    public BulkScoreResultDto importScoresFromExcel(Long tutorId, Long classRoomId,
            Long subjectId, Long termId, MultipartFile file) {
        validateTutorAssignment(tutorId, classRoomId, subjectId);
        validateTermNotLocked(termId);

        List<ScoreEntryRequest> entries = new ArrayList<>();
        List<BulkScoreResultDto.ScoreEntryError> parseErrors = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            // Auto-detect layout: new template has header "Student Index" in col B row 5,
            // old template has it in col A row 2. Check row 4 (index 4) first.
            int dataStartRow;
            int indexCol;
            int classScoreCol;
            int examScoreCol;

            Row testRow = sheet.getRow(4);
            boolean isNewLayout = testRow != null
                    && "Student Index".equalsIgnoreCase(getCellStringValue(testRow.getCell(1)).trim());

            if (isNewLayout) {
                // New template: rows 0-4 = title/meta/warning/spacer/header, data starts row 5
                // Col B(1)=index, Col D(3)=classScore, Col E(4)=examScore
                dataStartRow = 5;
                indexCol = 1;
                classScoreCol = 3;
                examScoreCol = 4;
            } else {
                // Legacy template: row 0=title, row 1=header, data starts row 2
                // Col A(0)=index, Col B(1)=name, Col C(2)=classScore, Col D(3)=examScore
                dataStartRow = 2;
                indexCol = 0;
                classScoreCol = 2;
                examScoreCol = 3;
            }

            for (int i = dataStartRow; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                Cell indexCell = row.getCell(indexCol);
                if (indexCell == null || getCellStringValue(indexCell).isBlank()) continue;

                String studentIndex = getCellStringValue(indexCell).trim();
                try {
                    Student student = studentRepository.findByStudentIndex(studentIndex)
                            .orElseThrow(() -> new ResourceNotFoundException(
                                    "Student", "index", studentIndex));

                    Double classScore = getNumericCellValue(row.getCell(classScoreCol));
                    Double examScore = getNumericCellValue(row.getCell(examScoreCol));

                    // If both scores are blank, treat as absent
                    boolean isAbsent = (classScore == null && examScore == null);

                    // Legacy: check explicit absent column (col 4 in old layout)
                    if (!isNewLayout && !isAbsent) {
                        Cell absCell = row.getCell(4);
                        if (absCell != null
                                && "true".equalsIgnoreCase(getCellStringValue(absCell).trim())) {
                            isAbsent = true;
                            classScore = null;
                            examScore = null;
                        }
                    }

                    entries.add(ScoreEntryRequest.builder()
                            .studentId(student.getId())
                            .subjectId(subjectId)
                            .classRoomId(classRoomId)
                            .termId(termId)
                            .classScore(classScore)
                            .examScore(examScore)
                            .isAbsent(isAbsent)
                            .build());

                } catch (Exception e) {
                    parseErrors.add(BulkScoreResultDto.ScoreEntryError.builder()
                            .studentId(null)
                            .studentName(studentIndex)
                            .errorMessage("Row " + (i + 1) + ": " + e.getMessage())
                            .build());
                }
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to parse Excel file: " + e.getMessage());
        }

        if (entries.isEmpty()) {
            int parseFailCount = parseErrors.size();
            return BulkScoreResultDto.builder()
                    .successCount(0)
                    .failureCount(parseFailCount)
                    .totalProcessed(parseFailCount)
                    .saved(List.of())
                    .errors(parseErrors)
                    .message("No valid entries found in the file")
                    .build();
        }

        BulkScoreEntryRequest bulkRequest = BulkScoreEntryRequest.builder()
                .subjectId(subjectId)
                .classRoomId(classRoomId)
                .termId(termId)
                .scores(entries)
                .build();
        BulkScoreResultDto result = enterBulkScores(tutorId, bulkRequest);

        if (!parseErrors.isEmpty()) {
            List<BulkScoreResultDto.ScoreEntryError> allErrors = new ArrayList<>(result.getErrors());
            allErrors.addAll(parseErrors);
            return BulkScoreResultDto.builder()
                    .successCount(result.getSuccessCount())
                    .failureCount(result.getFailureCount() + parseErrors.size())
                    .totalProcessed(result.getTotalProcessed() + parseErrors.size())
                    .saved(result.getSaved())
                    .errors(allErrors)
                    .message(result.getMessage())
                    .build();
        }
        return result;
    }

    public byte[] generateScoreSheetTemplate(Long classRoomId, Long subjectId, Long termId) {
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", subjectId));
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        List<Student> students = studentRepository.findByCurrentClassId(classRoomId);
        // Sort alphabetically by last name
        students.sort(Comparator.comparing(s -> {
            String name = s.getUser().getFullName();
            String[] parts = name.trim().split("\\s+");
            return parts[parts.length - 1].toLowerCase();
        }));

        // Resolve tutor name
        String tutorName = classSubjectAssignmentRepository
                .findByClassRoomIdAndIsActiveTrue(classRoomId)
                .stream()
                .filter(a -> a.getSubject().getId().equals(subjectId))
                .findFirst()
                .map(a -> a.getTutor().getFullName())
                .orElse("N/A");

        String schoolName = classRoom.getSchool() != null
                ? classRoom.getSchool().getName() : "Ghana Education Service";

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {

            // ═══════════════════════════════════════════════
            //  STYLES
            // ═══════════════════════════════════════════════

            byte[] greenRgb  = {0x1B, 0x6B, 0x3A};
            byte[] greyRgb   = {(byte) 0xF5, (byte) 0xF5, (byte) 0xF5};
            byte[] yellowRgb = {(byte) 0xFF, (byte) 0xFD, (byte) 0xE7};
            byte[] blueRgb   = {(byte) 0xE3, (byte) 0xF2, (byte) 0xFD};
            byte[] amberRgb  = {(byte) 0xFF, (byte) 0xF3, (byte) 0xCD};
            byte[] statsGreenRgb = {(byte) 0xE8, (byte) 0xF5, (byte) 0xE9};

            // — Title style (row 1)
            XSSFCellStyle titleStyle = workbook.createCellStyle();
            XSSFFont titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleFont.setColor(new XSSFColor(greenRgb, null));
            titleStyle.setFont(titleFont);

            // — Subtitle style (row 2)
            XSSFCellStyle subTitleStyle = workbook.createCellStyle();
            XSSFFont subFont = workbook.createFont();
            subFont.setFontHeightInPoints((short) 10);
            subFont.setColor(new XSSFColor(new byte[]{(byte) 0x75, (byte) 0x75, (byte) 0x75}, null));
            subTitleStyle.setFont(subFont);

            // — Warning style (row 3)
            XSSFCellStyle warningStyle = workbook.createCellStyle();
            warningStyle.setFillForegroundColor(new XSSFColor(amberRgb, null));
            warningStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont warningFont = workbook.createFont();
            warningFont.setBold(true);
            warningFont.setFontHeightInPoints((short) 9);
            warningStyle.setFont(warningFont);
            warningStyle.setWrapText(true);

            // — Header style (row 5)
            XSSFCellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(new XSSFColor(greenRgb, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setWrapText(true);
            applyBorders(headerStyle);
            headerStyle.setLocked(true);

            // — Student info style (read-only cols A-C)
            XSSFCellStyle studentInfoStyle = workbook.createCellStyle();
            studentInfoStyle.setFillForegroundColor(new XSSFColor(greyRgb, null));
            studentInfoStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont infoFont = workbook.createFont();
            infoFont.setBold(true);
            infoFont.setFontHeightInPoints((short) 10);
            studentInfoStyle.setFont(infoFont);
            applyBorders(studentInfoStyle);
            studentInfoStyle.setLocked(true);

            // — Row number style (col A, read-only)
            XSSFCellStyle rowNumStyle = workbook.createCellStyle();
            rowNumStyle.setFillForegroundColor(new XSSFColor(greyRgb, null));
            rowNumStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont rowNumFont = workbook.createFont();
            rowNumFont.setFontHeightInPoints((short) 10);
            rowNumStyle.setFont(rowNumFont);
            rowNumStyle.setAlignment(HorizontalAlignment.CENTER);
            applyBorders(rowNumStyle);
            rowNumStyle.setLocked(true);

            // — Score entry style (editable cols D-E)
            XSSFCellStyle scoreEntryStyle = workbook.createCellStyle();
            scoreEntryStyle.setFillForegroundColor(new XSSFColor(yellowRgb, null));
            scoreEntryStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont entryFont = workbook.createFont();
            entryFont.setFontHeightInPoints((short) 10);
            scoreEntryStyle.setFont(entryFont);
            applyBorders(scoreEntryStyle);
            scoreEntryStyle.setLocked(false);  // ← editable

            // — Total/formula style (locked cols F-H)
            XSSFCellStyle totalStyle = workbook.createCellStyle();
            totalStyle.setFillForegroundColor(new XSSFColor(blueRgb, null));
            totalStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont totalFont = workbook.createFont();
            totalFont.setBold(true);
            totalFont.setFontHeightInPoints((short) 10);
            totalStyle.setFont(totalFont);
            totalStyle.setAlignment(HorizontalAlignment.CENTER);
            applyBorders(totalStyle);
            totalStyle.setLocked(true);

            // — Stats label style
            XSSFCellStyle statsLabelStyle = workbook.createCellStyle();
            statsLabelStyle.setFillForegroundColor(new XSSFColor(statsGreenRgb, null));
            statsLabelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont statsFont = workbook.createFont();
            statsFont.setBold(true);
            statsFont.setFontHeightInPoints((short) 10);
            statsFont.setColor(new XSSFColor(greenRgb, null));
            statsLabelStyle.setFont(statsFont);
            applyBorders(statsLabelStyle);

            // — Stats value style
            XSSFCellStyle statsValueStyle = workbook.createCellStyle();
            statsValueStyle.setFillForegroundColor(new XSSFColor(statsGreenRgb, null));
            statsValueStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            XSSFFont statsValFont = workbook.createFont();
            statsValFont.setBold(true);
            statsValFont.setFontHeightInPoints((short) 10);
            statsValueStyle.setFont(statsValFont);
            statsValueStyle.setAlignment(HorizontalAlignment.CENTER);
            applyBorders(statsValueStyle);
            // Format with 1 decimal
            statsValueStyle.setDataFormat(workbook.createDataFormat().getFormat("0.0"));

            // ═══════════════════════════════════════════════
            //  SHEET 1 — SCORE ENTRY
            // ═══════════════════════════════════════════════

            XSSFSheet sheet = workbook.createSheet("Score Entry");

            // Column widths (in units of 1/256th of a character)
            sheet.setColumnWidth(0, 5 * 256);   // A: #
            sheet.setColumnWidth(1, 18 * 256);  // B: Index
            sheet.setColumnWidth(2, 28 * 256);  // C: Name
            sheet.setColumnWidth(3, 18 * 256);  // D: Class Score
            sheet.setColumnWidth(4, 18 * 256);  // E: Exam Score
            sheet.setColumnWidth(5, 14 * 256);  // F: Total
            sheet.setColumnWidth(6, 10 * 256);  // G: Grade
            sheet.setColumnWidth(7, 16 * 256);  // H: Remarks

            // — Row 0 (index 0): Document title
            Row row0 = sheet.createRow(0);
            row0.setHeightInPoints(24);
            Cell titleCell = row0.createCell(0);
            titleCell.setCellValue(schoolName + " \u2014 Score Entry Sheet");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 7));

            // — Row 1 (index 1): Metadata
            Row row1 = sheet.createRow(1);
            row1.setHeightInPoints(18);
            Cell metaCell = row1.createCell(0);
            metaCell.setCellValue(String.format("Class: %s  |  Subject: %s  |  Term: %s  |  Tutor: %s",
                    classRoom.getDisplayName(), subject.getName(), buildTermLabel(term), tutorName));
            metaCell.setCellStyle(subTitleStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 7));

            // — Row 2 (index 2): Warning / instructions
            Row row2 = sheet.createRow(2);
            row2.setHeightInPoints(28);
            Cell warnCell = row2.createCell(0);
            warnCell.setCellValue("\u26A0 Fill ONLY the Class Score (max 30) and Exam Score (max 70) columns. Do NOT modify any other cells.");
            warnCell.setCellStyle(warningStyle);
            sheet.addMergedRegion(new CellRangeAddress(2, 2, 0, 7));

            // — Row 3 (index 3): Blank spacer
            sheet.createRow(3);

            // — Row 4 (index 4): Column headers
            Row headerRow = sheet.createRow(4);
            headerRow.setHeightInPoints(30);
            String[] headers = {"#", "Student Index", "Student Name", "Class Score\n(Max: 30)",
                    "Exam Score\n(Max: 70)", "Total Score", "Grade", "Remarks"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // — Data rows (starting at index 5)
            int dataStartRow = 5;  // 0-based row index
            int studentCount = students.size();
            for (int idx = 0; idx < studentCount; idx++) {
                Student student = students.get(idx);
                int r = dataStartRow + idx;  // current row index
                int excelRow = r + 1;        // 1-based for formulas
                Row dataRow = sheet.createRow(r);

                // Col A: Row number
                Cell numCell = dataRow.createCell(0);
                numCell.setCellValue(idx + 1);
                numCell.setCellStyle(rowNumStyle);

                // Col B: Student Index (locked)
                Cell idxCell = dataRow.createCell(1);
                idxCell.setCellValue(student.getStudentIndex());
                idxCell.setCellStyle(studentInfoStyle);

                // Col C: Student Name (locked)
                Cell nameCell = dataRow.createCell(2);
                nameCell.setCellValue(student.getUser().getFullName());
                nameCell.setCellStyle(studentInfoStyle);

                // Col D: Class Score (editable, yellow)
                Cell csCell = dataRow.createCell(3);
                csCell.setCellStyle(scoreEntryStyle);

                // Col E: Exam Score (editable, yellow)
                Cell esCell = dataRow.createCell(4);
                esCell.setCellStyle(scoreEntryStyle);

                // Col F: Total Score formula (locked, blue)
                Cell totCell = dataRow.createCell(5);
                totCell.setCellFormula(String.format(
                        "IF(AND(ISNUMBER(D%d),ISNUMBER(E%d)),D%d+E%d,\"\")",
                        excelRow, excelRow, excelRow, excelRow));
                totCell.setCellStyle(totalStyle);

                // Col G: Grade formula (locked, blue)
                Cell gradeCell = dataRow.createCell(6);
                gradeCell.setCellFormula(String.format(
                        "IF(F%1$d=\"\",\"\",IF(F%1$d>=80,\"A1\",IF(F%1$d>=75,\"A2\",IF(F%1$d>=70,\"B2\","
                        + "IF(F%1$d>=65,\"B3\",IF(F%1$d>=60,\"C4\",IF(F%1$d>=55,\"C5\",IF(F%1$d>=50,\"C6\","
                        + "IF(F%1$d>=45,\"D7\",IF(F%1$d>=40,\"E8\",\"F9\"))))))))))",
                        excelRow));
                gradeCell.setCellStyle(totalStyle);

                // Col H: Remarks formula (locked, blue)
                Cell remCell = dataRow.createCell(7);
                remCell.setCellFormula(String.format(
                        "IF(G%1$d=\"\",\"\",IF(OR(G%1$d=\"A1\",G%1$d=\"A2\"),\"Excellent\","
                        + "IF(OR(G%1$d=\"B2\",G%1$d=\"B3\"),\"Very Good\","
                        + "IF(OR(G%1$d=\"C4\",G%1$d=\"C5\",G%1$d=\"C6\"),\"Good\","
                        + "IF(G%1$d=\"D7\",\"Pass\",\"Fail\")))))",
                        excelRow));
                remCell.setCellStyle(totalStyle);
            }

            int lastDataRow = dataStartRow + studentCount - 1;

            // — Data validation: Class Score (col D) must be 0–30
            DataValidationHelper dvHelper = sheet.getDataValidationHelper();
            DataValidationConstraint csConstraint = dvHelper.createNumericConstraint(
                    DataValidationConstraint.ValidationType.DECIMAL,
                    DataValidationConstraint.OperatorType.BETWEEN,
                    "0", "30");
            CellRangeAddressList csRange = new CellRangeAddressList(dataStartRow, lastDataRow, 3, 3);
            DataValidation csValidation = dvHelper.createValidation(csConstraint, csRange);
            csValidation.setShowErrorBox(true);
            csValidation.createErrorBox("Invalid Score", "Class score must be between 0 and 30");
            csValidation.setEmptyCellAllowed(true);
            sheet.addValidationData(csValidation);

            // — Data validation: Exam Score (col E) must be 0–70
            DataValidationConstraint esConstraint = dvHelper.createNumericConstraint(
                    DataValidationConstraint.ValidationType.DECIMAL,
                    DataValidationConstraint.OperatorType.BETWEEN,
                    "0", "70");
            CellRangeAddressList esRange = new CellRangeAddressList(dataStartRow, lastDataRow, 4, 4);
            DataValidation esValidation = dvHelper.createValidation(esConstraint, esRange);
            esValidation.setShowErrorBox(true);
            esValidation.createErrorBox("Invalid Score", "Exam score must be between 0 and 70");
            esValidation.setEmptyCellAllowed(true);
            sheet.addValidationData(esValidation);

            // — Summary statistics (2 blank rows after data, then stats)
            if (studentCount > 0) {
                int statsStartRow = lastDataRow + 3;
                String dRange = String.format("D%d:D%d", dataStartRow + 1, lastDataRow + 1);
                String eRange = String.format("E%d:E%d", dataStartRow + 1, lastDataRow + 1);
                String fRange = String.format("F%d:F%d", dataStartRow + 1, lastDataRow + 1);

                // Stats header
                Row statsHeaderRow = sheet.createRow(statsStartRow);
                Cell statsTitle = statsHeaderRow.createCell(0);
                statsTitle.setCellValue("CLASS STATISTICS");
                statsTitle.setCellStyle(statsLabelStyle);
                sheet.addMergedRegion(new CellRangeAddress(statsStartRow, statsStartRow, 0, 2));

                // Stat rows
                String[][] statDefs = {
                        {"Average Class Score:", String.format("AVERAGE(%s)", dRange)},
                        {"Average Exam Score:",  String.format("AVERAGE(%s)", eRange)},
                        {"Average Total:",       String.format("AVERAGE(%s)", fRange)},
                        {"Highest Score:",       String.format("MAX(%s)", fRange)},
                        {"Lowest Score:",        String.format("MIN(%s)", fRange)},
                };
                for (int i = 0; i < statDefs.length; i++) {
                    Row statRow = sheet.createRow(statsStartRow + 1 + i);
                    Cell labelCell = statRow.createCell(0);
                    labelCell.setCellValue(statDefs[i][0]);
                    labelCell.setCellStyle(statsLabelStyle);
                    sheet.addMergedRegion(new CellRangeAddress(
                            statsStartRow + 1 + i, statsStartRow + 1 + i, 0, 2));

                    Cell valCell = statRow.createCell(3);
                    valCell.setCellFormula(statDefs[i][1]);
                    valCell.setCellStyle(statsValueStyle);
                }
            }

            // — Freeze panes: first 5 rows + first 3 columns
            sheet.createFreezePane(3, 5);

            // — Auto-filter on header row
            if (studentCount > 0) {
                sheet.setAutoFilter(new CellRangeAddress(4, lastDataRow, 0, 7));
            }

            // — Sheet protection (password: GES2024)
            //   Only score entry cells (cols D & E) are unlocked
            sheet.protectSheet("GES2024");

            // ═══════════════════════════════════════════════
            //  SHEET 2 — INSTRUCTIONS
            // ═══════════════════════════════════════════════

            XSSFSheet instrSheet = workbook.createSheet("Instructions");
            instrSheet.setColumnWidth(0, 4 * 256);
            instrSheet.setColumnWidth(1, 80 * 256);

            // Title
            Row instrTitle = instrSheet.createRow(0);
            instrTitle.setHeightInPoints(24);
            Cell instrTitleCell = instrTitle.createCell(0);
            instrTitleCell.setCellValue("HOW TO USE THIS SCORE SHEET");
            XSSFCellStyle instrTitleStyle = workbook.createCellStyle();
            XSSFFont instrTitleFont = workbook.createFont();
            instrTitleFont.setBold(true);
            instrTitleFont.setFontHeightInPoints((short) 14);
            instrTitleFont.setColor(new XSSFColor(greenRgb, null));
            instrTitleStyle.setFont(instrTitleFont);
            instrTitleCell.setCellStyle(instrTitleStyle);
            instrSheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 1));

            // Instructions
            String[] instructions = {
                    "1.  This template is pre-filled with student names and index numbers.",
                    "2.  Enter scores ONLY in the highlighted yellow cells (Class Score & Exam Score).",
                    "3.  Class Score maximum is 30 marks.",
                    "4.  Exam Score maximum is 70 marks.",
                    "5.  Total, Grade, and Remarks are calculated automatically \u2014 do not edit them.",
                    "6.  Save the file as Excel (.xlsx) format before uploading.",
                    "7.  Do NOT delete, rename, or reorder any columns.",
                    "8.  Do NOT modify student names or index numbers.",
                    "9.  To mark a student as absent, leave both score cells blank.",
                    "10. Upload the completed file via the Bulk Upload page.",
            };

            XSSFCellStyle instrStyle = workbook.createCellStyle();
            XSSFFont instrFont = workbook.createFont();
            instrFont.setFontHeightInPoints((short) 10);
            instrStyle.setFont(instrFont);
            instrStyle.setWrapText(true);

            for (int i = 0; i < instructions.length; i++) {
                Row r = instrSheet.createRow(2 + i);
                Cell c = r.createCell(0);
                c.setCellValue(instructions[i]);
                c.setCellStyle(instrStyle);
                instrSheet.addMergedRegion(new CellRangeAddress(2 + i, 2 + i, 0, 1));
            }

            // Color coding guide
            int guideStart = 2 + instructions.length + 1;
            Row guideTitle = instrSheet.createRow(guideStart);
            Cell guideTitleCell = guideTitle.createCell(0);
            guideTitleCell.setCellValue("COLOR CODING:");
            XSSFCellStyle guideTitleStyle = workbook.createCellStyle();
            XSSFFont guideTitleFont = workbook.createFont();
            guideTitleFont.setBold(true);
            guideTitleFont.setFontHeightInPoints((short) 10);
            guideTitleStyle.setFont(guideTitleFont);
            guideTitleCell.setCellStyle(guideTitleStyle);
            instrSheet.addMergedRegion(new CellRangeAddress(guideStart, guideStart, 0, 1));

            String[][] colorGuide = {
                    {"Yellow cells", "Fill in scores here"},
                    {"Grey cells", "Read-only (student info)"},
                    {"Blue cells", "Auto-calculated (do not edit)"},
            };
            byte[][] guideColors = {yellowRgb, greyRgb, blueRgb};

            for (int i = 0; i < colorGuide.length; i++) {
                Row gRow = instrSheet.createRow(guideStart + 1 + i);

                XSSFCellStyle swatchStyle = workbook.createCellStyle();
                swatchStyle.setFillForegroundColor(new XSSFColor(guideColors[i], null));
                swatchStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                applyBorders(swatchStyle);
                Cell swatchCell = gRow.createCell(0);
                swatchCell.setCellValue(colorGuide[i][0]);
                swatchCell.setCellStyle(swatchStyle);

                Cell descCell = gRow.createCell(1);
                descCell.setCellValue(colorGuide[i][1]);
                descCell.setCellStyle(instrStyle);
            }

            // ═══════════════════════════════════════════════
            //  FINALIZE
            // ═══════════════════════════════════════════════

            workbook.setActiveSheet(0);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();

        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate score sheet template", e);
        }
    }

    /** Builds a sanitised filename for the score sheet template download. */
    public String buildTemplateFilename(Long classRoomId, Long subjectId, Long termId) {
        try {
            ClassRoom classRoom = classRoomRepository.findById(classRoomId).orElse(null);
            Subject subject = subjectRepository.findById(subjectId).orElse(null);
            Term term = termRepository.findById(termId).orElse(null);

            String cls = classRoom != null ? classRoom.getDisplayName() : "Class";
            String subj = subject != null ? subject.getName() : "Subject";
            String termLabel = term != null ? buildTermLabel(term) : "Term";

            // Sanitise: replace spaces and special chars with underscores
            String name = String.format("ScoreSheet_%s_%s_%s.xlsx", cls, subj, termLabel)
                    .replaceAll("[^a-zA-Z0-9._-]", "_");
            return name;
        } catch (Exception e) {
            return "ScoreSheet_template.xlsx";
        }
    }

    // ==================== PRIVATE HELPERS ====================

    private void applyBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    private String resolveStudentName(Long studentId) {
        try {
            return studentRepository.findById(studentId)
                    .map(s -> s.getUser().getFullName())
                    .orElse("Student ID " + studentId);
        } catch (Exception e) {
            return "Student ID " + studentId;
        }
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private Double getNumericCellValue(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case NUMERIC -> cell.getNumericCellValue();
            case STRING -> {
                String val = cell.getStringCellValue().trim();
                yield val.isEmpty() ? null : Double.parseDouble(val);
            }
            default -> null;
        };
    }
}
