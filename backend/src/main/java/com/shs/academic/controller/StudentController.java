package com.shs.academic.controller;

import com.shs.academic.model.dto.ApiResponse;
import com.shs.academic.model.dto.student.*;
import com.shs.academic.service.StudentPortalService;
import com.shs.academic.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/students")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
@Tag(name = "Student Portal", description = "Student-facing academic data. Students can only access their own data.")
public class StudentController {

    private final StudentPortalService studentPortalService;

    // ================================================================
    // PROFILE
    // ================================================================

    @GetMapping("/profile")
    @Operation(summary = "Get my profile",
            description = "Returns the authenticated student's full profile. Students can only access their own data.")
    public ResponseEntity<ApiResponse> getMyProfile() {
        Long userId = SecurityUtil.getCurrentUserId();
        StudentProfileDto profile = studentPortalService.getMyProfile(userId);
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved", profile));
    }

    @PutMapping("/profile")
    @Operation(summary = "Update my profile",
            description = "Students can only update: phoneNumber, residentialAddress, profilePhotoUrl. Students can only access their own data.")
    public ResponseEntity<ApiResponse> updateMyProfile(
            @RequestBody UpdateStudentProfileRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        StudentProfileDto profile = studentPortalService.updateMyProfile(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated", profile));
    }

    // ================================================================
    // RESULTS
    // ================================================================

    @GetMapping("/results")
    @Operation(summary = "Get my term result with subject scores",
            description = "Returns full term result with all subject scores. Only published results are visible. Students can only access their own data.")
    public ResponseEntity<ApiResponse> getMyTermResult(@RequestParam Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        StudentTermResultDto result = studentPortalService.getMyTermResult(userId, termId);
        return ResponseEntity.ok(ApiResponse.success("Term result retrieved", result));
    }

    @GetMapping("/results/all")
    @Operation(summary = "Get all my term results (summary)",
            description = "Returns summary of all published term results, ordered chronologically. Students can only access their own data.")
    public ResponseEntity<ApiResponse> getMyAllTermResults() {
        Long userId = SecurityUtil.getCurrentUserId();
        List<TermResultSummaryDto> results = studentPortalService.getMyAllTermResults(userId);
        return ResponseEntity.ok(ApiResponse.success("All term results retrieved", results));
    }

    @GetMapping("/results/latest")
    @Operation(summary = "Get my latest term result",
            description = "Returns the most recent published term result with full score breakdown. Students can only access their own data.")
    public ResponseEntity<ApiResponse> getMyLatestTermResult() {
        Long userId = SecurityUtil.getCurrentUserId();
        StudentTermResultDto result = studentPortalService.getMyLatestTermResult(userId);
        return ResponseEntity.ok(ApiResponse.success("Latest result retrieved", result));
    }

    // ================================================================
    // GPA
    // ================================================================

    @GetMapping("/gpa")
    @Operation(summary = "Get my GPA history and CGPA progression",
            description = "Returns term-by-term GPA history, CGPA progression after each term, current CGPA and classification. Students can only access their own data.")
    public ResponseEntity<ApiResponse> getMyGpaHistory() {
        Long userId = SecurityUtil.getCurrentUserId();
        StudentGpaHistoryDto gpaHistory = studentPortalService.getMyGpaHistory(userId);
        return ResponseEntity.ok(ApiResponse.success("GPA history retrieved", gpaHistory));
    }

    // ================================================================
    // SUBJECTS
    // ================================================================

    @GetMapping("/subjects/performance")
    @Operation(summary = "Get my subject performance across all terms",
            description = "Returns per-subject stats: best/worst/average scores, trends, strongest and weakest subjects. Students can only access their own data.")
    public ResponseEntity<ApiResponse> getMySubjectPerformance() {
        Long userId = SecurityUtil.getCurrentUserId();
        SubjectPerformanceSummaryDto performance = studentPortalService.getMySubjectPerformance(userId);
        return ResponseEntity.ok(ApiResponse.success("Subject performance retrieved", performance));
    }

    // ================================================================
    // TRANSCRIPT
    // ================================================================

    @GetMapping("/transcript")
    @Operation(summary = "Get my full academic transcript",
            description = "Returns a full transcript with all term results. Requires at least one published result. Students can only access their own data.")
    public ResponseEntity<ApiResponse> getMyTranscript() {
        Long userId = SecurityUtil.getCurrentUserId();
        Object transcript = studentPortalService.getMyTranscript(userId);
        return ResponseEntity.ok(ApiResponse.success("Transcript retrieved", transcript));
    }

    @GetMapping("/transcript/download")
    @Operation(summary = "Download my transcript as PDF",
            description = "Returns a PDF file of the full academic transcript. Students can only access their own data.")
    public ResponseEntity<byte[]> downloadMyTranscript() {
        Long userId = SecurityUtil.getCurrentUserId();
        byte[] pdf = studentPortalService.downloadMyTranscript(userId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Transcript.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ================================================================
    // REPORTS
    // ================================================================

    @GetMapping("/reports/download")
    @Operation(summary = "Download my term report as PDF",
            description = "Returns a PDF of the terminal report for the specified term. Only available for published results. Students can only access their own data.")
    public ResponseEntity<byte[]> downloadMyTermReport(@RequestParam Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        byte[] pdf = studentPortalService.downloadMyTermReport(userId, termId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"TermReport_" + termId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ================================================================
    // ATTENDANCE
    // ================================================================

    @GetMapping("/attendance")
    @Operation(summary = "Get my attendance summary for a term",
            description = "Returns present/absent/late counts and list of absent dates with reasons. Students can only access their own data.")
    public ResponseEntity<ApiResponse> getMyAttendanceSummary(@RequestParam Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        StudentAttendanceSummaryDto summary = studentPortalService.getMyAttendanceSummary(userId, termId);
        return ResponseEntity.ok(ApiResponse.success("Attendance summary retrieved", summary));
    }

    @GetMapping("/attendance/history")
    @Operation(summary = "Get my attendance history across all terms",
            description = "Returns attendance summary per term. Students can only access their own data.")
    public ResponseEntity<ApiResponse> getMyAttendanceHistory() {
        Long userId = SecurityUtil.getCurrentUserId();
        List<StudentAttendanceSummaryDto> history = studentPortalService.getMyAttendanceHistory(userId);
        return ResponseEntity.ok(ApiResponse.success("Attendance history retrieved", history));
    }

    // ================================================================
    // WARNINGS
    // ================================================================

    @GetMapping("/warnings")
    @Operation(summary = "Get my active academic warnings",
            description = "Returns unresolved warnings with student-friendly messages. Behavioral warnings are hidden. Students can only access their own data.")
    public ResponseEntity<ApiResponse> getMyActiveWarnings() {
        Long userId = SecurityUtil.getCurrentUserId();
        List<StudentWarningDto> warnings = studentPortalService.getMyActiveWarnings(userId);
        return ResponseEntity.ok(ApiResponse.success("Active warnings retrieved", warnings));
    }
}
