package com.shs.academic.controller;

import com.shs.academic.exception.BadRequestException;
import com.shs.academic.model.dto.*;
import com.shs.academic.service.ScoreService;
import com.shs.academic.util.ResponseUtil;
import com.shs.academic.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tutors")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('TUTOR', 'CLASS_TEACHER')")
@Tag(name = "Tutor - Score Entry", description = "Score entry and management endpoints for subject tutors and class teachers")
public class TutorController {

    private final ScoreService scoreService;

    // ==================== ASSIGNMENT ENDPOINTS ====================

    @GetMapping("/assignments")
    @Operation(
            summary = "Get tutor assignments",
            description = "Returns all class-subject assignments for the authenticated tutor with score completion stats. " +
                    "If termId is omitted, the current active term is used automatically.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Assignments retrieved"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Insufficient role")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> getTutorAssignments(
            @Parameter(description = "Term ID (optional — defaults to current term)")
            @RequestParam(required = false) Long termId) {
        Long tutorId = SecurityUtil.getCurrentUserId();
        List<TutorAssignmentDto> assignments = scoreService.getTutorAssignments(tutorId, termId);
        return ResponseUtil.ok("Assignments retrieved successfully", assignments);
    }

    @GetMapping("/assignments/subjects")
    @Operation(
            summary = "Get tutor's subjects",
            description = "Returns all distinct subjects this tutor teaches across all active class assignments. " +
                    "Useful for populating subject selectors in the UI.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Subjects retrieved"),
            @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> getTutorSubjects() {
        Long tutorId = SecurityUtil.getCurrentUserId();
        List<SubjectDto> subjects = scoreService.getTutorSubjects(tutorId);
        return ResponseUtil.ok("Subjects retrieved successfully", subjects);
    }

    // ==================== SCORE SHEET ENDPOINTS ====================

    @GetMapping("/scores/sheet")
    @Operation(
            summary = "Get score sheet",
            description = "Retrieves the full score sheet for a class-subject-term combination. " +
                    "Includes per-student scores (or null if not yet entered) and overall completion stats.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Score sheet retrieved"),
            @ApiResponse(responseCode = "403", description = "Tutor not assigned to this class/subject"),
            @ApiResponse(responseCode = "404", description = "Class, subject, or term not found")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> getScoreSheet(
            @Parameter(description = "ClassRoom ID", required = true) @RequestParam Long classRoomId,
            @Parameter(description = "Subject ID", required = true) @RequestParam Long subjectId,
            @Parameter(description = "Term ID", required = true) @RequestParam Long termId) {
        Long tutorId = SecurityUtil.getCurrentUserId();
        TutorScoreSheetDto sheet = scoreService.getScoreSheet(tutorId, classRoomId, subjectId, termId);
        return ResponseUtil.ok("Score sheet retrieved successfully", sheet);
    }

    @GetMapping("/scores/completion")
    @Operation(
            summary = "Get score completion stats",
            description = "Returns completion statistics for a specific subject in a class, " +
                    "including a list of students who have not yet had scores entered.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Completion stats retrieved"),
            @ApiResponse(responseCode = "403", description = "Tutor not assigned to this class/subject"),
            @ApiResponse(responseCode = "404", description = "Class, subject, or term not found")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> getScoreCompletion(
            @Parameter(description = "ClassRoom ID", required = true) @RequestParam Long classRoomId,
            @Parameter(description = "Subject ID", required = true) @RequestParam Long subjectId,
            @Parameter(description = "Term ID", required = true) @RequestParam Long termId) {
        Long tutorId = SecurityUtil.getCurrentUserId();
        ScoreCompletionDto completion = scoreService.getScoreCompletion(
                tutorId, classRoomId, subjectId, termId);
        return ResponseUtil.ok("Completion stats retrieved successfully", completion);
    }

    // ==================== SCORE ENTRY ENDPOINTS ====================

    @PostMapping("/scores")
    @Operation(
            summary = "Enter a score",
            description = "Enter or update a score for a single student. If a score already exists for this " +
                    "student/subject/term combination, it will be updated (tutor can correct before lock).")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Score entered successfully"),
            @ApiResponse(responseCode = "400", description = "Validation error or score out of range"),
            @ApiResponse(responseCode = "403", description = "Tutor not assigned to this class/subject"),
            @ApiResponse(responseCode = "423", description = "Term is locked — score entry is closed")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> enterScore(
            @Valid @RequestBody ScoreEntryRequest request) {
        Long tutorId = SecurityUtil.getCurrentUserId();
        ScoreDto score = scoreService.enterScore(tutorId, request);
        return ResponseUtil.created("Score entered successfully", score);
    }

