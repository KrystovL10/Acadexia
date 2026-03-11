package com.shs.academic.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ReportReadinessDto {

    private boolean isReady;
    private boolean allScoresSubmitted;
    private List<String> missingScoreSubjects;
    private boolean attendanceRecorded;
    private Integer studentsCount;
    private String message;
}
