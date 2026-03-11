package com.shs.academic.model.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScoreUpdateRequest {

    @DecimalMin(value = "0.0", message = "Class score cannot be negative")
    @DecimalMax(value = "30.0", message = "Class score cannot exceed 30")
    private Double classScore;

    @DecimalMin(value = "0.0", message = "Exam score cannot be negative")
    @DecimalMax(value = "70.0", message = "Exam score cannot exceed 70")
    private Double examScore;
}
