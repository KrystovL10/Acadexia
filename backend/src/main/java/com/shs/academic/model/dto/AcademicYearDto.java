package com.shs.academic.model.dto;

import com.shs.academic.model.entity.AcademicYear;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademicYearDto {

    private Long id;
    private Long schoolId;
    private String schoolName;
    private String yearLabel;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean isCurrent;
    private List<TermDto> terms;
    private LocalDateTime createdAt;

    public static AcademicYearDto fromEntity(AcademicYear year) {
        List<TermDto> termDtos = year.getTerms() != null
                ? year.getTerms().stream().map(TermDto::fromEntity).toList()
                : Collections.emptyList();

        return AcademicYearDto.builder()
                .id(year.getId())
                .schoolId(year.getSchool().getId())
                .schoolName(year.getSchool().getName())
                .yearLabel(year.getYearLabel())
                .startDate(year.getStartDate())
                .endDate(year.getEndDate())
                .isCurrent(year.isCurrent())
                .terms(termDtos)
                .createdAt(year.getCreatedAt())
                .build();
    }
}
