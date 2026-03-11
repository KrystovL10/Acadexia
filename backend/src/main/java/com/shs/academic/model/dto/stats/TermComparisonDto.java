package com.shs.academic.model.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TermComparisonDto {

    private String termLabel;
    private Double shs1Avg;
    private Double shs2Avg;
    private Double shs3Avg;
}
