package com.shs.academic.model.dto.ai;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HeadmasterRemarkContext {

    private String classification;
    private Double gpa;
    private String conductRating;
    private Double attendancePercentage;
    private Integer positionInClass;
    private Integer totalStudentsInClass;
}
