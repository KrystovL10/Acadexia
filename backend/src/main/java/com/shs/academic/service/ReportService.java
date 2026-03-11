package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.exception.UnauthorizedScoreAccessException;
import com.shs.academic.model.dto.ReportReadinessDto;
import com.shs.academic.model.dto.ScoreCompletionStatusDto;
import com.shs.academic.model.dto.UpdateRemarksRequest;
import com.shs.academic.service.BehaviorService;
import com.shs.academic.model.dto.ai.ConductContext;
import com.shs.academic.model.dto.ai.HeadmasterRemarkContext;
import com.shs.academic.model.dto.ai.StudentRemarkContext;
import com.shs.academic.model.dto.ai.StudentRemarkResult;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.UserRole;
import com.shs.academic.repository.*;
import com.shs.academic.service.ai.StudentRemarkAiService;
import com.shs.academic.util.GpaCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final TermRepository termRepository;
    private final TermResultRepository termResultRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final ScoreRepository scoreRepository;

    private final TermResultValidationService validationService;
    private final GpaService gpaService;
    private final EarlyWarningService earlyWarningService;
    private final ReportProgressService reportProgressService;
    private final StudentRemarkAiService studentRemarkAiService;
    private final BehaviorService behaviorService;

    // ================================================================
    // PRE-GENERATION VALIDATION
    // ================================================================

    @Transactional(readOnly = true)
    public ReportReadinessDto checkReportReadiness(Long classRoomId, Long termId) {
        classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ClassRoom not found: " + classRoomId));
        termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Term not found: " + termId));

        List<Student> students = studentRepository.findByCurrentClassId(classRoomId);
        int studentCount = students.size();

        ScoreCompletionStatusDto completion =
                validationService.getScoreCompletionStatus(classRoomId, termId);
        boolean allScores = completion.isAllComplete();

        List<String> missingSubjects = allScores ? Collections.emptyList()
                : completion.getSubjects().stream()
                        .filter(s -> s.getStudentsWithoutScores() > 0)
                        .map(s -> s.getSubjectName()
                                + " (" + s.getStudentsWithoutScores() + " missing)")
                        .collect(Collectors.toList());

        boolean attendanceRecorded = !attendanceRepository
                .findByClassRoomIdAndTermId(classRoomId, termId).isEmpty();

        boolean ready = allScores && studentCount > 0;

        return ReportReadinessDto.builder()
                .isReady(ready)
                .allScoresSubmitted(allScores)
                .missingScoreSubjects(missingSubjects)
                .attendanceRecorded(attendanceRecorded)
                .studentsCount(studentCount)
                .message(buildReadinessMessage(ready, allScores, studentCount))
                .build();
    }

    // ================================================================
    // TERM RESULT GENERATION
    // ================================================================

    @Transactional
    public List<TermResult> generateAllTermResults(Long teacherUserId, Long termId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);

        termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term not found: " + termId));

        if (!validationService.allScoresSubmitted(classRoom.getId(), termId)) {
            ScoreCompletionStatusDto status =
                    validationService.getScoreCompletionStatus(classRoom.getId(), termId);
            List<String> pending = status.getSubjects().stream()
                    .filter(s -> s.getStudentsWithoutScores() > 0)
                    .map(ScoreCompletionStatusDto.SubjectCompletionDto::getSubjectName)
                    .collect(Collectors.toList());
            throw new IllegalStateException(
                    "Cannot generate reports: scores missing for " + pending);
        }

        // Count students for progress tracking
        List<Student> activeStudents = studentRepository.findByCurrentClassId(classRoom.getId())
                .stream().filter(Student::isActive).toList();
        int total = activeStudents.size();
        String progressKey = reportProgressService.startProgress(classRoom.getId(), termId, total);

        log.info("Generating term results for class '{}' term id={} ({} students)",
                classRoom.getDisplayName(), termId, total);

        List<TermResult> results;
        try {
            results = gpaService.generateAllTermResults(classRoom.getId(), termId);

            // Step 1: Apply behavior-calculated conduct rating (overrides AI guess)
            for (TermResult result : results) {
                String behaviorConduct = behaviorService
                        .calculateConductGrade(result.getStudent().getId(), termId);
                result.setConductRating(behaviorConduct);
                termResultRepository.save(result);
            }

            // Build AI remark contexts for students needing remarks
            reportProgressService.updateProgress(progressKey, 0, total,
                    "Building AI remark contexts...");
            List<StudentRemarkContext> remarkContexts = new ArrayList<>();
            List<TermResult> resultsNeedingRemarks = new ArrayList<>();

            for (TermResult result : results) {
                boolean needsRemarks =
                        (result.getClassTeacherRemarks() == null || result.getClassTeacherRemarks().isBlank())
                        || (result.getHeadmasterRemarks() == null || result.getHeadmasterRemarks().isBlank());

                if (needsRemarks) {
                    resultsNeedingRemarks.add(result);
                    remarkContexts.add(buildRemarkContext(result, termId));
                }
            }

            // Generate AI remarks in batch
            int failed = 0;
            if (!remarkContexts.isEmpty()) {
                log.info("Generating AI remarks for {} students", remarkContexts.size());
                List<StudentRemarkResult> remarkResults =
                        studentRemarkAiService.generateRemarksForClass(remarkContexts);

                // Apply AI results to term results
                for (int i = 0; i < resultsNeedingRemarks.size(); i++) {
                    TermResult result = resultsNeedingRemarks.get(i);
                    StudentRemarkResult remark = remarkResults.get(i);
                    try {
                        boolean dirty = false;
                        // conductRating already set from behavior data — do not overwrite with AI guess
                        if (result.getClassTeacherRemarks() == null
                                || result.getClassTeacherRemarks().isBlank()) {
                            result.setClassTeacherRemarks(remark.getClassTeacherRemark());
                            dirty = true;
                        }
                        if (result.getHeadmasterRemarks() == null
                                || result.getHeadmasterRemarks().isBlank()) {
                            result.setHeadmasterRemarks(remark.getHeadmasterRemark());
                            dirty = true;
                        }
                        if (dirty) termResultRepository.save(result);
                    } catch (Exception e) {
                        failed++;
                        log.warn("Failed to save AI remarks for student {}: {}",
                                result.getStudent().getStudentIndex(), e.getMessage());
                    }

                    int processed = i + 1;
                    reportProgressService.updateProgress(progressKey, processed, total,
                            "Generating AI remarks: " + result.getStudent().getUser().getFullName()
                            + " (" + processed + " of " + resultsNeedingRemarks.size() + ")");
                }
            }

            // Trigger early warning analysis (non-fatal)
            try {
                reportProgressService.updateProgress(progressKey, total, total,
                        "Analyzing early warnings...");
                earlyWarningService.analyzeAndGenerateWarnings(
                        classRoom.getSchool().getId(), termId);
            } catch (Exception e) {
                log.warn("Early warning analysis failed after report generation: {}", e.getMessage());
            }

            reportProgressService.markComplete(progressKey, total, failed);
        } catch (Exception e) {
            reportProgressService.markFailed(progressKey, e.getMessage());
            throw e;
        }

        log.info("Successfully generated {} term results for '{}'",
                results.size(), classRoom.getDisplayName());
        return results;
    }

    // ================================================================
    // AI REMARKS — context building for batch generation
    // ================================================================

    @Transactional(readOnly = true)
    public StudentRemarkContext buildRemarkContext(TermResult tr, Long termId) {
        Long studentId = tr.getStudent().getId();
        String firstName = tr.getStudent().getUser().getFirstName();
        double gpa = tr.getGpa() != null ? tr.getGpa() : 0;

        // Find previous term GPA
        Double previousGpa = findPreviousTermGpa(studentId, termId);

        // Get scores for best/worst subject analysis
        List<Score> scores = scoreRepository.findByStudentIdAndTermId(studentId, termId);
        List<Score> validScores = scores.stream()
                .filter(s -> !s.isAbsent() && s.getTotalScore() != null)
                .toList();

        String bestSubject = "N/A";
        String bestGrade = "—";
        String weakestSubject = "N/A";
        String weakestGrade = "—";
        List<String> failedNames = new ArrayList<>();

        if (!validScores.isEmpty()) {
            Score best = validScores.stream()
                    .max(Comparator.comparingDouble(Score::getTotalScore)).orElse(null);
            Score worst = validScores.stream()
                    .min(Comparator.comparingDouble(Score::getTotalScore)).orElse(null);
            if (best != null) {
                bestSubject = best.getSubject().getName();
                bestGrade = best.getGrade() != null ? best.getGrade() : "—";
            }
            if (worst != null) {
                weakestSubject = worst.getSubject().getName();
                weakestGrade = worst.getGrade() != null ? worst.getGrade() : "—";
            }
            failedNames = validScores.stream()
                    .filter(s -> s.getTotalScore() < 50)
                    .map(s -> s.getSubject().getName())
                    .collect(Collectors.toList());
        }

        // Behavior summary
        List<BehaviorLog> logs = behaviorLogRepository.findByStudentIdAndTermId(studentId, termId);
        String behaviorSummary = buildBehaviorSummary(logs);

        // Attendance
        double attendancePct = tr.getAttendancePercentage() != null ? tr.getAttendancePercentage() : 100.0;

        return StudentRemarkContext.builder()
                .studentId(studentId)
                .studentFirstName(firstName)
                .gpa(gpa)
                .previousGpa(previousGpa)
                .classification(GpaCalculator.getClassification(gpa))
                .totalSubjects(tr.getTotalSubjects() != null ? tr.getTotalSubjects() : 0)
                .subjectsPassed(tr.getSubjectsPassed() != null ? tr.getSubjectsPassed() : 0)
                .failedSubjectNames(failedNames)
                .bestSubjectName(bestSubject)
                .bestSubjectGrade(bestGrade)
                .weakestSubjectName(weakestSubject)
                .weakestSubjectGrade(weakestGrade)
                .attendancePercentage(attendancePct)
                .behaviorSummary(behaviorSummary)
                .positionInClass(tr.getPositionInClass() != null ? tr.getPositionInClass() : 0)
                .totalStudentsInClass(tr.getTotalStudentsInClass() != null ? tr.getTotalStudentsInClass() : 0)
                .build();
    }

    /**
     * Generate a single class teacher remark via AI (used for individual re-generation).
     */
    @Transactional(readOnly = true)
    public String generateClassTeacherRemark(Long studentId, Long termId) {
        return termResultRepository.findByStudentIdAndTermId(studentId, termId)
                .map(tr -> {
                    StudentRemarkContext ctx = buildRemarkContext(tr, termId);
                    return studentRemarkAiService.generateClassTeacherRemark(ctx);
                })
                .orElseGet(() -> {
                    Student student = studentRepository.findById(studentId)
                            .orElseThrow(() -> new ResourceNotFoundException(
                                    "Student not found: " + studentId));
                    return student.getUser().getFirstName()
                            + " has shown commitment this term. Keep up the good work.";
                });
    }

    /**
     * Generate conduct rating via AI with behavior log context.
     */
    @Transactional(readOnly = true)
    public String generateConductRating(Long studentId, Long termId) {
        List<BehaviorLog> logs = behaviorLogRepository
                .findByStudentIdAndTermId(studentId, termId);

        long present = attendanceRepository
                .countByStudentIdAndTermIdAndIsPresent(studentId, termId, true);
        long absent = attendanceRepository
                .countByStudentIdAndTermIdAndIsPresent(studentId, termId, false);
        long total = present + absent;
        double attendancePct = total > 0 ? (present * 100.0 / total) : 100.0;

        long disciplineCount = logs.stream()
                .filter(l -> "DISCIPLINE_ISSUE".equalsIgnoreCase(l.getLogType())).count();
        long highSeverity = logs.stream()
                .filter(l -> "DISCIPLINE_ISSUE".equalsIgnoreCase(l.getLogType())
                        && "HIGH".equalsIgnoreCase(l.getSeverity())).count();
        long achievements = logs.stream()
                .filter(l -> "ACHIEVEMENT".equalsIgnoreCase(l.getLogType())).count();

        // Find previous GPA for trend
        Double previousGpa = findPreviousTermGpa(studentId, termId);
        TermResult currentTr = termResultRepository.findByStudentIdAndTermId(studentId, termId)
                .orElse(null);
        double currentGpa = (currentTr != null && currentTr.getGpa() != null) ? currentTr.getGpa() : 0;
        String trend = determineTrend(currentGpa, previousGpa);

        ConductContext ctx = ConductContext.builder()
                .attendancePercentage(attendancePct)
                .disciplineIssueCount((int) disciplineCount)
                .highSeverityCount((int) highSeverity)
                .achievementCount((int) achievements)
                .behaviorNotes(buildBehaviorSummary(logs))
                .gpaTrend(trend)
                .build();

        return studentRemarkAiService.generateConductRating(ctx);
    }

    /**
     * Generate headmaster remark via AI.
     */
    @Transactional(readOnly = true)
    public String generateHeadmasterRemark(Long studentId, Long termId) {
        TermResult tr = termResultRepository.findByStudentIdAndTermId(studentId, termId)
                .orElse(null);
        double gpa = (tr != null && tr.getGpa() != null) ? tr.getGpa() : 0;
        double attendancePct = (tr != null && tr.getAttendancePercentage() != null)
                ? tr.getAttendancePercentage() : 100.0;

        HeadmasterRemarkContext ctx = HeadmasterRemarkContext.builder()
                .classification(GpaCalculator.getClassification(gpa))
                .gpa(gpa)
                .conductRating(tr != null ? tr.getConductRating() : "Good")
                .attendancePercentage(attendancePct)
                .positionInClass(tr != null && tr.getPositionInClass() != null ? tr.getPositionInClass() : 0)
                .totalStudentsInClass(tr != null && tr.getTotalStudentsInClass() != null
                        ? tr.getTotalStudentsInClass() : 0)
                .build();

        return studentRemarkAiService.generateHeadmasterRemark(ctx);
    }

    // ================================================================
    // REMARKS UPDATE
    // ================================================================

    @Transactional
    public TermResult updateRemarks(Long callerUserId, Long termResultId,
            UpdateRemarksRequest request) {
        User caller = userRepository.findById(callerUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + callerUserId));

        TermResult termResult = termResultRepository.findById(termResultId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "TermResult not found: " + termResultId));

        boolean isAdmin = caller.getRole() == UserRole.SUPER_ADMIN;
        boolean isTeacher = caller.getRole() == UserRole.CLASS_TEACHER;

        if (isTeacher) {
            Teacher teacher = resolveTeacher(callerUserId);
            ClassRoom assigned = requireAssignedClass(teacher);
            if (!assigned.getId().equals(termResult.getClassRoom().getId())) {
                throw new UnauthorizedScoreAccessException(
                        "Teacher may only update remarks for students in their own class");
            }
            applyTeacherFields(termResult, request);
        } else if (isAdmin) {
            applyTeacherFields(termResult, request);
            if (request.getHeadmasterRemarks() != null) {
                termResult.setHeadmasterRemarks(request.getHeadmasterRemarks());
            }
        } else {
            throw new UnauthorizedScoreAccessException("Insufficient role to update remarks");
        }

        return termResultRepository.save(termResult);
    }

    // ================================================================
    // PRIVATE HELPERS
    // ================================================================

    private void applyTeacherFields(TermResult tr, UpdateRemarksRequest req) {
        if (req.getClassTeacherRemarks() != null) {
            tr.setClassTeacherRemarks(req.getClassTeacherRemarks());
        }
        if (req.getConductRating() != null) {
            tr.setConductRating(req.getConductRating());
        }
    }

    private Teacher resolveTeacher(Long userPk) {
        return teacherRepository.findByUserId(userPk)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Teacher profile not found for userId=" + userPk));
    }

    private ClassRoom requireAssignedClass(Teacher teacher) {
        if (teacher.getAssignedClass() == null) {
            throw new ResourceNotFoundException(
                    "Teacher " + teacher.getStaffId() + " has no assigned class");
        }
        return teacher.getAssignedClass();
    }

    private String buildReadinessMessage(boolean ready, boolean allScores, int studentCount) {
        if (studentCount == 0) return "No students found in this class.";
        if (!allScores) return "Not ready: some subjects still have missing scores.";
        return "All scores submitted — class is ready for report generation.";
    }

    private Double findPreviousTermGpa(Long studentId, Long termId) {
        List<TermResult> allResults = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(studentId);
        Double previousGpa = null;
        for (TermResult r : allResults) {
            if (r.getTerm().getId().equals(termId)) break;
            if (r.getGpa() != null) previousGpa = r.getGpa();
        }
        return previousGpa;
    }

    private String buildBehaviorSummary(List<BehaviorLog> logs) {
        if (logs.isEmpty()) return "No issues recorded";

        long discipline = logs.stream()
                .filter(l -> "DISCIPLINE_ISSUE".equalsIgnoreCase(l.getLogType())).count();
        long achievements = logs.stream()
                .filter(l -> "ACHIEVEMENT".equalsIgnoreCase(l.getLogType())).count();

        StringBuilder sb = new StringBuilder();
        if (discipline > 0) {
            sb.append(discipline).append(" discipline issue(s)");
            long high = logs.stream()
                    .filter(l -> "DISCIPLINE_ISSUE".equalsIgnoreCase(l.getLogType())
                            && "HIGH".equalsIgnoreCase(l.getSeverity())).count();
            if (high > 0) sb.append(" (").append(high).append(" high severity)");
        }
        if (achievements > 0) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(achievements).append(" achievement(s)");
        }
        return sb.isEmpty() ? "No issues recorded" : sb.toString();
    }

    private String determineTrend(double currentGpa, Double previousGpa) {
        if (previousGpa == null) return "First term";
        double diff = currentGpa - previousGpa;
        if (diff > 0.1) return "Improving";
        if (diff < -0.1) return "Declining";
        return "Stable";
    }
}
