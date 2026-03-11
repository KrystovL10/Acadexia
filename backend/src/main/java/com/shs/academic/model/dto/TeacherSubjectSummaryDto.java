package com.shs.academic.model.dto;

import com.shs.academic.model.entity.ClassSubjectAssignment;
import com.shs.academic.model.entity.Teacher;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherSubjectSummaryDto {

    private Long teacherId;
    private String teacherName;
    private String staffId;
    private List<SubjectClassDto> assignments;

    public static TeacherSubjectSummaryDto fromEntity(Teacher teacher, List<ClassSubjectAssignment> classAssignments) {
        List<SubjectClassDto> subjectClasses = classAssignments.stream()
                .map(SubjectClassDto::fromEntity)
                .toList();

        return TeacherSubjectSummaryDto.builder()
                .teacherId(teacher.getId())
                .teacherName(teacher.getUser().getFullName())
                .staffId(teacher.getStaffId())
                .assignments(subjectClasses)
                .build();
    }
}
