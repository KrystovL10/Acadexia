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
public class TutorScoreSheetDto {

    private Long subjectId;
    private String subjectName;
    private String subjectCode;
    private Long classRoomId;
    private String className;
    private Long termId;
    private String termLabel;
    private boolean isLocked;
    private List<StudentScoreRow> students;
    private CompletionStats completionStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentScoreRow {
        private Long studentId;
        private String studentIndex;
        private String fullName;
        private Double classScore;
        private Double examScore;
        private Double total;
        private String grade;
        private Double gradePoint;
        private String remarks;
        private boolean isSubmitted;
        private boolean isAbsent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompletionStats {
        private int total;
        private int submitted;
        private int pending;
        private double percentage;
    }
}
