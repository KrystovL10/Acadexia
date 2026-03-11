package com.shs.academic.model.dto;

import com.shs.academic.model.entity.TermResult;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TermResultSummaryDto {

    private Long studentId;
    private String studentIndex;
    private String studentName;
    private Double gpa;
    private Integer positionInClass;
    private Integer totalSubjects;
    private Integer subjectsPassed;
    private String overallGrade;

    public static TermResultSummaryDto fromEntity(TermResult result) {
        String overallGrade = determineOverallGrade(result.getGpa());

        return TermResultSummaryDto.builder()
                .studentId(result.getStudent().getId())
                .studentIndex(result.getStudent().getStudentIndex())
                .studentName(result.getStudent().getUser().getFullName())
                .gpa(result.getGpa())
                .positionInClass(result.getPositionInClass())
                .totalSubjects(result.getTotalSubjects())
                .subjectsPassed(result.getSubjectsPassed())
                .overallGrade(overallGrade)
                .build();
    }

    private static String determineOverallGrade(Double gpa) {
        if (gpa == null) return "N/A";
        if (gpa >= 3.6) return "Excellent";
        if (gpa >= 3.0) return "Very Good";
        if (gpa >= 2.0) return "Good";
        if (gpa >= 1.2) return "Pass";
        return "Fail";
    }
}
