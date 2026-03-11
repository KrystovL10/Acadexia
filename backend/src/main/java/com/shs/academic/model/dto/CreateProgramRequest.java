package com.shs.academic.model.dto;

import com.shs.academic.model.enums.ProgramType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProgramRequest {

    @NotNull(message = "Program type is required")
    private ProgramType programType;

    private String description;
}
