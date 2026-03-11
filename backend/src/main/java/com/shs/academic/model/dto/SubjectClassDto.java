package com.shs.academic.model.dto;

import com.shs.academic.model.entity.ClassSubjectAssignment;
import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectClassDto {

    private String subjectName;
    private String className;
    private YearGroup yearGroup;

    public static SubjectClassDto fromEntity(ClassSubjectAssignment assignment) {
        return SubjectClassDto.builder()
                .subjectName(assignment.getSubject().getName())
                .className(assignment.getClassRoom().getDisplayName())
                .yearGroup(assignment.getClassRoom().getYearGroup())
                .build();
    }
}
