package com.shs.academic.model.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentInsightsDto {

    private String summary;
    private List<String> strengths;
    private List<String> areasForImprovement;
    private List<StudyTipDto> studyTips;
    private String motivationalMessage;
    private WeeklyStudyPlanDto weeklyStudyPlan;
    private LocalDateTime generatedAt;
}
