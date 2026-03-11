package com.shs.academic.model.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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
public class BulkAttendanceRequest {

    @NotNull(message = "ClassRoom ID is required")
    private Long classRoomId;

    @NotNull(message = "Term ID is required")
    private Long termId;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotEmpty(message = "Attendance entries cannot be empty")
    @Valid
    private List<AttendanceEntry> entries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceEntry {

        @NotNull(message = "Student ID is required")
        private Long studentId;

        private boolean isPresent;

        private boolean isLate;

        private String reason;
    }
}
