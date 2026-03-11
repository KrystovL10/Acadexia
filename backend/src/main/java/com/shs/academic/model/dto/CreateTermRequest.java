package com.shs.academic.model.dto;

import com.shs.academic.model.enums.TermType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTermRequest {

    @NotNull(message = "Academic year ID is required")
    private Long academicYearId;

    @NotNull(message = "Term type is required")
    private TermType termType;

    private LocalDate startDate;

    private LocalDate endDate;

    @Builder.Default
    private boolean isCurrent = false;
}
