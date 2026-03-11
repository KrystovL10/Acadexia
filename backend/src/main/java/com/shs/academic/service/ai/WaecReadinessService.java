package com.shs.academic.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shs.academic.exception.AiServiceException;
import com.shs.academic.model.dto.ai.StudentWaecPredictionDto;
import com.shs.academic.model.dto.ai.WaecReadinessReportDto;
import com.shs.academic.model.entity.CumulativeGPA;
import com.shs.academic.model.entity.Score;
import com.shs.academic.model.entity.Student;
import com.shs.academic.model.entity.TermResult;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.repository.*;
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
public class WaecReadinessService {

    private final ClaudeApiClient claudeApiClient;
    private final StudentRepository studentRepository;
    private final CumulativeGPARepository cumulativeGPARepository;
    private final ScoreRepository scoreRepository;
    private final TermResultRepository termResultRepository;
    private final AttendanceRepository attendanceRepository;
    private final ObjectMapper objectMapper;

    private static final String WAEC_SYSTEM_PROMPT =
            "You are an academic performance analyst specializing in WASSCE (West African " +
            "Senior School Certificate Examination) readiness prediction for Ghanaian SHS students. " +
            "You predict likely WASSCE grades based on students' cumulative SHS performance. " +
            "Ghana WASSCE grades range from A1 (best) to F9 (worst). C6 and above is required to pass. " +
            "Always respond with valid JSON only. No text outside the JSON.";

    private static final Set<String> CORE_SUBJECTS = Set.of(
            "English Language", "Mathematics", "Integrated Science", "Social Studies"
    );

    // ================================================================
    // MAIN REPORT GENERATION
    // ================================================================

    @Transactional(readOnly = true)
    @Cacheable(value = "waecReadiness", key = "#schoolId + '_' + #termId")
    public WaecReadinessReportDto generateWaecReadinessReport(Long schoolId, Long termId) {
        List<Student> shs3Students = studentRepository.findBySchoolIdAndCurrentYearGroup(schoolId, YearGroup.SHS3)
                .stream().filter(Student::isActive).toList();

        if (shs3Students.isEmpty()) {
            return WaecReadinessReportDto.builder()
                    .schoolId(schoolId)
                    .termId(termId)
                    .totalShs3Students(0)
                    .highReadiness(0)
                    .mediumReadiness(0)
                    .lowReadiness(0)
                    .atRiskCount(0)
                    .studentPredictions(Collections.emptyList())
                    .criticalSubjects(Collections.emptyList())
                    .schoolReadinessPercentage(0.0)
                    .overallRecommendation("No SHS3 students found in this school.")
                    .generatedAt(LocalDateTime.now())
                    .build();
        }

        // Collect student data
        List<StudentWaecContext> contexts = buildStudentContexts(shs3Students, termId);

        // Process in batches of 10
        List<StudentWaecPredictionDto> allPredictions = new ArrayList<>();
        int batchSize = 10;

        for (int i = 0; i < contexts.size(); i += batchSize) {
            List<StudentWaecContext> batch = contexts.subList(i, Math.min(i + batchSize, contexts.size()));
            try {
                List<StudentWaecPredictionDto> batchResults = predictBatch(batch);
                allPredictions.addAll(batchResults);
            } catch (AiServiceException e) {
                log.warn("WAEC prediction batch {} failed, using fallbacks: {}", i / batchSize, e.getMessage());
                allPredictions.addAll(buildFallbackPredictions(batch));
            }

            // Rate limit between batches
            if (i + batchSize < contexts.size()) {
                try { Thread.sleep(300); } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        // Aggregate results
        return aggregateResults(schoolId, termId, shs3Students.size(), allPredictions);
    }

    @CacheEvict(value = "waecReadiness", key = "#schoolId + '_' + #termId")
    public void invalidateWaecReadiness(Long schoolId, Long termId) {
        log.info("Invalidated WAEC readiness cache for school={}, term={}", schoolId, termId);
    }

    // ================================================================
    // INDIVIDUAL STUDENT PREDICTION
    // ================================================================

    @Transactional(readOnly = true)
    public StudentWaecPredictionDto getStudentPrediction(Long studentId, Long termId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));

        StudentWaecContext ctx = buildSingleContext(student, termId);

        try {
            List<StudentWaecPredictionDto> results = predictBatch(List.of(ctx));
            return results.isEmpty() ? buildFallbackPredictions(List.of(ctx)).get(0) : results.get(0);
        } catch (AiServiceException e) {
            log.warn("Individual WAEC prediction failed for student {}: {}", studentId, e.getMessage());
            return buildFallbackPredictions(List.of(ctx)).get(0);
        }
    }

