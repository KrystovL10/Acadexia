package com.shs.academic.repository;

import com.shs.academic.model.entity.AcademicYear;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AcademicYearRepository extends JpaRepository<AcademicYear, Long> {

    Optional<AcademicYear> findBySchoolIdAndIsCurrentTrue(Long schoolId);

    List<AcademicYear> findBySchoolIdOrderByYearLabelDesc(Long schoolId);

    boolean existsBySchoolIdAndYearLabel(Long schoolId, String yearLabel);
}
