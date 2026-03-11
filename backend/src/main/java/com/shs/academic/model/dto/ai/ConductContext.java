package com.shs.academic.model.dto.ai;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConductContext {

    private Double attendancePercentage;
    private Integer disciplineIssueCount;
    private Integer highSeverityCount;
    private Integer achievementCount;
    private String behaviorNotes;
    private String gpaTrend;
}
