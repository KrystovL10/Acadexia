package com.shs.academic.model.dto.student;

import com.shs.academic.model.entity.TermResult;
import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TermResultSummaryDto {

    private Long termResultId;
    private Long termId;
    private String termLabel;
    private YearGroup yearGroup;
    private Double gpa;
    private Integer positionInClass;
    private Integer totalStudents;
    private Integer subjectsPassed;
    private Integer subjectsFailed;
    private Double attendancePercentage;
    private String conductRating;

    public static TermResultSummaryDto fromEntity(TermResult tr) {
        String termLabel = tr.getTerm().getTermType().name().replace("_", " ")
                + " — " + tr.getTerm().getAcademicYear().getYearLabel();

        return TermResultSummaryDto.builder()
                .termResultId(tr.getId())
                .termId(tr.getTerm().getId())
                .termLabel(termLabel)
                .yearGroup(tr.getYearGroup())
                .gpa(tr.getGpa())
                .positionInClass(tr.getPositionInClass())
                .totalStudents(tr.getTotalStudentsInClass())
                .subjectsPassed(tr.getSubjectsPassed())
                .subjectsFailed(tr.getSubjectsFailed())
                .attendancePercentage(tr.getAttendancePercentage())
                .conductRating(tr.getConductRating())
                .build();
    }
}
