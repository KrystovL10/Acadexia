package com.shs.academic.controller;

import com.shs.academic.model.dto.*;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.service.AcademicStructureService;
import com.shs.academic.util.ResponseUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Admin - Academic Structure", description = "Super Admin endpoints for managing school academic structure")
public class AdminAcademicController {

    private final AcademicStructureService academicStructureService;

    // ==================== ADMIN CONTEXT ====================

    @GetMapping("/my-context")
    @Operation(summary = "Get admin context", description = "Returns the active school, current academic year and current term for the logged-in admin")
    public ResponseEntity<ApiResponse> getAdminContext() {
        return ResponseUtil.ok("Admin context retrieved successfully",
                academicStructureService.getAdminContext());
    }

    // ==================== SCHOOL ====================

    @GetMapping("/school")
    @Operation(summary = "Get school profile", description = "Returns full school details")
    public ResponseEntity<ApiResponse> getSchoolProfile(
            @Parameter(description = "School ID") @RequestParam Long schoolId) {
        SchoolDto school = academicStructureService.getSchoolProfile(schoolId);
        return ResponseUtil.ok("School profile retrieved successfully", school);
    }

    @PutMapping("/school")
    @Operation(summary = "Update school profile", description = "Updates school name, address, phone, email, motto, headmaster, logo")
    public ResponseEntity<ApiResponse> updateSchoolProfile(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Valid @RequestBody UpdateSchoolRequest request) {
        SchoolDto school = academicStructureService.updateSchoolProfile(schoolId, request);
        return ResponseUtil.ok("School profile updated successfully", school);
    }

    // ==================== ACADEMIC YEARS ====================

    @PostMapping("/academic-years")
    @Operation(summary = "Create academic year", description = "Creates a new academic year in YYYY/YYYY format")
    public ResponseEntity<ApiResponse> createAcademicYear(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Valid @RequestBody CreateAcademicYearRequest request) {
        AcademicYearDto year = academicStructureService.createAcademicYear(schoolId, request);
        return ResponseUtil.created("Academic year created successfully", year);
    }

    @GetMapping("/academic-years")
    @Operation(summary = "Get all academic years", description = "Returns all academic years ordered by label descending")
    public ResponseEntity<ApiResponse> getAllAcademicYears(
            @Parameter(description = "School ID") @RequestParam Long schoolId) {
        return ResponseUtil.ok("Academic years retrieved successfully",
                academicStructureService.getAllAcademicYears(schoolId));
    }

    @PatchMapping("/academic-years/{id}/set-current")
    @Operation(summary = "Set current academic year", description = "Sets this academic year as current, unsetting all others")
    public ResponseEntity<ApiResponse> setCurrentAcademicYear(
            @Parameter(description = "Academic Year ID") @PathVariable Long id) {
        AcademicYearDto year = academicStructureService.setCurrentAcademicYear(id);
        return ResponseUtil.ok("Current academic year updated successfully", year);
    }

    // ==================== TERMS ====================

    @PostMapping("/terms")
    @Operation(summary = "Create term", description = "Creates a new term within an academic year")
    public ResponseEntity<ApiResponse> createTerm(@Valid @RequestBody CreateTermRequest request) {
        TermDto term = academicStructureService.createTerm(request);
        return ResponseUtil.created("Term created successfully", term);
    }

    @PatchMapping("/terms/{termId}/set-current")
    @Operation(summary = "Set current term", description = "Sets this term as current, unsetting others in the same academic year")
    public ResponseEntity<ApiResponse> setCurrentTerm(
            @Parameter(description = "Term ID") @PathVariable Long termId) {
        TermDto term = academicStructureService.setCurrentTerm(termId);
        return ResponseUtil.ok("Current term updated successfully", term);
    }

    @PatchMapping("/terms/{termId}/lock")
    @Operation(summary = "Lock term scores", description = "Locks scores for this term — tutors can no longer edit")
    public ResponseEntity<ApiResponse> lockTermScores(
            @Parameter(description = "Term ID") @PathVariable Long termId) {
        TermDto term = academicStructureService.lockTermScores(termId);
        return ResponseUtil.ok("Term scores locked successfully", term);
    }

    @PatchMapping("/terms/{termId}/unlock")
    @Operation(summary = "Unlock term scores", description = "Unlocks scores for this term — admin override for corrections")
    public ResponseEntity<ApiResponse> unlockTermScores(
            @Parameter(description = "Term ID") @PathVariable Long termId) {
        TermDto term = academicStructureService.unlockTermScores(termId);
        return ResponseUtil.ok("Term scores unlocked successfully", term);
    }

    // ==================== PROGRAMS ====================

    @PostMapping("/programs")
    @Operation(summary = "Create program", description = "Creates a new program and auto-seeds default subjects")
    public ResponseEntity<ApiResponse> createProgram(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Valid @RequestBody CreateProgramRequest request) {
        ProgramDto program = academicStructureService.createProgram(schoolId, request);
        return ResponseUtil.created("Program created successfully", program);
    }

    @GetMapping("/programs")
    @Operation(summary = "Get all programs", description = "Returns all active programs for a school with their subjects")
    public ResponseEntity<ApiResponse> getAllPrograms(
            @Parameter(description = "School ID") @RequestParam Long schoolId) {
        return ResponseUtil.ok("Programs retrieved successfully",
                academicStructureService.getAllPrograms(schoolId));
    }

