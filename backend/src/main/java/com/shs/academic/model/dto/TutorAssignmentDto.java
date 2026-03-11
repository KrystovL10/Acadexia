package com.shs.academic.model.dto;

import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TutorAssignmentDto {

    private Long classRoomId;
    private String className;
    private Long subjectId;
    private String subjectName;
    private YearGroup yearGroup;
    private String programName;
    private Long termId;
    private String termLabel;
    private int studentsCount;
    private long scoresSubmitted;
    private long scoresRemaining;
    private double completionPercentage;
    private boolean isTermLocked;
}