    @PostMapping("/scores/bulk")
    @Operation(
            summary = "Enter bulk scores",
            description = "Enter scores for multiple students at once. Processing continues on individual errors — " +
                    "check the returned errors list for any failures.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Bulk entry completed (check successCount/failureCount)"),
            @ApiResponse(responseCode = "403", description = "Tutor not assigned to this class/subject"),
            @ApiResponse(responseCode = "423", description = "Term is locked")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> enterBulkScores(
            @Valid @RequestBody BulkScoreEntryRequest request) {
        Long tutorId = SecurityUtil.getCurrentUserId();
        BulkScoreResultDto result = scoreService.enterBulkScores(tutorId, request);
        return ResponseUtil.ok("Bulk score entry completed", result);
    }

    @PutMapping("/scores/{scoreId}")
    @Operation(
            summary = "Update a score",
            description = "Update an existing score. The tutor must be the original enterer and the term must not be locked.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Score updated"),
            @ApiResponse(responseCode = "400", description = "Score out of valid range"),
            @ApiResponse(responseCode = "403", description = "Score was entered by a different tutor"),
            @ApiResponse(responseCode = "404", description = "Score not found"),
            @ApiResponse(responseCode = "423", description = "Term is locked")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> updateScore(
            @Parameter(description = "Score ID") @PathVariable Long scoreId,
            @Valid @RequestBody ScoreUpdateRequest request) {
        Long tutorId = SecurityUtil.getCurrentUserId();
        ScoreDto score = scoreService.updateScore(tutorId, scoreId, request);
        return ResponseUtil.ok("Score updated successfully", score);
    }

    @PatchMapping("/scores/mark-absent")
    @Operation(
            summary = "Mark student absent",
            description = "Creates or updates a score record with isAbsent=true and all score fields set to null. " +
                    "The student will appear in reports as absent for this subject/term.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Student marked absent"),
            @ApiResponse(responseCode = "403", description = "Tutor not assigned to this class/subject"),
            @ApiResponse(responseCode = "404", description = "Student, subject, class, or term not found"),
            @ApiResponse(responseCode = "423", description = "Term is locked")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> markAbsent(
            @Valid @RequestBody MarkAbsentRequest request) {
        Long tutorId = SecurityUtil.getCurrentUserId();
        ScoreDto score = scoreService.markAbsent(tutorId, request);
        return ResponseUtil.ok("Student marked absent successfully", score);
    }

    // ==================== EXCEL IMPORT / EXPORT ====================

    @GetMapping("/scores/template")
    @Operation(
            summary = "Download score sheet template",
            description = "Downloads an Excel (.xlsx) template pre-filled with student names and indexes for the " +
                    "specified class, subject, and term. Fill in ClassScore and ExamScore columns, then upload via /import.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Template file returned"),
            @ApiResponse(responseCode = "404", description = "Class, subject, or term not found")
    })
    public ResponseEntity<byte[]> generateScoreSheetTemplate(
            @Parameter(description = "ClassRoom ID", required = true) @RequestParam Long classRoomId,
            @Parameter(description = "Subject ID", required = true) @RequestParam Long subjectId,
            @Parameter(description = "Term ID", required = true) @RequestParam Long termId) {

        byte[] template = scoreService.generateScoreSheetTemplate(classRoomId, subjectId, termId);
        String filename = scoreService.buildTemplateFilename(classRoomId, subjectId, termId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(template);
    }

    @PostMapping(value = "/scores/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Import scores from Excel",
            description = "Upload a completed score sheet template (.xlsx or .xls) to bulk-import scores. " +
                    "Expected columns: StudentIndex, StudentName (ignored), ClassScore, ExamScore. " +
                    "Processing continues on individual row errors.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Import completed (check successCount/failureCount)"),
            @ApiResponse(responseCode = "400", description = "Invalid file type or unparseable file"),
            @ApiResponse(responseCode = "403", description = "Tutor not assigned to this class/subject"),
            @ApiResponse(responseCode = "423", description = "Term is locked")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> importScoresFromExcel(
            @Parameter(description = "ClassRoom ID", required = true) @RequestParam Long classRoomId,
            @Parameter(description = "Subject ID", required = true) @RequestParam Long subjectId,
            @Parameter(description = "Term ID", required = true) @RequestParam Long termId,
            @Parameter(description = "Excel file (.xlsx or .xls)", required = true)
            @RequestParam("file") MultipartFile file) {

        validateExcelFile(file);
        Long tutorId = SecurityUtil.getCurrentUserId();
        BulkScoreResultDto result = scoreService.importScoresFromExcel(
                tutorId, classRoomId, subjectId, termId, file);
        return ResponseUtil.ok("Import completed", result);
    }

    // ==================== PRIVATE HELPERS ====================

    private void validateExcelFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Uploaded file is empty");
        }
        String filename = file.getOriginalFilename();
        if (filename == null
                || (!filename.toLowerCase().endsWith(".xlsx")
                        && !filename.toLowerCase().endsWith(".xls"))) {
            throw new BadRequestException(
                    "Invalid file type. Only .xlsx and .xls files are accepted");
        }
    }
}
