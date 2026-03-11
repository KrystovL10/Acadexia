package com.shs.academic.controller;

import com.shs.academic.model.dto.*;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.service.AttendanceService;
import com.shs.academic.service.UserService;
import com.shs.academic.util.ResponseUtil;
import com.shs.academic.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Admin - User Management", description = "Super Admin endpoints for managing teachers and students")
public class AdminUserController {

    private final UserService userService;
    private final AttendanceService attendanceService;

    // ==================== TEACHER ENDPOINTS ====================

    @PostMapping("/teachers")
    @Operation(summary = "Create a new teacher", description = "Creates a new teacher with TUTOR role and default password")
    public ResponseEntity<ApiResponse> createTeacher(@Valid @RequestBody CreateTeacherRequest request) {
        TeacherDto teacher = userService.createTeacher(request);
        return ResponseUtil.created("Teacher created successfully", teacher);
    }

    @GetMapping("/teachers")
    @Operation(summary = "Get all teachers", description = "Returns a paginated list of all teachers for a school")
    public ResponseEntity<ApiResponse> getAllTeachers(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<TeacherSummaryDto> teachers = userService.getAllTeachers(schoolId, pageable);
        return ResponseUtil.ok("Teachers retrieved successfully", teachers);
    }

    @GetMapping("/teachers/{teacherId}")
    @Operation(summary = "Get teacher by ID", description = "Returns full teacher profile with assigned class and subjects")
    public ResponseEntity<ApiResponse> getTeacherById(
            @Parameter(description = "Teacher ID") @PathVariable Long teacherId) {
        TeacherDto teacher = userService.getTeacherById(teacherId);
        return ResponseUtil.ok("Teacher retrieved successfully", teacher);
    }

    @PutMapping("/teachers/{teacherId}")
    @Operation(summary = "Update teacher", description = "Updates allowed teacher fields (name, phone, department, qualification, specialization)")
    public ResponseEntity<ApiResponse> updateTeacher(
            @Parameter(description = "Teacher ID") @PathVariable Long teacherId,
            @Valid @RequestBody UpdateTeacherRequest request) {
        TeacherDto teacher = userService.updateTeacher(teacherId, request);
        return ResponseUtil.ok("Teacher updated successfully", teacher);
    }

    @PatchMapping("/teachers/{teacherId}/deactivate")
    @Operation(summary = "Deactivate teacher", description = "Deactivates a teacher and removes class assignment if applicable")
    public ResponseEntity<ApiResponse> deactivateTeacher(
            @Parameter(description = "Teacher ID") @PathVariable Long teacherId) {
        userService.deactivateTeacher(teacherId);
        return ResponseUtil.ok("Teacher deactivated successfully");
    }

    @PatchMapping("/teachers/{teacherId}/reactivate")
    @Operation(summary = "Reactivate teacher", description = "Reactivates a previously deactivated teacher")
    public ResponseEntity<ApiResponse> reactivateTeacher(
            @Parameter(description = "Teacher ID") @PathVariable Long teacherId) {
        userService.reactivateTeacher(teacherId);
        return ResponseUtil.ok("Teacher reactivated successfully");
    }

    @PostMapping("/teachers/assign-class")
    @Operation(summary = "Assign class teacher", description = "Assigns a teacher as class teacher for a classroom, updating role to CLASS_TEACHER")
    public ResponseEntity<ApiResponse> assignClassTeacher(@Valid @RequestBody AssignClassTeacherRequest request) {
        userService.assignClassTeacher(request);
        return ResponseUtil.ok("Class teacher assigned successfully");
    }

    @PostMapping("/teachers/assign-tutor")
    @Operation(summary = "Assign tutor to subject and class", description = "Assigns a teacher to teach a subject in a specific classroom")
    public ResponseEntity<ApiResponse> assignTutor(@Valid @RequestBody AssignTutorRequest request) {
        userService.assignTutor(request);
        return ResponseUtil.ok("Tutor assigned to subject successfully");
    }

