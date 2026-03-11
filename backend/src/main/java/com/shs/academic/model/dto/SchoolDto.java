package com.shs.academic.model.dto;

import com.shs.academic.model.entity.School;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolDto {

    private Long id;
    private String schoolCode;
    private String name;
    private String region;
    private String district;
    private String address;
    private String phoneNumber;
    private String email;
    private String motto;
    private String logoUrl;
    private String headmasterName;
    private boolean isActive;
    private LocalDateTime createdAt;

    public static SchoolDto fromEntity(School school) {
        return SchoolDto.builder()
                .id(school.getId())
                .schoolCode(school.getSchoolCode())
                .name(school.getName())
                .region(school.getRegion())
                .district(school.getDistrict())
                .address(school.getAddress())
                .phoneNumber(school.getPhoneNumber())
                .email(school.getEmail())
                .motto(school.getMotto())
                .logoUrl(school.getLogoUrl())
                .headmasterName(school.getHeadmasterName())
                .isActive(school.isActive())
                .createdAt(school.getCreatedAt())
                .build();
    }
}
