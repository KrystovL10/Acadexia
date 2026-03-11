package com.shs.academic.repository;

import com.shs.academic.model.entity.StudentEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentEnrollmentRepository extends JpaRepository<StudentEnrollment, Long> {

    Optional<StudentEnrollment> findByStudentIdAndAcademicYearId(Long studentId, Long yearId);

    List<StudentEnrollment> findByStudentIdOrderByAcademicYearYearLabelAsc(Long studentId);

    List<StudentEnrollment> findByClassRoomId(Long classRoomId);

    @Query("SELECT se.academicYear.yearLabel, se.classRoom.program.displayName, COUNT(se) " +
            "FROM StudentEnrollment se WHERE se.classRoom.school.id = :schoolId " +
            "GROUP BY se.academicYear.yearLabel, se.classRoom.program.displayName " +
            "ORDER BY se.academicYear.yearLabel")
    List<Object[]> findEnrollmentTrendsBySchool(@Param("schoolId") Long schoolId);
}
