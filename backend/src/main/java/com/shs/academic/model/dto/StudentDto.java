package com.shs.academic.model.dto;

import com.shs.academic.model.entity.Student;
import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDto {

    private Long id;
    private Long userId;
    private String userGesId;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String profilePhotoUrl;
    private String studentIndex;
    private LocalDate dateOfBirth;
    private String gender;
    private String nationality;
    private String hometown;
    private String residentialAddress;
    private String guardianName;
    private String guardianPhone;
    private String guardianEmail;
    private String guardianRelationship;
    private Integer beceAggregate;
    private String beceYear;
    private LocalDate admissionDate;
    private Long schoolId;
    private String schoolName;
    private YearGroup currentYearGroup;
    private Long currentProgramId;
    private String currentProgramName;
    private Long currentClassId;
    private String currentClassName;
    private boolean isActive;
    private boolean hasGraduated;
    private LocalDateTime createdAt;

    public static StudentDto fromEntity(Student student) {
        StudentDtoBuilder builder = StudentDto.builder()
                .id(student.getId())
                .userId(student.getUser().getId())
                .userGesId(student.getUser().getUserId())
                .firstName(student.getUser().getFirstName())
                .lastName(student.getUser().getLastName())
                .fullName(student.getUser().getFullName())
                .email(student.getUser().getEmail())
                .phoneNumber(student.getUser().getPhoneNumber())
                .profilePhotoUrl(student.getUser().getProfilePhotoUrl())
                .studentIndex(student.getStudentIndex())
                .dateOfBirth(student.getDateOfBirth())
                .gender(student.getGender())
                .nationality(student.getNationality())
                .hometown(student.getHometown())
                .residentialAddress(student.getResidentialAddress())
                .guardianName(student.getGuardianName())
                .guardianPhone(student.getGuardianPhone())
                .guardianEmail(student.getGuardianEmail())
                .guardianRelationship(student.getGuardianRelationship())
                .beceAggregate(student.getBeceAggregate())
                .beceYear(student.getBeceYear())
                .admissionDate(student.getAdmissionDate())
                .schoolId(student.getSchool().getId())
                .schoolName(student.getSchool().getName())
                .currentYearGroup(student.getCurrentYearGroup())
                .currentProgramId(student.getCurrentProgram().getId())
                .currentProgramName(student.getCurrentProgram().getDisplayName())
                .isActive(student.isActive())
                .hasGraduated(student.isHasGraduated())
                .createdAt(student.getCreatedAt());

        if (student.getCurrentClass() != null) {
            builder.currentClassId(student.getCurrentClass().getId())
                    .currentClassName(student.getCurrentClass().getDisplayName());
        }

        return builder.build();
    }
}
