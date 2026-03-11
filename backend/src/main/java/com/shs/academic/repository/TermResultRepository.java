package com.shs.academic.repository;

import com.shs.academic.model.entity.TermResult;
import com.shs.academic.model.enums.YearGroup;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TermResultRepository extends JpaRepository<TermResult, Long> {

    Optional<TermResult> findByStudentIdAndTermId(Long studentId, Long termId);

    List<TermResult> findByClassRoomIdAndTermId(Long classId, Long termId);

    List<TermResult> findByStudentIdOrderByTermAcademicYearYearLabelAsc(Long studentId);

    List<TermResult> findByTermIdOrderByGpaDesc(Long termId);

    @Query("SELECT AVG(tr.gpa) FROM TermResult tr WHERE tr.classRoom.id = :classId AND tr.term.id = :termId")
    Double findAverageGpaByClassRoomIdAndTermId(@Param("classId") Long classId, @Param("termId") Long termId);

    @Query("SELECT AVG(tr.gpa) FROM TermResult tr WHERE tr.classRoom.school.id = :schoolId AND tr.term.id = :termId")
    Double findSchoolAverageGpaByTerm(@Param("schoolId") Long schoolId, @Param("termId") Long termId);

    @Query("SELECT tr.yearGroup, AVG(tr.gpa), COUNT(tr), " +
            "SUM(CASE WHEN tr.gpa >= 1.6 THEN 1 ELSE 0 END) " +
            "FROM TermResult tr WHERE tr.classRoom.school.id = :schoolId AND tr.term.id = :termId " +
            "GROUP BY tr.yearGroup")
    List<Object[]> findAverageGpaByYearGroup(@Param("schoolId") Long schoolId, @Param("termId") Long termId);

    @Query("SELECT COUNT(tr) FROM TermResult tr WHERE tr.classRoom.school.id = :schoolId AND tr.term.id = :termId AND tr.gpa >= 1.6")
    Long countPassingStudents(@Param("schoolId") Long schoolId, @Param("termId") Long termId);

    @Query("SELECT COUNT(tr) FROM TermResult tr WHERE tr.classRoom.school.id = :schoolId AND tr.term.id = :termId")
    Long countTotalResultsBySchoolAndTerm(@Param("schoolId") Long schoolId, @Param("termId") Long termId);

    @Query("SELECT tr.classRoom.id, tr.classRoom.displayName, AVG(tr.gpa), COUNT(tr), " +
            "SUM(CASE WHEN tr.gpa >= 1.6 THEN 1 ELSE 0 END) " +
            "FROM TermResult tr WHERE tr.classRoom.school.id = :schoolId AND tr.term.id = :termId " +
            "GROUP BY tr.classRoom.id, tr.classRoom.displayName ORDER BY AVG(tr.gpa) DESC")
    List<Object[]> findClassPerformanceBySchoolAndTerm(@Param("schoolId") Long schoolId, @Param("termId") Long termId);

    @Query("SELECT tr.term.termType, tr.term.academicYear.yearLabel, tr.yearGroup, AVG(tr.gpa) " +
            "FROM TermResult tr WHERE tr.classRoom.school.id = :schoolId " +
            "GROUP BY tr.term.id, tr.term.termType, tr.term.academicYear.yearLabel, tr.yearGroup " +
            "ORDER BY tr.term.academicYear.yearLabel, tr.term.termType, tr.yearGroup")
    List<Object[]> findTermComparisonData(@Param("schoolId") Long schoolId);

    @Query("SELECT tr FROM TermResult tr " +
            "WHERE tr.classRoom.school.id = :schoolId AND tr.term.id = :termId " +
            "ORDER BY tr.gpa DESC")
    List<TermResult> findRankedResultsBySchoolAndTerm(
            @Param("schoolId") Long schoolId, @Param("termId") Long termId, Pageable pageable);

    @Query("SELECT tr FROM TermResult tr " +
            "WHERE tr.classRoom.id = :classId AND tr.term.id = :termId " +
            "ORDER BY tr.gpa DESC")
    List<TermResult> findRankedResultsByClass(
            @Param("classId") Long classId, @Param("termId") Long termId, Pageable pageable);

    @Query("SELECT tr FROM TermResult tr " +
            "WHERE tr.classRoom.school.id = :schoolId AND tr.term.id = :termId " +
            "AND tr.yearGroup = :yearGroup ORDER BY tr.gpa DESC")
    List<TermResult> findRankedResultsByYearGroup(
            @Param("schoolId") Long schoolId, @Param("termId") Long termId,
            @Param("yearGroup") YearGroup yearGroup, Pageable pageable);

    @Query("SELECT tr FROM TermResult tr " +
            "WHERE tr.classRoom.school.id = :schoolId AND tr.term.id = :termId " +
            "ORDER BY tr.gpa DESC")
    List<TermResult> findAllResultsBySchoolAndTermOrderByGpaDesc(
            @Param("schoolId") Long schoolId, @Param("termId") Long termId);

    List<TermResult> findByYearGroupAndTermIdOrderByGpaDesc(YearGroup yearGroup, Long termId);

    @Query("""
            SELECT tr FROM TermResult tr
            JOIN FETCH tr.student s
            JOIN FETCH s.user u
            WHERE tr.classRoom.id = :classId
            AND tr.term.id = :termId
            ORDER BY tr.gpa DESC
            """)
    List<TermResult> findByClassAndTermWithStudents(@Param("classId") Long classId, @Param("termId") Long termId);
}
