package com.shs.academic.model.entity;

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
@Table(name = "cumulative_gpa", uniqueConstraints = {
        @UniqueConstraint(name = "uk_cumulative_gpa_student",
                columnNames = {"student_id"})
})
public class CumulativeGPA {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academic_year_id")
    private AcademicYear academicYear;

    private Integer totalTermsCompleted;

    private Double totalGradePoints;

    private Double cgpa;

    private LocalDateTime lastUpdated;

    @PrePersist
    public void onPrePersist() {
        computeCgpa();
        this.lastUpdated = LocalDateTime.now();
    }

    @PreUpdate
    public void onPreUpdate() {
        computeCgpa();
        this.lastUpdated = LocalDateTime.now();
    }

    private void computeCgpa() {
        if (totalTermsCompleted != null && totalTermsCompleted > 0 && totalGradePoints != null) {
            this.cgpa = totalGradePoints / totalTermsCompleted;
        }
    }
}
