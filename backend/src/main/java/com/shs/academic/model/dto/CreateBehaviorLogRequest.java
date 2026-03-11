package com.shs.academic.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBehaviorLogRequest {

    @NotNull(message = "Student ID is required")
    private Long studentId;

    @NotNull(message = "ClassRoom ID is required")
    private Long classRoomId;

    @NotNull(message = "Term ID is required")
    private Long termId;

    @NotBlank(message = "Log type is required")
    private String logType;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    private String severity;
}
