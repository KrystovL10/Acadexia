package com.shs.academic.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shs.academic.exception.AiServiceException;
import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.EarlyWarningDto;
import com.shs.academic.model.dto.EarlyWarningSummaryDto;
import com.shs.academic.model.dto.ResolveWarningRequest;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.WarningLevel;
import com.shs.academic.repository.*;
import com.shs.academic.service.ai.ClaudeApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EarlyWarningService {

    private final EarlyWarningRepository earlyWarningRepository;
    private final StudentRepository studentRepository;
    private final ScoreRepository scoreRepository;
    private final TermResultRepository termResultRepository;
    private final AttendanceRepository attendanceRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final TermRepository termRepository;
    private final AcademicYearRepository academicYearRepository;
    private final UserRepository userRepository;
    private final ClaudeApiClient claudeApiClient;
    private final ObjectMapper objectMapper;

    private static final Set<String> FAILING_GRADES = Set.of("D7", "E8", "F9");
    private static final Set<String> CORE_SUBJECTS = Set.of("Mathematics", "English Language");

    // ==================== MAIN ANALYSIS METHOD ====================

    @Transactional
    public List<EarlyWarning> analyzeAndGenerateWarnings(Long schoolId, Long termId) {
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        List<Student> activeStudents = studentRepository.findBySchoolId(schoolId).stream()
                .filter(Student::isActive)
                .toList();

        List<EarlyWarning> allWarnings = new ArrayList<>();

        for (Student student : activeStudents) {
            allWarnings.addAll(checkFailingMultipleSubjects(student, term));
            allWarnings.addAll(checkGpaDecline(student, term));
            allWarnings.addAll(checkAttendanceIssue(student, term));
            allWarnings.addAll(checkBehavioralConcern(student, term));
            allWarnings.addAll(checkCoreSubjectFailure(student, term));
        }

        log.info("Early warning analysis complete for school {} term {}: {} warnings generated",
                schoolId, termId, allWarnings.size());

        // Enhance warnings with AI descriptions (non-fatal)
        try {
            enhanceWarningsWithAi(allWarnings, termId);
        } catch (Exception e) {
            log.warn("AI enhancement of early warnings failed: {}", e.getMessage());
        }

        return allWarnings;
    }

    // ==================== CHECK 1: FAILING MULTIPLE SUBJECTS ====================

    private List<EarlyWarning> checkFailingMultipleSubjects(Student student, Term term) {
        List<Score> scores = scoreRepository.findByStudentIdAndTermId(student.getId(), term.getId());

        List<String> failingSubjects = scores.stream()
                .filter(s -> !s.isAbsent() && s.getGrade() != null && FAILING_GRADES.contains(s.getGrade()))
                .map(s -> s.getSubject().getName())
                .toList();

        if (failingSubjects.size() < 3) {
            return List.of();
        }

        WarningLevel level = failingSubjects.size() >= 5 ? WarningLevel.CRITICAL : WarningLevel.HIGH;
        String subjectList = String.join(", ", failingSubjects);

        String description = String.format(
                "Student is failing %d subjects this term: %s",
                failingSubjects.size(), subjectList);

        String suggestedAction = String.format(
                "Immediate academic counseling recommended. Arrange extra tuition in %s.", subjectList);

        return List.of(saveOrUpdateWarning(student, term,
                "FAILING_MULTIPLE_SUBJECTS", level, description, suggestedAction,
                subjectList, null, null, null));
    }

    // ==================== CHECK 2: CONSECUTIVE GPA DECLINE ====================

    private List<EarlyWarning> checkGpaDecline(Student student, Term term) {
        List<TermResult> history = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(student.getId());

        if (history.size() < 2) {
            return List.of();
        }

        // Find current and previous results
        TermResult current = history.stream()
                .filter(tr -> tr.getTerm().getId().equals(term.getId()))
                .findFirst().orElse(null);

        if (current == null || current.getGpa() == null) {
            return List.of();
        }

        // Get the result just before current
        int currentIdx = -1;
        for (int i = 0; i < history.size(); i++) {
            if (history.get(i).getTerm().getId().equals(term.getId())) {
                currentIdx = i;
                break;
            }
        }

        if (currentIdx < 1) {
            return List.of();
        }

        TermResult previous = history.get(currentIdx - 1);
        if (previous.getGpa() == null) {
            return List.of();
        }

        double decline = current.getGpa() - previous.getGpa();
        if (decline >= 0) {
            return List.of(); // No decline
        }

        // Check if consecutive (3+ terms of history, last 2 both declined)
        boolean isConsecutive = false;
        String warningType = "GPA_DECLINE";
        WarningLevel level = WarningLevel.MEDIUM;

        if (currentIdx >= 2) {
            TermResult twoBack = history.get(currentIdx - 2);
            if (twoBack.getGpa() != null && previous.getGpa() < twoBack.getGpa()) {
                isConsecutive = true;
                warningType = "CONSECUTIVE_DECLINE";
                level = WarningLevel.HIGH;
            }
        }

        String description = isConsecutive
                ? String.format("Student's GPA has declined for 2 consecutive terms. Current: %.2f, Previous: %.2f",
                        current.getGpa(), previous.getGpa())
                : String.format("Student's GPA declined from %.2f to %.2f (%.2f drop)",
                        previous.getGpa(), current.getGpa(), Math.abs(decline));

        String suggestedAction = isConsecutive
                ? "Urgent intervention required. Schedule meeting with student, parents, and academic counselor."
                : "Monitor closely. Consider academic mentoring and study skills workshop.";

        return List.of(saveOrUpdateWarning(student, term,
                warningType, level, description, suggestedAction,
                null, previous.getGpa(), current.getGpa(), null));
    }

    // ==================== CHECK 3: ATTENDANCE ISSUE ====================

    private List<EarlyWarning> checkAttendanceIssue(Student student, Term term) {
        Long presentCount = attendanceRepository.countByStudentIdAndTermIdAndIsPresent(
                student.getId(), term.getId(), true);
        Long absentCount = attendanceRepository.countByStudentIdAndTermIdAndIsPresent(
                student.getId(), term.getId(), false);

        long totalDays = (presentCount != null ? presentCount : 0) + (absentCount != null ? absentCount : 0);
        if (totalDays == 0) {
            return List.of();
        }

        double attendancePct = (presentCount != null ? presentCount : 0) * 100.0 / totalDays;

        if (attendancePct >= 75) {
            return List.of();
        }

        WarningLevel level;
        if (attendancePct < 50) {
            level = WarningLevel.HIGH;
        } else if (attendancePct < 65) {
            level = WarningLevel.MEDIUM;
        } else {
            level = WarningLevel.LOW;
        }

        // Correlate with grades — if also failing, escalate to CRITICAL
        List<Score> scores = scoreRepository.findByStudentIdAndTermId(student.getId(), term.getId());
        long failingCount = scores.stream()
                .filter(s -> !s.isAbsent() && s.getGrade() != null && FAILING_GRADES.contains(s.getGrade()))
                .count();
        if (failingCount > 0 && level.ordinal() >= WarningLevel.MEDIUM.ordinal()) {
            level = WarningLevel.CRITICAL;
        }

        // Collect recent absent dates for context
        List<Attendance> absences = attendanceRepository.findByStudentIdAndTermId(
                student.getId(), term.getId()).stream()
                .filter(a -> !a.isPresent())
                .sorted((a, b) -> b.getDate().compareTo(a.getDate()))
                .limit(5)
                .toList();
        String absentDatesStr = absences.isEmpty() ? ""
                : " Recent absences: " + absences.stream()
                    .map(a -> a.getDate().toString())
                    .collect(java.util.stream.Collectors.joining(", ")) + ".";

        String description = String.format(
                "Student attendance is at %.1f%% (%d present out of %d days).%s %s",
                attendancePct, presentCount, totalDays,
                absentDatesStr,
                failingCount > 0 ? "Also failing " + failingCount + " subject(s)." : "");

        String suggestedAction = attendancePct < 50
                ? "Contact parents/guardians immediately. Consider disciplinary action."
                : "Issue attendance warning letter. Schedule counseling session.";

        return List.of(saveOrUpdateWarning(student, term,
                "ATTENDANCE_ISSUE", level, description, suggestedAction,
                null, null, null, round(attendancePct)));
    }

    // ==================== CHECK 4: BEHAVIORAL CONCERN ====================

    private List<EarlyWarning> checkBehavioralConcern(Student student, Term term) {
        Long highSeverityCount = behaviorLogRepository.countByStudentIdAndTermIdAndSeverity(
                student.getId(), term.getId(), "HIGH");

        if (highSeverityCount == null || highSeverityCount < 2) {
            return List.of();
        }

        String description = String.format(
                "Student has %d high-severity behavior incidents this term.", highSeverityCount);

        String suggestedAction = "Schedule disciplinary hearing. Notify parents/guardians. "
                + "Consider behavioral counseling program.";

        return List.of(saveOrUpdateWarning(student, term,
                "BEHAVIORAL_CONCERN", WarningLevel.MEDIUM, description, suggestedAction,
                null, null, null, null));
    }

    // ==================== CHECK 5: CORE SUBJECT FAILURE ====================

    private List<EarlyWarning> checkCoreSubjectFailure(Student student, Term term) {
        List<Score> scores = scoreRepository.findByStudentIdAndTermId(student.getId(), term.getId());

        List<String> failingCores = scores.stream()
                .filter(s -> !s.isAbsent() && s.getGrade() != null
                        && FAILING_GRADES.contains(s.getGrade())
                        && CORE_SUBJECTS.contains(s.getSubject().getName()))
                .map(s -> s.getSubject().getName())
                .toList();

        if (failingCores.isEmpty()) {
            return List.of();
        }

        WarningLevel level = failingCores.size() >= 2 ? WarningLevel.HIGH : WarningLevel.MEDIUM;
        String subjectList = String.join(", ", failingCores);

        String description = String.format(
                "Student is failing core subject(s): %s. Core subject failure requires immediate attention.",
                subjectList);

        String suggestedAction = String.format(
                "Arrange mandatory remedial classes in %s. Assign academic mentor.", subjectList);

        return List.of(saveOrUpdateWarning(student, term,
                "CORE_SUBJECT_FAILURE", level, description, suggestedAction,
                subjectList, null, null, null));
    }

    // ==================== DEDUPLICATION & SAVE ====================

    private EarlyWarning saveOrUpdateWarning(Student student, Term term,
                                              String warningType, WarningLevel level,
                                              String description, String suggestedAction,
                                              String subjectsFailing, Double previousGpa,
                                              Double currentGpa, Double attendancePct) {

        // Check for existing unresolved warning of same type
        Optional<EarlyWarning> existingOpt = earlyWarningRepository
                .findByStudentIdAndTermIdAndWarningTypeAndIsResolvedFalse(
                        student.getId(), term.getId(), warningType);

        if (existingOpt.isPresent()) {
            // Update existing unresolved warning
            EarlyWarning existing = existingOpt.get();
            existing.setWarningLevel(level);
            existing.setDescription(description);
            existing.setSuggestedAction(suggestedAction);
            existing.setSubjectsFailing(subjectsFailing);
            existing.setPreviousGpa(previousGpa);
            existing.setCurrentGpa(currentGpa);
            existing.setAttendancePercentage(attendancePct);
            return earlyWarningRepository.save(existing);
        }

        // Create new warning
        EarlyWarning warning = EarlyWarning.builder()
                .student(student)
                .term(term)
                .warningLevel(level)
                .warningType(warningType)
                .description(description)
                .suggestedAction(suggestedAction)
                .subjectsFailing(subjectsFailing)
                .previousGpa(previousGpa)
                .currentGpa(currentGpa)
                .attendancePercentage(attendancePct)
                .isResolved(false)
                .isAiGenerated(true)
                .build();

        return earlyWarningRepository.save(warning);
    }

    // ==================== AI ENHANCEMENT ====================

    private static final String WARNING_ENHANCE_SYSTEM_PROMPT =
            "You are an academic counselor at a Ghanaian Senior High School. " +
            "You enhance early warning descriptions with specific, actionable insights. " +
            "Always respond with valid JSON only. No text outside the JSON.";

    @Transactional
    public void enhanceWarningsWithAi(List<EarlyWarning> warnings, Long termId) {
        if (warnings.isEmpty()) return;

        // Process in batches of 5
        int batchSize = 5;
        for (int i = 0; i < warnings.size(); i += batchSize) {
            List<EarlyWarning> batch = warnings.subList(i, Math.min(i + batchSize, warnings.size()));

            for (EarlyWarning warning : batch) {
                try {
                    enhanceSingleWarning(warning, termId);
                } catch (AiServiceException e) {
                    log.debug("AI enhancement skipped for warning {}: {}", warning.getId(), e.getMessage());
                }
            }

            // Rate limiting between batches
            if (i + batchSize < warnings.size()) {
                try {
                    Thread.sleep(300);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }

    private void enhanceSingleWarning(EarlyWarning warning, Long termId) {
        Long studentId = warning.getStudent().getId();

        // Gather behavior count for context
        long behaviorCount = behaviorLogRepository.findByStudentIdAndTermId(studentId, termId).stream()
                .filter(l -> "DISCIPLINE_ISSUE".equalsIgnoreCase(l.getLogType()))
                .count();

        String userMessage = "Enhance this early warning for a Ghanaian SHS student:\n\n" +
                "Student Situation:\n" +
                "- Warning Type: " + warning.getWarningType() + "\n" +
                "- Warning Level: " + warning.getWarningLevel() + "\n" +
                "- Current GPA: " + (warning.getCurrentGpa() != null ? String.format("%.2f", warning.getCurrentGpa()) : "N/A") + "\n" +
                "- Previous GPA: " + (warning.getPreviousGpa() != null ? String.format("%.2f", warning.getPreviousGpa()) : "N/A") + "\n" +
                "- Failing Subjects: " + (warning.getSubjectsFailing() != null ? warning.getSubjectsFailing() : "None specified") + "\n" +
                "- Attendance Rate: " + (warning.getAttendancePercentage() != null ? String.format("%.1f", warning.getAttendancePercentage()) + "%" : "N/A") + "\n" +
                "- Behavior Issues This Term: " + behaviorCount + "\n\n" +
                "Current Description: " + warning.getDescription() + "\n\n" +
                "Respond with JSON:\n" +
                "{\n" +
                "  \"enhancedDescription\": \"More specific 2-3 sentence description of the issue\",\n" +
                "  \"rootCause\": \"Brief likely root cause analysis\",\n" +
                "  \"suggestedAction\": \"Specific actionable recommendation for class teacher\",\n" +
                "  \"urgencyNote\": \"One sentence on time sensitivity\"\n" +
                "}";

        String response = claudeApiClient.sendMessage(WARNING_ENHANCE_SYSTEM_PROMPT, userMessage);

        try {
            String json = extractJson(response);
            JsonNode root = objectMapper.readTree(json);

            if (root.has("enhancedDescription") && !root.get("enhancedDescription").isNull()) {
                warning.setDescription(root.get("enhancedDescription").asText());
            }
            if (root.has("suggestedAction") && !root.get("suggestedAction").isNull()) {
                String rootCause = root.has("rootCause") ? root.get("rootCause").asText() : "";
                String action = root.get("suggestedAction").asText();
                warning.setSuggestedAction(
                        rootCause.isBlank() ? action : "Root cause: " + rootCause + ". Action: " + action);
            }
            if (root.has("urgencyNote") && !root.get("urgencyNote").isNull()) {
                warning.setUrgencyNote(root.get("urgencyNote").asText());
            }

            earlyWarningRepository.save(warning);
        } catch (Exception e) {
            log.debug("Failed to parse AI enhancement for warning {}: {}", warning.getId(), e.getMessage());
        }
    }

    private String extractJson(String response) {
        String trimmed = response.trim();
        if (trimmed.startsWith("```json")) trimmed = trimmed.substring(7);
        else if (trimmed.startsWith("```")) trimmed = trimmed.substring(3);
        if (trimmed.endsWith("```")) trimmed = trimmed.substring(0, trimmed.length() - 3);
        return trimmed.trim();
    }

    // ==================== SUMMARY ====================

    @Transactional(readOnly = true)
    public EarlyWarningSummaryDto getWarningSummary(Long schoolId, Long termId) {
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        String termName = term.getTermType().name().replace("_", " ")
                + " \u2014 " + term.getAcademicYear().getYearLabel();

        long total = earlyWarningRepository.countByTermId(termId);
        long unresolved = earlyWarningRepository.countByTermIdAndIsResolved(termId, false);
        long resolved = earlyWarningRepository.countByTermIdAndIsResolved(termId, true);
        long critical = earlyWarningRepository.countByTermIdAndWarningLevel(termId, WarningLevel.CRITICAL);
        long high = earlyWarningRepository.countByTermIdAndWarningLevel(termId, WarningLevel.HIGH);
        long medium = earlyWarningRepository.countByTermIdAndWarningLevel(termId, WarningLevel.MEDIUM);
        long low = earlyWarningRepository.countByTermIdAndWarningLevel(termId, WarningLevel.LOW);

        // Top 10 critical students
        List<EarlyWarningDto> criticalStudents = earlyWarningRepository
                .findByTermIdAndWarningLevelOrderByGeneratedAtDesc(
                        termId, WarningLevel.CRITICAL, PageRequest.of(0, 10))
                .stream()
                .map(EarlyWarningDto::fromEntity)
                .toList();

        // Last 10 generated warnings
        List<EarlyWarningDto> recentWarnings = earlyWarningRepository
                .findByTermIdOrderByGeneratedAtDesc(termId, PageRequest.of(0, 10))
                .stream()
                .map(EarlyWarningDto::fromEntity)
                .toList();

        return EarlyWarningSummaryDto.builder()
                .termId(termId)
                .termName(termName)
                .totalWarnings(total)
                .criticalCount(critical)
                .highCount(high)
                .mediumCount(medium)
                .lowCount(low)
                .unresolvedCount(unresolved)
                .resolvedCount(resolved)
                .criticalStudents(criticalStudents)
                .recentWarnings(recentWarnings)
                .build();
    }

    // ==================== RESOLVE ====================

    @Transactional
    public EarlyWarningDto resolveWarning(Long warningId, ResolveWarningRequest request, Long resolvedByUserId) {
        EarlyWarning warning = earlyWarningRepository.findById(warningId)
                .orElseThrow(() -> new ResourceNotFoundException("EarlyWarning", "id", warningId));

        User resolvedBy = userRepository.findById(resolvedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", resolvedByUserId));

        warning.setResolved(true);
        warning.setResolvedAt(LocalDateTime.now());
        warning.setResolvedBy(resolvedBy);
        warning.setResolutionNote(request.getResolutionNote());

        warning = earlyWarningRepository.save(warning);
        log.info("Resolved warning {} for student {}", warningId, warning.getStudent().getUser().getFullName());

        return EarlyWarningDto.fromEntity(warning);
    }

    // ==================== QUERIES ====================

    @Transactional(readOnly = true)
    public List<EarlyWarningDto> getStudentWarnings(Long studentId) {
        return earlyWarningRepository.findByStudentIdOrderByGeneratedAtDesc(studentId)
                .stream()
                .map(EarlyWarningDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<EarlyWarningDto> getTermWarnings(Long termId, WarningLevel level, Pageable pageable) {
        Page<EarlyWarning> warnings;
        if (level != null) {
            warnings = earlyWarningRepository.findByTermIdAndWarningLevel(termId, level, pageable);
        } else {
            warnings = earlyWarningRepository.findByTermId(termId, pageable);
        }
        return warnings.map(EarlyWarningDto::fromEntity);
    }

    @Transactional
    public void deleteWarning(Long warningId) {
        EarlyWarning warning = earlyWarningRepository.findById(warningId)
                .orElseThrow(() -> new ResourceNotFoundException("EarlyWarning", "id", warningId));

        earlyWarningRepository.delete(warning);
        log.info("Deleted warning {} (false positive override)", warningId);
    }

    // ==================== HELPERS ====================

    private Double round(Double value) {
        if (value == null) return null;
        return Math.round(value * 100.0) / 100.0;
    }
}
