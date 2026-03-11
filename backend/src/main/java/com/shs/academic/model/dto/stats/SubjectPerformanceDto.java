package com.shs.academic.model.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectPerformanceDto {

    private String subjectName;
    private Double avgScore;
    private Double passRate;
    private Double highestScore;
    private Double lowestScore;
}
