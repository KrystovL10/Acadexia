package com.shs.academic.model.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentTrendDto {

    private String yearLabel;
    private Map<String, Long> programCounts;
    private long totalStudents;
}
