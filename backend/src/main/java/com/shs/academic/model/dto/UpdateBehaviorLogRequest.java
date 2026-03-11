package com.shs.academic.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBehaviorLogRequest {

    @NotBlank(message = "Description is required")
    private String description;

    private String severity;
}
