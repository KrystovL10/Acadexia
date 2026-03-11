package com.shs.academic.util;

import com.shs.academic.model.entity.Score;
import com.shs.academic.model.entity.TermResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GpaCalculatorTest {

    // ── Helper to build a mock Score with given gradePoint ──
    private Score scoreWith(double gradePoint, boolean absent) {
        return Score.builder()
                .gradePoint(gradePoint)
                .isAbsent(absent)
                .grade(absent ? null : "A1") // grade not null for non-absent
                .build();
    }

    private Score scoreWith(double gradePoint) {
        return scoreWith(gradePoint, false);
    }

    private TermResult termResultWith(double gpa) {
        return TermResult.builder()
                .gpa(gpa)
                .isGenerated(true)
                .build();
    }

    // ==================== calculateGpa() ====================

    @Nested
    @DisplayName("calculateGpa()")
    class CalculateGpaTests {

        @Test
        void testGpa_allA1() {
            List<Score> scores = List.of(
                    scoreWith(4.0), scoreWith(4.0), scoreWith(4.0),
                    scoreWith(4.0), scoreWith(4.0)
            );
            assertEquals(4.0, GpaCalculator.calculateGpa(scores));
        }

        @Test
        void testGpa_mixed() {
            // A1(4.0) + B2(3.2) + C4(2.4) + D7(1.2) + F9(0.0) = 10.8 / 5 = 2.16
            List<Score> scores = List.of(
                    scoreWith(4.0), scoreWith(3.2), scoreWith(2.4),
                    scoreWith(1.2), scoreWith(0.0)
            );
            assertEquals(2.16, GpaCalculator.calculateGpa(scores));
        }

        @Test
        void testGpa_singleSubject() {
            List<Score> scores = List.of(scoreWith(2.8));
            assertEquals(2.8, GpaCalculator.calculateGpa(scores));
        }

        @Test
        void testGpa_excludesAbsent() {
            // 3 valid subjects + 1 absent → GPA only from 3
            List<Score> scores = List.of(
                    scoreWith(4.0), scoreWith(3.2), scoreWith(2.4),
                    scoreWith(0.0, true) // absent — excluded
            );
            // (4.0 + 3.2 + 2.4) / 3 = 3.2
            assertEquals(3.2, GpaCalculator.calculateGpa(scores));
        }

        @Test
        void testGpa_allAbsent_returnsZero() {
            List<Score> scores = List.of(
                    scoreWith(0.0, true), scoreWith(0.0, true)
            );
            assertEquals(0.0, GpaCalculator.calculateGpa(scores));
        }

        @Test
        void testGpa_emptyList_returnsZero() {
            assertEquals(0.0, GpaCalculator.calculateGpa(List.of()));
        }

        @Test
        void testGpa_roundsToTwoDecimals() {
            // (4.0 + 3.2 + 2.8) / 3 = 3.333... → 3.33
            List<Score> scores = List.of(
                    scoreWith(4.0), scoreWith(3.2), scoreWith(2.8)
            );
            assertEquals(3.33, GpaCalculator.calculateGpa(scores));
        }
    }

    // ==================== calculateCgpa() ====================

    @Nested
    @DisplayName("calculateCgpa()")
    class CalculateCgpaTests {

        @Test
        void testCgpa_threeTerms() {
            List<TermResult> terms = List.of(
                    termResultWith(2.5), termResultWith(3.0), termResultWith(3.5)
            );
            assertEquals(3.0, GpaCalculator.calculateCgpa(terms));
        }

        @Test
        void testCgpa_singleTerm() {
            List<TermResult> terms = List.of(termResultWith(2.84));
            assertEquals(2.84, GpaCalculator.calculateCgpa(terms));
        }

        @Test
        void testCgpa_roundingCorrect() {
            // (3.33 + 2.67) / 2 = 3.0
            List<TermResult> terms = List.of(
                    termResultWith(3.33), termResultWith(2.67)
            );
            assertEquals(3.0, GpaCalculator.calculateCgpa(terms));
        }

        @Test
        void testCgpa_emptyList_returnsZero() {
            assertEquals(0.0, GpaCalculator.calculateCgpa(List.of()));
        }

        @Test
        void testCgpa_filtersNullGpa() {
            TermResult noGpa = TermResult.builder().gpa(null).build();
            List<TermResult> terms = List.of(
                    termResultWith(3.0), noGpa, termResultWith(3.5)
            );
            // Only 2 valid: (3.0 + 3.5) / 2 = 3.25
            assertEquals(3.25, GpaCalculator.calculateCgpa(terms));
        }
    }

    // ==================== getClassification() ====================

    @Nested
    @DisplayName("getClassification()")
    class GetClassificationTests {

        @Test
        void testClassification_Distinction() {
            assertEquals("Distinction", GpaCalculator.getClassification(3.6));
        }

        @Test
        void testClassification_Distinction_max() {
            assertEquals("Distinction", GpaCalculator.getClassification(4.0));
        }

        @Test
        void testClassification_VeryGood() {
            assertEquals("Very Good", GpaCalculator.getClassification(3.0));
        }

        @Test
        void testClassification_VeryGood_upper() {
            assertEquals("Very Good", GpaCalculator.getClassification(3.59));
        }

        @Test
        void testClassification_Good() {
            assertEquals("Good", GpaCalculator.getClassification(2.5));
        }

        @Test
        void testClassification_Credit() {
            assertEquals("Credit", GpaCalculator.getClassification(2.0));
        }

        @Test
        void testClassification_Pass() {
            assertEquals("Pass", GpaCalculator.getClassification(1.6));
        }

        @Test
        void testClassification_Fail() {
            assertEquals("Fail", GpaCalculator.getClassification(1.59));
        }

        @Test
        void testClassification_Fail_zero() {
            assertEquals("Fail", GpaCalculator.getClassification(0.0));
        }
    }

    // ==================== calculatePosition() ====================

    @Nested
    @DisplayName("calculatePosition()")
    class CalculatePositionTests {

        @Test
        void testPosition_first() {
            int pos = GpaCalculator.calculatePosition(4.0, List.of(3.5, 3.0, 4.0, 2.5));
            assertEquals(1, pos);
        }

        @Test
        void testPosition_last() {
            int pos = GpaCalculator.calculatePosition(2.0, List.of(4.0, 3.5, 3.0, 2.5, 2.0));
            assertEquals(5, pos);
        }

        @Test
        void testPosition_tied() {
            // Both 3.0 students get position 2 (only 4.0 is greater)
            int pos = GpaCalculator.calculatePosition(3.0, List.of(4.0, 3.0, 3.0, 2.0));
            assertEquals(2, pos);
        }

        @Test
        void testPosition_singleStudent() {
            int pos = GpaCalculator.calculatePosition(3.5, List.of(3.5));
            assertEquals(1, pos);
        }

        @Test
        void testPosition_allTied() {
            int pos = GpaCalculator.calculatePosition(3.0, List.of(3.0, 3.0, 3.0));
            assertEquals(1, pos);
        }

        @Test
        void testPosition_middle() {
            int pos = GpaCalculator.calculatePosition(3.0, List.of(4.0, 3.5, 3.0, 2.5, 2.0));
            assertEquals(3, pos);
        }
    }

    // ==================== round() ====================

    @Nested
    @DisplayName("round()")
    class RoundTests {

        @Test
        void testRound_twoDecimals() {
            assertEquals(3.33, GpaCalculator.round(3.3333));
        }

        @Test
        void testRound_noChange() {
            assertEquals(2.5, GpaCalculator.round(2.5));
        }

        @Test
        void testRound_roundsUp() {
            assertEquals(2.57, GpaCalculator.round(2.565));
        }

        @Test
        void testRound_zero() {
            assertEquals(0.0, GpaCalculator.round(0.0));
        }
    }
}
