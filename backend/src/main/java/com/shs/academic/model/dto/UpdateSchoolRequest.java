package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSchoolRequest {

    private String name;

    private String address;

    private String phoneNumber;

    private String email;

    private String motto;

    private String headmasterName;

    private String logoUrl;
}
