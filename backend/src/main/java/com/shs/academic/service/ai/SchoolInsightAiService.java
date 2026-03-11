package com.shs.academic.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shs.academic.exception.AiServiceException;
import com.shs.academic.model.dto.ai.*;
import com.shs.academic.model.dto.stats.*;
import com.shs.academic.model.entity.TermResult;
import com.shs.academic.model.enums.WarningLevel;
import com.shs.academic.repository.EarlyWarningRepository;
import com.shs.academic.repository.ScoreRepository;
import com.shs.academic.repository.TermResultRepository;
import com.shs.academic.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SchoolInsightAiService {

    private final ClaudeApiClient claudeApiClient;
    private final StatisticsService statisticsService;
    private final ScoreRepository scoreRepository;
    private final TermResultRepository termResultRepository;
    private final EarlyWarningRepository earlyWarningRepository;
    private final ObjectMapper objectMapper;

    private static final String SCHOOL_SYSTEM_PROMPT =
            "You are an academic performance analyst for Senior High Schools " +
            "in Ghana. You analyze student performance data and provide " +
            "actionable insights for school administrators. Your insights must be:\n" +
            "- Data-driven and specific\n" +
            "- Actionable with clear recommendations\n" +
            "- Formatted as structured JSON only\n" +
            "- Relevant to the Ghana Education Service context\n" +
            "- Professional and concise\n" +
            "Always respond with valid JSON. No explanations outside the JSON.";

    private static final String CLASS_SYSTEM_PROMPT =
            "You are an academic performance analyst for a Senior High School class " +
            "in Ghana. You analyze class performance data and provide " +
            "actionable insights for the class teacher. Your insights must be:\n" +
            "- Data-driven and specific to this class\n" +
            "- Actionable with clear recommendations\n" +
            "- Formatted as structured JSON only\n" +
            "- Relevant to the Ghana Education Service context\n" +
            "- Professional and concise\n" +
            "Always respond with valid JSON. No explanations outside the JSON.";

    // ================================================================
    // SCHOOL-WIDE INSIGHTS
    // ================================================================

    @Transactional(readOnly = true)
    @Cacheable(value = "schoolInsights", key = "#schoolId + '_' + #termId")
    public SchoolInsightsDto generateSchoolInsights(Long schoolId, Long termId) {
        try {
            String userMessage = buildSchoolInsightsMessage(schoolId, termId);
            String response = claudeApiClient.sendMessage(SCHOOL_SYSTEM_PROMPT, userMessage);
            SchoolInsightsDto dto = parseSchoolInsightsResponse(response);
            dto.setSchoolId(schoolId);
            dto.setTermId(termId);
            dto.setGeneratedAt(LocalDateTime.now());
            return dto;
        } catch (AiServiceException e) {
            log.error("AI school insights generation failed: {}", e.getMessage());
            return buildFallbackSchoolInsights(schoolId, termId);
        }
    }

    @CacheEvict(value = "schoolInsights", key = "#schoolId + '_' + #termId")
    public void invalidateSchoolInsights(Long schoolId, Long termId) {
        log.info("Invalidated school insights cache for school={}, term={}", schoolId, termId);
    }

    // ================================================================
    // CLASS-LEVEL INSIGHTS
    // ================================================================

    @Transactional(readOnly = true)
    @Cacheable(value = "classInsights", key = "#classRoomId + '_' + #termId")
    public ClassInsightsDto generateClassInsights(Long classRoomId, Long termId) {
        try {
            String userMessage = buildClassInsightsMessage(classRoomId, termId);
            String response = claudeApiClient.sendMessage(CLASS_SYSTEM_PROMPT, userMessage);
            ClassInsightsDto dto = parseClassInsightsResponse(response);
            dto.setClassRoomId(classRoomId);
            dto.setTermId(termId);
            dto.setGeneratedAt(LocalDateTime.now());
            return dto;
        } catch (AiServiceException e) {
            log.error("AI class insights generation failed: {}", e.getMessage());
            return buildFallbackClassInsights(classRoomId, termId);
        }
    }

    @CacheEvict(value = "classInsights", key = "#classRoomId + '_' + #termId")
    public void invalidateClassInsights(Long classRoomId, Long termId) {
        log.info("Invalidated class insights cache for class={}, term={}", classRoomId, termId);
    }

    // ================================================================
    // SCHOOL MESSAGE BUILDER
    // ================================================================

    private String buildSchoolInsightsMessage(Long schoolId, Long termId) {
        AdminDashboardStatsDto stats = statisticsService.getAdminDashboardStats(schoolId, termId);
        List<SubjectWeaknessDto> weakSubjects = statisticsService.getSubjectWeaknessAnalysis(schoolId, termId);
        List<TermComparisonDto> termTrends = statisticsService.getTermComparisonData(schoolId);

        Long criticalWarnings = earlyWarningRepository.countByTermIdAndWarningLevel(termId, WarningLevel.CRITICAL);
        Long highWarnings = earlyWarningRepository.countByTermIdAndWarningLevel(termId, WarningLevel.HIGH);

        // Warning type breakdown
        Map<String, Long> warningTypeBreakdown = new HashMap<>();
        for (Object[] row : earlyWarningRepository.countUnresolvedByWarningType(termId)) {
            warningTypeBreakdown.put((String) row[0], (Long) row[1]);
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Analyze this school's academic performance data and generate insights.\n\n");

        // School performance summary
        sb.append("SCHOOL PERFORMANCE SUMMARY:\n");
        sb.append("- Total Students: ").append(stats.getTotalStudents()).append("\n");
        sb.append("- School Average GPA: ").append(formatGpa(stats.getAverageSchoolGpa())).append(" / 4.0\n");
        sb.append("- Pass Rate: ").append(formatPct(stats.getPassRate())).append("%\n");
        sb.append("- Active Early Warnings: ").append(stats.getActiveWarnings())
                .append(" (").append(criticalWarnings).append(" critical, ")
                .append(highWarnings).append(" high)\n\n");

        // Year group performance
        sb.append("YEAR GROUP PERFORMANCE:\n");
        for (YearGroupStatsDto yg : stats.getByYearGroup()) {
            sb.append("- ").append(yg.getYearGroup())
                    .append(": Avg GPA ").append(formatGpa(yg.getAvgGpa()))
                    .append(", Pass Rate ").append(formatPct(yg.getPassRate())).append("%\n");
        }
        sb.append("\n");

        // Subject performance (bottom 5)
        sb.append("SUBJECT PERFORMANCE (bottom 5 subjects by pass rate):\n");
        List<SubjectWeaknessDto> bottom5 = weakSubjects.stream()
                .sorted(Comparator.comparingDouble(SubjectWeaknessDto::getFailureRate).reversed())
                .limit(5).toList();
        for (SubjectWeaknessDto ws : bottom5) {
            sb.append("- ").append(ws.getSubjectName())
                    .append(": Avg Score ").append(formatPct(ws.getAvgScore()))
                    .append(", Failure Rate ").append(formatPct(ws.getFailureRate())).append("%")
                    .append(", Affected Classes ").append(ws.getAffectedClasses()).append("\n");
        }
        sb.append("\n");

        // Term trend
        sb.append("TERM-OVER-TERM TREND:\n");
        for (TermComparisonDto tc : termTrends) {
            sb.append("- ").append(tc.getTermLabel())
                    .append(": SHS1=").append(formatGpa(tc.getShs1Avg()))
                    .append(", SHS2=").append(formatGpa(tc.getShs2Avg()))
                    .append(", SHS3=").append(formatGpa(tc.getShs3Avg())).append("\n");
        }
        sb.append("\n");

        // Early warnings breakdown
        sb.append("EARLY WARNINGS BREAKDOWN:\n");
        sb.append("- Failing Multiple Subjects: ").append(warningTypeBreakdown.getOrDefault("FAILING_MULTIPLE_SUBJECTS", 0L)).append(" students\n");
        sb.append("- GPA Decline: ").append(warningTypeBreakdown.getOrDefault("GPA_DECLINE", 0L)
                + warningTypeBreakdown.getOrDefault("CONSECUTIVE_DECLINE", 0L)).append(" students\n");
        sb.append("- Attendance Issues: ").append(warningTypeBreakdown.getOrDefault("ATTENDANCE_ISSUE", 0L)).append(" students\n");
        sb.append("- Behavioral Concerns: ").append(warningTypeBreakdown.getOrDefault("BEHAVIORAL_CONCERN", 0L)).append(" students\n\n");

        sb.append("Respond with JSON in this exact structure:\n");
        sb.append("{\n");
        sb.append("  \"summary\": \"A 2-3 sentence overall narrative of school performance\",\n");
        sb.append("  \"insights\": [\n");
        sb.append("    {\n");
        sb.append("      \"category\": \"PERFORMANCE|WARNING|TREND|RECOMMENDATION|ACHIEVEMENT\",\n");
        sb.append("      \"title\": \"Brief insight title\",\n");
        sb.append("      \"body\": \"2-4 sentence insight explanation\",\n");
        sb.append("      \"affectedScope\": \"e.g. Affects 23 students or SHS2 Science\",\n");
        sb.append("      \"suggestedAction\": \"Specific recommended action or null\",\n");
        sb.append("      \"priority\": \"HIGH|MEDIUM|LOW\"\n");
        sb.append("    }\n");
        sb.append("  ],\n");
        sb.append("  \"waecReadiness\": {\n");
        sb.append("    \"overallReadiness\": \"HIGH|MEDIUM|LOW\",\n");
        sb.append("    \"shs3AtRiskCount\": 0,\n");
        sb.append("    \"criticalSubjects\": [\"subject1\", \"subject2\"],\n");
        sb.append("    \"recommendation\": \"Brief WAEC readiness recommendation\"\n");
        sb.append("  }\n");
        sb.append("}\n");
        sb.append("Generate between 5-8 insights covering different aspects.");

        return sb.toString();
    }

    // ================================================================
    // CLASS MESSAGE BUILDER
    // ================================================================

    private String buildClassInsightsMessage(Long classRoomId, Long termId) {
        List<TermResult> results = termResultRepository.findByClassRoomIdAndTermId(classRoomId, termId);

        if (results.isEmpty()) {
            return "No term results available for this class and term. Return a JSON with summary indicating no data available.";
        }

        // Basic class stats
        double avgGpa = results.stream()
                .filter(r -> r.getGpa() != null)
                .mapToDouble(TermResult::getGpa)
                .average().orElse(0.0);
        long passing = results.stream().filter(r -> r.getGpa() != null && r.getGpa() >= 1.6).count();
        double passRate = results.isEmpty() ? 0 : passing * 100.0 / results.size();

        // Top and bottom performers
        results.sort(Comparator.comparingDouble((TermResult r) -> r.getGpa() != null ? r.getGpa() : 0.0).reversed());
        String topStudent = !results.isEmpty() ? results.get(0).getStudent().getUser().getFullName()
                + " (GPA " + String.format("%.2f", results.get(0).getGpa()) + ")" : "N/A";
        String bottomStudent = results.size() > 1
                ? results.get(results.size() - 1).getStudent().getUser().getFullName()
                + " (GPA " + String.format("%.2f", results.get(results.size() - 1).getGpa()) + ")" : "N/A";

        // Subject-level data
        List<Object[]> subjectData = scoreRepository.findByClassRoomIdAndTermId(classRoomId, termId)
                .stream()
                .filter(s -> !s.isAbsent() && s.getTotalScore() != null)
                .collect(Collectors.groupingBy(s -> s.getSubject().getName()))
                .entrySet().stream()
                .map(e -> new Object[]{
                        e.getKey(),
                        e.getValue().stream().mapToDouble(s -> s.getTotalScore()).average().orElse(0),
                        e.getValue().stream().filter(s -> s.getTotalScore() < 50).count(),
                        (long) e.getValue().size()
                })
                .toList();

        // Warning breakdown
        Map<String, Long> warningTypes = new HashMap<>();
        for (Object[] row : earlyWarningRepository.countUnresolvedByWarningTypeForClass(classRoomId, termId)) {
            warningTypes.put((String) row[0], (Long) row[1]);
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Analyze this class's academic performance data and generate insights.\n\n");

        sb.append("CLASS PERFORMANCE SUMMARY:\n");
        sb.append("- Total Students: ").append(results.size()).append("\n");
        sb.append("- Class Average GPA: ").append(String.format("%.2f", avgGpa)).append(" / 4.0\n");
        sb.append("- Pass Rate: ").append(String.format("%.1f", passRate)).append("%\n");
        sb.append("- Top Performer: ").append(topStudent).append("\n");
        sb.append("- Needs Most Support: ").append(bottomStudent).append("\n\n");

        sb.append("SUBJECT PERFORMANCE:\n");
        for (Object[] sd : subjectData) {
            sb.append("- ").append(sd[0]).append(": Avg Score ").append(String.format("%.1f", (double) sd[1]))
                    .append(", Failures ").append(sd[2]).append(" of ").append(sd[3]).append("\n");
        }
        sb.append("\n");

        sb.append("ACTIVE WARNINGS:\n");
        sb.append("- Failing Multiple Subjects: ").append(warningTypes.getOrDefault("FAILING_MULTIPLE_SUBJECTS", 0L)).append("\n");
        sb.append("- GPA Decline: ").append(warningTypes.getOrDefault("GPA_DECLINE", 0L)
                + warningTypes.getOrDefault("CONSECUTIVE_DECLINE", 0L)).append("\n");
        sb.append("- Attendance: ").append(warningTypes.getOrDefault("ATTENDANCE_ISSUE", 0L)).append("\n");
        sb.append("- Behavioral: ").append(warningTypes.getOrDefault("BEHAVIORAL_CONCERN", 0L)).append("\n\n");

        sb.append("Respond with JSON in this exact structure:\n");
        sb.append("{\n");
        sb.append("  \"summary\": \"A 2-3 sentence overall narrative of class performance\",\n");
        sb.append("  \"insights\": [\n");
        sb.append("    {\n");
        sb.append("      \"category\": \"PERFORMANCE|WARNING|TREND|RECOMMENDATION|ACHIEVEMENT\",\n");
        sb.append("      \"title\": \"Brief insight title\",\n");
        sb.append("      \"body\": \"2-4 sentence insight explanation\",\n");
        sb.append("      \"affectedScope\": \"e.g. Affects 5 students\",\n");
        sb.append("      \"suggestedAction\": \"Specific recommended action or null\",\n");
        sb.append("      \"priority\": \"HIGH|MEDIUM|LOW\"\n");
        sb.append("    }\n");
        sb.append("  ],\n");
        sb.append("  \"studentHighlights\": {\n");
        sb.append("    \"mostImproved\": \"Student name and what improved\",\n");
        sb.append("    \"needsSupport\": \"Student name and reason\"\n");
        sb.append("  },\n");
        sb.append("  \"subjectRecommendations\": [\n");
        sb.append("    { \"subjectName\": \"Subject\", \"recommendation\": \"Action to take\" }\n");
        sb.append("  ]\n");
        sb.append("}\n");
        sb.append("Generate 4-6 insights covering different aspects.");

        return sb.toString();
    }

    // ================================================================
    // RESPONSE PARSERS
    // ================================================================

    private SchoolInsightsDto parseSchoolInsightsResponse(String response) {
        try {
            String json = extractJson(response);
            JsonNode root = objectMapper.readTree(json);

            List<InsightDto> insights = new ArrayList<>();
            if (root.has("insights") && root.get("insights").isArray()) {
                for (JsonNode node : root.get("insights")) {
                    insights.add(InsightDto.builder()
                            .category(textOrNull(node, "category"))
                            .title(textOrNull(node, "title"))
                            .body(textOrNull(node, "body"))
                            .affectedScope(textOrNull(node, "affectedScope"))
                            .suggestedAction(textOrNull(node, "suggestedAction"))
                            .priority(textOrNull(node, "priority"))
                            .build());
                }
            }

            WaecReadinessDto waec = null;
            if (root.has("waecReadiness")) {
                JsonNode wr = root.get("waecReadiness");
                waec = WaecReadinessDto.builder()
                        .overallReadiness(textOrNull(wr, "overallReadiness"))
                        .shs3AtRiskCount(wr.has("shs3AtRiskCount") ? wr.get("shs3AtRiskCount").asInt() : 0)
                        .criticalSubjects(wr.has("criticalSubjects")
                                ? objectMapper.convertValue(wr.get("criticalSubjects"), new TypeReference<List<String>>() {})
                                : Collections.emptyList())
                        .recommendation(textOrNull(wr, "recommendation"))
                        .build();
            }

            return SchoolInsightsDto.builder()
                    .summary(textOrNull(root, "summary"))
                    .insights(insights)
                    .waecReadiness(waec)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse AI school insights response: {}", e.getMessage());
            throw new AiServiceException("Failed to parse AI response", e);
        }
    }

    private ClassInsightsDto parseClassInsightsResponse(String response) {
        try {
            String json = extractJson(response);
            JsonNode root = objectMapper.readTree(json);

            List<InsightDto> insights = new ArrayList<>();
            if (root.has("insights") && root.get("insights").isArray()) {
                for (JsonNode node : root.get("insights")) {
                    insights.add(InsightDto.builder()
                            .category(textOrNull(node, "category"))
                            .title(textOrNull(node, "title"))
                            .body(textOrNull(node, "body"))
                            .affectedScope(textOrNull(node, "affectedScope"))
                            .suggestedAction(textOrNull(node, "suggestedAction"))
                            .priority(textOrNull(node, "priority"))
                            .build());
                }
            }

            ClassInsightsDto.StudentHighlightsDto highlights = null;
            if (root.has("studentHighlights")) {
                JsonNode sh = root.get("studentHighlights");
                highlights = ClassInsightsDto.StudentHighlightsDto.builder()
                        .mostImproved(textOrNull(sh, "mostImproved"))
                        .needsSupport(textOrNull(sh, "needsSupport"))
                        .build();
            }

            List<ClassInsightsDto.SubjectRecommendationDto> subjectRecs = new ArrayList<>();
            if (root.has("subjectRecommendations") && root.get("subjectRecommendations").isArray()) {
                for (JsonNode node : root.get("subjectRecommendations")) {
                    subjectRecs.add(ClassInsightsDto.SubjectRecommendationDto.builder()
                            .subjectName(textOrNull(node, "subjectName"))
                            .recommendation(textOrNull(node, "recommendation"))
                            .build());
                }
            }

            return ClassInsightsDto.builder()
                    .summary(textOrNull(root, "summary"))
                    .insights(insights)
                    .studentHighlights(highlights)
                    .subjectRecommendations(subjectRecs)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse AI class insights response: {}", e.getMessage());
            throw new AiServiceException("Failed to parse AI response", e);
        }
    }

    // ================================================================
    // FALLBACKS
    // ================================================================

    private SchoolInsightsDto buildFallbackSchoolInsights(Long schoolId, Long termId) {
        AdminDashboardStatsDto stats;
        try {
            stats = statisticsService.getAdminDashboardStats(schoolId, termId);
        } catch (Exception e) {
            return SchoolInsightsDto.builder()
                    .summary("AI insights are temporarily unavailable. Please try again later.")
                    .insights(Collections.emptyList())
                    .generatedAt(LocalDateTime.now())
                    .schoolId(schoolId)
                    .termId(termId)
                    .build();
        }

        String summary = String.format(
                "The school has %d students with an average GPA of %s and a pass rate of %s%%. " +
                "There are %d active early warnings requiring attention.",
                stats.getTotalStudents(),
                formatGpa(stats.getAverageSchoolGpa()),
                formatPct(stats.getPassRate()),
                stats.getActiveWarnings()
        );

        List<InsightDto> insights = new ArrayList<>();
        insights.add(InsightDto.builder()
                .category("PERFORMANCE")
                .title("School GPA Overview")
                .body("The school average GPA is " + formatGpa(stats.getAverageSchoolGpa()) +
                        " with a pass rate of " + formatPct(stats.getPassRate()) + "%. " +
                        "AI-powered detailed analysis is temporarily unavailable.")
                .priority("MEDIUM")
                .build());

        if (stats.getActiveWarnings() > 0) {
            insights.add(InsightDto.builder()
                    .category("WARNING")
                    .title("Active Early Warnings")
                    .body(stats.getActiveWarnings() + " students have active early warnings. " +
                            "Review the Early Warnings page for detailed information.")
                    .affectedScope("Affects " + stats.getActiveWarnings() + " students")
                    .priority("HIGH")
                    .build());
        }

        return SchoolInsightsDto.builder()
                .summary(summary)
                .insights(insights)
                .generatedAt(LocalDateTime.now())
                .schoolId(schoolId)
                .termId(termId)
                .build();
    }

    private ClassInsightsDto buildFallbackClassInsights(Long classRoomId, Long termId) {
        List<TermResult> results = termResultRepository.findByClassRoomIdAndTermId(classRoomId, termId);
        double avgGpa = results.stream()
                .filter(r -> r.getGpa() != null)
                .mapToDouble(TermResult::getGpa)
                .average().orElse(0.0);

        String summary = String.format(
                "This class has %d students with an average GPA of %.2f. " +
                "AI-powered detailed analysis is temporarily unavailable.",
                results.size(), avgGpa
        );

        return ClassInsightsDto.builder()
                .summary(summary)
                .insights(Collections.emptyList())
                .subjectRecommendations(Collections.emptyList())
                .generatedAt(LocalDateTime.now())
                .classRoomId(classRoomId)
                .termId(termId)
                .build();
    }

    // ================================================================
    // HELPERS
    // ================================================================

    private String extractJson(String response) {
        String trimmed = response.trim();
        // Handle response wrapped in markdown code blocks
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    private String textOrNull(JsonNode node, String field) {
        if (node.has(field) && !node.get(field).isNull()) {
            return node.get(field).asText();
        }
        return null;
    }

    private String formatGpa(Double gpa) {
        return gpa != null ? String.format("%.2f", gpa) : "N/A";
    }

    private String formatPct(Double pct) {
        return pct != null ? String.format("%.1f", pct) : "0.0";
    }
}
