package com.shs.academic.model.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WaecReadinessDto {

    private String overallReadiness;
    private Integer shs3AtRiskCount;
    private List<String> criticalSubjects;
    private String recommendation;
}
