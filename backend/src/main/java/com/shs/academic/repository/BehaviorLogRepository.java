package com.shs.academic.repository;

import com.shs.academic.model.entity.BehaviorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BehaviorLogRepository extends JpaRepository<BehaviorLog, Long> {

    // ─── Legacy (all records incl. soft-deleted) ──────────────────────────────
    List<BehaviorLog> findByStudentIdAndTermId(Long studentId, Long termId);

    List<BehaviorLog> findByStudentId(Long studentId);

    List<BehaviorLog> findByClassRoomIdAndTermId(Long classId, Long termId);

    Long countByStudentIdAndTermIdAndSeverity(Long studentId, Long termId, String severity);

    // ─── Active-only (isDeleted = false) ─────────────────────────────────────
    List<BehaviorLog> findByStudentIdAndTermIdAndIsDeletedFalse(Long studentId, Long termId);

    List<BehaviorLog> findByStudentIdAndIsDeletedFalse(Long studentId);

    List<BehaviorLog> findByClassRoomIdAndTermIdAndIsDeletedFalse(Long classId, Long termId);

    List<BehaviorLog> findByClassRoomIdAndTermIdAndLogTypeAndIsDeletedFalse(
            Long classId, Long termId, String logType);

    List<BehaviorLog> findByClassRoomIdAndTermIdAndSeverityAndIsDeletedFalse(
            Long classId, Long termId, String severity);

    List<BehaviorLog> findByClassRoomIdAndTermIdAndLogTypeAndSeverityAndIsDeletedFalse(
            Long classId, Long termId, String logType, String severity);

    Long countByStudentIdAndTermIdAndSeverityAndIsDeletedFalse(
            Long studentId, Long termId, String severity);

    Long countByStudentIdAndTermIdAndLogTypeAndIsDeletedFalse(
            Long studentId, Long termId, String logType);
}
