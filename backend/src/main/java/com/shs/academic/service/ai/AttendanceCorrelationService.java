package com.shs.academic.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shs.academic.exception.AiServiceException;
import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.StudentAttendanceRowDto;
import com.shs.academic.model.dto.ai.AtRiskAttendanceStudentDto;
import com.shs.academic.model.dto.ai.AttendanceCorrelationDto;
import com.shs.academic.model.entity.ClassRoom;
import com.shs.academic.model.entity.Term;
import com.shs.academic.model.entity.TermResult;
import com.shs.academic.repository.ClassRoomRepository;
import com.shs.academic.repository.TermRepository;
import com.shs.academic.repository.TermResultRepository;
import com.shs.academic.service.AttendanceService;
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
public class AttendanceCorrelationService {

    private static final double AT_RISK_THRESHOLD = 80.0;

    private static final String SYSTEM_PROMPT =
            "You are an academic analyst for Senior High Schools in Ghana. " +
            "You analyze the relationship between student attendance and academic performance. " +
            "Your analysis must be:\n" +
            "- Data-driven with specific observations\n" +
            "- Actionable with clear recommendations for teachers and administrators\n" +
            "- Formatted as structured JSON only\n" +
            "- Relevant to the Ghana Education Service (GES) context\n" +
            "Always respond with valid JSON. No explanations outside the JSON.\n" +
            "Response schema: {\"summary\": \"string\", \"recommendations\": [\"string\"]}";

    private final AttendanceService attendanceService;
    private final TermResultRepository termResultRepository;
    private final ClassRoomRepository classRoomRepository;
    private final TermRepository termRepository;
    private final ClaudeApiClient claudeApiClient;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public AttendanceCorrelationDto analyzeCorrelation(Long classRoomId, Long termId) {
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        List<StudentAttendanceRowDto> rows = attendanceService
                .getStudentAttendanceRows(classRoomId, termId);
        List<TermResult> termResults = termResultRepository
                .findByClassRoomIdAndTermId(classRoomId, termId);

        // Build paired (attendanceRate, gpa) data points
        Map<Long, Double> gpaByStudentId = termResults.stream()
                .collect(Collectors.toMap(tr -> tr.getStudent().getId(), TermResult::getGpa));

        List<double[]> pairs = new ArrayList<>();
        for (StudentAttendanceRowDto row : rows) {
            Double gpa = gpaByStudentId.get(row.getStudentId());
            if (gpa != null) {
                pairs.add(new double[]{row.getAttendanceRate(), gpa});
            }
        }

        int sampleSize = pairs.size();
        double r = sampleSize >= 3 ? pearsonCorrelation(pairs) : 0.0;
        String strength = describeCorrelation(r);

        // Identify at-risk students
        List<AtRiskAttendanceStudentDto> atRisk = attendanceService
                .getAtRiskStudents(classRoomId, termId, AT_RISK_THRESHOLD);

        // Build prompt data for Claude
        String aiSummary = "Insufficient data for AI analysis.";
        List<String> recommendations = List.of(
                "Collect more attendance data before drawing conclusions.");

        if (sampleSize >= 5) {
            try {
                String prompt = buildPrompt(classRoom.getDisplayName(),
                        term.getTermType().name().replace("_", " "),
                        sampleSize, r, strength, atRisk, rows, gpaByStudentId);
                String response = claudeApiClient.sendMessage(SYSTEM_PROMPT, prompt);
                Map<String, Object> parsed = objectMapper.readValue(response,
                        new TypeReference<>() {});
                aiSummary = (String) parsed.getOrDefault("summary", aiSummary);
                Object rec = parsed.get("recommendations");
                if (rec instanceof List<?> list) {
                    recommendations = list.stream()
                            .map(Object::toString)
                            .toList();
                }
            } catch (Exception e) {
                log.error("AI analysis failed for class {} term {}: {}",
                        classRoomId, termId, e.getMessage());
            }
        }

        return AttendanceCorrelationDto.builder()
                .classRoomId(classRoomId)
                .className(classRoom.getDisplayName())
                .termId(termId)
                .termLabel(term.getTermType().name().replace("_", " "))
                .correlationCoefficient(Math.round(r * 1000.0) / 1000.0)
                .correlationStrength(strength)
                .sampleSize(sampleSize)
                .atRiskStudents(atRisk)
                .aiSummary(aiSummary)
                .recommendations(recommendations)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    // ================================================================
    // PEARSON CORRELATION
    // ================================================================

    private double pearsonCorrelation(List<double[]> pairs) {
        int n = pairs.size();
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        for (double[] p : pairs) {
            sumX += p[0];
            sumY += p[1];
            sumXY += p[0] * p[1];
            sumX2 += p[0] * p[0];
            sumY2 += p[1] * p[1];
        }

        double numerator = n * sumXY - sumX * sumY;
        double denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator == 0 ? 0.0 : numerator / denominator;
    }

    private String describeCorrelation(double r) {
        double abs = Math.abs(r);
        String direction = r >= 0 ? "POSITIVE" : "NEGATIVE";
        if (abs >= 0.7) return "STRONG_" + direction;
        if (abs >= 0.4) return "MODERATE_" + direction;
        if (abs >= 0.2) return "WEAK_" + direction;
        return "NEGLIGIBLE";
    }

    // ================================================================
    // AI PROMPT BUILDER
    // ================================================================

    private String buildPrompt(String className, String termLabel, int sampleSize,
                                double r, String strength,
                                List<AtRiskAttendanceStudentDto> atRisk,
                                List<StudentAttendanceRowDto> rows,
                                Map<Long, Double> gpaByStudentId) {

        double avgAttendance = rows.stream()
                .mapToDouble(StudentAttendanceRowDto::getAttendanceRate)
                .average().orElse(0);
        double avgGpa = gpaByStudentId.values().stream()
                .mapToDouble(Double::doubleValue)
                .average().orElse(0);

        StringBuilder sb = new StringBuilder();
        sb.append("Analyze attendance vs academic performance for ")
                .append(className).append(" (").append(termLabel).append(").\n\n");
        sb.append("DATA SUMMARY:\n");
        sb.append("- Students with both attendance and GPA data: ").append(sampleSize).append("\n");
        sb.append("- Average class attendance rate: ")
                .append(String.format("%.1f%%", avgAttendance)).append("\n");
        sb.append("- Average class GPA: ")
                .append(String.format("%.2f", avgGpa)).append(" / 4.0\n");
        sb.append("- Pearson correlation (attendance vs GPA): ")
                .append(String.format("%.3f", r))
                .append(" (").append(strength).append(")\n");
        sb.append("- Students at risk (<80% attendance): ").append(atRisk.size()).append("\n\n");

        if (!atRisk.isEmpty()) {
            sb.append("AT-RISK STUDENTS (sample):\n");
            atRisk.stream().limit(5).forEach(s ->
                sb.append("  - ").append(s.getStudentIndex())
                        .append(": ").append(String.format("%.1f%%", s.getAttendanceRate()))
                        .append(" attendance")
                        .append(s.getGpa() != null
                                ? ", GPA=" + String.format("%.2f", s.getGpa()) : "")
                        .append(" [").append(s.getRiskLevel()).append("]\n")
            );
            sb.append("\n");
        }

        sb.append("GES CONTEXT: Ghana Senior High Schools use a 3-term year. ");
        sb.append("A GPA >= 1.6 is generally required to pass. ");
        sb.append("Attendance below 75% may result in exam exclusion.\n\n");
        sb.append("Respond in JSON: {\"summary\": \"...\", \"recommendations\": [\"...\", \"...\"]}");

        return sb.toString();
    }
}
