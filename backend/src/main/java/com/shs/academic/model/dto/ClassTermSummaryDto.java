package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassTermSummaryDto {

    private Long classRoomId;
    private String className;
    private Long termId;
    private String termName;
    private String academicYearLabel;
    private Double classAvgGpa;
    private Double highestGpa;
    private Double lowestGpa;
    private Double passRate;
    private Integer totalStudents;
    private List<TermResultSummaryDto> studentResults;
}
