package com.shs.academic.model.dto.ai;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class StudentRemarkContext {

    private Long studentId;
    private String studentFirstName;
    private Double gpa;
    private Double previousGpa;
    private String classification;
    private Integer totalSubjects;
    private Integer subjectsPassed;
    private List<String> failedSubjectNames;
    private String bestSubjectName;
    private String bestSubjectGrade;
    private String weakestSubjectName;
    private String weakestSubjectGrade;
    private Double attendancePercentage;
    private String behaviorSummary;
    private Integer positionInClass;
    private Integer totalStudentsInClass;
}
