package com.shs.academic.model.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolInsightsDto {

    private String summary;
    private List<InsightDto> insights;
    private WaecReadinessDto waecReadiness;
    private LocalDateTime generatedAt;
    private Long schoolId;
    private Long termId;
}
