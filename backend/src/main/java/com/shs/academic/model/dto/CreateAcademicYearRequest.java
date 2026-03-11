package com.shs.academic.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAcademicYearRequest {

    @NotBlank(message = "Year label is required")
    @Pattern(regexp = "^\\d{4}/\\d{4}$", message = "Year label must be in YYYY/YYYY format (e.g. 2024/2025)")
    private String yearLabel;

    private LocalDate startDate;

    private LocalDate endDate;

    @Builder.Default
    private boolean isCurrent = false;
}
