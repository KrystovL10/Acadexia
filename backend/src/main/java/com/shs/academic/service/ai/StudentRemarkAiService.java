package com.shs.academic.service.ai;

import com.shs.academic.exception.AiServiceException;
import com.shs.academic.model.dto.ai.ConductContext;
import com.shs.academic.model.dto.ai.HeadmasterRemarkContext;
import com.shs.academic.model.dto.ai.StudentRemarkContext;
import com.shs.academic.model.dto.ai.StudentRemarkResult;
import com.shs.academic.model.entity.BehaviorLog;
import com.shs.academic.model.entity.Student;
import com.shs.academic.model.entity.Term;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudentRemarkAiService {

    private final ClaudeApiClient claudeApiClient;

    private static final String CLASS_TEACHER_SYSTEM_PROMPT =
            "You are an experienced Senior High School teacher in Ghana writing " +
            "official terminal report remarks for students. Your remarks must be:\n" +
            "- Professional and encouraging in tone\n" +
            "- Specific to the student's actual performance data provided\n" +
            "- Written in formal British English (used in Ghanaian schools)\n" +
            "- Between 2-3 sentences maximum\n" +
            "- Constructive even for poor performers\n" +
            "- Culturally appropriate for the Ghana Education Service context\n" +
            "- Never mention specific scores or numbers directly\n" +
            "- Focus on effort, attitude, potential and areas for growth\n" +
            "Do not add any preamble or explanation. Return only the remark text.";

    private static final String CONDUCT_SYSTEM_PROMPT =
            "You are assessing student conduct for a Ghanaian SHS terminal report.\n" +
            "Return ONLY one of these exact values (nothing else):\n" +
            "Excellent, Very Good, Good, Fair, Poor\n" +
            "Base your assessment on the data provided.";

    private static final String HEADMASTER_SYSTEM_PROMPT =
            "You are a Senior High School Headmaster in Ghana writing brief " +
            "terminal report remarks. Be encouraging, brief (1-2 sentences), " +
            "and formal. Return only the remark text.";

    private static final Set<String> VALID_CONDUCT_RATINGS =
            Set.of("Excellent", "Very Good", "Good", "Fair", "Poor");

    private static final String CONDUCT_ASSESSMENT_SYSTEM_PROMPT =
            "You are a Senior High School teacher in Ghana writing a conduct assessment " +
            "for a student's terminal report. Be professional, constructive, and concise. " +
            "Return only the assessment text (1-2 sentences). No JSON, no preamble.";

    private static final long ASSESSMENT_CACHE_TTL_HOURS = 4;

    /** key = "studentId_termId", value = {text, cachedAt} */
    private final Map<String, Object[]> conductAssessmentCache = new ConcurrentHashMap<>();

    // ================================================================
    // CLASS TEACHER REMARK
    // ================================================================

    public String generateClassTeacherRemark(StudentRemarkContext ctx) {
        try {
            String userMessage = buildClassTeacherMessage(ctx);
            return sanitizeAiContent(claudeApiClient.sendMessage(CLASS_TEACHER_SYSTEM_PROMPT, userMessage));
        } catch (AiServiceException e) {
            log.warn("AI remark generation failed for student {}: {}", ctx.getStudentId(), e.getMessage());
            return buildFallbackRemark(ctx);
        }
    }

    // ================================================================
    // CONDUCT RATING
    // ================================================================

    public String generateConductRating(ConductContext ctx) {
        try {
            String userMessage = buildConductMessage(ctx);
            String response = claudeApiClient.sendMessage(CONDUCT_SYSTEM_PROMPT, userMessage);
            String trimmed = response.trim();

            // Validate the response is one of the allowed values
            if (VALID_CONDUCT_RATINGS.contains(trimmed)) {
                return trimmed;
            }

            // Try to extract a valid rating from the response
            for (String rating : VALID_CONDUCT_RATINGS) {
                if (trimmed.contains(rating)) {
                    return rating;
                }
            }

            log.warn("AI returned invalid conduct rating '{}', falling back to local logic", trimmed);
            return deriveConductLocally(ctx);
        } catch (AiServiceException e) {
            log.warn("AI conduct rating failed: {}", e.getMessage());
            return deriveConductLocally(ctx);
        }
    }

    // ================================================================
    // HEADMASTER REMARK
    // ================================================================

    public String generateHeadmasterRemark(HeadmasterRemarkContext ctx) {
        try {
            String userMessage = buildHeadmasterMessage(ctx);
            return sanitizeAiContent(claudeApiClient.sendMessage(HEADMASTER_SYSTEM_PROMPT, userMessage));
        } catch (AiServiceException e) {
            log.warn("AI headmaster remark failed: {}", e.getMessage());
            return buildFallbackHeadmasterRemark(ctx);
        }
    }

    // ================================================================
    // BATCH GENERATION
    // ================================================================

    public List<StudentRemarkResult> generateRemarksForClass(List<StudentRemarkContext> contexts) {
        List<StudentRemarkResult> results = new ArrayList<>();

        for (int i = 0; i < contexts.size(); i++) {
            StudentRemarkContext ctx = contexts.get(i);
            boolean aiGenerated = true;

            String classTeacherRemark;
            String conductRating;
            String headmasterRemark;

            try {
                classTeacherRemark = generateClassTeacherRemark(ctx);
            } catch (Exception e) {
                classTeacherRemark = buildFallbackRemark(ctx);
                aiGenerated = false;
            }

            // Build conduct context from the student remark context
            ConductContext conductCtx = ConductContext.builder()
                    .attendancePercentage(ctx.getAttendancePercentage())
                    .disciplineIssueCount(0)
                    .highSeverityCount(0)
                    .achievementCount(0)
                    .behaviorNotes(ctx.getBehaviorSummary())
                    .gpaTrend(determineTrend(ctx.getGpa(), ctx.getPreviousGpa()))
                    .build();

            try {
                conductRating = generateConductRating(conductCtx);
            } catch (Exception e) {
                conductRating = deriveConductLocally(conductCtx);
                aiGenerated = false;
            }

            HeadmasterRemarkContext hmCtx = HeadmasterRemarkContext.builder()
                    .classification(ctx.getClassification())
                    .gpa(ctx.getGpa())
                    .conductRating(conductRating)
                    .attendancePercentage(ctx.getAttendancePercentage())
                    .positionInClass(ctx.getPositionInClass())
                    .totalStudentsInClass(ctx.getTotalStudentsInClass())
                    .build();

            try {
                headmasterRemark = generateHeadmasterRemark(hmCtx);
            } catch (Exception e) {
                headmasterRemark = buildFallbackHeadmasterRemark(hmCtx);
                aiGenerated = false;
            }

            results.add(StudentRemarkResult.builder()
                    .studentId(ctx.getStudentId())
                    .classTeacherRemark(classTeacherRemark)
                    .conductRating(conductRating)
                    .headmasterRemark(headmasterRemark)
                    .aiGenerated(aiGenerated)
                    .generatedAt(LocalDateTime.now())
                    .build());

            // Rate limiting: 200ms delay between students (3 calls each)
            if (i < contexts.size() - 1) {
                try {
                    Thread.sleep(200);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        return results;
    }

    // ================================================================
    // MESSAGE BUILDERS
    // ================================================================

    private String buildClassTeacherMessage(StudentRemarkContext ctx) {
        String trend = determineTrend(ctx.getGpa(), ctx.getPreviousGpa());
        String previousGpaStr = ctx.getPreviousGpa() != null
                ? String.format("%.2f", ctx.getPreviousGpa())
                : "First term";
        String failedStr = (ctx.getFailedSubjectNames() != null && !ctx.getFailedSubjectNames().isEmpty())
                ? String.join(", ", ctx.getFailedSubjectNames())
                : "None";

        return "Generate a class teacher's terminal report remark for this student:\n\n" +
                "Student Performance Data:\n" +
                "- Name: " + ctx.getStudentFirstName() + "\n" +
                "- GPA This Term: " + String.format("%.2f", ctx.getGpa()) +
                    " out of 4.0 (" + ctx.getClassification() + ")\n" +
                "- GPA Last Term: " + previousGpaStr + "\n" +
                "- Trend: " + trend + "\n" +
                "- Subjects Passed: " + ctx.getSubjectsPassed() + " out of " + ctx.getTotalSubjects() + "\n" +
                "- Failed Subjects: " + failedStr + "\n" +
                "- Best Subject: " + ctx.getBestSubjectName() + " (" + ctx.getBestSubjectGrade() + ")\n" +
                "- Weakest Subject: " + ctx.getWeakestSubjectName() + " (" + ctx.getWeakestSubjectGrade() + ")\n" +
                "- Attendance Rate: " + String.format("%.1f", ctx.getAttendancePercentage()) + "%\n" +
                "- Behavior This Term: " + ctx.getBehaviorSummary() + "\n" +
                "- Position in Class: " + ctx.getPositionInClass() + " out of " + ctx.getTotalStudentsInClass();
    }

    private String buildConductMessage(ConductContext ctx) {
        return "Assess this student's conduct rating:\n" +
                "- Attendance: " + String.format("%.1f", ctx.getAttendancePercentage()) + "%\n" +
                "- Discipline Issues This Term: " + ctx.getDisciplineIssueCount() +
                    " (" + ctx.getHighSeverityCount() + " high severity)\n" +
                "- Achievements Logged: " + ctx.getAchievementCount() + "\n" +
                "- Behavior Notes: " + (ctx.getBehaviorNotes() != null ? ctx.getBehaviorNotes() : "None") + "\n" +
                "- Academic Effort (based on GPA trend): " + ctx.getGpaTrend();
    }

    private String buildHeadmasterMessage(HeadmasterRemarkContext ctx) {
        return "Write a headmaster's remark for a student with:\n" +
                "- Overall performance: " + ctx.getClassification() + "\n" +
                "- GPA: " + String.format("%.2f", ctx.getGpa()) + "\n" +
                "- Conduct rating: " + ctx.getConductRating() + "\n" +
                "- Attendance: " + String.format("%.1f", ctx.getAttendancePercentage()) + "%\n" +
                "- Class position: " + ctx.getPositionInClass() + " of " + ctx.getTotalStudentsInClass();
    }

    // ================================================================
    // FALLBACKS
    // ================================================================

    private String buildFallbackRemark(StudentRemarkContext ctx) {
        double gpa = ctx.getGpa() != null ? ctx.getGpa() : 0;
        String effort = gpa >= 3.0 ? "commendable" : gpa >= 2.0 ? "reasonable" : "some";
        return ctx.getStudentFirstName() + " has shown " + effort + " effort this term. " +
                "Continue to work hard and seek assistance in areas of difficulty.";
    }

    private String buildFallbackHeadmasterRemark(HeadmasterRemarkContext ctx) {
        if (ctx.getGpa() != null && ctx.getGpa() >= 3.0) {
            return "An excellent performance. Keep it up and continue to be a role model to your peers.";
        } else if (ctx.getGpa() != null && ctx.getGpa() >= 2.0) {
            return "A satisfactory performance. With more effort and dedication, greater heights can be attained.";
        }
        return "There is room for improvement. Work harder next term and seek help where needed.";
    }

    private String deriveConductLocally(ConductContext ctx) {
        if (ctx.getHighSeverityCount() != null && ctx.getHighSeverityCount() > 0) return "Poor";
        if (ctx.getAttendancePercentage() != null && ctx.getAttendancePercentage() < 75.0) return "Fair";
        if (ctx.getDisciplineIssueCount() != null && ctx.getDisciplineIssueCount() >= 3) return "Fair";
        if (ctx.getDisciplineIssueCount() != null && ctx.getDisciplineIssueCount() >= 1) return "Good";
        if (ctx.getAttendancePercentage() != null && ctx.getAttendancePercentage() >= 90.0) return "Excellent";
        return "Very Good";
    }

    // ================================================================
    // CONDUCT ASSESSMENT (cached, 4h TTL)
    // ================================================================

    public String generateConductAssessment(Student student, Term term,
                                             List<BehaviorLog> logs, int conductScore,
                                             double attendanceRate) {
        String cacheKey = student.getId() + "_" + term.getId();
        Object[] cached = conductAssessmentCache.get(cacheKey);

        if (cached != null) {
            LocalDateTime cachedAt = (LocalDateTime) cached[1];
            if (LocalDateTime.now().isBefore(cachedAt.plusHours(ASSESSMENT_CACHE_TTL_HOURS))) {
                return (String) cached[0];
            }
        }

        String assessment;
        try {
            String prompt = buildConductAssessmentPrompt(student, term, logs, conductScore, attendanceRate);
            assessment = sanitizeAiContent(claudeApiClient.sendMessage(CONDUCT_ASSESSMENT_SYSTEM_PROMPT, prompt));
        } catch (AiServiceException e) {
            log.warn("AI conduct assessment failed for student {}: {}",
                    student.getStudentIndex(), e.getMessage());
            assessment = null;
        }

        if (assessment == null || assessment.isBlank()) {
            return null;
        }

        conductAssessmentCache.put(cacheKey, new Object[]{assessment, LocalDateTime.now()});
        return assessment;
    }

    private String buildConductAssessmentPrompt(Student student, Term term,
                                                 List<BehaviorLog> logs, int conductScore,
                                                 double attendanceRate) {
        long achievements = logs.stream()
                .filter(l -> "ACHIEVEMENT".equalsIgnoreCase(l.getLogType())).count();
        long discipline = logs.stream()
                .filter(l -> "DISCIPLINE_ISSUE".equalsIgnoreCase(l.getLogType())).count();
        long highSeverity = logs.stream()
                .filter(l -> "DISCIPLINE_ISSUE".equalsIgnoreCase(l.getLogType())
                        && "HIGH".equalsIgnoreCase(l.getSeverity())).count();

        String recentIssue = logs.stream()
                .filter(l -> "DISCIPLINE_ISSUE".equalsIgnoreCase(l.getLogType()))
                .max(Comparator.comparing(BehaviorLog::getLoggedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(BehaviorLog::getTitle).orElse("None");

        String notableAchievement = logs.stream()
                .filter(l -> "ACHIEVEMENT".equalsIgnoreCase(l.getLogType()))
                .max(Comparator.comparing(BehaviorLog::getLoggedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(BehaviorLog::getTitle).orElse("None");

        return "Write a brief conduct assessment for a Ghanaian SHS student's terminal report " +
                "based on this behavioral data:\n\n" +
                "BEHAVIOR LOG SUMMARY:\n" +
                "- Student: " + student.getUser().getFirstName() + "\n" +
                "- Term: " + term.getTermType().name().replace("_", " ") + "\n" +
                "- Achievements: " + achievements + "\n" +
                "- Discipline Issues: " + discipline +
                    " (HIGH severity: " + highSeverity + ")\n" +
                "- Most Recent Issue: " + recentIssue + "\n" +
                "- Most Notable Achievement: " + notableAchievement + "\n" +
                "- Attendance Rate: " + String.format("%.1f%%", attendanceRate) + "\n" +
                "- Calculated Conduct Score: " + conductScore + "/100\n\n" +
                "Write 1-2 sentences assessing the student's conduct. " +
                "Be professional and constructive. Return only the assessment text.";
    }

    private String sanitizeAiContent(String rawContent) {
        if (rawContent == null) return null;
        // Strip HTML tags
        String cleaned = rawContent.replaceAll("<[^>]*>", "");
        // Limit length
        if (cleaned.length() > 500) {
            cleaned = cleaned.substring(0, 497) + "...";
        }
        return cleaned.trim();
    }

    private String determineTrend(Double currentGpa, Double previousGpa) {
        if (previousGpa == null || currentGpa == null) return "First term";
        double diff = currentGpa - previousGpa;
        if (diff > 0.1) return "Improving";
        if (diff < -0.1) return "Declining";
        return "Stable";
    }
}
