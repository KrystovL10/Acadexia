package com.shs.academic.model.dto;

import com.shs.academic.model.enums.YearGroup;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStudentRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be 2-50 characters")
    @Pattern(regexp = "^[a-zA-Z\\s\\-']+$", message = "First name can only contain letters, spaces, hyphens")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be 2-50 characters")
    @Pattern(regexp = "^[a-zA-Z\\s\\-']+$", message = "Last name can only contain letters, spaces, hyphens")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Valid email address required")
    private String email;

    @NotBlank(message = "Student index is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Student index must be exactly 10 digits")
    private String studentIndex;

    @NotNull(message = "Date of birth is required")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @NotBlank(message = "Gender is required")
    private String gender;

    private String nationality;
    private String hometown;
    private String residentialAddress;

    private String guardianName;
    @Pattern(regexp = "^[+0-9\\s\\-()]{10,15}$", message = "Invalid phone number format")
    private String guardianPhone;
    private String guardianEmail;
    private String guardianRelationship;

    @Min(value = 6, message = "BECE aggregate minimum is 6")
    @Max(value = 54, message = "BECE aggregate maximum is 54")
    private Integer beceAggregate;
    private String beceYear;

    private LocalDate admissionDate;

    @NotNull(message = "Year group is required")
    private YearGroup yearGroup;

    @NotNull(message = "School ID is required")
    private Long schoolId;

    @NotNull(message = "Program ID is required")
    private Long programId;

    private Long classId;
}
