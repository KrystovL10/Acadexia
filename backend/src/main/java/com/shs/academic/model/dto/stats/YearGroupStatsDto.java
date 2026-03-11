package com.shs.academic.model.dto.stats;

import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YearGroupStatsDto {

    private YearGroup yearGroup;
    private long studentCount;
    private Double avgGpa;
    private Double passRate;
}
