package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkScoreResultDto {

    private Integer successCount;
    private Integer failureCount;
    private Integer totalProcessed;
    private List<ScoreDto> saved;
    private List<ScoreEntryError> errors;
    private String message;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreEntryError {
        private Long studentId;
        private String studentName;
        private String errorMessage;
    }
}
