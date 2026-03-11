package com.shs.academic.util;

import java.util.Map;

public final class GradeCalculator {

    private GradeCalculator() {}

    private static final Map<String, Double> GRADE_POINTS = Map.of(
            "A1", 4.0, "A2", 3.6, "B2", 3.2, "B3", 2.8, "C4", 2.4,
            "C5", 2.0, "C6", 1.6, "D7", 1.2, "E8", 0.8, "F9", 0.0
    );

    public static String calculateGrade(double totalScore) {
        if (totalScore >= 80) return "A1";
        if (totalScore >= 75) return "A2";
        if (totalScore >= 70) return "B2";
        if (totalScore >= 65) return "B3";
        if (totalScore >= 60) return "C4";
        if (totalScore >= 55) return "C5";
        if (totalScore >= 50) return "C6";
        if (totalScore >= 45) return "D7";
        if (totalScore >= 40) return "E8";
        return "F9";
    }

    public static double calculateGradePoint(String grade) {
        return GRADE_POINTS.getOrDefault(grade, 0.0);
    }

    public static boolean isPassing(String grade) {
        double point = calculateGradePoint(grade);
        return point >= 1.6; // C6 and above
    }

    public static String getRemarks(String grade) {
        return switch (grade) {
            case "A1", "A2" -> "Excellent";
            case "B2", "B3" -> "Very Good";
            case "C4", "C5", "C6" -> "Good";
            case "D7" -> "Pass";
            case "E8", "F9" -> "Fail";
            default -> "Unknown";
        };
    }
}
