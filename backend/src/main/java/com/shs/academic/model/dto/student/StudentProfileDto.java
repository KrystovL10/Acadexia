package com.shs.academic.model.dto.student;

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
public class StudentProfileDto {

    private Long userId;
    private String studentIndex;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private LocalDate dateOfBirth;
    private String gender;
    private String hometown;
    private String residentialAddress;
    private String guardianName;
    private String guardianPhone;
    private String guardianRelationship;
    private String currentClassName;
    private YearGroup currentYearGroup;
    private String currentProgramName;
    private LocalDate admissionDate;
    private Integer beceAggregate;
    private String beceYear;
    private boolean isActive;
    private boolean hasGraduated;
    private String profilePhotoUrl;
    private boolean isFirstLogin;
    private LocalDateTime lastLogin;

    public static StudentProfileDto fromEntity(Student student) {
        return StudentProfileDto.builder()
                .userId(student.getUser().getId())
                .studentIndex(student.getStudentIndex())
                .firstName(student.getUser().getFirstName())
                .lastName(student.getUser().getLastName())
                .email(student.getUser().getEmail())
                .phoneNumber(student.getUser().getPhoneNumber())
                .dateOfBirth(student.getDateOfBirth())
                .gender(student.getGender())
                .hometown(student.getHometown())
                .residentialAddress(student.getResidentialAddress())
                .guardianName(student.getGuardianName())
                .guardianPhone(student.getGuardianPhone())
                .guardianRelationship(student.getGuardianRelationship())
                .currentClassName(student.getCurrentClass() != null
                        ? student.getCurrentClass().getDisplayName() : null)
                .currentYearGroup(student.getCurrentYearGroup())
                .currentProgramName(student.getCurrentProgram() != null
                        ? student.getCurrentProgram().getDisplayName() : null)
                .admissionDate(student.getAdmissionDate())
                .beceAggregate(student.getBeceAggregate())
                .beceYear(student.getBeceYear())
                .isActive(student.isActive())
                .hasGraduated(student.isHasGraduated())
                .profilePhotoUrl(student.getUser().getProfilePhotoUrl())
                .isFirstLogin(student.getUser().isFirstLogin())
                .lastLogin(student.getUser().getUpdatedAt())
                .build();
    }
}
