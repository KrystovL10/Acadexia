package com.shs.academic.model.dto;

import com.shs.academic.model.enums.YearGroup;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignSubjectRequest {

    @NotNull(message = "Program ID is required")
    private Long programId;

    @NotNull(message = "Subject ID is required")
    private Long subjectId;

    @NotNull(message = "Year group is required")
    private YearGroup yearGroup;

    @Builder.Default
    private boolean isCompulsory = true;
}
