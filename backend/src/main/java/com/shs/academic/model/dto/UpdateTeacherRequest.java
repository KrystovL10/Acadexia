package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTeacherRequest {

    private String firstName;

    private String lastName;

    private String phoneNumber;

    private String department;

    private String qualification;

    private String specialization;
}
