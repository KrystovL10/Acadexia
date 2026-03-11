package com.shs.academic.service;

import com.shs.academic.model.dto.ReportProgressDto;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ReportProgressService {

    private final ConcurrentHashMap<String, ReportProgressDto> progressMap =
            new ConcurrentHashMap<>();

    public String startProgress(Long classRoomId, Long termId, int total) {
        String key = "REPORT_" + classRoomId + "_" + termId;
        progressMap.put(key, ReportProgressDto.builder()
                .key(key)
                .status("STARTED")
                .total(total)
                .processed(0)
                .failed(0)
                .percentage(0.0)
                .startedAt(LocalDateTime.now())
                .message("Starting report generation...")
                .build());
        return key;
    }

    public void updateProgress(String key, int processed, int total, String message) {
        ReportProgressDto dto = progressMap.get(key);
        if (dto == null) return;
        dto.setStatus("IN_PROGRESS");
        dto.setProcessed(processed);
        dto.setTotal(total);
        dto.setPercentage(total > 0 ? Math.round((processed * 100.0 / total) * 10) / 10.0 : 0);
        dto.setMessage(message);
    }

    public void markComplete(String key, int total, int failed) {
        ReportProgressDto dto = progressMap.get(key);
        if (dto == null) return;
        dto.setStatus("COMPLETE");
        dto.setProcessed(total - failed);
        dto.setTotal(total);
        dto.setFailed(failed);
        dto.setPercentage(100.0);
        dto.setCompletedAt(LocalDateTime.now());
        dto.setMessage("Report generation complete. " + (total - failed) + " succeeded, "
                + failed + " failed.");
    }

    public void markFailed(String key, String errorMessage) {
        ReportProgressDto dto = progressMap.get(key);
        if (dto == null) return;
        dto.setStatus("FAILED");
        dto.setCompletedAt(LocalDateTime.now());
        dto.setErrorMessage(errorMessage);
        dto.setMessage("Report generation failed: " + errorMessage);
    }

    public ReportProgressDto getProgress(String key) {
        return progressMap.get(key);
    }

    public ReportProgressDto getProgress(Long classRoomId, Long termId) {
        return progressMap.get("REPORT_" + classRoomId + "_" + termId);
    }
}
