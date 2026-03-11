package com.shs.academic.controller;

import com.shs.academic.model.dto.*;
import com.shs.academic.model.dto.ai.AttendanceCorrelationDto;
import com.shs.academic.model.dto.ai.ClassInsightsDto;
import com.shs.academic.model.entity.TermResult;
import com.shs.academic.service.AttendanceService;
import com.shs.academic.service.BehaviorService;
import com.shs.academic.service.ClassTeacherService;
import com.shs.academic.service.PdfGeneratorService;
import com.shs.academic.service.ReportProgressService;
import com.shs.academic.service.ReportService;
import com.shs.academic.service.ai.AttendanceCorrelationService;
import com.shs.academic.service.ai.SchoolInsightAiService;
import com.shs.academic.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/teachers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CLASS_TEACHER')")
@Tag(name = "Class Teacher", description = "Class teacher management endpoints")
public class TeacherController {

    private final ClassTeacherService classTeacherService;
    private final AttendanceService attendanceService;
    private final AttendanceCorrelationService attendanceCorrelationService;
    private final BehaviorService behaviorService;
    private final ReportService reportService;
    private final PdfGeneratorService pdfGeneratorService;
    private final ReportProgressService reportProgressService;
    private final SchoolInsightAiService schoolInsightAiService;

    // ================================================================
    // CLASS INFO
    // ================================================================

    @GetMapping("/class")
    @Operation(summary = "Get my assigned class details")
    public ResponseEntity<ApiResponse> getMyClass() {
        Long userId = SecurityUtil.getCurrentUserId();
        ClassRoomDto dto = classTeacherService.getMyClass(userId);
        return ResponseEntity.ok(ApiResponse.success("Class retrieved", dto));
    }

    // ================================================================
    // DASHBOARD
    // ================================================================

    @GetMapping("/dashboard")
    @Operation(summary = "Get class dashboard with stats, GPA, attendance summary")
    public ResponseEntity<ApiResponse> getDashboard(
            @RequestParam(required = false) Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        ClassDashboardDto dto = classTeacherService.getClassDashboard(userId, termId);
        return ResponseEntity.ok(ApiResponse.success("Dashboard retrieved", dto));
    }

    // ================================================================
    // STUDENT MANAGEMENT
    // ================================================================

    @GetMapping("/students")
    @Operation(summary = "Get all students in my class")
    public ResponseEntity<ApiResponse> getStudents() {
        Long userId = SecurityUtil.getCurrentUserId();
        List<StudentSummaryDto> students = classTeacherService.getClassStudents(userId);
        return ResponseEntity.ok(ApiResponse.success("Students retrieved", students));
    }

    @GetMapping("/students/{studentId}")
    @Operation(summary = "Get full detail for a single student in my class")
    public ResponseEntity<ApiResponse> getStudentDetail(
            @PathVariable Long studentId) {
        Long userId = SecurityUtil.getCurrentUserId();
        StudentDetailDto dto = classTeacherService.getStudentDetail(userId, studentId);
        return ResponseEntity.ok(ApiResponse.success("Student detail retrieved", dto));
    }

    // ================================================================
    // SCORE OVERVIEW (read-only)
    // ================================================================

    @GetMapping("/scores")
    @Operation(summary = "Get full score matrix for this class and term (read-only)")
    public ResponseEntity<ApiResponse> getScoreOverview(
            @RequestParam(required = false) Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        ClassScoreOverviewDto dto = classTeacherService.getClassScoreOverview(userId, termId);
        return ResponseEntity.ok(ApiResponse.success("Score overview retrieved", dto));
    }

    // ================================================================
    // ATTENDANCE
    // ================================================================

