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
@Table(name = "behavior_logs", indexes = {
        @Index(name = "idx_behavior_logs_student_term", columnList = "student_id, term_id"),
        @Index(name = "idx_behavior_logs_class_term", columnList = "classroom_id, term_id")
})
public class BehaviorLog {

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
    private String logType;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    private String severity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logged_by_id", nullable = false)
    private User loggedBy;

    private LocalDateTime loggedAt;

    @Builder.Default
    @Column(nullable = false)
    private boolean isDeleted = false;

    @PrePersist
    public void onPrePersist() {
        if (this.loggedAt == null) {
            this.loggedAt = LocalDateTime.now();
        }
    }
}
