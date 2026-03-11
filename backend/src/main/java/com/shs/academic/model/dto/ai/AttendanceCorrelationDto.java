package com.shs.academic.model.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceCorrelationDto {

    private Long classRoomId;
    private String className;
    private Long termId;
    private String termLabel;

    /** Pearson r value between attendance % and GPA  (-1 to 1) */
    private double correlationCoefficient;

    /** Human-readable strength: STRONG_POSITIVE, MODERATE_POSITIVE, WEAK, etc. */
    private String correlationStrength;

    private int sampleSize;

    /** Students whose attendance is below the at-risk threshold */
    private List<AtRiskAttendanceStudentDto> atRiskStudents;

    /** AI-generated narrative insights */
    private String aiSummary;
    private List<String> recommendations;

    private LocalDateTime generatedAt;
}
