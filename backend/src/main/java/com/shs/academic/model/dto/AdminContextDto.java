package com.shs.academic.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminContextDto {
    private Long schoolId;
    private String schoolName;
    private Long academicYearId;
    private String academicYearLabel;
    private Long termId;
    private String termLabel;
    private boolean termLocked;
}
