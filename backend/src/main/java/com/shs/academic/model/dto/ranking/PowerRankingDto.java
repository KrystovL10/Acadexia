package com.shs.academic.model.dto.ranking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PowerRankingDto {

    private StudentRankDto bestStudent;
    private List<StudentRankDto> topTenStudents;
    private List<ClassTopStudentDto> topStudentPerClass;
    private List<YearGroupTopStudentDto> topStudentPerYearGroup;
    private List<SubjectTopStudentDto> topStudentPerSubject;
    private ImprovementDto mostImproved;
    private ImprovementDto mostDeclined;
    private List<ImprovementDto> topFiveImproved;
    private List<ScholarshipCandidateDto> scholarshipCandidates;
}
