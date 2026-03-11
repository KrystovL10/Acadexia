package com.shs.academic.model.dto;

import com.shs.academic.model.entity.Program;
import com.shs.academic.model.enums.ProgramType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgramDto {

    private Long id;
    private ProgramType programType;
    private String displayName;
    private String description;
    private Long schoolId;
    private String schoolName;
    private boolean isActive;
    private List<ProgramSubjectDto> subjects;
    private LocalDateTime createdAt;

    public static ProgramDto fromEntity(Program program) {
        List<ProgramSubjectDto> subjectDtos = program.getProgramSubjects() != null
                ? program.getProgramSubjects().stream().map(ProgramSubjectDto::fromEntity).toList()
                : Collections.emptyList();

        return ProgramDto.builder()
                .id(program.getId())
                .programType(program.getProgramType())
                .displayName(program.getDisplayName())
                .description(program.getDescription())
                .schoolId(program.getSchool().getId())
                .schoolName(program.getSchool().getName())
                .isActive(program.isActive())
                .subjects(subjectDtos)
                .createdAt(program.getCreatedAt())
                .build();
    }
}
