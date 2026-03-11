package com.shs.academic.model.dto.ranking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassTopStudentDto {

    private Long classId;
    private String className;
    private StudentRankDto student;
}
