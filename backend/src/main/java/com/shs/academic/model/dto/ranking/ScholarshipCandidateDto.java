package com.shs.academic.model.dto.ranking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScholarshipCandidateDto {

    private StudentRankDto student;
    private Double cgpa;
    private Integer termsCompleted;
    private Integer consecutiveTermsAbove35;
}
