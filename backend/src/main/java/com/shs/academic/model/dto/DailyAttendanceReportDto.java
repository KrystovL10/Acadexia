package com.shs.academic.model.dto;

import com.shs.academic.model.enums.AttendanceStatus;
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
public class DailyAttendanceReportDto {

    private Long classRoomId;
    private String className;
    private Long termId;
    private LocalDate date;

    private int totalStudents;
    private int presentCount;
    private int absentCount;
    private int lateCount;
    private int notMarkedCount;
    private boolean isFullyMarked;

    private List<StudentStatusEntry> entries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentStatusEntry {
        private Long studentId;
        private String studentIndex;
        private String studentName;
        private AttendanceStatus status;
        private String reason;
    }
}
