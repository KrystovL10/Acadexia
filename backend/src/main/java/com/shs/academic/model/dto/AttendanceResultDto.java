package com.shs.academic.model.dto;

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
public class AttendanceResultDto {

    private Long classRoomId;
    private String className;
    private Long termId;
    private LocalDate date;

    private int totalStudents;
    private int markedPresent;
    private int markedAbsent;
    private int markedLate;

    private List<AttendanceDto> records;
}
