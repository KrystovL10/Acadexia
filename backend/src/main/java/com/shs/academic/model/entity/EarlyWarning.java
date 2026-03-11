package com.shs.academic.model.entity;

import com.shs.academic.model.enums.WarningLevel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "early_warnings", indexes = {
        @Index(name = "idx_early_warnings_student", columnList = "student_id"),
        @Index(name = "idx_early_warnings_term_level", columnList = "term_id, warning_level"),
        @Index(name = "idx_early_warnings_term_resolved", columnList = "term_id, is_resolved")
})
public class EarlyWarning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id", nullable = false)
    private Term term;

    @Enumerated(EnumType.STRING)
    @Column(name = "warning_level", nullable = false)
    private WarningLevel warningLevel;

    @Column(nullable = false)
    private String warningType;

    @Column(length = 2000)
    private String description;

    @Column(length = 2000)
    private String suggestedAction;

    private String subjectsFailing;

    private Double previousGpa;

    private Double currentGpa;

    private Double attendancePercentage;

    @Column(length = 500)
    private String urgencyNote;

    @Builder.Default
    @Column(nullable = false)
    private boolean isResolved = false;

    private LocalDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by_id")
    private User resolvedBy;

    @Column(length = 1000)
    private String resolutionNote;

    private LocalDateTime generatedAt;

    @Builder.Default
    @Column(nullable = false)
    private boolean isAiGenerated = true;

    @PrePersist
    public void onPrePersist() {
        if (this.generatedAt == null) {
            this.generatedAt = LocalDateTime.now();
        }
    }
}
