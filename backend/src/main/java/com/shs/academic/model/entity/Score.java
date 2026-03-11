package com.shs.academic.model.entity;

import com.shs.academic.util.GradeCalculator;
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
@Table(name = "scores", uniqueConstraints = {
        @UniqueConstraint(name = "uk_student_subject_term",
                columnNames = {"student_id", "subject_id", "term_id"})
}, indexes = {
        @Index(name = "idx_scores_class_term_subject", columnList = "classroom_id, term_id, subject_id"),
        @Index(name = "idx_scores_student_term", columnList = "student_id, term_id"),
        @Index(name = "idx_scores_subject_term", columnList = "subject_id, term_id")
})
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id", nullable = false)
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id", nullable = false)
    private Term term;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academic_year_id", nullable = false)
    private AcademicYear academicYear;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entered_by_id", nullable = false)
    private User enteredBy;

    private Double classScore;

    private Double examScore;

    private Double totalScore;

    private String grade;

    private Double gradePoint;

    private String remarks;

    @Builder.Default
    @Column(nullable = false)
    private boolean isAbsent = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean isLocked = false;

    private LocalDateTime submittedAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void onPrePersist() {
        computeGrade();
        this.submittedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onPreUpdate() {
        computeGrade();
        this.updatedAt = LocalDateTime.now();
    }

    private void computeGrade() {
        if (isAbsent || classScore == null || examScore == null) {
            this.totalScore = null;
            this.grade = null;
            this.gradePoint = null;
            this.remarks = isAbsent ? "Absent" : null;
            return;
        }
        this.totalScore = classScore + examScore;
        this.grade = GradeCalculator.calculateGrade(totalScore);
        this.gradePoint = GradeCalculator.calculateGradePoint(grade);
        this.remarks = GradeCalculator.getRemarks(grade);
    }
}