    @GetMapping("/programs/{id}")
    @Operation(summary = "Get program by ID", description = "Returns a program with its full subject list")
    public ResponseEntity<ApiResponse> getProgramById(
            @Parameter(description = "Program ID") @PathVariable Long id) {
        ProgramDto program = academicStructureService.getProgramById(id);
        return ResponseUtil.ok("Program retrieved successfully", program);
    }

    @PostMapping("/programs/assign-subject")
    @Operation(summary = "Assign subject to program", description = "Links a subject to a program for a specific year group")
    public ResponseEntity<ApiResponse> assignSubjectToProgram(@Valid @RequestBody AssignSubjectRequest request) {
        ProgramSubjectDto ps = academicStructureService.assignSubjectToProgram(request);
        return ResponseUtil.created("Subject assigned to program successfully", ps);
    }

    @DeleteMapping("/programs/subject/{programSubjectId}")
    @Operation(summary = "Remove subject from program", description = "Removes a subject-program-yearGroup link")
    public ResponseEntity<ApiResponse> removeSubjectFromProgram(
            @Parameter(description = "ProgramSubject ID") @PathVariable Long programSubjectId) {
        academicStructureService.removeSubjectFromProgram(programSubjectId);
        return ResponseUtil.ok("Subject removed from program successfully");
    }

    // ==================== SUBJECTS ====================

    @PostMapping("/subjects")
    @Operation(summary = "Create subject", description = "Creates a new subject, auto-generates code if not provided")
    public ResponseEntity<ApiResponse> createSubject(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Valid @RequestBody CreateSubjectRequest request) {
        SubjectDto subject = academicStructureService.createSubject(schoolId, request);
        return ResponseUtil.created("Subject created successfully", subject);
    }

    @GetMapping("/subjects")
    @Operation(summary = "Get all subjects", description = "Returns all active subjects for a school")
    public ResponseEntity<ApiResponse> getAllSubjects(
            @Parameter(description = "School ID") @RequestParam Long schoolId) {
        return ResponseUtil.ok("Subjects retrieved successfully",
                academicStructureService.getAllSubjects(schoolId));
    }

    @PutMapping("/subjects/{id}")
    @Operation(summary = "Update subject", description = "Updates subject name, code, core/elective flags")
    public ResponseEntity<ApiResponse> updateSubject(
            @Parameter(description = "Subject ID") @PathVariable Long id,
            @Valid @RequestBody UpdateSubjectRequest request) {
        SubjectDto subject = academicStructureService.updateSubject(id, request);
        return ResponseUtil.ok("Subject updated successfully", subject);
    }

    @DeleteMapping("/subjects/{id}")
    @Operation(summary = "Delete subject", description = "Soft-deletes a subject (sets isActive = false)")
    public ResponseEntity<ApiResponse> deleteSubject(
            @Parameter(description = "Subject ID") @PathVariable Long id) {
        academicStructureService.deleteSubject(id);
        return ResponseUtil.ok("Subject deleted successfully");
    }

    // ==================== CLASSROOMS ====================

    @PostMapping("/classrooms")
    @Operation(summary = "Create classroom", description = "Creates a new classroom for a school and academic year")
    public ResponseEntity<ApiResponse> createClassRoom(@Valid @RequestBody CreateClassRoomRequest request) {
        ClassRoomDto classRoom = academicStructureService.createClassRoom(request);
        return ResponseUtil.created("Classroom created successfully", classRoom);
    }

    @GetMapping("/classrooms")
    @Operation(summary = "Get all classrooms", description = "Returns all active classrooms, optionally filtered by academic year")
    public ResponseEntity<ApiResponse> getAllClassRooms(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Academic Year ID (optional, defaults to current)") @RequestParam(required = false) Long academicYearId) {
        return ResponseUtil.ok("Classrooms retrieved successfully",
                academicStructureService.getAllClassRooms(schoolId, academicYearId));
    }

    @GetMapping("/classrooms/{id}")
    @Operation(summary = "Get classroom by ID", description = "Returns classroom details with student count")
    public ResponseEntity<ApiResponse> getClassRoomById(
            @Parameter(description = "ClassRoom ID") @PathVariable Long id) {
        ClassRoomDto classRoom = academicStructureService.getClassRoomById(id);
        return ResponseUtil.ok("Classroom retrieved successfully", classRoom);
    }

    @GetMapping("/classrooms/year-group/{yearGroup}")
    @Operation(summary = "Get classrooms by year group", description = "Returns all active classrooms for a specific year group")
    public ResponseEntity<ApiResponse> getClassRoomsByYearGroup(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Year Group") @PathVariable YearGroup yearGroup) {
        return ResponseUtil.ok("Classrooms retrieved successfully",
                academicStructureService.getClassRoomsByYearGroup(schoolId, yearGroup));
    }

    @PutMapping("/classrooms/{id}")
    @Operation(summary = "Update classroom", description = "Updates classroom display name, code, or capacity")
    public ResponseEntity<ApiResponse> updateClassRoom(
            @Parameter(description = "ClassRoom ID") @PathVariable Long id,
            @Valid @RequestBody UpdateClassRoomRequest request) {
        ClassRoomDto classRoom = academicStructureService.updateClassRoom(id, request);
        return ResponseUtil.ok("Classroom updated successfully", classRoom);
    }

    @PatchMapping("/classrooms/{id}/deactivate")
    @Operation(summary = "Deactivate classroom", description = "Deactivates a classroom (soft delete)")
    public ResponseEntity<ApiResponse> deactivateClassRoom(
            @Parameter(description = "ClassRoom ID") @PathVariable Long id) {
        academicStructureService.deactivateClassRoom(id);
        return ResponseUtil.ok("Classroom deactivated successfully");
    }
}
