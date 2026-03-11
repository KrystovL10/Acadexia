package com.shs.academic.model.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardStatsDto {

    private long totalStudents;
    private long totalTeachers;
    private long totalClasses;
    private String currentTermName;
    private Double averageSchoolGpa;
    private Double passRate;
    private Double failRate;
    private long activeWarnings;
    private long scholarshipCandidates;

    private List<YearGroupStatsDto> byYearGroup;
    private List<SubjectPerformanceDto> subjectPerformance;
}
