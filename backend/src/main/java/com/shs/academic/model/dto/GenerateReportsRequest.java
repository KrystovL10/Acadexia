package com.shs.academic.model.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GenerateReportsRequest {

    @NotNull(message = "Term ID is required")
    private Long termId;
}
