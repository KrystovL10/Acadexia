package com.shs.academic.model.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoreEntryRequest {

    @NotNull(message = "Student ID is required")
    private Long studentId;

    @NotNull(message = "Subject ID is required")
    private Long subjectId;

    @NotNull(message = "ClassRoom ID is required")
    private Long classRoomId;

    @NotNull(message = "Term ID is required")
    private Long termId;

    @DecimalMin(value = "0.0", message = "Class score cannot be negative")
    @DecimalMax(value = "30.0", message = "Class score cannot exceed 30")
    private Double classScore;

    @DecimalMin(value = "0.0", message = "Exam score cannot be negative")
    @DecimalMax(value = "70.0", message = "Exam score cannot exceed 70")
    private Double examScore;

    private boolean isAbsent;
}
