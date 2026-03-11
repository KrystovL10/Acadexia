package com.shs.academic.model.dto.student;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendanceSummaryDto {

    private String termLabel;
    private Long termId;
    private Integer totalPresent;
    private Integer totalAbsent;
    private Integer totalLate;
    private Double percentage;
    private List<AbsentDateDto> absentDates;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AbsentDateDto {
        private LocalDate date;
        private String reason;
    }
}
