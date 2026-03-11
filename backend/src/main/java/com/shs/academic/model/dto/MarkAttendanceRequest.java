package com.shs.academic.model.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class MarkAttendanceRequest {

    @NotNull(message = "Class room ID is required")
    private Long classRoomId;

    @NotNull(message = "Term ID is required")
    private Long termId;

    @NotNull(message = "Attendance date is required")
    private LocalDate date;

    @NotEmpty(message = "At least one attendance entry is required")
    @Valid
    private List<AttendanceEntryDto> entries;

    @Data
    public static class AttendanceEntryDto {

        @NotNull(message = "Student ID is required")
        private Long studentId;

        @NotNull(message = "isPresent flag is required")
        private Boolean isPresent;

        /** true = student arrived late but was marked present */
        private Boolean isLate;

        /** Optional reason for absence or late arrival */
        private String reason;
    }
}
