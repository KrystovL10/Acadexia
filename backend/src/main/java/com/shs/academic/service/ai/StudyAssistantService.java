package com.shs.academic.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shs.academic.exception.AiServiceException;
import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.ai.*;
import com.shs.academic.model.entity.*;
import com.shs.academic.repository.*;
import com.shs.academic.util.GpaCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudyAssistantService {

    private final ClaudeApiClient claudeApiClient;
    private final StudentRepository studentRepository;
    private final ScoreRepository scoreRepository;
    private final TermResultRepository termResultRepository;
    private final CumulativeGPARepository cumulativeGPARepository;
    private final AttendanceRepository attendanceRepository;
    private final ObjectMapper objectMapper;

    private static final String STUDY_SYSTEM_PROMPT =
            "You are a friendly and encouraging academic advisor for Senior High " +
            "School students in Ghana. You help students understand their " +
            "performance and give practical study advice. Your responses must be:\n" +
            "- Encouraging and positive even when addressing weaknesses\n" +
            "- Practical and specific to the Ghana SHS curriculum\n" +
            "- Written for a teenage student audience (simple, clear language)\n" +
            "- Brief and actionable (not overwhelming)\n" +
            "- Culturally relevant to Ghanaian students\n" +
            "Never be discouraging or negative. Focus on growth and improvement.";

    // ================================================================
    // STUDENT INSIGHTS
    // ================================================================

    @Transactional(readOnly = true)
    @Cacheable(value = "studentInsights", key = "#studentId + '_' + #termId")
    public StudentInsightsDto getStudentInsights(Long studentId, Long termId) {
        try {
            String userMessage = buildInsightsMessage(studentId, termId);
            String response = claudeApiClient.sendMessage(STUDY_SYSTEM_PROMPT, userMessage);
            StudentInsightsDto dto = parseInsightsResponse(response);
            dto.setGeneratedAt(LocalDateTime.now());
            return dto;
        } catch (AiServiceException e) {
            log.warn("AI student insights failed for student {}: {}", studentId, e.getMessage());
            return buildFallbackInsights(studentId, termId);
        }
    }

    // ================================================================
    // CONVERSATIONAL CHAT
    // ================================================================

    @Transactional(readOnly = true)
    public String chatWithStudyAssistant(Long studentId, String userMessage,
                                          List<ChatMessageDto> history) {
        String contextHeader = buildStudentContextHeader(studentId);
        String fullSystemPrompt = STUDY_SYSTEM_PROMPT + "\n\n" + contextHeader;

        // Build message history for multi-turn
        List<Map<String, String>> messages = new ArrayList<>();
        if (history != null) {
            for (ChatMessageDto msg : history) {
                messages.add(Map.of("role", msg.getRole(), "content", msg.getContent()));
            }
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        try {
            return claudeApiClient.sendMessageWithHistory(fullSystemPrompt, messages);
        } catch (AiServiceException e) {
            log.warn("AI chat failed for student {}: {}", studentId, e.getMessage());
            return "I'm sorry, I'm having trouble connecting right now. " +
                    "Please try again in a moment. In the meantime, check your study tips " +
                    "on the insights page for helpful guidance!";
        }
    }

    // ================================================================
    // MESSAGE BUILDERS
    // ================================================================

    private String buildInsightsMessage(Long studentId, Long termId) {
        // Current term scores
        List<Score> currentScores = scoreRepository.findByStudentIdAndTermId(studentId, termId);
        TermResult currentResult = termResultRepository.findByStudentIdAndTermId(studentId, termId)
                .orElse(null);

        // Previous term for comparison
        List<TermResult> history = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(studentId);
        TermResult previousResult = findPreviousResult(history, termId);

        // Previous scores for subject comparison
        List<Score> previousScores = previousResult != null
                ? scoreRepository.findByStudentIdAndTermId(studentId, previousResult.getTerm().getId())
                : Collections.emptyList();

        // Attendance
        Long present = attendanceRepository.countByStudentIdAndTermIdAndIsPresent(studentId, termId, true);
        Long absent = attendanceRepository.countByStudentIdAndTermIdAndIsPresent(studentId, termId, false);
        long totalDays = (present != null ? present : 0) + (absent != null ? absent : 0);
        double attendancePct = totalDays > 0 ? (present != null ? present : 0) * 100.0 / totalDays : 100.0;

        double gpa = currentResult != null && currentResult.getGpa() != null ? currentResult.getGpa() : 0;
        String classification = GpaCalculator.getClassification(gpa);

        StringBuilder sb = new StringBuilder();
        sb.append("Analyze this student's academic performance and provide insights:\n\n");

        // Current term performance
        sb.append("CURRENT TERM PERFORMANCE:\n");
        sb.append("- GPA: ").append(String.format("%.2f", gpa)).append(" (").append(classification).append(")\n");
        if (currentResult != null && currentResult.getPositionInClass() != null) {
            sb.append("- Position in Class: ").append(currentResult.getPositionInClass())
                    .append(" of ").append(currentResult.getTotalStudentsInClass()).append("\n");
        }

        List<Score> validScores = currentScores.stream()
                .filter(s -> !s.isAbsent() && s.getTotalScore() != null)
                .toList();
        for (Score s : validScores) {
            sb.append("  ").append(s.getSubject().getName()).append(": Total=")
                    .append(String.format("%.0f", s.getTotalScore())).append("/100, Grade=")
                    .append(s.getGrade()).append("\n");
        }
        sb.append("\n");

        // Previous term
        sb.append("PREVIOUS TERM (for comparison):\n");
        if (previousResult != null && previousResult.getGpa() != null) {
            double prevGpa = previousResult.getGpa();
            double diff = gpa - prevGpa;
            String trend = diff > 0.1 ? "Improving" : diff < -0.1 ? "Declining" : "Stable";
            sb.append("- Previous GPA: ").append(String.format("%.2f", prevGpa)).append("\n");
            sb.append("- Trend: ").append(trend).append(" by ")
                    .append(String.format("%.2f", Math.abs(diff))).append(" points\n");
        } else {
            sb.append("- No previous term data available\n");
        }
        sb.append("\n");

        // Strengths and weaknesses
        sb.append("STRENGTHS AND WEAKNESSES:\n");
        List<Score> strong = validScores.stream()
                .filter(s -> s.getGrade() != null && (s.getGrade().startsWith("A") || s.getGrade().startsWith("B")))
                .toList();
        List<Score> weak = validScores.stream()
                .filter(s -> s.getGrade() != null && (s.getGrade().startsWith("D") || s.getGrade().startsWith("E") || s.getGrade().startsWith("F")))
                .toList();

        sb.append("- Strongest subjects (grade A/B): ");
        sb.append(strong.isEmpty() ? "None" : strong.stream().map(s -> s.getSubject().getName()).collect(Collectors.joining(", ")));
        sb.append("\n");
        sb.append("- Weakest subjects (grade D/E/F): ");
        sb.append(weak.isEmpty() ? "None" : weak.stream().map(s -> s.getSubject().getName()).collect(Collectors.joining(", ")));
        sb.append("\n");

        // Most improved/declined
        if (!previousScores.isEmpty()) {
            Map<String, Double> prevScoreMap = previousScores.stream()
                    .filter(s -> !s.isAbsent() && s.getTotalScore() != null)
                    .collect(Collectors.toMap(s -> s.getSubject().getName(), Score::getTotalScore, (a, b) -> a));

            double maxImprove = Double.MIN_VALUE;
            double maxDecline = Double.MAX_VALUE;
            String improvedSubject = null, declinedSubject = null;

            for (Score s : validScores) {
                Double prev = prevScoreMap.get(s.getSubject().getName());
                if (prev != null) {
                    double delta = s.getTotalScore() - prev;
                    if (delta > maxImprove) { maxImprove = delta; improvedSubject = s.getSubject().getName(); }
                    if (delta < maxDecline) { maxDecline = delta; declinedSubject = s.getSubject().getName(); }
                }
            }
            if (improvedSubject != null && maxImprove > 0) {
                sb.append("- Most improved: ").append(improvedSubject).append(" (+").append(String.format("%.0f", maxImprove)).append(" points)\n");
            }
            if (declinedSubject != null && maxDecline < 0) {
                sb.append("- Most declined: ").append(declinedSubject).append(" (").append(String.format("%.0f", maxDecline)).append(" points)\n");
            }
        }
        sb.append("\n");

        sb.append("ATTENDANCE: ").append(String.format("%.1f", attendancePct)).append("%\n\n");

        sb.append("Respond with this exact JSON:\n");
        sb.append("{\n");
        sb.append("  \"summary\": \"2-3 encouraging sentences about overall performance\",\n");
        sb.append("  \"strengths\": [\"strength1\", \"strength2\", \"strength3\"],\n");
        sb.append("  \"areasForImprovement\": [\"area1\", \"area2\"],\n");
        sb.append("  \"studyTips\": [\n");
        sb.append("    { \"subject\": \"subject name\", \"tip\": \"specific actionable study tip\", \"weeklyHours\": 3 }\n");
        sb.append("  ],\n");
        sb.append("  \"motivationalMessage\": \"A brief encouraging closing message\",\n");
        sb.append("  \"weeklyStudyPlan\": {\n");
        sb.append("    \"totalHoursRecommended\": 20,\n");
        sb.append("    \"breakdown\": [\n");
        sb.append("      { \"subject\": \"name\", \"hours\": 3, \"focus\": \"what to focus on\" }\n");
        sb.append("    ]\n");
        sb.append("  }\n");
        sb.append("}");

        return sb.toString();
    }

    private String buildStudentContextHeader(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));

        List<Score> allScores = scoreRepository.findByStudentId(studentId);
        CumulativeGPA cgpa = cumulativeGPARepository.findByStudentId(studentId).orElse(null);

        // Find strongest and weakest by average
        Map<String, DoubleSummaryStatistics> subjectStats = allScores.stream()
                .filter(s -> !s.isAbsent() && s.getTotalScore() != null)
                .collect(Collectors.groupingBy(
                        s -> s.getSubject().getName(),
                        Collectors.summarizingDouble(Score::getTotalScore)));

        String strongest = subjectStats.entrySet().stream()
                .max(Comparator.comparingDouble(e -> e.getValue().getAverage()))
                .map(Map.Entry::getKey).orElse("N/A");
        String weakest = subjectStats.entrySet().stream()
                .min(Comparator.comparingDouble(e -> e.getValue().getAverage()))
                .map(Map.Entry::getKey).orElse("N/A");

        String yearGroup = student.getCurrentYearGroup() != null
                ? student.getCurrentYearGroup().name() : "N/A";
        String programme = student.getCurrentProgram() != null
                ? student.getCurrentProgram().getDisplayName() : "N/A";

        return "STUDENT CONTEXT (use this to personalize responses):\n" +
                "- Current GPA: " + (cgpa != null && cgpa.getCgpa() != null ? String.format("%.2f", cgpa.getCgpa()) : "N/A") + "\n" +
                "- Strongest Subject: " + strongest + "\n" +
                "- Weakest Subject: " + weakest + "\n" +
                "- Year Group: " + yearGroup + "\n" +
                "- Programme: " + programme;
    }

    // ================================================================
    // RESPONSE PARSING
    // ================================================================

    private StudentInsightsDto parseInsightsResponse(String response) {
        try {
            String json = extractJson(response);
            JsonNode root = objectMapper.readTree(json);

            List<StudyTipDto> studyTips = new ArrayList<>();
            if (root.has("studyTips") && root.get("studyTips").isArray()) {
                for (JsonNode node : root.get("studyTips")) {
                    studyTips.add(StudyTipDto.builder()
                            .subject(textOrNull(node, "subject"))
                            .tip(textOrNull(node, "tip"))
                            .weeklyHours(node.has("weeklyHours") ? node.get("weeklyHours").asInt() : 2)
                            .build());
                }
            }

            WeeklyStudyPlanDto studyPlan = null;
            if (root.has("weeklyStudyPlan")) {
                JsonNode wp = root.get("weeklyStudyPlan");
                List<WeeklyStudyPlanDto.SubjectStudyBreakdownDto> breakdown = new ArrayList<>();
                if (wp.has("breakdown") && wp.get("breakdown").isArray()) {
                    for (JsonNode node : wp.get("breakdown")) {
                        breakdown.add(WeeklyStudyPlanDto.SubjectStudyBreakdownDto.builder()
                                .subject(textOrNull(node, "subject"))
                                .hours(node.has("hours") ? node.get("hours").asInt() : 2)
                                .focus(textOrNull(node, "focus"))
                                .build());
                    }
                }
                studyPlan = WeeklyStudyPlanDto.builder()
                        .totalHoursRecommended(wp.has("totalHoursRecommended") ? wp.get("totalHoursRecommended").asInt() : 20)
                        .breakdown(breakdown)
                        .build();
            }

            return StudentInsightsDto.builder()
                    .summary(textOrNull(root, "summary"))
                    .strengths(parseStringList(root, "strengths"))
                    .areasForImprovement(parseStringList(root, "areasForImprovement"))
                    .studyTips(studyTips)
                    .motivationalMessage(textOrNull(root, "motivationalMessage"))
                    .weeklyStudyPlan(studyPlan)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse student insights response: {}", e.getMessage());
            throw new AiServiceException("Failed to parse AI response", e);
        }
    }

    // ================================================================
    // FALLBACKS
    // ================================================================

    private StudentInsightsDto buildFallbackInsights(Long studentId, Long termId) {
        TermResult tr = termResultRepository.findByStudentIdAndTermId(studentId, termId).orElse(null);
        double gpa = (tr != null && tr.getGpa() != null) ? tr.getGpa() : 0;
        String classification = GpaCalculator.getClassification(gpa);

        String summary = String.format(
                "Your GPA this term is %.2f (%s). Keep working hard and stay focused on your goals!",
                gpa, classification);

        List<String> strengths = new ArrayList<>();
        List<String> areas = new ArrayList<>();

        if (gpa >= 3.0) strengths.add("Strong overall academic performance");
        if (gpa >= 2.0) strengths.add("Meeting pass requirements");
        if (gpa < 2.0) areas.add("Overall GPA needs improvement — focus on your weakest subjects");

        return StudentInsightsDto.builder()
                .summary(summary)
                .strengths(strengths.isEmpty() ? List.of("Commitment to your studies") : strengths)
                .areasForImprovement(areas.isEmpty() ? List.of("Continue building on your strengths") : areas)
                .studyTips(Collections.emptyList())
                .motivationalMessage("Every day is a chance to learn something new. Keep going!")
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // ================================================================
    // HELPERS
    // ================================================================

    private TermResult findPreviousResult(List<TermResult> history, Long currentTermId) {
        TermResult previous = null;
        for (TermResult r : history) {
            if (r.getTerm().getId().equals(currentTermId)) break;
            if (r.getGpa() != null) previous = r;
        }
        return previous;
    }

    private String extractJson(String response) {
        String trimmed = response.trim();
        if (trimmed.startsWith("```json")) trimmed = trimmed.substring(7);
        else if (trimmed.startsWith("```")) trimmed = trimmed.substring(3);
        if (trimmed.endsWith("```")) trimmed = trimmed.substring(0, trimmed.length() - 3);
        return trimmed.trim();
    }

    private String textOrNull(JsonNode node, String field) {
        if (node.has(field) && !node.get(field).isNull()) {
            return node.get(field).asText();
        }
        return null;
    }

    private List<String> parseStringList(JsonNode root, String field) {
        List<String> list = new ArrayList<>();
        if (root.has(field) && root.get(field).isArray()) {
            for (JsonNode node : root.get(field)) {
                list.add(node.asText());
            }
        }
        return list;
    }
}
