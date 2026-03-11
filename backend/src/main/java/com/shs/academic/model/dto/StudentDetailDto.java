package com.shs.academic.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class StudentDetailDto {

    // ─── Identity ────────────────────────────────────────────────────
    private Long id;
    /** GES-issued student ID string */
    private String userId;
    private String firstName;
    private String lastName;
    private String fullName;

    // ─── User account ────────────────────────────────────────────────
    private String email;
    private String phoneNumber;
    private String profilePhotoUrl;
    private Boolean isFirstLogin;

    // ─── Student profile ─────────────────────────────────────────────
    private String studentIndex;
    private LocalDate dateOfBirth;
    private String gender;
    private String nationality;
    private String hometown;
    private String residentialAddress;
    private String guardianName;
    private String guardianPhone;
    private String guardianEmail;
    private String guardianRelationship;
    private Integer beceAggregate;
    private String beceYear;
    private LocalDate admissionDate;

    // ─── Placement ───────────────────────────────────────────────────
    private Long schoolId;
    private String schoolName;
    private String currentYearGroup;
    private Long currentProgramId;
    private String currentProgramName;
    private Long currentClassId;
    private String currentClassName;
    private Boolean isActive;
    private Boolean hasGraduated;
    private LocalDateTime createdAt;

    // ─── Academic data ───────────────────────────────────────────────
    private List<ScoreDto> currentTermScores;
    /** null when term results have not been generated yet */
    private Double currentGpa;
    /** null when no terms have been completed */
    private Double cgpa;
    private Integer positionInClass;

    // ─── Contextual data ─────────────────────────────────────────────
    private List<EarlyWarningDto> activeWarnings;
    private AttendanceSummaryDto attendanceSummary;
    private BehaviorSummaryDto behaviorSummary;

    // ─── Inner types ─────────────────────────────────────────────────

    @Data
    @Builder
    public static class BehaviorSummaryDto {
        private Integer achievementCount;
        private Integer disciplineCount;
        private LocalDateTime lastLogDate;
    }
}
