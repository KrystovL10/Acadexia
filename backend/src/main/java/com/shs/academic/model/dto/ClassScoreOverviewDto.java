package com.shs.academic.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class ClassScoreOverviewDto {

    private List<StudentSummaryDto> students;
    private List<SubjectDto> subjects;

    /**
     * Outer key = studentId, inner key = subjectId.
     * A missing inner entry means no score has been entered yet.
     */
    private Map<Long, Map<Long, ScoreDto>> scoreMatrix;

    private List<ScoreCompletionStatusDto.SubjectCompletionDto> subjectCompletions;
}
