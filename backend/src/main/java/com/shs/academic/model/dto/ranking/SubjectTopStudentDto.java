package com.shs.academic.model.dto.ranking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectTopStudentDto {

    private Long subjectId;
    private String subjectName;
    private StudentRankDto student;
    private Double score;
    private String grade;
}