    // ================================================================
    // CONTEXT BUILDING
    // ================================================================

    private List<StudentWaecContext> buildStudentContexts(List<Student> students, Long termId) {
        List<Long> studentIds = students.stream().map(Student::getId).toList();
        Map<Long, CumulativeGPA> cgpaMap = cumulativeGPARepository.findByStudentIdIn(studentIds)
                .stream().collect(Collectors.toMap(c -> c.getStudent().getId(), c -> c, (a, b) -> a));

        List<StudentWaecContext> contexts = new ArrayList<>();
        for (Student student : students) {
            contexts.add(buildSingleContext(student, termId, cgpaMap.get(student.getId())));
        }
        return contexts;
    }

    private StudentWaecContext buildSingleContext(Student student, Long termId) {
        CumulativeGPA cgpa = cumulativeGPARepository.findByStudentId(student.getId()).orElse(null);
        return buildSingleContext(student, termId, cgpa);
    }

    private StudentWaecContext buildSingleContext(Student student, Long termId, CumulativeGPA cgpa) {
        Long studentId = student.getId();

        // Get all scores across all terms for this student
        List<Score> allScores = scoreRepository.findByStudentId(studentId);

        // Compute average per core subject
        Map<String, Double> coreSubjectAvgs = new HashMap<>();
        for (String coreName : CORE_SUBJECTS) {
            OptionalDouble avg = allScores.stream()
                    .filter(s -> !s.isAbsent() && s.getTotalScore() != null
                            && coreName.equalsIgnoreCase(s.getSubject().getName()))
                    .mapToDouble(Score::getTotalScore)
                    .average();
            coreSubjectAvgs.put(coreName, avg.isPresent() ? avg.getAsDouble() : -1.0);
        }

        // GPA trend from last 3 terms
        List<TermResult> history = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(studentId);
        String gpaTrend = computeGpaTrend(history);

        // Attendance
        Long present = attendanceRepository.countByStudentIdAndTermIdAndIsPresent(studentId, termId, true);
        Long absent = attendanceRepository.countByStudentIdAndTermIdAndIsPresent(studentId, termId, false);
        long total = (present != null ? present : 0) + (absent != null ? absent : 0);
        double attendancePct = total > 0 ? (present != null ? present : 0) * 100.0 / total : 100.0;

        return StudentWaecContext.builder()
                .studentId(studentId)
                .firstName(student.getUser().getFirstName())
                .fullName(student.getUser().getFullName())
                .studentIndex(student.getStudentIndex())
                .className(student.getCurrentClass() != null ? student.getCurrentClass().getDisplayName() : "N/A")
                .cgpa(cgpa != null && cgpa.getCgpa() != null ? cgpa.getCgpa() : 0.0)
                .coreSubjectAvgs(coreSubjectAvgs)
                .gpaTrend(gpaTrend)
                .attendancePct(attendancePct)
                .build();
    }

    private String computeGpaTrend(List<TermResult> history) {
        if (history.size() < 2) return "Insufficient data";

        List<TermResult> recent = history.subList(Math.max(0, history.size() - 3), history.size());
        List<Double> gpas = recent.stream()
                .filter(tr -> tr.getGpa() != null)
                .map(TermResult::getGpa)
                .toList();

        if (gpas.size() < 2) return "Stable";
        double first = gpas.get(0);
        double last = gpas.get(gpas.size() - 1);
        double diff = last - first;

        if (diff > 0.15) return "Improving";
        if (diff < -0.15) return "Declining";
        return "Stable";
    }

    // ================================================================
    // AI PREDICTION
    // ================================================================

