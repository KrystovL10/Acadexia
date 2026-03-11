package com.shs.academic.service;

import com.shs.academic.model.entity.AuditLog;
import com.shs.academic.repository.AuditLogRepository;
import com.shs.academic.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional
    public void logAction(String action, Long userId, String entityType, Long entityId, String details) {
        try {
            String userRole = null;
            try {
                userRole = SecurityUtil.getCurrentUserRole() != null
                    ? SecurityUtil.getCurrentUserRole().name()
                    : null;
            } catch (Exception ignored) {
                // May not have security context (e.g., system-triggered actions)
            }

            AuditLog auditLog = AuditLog.builder()
                .action(action)
                .userId(userId)
                .userRole(userRole)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .build();

            auditLogRepository.save(auditLog);
            log.debug("Audit log: {} by user {} on {}:{}", action, userId, entityType, entityId);
        } catch (Exception e) {
            log.error("Failed to write audit log: {}", e.getMessage());
        }
    }

    @Async
    @Transactional
    public void logAction(String action, Long userId, String entityType, Long entityId, String details, String ipAddress) {
        try {
            String userRole = null;
            try {
                userRole = SecurityUtil.getCurrentUserRole() != null
                    ? SecurityUtil.getCurrentUserRole().name()
                    : null;
            } catch (Exception ignored) {}

            AuditLog auditLog = AuditLog.builder()
                .action(action)
                .userId(userId)
                .userRole(userRole)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .ipAddress(ipAddress)
                .build();

            auditLogRepository.save(auditLog);
            log.debug("Audit log: {} by user {} from IP {}", action, userId, ipAddress);
        } catch (Exception e) {
            log.error("Failed to write audit log: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByTimestampDesc(pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByUser(Long userId, Pageable pageable) {
        return auditLogRepository.findByUserIdOrderByTimestampDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByAction(String action, Pageable pageable) {
        return auditLogRepository.findByActionOrderByTimestampDesc(action, pageable);
    }
}
