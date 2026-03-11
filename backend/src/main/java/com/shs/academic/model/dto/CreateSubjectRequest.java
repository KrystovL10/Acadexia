package com.shs.academic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSubjectRequest {

    @NotBlank(message = "Subject name is required")
    private String name;

    private String subjectCode;

    @Builder.Default
    @JsonProperty("isCore")
    private boolean isCore = false;

    @Builder.Default
    @JsonProperty("isElective")
    private boolean isElective = false;
}
