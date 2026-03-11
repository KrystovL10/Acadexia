package com.shs.academic.model.dto;

import jakarta.validation.Valid;
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
public class BulkScoreEntryRequest {

    @NotNull(message = "Subject ID is required")
    private Long subjectId;

    @NotNull(message = "ClassRoom ID is required")
    private Long classRoomId;

    @NotNull(message = "Term ID is required")
    private Long termId;

    @NotEmpty(message = "Scores list cannot be empty")
    @Valid
    private List<ScoreEntryRequest> scores;
}
