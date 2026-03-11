package com.shs.academic.repository;

import com.shs.academic.model.entity.EarlyWarning;
import com.shs.academic.model.enums.WarningLevel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EarlyWarningRepository extends JpaRepository<EarlyWarning, Long> {

    List<EarlyWarning> findByStudentIdAndIsResolved(Long studentId, boolean resolved);

    List<EarlyWarning> findByTermIdAndIsResolved(Long termId, boolean resolved);

    List<EarlyWarning> findByTermIdAndWarningLevel(Long termId, WarningLevel level);

    Long countByTermIdAndIsResolved(Long termId, boolean resolved);

    List<EarlyWarning> findByStudentIdOrderByGeneratedAtDesc(Long studentId);

    Page<EarlyWarning> findByTermId(Long termId, Pageable pageable);

    Page<EarlyWarning> findByTermIdAndWarningLevel(Long termId, WarningLevel level, Pageable pageable);

    Long countByTermId(Long termId);

    Long countByTermIdAndWarningLevel(Long termId, WarningLevel level);

    Optional<EarlyWarning> findByStudentIdAndTermIdAndWarningTypeAndIsResolvedFalse(
            Long studentId, Long termId, String warningType);

    List<EarlyWarning> findByTermIdAndWarningLevelOrderByGeneratedAtDesc(
            Long termId, WarningLevel level, Pageable pageable);

    List<EarlyWarning> findByTermIdOrderByGeneratedAtDesc(Long termId, Pageable pageable);

    @Query("SELECT COUNT(ew) FROM EarlyWarning ew " +
            "WHERE ew.student.school.id = :schoolId AND ew.term.id = :termId AND ew.isResolved = false")
    Long countUnresolvedBySchoolAndTerm(@Param("schoolId") Long schoolId, @Param("termId") Long termId);

    @Query("SELECT COUNT(ew) FROM EarlyWarning ew " +
            "WHERE ew.student.currentClass.id = :classRoomId AND ew.term.id = :termId " +
            "AND ew.isResolved = false")
    Long countUnresolvedByClassAndTerm(
            @Param("classRoomId") Long classRoomId,
            @Param("termId") Long termId);

    List<EarlyWarning> findByStudentIdAndTermIdAndIsResolvedFalse(Long studentId, Long termId);

    @Query("SELECT ew.warningType, COUNT(ew) FROM EarlyWarning ew " +
            "WHERE ew.term.id = :termId AND ew.isResolved = false " +
            "GROUP BY ew.warningType")
    List<Object[]> countUnresolvedByWarningType(@Param("termId") Long termId);

    @Query("SELECT ew.warningType, COUNT(ew) FROM EarlyWarning ew " +
            "WHERE ew.student.currentClass.id = :classRoomId AND ew.term.id = :termId " +
            "AND ew.isResolved = false GROUP BY ew.warningType")
    List<Object[]> countUnresolvedByWarningTypeForClass(
            @Param("classRoomId") Long classRoomId, @Param("termId") Long termId);
}
