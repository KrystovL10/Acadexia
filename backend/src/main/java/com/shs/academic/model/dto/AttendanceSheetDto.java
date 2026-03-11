package com.shs.academic.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class AttendanceSheetDto {

    private List<StudentSummaryDto> students;
    private List<LocalDate> dates;

    /**
     * Outer key = studentId, inner key = date.
     * Value = true (present) / false (absent).
     * A missing date entry means attendance was not recorded for that day.
     */
    private Map<Long, Map<LocalDate, Boolean>> attendanceMatrix;

    /** Per-student summary totals derived from the matrix range */
    private Map<Long, AttendanceSummaryDto> summaryByStudent;
}
