package com.shs.academic.controller;

import com.shs.academic.model.dto.ApiResponse;
import com.shs.academic.model.dto.AttendanceStatsDto;
import com.shs.academic.model.dto.stats.*;
import com.shs.academic.service.AttendanceService;
import com.shs.academic.service.StatisticsService;
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
@RequestMapping("/api/v1/admin/stats")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Admin - Statistics & Analytics", description = "Dashboard statistics and analytics endpoints for Super Admin")
public class AdminStatsController {

    private final StatisticsService statisticsService;
    private final AttendanceService attendanceService;

    @GetMapping("/dashboard")
    @Operation(summary = "Get admin dashboard stats",
            description = "Returns overview statistics including student/teacher counts, GPA, pass/fail rates, warnings, and per-subject/year-group breakdowns")
    public ResponseEntity<ApiResponse> getAdminDashboardStats(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        AdminDashboardStatsDto stats = statisticsService.getAdminDashboardStats(schoolId, termId);
        return ResponseUtil.ok("Dashboard statistics retrieved successfully", stats);
    }

    @GetMapping("/term-comparison")
    @Operation(summary = "Get term comparison data",
            description = "Returns GPA averages per term grouped by year group, for bar/line chart visualization")
    public ResponseEntity<ApiResponse> getTermComparisonData(
            @Parameter(description = "School ID") @RequestParam Long schoolId) {
        List<TermComparisonDto> data = statisticsService.getTermComparisonData(schoolId);
        return ResponseUtil.ok("Term comparison data retrieved successfully", data);
    }

    @GetMapping("/grade-distribution")
    @Operation(summary = "Get grade distribution",
            description = "Returns count and percentage of students per grade (A1-F9), for pie/donut chart")
    public ResponseEntity<ApiResponse> getGradeDistribution(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        List<GradeDistributionDto> data = statisticsService.getGradeDistribution(schoolId, termId);
        return ResponseUtil.ok("Grade distribution retrieved successfully", data);
    }

    @GetMapping("/class-performance")
    @Operation(summary = "Get class performance comparison",
            description = "Returns GPA average per class ordered best to worst, with student count and pass rate")
    public ResponseEntity<ApiResponse> getClassPerformanceComparison(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        List<ClassPerformanceDto> data = statisticsService.getClassPerformanceComparison(schoolId, termId);
        return ResponseUtil.ok("Class performance comparison retrieved successfully", data);
    }

    @GetMapping("/subject-weakness")
    @Operation(summary = "Get subject weakness analysis",
            description = "Returns subjects with highest failure rates across the school, for AI insight generation")
    public ResponseEntity<ApiResponse> getSubjectWeaknessAnalysis(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        List<SubjectWeaknessDto> data = statisticsService.getSubjectWeaknessAnalysis(schoolId, termId);
        return ResponseUtil.ok("Subject weakness analysis retrieved successfully", data);
    }

    @GetMapping("/enrollment-trends")
    @Operation(summary = "Get enrollment trends",
            description = "Returns student counts per program per academic year, for multi-year line chart")
    public ResponseEntity<ApiResponse> getEnrollmentTrends(
            @Parameter(description = "School ID") @RequestParam Long schoolId) {
        List<EnrollmentTrendDto> data = statisticsService.getEnrollmentTrends(schoolId);
        return ResponseUtil.ok("Enrollment trends retrieved successfully", data);
    }

    @GetMapping("/attendance")
    @Operation(summary = "Get school-wide attendance statistics for a term")
    public ResponseEntity<ApiResponse> getSchoolAttendanceStats(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        AttendanceStatsDto stats = attendanceService.getSchoolAttendanceStats(schoolId, termId);
        return ResponseUtil.ok("School attendance statistics retrieved successfully", stats);
    }

    @GetMapping("/attendance/class")
    @Operation(summary = "Get attendance statistics for a specific class and term")
    public ResponseEntity<ApiResponse> getClassAttendanceStats(
            @Parameter(description = "ClassRoom ID") @RequestParam Long classRoomId,
            @Parameter(description = "Term ID") @RequestParam Long termId) {
        AttendanceStatsDto stats = attendanceService.getClassAttendanceStats(classRoomId, termId);
        return ResponseUtil.ok("Class attendance statistics retrieved successfully", stats);
    }
}
