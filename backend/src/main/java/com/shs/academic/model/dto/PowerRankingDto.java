package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PowerRankingDto {

    private TermResultSummaryDto bestStudent;
    private GpaChangeDto mostImproved;
    private GpaChangeDto mostDeclined;
    private List<TermResultSummaryDto> topTen;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GpaChangeDto {

        private Long studentId;
        private String studentIndex;
        private String studentName;
        private Double previousGpa;
        private Double currentGpa;
        private Double change;
    }
}
