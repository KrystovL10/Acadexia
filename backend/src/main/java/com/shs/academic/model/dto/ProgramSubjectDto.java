package com.shs.academic.model.dto;

import com.shs.academic.model.entity.ProgramSubject;
import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgramSubjectDto {

    private Long id;
    private Long programId;
    private Long subjectId;
    private String subjectName;
    private String subjectCode;
    private YearGroup yearGroup;
    private boolean isCompulsory;

    public static ProgramSubjectDto fromEntity(ProgramSubject ps) {
        return ProgramSubjectDto.builder()
                .id(ps.getId())
                .programId(ps.getProgram().getId())
                .subjectId(ps.getSubject().getId())
                .subjectName(ps.getSubject().getName())
                .subjectCode(ps.getSubject().getSubjectCode())
                .yearGroup(ps.getYearGroup())
                .isCompulsory(ps.isCompulsory())
                .build();
    }
}
