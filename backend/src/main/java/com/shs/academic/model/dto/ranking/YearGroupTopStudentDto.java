package com.shs.academic.model.dto.ranking;

import com.shs.academic.model.enums.YearGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YearGroupTopStudentDto {

    private YearGroup yearGroup;
    private StudentRankDto student;
}
