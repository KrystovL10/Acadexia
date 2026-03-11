package com.shs.academic.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassBehaviorReportDto {

    private Long classRoomId;
    private String className;
    private Long termId;
    private String termLabel;

    private Summary summary;
    private List<StudentConductEntry> leaderboard;   // top 5 by conductScore
    private List<StudentConductEntry> concerns;       // conductScore < 50
    private List<BehaviorLogDto> recentLogs;          // last 10 across class

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private int totalAchievements;
        private int totalDisciplineIssues;
        private int totalNotes;
        private double avgConductScore;
        private int studentsWithConcerns;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentConductEntry {
        private Long studentId;
        private String studentIndex;
        private String studentName;
        private int conductScore;
        private String conductGrade;
        private int achievementCount;
        private int disciplineCount;
    }
}
