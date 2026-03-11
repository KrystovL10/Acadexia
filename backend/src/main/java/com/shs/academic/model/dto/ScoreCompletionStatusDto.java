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
public class ScoreCompletionStatusDto {

    private Long classRoomId;
    private String className;
    private Long termId;
    private String termName;
    private Double overallCompletionPercentage;
    private boolean allComplete;
    private Integer totalStudents;
    private Integer totalSubjects;
    private List<SubjectCompletionDto> subjects;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectCompletionDto {
        private Long subjectId;
        private String subjectName;
        private String tutorName;
        private int studentsWithScores;
        private int studentsWithoutScores;
        private List<StudentSummaryDto> missingStudents;
    }
}
