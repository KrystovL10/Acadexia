package com.shs.academic.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateTeacherRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be 2-50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be 2-50 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Valid email address required")
    private String email;

    @Pattern(regexp = "^[+0-9\\s\\-()]{10,15}$", message = "Invalid phone number format")
    private String phoneNumber;

    @NotBlank(message = "Staff ID is required")
    private String staffId;

    private String department;

    private String qualification;

    private String specialization;

    private LocalDate dateJoined;

    @NotNull(message = "School ID is required")
    private Long schoolId;
}
