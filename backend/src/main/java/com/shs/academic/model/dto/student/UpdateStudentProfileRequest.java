package com.shs.academic.model.dto.student;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStudentProfileRequest {

    private String phoneNumber;
    private String residentialAddress;
    private String profilePhotoUrl;
}
