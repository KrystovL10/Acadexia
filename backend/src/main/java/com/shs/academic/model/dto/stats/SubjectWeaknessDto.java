package com.shs.academic.model.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectWeaknessDto {

    private String subjectName;
    private Double failureRate;
    private Double avgScore;
    private long affectedClasses;
}