    @PostMapping("/attendance")
    @Operation(summary = "Mark bulk attendance for the class (upsert — safe to re-submit)")
    public ResponseEntity<ApiResponse> markAttendance(
            @Valid @RequestBody BulkAttendanceRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        AttendanceResultDto dto = attendanceService.markBulkAttendance(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Attendance marked", dto));
    }

    @PostMapping("/attendance/single")
    @Operation(summary = "Mark or update attendance for a single student")
    public ResponseEntity<ApiResponse> markSingleAttendance(
            @Valid @RequestBody MarkSingleAttendanceRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        AttendanceDto dto = attendanceService.markSingleAttendance(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Attendance updated", dto));
    }

    @GetMapping("/attendance/today")
    @Operation(summary = "Get today's attendance report for the class")
    public ResponseEntity<ApiResponse> getTodayAttendance(
            @RequestParam Long classRoomId,
            @RequestParam Long termId) {
        DailyAttendanceReportDto dto = attendanceService.getTodayAttendance(classRoomId, termId);
        return ResponseEntity.ok(ApiResponse.success("Today's attendance retrieved", dto));
    }

    @GetMapping("/attendance/daily")
    @Operation(summary = "Get attendance report for a specific date")
    public ResponseEntity<ApiResponse> getDailyAttendance(
            @RequestParam Long classRoomId,
            @RequestParam Long termId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DailyAttendanceReportDto dto = attendanceService
                .getDailyAttendanceReport(classRoomId, termId, date);
        return ResponseEntity.ok(ApiResponse.success("Daily attendance retrieved", dto));
    }

    @GetMapping("/attendance/stats")
    @Operation(summary = "Get attendance statistics for a class and term")
    public ResponseEntity<ApiResponse> getAttendanceStats(
            @RequestParam Long classRoomId,
            @RequestParam Long termId) {
        AttendanceStatsDto dto = attendanceService.getClassAttendanceStats(classRoomId, termId);
        return ResponseEntity.ok(ApiResponse.success("Attendance stats retrieved", dto));
    }

    @GetMapping("/attendance/rows")
    @Operation(summary = "Get per-student attendance rows with daily status map")
    public ResponseEntity<ApiResponse> getAttendanceRows(
            @RequestParam Long classRoomId,
            @RequestParam Long termId) {
        List<StudentAttendanceRowDto> rows = attendanceService
                .getStudentAttendanceRows(classRoomId, termId);
        return ResponseEntity.ok(ApiResponse.success("Attendance rows retrieved", rows));
    }

    @GetMapping("/attendance")
    @Operation(summary = "Get per-student attendance summary for the term (legacy)")
    public ResponseEntity<ApiResponse> getAttendanceSummary(
            @RequestParam(required = false) Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        List<AttendanceSummaryDto> dto = classTeacherService
                .getClassAttendanceSummary(userId, termId);
        return ResponseEntity.ok(ApiResponse.success("Attendance summary retrieved", dto));
    }

    @GetMapping("/attendance/sheet")
    @Operation(summary = "Get attendance matrix (student × date) for a date range")
    public ResponseEntity<ApiResponse> getAttendanceSheet(
            @RequestParam Long classRoomId,
            @RequestParam Long termId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        AttendanceSheetDto dto = attendanceService
                .getClassAttendanceSheet(classRoomId, termId, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success("Attendance sheet retrieved", dto));
    }

    @GetMapping("/attendance/correlation")
    @Operation(summary = "Get AI-powered attendance–GPA correlation analysis for the class")
    public ResponseEntity<ApiResponse> getAttendanceCorrelation(
            @RequestParam Long classRoomId,
            @RequestParam Long termId) {
        AttendanceCorrelationDto dto = attendanceCorrelationService
                .analyzeCorrelation(classRoomId, termId);
        return ResponseEntity.ok(ApiResponse.success("Attendance correlation retrieved", dto));
    }

    // ================================================================
    // BEHAVIOR LOG
    // ================================================================

    @PostMapping("/behavior")
    @Operation(summary = "Create a behavior log entry for a student (with auto-warning trigger)")
    public ResponseEntity<ApiResponse> createBehaviorLog(
            @Valid @RequestBody CreateBehaviorLogRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        BehaviorLogDto dto = behaviorService.createBehaviorLog(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Behavior log added", dto));
    }

    @PutMapping("/behavior/{logId}")
    @Operation(summary = "Update description and/or severity of a behavior log you created")
    public ResponseEntity<ApiResponse> updateBehaviorLog(
            @PathVariable Long logId,
            @Valid @RequestBody UpdateBehaviorLogRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        BehaviorLogDto dto = behaviorService.updateBehaviorLog(userId, logId, request);
        return ResponseEntity.ok(ApiResponse.success("Behavior log updated", dto));
    }

    @DeleteMapping("/behavior/{logId}")
    @Operation(summary = "Soft-delete a behavior log you created (auto-resolves linked warning)")
    public ResponseEntity<ApiResponse> deleteBehaviorLog(@PathVariable Long logId) {
        Long userId = SecurityUtil.getCurrentUserId();
        behaviorService.deleteBehaviorLog(userId, logId);
        return ResponseEntity.ok(ApiResponse.success("Behavior log deleted", null));
    }

    @GetMapping("/behavior")
    @Operation(summary = "Get behavior logs for this class this term, with optional filters")
    public ResponseEntity<ApiResponse> getClassBehaviorLogs(
            @RequestParam(required = false) Long termId,
            @RequestParam(required = false) String logType,
            @RequestParam(required = false) String severity) {
        Long userId = SecurityUtil.getCurrentUserId();
        List<BehaviorLogDto> logs = behaviorService.getClassBehaviorLogs(
                userId, termId, logType, severity);
        return ResponseEntity.ok(ApiResponse.success("Behavior logs retrieved", logs));
    }

    @GetMapping("/behavior/student/{studentId}")
    @Operation(summary = "Get behavior logs for a specific student this term")
    public ResponseEntity<ApiResponse> getStudentBehaviorLogs(
            @PathVariable Long studentId,
            @RequestParam(required = false) Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        List<BehaviorLogDto> logs = classTeacherService
                .getStudentBehaviorLogs(userId, studentId, termId);
        return ResponseEntity.ok(ApiResponse.success("Student behavior logs retrieved", logs));
    }

    @GetMapping("/behavior/student/{studentId}/summary")
    @Operation(summary = "Get full behavior summary with conduct score and AI assessment for a student")
    public ResponseEntity<ApiResponse> getStudentBehaviorSummary(
            @PathVariable Long studentId,
            @RequestParam(required = false) Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        StudentBehaviorSummaryDto dto = behaviorService
                .getStudentBehaviorSummary(userId, studentId, termId);
        return ResponseEntity.ok(ApiResponse.success("Student behavior summary retrieved", dto));
    }

    @GetMapping("/behavior/report")
    @Operation(summary = "Get class behavior report: leaderboard, concerns, and summary stats")
    public ResponseEntity<ApiResponse> getClassBehaviorReport(
            @RequestParam(required = false) Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        ClassBehaviorReportDto dto = behaviorService.getClassBehaviorReport(userId, termId);
        return ResponseEntity.ok(ApiResponse.success("Class behavior report retrieved", dto));
    }

    // ================================================================
    // REPORTS
    // ================================================================

    @GetMapping("/reports/readiness")
    @Operation(summary = "Check if the class is ready to generate reports")
    public ResponseEntity<ApiResponse> checkReadiness(
            @RequestParam Long classRoomId,
            @RequestParam Long termId) {
        ReportReadinessDto dto = reportService.checkReportReadiness(classRoomId, termId);
        return ResponseEntity.ok(ApiResponse.success("Readiness checked", dto));
    }

    @GetMapping("/reports/progress")
    @Operation(summary = "Get report generation progress for a class/term")
    public ResponseEntity<ApiResponse> getReportProgress(
            @RequestParam Long classRoomId,
            @RequestParam Long termId) {
        var progress = reportProgressService.getProgress(classRoomId, termId);
        if (progress == null) {
            return ResponseEntity.ok(ApiResponse.success("No generation in progress", null));
        }
        return ResponseEntity.ok(ApiResponse.success("Progress retrieved", progress));
    }

    @PostMapping("/reports/generate")
    @Operation(summary = "Generate term results for all students in this class")
    public ResponseEntity<ApiResponse> generateReports(
            @Valid @RequestBody GenerateReportsRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        List<TermResult> results =
                reportService.generateAllTermResults(userId, request.getTermId());
        List<TermResultDto> dtos = results.stream()
                .map(TermResultDto::fromEntity)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(
                dtos.size() + " report(s) generated", dtos));
    }

    @GetMapping("/reports/{termId}/download")
    @Operation(summary = "Download all student reports as a ZIP of PDFs")
    public ResponseEntity<byte[]> downloadClassReports(@PathVariable Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        // Resolve classRoomId from teacher
        ClassRoomDto classRoom = classTeacherService.getMyClass(userId);
        byte[] zip = pdfGeneratorService.generateClassReportZip(classRoom.getId(), termId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"class_reports_term" + termId + ".zip\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zip);
    }

    @GetMapping("/students/{studentId}/reports/{termId}")
    @Operation(summary = "Download a single student's terminal report PDF")
    public ResponseEntity<byte[]> getStudentReport(
            @PathVariable Long studentId, @PathVariable Long termId) {
        byte[] pdf = pdfGeneratorService.generateTerminalReportPdf(studentId, termId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"report_student" + studentId + "_term"
                                + termId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @PutMapping("/term-results/{termResultId}/remarks")
    @Operation(summary = "Update class teacher remarks and conduct rating for a term result")
    public ResponseEntity<ApiResponse> updateRemarks(
            @PathVariable Long termResultId,
            @RequestBody UpdateRemarksRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        TermResult updated = reportService.updateRemarks(userId, termResultId, request);
        return ResponseEntity.ok(ApiResponse.success("Remarks updated",
                TermResultDto.fromEntity(updated)));
    }

    // ================================================================
    // AI INSIGHTS
    // ================================================================

    @PostMapping("/ai/insights")
    @Operation(summary = "Generate fresh AI insights for this class")
    public ResponseEntity<ApiResponse> generateClassInsights(
            @RequestParam Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        ClassRoomDto classRoom = classTeacherService.getMyClass(userId);
        schoolInsightAiService.invalidateClassInsights(classRoom.getId(), termId);
        ClassInsightsDto dto = schoolInsightAiService.generateClassInsights(classRoom.getId(), termId);
        return ResponseEntity.ok(ApiResponse.success("Class AI insights generated", dto));
    }

    @GetMapping("/ai/insights")
    @Operation(summary = "Get cached AI insights for this class")
    public ResponseEntity<ApiResponse> getClassInsights(
            @RequestParam Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        ClassRoomDto classRoom = classTeacherService.getMyClass(userId);
        ClassInsightsDto dto = schoolInsightAiService.generateClassInsights(classRoom.getId(), termId);
        return ResponseEntity.ok(ApiResponse.success("Class AI insights retrieved", dto));
    }

}
