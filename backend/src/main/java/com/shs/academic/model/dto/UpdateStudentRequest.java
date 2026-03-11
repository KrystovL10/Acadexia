package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStudentRequest {

    private String guardianName;

    private String guardianPhone;

    private String guardianEmail;

    private String guardianRelationship;

    private String residentialAddress;

    private String phoneNumber;

    private String profilePhotoUrl;
}
