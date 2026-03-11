package com.shs.academic.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "attendance", uniqueConstraints = {
        @UniqueConstraint(name = "uk_attendance_student_date",
                columnNames = {"student_id", "date"})
}, indexes = {
        @Index(name = "idx_attendance_class_date", columnList = "classroom_id, date"),
        @Index(name = "idx_attendance_student_term", columnList = "student_id, term_id")
})
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id", nullable = false)
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id", nullable = false)
    private Term term;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private boolean isPresent;

    @Builder.Default
    @Column(nullable = false)
    private boolean isLate = false;

    private String reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marked_by_id", nullable = false)
    private User markedBy;

    private LocalDateTime markedAt;

    @PrePersist
    public void onPrePersist() {
        if (this.markedAt == null) {
            this.markedAt = LocalDateTime.now();
        }
    }
}
