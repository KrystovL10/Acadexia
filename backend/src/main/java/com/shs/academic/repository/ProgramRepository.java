package com.shs.academic.repository;

import com.shs.academic.model.entity.Program;
import com.shs.academic.model.enums.ProgramType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProgramRepository extends JpaRepository<Program, Long> {

    List<Program> findBySchoolIdAndIsActive(Long schoolId, boolean active);

    Optional<Program> findByProgramTypeAndSchoolId(ProgramType type, Long schoolId);
}