    // ==================== STUDENT ENDPOINTS ====================

    @PostMapping("/students")
    @Operation(summary = "Create a new student", description = "Creates a new student with default password (student index number)")
    public ResponseEntity<ApiResponse> createStudent(@Valid @RequestBody CreateStudentRequest request) {
        StudentDto student = userService.createStudent(request);
        return ResponseUtil.created("Student created successfully", student);
    }

    @GetMapping("/students")
    @Operation(summary = "Get all students", description = "Returns a paginated and filtered list of students")
    public ResponseEntity<ApiResponse> getAllStudents(
            @Parameter(description = "School ID") @RequestParam Long schoolId,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Filter by year group") @RequestParam(required = false) YearGroup yearGroup,
            @Parameter(description = "Filter by program ID") @RequestParam(required = false) Long programId,
            @Parameter(description = "Filter by class ID") @RequestParam(required = false) Long classId) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<StudentSummaryDto> students = userService.getAllStudents(schoolId, pageable, yearGroup, programId, classId);
        return ResponseUtil.ok("Students retrieved successfully", students);
    }

    @GetMapping("/students/{studentId}")
    @Operation(summary = "Get student by ID", description = "Returns full student profile with enrollment history")
    public ResponseEntity<ApiResponse> getStudentById(
            @Parameter(description = "Student ID") @PathVariable Long studentId) {
        StudentDto student = userService.getStudentById(studentId);
        return ResponseUtil.ok("Student retrieved successfully", student);
    }

    @PutMapping("/students/{studentId}")
    @Operation(summary = "Update student", description = "Updates allowed student fields (guardian info, address, phone, photo)")
    public ResponseEntity<ApiResponse> updateStudent(
            @Parameter(description = "Student ID") @PathVariable Long studentId,
            @Valid @RequestBody UpdateStudentRequest request) {
        StudentDto student = userService.updateStudent(studentId, request);
        return ResponseUtil.ok("Student updated successfully", student);
    }

    @PostMapping("/students/promote")
    @Operation(summary = "Promote students", description = "Promotes students to a new year group and class, creating new enrollment records")
    public ResponseEntity<ApiResponse> promoteStudents(@Valid @RequestBody PromoteStudentsRequest request) {
        userService.promoteStudents(request);
        return ResponseUtil.ok("Students promoted successfully");
    }

    @PostMapping("/students/graduate")
    @Operation(summary = "Graduate students", description = "Marks students as graduated and deactivates their accounts")
    public ResponseEntity<ApiResponse> graduateStudents(@RequestBody List<Long> studentIds) {
        userService.graduateStudents(studentIds);
        return ResponseUtil.ok("Students graduated successfully");
    }

    // ==================== ATTENDANCE OVERRIDE ====================

    @PatchMapping("/students/attendance/override")
    @Operation(summary = "Override a student's attendance record",
            description = "Admin can override any existing attendance entry with an audit note")
    public ResponseEntity<ApiResponse> overrideAttendance(
            @Valid @RequestBody AdminAttendanceOverrideRequest request) {
        Long adminUserId = SecurityUtil.getCurrentUserId();
        AttendanceDto dto = attendanceService.adminOverrideAttendance(adminUserId, request);
        return ResponseUtil.ok("Attendance record overridden successfully", dto);
    }

    @GetMapping("/students/{studentId}/attendance")
    @Operation(summary = "Get a student's attendance rows with daily status for a term")
    public ResponseEntity<ApiResponse> getStudentAttendanceStats(
            @PathVariable Long studentId,
            @RequestParam Long classRoomId,
            @RequestParam Long termId) {
        List<StudentAttendanceRowDto> rows = attendanceService
                .getStudentAttendanceRows(classRoomId, termId);
        // Filter to just the requested student
        List<StudentAttendanceRowDto> filtered = rows.stream()
                .filter(r -> r.getStudentId().equals(studentId))
                .toList();
        return ResponseUtil.ok("Student attendance retrieved", filtered);
    }
}
