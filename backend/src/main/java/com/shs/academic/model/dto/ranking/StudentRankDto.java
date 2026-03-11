package com.shs.academic.model.dto.ranking;

import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentRankDto {

    private Integer rank;
    private Long studentId;
    private String studentIndex;
    private String fullName;
    private String className;
    private String programName;
    private YearGroup yearGroup;
    private Double gpa;
    private Double cgpa;
    private String profilePhotoUrl;
}
