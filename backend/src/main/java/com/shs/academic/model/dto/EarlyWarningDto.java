package com.shs.academic.model.dto;

import com.shs.academic.model.entity.EarlyWarning;
import com.shs.academic.model.enums.WarningLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EarlyWarningDto {

    private Long id;
    private Long studentId;
    private String studentIndex;
    private String studentName;
    private String studentClassName;
    private Long termId;
    private String termName;
    private WarningLevel warningLevel;
    private String warningType;
    private String description;
    private String suggestedAction;
    private String subjectsFailing;
    private Double previousGpa;
    private Double currentGpa;
    private Double attendancePercentage;
    private String urgencyNote;
    private boolean isResolved;
    private LocalDateTime resolvedAt;
    private String resolvedByName;
    private String resolutionNote;
    private LocalDateTime generatedAt;
    private boolean isAiGenerated;

    public static EarlyWarningDto fromEntity(EarlyWarning warning) {
        EarlyWarningDtoBuilder builder = EarlyWarningDto.builder()
                .id(warning.getId())
                .studentId(warning.getStudent().getId())
                .studentIndex(warning.getStudent().getStudentIndex())
                .studentName(warning.getStudent().getUser().getFullName())
                .termId(warning.getTerm().getId())
                .termName(warning.getTerm().getTermType().name())
                .warningLevel(warning.getWarningLevel())
                .warningType(warning.getWarningType())
                .description(warning.getDescription())
                .suggestedAction(warning.getSuggestedAction())
                .subjectsFailing(warning.getSubjectsFailing())
                .previousGpa(warning.getPreviousGpa())
                .currentGpa(warning.getCurrentGpa())
                .attendancePercentage(warning.getAttendancePercentage())
                .urgencyNote(warning.getUrgencyNote())
                .isResolved(warning.isResolved())
                .resolvedAt(warning.getResolvedAt())
                .resolutionNote(warning.getResolutionNote())
                .generatedAt(warning.getGeneratedAt())
                .isAiGenerated(warning.isAiGenerated());

        if (warning.getStudent().getCurrentClass() != null) {
            builder.studentClassName(warning.getStudent().getCurrentClass().getDisplayName());
        }

        if (warning.getResolvedBy() != null) {
            builder.resolvedByName(warning.getResolvedBy().getFullName());
        }

        return builder.build();
    }
}
