package com.shs.academic.model.entity;

import com.shs.academic.model.enums.YearGroup;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "students", indexes = {
        @Index(name = "idx_students_student_index", columnList = "studentIndex"),
        @Index(name = "idx_students_school_year_group", columnList = "school_id, currentYearGroup")
})
@EntityListeners(AuditingEntityListener.class)
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(unique = true, nullable = false)
    private String studentIndex;

    private LocalDate dateOfBirth;

    private String gender;

    @Builder.Default
    @Column(nullable = false)
    private String nationality = "Ghanaian";

    private String hometown;

    private String residentialAddress;

    private String guardianName;

    private String guardianPhone;

    private String guardianEmail;

    private String guardianRelationship;

    @Column(name = "bece_aggregate")
    private Integer beceAggregate;

    private String beceYear;

    private LocalDate admissionDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private YearGroup currentYearGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_program_id", nullable = false)
    private Program currentProgram;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_class_id")
    private ClassRoom currentClass;

    @Builder.Default
    @Column(nullable = false)
    private boolean isActive = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean hasGraduated = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
