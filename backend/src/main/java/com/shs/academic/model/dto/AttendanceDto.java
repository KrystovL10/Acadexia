package com.shs.academic.model.dto;

import com.shs.academic.model.entity.Attendance;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDto {

    private Long id;
    private Long studentId;
    private String studentIndex;
    private String studentName;
    private Long classRoomId;
    private String className;
    private Long termId;
    private LocalDate date;
    private boolean isPresent;
    private boolean isLate;
    private String reason;
    private Long markedById;
    private String markedByName;
    private LocalDateTime markedAt;

    public static AttendanceDto fromEntity(Attendance attendance) {
        return AttendanceDto.builder()
                .id(attendance.getId())
                .studentId(attendance.getStudent().getId())
                .studentIndex(attendance.getStudent().getStudentIndex())
                .studentName(attendance.getStudent().getUser().getFullName())
                .classRoomId(attendance.getClassRoom().getId())
                .className(attendance.getClassRoom().getDisplayName())
                .termId(attendance.getTerm().getId())
                .date(attendance.getDate())
                .isPresent(attendance.isPresent())
                .isLate(attendance.isLate())
                .reason(attendance.getReason())
                .markedById(attendance.getMarkedBy().getId())
                .markedByName(attendance.getMarkedBy().getFullName())
                .markedAt(attendance.getMarkedAt())
                .build();
    }
}
