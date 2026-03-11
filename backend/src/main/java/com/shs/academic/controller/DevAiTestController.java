package com.shs.academic.controller;

import com.shs.academic.model.dto.ApiResponse;
import com.shs.academic.service.ai.ClaudeApiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dev-only endpoint to verify Claude API connectivity.
 * DELETE this controller before production deployment.
 */
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
@Profile("dev")
public class DevAiTestController {

    private final ClaudeApiClient claudeApiClient;

    @GetMapping("/ai-test")
    public ResponseEntity<ApiResponse> testAiConnection() {
        String response = claudeApiClient.sendMessage(
                "You are a system health check responder.",
                "Respond with exactly: AI service is connected and working."
        );
        return ResponseEntity.ok(ApiResponse.success("AI connectivity test", response));
    }
}
