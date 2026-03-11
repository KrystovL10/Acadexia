package com.shs.academic.model.dto.student;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectPerformanceSummaryDto {

    private List<SubjectStatDto> strongestSubjects;
    private List<SubjectStatDto> weakestSubjects;
    private List<SubjectStatDto> allSubjects;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectStatDto {
        private String subjectName;
        private Integer termsAppeared;
        private Double averageScore;
        private Double bestScore;
        private Double worstScore;
        private String bestGrade;
        private String latestGrade;
        private String trend; // IMPROVING, DECLINING, STABLE
    }
}
