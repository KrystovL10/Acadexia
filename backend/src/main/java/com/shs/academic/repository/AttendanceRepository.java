package com.shs.academic.repository;

import com.shs.academic.model.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    List<Attendance> findByStudentIdAndTermId(Long studentId, Long termId);

    List<Attendance> findByClassRoomIdAndDate(Long classId, LocalDate date);

    Long countByStudentIdAndTermIdAndIsPresent(Long studentId, Long termId, boolean present);

    boolean existsByStudentIdAndDate(Long studentId, LocalDate date);

    Optional<Attendance> findByStudentIdAndDate(Long studentId, LocalDate date);

    // ─── Class-level queries ──────────────────────────────────────────

    List<Attendance> findByClassRoomIdAndTermId(Long classRoomId, Long termId);

    List<Attendance> findByClassRoomIdAndDateBetween(Long classRoomId, LocalDate startDate, LocalDate endDate);

    boolean existsByClassRoomIdAndDate(Long classRoomId, LocalDate date);

    Long countByClassRoomIdAndTermIdAndIsPresent(Long classRoomId, Long termId, boolean present);

    Long countByClassRoomIdAndTermId(Long classRoomId, Long termId);

    @Query("SELECT DISTINCT a.date FROM Attendance a " +
            "WHERE a.classRoom.id = :classRoomId AND a.date BETWEEN :startDate AND :endDate " +
            "ORDER BY a.date ASC")
    List<LocalDate> findDistinctDatesByClassRoomAndRange(
            @Param("classRoomId") Long classRoomId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT DISTINCT a.date FROM Attendance a " +
            "WHERE a.classRoom.id = :classRoomId AND a.term.id = :termId " +
            "ORDER BY a.date ASC")
    List<LocalDate> findDistinctDatesByClassRoomAndTerm(
            @Param("classRoomId") Long classRoomId,
            @Param("termId") Long termId);

    // ─── School-level queries ─────────────────────────────────────────

    @Query("SELECT a FROM Attendance a WHERE a.classRoom.school.id = :schoolId AND a.term.id = :termId")
    List<Attendance> findBySchoolIdAndTermId(
            @Param("schoolId") Long schoolId,
            @Param("termId") Long termId);

    @Query("SELECT COUNT(a) FROM Attendance a " +
            "WHERE a.classRoom.school.id = :schoolId AND a.term.id = :termId AND a.isPresent = :present")
    Long countBySchoolIdAndTermIdAndIsPresent(
            @Param("schoolId") Long schoolId,
            @Param("termId") Long termId,
            @Param("present") boolean present);

    @Query("SELECT COUNT(a) FROM Attendance a " +
            "WHERE a.classRoom.school.id = :schoolId AND a.term.id = :termId")
    Long countBySchoolIdAndTermId(
            @Param("schoolId") Long schoolId,
            @Param("termId") Long termId);

    @Query("SELECT a.classRoom.id, a.classRoom.displayName, " +
            "SUM(CASE WHEN a.isPresent = true THEN 1 ELSE 0 END), " +
            "SUM(CASE WHEN a.isPresent = false THEN 1 ELSE 0 END), COUNT(a) " +
            "FROM Attendance a " +
            "WHERE a.classRoom.school.id = :schoolId AND a.term.id = :termId " +
            "GROUP BY a.classRoom.id, a.classRoom.displayName")
    List<Object[]> findClassBreakdownBySchoolAndTerm(
            @Param("schoolId") Long schoolId,
            @Param("termId") Long termId);

    // ─── Student-level queries ────────────────────────────────────────

    @Query("SELECT COUNT(DISTINCT a.student.id) FROM Attendance a " +
            "WHERE a.classRoom.id = :classRoomId AND a.term.id = :termId " +
            "GROUP BY a.student.id " +
            "HAVING (SUM(CASE WHEN a.isPresent = true THEN 1.0 ELSE 0.0 END) / COUNT(a)) >= 1.0")
    List<Long> findStudentIdsWithPerfectAttendance(
            @Param("classRoomId") Long classRoomId,
            @Param("termId") Long termId);

    @Query("SELECT a.student.id, " +
            "SUM(CASE WHEN a.isPresent = true THEN 1 ELSE 0 END), " +
            "SUM(CASE WHEN a.isPresent = false THEN 1 ELSE 0 END), " +
            "SUM(CASE WHEN a.isLate = true THEN 1 ELSE 0 END), " +
            "COUNT(a) " +
            "FROM Attendance a " +
            "WHERE a.classRoom.id = :classRoomId AND a.term.id = :termId " +
            "GROUP BY a.student.id")
    List<Object[]> findStudentSummaryByClassAndTerm(
            @Param("classRoomId") Long classRoomId,
            @Param("termId") Long termId);
}
