package com.shs.academic.controller;

import com.shs.academic.model.dto.ApiResponse;
import com.shs.academic.model.dto.ranking.*;
import com.shs.academic.service.PowerRankingService;
import com.shs.academic.util.ResponseUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/rankings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Admin - Power Rankings", description = "Student performance rankings, improvement tracking, and scholarship candidates")
public class AdminRankingController {

    private final PowerRankingService powerRankingService;

    @GetMapping
    @Operation(summary = "Get full power ranking",
            description = "Returns the complete ranking object: best student, top 10, per-class, per-year-group, per-subject, most improved/declined, scholarship candidates")
    public ResponseEntity<ApiResponse> getSchoolPowerRanking(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        PowerRankingDto ranking = powerRankingService.getSchoolPowerRanking(schoolId, termId);
        return ResponseUtil.ok("Power ranking retrieved successfully", ranking);
    }

    @GetMapping("/top-students")
    @Operation(summary = "Get top N students",
            description = "Returns the top N students by GPA for the given school and term")
    public ResponseEntity<ApiResponse> getTopStudents(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId,
            @Parameter(description = "Number of students to return") @RequestParam(defaultValue = "10") int limit) {
        List<StudentRankDto> topStudents = powerRankingService.getTopStudents(schoolId, termId, limit);
        return ResponseUtil.ok("Top students retrieved successfully", topStudents);
    }

    @GetMapping("/most-improved")
    @Operation(summary = "Get most improved student",
            description = "Returns the student with the largest positive GPA delta compared to the previous term")
    public ResponseEntity<ApiResponse> getMostImproved(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        ImprovementDto improved = powerRankingService.getMostImproved(schoolId, termId);
        return ResponseUtil.ok("Most improved student retrieved successfully", improved);
    }

    @GetMapping("/most-declined")
    @Operation(summary = "Get most declined student",
            description = "Returns the student with the largest negative GPA delta compared to the previous term")
    public ResponseEntity<ApiResponse> getMostDeclined(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        ImprovementDto declined = powerRankingService.getMostDeclined(schoolId, termId);
        return ResponseUtil.ok("Most declined student retrieved successfully", declined);
    }

    @GetMapping("/scholarship-candidates")
    @Operation(summary = "Get scholarship candidates",
            description = "Returns students with CGPA >= 3.5, ordered by CGPA descending, with consecutive terms count")
    public ResponseEntity<ApiResponse> getScholarshipCandidates(
            @Parameter(description = "School ID") @RequestParam Long schoolId) {
        List<ScholarshipCandidateDto> candidates = powerRankingService.getScholarshipCandidates(schoolId);
        return ResponseUtil.ok("Scholarship candidates retrieved successfully", candidates);
    }

    @GetMapping("/by-subject")
    @Operation(summary = "Get top student per subject",
            description = "Returns the highest-scoring student for each subject in the given term")
    public ResponseEntity<ApiResponse> getTopStudentPerSubject(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        List<SubjectTopStudentDto> topPerSubject = powerRankingService.getTopStudentPerSubject(schoolId, termId);
        return ResponseUtil.ok("Top student per subject retrieved successfully", topPerSubject);
    }

    @GetMapping("/by-class")
    @Operation(summary = "Get top student per class",
            description = "Returns the highest-GPA student for each active classroom in the given term")
    public ResponseEntity<ApiResponse> getTopStudentPerClass(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        List<ClassTopStudentDto> topPerClass = powerRankingService.getTopStudentPerClass(schoolId, termId);
        return ResponseUtil.ok("Top student per class retrieved successfully", topPerClass);
    }
}
