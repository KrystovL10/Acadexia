package com.shs.academic.repository;

import com.shs.academic.model.entity.CumulativeGPA;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CumulativeGPARepository extends JpaRepository<CumulativeGPA, Long> {

    Optional<CumulativeGPA> findByStudentId(Long studentId);

    List<CumulativeGPA> findByStudentIdIn(List<Long> studentIds);

    @Query("SELECT COUNT(c) FROM CumulativeGPA c WHERE c.student.school.id = :schoolId AND c.cgpa >= :minCgpa")
    Long countBySchoolIdAndCgpaGreaterThanEqual(@Param("schoolId") Long schoolId, @Param("minCgpa") Double minCgpa);

    @Query("SELECT c FROM CumulativeGPA c WHERE c.student.school.id = :schoolId AND c.cgpa >= :minCgpa " +
            "ORDER BY c.cgpa DESC")
    List<CumulativeGPA> findScholarshipCandidates(@Param("schoolId") Long schoolId, @Param("minCgpa") Double minCgpa);
}
