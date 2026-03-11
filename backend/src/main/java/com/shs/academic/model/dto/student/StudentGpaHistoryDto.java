package com.shs.academic.model.dto.student;

import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentGpaHistoryDto {

    private Double currentCgpa;
    private String currentClassification;
    private List<TermGpaDto> termHistory;
    private List<CgpaPointDto> cgpaProgression;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TermGpaDto {
        private String termLabel;
        private YearGroup yearGroup;
        private Double gpa;
        private Integer positionInClass;
        private Integer totalStudents;
        private String trend; // UP, DOWN, STABLE
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CgpaPointDto {
        private String termLabel;
        private Double cgpaAfterThisTerm;
    }
}
