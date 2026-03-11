package com.shs.academic.util;

import com.shs.academic.model.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

public class ResponseUtil {

    private ResponseUtil() {
        // Utility class - prevent instantiation
    }

    public static ResponseEntity<ApiResponse> ok(String message, Object data) {
        return ResponseEntity.ok(ApiResponse.success(message, data));
    }

    public static ResponseEntity<ApiResponse> ok(String message) {
        return ResponseEntity.ok(ApiResponse.success(message));
    }

    public static ResponseEntity<ApiResponse> created(String message, Object data) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(message, data));
    }

    public static ResponseEntity<ApiResponse> error(HttpStatus status, String message) {
        return ResponseEntity
                .status(status)
                .body(ApiResponse.error(message));
    }

    public static ResponseEntity<ApiResponse> badRequest(String message) {
        return error(HttpStatus.BAD_REQUEST, message);
    }

    public static ResponseEntity<ApiResponse> unauthorized(String message) {
        return error(HttpStatus.UNAUTHORIZED, message);
    }

    public static ResponseEntity<ApiResponse> notFound(String message) {
        return error(HttpStatus.NOT_FOUND, message);
    }
}
