package com.shs.academic.model.entity;

import com.shs.academic.model.enums.YearGroup;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "program_subjects", uniqueConstraints = {
        @UniqueConstraint(name = "uk_program_subject_year",
                columnNames = {"program_id", "subject_id", "year_group"})
})
public class ProgramSubject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "program_id", nullable = false)
    private Program program;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Enumerated(EnumType.STRING)
    @Column(name = "year_group", nullable = false)
    private YearGroup yearGroup;

    @Builder.Default
    @Column(nullable = false)
    private boolean isCompulsory = true;
}
