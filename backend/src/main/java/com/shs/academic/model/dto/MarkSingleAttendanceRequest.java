package com.shs.academic.model.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarkSingleAttendanceRequest {

    @NotNull(message = "Student ID is required")
    private Long studentId;

    @NotNull(message = "Class room ID is required")
    private Long classRoomId;

    @NotNull(message = "Term ID is required")
    private Long termId;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotNull(message = "Presence status is required")
    private Boolean isPresent;

    private Boolean isLate = false;

    private String reason;
}
