package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportProgressDto {
    private String key;
    private String status;          // STARTED, IN_PROGRESS, COMPLETE, FAILED
    private Integer total;
    private Integer processed;
    private Integer failed;
    private Double percentage;
    private String message;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String errorMessage;
}
