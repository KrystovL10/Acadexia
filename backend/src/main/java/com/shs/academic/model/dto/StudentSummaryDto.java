package com.shs.academic.model.dto;

import com.shs.academic.model.entity.Student;
import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentSummaryDto {

    private Long id;
    private String studentIndex;
    private String fullName;
    private String className;
    private YearGroup yearGroup;
    private String programName;

    public static StudentSummaryDto fromEntity(Student student) {
        return StudentSummaryDto.builder()
                .id(student.getId())
                .studentIndex(student.getStudentIndex())
                .fullName(student.getUser().getFullName())
                .className(student.getCurrentClass() != null
                        ? student.getCurrentClass().getDisplayName() : null)
                .yearGroup(student.getCurrentYearGroup())
                .programName(student.getCurrentProgram().getDisplayName())
                .build();
    }
}
