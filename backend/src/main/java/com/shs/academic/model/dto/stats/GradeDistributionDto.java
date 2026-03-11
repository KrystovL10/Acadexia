package com.shs.academic.model.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeDistributionDto {

    private String grade;
    private long count;
    private Double percentage;
}
