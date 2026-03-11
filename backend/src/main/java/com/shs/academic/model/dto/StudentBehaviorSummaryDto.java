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
public class StudentBehaviorSummaryDto {

    private Long studentId;
    private String studentName;
    private String termLabel;

    private int achievementCount;
    private int disciplineCount;
    private int noteCount;

    private int conductScore;          // 0–100
    private String conductGrade;       // Excellent / Very Good / Good / Fair / Poor

    private List<BehaviorLogDto> logs;

    private String aiConductAssessment;
}
