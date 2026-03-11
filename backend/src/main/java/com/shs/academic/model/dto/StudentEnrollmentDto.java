package com.shs.academic.model.dto;

import com.shs.academic.model.entity.StudentEnrollment;
import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentEnrollmentDto {

    private Long id;
    private Long studentId;
    private String studentIndex;
    private String studentName;
    private Long classRoomId;
    private String className;
    private Long academicYearId;
    private String academicYearLabel;
    private YearGroup yearGroup;
    private LocalDate enrollmentDate;
    private boolean isRepeating;

    public static StudentEnrollmentDto fromEntity(StudentEnrollment enrollment) {
        return StudentEnrollmentDto.builder()
                .id(enrollment.getId())
                .studentId(enrollment.getStudent().getId())
                .studentIndex(enrollment.getStudent().getStudentIndex())
                .studentName(enrollment.getStudent().getUser().getFullName())
                .classRoomId(enrollment.getClassRoom().getId())
                .className(enrollment.getClassRoom().getDisplayName())
                .academicYearId(enrollment.getAcademicYear().getId())
                .academicYearLabel(enrollment.getAcademicYear().getYearLabel())
                .yearGroup(enrollment.getYearGroup())
                .enrollmentDate(enrollment.getEnrollmentDate())
                .isRepeating(enrollment.isRepeating())
                .build();
    }
}
