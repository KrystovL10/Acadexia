package com.shs.academic.model.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtRiskAttendanceStudentDto {

    private Long studentId;
    private String studentIndex;
    private String studentName;

    private double attendanceRate;
    private int totalAbsent;
    private int totalPresent;
    private int totalLate;

    /** Current GPA — may be null if no term result yet */
    private Double gpa;

    private String riskLevel;   // HIGH (<60%), MEDIUM (60-75%), LOW (75-80%)
}
