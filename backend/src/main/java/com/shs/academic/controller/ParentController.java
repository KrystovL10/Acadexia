package com.shs.academic.controller;

import com.shs.academic.model.dto.ApiResponse;
import com.shs.academic.model.dto.EarlyWarningDto;
import com.shs.academic.model.dto.StudentSummaryDto;
import com.shs.academic.model.dto.TermResultDto;
import com.shs.academic.model.entity.User;
import com.shs.academic.service.ParentService;
import com.shs.academic.util.ResponseUtil;
import com.shs.academic.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/parents")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PARENT')")
@Tag(name = "Parent", description = "Parent access to child's academic records")
public class ParentController {

    private final ParentService parentService;

    @GetMapping("/my-children")
    @Operation(summary = "Get parent's linked children",
            description = "Returns all active students whose guardian email matches the logged-in parent's email")
    public ResponseEntity<ApiResponse> getMyChildren() {
        User parent = SecurityUtil.getCurrentPrincipal().getUser();
        List<StudentSummaryDto> children = parentService.getMyChildren(parent);
        return ResponseUtil.ok("Children retrieved successfully", children);
    }

    @GetMapping("/children/{studentId}/term-results")
    @Operation(summary = "Get a child's term results",
            description = "Returns all term results for the specified child. Access is denied if the student is not linked to this parent.")
    public ResponseEntity<ApiResponse> getChildTermResults(
            @Parameter(description = "Student ID") @PathVariable Long studentId) {
        User parent = SecurityUtil.getCurrentPrincipal().getUser();
        List<TermResultDto> results = parentService.getChildTermResults(parent, studentId);
        return ResponseUtil.ok("Term results retrieved successfully", results);
    }

    @GetMapping("/children/{studentId}/warnings")
    @Operation(summary = "Get a child's academic warnings",
            description = "Returns all early warning records for the specified child. Access is denied if the student is not linked to this parent.")
    public ResponseEntity<ApiResponse> getChildWarnings(
            @Parameter(description = "Student ID") @PathVariable Long studentId) {
        User parent = SecurityUtil.getCurrentPrincipal().getUser();
        List<EarlyWarningDto> warnings = parentService.getChildWarnings(parent, studentId);
        return ResponseUtil.ok("Warnings retrieved successfully", warnings);
    }
}
