package com.shs.academic.util;

import com.shs.academic.model.entity.Score;
import com.shs.academic.model.entity.TermResult;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.repository.TermResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class GpaCalculator {

    private final TermResultRepository termResultRepository;

    // ==================== STATIC UTILITY METHODS ====================

    /**
     * Calculate GPA from a list of scores.
     * Filters out absent scores, sums grade points, divides by subject count.
     * Returns GPA on 4.0 scale, rounded to 2 decimal places.
     */
    public static double calculateGpa(List<Score> scores) {
        List<Score> validScores = scores.stream()
                .filter(s -> !s.isAbsent() && s.getGradePoint() != null)
                .toList();

        if (validScores.isEmpty()) {
            return 0.0;
        }

        double totalGradePoints = validScores.stream()
                .mapToDouble(Score::getGradePoint)
                .sum();

        return round(totalGradePoints / validScores.size());
    }

    /**
     * Calculate cumulative GPA from a list of term results.
     * Sums all term GPAs and divides by the number of terms.
     * Rounded to 2 decimal places.
     */
    public static double calculateCgpa(List<TermResult> termResults) {
        List<TermResult> validResults = termResults.stream()
                .filter(tr -> tr.getGpa() != null)
                .toList();

        if (validResults.isEmpty()) {
            return 0.0;
        }

        double totalGpa = validResults.stream()
                .mapToDouble(TermResult::getGpa)
                .sum();

        return round(totalGpa / validResults.size());
    }

    /**
     * Get academic classification based on CGPA.
     * Ghana SHS classification scale.
     */
    public static String getClassification(double cgpa) {
        if (cgpa >= 3.60) return "Distinction";
        if (cgpa >= 3.00) return "Very Good";
        if (cgpa >= 2.50) return "Good";
        if (cgpa >= 2.00) return "Credit";
        if (cgpa >= 1.60) return "Pass";
        return "Fail";
    }

    /**
     * Calculate position given a GPA and a list of all GPAs.
     * Position = (number of GPAs strictly greater than this one) + 1
     */
    public static int calculatePosition(double gpa, List<Double> allGpas) {
        long countGreater = allGpas.stream()
                .filter(g -> g > gpa)
                .count();
        return (int) countGreater + 1;
    }

    /**
     * Round to 2 decimal places.
     */
    public static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    // ==================== INSTANCE METHOD: POSITION RANKING ====================

    /**
     * Calculates and saves position rankings for all students in a given term.
     * Called when admin triggers "Finalize Term".
     *
     * - Ranks all students by GPA within their class → positionInClass
     * - Ranks all students by GPA within their year group → positionInYearGroup
     * - Saves all updated TermResults
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "powerRanking", allEntries = true),
            @CacheEvict(value = "dashboardStats", allEntries = true),
            @CacheEvict(value = "classPerformance", allEntries = true)
    })
    public void calculateAndSavePositions(Long termId, Long schoolId) {
        List<TermResult> allResults = termResultRepository.findAllResultsBySchoolAndTermOrderByGpaDesc(
                schoolId, termId);

        if (allResults.isEmpty()) {
            log.warn("No term results found for school {} and term {}", schoolId, termId);
            return;
        }

        // Rank within each class
        Map<Long, List<TermResult>> byClass = allResults.stream()
                .collect(Collectors.groupingBy(tr -> tr.getClassRoom().getId()));

        for (Map.Entry<Long, List<TermResult>> entry : byClass.entrySet()) {
            List<TermResult> classResults = entry.getValue();
            classResults.sort(Comparator.comparingDouble(
                    (TermResult tr) -> tr.getGpa() != null ? tr.getGpa() : 0.0).reversed());

            int totalInClass = classResults.size();
            for (int i = 0; i < classResults.size(); i++) {
                TermResult tr = classResults.get(i);
                tr.setPositionInClass(i + 1);
                tr.setTotalStudentsInClass(totalInClass);
            }
        }

        // Rank within each year group
        Map<YearGroup, List<TermResult>> byYearGroup = allResults.stream()
                .collect(Collectors.groupingBy(TermResult::getYearGroup));

        for (Map.Entry<YearGroup, List<TermResult>> entry : byYearGroup.entrySet()) {
            List<TermResult> ygResults = entry.getValue();
            ygResults.sort(Comparator.comparingDouble(
                    (TermResult tr) -> tr.getGpa() != null ? tr.getGpa() : 0.0).reversed());

            for (int i = 0; i < ygResults.size(); i++) {
                ygResults.get(i).setPositionInYearGroup(i + 1);
            }
        }

        // Save all updated results
        termResultRepository.saveAll(allResults);

        log.info("Calculated positions for {} students in term {} for school {}",
                allResults.size(), termId, schoolId);
    }
}
