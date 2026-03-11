package com.shs.academic.model.dto.student;

import com.shs.academic.model.entity.TermResult;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.util.GpaCalculator;
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
public class StudentTermResultDto {

    private Long termResultId;
    private Long termId;
    private String termLabel;
    private YearGroup yearGroup;
    private String programName;
    private String className;

    private List<StudentScoreDto> scores;

    private Double gpa;
    private String classification;
    private Integer positionInClass;
    private Integer totalStudentsInClass;

    private Integer totalDaysPresent;
    private Integer totalDaysAbsent;
    private Double attendancePercentage;

    private String conductRating;
    private String classTeacherRemarks;
    private String headmasterRemarks;

    private boolean isGenerated;
    private LocalDateTime generatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentScoreDto {
        private String subjectName;
        private Double classScore;
        private Double examScore;
        private Double totalScore;
        private String grade;
        private Double gradePoint;
        private String remarks;
        private boolean isAbsent;
    }

    public static StudentTermResultDto fromEntity(TermResult tr) {
        String termLabel = tr.getTerm().getTermType().name().replace("_", " ")
                + " — " + tr.getTerm().getAcademicYear().getYearLabel();

        return StudentTermResultDto.builder()
                .termResultId(tr.getId())
                .termId(tr.getTerm().getId())
                .termLabel(termLabel)
                .yearGroup(tr.getYearGroup())
                .programName(tr.getStudent().getCurrentProgram() != null
                        ? tr.getStudent().getCurrentProgram().getDisplayName() : null)
                .className(tr.getClassRoom() != null ? tr.getClassRoom().getDisplayName() : null)
                .gpa(tr.getGpa())
                .classification(tr.getGpa() != null ? GpaCalculator.getClassification(tr.getGpa()) : null)
                .positionInClass(tr.getPositionInClass())
                .totalStudentsInClass(tr.getTotalStudentsInClass())
                .totalDaysPresent(tr.getTotalDaysPresent())
                .totalDaysAbsent(tr.getTotalDaysAbsent())
                .attendancePercentage(tr.getAttendancePercentage())
                .conductRating(tr.getConductRating())
                .classTeacherRemarks(tr.getClassTeacherRemarks())
                .headmasterRemarks(tr.getHeadmasterRemarks())
                .isGenerated(tr.isGenerated())
                .generatedAt(tr.getGeneratedAt())
                .build();
    }
}
