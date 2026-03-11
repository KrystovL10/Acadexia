package com.shs.academic.model.dto;

import com.shs.academic.model.entity.CumulativeGPA;
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
public class CumulativeGPADto {

    private Long id;
    private Long studentId;
    private String studentIndex;
    private String studentName;
    private String programName;
    private Long academicYearId;
    private String academicYearLabel;
    private Integer totalTermsCompleted;
    private Double totalGradePoints;
    private Double cgpa;
    private String classification;
    private LocalDateTime lastUpdated;

    // Per-term breakdown
    private List<TermGpaBreakdownDto> termBreakdown;

    public static CumulativeGPADto fromEntity(CumulativeGPA cumulativeGPA) {
        CumulativeGPADtoBuilder builder = CumulativeGPADto.builder()
                .id(cumulativeGPA.getId())
                .studentId(cumulativeGPA.getStudent().getId())
                .studentIndex(cumulativeGPA.getStudent().getStudentIndex())
                .studentName(cumulativeGPA.getStudent().getUser().getFullName())
                .programName(cumulativeGPA.getStudent().getCurrentProgram() != null
                        ? cumulativeGPA.getStudent().getCurrentProgram().getDisplayName() : null)
                .totalTermsCompleted(cumulativeGPA.getTotalTermsCompleted())
                .totalGradePoints(cumulativeGPA.getTotalGradePoints())
                .cgpa(cumulativeGPA.getCgpa())
                .classification(cumulativeGPA.getCgpa() != null
                        ? GpaCalculator.getClassification(cumulativeGPA.getCgpa()) : null)
                .lastUpdated(cumulativeGPA.getLastUpdated());

        if (cumulativeGPA.getAcademicYear() != null) {
            builder.academicYearId(cumulativeGPA.getAcademicYear().getId())
                    .academicYearLabel(cumulativeGPA.getAcademicYear().getYearLabel());
        }

        return builder.build();
    }

    public static CumulativeGPADto fromEntityWithBreakdown(CumulativeGPA cumulativeGPA,
                                                            List<TermGpaBreakdownDto> breakdown) {
        CumulativeGPADto dto = fromEntity(cumulativeGPA);
        dto.setTermBreakdown(breakdown);
        return dto;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TermGpaBreakdownDto {
        private Long termId;
        private String termName;
        private String academicYear;
        private Double gpa;
        private String classification;
        private Integer positionInClass;
        private Integer totalStudentsInClass;
    }
}
