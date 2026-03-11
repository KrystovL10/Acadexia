package com.shs.academic.repository;

import com.shs.academic.model.entity.Term;
import com.shs.academic.model.enums.TermType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TermRepository extends JpaRepository<Term, Long> {

    Optional<Term> findByAcademicYearIdAndTermType(Long yearId, TermType type);

    Optional<Term> findByAcademicYearIdAndIsCurrentTrue(Long yearId);

    List<Term> findByAcademicYearId(Long yearId);

    boolean existsByAcademicYearIdAndTermType(Long yearId, TermType type);
}
