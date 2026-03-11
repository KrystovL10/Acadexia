package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.*;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.WarningLevel;
import com.shs.academic.repository.*;
import com.shs.academic.service.ai.StudentRemarkAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BehaviorService {

    private static final String DISCIPLINE_ISSUE = "DISCIPLINE_ISSUE";
    private static final String ACHIEVEMENT = "ACHIEVEMENT";
    private static final String BEHAVIOUR_WARNING_TYPE = "BEHAVIOUR_CONCERN";

    private final BehaviorLogRepository behaviorLogRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final TermRepository termRepository;
    private final EarlyWarningRepository earlyWarningRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final StudentRemarkAiService studentRemarkAiService;

    // ================================================================
    // CREATE
    // ================================================================

    @Transactional
    public BehaviorLogDto createBehaviorLog(Long teacherUserId,
                                             CreateBehaviorLogRequest request) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = getClassRoomOrThrow(request.getClassRoomId());
        validateTeacherOwnsClass(teacher, classRoom);

        Student student = getStudentOrThrow(request.getStudentId());
        validateStudentInClass(student, classRoom);

        Term term = getTermOrThrow(request.getTermId());

        BehaviorLog log = BehaviorLog.builder()
                .student(student)
                .classRoom(classRoom)
                .term(term)
                .logType(request.getLogType())
                .title(request.getTitle())
                .description(request.getDescription())
                .severity(request.getSeverity())
                .loggedBy(teacher.getUser())
                .build();

        log = behaviorLogRepository.save(log);

        // ─── Auto-trigger actions ─────────────────────────────────
        if (DISCIPLINE_ISSUE.equalsIgnoreCase(request.getLogType())
                && "HIGH".equalsIgnoreCase(request.getSeverity())) {
            handleHighSeverityDiscipline(student, term, request, teacher.getUser());
        }

        if (ACHIEVEMENT.equalsIgnoreCase(request.getLogType())) {
            handleAchievementLog(student, term);
        }

        return BehaviorLogDto.fromEntity(log);
    }

    private void handleHighSeverityDiscipline(Student student, Term term,
                                               CreateBehaviorLogRequest request,
                                               User teacher) {
        Optional<EarlyWarning> existing = earlyWarningRepository
                .findByStudentIdAndTermIdAndWarningTypeAndIsResolvedFalse(
                        student.getId(), term.getId(), BEHAVIOUR_WARNING_TYPE);

        if (existing.isPresent()) {
            // Escalate to MEDIUM if still at LOW
            EarlyWarning warning = existing.get();
            if (warning.getWarningLevel() == WarningLevel.LOW) {
                warning.setWarningLevel(WarningLevel.MEDIUM);
                warning.setDescription(warning.getDescription()
                        + " | Escalated: repeated HIGH severity discipline — " + request.getTitle());
                earlyWarningRepository.save(warning);
                log.info("Escalated behaviour warning to MEDIUM for student {} term {}",
                        student.getStudentIndex(), term.getId());
            }
        } else {
            // Create LOW warning
            String desc = "Behaviour concern logged: " + request.getTitle()
                    + (request.getDescription() != null
                    ? " — " + request.getDescription() : "");
            EarlyWarning warning = EarlyWarning.builder()
                    .student(student)
                    .term(term)
                    .warningLevel(WarningLevel.LOW)
                    .warningType(BEHAVIOUR_WARNING_TYPE)
                    .description(desc)
                    .suggestedAction(
                            "Review student behaviour record and schedule a meeting with guardian.")
                    .isResolved(false)
                    .isAiGenerated(false)
                    .build();
            earlyWarningRepository.save(warning);
            log.info("Auto-created LOW behaviour warning for student {} term {}",
                    student.getStudentIndex(), term.getId());
        }
    }

    private void handleAchievementLog(Student student, Term term) {
        earlyWarningRepository
                .findByStudentIdAndTermIdAndWarningTypeAndIsResolvedFalse(
                        student.getId(), term.getId(), BEHAVIOUR_WARNING_TYPE)
                .ifPresent(warning -> {
                    String existing = warning.getResolutionNote() != null
                            ? warning.getResolutionNote() + "; " : "";
                    warning.setResolutionNote(existing + "Positive behavior noted ("
                            + LocalDateTime.now().toLocalDate() + ")");
                    earlyWarningRepository.save(warning);
                    log.info("Noted positive behavior on warning for student {} term {}",
                            student.getStudentIndex(), term.getId());
                });
    }

    // ================================================================
    // UPDATE
    // ================================================================

    @Transactional
    public BehaviorLogDto updateBehaviorLog(Long teacherUserId, Long logId,
                                             UpdateBehaviorLogRequest request) {
        Teacher teacher = resolveTeacher(teacherUserId);
        BehaviorLog log = getLogOrThrow(logId);

        validateTeacherOwnsLog(teacher, log);

        log.setDescription(request.getDescription());
        if (request.getSeverity() != null) {
            log.setSeverity(request.getSeverity());
        }

        return BehaviorLogDto.fromEntity(behaviorLogRepository.save(log));
    }

    // ================================================================
    // DELETE (soft)
    // ================================================================

    @Transactional
    public void deleteBehaviorLog(Long teacherUserId, Long logId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        BehaviorLog behaviorLog = getLogOrThrow(logId);

        validateTeacherOwnsLog(teacher, behaviorLog);

        behaviorLog.setDeleted(true);
        behaviorLogRepository.save(behaviorLog);

        // If this was a HIGH severity discipline log, try to resolve the linked warning
        if (DISCIPLINE_ISSUE.equalsIgnoreCase(behaviorLog.getLogType())
                && "HIGH".equalsIgnoreCase(behaviorLog.getSeverity())) {
            earlyWarningRepository
                    .findByStudentIdAndTermIdAndWarningTypeAndIsResolvedFalse(
                            behaviorLog.getStudent().getId(), behaviorLog.getTerm().getId(),
                            BEHAVIOUR_WARNING_TYPE)
                    .ifPresent(warning -> {
                        warning.setResolved(true);
                        warning.setResolvedAt(LocalDateTime.now());
                        warning.setResolvedBy(teacher.getUser());
                        warning.setResolutionNote("Behavior log deleted by teacher");
                        earlyWarningRepository.save(warning);
                        log.info("Auto-resolved behaviour warning for student {} after log deletion",
                                behaviorLog.getStudent().getStudentIndex());
                    });
        }
    }

    // ================================================================
    // GET CLASS BEHAVIOR LOGS (with optional filters)
    // ================================================================

    @Transactional(readOnly = true)
    public List<BehaviorLogDto> getClassBehaviorLogs(Long teacherUserId, Long termId,
                                                      String logType, String severity) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);
        Term term = resolveTerm(classRoom, termId);

        List<BehaviorLog> logs;

        if (logType != null && severity != null) {
            logs = behaviorLogRepository
                    .findByClassRoomIdAndTermIdAndLogTypeAndSeverityAndIsDeletedFalse(
                            classRoom.getId(), term.getId(), logType, severity);
        } else if (logType != null) {
            logs = behaviorLogRepository
                    .findByClassRoomIdAndTermIdAndLogTypeAndIsDeletedFalse(
                            classRoom.getId(), term.getId(), logType);
        } else if (severity != null) {
            logs = behaviorLogRepository
                    .findByClassRoomIdAndTermIdAndSeverityAndIsDeletedFalse(
                            classRoom.getId(), term.getId(), severity);
        } else {
            logs = behaviorLogRepository
                    .findByClassRoomIdAndTermIdAndIsDeletedFalse(
                            classRoom.getId(), term.getId());
        }

        return logs.stream()
                .sorted(Comparator.comparing(BehaviorLog::getLoggedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(BehaviorLogDto::fromEntity)
                .collect(Collectors.toList());
    }

    // ================================================================
    // STUDENT BEHAVIOR SUMMARY
    // ================================================================

    @Transactional(readOnly = true)
    public StudentBehaviorSummaryDto getStudentBehaviorSummary(Long teacherUserId,
                                                                Long studentId,
                                                                Long termId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);
        Student student = getStudentOrThrow(studentId);
        validateStudentInClass(student, classRoom);
        Term term = resolveTerm(classRoom, termId);

        return buildStudentBehaviorSummary(student, term);
    }

    @Transactional(readOnly = true)
    public StudentBehaviorSummaryDto buildStudentBehaviorSummary(Student student, Term term) {
        List<BehaviorLog> logs = behaviorLogRepository
                .findByStudentIdAndTermIdAndIsDeletedFalse(student.getId(), term.getId());

        int achievements = (int) logs.stream()
                .filter(l -> ACHIEVEMENT.equalsIgnoreCase(l.getLogType())).count();
        int discipline = (int) logs.stream()
                .filter(l -> DISCIPLINE_ISSUE.equalsIgnoreCase(l.getLogType())).count();
        int notes = (int) logs.stream()
                .filter(l -> !ACHIEVEMENT.equalsIgnoreCase(l.getLogType())
                        && !DISCIPLINE_ISSUE.equalsIgnoreCase(l.getLogType())).count();

        int conductScore = calculateConductScore(logs);
        String conductGrade = conductScoreToGrade(conductScore);

        String aiAssessment = generateConductAssessmentSafe(student, term, logs, conductScore);

        List<BehaviorLogDto> logDtos = logs.stream()
                .sorted(Comparator.comparing(BehaviorLog::getLoggedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(BehaviorLogDto::fromEntity)
                .collect(Collectors.toList());

        return StudentBehaviorSummaryDto.builder()
                .studentId(student.getId())
                .studentName(student.getUser().getFullName())
                .termLabel(term.getTermType().name().replace("_", " "))
                .achievementCount(achievements)
                .disciplineCount(discipline)
                .noteCount(notes)
                .conductScore(conductScore)
                .conductGrade(conductGrade)
                .logs(logDtos)
                .aiConductAssessment(aiAssessment)
                .build();
    }

    // ================================================================
    // CLASS BEHAVIOR REPORT
    // ================================================================

    @Transactional(readOnly = true)
    public ClassBehaviorReportDto getClassBehaviorReport(Long teacherUserId, Long termId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);
        Term term = resolveTerm(classRoom, termId);

        List<Student> students = studentRepository.findByCurrentClassId(classRoom.getId());
        List<BehaviorLog> allLogs = behaviorLogRepository
                .findByClassRoomIdAndTermIdAndIsDeletedFalse(classRoom.getId(), term.getId());

        // Per-student stats
        Map<Long, List<BehaviorLog>> logsByStudent = allLogs.stream()
                .collect(Collectors.groupingBy(l -> l.getStudent().getId()));

        List<ClassBehaviorReportDto.StudentConductEntry> entries = new ArrayList<>();
        int totalAchievements = 0, totalDiscipline = 0, totalNotes = 0;

        for (Student s : students) {
            List<BehaviorLog> sLogs = logsByStudent.getOrDefault(s.getId(), List.of());
            int ach = (int) sLogs.stream()
                    .filter(l -> ACHIEVEMENT.equalsIgnoreCase(l.getLogType())).count();
            int disc = (int) sLogs.stream()
                    .filter(l -> DISCIPLINE_ISSUE.equalsIgnoreCase(l.getLogType())).count();
            int score = calculateConductScore(sLogs);

            totalAchievements += ach;
            totalDiscipline += disc;
            totalNotes += sLogs.size() - ach - disc;

            entries.add(ClassBehaviorReportDto.StudentConductEntry.builder()
                    .studentId(s.getId())
                    .studentIndex(s.getStudentIndex())
                    .studentName(s.getUser().getFullName())
                    .conductScore(score)
                    .conductGrade(conductScoreToGrade(score))
                    .achievementCount(ach)
                    .disciplineCount(disc)
                    .build());
        }

        // Leaderboard: top 5
        List<ClassBehaviorReportDto.StudentConductEntry> leaderboard = entries.stream()
                .sorted(Comparator.comparingInt(ClassBehaviorReportDto.StudentConductEntry::getConductScore)
                        .reversed())
                .limit(5)
                .collect(Collectors.toList());

        // Concerns: conductScore < 50
        List<ClassBehaviorReportDto.StudentConductEntry> concerns = entries.stream()
                .filter(e -> e.getConductScore() < 50)
                .sorted(Comparator.comparingInt(ClassBehaviorReportDto.StudentConductEntry::getConductScore))
                .collect(Collectors.toList());

        // Recent 10 logs
        List<BehaviorLogDto> recentLogs = allLogs.stream()
                .sorted(Comparator.comparing(BehaviorLog::getLoggedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .map(BehaviorLogDto::fromEntity)
                .collect(Collectors.toList());

        double avgScore = entries.isEmpty() ? 100.0
                : entries.stream().mapToInt(ClassBehaviorReportDto.StudentConductEntry::getConductScore)
                .average().orElse(100.0);

        ClassBehaviorReportDto.Summary summary = ClassBehaviorReportDto.Summary.builder()
                .totalAchievements(totalAchievements)
                .totalDisciplineIssues(totalDiscipline)
                .totalNotes(totalNotes)
                .avgConductScore(Math.round(avgScore * 10.0) / 10.0)
                .studentsWithConcerns(concerns.size())
                .build();

        return ClassBehaviorReportDto.builder()
                .classRoomId(classRoom.getId())
                .className(classRoom.getDisplayName())
                .termId(term.getId())
                .termLabel(term.getTermType().name().replace("_", " "))
                .summary(summary)
                .leaderboard(leaderboard)
                .concerns(concerns)
                .recentLogs(recentLogs)
                .build();
    }

    // ================================================================
    // CONDUCT SCORE (public for ReportService use)
    // ================================================================

    public String calculateConductGrade(Long studentId, Long termId) {
        List<BehaviorLog> logs = behaviorLogRepository
                .findByStudentIdAndTermIdAndIsDeletedFalse(studentId, termId);
        if (logs.isEmpty()) return "Good";
        int score = calculateConductScore(logs);
        return conductScoreToGrade(score);
    }

    // ================================================================
    // INTERNAL HELPERS
    // ================================================================

    private int calculateConductScore(List<BehaviorLog> logs) {
        int score = 100;
        for (BehaviorLog l : logs) {
            if (DISCIPLINE_ISSUE.equalsIgnoreCase(l.getLogType())) {
                String sev = l.getSeverity() != null ? l.getSeverity().toUpperCase() : "LOW";
                score -= switch (sev) {
                    case "HIGH" -> 25;
                    case "MEDIUM" -> 15;
                    default -> 5;
                };
            } else if (ACHIEVEMENT.equalsIgnoreCase(l.getLogType())) {
                score += 10;
            }
        }
        return Math.max(0, Math.min(100, score));
    }

    private String conductScoreToGrade(int score) {
        if (score >= 90) return "Excellent";
        if (score >= 75) return "Very Good";
        if (score >= 60) return "Good";
        if (score >= 45) return "Fair";
        return "Poor";
    }

    private String generateConductAssessmentSafe(Student student, Term term,
                                                  List<BehaviorLog> logs, int conductScore) {
        try {
            return studentRemarkAiService.generateConductAssessment(
                    student, term, logs, conductScore, getAttendanceRate(student, term));
        } catch (Exception e) {
            log.warn("AI conduct assessment failed for student {}: {}",
                    student.getStudentIndex(), e.getMessage());
            return buildFallbackAssessment(student, conductScore, logs);
        }
    }

    private double getAttendanceRate(Student student, Term term) {
        long present = attendanceRepository
                .countByStudentIdAndTermIdAndIsPresent(student.getId(), term.getId(), true);
        long absent = attendanceRepository
                .countByStudentIdAndTermIdAndIsPresent(student.getId(), term.getId(), false);
        long total = present + absent;
        return total > 0 ? (present * 100.0 / total) : 100.0;
    }

    private String buildFallbackAssessment(Student student, int conductScore,
                                            List<BehaviorLog> logs) {
        String grade = conductScoreToGrade(conductScore);
        String firstName = student.getUser().getFirstName();
        return switch (grade) {
            case "Excellent" -> firstName + " demonstrates exemplary conduct and is a positive influence in class.";
            case "Very Good" -> firstName + " maintains very good conduct and actively contributes to a positive classroom environment.";
            case "Good" -> firstName + " displays generally satisfactory conduct with room for continued improvement.";
            case "Fair" -> firstName + " has shown inconsistent conduct this term and is encouraged to improve behavior.";
            default -> firstName + " has significant conduct concerns this term requiring immediate attention and parental support.";
        };
    }

    private Teacher resolveTeacher(Long userId) {
        return teacherRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "userId", userId));
    }

    private ClassRoom requireAssignedClass(Teacher teacher) {
        if (teacher.getAssignedClass() == null) {
            throw new IllegalStateException("Teacher is not assigned to any class");
        }
        return teacher.getAssignedClass();
    }

    private Term resolveTerm(ClassRoom classRoom, Long termId) {
        if (termId != null) {
            return termRepository.findById(termId)
                    .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));
        }
        return termRepository
                .findByAcademicYearIdAndIsCurrentTrue(classRoom.getAcademicYear().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Term", "current", "true"));
    }

    private ClassRoom getClassRoomOrThrow(Long id) {
        return classRoomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", id));
    }

    private Student getStudentOrThrow(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));
    }

    private Term getTermOrThrow(Long id) {
        return termRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", id));
    }

    private BehaviorLog getLogOrThrow(Long id) {
        return behaviorLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BehaviorLog", "id", id));
    }

    private void validateTeacherOwnsClass(Teacher teacher, ClassRoom classRoom) {
        if (teacher.getAssignedClass() == null
                || !teacher.getAssignedClass().getId().equals(classRoom.getId())) {
            throw new IllegalStateException(
                    "Teacher is not the class teacher of classroom " + classRoom.getId());
        }
    }

    private void validateStudentInClass(Student student, ClassRoom classRoom) {
        if (student.getCurrentClass() == null
                || !student.getCurrentClass().getId().equals(classRoom.getId())) {
            throw new IllegalStateException(
                    "Student " + student.getStudentIndex()
                            + " does not belong to classroom " + classRoom.getId());
        }
    }

    private void validateTeacherOwnsLog(Teacher teacher, BehaviorLog log) {
        if (!log.getLoggedBy().getId().equals(teacher.getUser().getId())) {
            throw new IllegalStateException(
                    "Teacher does not own this behavior log (id=" + log.getId() + ")");
        }
    }
}