    private List<StudentWaecPredictionDto> predictBatch(List<StudentWaecContext> batch) {
        StringBuilder sb = new StringBuilder();
        sb.append("Predict WASSCE performance for these SHS3 students based on their cumulative SHS performance.\n");
        sb.append("Ghana WASSCE grades: A1(best) to F9(worst). C6 and above is required to pass.\n\n");
        sb.append("Students Data:\n");

        for (StudentWaecContext ctx : batch) {
            sb.append("\n- Student ID: ").append(ctx.studentId).append("\n");
            sb.append("  Name: ").append(ctx.firstName).append("\n");
            sb.append("  CGPA: ").append(String.format("%.2f", ctx.cgpa)).append("\n");

            for (Map.Entry<String, Double> entry : ctx.coreSubjectAvgs.entrySet()) {
                sb.append("  ").append(entry.getKey()).append(" avg: ");
                sb.append(entry.getValue() >= 0 ? String.format("%.1f", entry.getValue()) : "No data");
                sb.append("\n");
            }

            sb.append("  GPA Trend (last 3 terms): ").append(ctx.gpaTrend).append("\n");
            sb.append("  Attendance Rate: ").append(String.format("%.1f", ctx.attendancePct)).append("%\n");
        }

        sb.append("\nRespond with a JSON array:\n");
        sb.append("[\n  {\n");
        sb.append("    \"studentId\": 123,\n");
        sb.append("    \"predictedGrades\": { \"english\": \"B2\", \"mathematics\": \"C4\", \"science\": \"C5\", \"socialStudies\": \"B3\" },\n");
        sb.append("    \"overallReadiness\": \"HIGH|MEDIUM|LOW|AT_RISK\",\n");
        sb.append("    \"readinessScore\": 75,\n");
        sb.append("    \"riskFactors\": [\"factor1\"],\n");
        sb.append("    \"recommendation\": \"Brief recommendation\"\n");
        sb.append("  }\n]\n");

        String response = claudeApiClient.sendMessage(WAEC_SYSTEM_PROMPT, sb.toString());
        return parsePredictions(response, batch);
    }

    private List<StudentWaecPredictionDto> parsePredictions(String response, List<StudentWaecContext> batch) {
        try {
            String json = extractJson(response);
            JsonNode root = objectMapper.readTree(json);

            if (!root.isArray()) {
                throw new AiServiceException("Expected JSON array");
            }

            // Map AI results by studentId
            Map<Long, JsonNode> resultMap = new HashMap<>();
            for (JsonNode node : root) {
                long sid = node.path("studentId").asLong();
                resultMap.put(sid, node);
            }

            List<StudentWaecPredictionDto> predictions = new ArrayList<>();
            for (StudentWaecContext ctx : batch) {
                JsonNode node = resultMap.get(ctx.studentId);
                if (node != null) {
                    predictions.add(parseStudentPrediction(node, ctx));
                } else {
                    predictions.addAll(buildFallbackPredictions(List.of(ctx)));
                }
            }
            return predictions;
        } catch (AiServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse WAEC predictions: {}", e.getMessage());
            throw new AiServiceException("Failed to parse WAEC prediction response", e);
        }
    }

    private StudentWaecPredictionDto parseStudentPrediction(JsonNode node, StudentWaecContext ctx) {
        Map<String, String> grades = new HashMap<>();
        JsonNode pg = node.path("predictedGrades");
        if (pg.isObject()) {
            pg.fields().forEachRemaining(entry -> grades.put(entry.getKey(), entry.getValue().asText()));
        }

        List<String> riskFactors = new ArrayList<>();
        JsonNode rf = node.path("riskFactors");
        if (rf.isArray()) {
            for (JsonNode r : rf) riskFactors.add(r.asText());
        }

        return StudentWaecPredictionDto.builder()
                .studentId(ctx.studentId)
                .studentName(ctx.fullName)
                .studentIndex(ctx.studentIndex)
                .className(ctx.className)
                .predictedGrades(grades)
                .overallReadiness(node.path("overallReadiness").asText("MEDIUM"))
                .readinessScore(node.path("readinessScore").asInt(50))
                .riskFactors(riskFactors)
                .recommendation(node.path("recommendation").asText("Continue current preparation."))
                .build();
    }

    // ================================================================
    // AGGREGATION
    // ================================================================

