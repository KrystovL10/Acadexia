package com.shs.academic.model.dto;

import com.shs.academic.model.entity.TermResult;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.util.GpaCalculator;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TermResultDto {

    private Long id;
    private Long studentId;
    private String studentIndex;
    private String studentName;
    private Long termId;
    private String termName;
    private Long academicYearId;
    private String academicYearLabel;
    private Long classRoomId;
    private String className;
    private YearGroup yearGroup;
    private String programName;

    // Aggregate stats
    private Integer totalSubjects;
    private Integer subjectsPassed;
    private Integer subjectsFailed;
    private Double totalPoints;
    private Double gpa;
    private String classification;
    private Integer positionInClass;
    private Integer positionInYearGroup;
    private Integer totalStudentsInClass;

    // Attendance
    private Integer totalDaysPresent;
    private Integer totalDaysAbsent;
    private Double attendancePercentage;

    // Conduct
    private String conductRating;
    private String classTeacherRemarks;
    private String headmasterRemarks;

    // Status
    private boolean isGenerated;
    private boolean isApproved;
    private LocalDateTime generatedAt;
    private LocalDateTime approvedAt;

    // Subject scores — populated by service layer
    private List<ScoreDto> scores;

    public static TermResultDto fromEntity(TermResult result) {
        return TermResultDto.builder()
                .id(result.getId())
                .studentId(result.getStudent().getId())
                .studentIndex(result.getStudent().getStudentIndex())
                .studentName(result.getStudent().getUser().getFullName())
                .termId(result.getTerm().getId())
                .termName(result.getTerm().getTermType().name().replace("_", " "))
                .academicYearId(result.getAcademicYear().getId())
                .academicYearLabel(result.getAcademicYear().getYearLabel())
                .classRoomId(result.getClassRoom().getId())
                .className(result.getClassRoom().getDisplayName())
                .yearGroup(result.getYearGroup())
                .programName(result.getStudent().getCurrentProgram() != null
                        ? result.getStudent().getCurrentProgram().getDisplayName() : null)
                .totalSubjects(result.getTotalSubjects())
                .subjectsPassed(result.getSubjectsPassed())
                .subjectsFailed(result.getSubjectsFailed())
                .totalPoints(result.getTotalPoints())
                .gpa(result.getGpa())
                .classification(result.getGpa() != null
                        ? GpaCalculator.getClassification(result.getGpa()) : null)
                .positionInClass(result.getPositionInClass())
                .positionInYearGroup(result.getPositionInYearGroup())
                .totalStudentsInClass(result.getTotalStudentsInClass())
                .totalDaysPresent(result.getTotalDaysPresent())
                .totalDaysAbsent(result.getTotalDaysAbsent())
                .attendancePercentage(result.getAttendancePercentage())
                .conductRating(result.getConductRating())
                .classTeacherRemarks(result.getClassTeacherRemarks())
                .headmasterRemarks(result.getHeadmasterRemarks())
                .isGenerated(result.isGenerated())
                .isApproved(result.isApproved())
                .generatedAt(result.getGeneratedAt())
                .approvedAt(result.getApprovedAt())
                .build();
    }

    public static TermResultDto fromEntityWithScores(TermResult result, List<ScoreDto> scores) {
        TermResultDto dto = fromEntity(result);
        dto.setScores(scores);
        return dto;
    }
}
