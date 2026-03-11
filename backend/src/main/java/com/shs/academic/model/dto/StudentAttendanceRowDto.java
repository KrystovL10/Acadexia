package com.shs.academic.model.dto;

import com.shs.academic.model.enums.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendanceRowDto {

    private Long studentId;
    private String studentIndex;
    private String studentName;

    private int totalPresent;
    private int totalAbsent;
    private int totalLate;
    private double attendanceRate;

    /** date → AttendanceStatus */
    private Map<LocalDate, AttendanceStatus> dailyStatus;
}
