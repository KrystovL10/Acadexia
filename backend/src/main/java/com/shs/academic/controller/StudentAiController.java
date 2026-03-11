package com.shs.academic.controller;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.ApiResponse;
import com.shs.academic.model.dto.ai.ChatRequest;
import com.shs.academic.model.dto.ai.StudentInsightsDto;
import com.shs.academic.model.entity.Student;
import com.shs.academic.repository.StudentRepository;
import com.shs.academic.service.ai.StudyAssistantService;
import com.shs.academic.util.RateLimiter;
import com.shs.academic.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/students/ai")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
@Tag(name = "Student - AI Study Assistant", description = "AI-powered study insights and chat for students")
public class StudentAiController {

    private final StudyAssistantService studyAssistantService;
    private final StudentRepository studentRepository;
    private final RateLimiter rateLimiter;

    @GetMapping("/insights")
    @Operation(summary = "Get AI-generated study insights for the current term")
    public ResponseEntity<ApiResponse> getStudentInsights(
            @RequestParam Long termId) {
        Long userId = SecurityUtil.getCurrentUserId();
        Student student = resolveStudent(userId);
        StudentInsightsDto dto = studyAssistantService.getStudentInsights(student.getId(), termId);
        return ResponseEntity.ok(ApiResponse.success("Study insights retrieved", dto));
    }

    @PostMapping("/chat")
    @Operation(summary = "Chat with the AI study assistant (rate limited: 10/hour)")
    public ResponseEntity<ApiResponse> chatWithAssistant(
            @Valid @RequestBody ChatRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        Student student = resolveStudent(userId);

        // Rate limit check
        rateLimiter.checkRateLimit(student.getId());

        String response = studyAssistantService.chatWithStudyAssistant(
                student.getId(), request.getMessage(), request.getHistory());
        return ResponseEntity.ok(ApiResponse.success("Assistant response", response));
    }

    private Student resolveStudent(Long userPk) {
        return studentRepository.findByUserId(userPk)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student profile not found for userId=" + userPk));
    }
}
