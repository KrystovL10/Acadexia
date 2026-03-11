package com.shs.academic.controller;

import com.shs.academic.model.dto.*;
import com.shs.academic.model.entity.TermResult;
import com.shs.academic.service.GpaService;
import com.shs.academic.service.ReportProgressService;
import com.shs.academic.service.TermResultValidationService;
import com.shs.academic.util.ResponseUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Admin - Reports & Term Results",
        description = "GPA calculation, term result generation, and score validation for Super Admin")
public class AdminReportController {

    private final GpaService gpaService;
    private final ReportProgressService reportProgressService;
    private final TermResultValidationService validationService;

    @GetMapping("/progress")
    @Operation(summary = "Get report generation progress for a class/term")
    public ResponseEntity<ApiResponse> getReportProgress(
            @Parameter(description = "Classroom ID") @RequestParam Long classRoomId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        var progress = reportProgressService.getProgress(classRoomId, termId);
        if (progress == null) {
            return ResponseUtil.ok("No generation in progress", null);
        }
        return ResponseUtil.ok("Progress retrieved", progress);
    }

    @GetMapping("/score-status")
    @Operation(summary = "Get score completion status for a class",
            description = "Shows which subjects have all scores entered and which are missing, "
                    + "including the tutor responsible and list of students without scores")
    public ResponseEntity<ApiResponse> getScoreCompletionStatus(
            @Parameter(description = "Classroom ID") @RequestParam Long classRoomId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {

        ScoreCompletionStatusDto status = validationService.getScoreCompletionStatus(classRoomId, termId);
        return ResponseUtil.ok("Score completion status retrieved successfully", status);
    }

    @PostMapping("/generate-term-results")
    @Operation(summary = "Generate term results for an entire class",
            description = "Calculates GPA, pass/fail counts, attendance summary, and positions "
                    + "for all active students in the class. Updates cumulative GPA for each student.")
    public ResponseEntity<ApiResponse> generateTermResults(
            @Parameter(description = "Classroom ID") @RequestParam Long classRoomId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {

        List<TermResult> results = gpaService.generateAllTermResults(classRoomId, termId);

        List<TermResultDto> resultDtos = results.stream()
                .map(TermResultDto::fromEntity)
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalGenerated", resultDtos.size());
        response.put("results", resultDtos);

        return ResponseUtil.ok(
                resultDtos.size() + " term result(s) generated successfully", response);
    }

    @GetMapping("/term-result/{studentId}")
    @Operation(summary = "Get a student's term result with score breakdown",
            description = "Returns the term result including GPA, position, attendance, "
                    + "and individual subject scores")
    public ResponseEntity<ApiResponse> getStudentTermResult(
            @Parameter(description = "Student ID") @PathVariable Long studentId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {

        TermResultDto result = gpaService.getStudentTermResult(studentId, termId);
        return ResponseUtil.ok("Student term result retrieved successfully", result);
    }

    @GetMapping("/term-results/{studentId}")
    @Operation(summary = "Get all term results for a student",
            description = "Returns the student's full academic history across all terms, "
                    + "ordered chronologically")
    public ResponseEntity<ApiResponse> getStudentAllTermResults(
            @Parameter(description = "Student ID") @PathVariable Long studentId) {

        List<TermResultDto> results = gpaService.getStudentAllTermResults(studentId);
        return ResponseUtil.ok("Student term results retrieved successfully", results);
    }

    @GetMapping("/cgpa/{studentId}")
    @Operation(summary = "Get a student's cumulative GPA",
            description = "Returns the student's CGPA with classification and per-term breakdown")
    public ResponseEntity<ApiResponse> getStudentCgpa(
            @Parameter(description = "Student ID") @PathVariable Long studentId) {

        CumulativeGPADto cgpa = gpaService.getStudentCgpa(studentId);
        return ResponseUtil.ok("Student CGPA retrieved successfully", cgpa);
    }
}
