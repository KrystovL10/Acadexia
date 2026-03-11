package com.shs.academic.model.dto;

import com.shs.academic.model.entity.BehaviorLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BehaviorLogDto {

    private Long id;
    private Long studentId;
    private String studentIndex;
    private String studentName;
    private Long classRoomId;
    private String className;
    private Long termId;
    private String logType;
    private String title;
    private String description;
    private String severity;
    private Long loggedById;
    private String loggedByName;
    private LocalDateTime loggedAt;

    public static BehaviorLogDto fromEntity(BehaviorLog log) {
        return BehaviorLogDto.builder()
                .id(log.getId())
                .studentId(log.getStudent().getId())
                .studentIndex(log.getStudent().getStudentIndex())
                .studentName(log.getStudent().getUser().getFullName())
                .classRoomId(log.getClassRoom().getId())
                .className(log.getClassRoom().getDisplayName())
                .termId(log.getTerm().getId())
                .logType(log.getLogType())
                .title(log.getTitle())
                .description(log.getDescription())
                .severity(log.getSeverity())
                .loggedById(log.getLoggedBy().getId())
                .loggedByName(log.getLoggedBy().getFullName())
                .loggedAt(log.getLoggedAt())
                .build();
    }
}
