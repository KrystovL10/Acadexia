package com.shs.academic.model.dto;

import com.shs.academic.model.entity.Term;
import com.shs.academic.model.enums.TermType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TermDto {

    private Long id;
    private Long academicYearId;
    private TermType termType;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean isCurrent;
    private boolean isScoresLocked;
    private LocalDateTime createdAt;

    public static TermDto fromEntity(Term term) {
        return TermDto.builder()
                .id(term.getId())
                .academicYearId(term.getAcademicYear().getId())
                .termType(term.getTermType())
                .startDate(term.getStartDate())
                .endDate(term.getEndDate())
                .isCurrent(term.isCurrent())
                .isScoresLocked(term.isScoresLocked())
                .createdAt(term.getCreatedAt())
                .build();
    }
}
