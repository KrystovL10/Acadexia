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
public class WeeklyStudyPlanDto {

    private Integer totalHoursRecommended;
    private List<SubjectStudyBreakdownDto> breakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectStudyBreakdownDto {
        private String subject;
        private Integer hours;
        private String focus;
    }
}
