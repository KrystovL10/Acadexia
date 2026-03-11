package com.shs.academic.model.dto;

import com.shs.academic.model.entity.Score;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoreDto {

    private Long id;
    private Long studentId;
    private String studentIndex;
    private String studentName;
    private Long subjectId;
    private String subjectName;
    private String subjectCode;
    private Long classRoomId;
    private String className;
    private Long termId;
    private Long academicYearId;
    private String academicYearLabel;
    private Long enteredById;
    private String enteredByName;
    private Double classScore;
    private Double examScore;
    private Double totalScore;
    private String grade;
    private Double gradePoint;
    private String remarks;
    private boolean isAbsent;
    private boolean isLocked;
    private LocalDateTime submittedAt;
    private LocalDateTime updatedAt;

    public static ScoreDto fromEntity(Score score) {
        return ScoreDto.builder()
                .id(score.getId())
                .studentId(score.getStudent().getId())
                .studentIndex(score.getStudent().getStudentIndex())
                .studentName(score.getStudent().getUser().getFullName())
                .subjectId(score.getSubject().getId())
                .subjectName(score.getSubject().getName())
                .subjectCode(score.getSubject().getSubjectCode())
                .classRoomId(score.getClassRoom().getId())
                .className(score.getClassRoom().getDisplayName())
                .termId(score.getTerm().getId())
                .academicYearId(score.getAcademicYear().getId())
                .academicYearLabel(score.getAcademicYear().getYearLabel())
                .enteredById(score.getEnteredBy().getId())
                .enteredByName(score.getEnteredBy().getFullName())
                .classScore(score.getClassScore())
                .examScore(score.getExamScore())
                .totalScore(score.getTotalScore())
                .grade(score.getGrade())
                .gradePoint(score.getGradePoint())
                .remarks(score.getRemarks())
                .isAbsent(score.isAbsent())
                .isLocked(score.isLocked())
                .submittedAt(score.getSubmittedAt())
                .updatedAt(score.getUpdatedAt())
                .build();
    }
}
