package com.shs.academic.model.entity;

import com.shs.academic.model.enums.YearGroup;
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
@Table(name = "term_results", uniqueConstraints = {
        @UniqueConstraint(name = "uk_term_result_student_term",
                columnNames = {"student_id", "term_id"})
}, indexes = {
        @Index(name = "idx_term_results_student", columnList = "student_id"),
        @Index(name = "idx_term_results_class_term", columnList = "classroom_id, term_id"),
        @Index(name = "idx_term_results_term_gpa", columnList = "term_id, gpa")
})
public class TermResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id", nullable = false)
    private Term term;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academic_year_id", nullable = false)
    private AcademicYear academicYear;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id", nullable = false)
    private ClassRoom classRoom;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private YearGroup yearGroup;

    // Aggregate stats
    private Integer totalSubjects;
    private Integer subjectsPassed;
    private Integer subjectsFailed;
    private Double totalPoints;
    private Double gpa;
    private Integer positionInClass;
    private Integer positionInYearGroup;
    private Integer totalStudentsInClass;

    // Attendance summary
    private Integer totalDaysPresent;
    private Integer totalDaysAbsent;
    private Double attendancePercentage;

    // Conduct
    private String conductRating;

    @Column(length = 1000)
    private String classTeacherRemarks;

    @Column(length = 1000)
    private String headmasterRemarks;

    // Status
    @Builder.Default
    @Column(nullable = false)
    private boolean isGenerated = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean isApproved = false;

    private LocalDateTime generatedAt;

    private LocalDateTime approvedAt;
}
