package com.shs.academic.controller;

import com.shs.academic.model.dto.ApiResponse;
import com.shs.academic.model.dto.EarlyWarningDto;
import com.shs.academic.model.dto.EarlyWarningSummaryDto;
import com.shs.academic.model.dto.ResolveWarningRequest;
import com.shs.academic.model.entity.EarlyWarning;
import com.shs.academic.model.enums.WarningLevel;
import com.shs.academic.service.EarlyWarningService;
import com.shs.academic.util.ResponseUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/warnings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Admin - Early Warning System", description = "At-risk student detection and warning management for Super Admin")
public class AdminWarningController {

    private final EarlyWarningService earlyWarningService;

    @PostMapping("/analyze")
    @Operation(summary = "Manually trigger warning analysis",
            description = "Analyzes all active students and generates early warnings for the specified school and term")
    public ResponseEntity<ApiResponse> analyzeWarnings(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {

        List<EarlyWarning> warnings = earlyWarningService.analyzeAndGenerateWarnings(schoolId, termId);
        return ResponseUtil.ok("Warning analysis complete. " + warnings.size() + " warning(s) generated.", warnings.size());
    }

    @GetMapping("/summary")
    @Operation(summary = "Get warning summary for a term",
            description = "Returns summary statistics including counts by level, critical students, and recent warnings")
    public ResponseEntity<ApiResponse> getWarningSummary(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {

        EarlyWarningSummaryDto summary = earlyWarningService.getWarningSummary(schoolId, termId);
        return ResponseUtil.ok("Warning summary retrieved successfully", summary);
    }

    @GetMapping
    @Operation(summary = "Get all warnings for a term (paginated)",
            description = "Returns paginated warnings for the specified term, optionally filtered by warning level")
    public ResponseEntity<ApiResponse> getTermWarnings(
            @Parameter(description = "Term ID") @RequestParam Long termId,
            @Parameter(description = "Warning level filter (CRITICAL, HIGH, MEDIUM, LOW)") @RequestParam(required = false) WarningLevel level,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {

        Page<EarlyWarningDto> warnings = earlyWarningService.getTermWarnings(
                termId, level, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "generatedAt")));
        return ResponseUtil.ok("Term warnings retrieved successfully", warnings);
    }

    @GetMapping("/student/{studentId}")
    @Operation(summary = "Get all warnings for a student",
            description = "Returns all warnings for the specified student, ordered by most recent first")
    public ResponseEntity<ApiResponse> getStudentWarnings(
            @Parameter(description = "Student ID") @PathVariable Long studentId) {

        List<EarlyWarningDto> warnings = earlyWarningService.getStudentWarnings(studentId);
        return ResponseUtil.ok("Student warnings retrieved successfully", warnings);
    }

    @PatchMapping("/{warningId}/resolve")
    @Operation(summary = "Resolve a warning",
            description = "Marks a warning as resolved with a resolution note")
    public ResponseEntity<ApiResponse> resolveWarning(
            @Parameter(description = "Warning ID") @PathVariable Long warningId,
            @Valid @RequestBody ResolveWarningRequest request) {

        // TODO: Extract resolvedByUserId from SecurityContext when JWT is implemented
        Long resolvedByUserId = 1L;

        EarlyWarningDto resolved = earlyWarningService.resolveWarning(warningId, request, resolvedByUserId);
        return ResponseUtil.ok("Warning resolved successfully", resolved);
    }

    @DeleteMapping("/{warningId}")
    @Operation(summary = "Delete a warning (admin override)",
            description = "Hard deletes a warning, typically used for false positives")
    public ResponseEntity<ApiResponse> deleteWarning(
            @Parameter(description = "Warning ID") @PathVariable Long warningId) {

        earlyWarningService.deleteWarning(warningId);
        return ResponseUtil.ok("Warning deleted successfully");
    }
}
