package com.shs.academic.model.entity;

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
@Table(name = "teachers", indexes = {
        @Index(name = "idx_teachers_staff_id", columnList = "staffId"),
        @Index(name = "idx_teachers_school_id", columnList = "school_id")
})
@EntityListeners(AuditingEntityListener.class)
public class Teacher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(unique = true, nullable = false)
    private String staffId;

    private String department;

    private String qualification;

    private String specialization;

    private LocalDate dateJoined;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Builder.Default
    @Column(nullable = false)
    private boolean isClassTeacher = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_class_id")
    private ClassRoom assignedClass;

    @Builder.Default
    @Column(nullable = false)
    private boolean isActive = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