    private WaecReadinessReportDto aggregateResults(Long schoolId, Long termId, int totalStudents,
                                                     List<StudentWaecPredictionDto> predictions) {
        int high = 0, medium = 0, low = 0, atRisk = 0;
        for (StudentWaecPredictionDto p : predictions) {
            switch (p.getOverallReadiness().toUpperCase()) {
                case "HIGH" -> high++;
                case "MEDIUM" -> medium++;
                case "LOW" -> low++;
                case "AT_RISK" -> atRisk++;
                default -> medium++;
            }
        }

        // Find critical subjects (most frequently at-risk across predictions)
        Map<String, Integer> subjectFailCounts = new HashMap<>();
        for (StudentWaecPredictionDto p : predictions) {
            if (p.getPredictedGrades() != null) {
                for (Map.Entry<String, String> entry : p.getPredictedGrades().entrySet()) {
                    String grade = entry.getValue();
                    if (isFailingGrade(grade)) {
                        subjectFailCounts.merge(entry.getKey(), 1, Integer::sum);
                    }
                }
            }
        }
        List<String> criticalSubjects = subjectFailCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(3)
                .map(Map.Entry::getKey)
                .toList();

        double readinessPct = totalStudents > 0
                ? (high + medium) * 100.0 / totalStudents : 0.0;

        String recommendation;
        if (readinessPct >= 80) {
            recommendation = "The majority of SHS3 students are on track for WASSCE. Maintain current preparation and focus on weak students.";
        } else if (readinessPct >= 50) {
            recommendation = "Moderate readiness. Intensify revision programmes and provide targeted support for at-risk students.";
        } else {
            recommendation = "Significant intervention needed. Implement intensive remedial classes and individual academic counseling.";
        }

        return WaecReadinessReportDto.builder()
                .schoolId(schoolId)
                .termId(termId)
                .totalShs3Students(totalStudents)
                .highReadiness(high)
                .mediumReadiness(medium)
                .lowReadiness(low)
                .atRiskCount(atRisk)
                .studentPredictions(predictions)
                .criticalSubjects(criticalSubjects)
                .schoolReadinessPercentage(Math.round(readinessPct * 10.0) / 10.0)
                .overallRecommendation(recommendation)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private boolean isFailingGrade(String grade) {
        if (grade == null) return false;
        return Set.of("D7", "E8", "F9").contains(grade.toUpperCase());
    }

    // ================================================================
    // FALLBACKS
    // ================================================================

    private List<StudentWaecPredictionDto> buildFallbackPredictions(List<StudentWaecContext> batch) {
        List<StudentWaecPredictionDto> results = new ArrayList<>();
        for (StudentWaecContext ctx : batch) {
            String readiness;
            int score;
            List<String> risks = new ArrayList<>();

            if (ctx.cgpa >= 3.0) {
                readiness = "HIGH";
                score = 80;
            } else if (ctx.cgpa >= 2.0) {
                readiness = "MEDIUM";
                score = 60;
            } else if (ctx.cgpa >= 1.6) {
                readiness = "LOW";
                score = 40;
                risks.add("Borderline GPA");
            } else {
                readiness = "AT_RISK";
                score = 20;
                risks.add("Below minimum pass GPA");
            }

            if (ctx.attendancePct < 75) risks.add("Low attendance");

            // Predict grades based on subject averages
            Map<String, String> grades = new HashMap<>();
            for (Map.Entry<String, Double> entry : ctx.coreSubjectAvgs.entrySet()) {
                String key = entry.getKey().toLowerCase()
                        .replace(" ", "").replace("integratedscience", "science");
                grades.put(key, predictGradeFromAvg(entry.getValue()));
            }

            results.add(StudentWaecPredictionDto.builder()
                    .studentId(ctx.studentId)
                    .studentName(ctx.fullName)
                    .studentIndex(ctx.studentIndex)
                    .className(ctx.className)
                    .predictedGrades(grades)
                    .overallReadiness(readiness)
                    .readinessScore(score)
                    .riskFactors(risks)
                    .recommendation("AI prediction unavailable. Based on CGPA of " +
                            String.format("%.2f", ctx.cgpa) + ", readiness is " + readiness + ".")
                    .build());
        }
        return results;
    }

    private String predictGradeFromAvg(double avg) {
        if (avg < 0) return "N/A";
        if (avg >= 80) return "A1";
        if (avg >= 75) return "B2";
        if (avg >= 70) return "B3";
        if (avg >= 65) return "C4";
        if (avg >= 60) return "C5";
        if (avg >= 55) return "C6";
        if (avg >= 50) return "D7";
        if (avg >= 40) return "E8";
        return "F9";
    }

    // ================================================================
    // HELPERS
    // ================================================================

    private String extractJson(String response) {
        String trimmed = response.trim();
        if (trimmed.startsWith("```json")) trimmed = trimmed.substring(7);
        else if (trimmed.startsWith("```")) trimmed = trimmed.substring(3);
        if (trimmed.endsWith("```")) trimmed = trimmed.substring(0, trimmed.length() - 3);
        return trimmed.trim();
    }

    @lombok.Builder
    private record StudentWaecContext(
            Long studentId,
            String firstName,
            String fullName,
            String studentIndex,
            String className,
            Double cgpa,
            Map<String, Double> coreSubjectAvgs,
            String gpaTrend,
            Double attendancePct
    ) {}
}
