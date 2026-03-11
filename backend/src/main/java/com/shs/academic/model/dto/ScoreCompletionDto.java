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
public class ScoreCompletionDto {

    private Long classRoomId;
    private String className;
    private Long subjectId;
    private String subjectName;
    private Long termId;
    private String termLabel;
    private int totalStudents;
    private int submitted;
    private int pending;
    private double completionPercentage;
    private boolean isLocked;
    private List<StudentSummaryDto> pendingStudents;
}
