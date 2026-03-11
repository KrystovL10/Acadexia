package com.shs.academic.model.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentWaecPredictionDto {

    private Long studentId;
    private String studentName;
    private String studentIndex;
    private String className;
    private Map<String, String> predictedGrades;
    private String overallReadiness;
    private Integer readinessScore;
    private List<String> riskFactors;
    private String recommendation;
}
