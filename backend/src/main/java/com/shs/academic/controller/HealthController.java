package com.shs.academic.controller;

import com.shs.academic.model.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@Tag(name = "Health", description = "System health check endpoint")
public class HealthController {

    @Value("${app.name}")
    private String appName;

    @Operation(summary = "Check system health")
    @GetMapping
    public ResponseEntity<ApiResponse> health() {
        Map<String, Object> healthData = Map.of(
                "status", "UP",
                "system", appName,
                "timestamp", LocalDateTime.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.success("System is running", healthData));
    }
}
