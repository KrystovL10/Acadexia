package com.shs.academic.model.dto.ranking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImprovementDto {

    private StudentRankDto student;
    private String previousTermLabel;
    private String currentTermLabel;
    private Double previousGpa;
    private Double currentGpa;
    private Double delta;
    private Double percentageChange;
}
