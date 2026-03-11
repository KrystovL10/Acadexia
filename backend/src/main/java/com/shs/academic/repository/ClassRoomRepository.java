package com.shs.academic.repository;

import com.shs.academic.model.entity.ClassRoom;
import com.shs.academic.model.enums.YearGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassRoomRepository extends JpaRepository<ClassRoom, Long> {

    List<ClassRoom> findBySchoolIdAndAcademicYearId(Long schoolId, Long yearId);

    List<ClassRoom> findByYearGroupAndProgramId(YearGroup yg, Long programId);

    List<ClassRoom> findByClassTeacherId(Long teacherId);

    Optional<ClassRoom> findByClassCodeAndSchoolId(String code, Long schoolId);

    List<ClassRoom> findBySchoolIdAndYearGroup(Long schoolId, YearGroup yearGroup);

    long countBySchoolIdAndAcademicYearIdAndIsActiveTrue(Long schoolId, Long academicYearId);
}
