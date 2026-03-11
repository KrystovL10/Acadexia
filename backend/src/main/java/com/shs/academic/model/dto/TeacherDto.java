package com.shs.academic.model.dto;

import com.shs.academic.model.entity.Teacher;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherDto {

    private Long id;
    private Long userId;
    private String userGesId;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String profilePhotoUrl;
    private String staffId;
    private String department;
    private String qualification;
    private String specialization;
    private LocalDate dateJoined;
    private Long schoolId;
    private String schoolName;
    private boolean isClassTeacher;
    private Long assignedClassId;
    private String assignedClassName;
    private boolean isActive;
    private List<SubjectClassDto> subjectAssignments;
    private LocalDateTime createdAt;

    public static TeacherDto fromEntity(Teacher teacher) {
        TeacherDtoBuilder builder = TeacherDto.builder()
                .id(teacher.getId())
                .userId(teacher.getUser().getId())
                .userGesId(teacher.getUser().getUserId())
                .firstName(teacher.getUser().getFirstName())
                .lastName(teacher.getUser().getLastName())
                .fullName(teacher.getUser().getFullName())
                .email(teacher.getUser().getEmail())
                .phoneNumber(teacher.getUser().getPhoneNumber())
                .profilePhotoUrl(teacher.getUser().getProfilePhotoUrl())
                .staffId(teacher.getStaffId())
                .department(teacher.getDepartment())
                .qualification(teacher.getQualification())
                .specialization(teacher.getSpecialization())
                .dateJoined(teacher.getDateJoined())
                .schoolId(teacher.getSchool() != null ? teacher.getSchool().getId() : null)
                .schoolName(teacher.getSchool() != null ? teacher.getSchool().getName() : null)
                .isClassTeacher(teacher.isClassTeacher())
                .isActive(teacher.isActive())
                .createdAt(teacher.getCreatedAt());

        if (teacher.getAssignedClass() != null) {
            builder.assignedClassId(teacher.getAssignedClass().getId())
                    .assignedClassName(teacher.getAssignedClass().getDisplayName());
        }

        return builder.build();
    }
}
