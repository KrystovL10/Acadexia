package com.shs.academic.repository;

import com.shs.academic.model.entity.Teacher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Long> {

    Optional<Teacher> findByUserId(Long userId);

    Optional<Teacher> findByStaffId(String staffId);

    List<Teacher> findBySchoolId(Long schoolId);

    Page<Teacher> findBySchoolId(Long schoolId, Pageable pageable);

    List<Teacher> findBySchoolIdAndIsClassTeacher(Long schoolId, boolean isClassTeacher);

    Optional<Teacher> findByAssignedClassId(Long classId);

    boolean existsByStaffId(String staffId);

    long countBySchoolIdAndIsActiveTrue(Long schoolId);

    long countBySchoolIdAndStaffIdStartingWith(Long schoolId, String prefix);
}
