package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceSummaryDto {

    private Long studentId;
    private String studentIndex;
    private String studentName;
    private Integer totalPresent;
    private Integer totalAbsent;
    private Integer totalLate;
    private Double percentage;
}
