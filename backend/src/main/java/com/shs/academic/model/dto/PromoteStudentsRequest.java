package com.shs.academic.model.dto;

import com.shs.academic.model.enums.YearGroup;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromoteStudentsRequest {

    @NotEmpty(message = "Student IDs list cannot be empty")
    private List<Long> studentIds;

    @NotNull(message = "Target year group is required")
    private YearGroup targetYearGroup;

    @NotNull(message = "Target class ID is required")
    private Long targetClassId;

    @NotNull(message = "Target academic year ID is required")
    private Long targetAcademicYearId;
}
