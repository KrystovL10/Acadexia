package com.shs.academic.model.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WaecReadinessReportDto {

    private Long schoolId;
    private Long termId;
    private Integer totalShs3Students;
    private Integer highReadiness;
    private Integer mediumReadiness;
    private Integer lowReadiness;
    private Integer atRiskCount;
    private List<StudentWaecPredictionDto> studentPredictions;
    private List<String> criticalSubjects;
    private Double schoolReadinessPercentage;
    private String overallRecommendation;
    private LocalDateTime generatedAt;
}
