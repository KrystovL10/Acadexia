package com.shs.academic.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResolveWarningRequest {

    @NotBlank(message = "Resolution note is required")
    private String resolutionNote;
}
