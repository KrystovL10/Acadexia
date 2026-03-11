package com.shs.academic.model.dto;

import com.shs.academic.model.enums.YearGroup;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class TranscriptDto {

    // ─── Student identity ─────────────────────────────────────────────
    private Long studentId;
    private String studentIndex;
    private String fullName;
    private String email;
    private String gender;
    private LocalDate dateOfBirth;
    private LocalDate admissionDate;
    private LocalDate graduationDate;

    // ─── Academic placement ───────────────────────────────────────────
    private SchoolDto schoolInfo;
    private String programName;
    private YearGroup yearGroup;

    // ─── Term records ─────────────────────────────────────────────────
    private List<TermTranscriptDto> terms;

    // ─── Summary ──────────────────────────────────────────────────────
    private Double cgpa;
    private String classification;
    private Integer totalTermsCompleted;

    // ═══════════════════════════════════════════════════════════════════
    // Nested types
    // ═══════════════════════════════════════════════════════════════════

    @Data
    @Builder
    public static class TermTranscriptDto {
        /** e.g. "Term 1 — 2023/2024" */
        private String termLabel;
        private YearGroup yearGroup;
        private String className;
        private List<SubjectScoreDto> subjects;
        private Double gpa;
        private Integer position;
        private Integer totalStudents;
        private String conductRating;
        private String classTeacherRemarks;
        private Double attendancePercentage;
        private Integer totalDaysPresent;
        private Integer totalDaysAbsent;
    }

    @Data
    @Builder
    public static class SubjectScoreDto {
        private String subjectName;
        private String subjectCode;
        private Double classScore;
        private Double examScore;
        private Double totalScore;
        private String grade;
        private Double gradePoint;
        private String remarks;
        private boolean isAbsent;
    }
}
