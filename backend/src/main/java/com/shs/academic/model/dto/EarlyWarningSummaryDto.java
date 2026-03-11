package com.shs.academic.model.dto;

import com.shs.academic.model.enums.WarningLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EarlyWarningSummaryDto {

    private Long termId;
    private String termName;
    private long totalWarnings;
    private long criticalCount;
    private long highCount;
    private long mediumCount;
    private long lowCount;
    private long unresolvedCount;
    private long resolvedCount;
    private List<EarlyWarningDto> criticalStudents;
    private List<EarlyWarningDto> recentWarnings;
}
