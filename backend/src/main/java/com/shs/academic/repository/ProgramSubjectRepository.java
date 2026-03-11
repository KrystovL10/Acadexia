package com.shs.academic.repository;

import com.shs.academic.model.entity.ProgramSubject;
import com.shs.academic.model.enums.YearGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProgramSubjectRepository extends JpaRepository<ProgramSubject, Long> {

    List<ProgramSubject> findByProgramId(Long programId);

    List<ProgramSubject> findByProgramIdAndYearGroup(Long programId, YearGroup yearGroup);

    boolean existsByProgramIdAndSubjectIdAndYearGroup(Long programId, Long subjectId, YearGroup yearGroup);
}
