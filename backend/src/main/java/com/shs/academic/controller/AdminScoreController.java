package com.shs.academic.controller;

import com.shs.academic.model.dto.*;
import com.shs.academic.service.ScoreService;
import com.shs.academic.util.ResponseUtil;
import com.shs.academic.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/scores")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Admin - Score Management",
        description = "Admin overrides for score management — can modify/delete any score, even in locked terms")
public class AdminScoreController {

    private final ScoreService scoreService;

    @GetMapping
    @Operation(
            summary = "View any class score sheet",
            description = "View scores for any class, subject, and term without tutor-assignment restrictions.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Score sheet retrieved"),
            @ApiResponse(responseCode = "404", description = "Class, subject, or term not found")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> getScoreSheet(
            @Parameter(description = "ClassRoom ID", required = true) @RequestParam Long classRoomId,
            @Parameter(description = "Subject ID", required = true) @RequestParam Long subjectId,
            @Parameter(description = "Term ID", required = true) @RequestParam Long termId) {
        TutorScoreSheetDto sheet = scoreService.adminGetScoreSheet(classRoomId, subjectId, termId);
        return ResponseUtil.ok("Score sheet retrieved successfully", sheet);
    }

    @PutMapping("/{scoreId}")
    @Operation(
            summary = "Admin override a score",
            description = "Override any score, even if the term is locked. The enteredBy field will be updated " +
                    "to the admin performing the override, creating an audit trail.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Score overridden"),
            @ApiResponse(responseCode = "400", description = "Score out of valid range"),
            @ApiResponse(responseCode = "404", description = "Score not found")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> adminUpdateScore(
            @Parameter(description = "Score ID") @PathVariable Long scoreId,
            @Valid @RequestBody ScoreUpdateRequest request) {
        Long adminId = SecurityUtil.getCurrentUserId();
        ScoreDto score = scoreService.adminUpdateScore(adminId, scoreId, request);
        return ResponseUtil.ok("Score overridden successfully", score);
    }

    @DeleteMapping("/{scoreId}")
    @Operation(
            summary = "Delete a score",
            description = "Permanently deletes a score record. This action cannot be undone. " +
                    "The student will appear as having no score for this subject/term.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Score deleted"),
            @ApiResponse(responseCode = "404", description = "Score not found")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> adminDeleteScore(
            @Parameter(description = "Score ID") @PathVariable Long scoreId) {
        scoreService.adminDeleteScore(scoreId);
        return ResponseUtil.ok("Score deleted successfully");
    }

    @GetMapping("/missing")
    @Operation(
            summary = "Get missing scores",
            description = "Shows all students with missing scores for any subject in a given class this term. " +
                    "Results are grouped by subject and include the responsible tutor's name. " +
                    "Only subjects with at least one missing student are returned.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Missing scores report retrieved"),
            @ApiResponse(responseCode = "404", description = "Class or term not found")
    })
    public ResponseEntity<com.shs.academic.model.dto.ApiResponse> getMissingScores(
            @Parameter(description = "ClassRoom ID", required = true) @RequestParam Long classRoomId,
            @Parameter(description = "Term ID", required = true) @RequestParam Long termId) {
        ScoreCompletionStatusDto report = scoreService.getMissingScores(classRoomId, termId);
        return ResponseUtil.ok("Missing scores report retrieved successfully", report);
    }
}
