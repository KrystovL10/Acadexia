package com.shs.academic.repository;

import com.shs.academic.model.entity.Student;
import com.shs.academic.model.enums.YearGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    Optional<Student> findByStudentIndex(String index);

    Optional<Student> findByUserId(Long userId);

    List<Student> findByCurrentClassId(Long classId);

    List<Student> findBySchoolIdAndCurrentYearGroup(Long schoolId, YearGroup yg);

    List<Student> findBySchoolId(Long schoolId);

    Long countBySchoolIdAndCurrentYearGroup(Long schoolId, YearGroup yg);

    boolean existsByStudentIndex(String studentIndex);

    long countBySchoolIdAndIsActiveTrue(Long schoolId);

    Page<Student> findBySchoolId(Long schoolId, Pageable pageable);

    Page<Student> findBySchoolIdAndCurrentYearGroup(Long schoolId, YearGroup yearGroup, Pageable pageable);

    @Query("SELECT s FROM Student s WHERE s.school.id = :schoolId " +
            "AND (:yearGroup IS NULL OR s.currentYearGroup = :yearGroup) " +
            "AND (:programId IS NULL OR s.currentProgram.id = :programId) " +
            "AND (:classId IS NULL OR s.currentClass.id = :classId)")
    Page<Student> findByFilters(
            @Param("schoolId") Long schoolId,
            @Param("yearGroup") YearGroup yearGroup,
            @Param("programId") Long programId,
            @Param("classId") Long classId,
            Pageable pageable);

    @Query("""
            SELECT s FROM Student s
            JOIN FETCH s.user u
            LEFT JOIN FETCH s.currentClass c
            LEFT JOIN FETCH s.currentProgram p
            WHERE s.school.id = :schoolId
            AND s.isActive = true
            """)
    List<Student> findAllActiveWithDetails(@Param("schoolId") Long schoolId);

    @Query("""
            SELECT s FROM Student s
            JOIN FETCH s.user u
            LEFT JOIN FETCH s.currentClass c
            LEFT JOIN FETCH s.currentProgram p
            WHERE LOWER(s.guardianEmail) = LOWER(:guardianEmail)
            AND s.isActive = true
            """)
    List<Student> findActiveByGuardianEmail(@Param("guardianEmail") String guardianEmail);
}
