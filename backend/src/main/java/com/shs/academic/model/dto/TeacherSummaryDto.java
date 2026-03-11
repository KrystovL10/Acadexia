package com.shs.academic.model.dto;

import com.shs.academic.model.entity.Teacher;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherSummaryDto {

    private Long id;
    private String staffId;
    private String fullName;
    private String department;
    private boolean isClassTeacher;
    private String assignedClassName;

    public static TeacherSummaryDto fromEntity(Teacher teacher) {
        return TeacherSummaryDto.builder()
                .id(teacher.getId())
                .staffId(teacher.getStaffId())
                .fullName(teacher.getUser().getFullName())
                .department(teacher.getDepartment())
                .isClassTeacher(teacher.isClassTeacher())
                .assignedClassName(teacher.getAssignedClass() != null
                        ? teacher.getAssignedClass().getDisplayName() : null)
                .build();
    }
}
