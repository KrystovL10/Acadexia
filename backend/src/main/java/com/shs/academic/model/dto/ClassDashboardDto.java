package com.shs.academic.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ClassDashboardDto {

    private ClassRoomDto classInfo;
    private String termLabel;
    private Integer totalStudents;

    /** null when term results have not yet been generated */
    private Double averageGpa;
    private StudentGpaDto highestGpa;
    private StudentGpaDto lowestGpa;

    /** percentage, 0–100 */
    private Double passRate;
    private Double failRate;

    private List<SubjectPerformanceDto> subjectPerformance;
    private ScoreCompletionStatusDto scoreCompletionStatus;
    private AttendanceSummaryStats attendanceSummary;

    private Integer activeWarnings;
    private List<RecentActivityDto> recentActivity;

    // ─── Inner types ────────────────────────────────────────────────

    @Data
    @Builder
    public static class StudentGpaDto {
        private Long studentId;
        private String studentName;
        private String studentIndex;
        private Double gpa;
    }

    @Data
    @Builder
    public static class SubjectPerformanceDto {
        private Long subjectId;
        private String subjectName;
        private String subjectCode;
        private Double avgScore;
        /** percentage of students scoring ≥ 50 in this subject */
        private Double passRate;
        private String tutorName;
        private Integer studentsWithScores;
        private Integer totalStudents;
    }

    @Data
    @Builder
    public static class AttendanceSummaryStats {
        private Double avgAttendance;
        private Integer studentsBelow75Percent;
    }

    @Data
    @Builder
    public static class RecentActivityDto {
        private Long subjectId;
        private String subjectName;
        private String tutorName;
        private Integer scoresSubmitted;
        private LocalDateTime lastSubmittedAt;
    }
}
