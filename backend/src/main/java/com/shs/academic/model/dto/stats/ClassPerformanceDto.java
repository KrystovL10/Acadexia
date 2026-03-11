package com.shs.academic.model.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassPerformanceDto {

    private String className;
    private Double avgGpa;
    private long studentCount;
    private Double passRate;
}
