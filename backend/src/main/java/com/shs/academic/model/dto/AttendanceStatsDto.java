package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceStatsDto {

    private Long scopeId;          // classRoomId or schoolId
    private String scopeName;      // class name or school name
    private Long termId;
    private String termLabel;

    private int totalStudents;
    private int totalDaysRecorded;
    private int totalExpectedRecords;   // totalStudents × totalDaysRecorded
    private int totalPresent;
    private int totalAbsent;
    private int totalLate;

    private double overallAttendanceRate;   // present / expected * 100
    private double punctualityRate;          // (present - late) / present * 100

    private int studentsWithPerfectAttendance;
    private int studentsAtRisk;             // attendance < 75%

    private List<ClassAttendanceBreakdownDto> classBreakdowns; // for school-level stats

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassAttendanceBreakdownDto {
        private Long classRoomId;
        private String className;
        private int studentCount;
        private int totalPresent;
        private int totalAbsent;
        private double attendanceRate;
    }
}
