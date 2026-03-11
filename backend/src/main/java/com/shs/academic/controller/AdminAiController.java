package com.shs.academic.controller;

import com.shs.academic.model.dto.ApiResponse;
import com.shs.academic.model.dto.ai.SchoolInsightsDto;
import com.shs.academic.model.dto.ai.StudentWaecPredictionDto;
import com.shs.academic.model.dto.ai.WaecReadinessReportDto;
import com.shs.academic.service.ai.SchoolInsightAiService;
import com.shs.academic.service.ai.WaecReadinessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/ai")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Admin - AI Insights", description = "AI-powered academic insights for administrators")
public class AdminAiController {

    private final SchoolInsightAiService schoolInsightAiService;
    private final WaecReadinessService waecReadinessService;

    // ================================================================
    // SCHOOL INSIGHTS
    // ================================================================

    @PostMapping("/insights")
    @Operation(summary = "Generate fresh AI insights for the school (evicts cache first)")
    public ResponseEntity<ApiResponse> generateInsights(
            @RequestParam Long schoolId,
            @RequestParam Long termId) {
        schoolInsightAiService.invalidateSchoolInsights(schoolId, termId);
        SchoolInsightsDto dto = schoolInsightAiService.generateSchoolInsights(schoolId, termId);

        // Enrich with WAEC readiness summary if SHS3 students exist
        enrichWithWaecReadiness(dto, schoolId, termId);

        return ResponseEntity.ok(ApiResponse.success("AI insights generated", dto));
    }

    @GetMapping("/insights")
    @Operation(summary = "Get cached AI insights (returns null data if never generated)")
    public ResponseEntity<ApiResponse> getInsights(
            @RequestParam Long schoolId,
            @RequestParam Long termId) {
        SchoolInsightsDto dto = schoolInsightAiService.generateSchoolInsights(schoolId, termId);
        return ResponseEntity.ok(ApiResponse.success("AI insights retrieved", dto));
    }

    @PostMapping("/insights/invalidate")
    @Operation(summary = "Clear cached AI insights for a school/term")
    public ResponseEntity<ApiResponse> invalidateInsights(
            @RequestParam Long schoolId,
            @RequestParam Long termId) {
        schoolInsightAiService.invalidateSchoolInsights(schoolId, termId);
        return ResponseEntity.ok(ApiResponse.success("Cache cleared", null));
    }

    // ================================================================
    // WAEC READINESS
    // ================================================================

    @PostMapping("/waec-readiness")
    @Operation(summary = "Generate WAEC readiness report for SHS3 students")
    public ResponseEntity<ApiResponse> generateWaecReadiness(
            @RequestParam Long schoolId,
            @RequestParam Long termId) {
        waecReadinessService.invalidateWaecReadiness(schoolId, termId);
        WaecReadinessReportDto dto = waecReadinessService.generateWaecReadinessReport(schoolId, termId);
        return ResponseEntity.ok(ApiResponse.success("WAEC readiness report generated", dto));
    }

    @GetMapping("/waec-readiness")
    @Operation(summary = "Get cached WAEC readiness report")
    public ResponseEntity<ApiResponse> getWaecReadiness(
            @RequestParam Long schoolId,
            @RequestParam Long termId) {
        WaecReadinessReportDto dto = waecReadinessService.generateWaecReadinessReport(schoolId, termId);
        return ResponseEntity.ok(ApiResponse.success("WAEC readiness report retrieved", dto));
    }

    @GetMapping("/waec-readiness/student/{studentId}")
    @Operation(summary = "Get individual student WAEC prediction")
    public ResponseEntity<ApiResponse> getStudentWaecPrediction(
            @PathVariable Long studentId,
            @RequestParam Long termId) {
        StudentWaecPredictionDto dto = waecReadinessService.getStudentPrediction(studentId, termId);
        return ResponseEntity.ok(ApiResponse.success("Student WAEC prediction retrieved", dto));
    }

    // ================================================================
    // HELPERS
    // ================================================================

    private void enrichWithWaecReadiness(SchoolInsightsDto dto, Long schoolId, Long termId) {
        try {
            WaecReadinessReportDto waec = waecReadinessService.generateWaecReadinessReport(schoolId, termId);
            if (waec.getTotalShs3Students() > 0 && dto.getWaecReadiness() != null) {
                // Merge AI-generated readiness with WAEC prediction data
                dto.getWaecReadiness().setShs3AtRiskCount(waec.getAtRiskCount());
                dto.getWaecReadiness().setCriticalSubjects(waec.getCriticalSubjects());
                dto.getWaecReadiness().setRecommendation(waec.getOverallRecommendation());

                String readiness = waec.getSchoolReadinessPercentage() >= 70 ? "HIGH"
                        : waec.getSchoolReadinessPercentage() >= 40 ? "MEDIUM" : "LOW";
                dto.getWaecReadiness().setOverallReadiness(readiness);
            }
        } catch (Exception e) {
            // Non-fatal: insights still valid without WAEC enrichment
        }
    }
}
