package com.shs.academic.repository;

import com.shs.academic.model.entity.Score;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScoreRepository extends JpaRepository<Score, Long> {

    List<Score> findByStudentIdAndTermId(Long studentId, Long termId);

    List<Score> findByStudentId(Long studentId);

    List<Score> findByClassRoomIdAndTermIdAndSubjectId(Long classId, Long termId, Long subjectId);

    List<Score> findByClassRoomIdAndTermId(Long classId, Long termId);

    Optional<Score> findByStudentIdAndSubjectIdAndTermId(Long studentId, Long subjectId, Long termId);

    List<Score> findByEnteredByIdAndTermId(Long tutorId, Long termId);

    @Query("SELECT AVG(s.totalScore) FROM Score s WHERE s.subject.id = :subjectId AND s.term.id = :termId AND s.isAbsent = false")
    Double findAverageTotalScoreBySubjectIdAndTermId(@Param("subjectId") Long subjectId, @Param("termId") Long termId);

    @Query("SELECT AVG(s.totalScore) FROM Score s WHERE s.classRoom.id = :classId AND s.term.id = :termId AND s.isAbsent = false")
    Double findAverageScoreByClassAndTerm(@Param("classId") Long classId, @Param("termId") Long termId);

    @Query("SELECT s.subject.name, AVG(s.totalScore), COUNT(s) FROM Score s " +
            "WHERE s.term.id = :termId AND s.isAbsent = false " +
            "GROUP BY s.subject.id, s.subject.name ORDER BY AVG(s.totalScore) ASC")
    List<Object[]> findSubjectAveragesByTerm(@Param("termId") Long termId);

    @Query("SELECT s.grade, COUNT(s) FROM Score s " +
            "WHERE s.term.id = :termId AND s.isAbsent = false AND s.grade IS NOT NULL " +
            "GROUP BY s.grade ORDER BY s.grade")
    List<Object[]> findGradeDistributionByTerm(@Param("termId") Long termId);

    @Query("SELECT s.subject.name, " +
            "SUM(CASE WHEN s.totalScore < 50 THEN 1 ELSE 0 END), " +
            "COUNT(s), " +
            "AVG(s.totalScore), " +
            "COUNT(DISTINCT s.classRoom.id) " +
            "FROM Score s WHERE s.term.id = :termId AND s.isAbsent = false " +
            "GROUP BY s.subject.id, s.subject.name " +
            "ORDER BY (SUM(CASE WHEN s.totalScore < 50 THEN 1.0 ELSE 0.0 END) / COUNT(s)) DESC")
    List<Object[]> findSubjectWeaknessByTerm(@Param("termId") Long termId);

    @Query("SELECT MAX(s.totalScore) FROM Score s WHERE s.subject.id = :subjectId AND s.term.id = :termId AND s.isAbsent = false")
    Double findMaxScoreBySubjectAndTerm(@Param("subjectId") Long subjectId, @Param("termId") Long termId);

    @Query("SELECT MIN(s.totalScore) FROM Score s WHERE s.subject.id = :subjectId AND s.term.id = :termId AND s.isAbsent = false")
    Double findMinScoreBySubjectAndTerm(@Param("subjectId") Long subjectId, @Param("termId") Long termId);

    @Query("SELECT s.subject.id, s.subject.name, AVG(s.totalScore), " +
            "SUM(CASE WHEN s.totalScore >= 50 THEN 1 ELSE 0 END), COUNT(s), " +
            "MAX(s.totalScore), MIN(s.totalScore) " +
            "FROM Score s WHERE s.term.id = :termId AND s.isAbsent = false " +
            "GROUP BY s.subject.id, s.subject.name ORDER BY AVG(s.totalScore) DESC")
    List<Object[]> findSubjectPerformanceSummaryByTerm(@Param("termId") Long termId);

    @Query("SELECT s FROM Score s " +
            "WHERE s.term.id = :termId AND s.isAbsent = false AND s.subject.id = :subjectId " +
            "ORDER BY s.totalScore DESC")
    List<Score> findTopScoresBySubjectAndTerm(
            @Param("subjectId") Long subjectId, @Param("termId") Long termId, Pageable pageable);

    @Query("SELECT DISTINCT s.subject.id FROM Score s " +
            "WHERE s.term.id = :termId AND s.classRoom.school.id = :schoolId AND s.isAbsent = false")
    List<Long> findDistinctSubjectIdsByTermAndSchool(
            @Param("termId") Long termId, @Param("schoolId") Long schoolId);

    @Query("""
            SELECT s FROM Score s
            WHERE s.classRoom.id = :classId
            AND s.subject.id = :subjectId
            AND s.term.id = :termId
            ORDER BY s.student.user.lastName ASC
            """)
    List<Score> findByClassSubjectAndTerm(
            @Param("classId") Long classId,
            @Param("subjectId") Long subjectId,
            @Param("termId") Long termId);

    @Query("""
            SELECT COUNT(s) FROM Score s
            WHERE s.classRoom.id = :classId
            AND s.subject.id = :subjectId
            AND s.term.id = :termId
            """)
    Long countSubmittedScores(
            @Param("classId") Long classId,
            @Param("subjectId") Long subjectId,
            @Param("termId") Long termId);

    @Query("""
            SELECT s FROM Score s
            JOIN FETCH s.student st
            JOIN FETCH st.user u
            JOIN FETCH s.subject sub
            WHERE s.classRoom.id = :classId
            AND s.term.id = :termId
            ORDER BY u.lastName ASC
            """)
    List<Score> findByClassAndTermWithDetails(@Param("classId") Long classId, @Param("termId") Long termId);
}
