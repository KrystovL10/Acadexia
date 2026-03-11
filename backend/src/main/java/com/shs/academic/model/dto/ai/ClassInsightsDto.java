package com.shs.academic.model.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassInsightsDto {

    private String summary;
    private List<InsightDto> insights;
    private StudentHighlightsDto studentHighlights;
    private List<SubjectRecommendationDto> subjectRecommendations;
    private LocalDateTime generatedAt;
    private Long classRoomId;
    private Long termId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentHighlightsDto {
        private String mostImproved;
        private String needsSupport;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectRecommendationDto {
        private String subjectName;
        private String recommendation;
    }
}
