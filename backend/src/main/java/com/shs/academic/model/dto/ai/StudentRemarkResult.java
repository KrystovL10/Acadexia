package com.shs.academic.model.dto.ai;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class StudentRemarkResult {

    private Long studentId;
    private String classTeacherRemark;
    private String conductRating;
    private String headmasterRemark;
    private boolean aiGenerated;
    private LocalDateTime generatedAt;
}
