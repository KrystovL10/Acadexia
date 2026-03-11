package com.shs.academic.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GradeCalculatorTest {

    // ==================== calculateGrade() ====================

    @Nested
    @DisplayName("calculateGrade()")
    class CalculateGrade {

        @Test
        void testGrade_A1_boundary() {
            assertEquals("A1", GradeCalculator.calculateGrade(80.0));
        }

        @Test
        void testGrade_A1_perfect() {
            assertEquals("A1", GradeCalculator.calculateGrade(100.0));
        }

        @Test
        void testGrade_A2_lower() {
            assertEquals("A2", GradeCalculator.calculateGrade(75.0));
        }

        @Test
        void testGrade_A2_upper() {
            assertEquals("A2", GradeCalculator.calculateGrade(79.9));
        }

        @Test
        void testGrade_B2() {
            assertEquals("B2", GradeCalculator.calculateGrade(70.0));
        }

        @Test
        void testGrade_B3() {
            assertEquals("B3", GradeCalculator.calculateGrade(65.0));
        }

        @Test
        void testGrade_C4() {
            assertEquals("C4", GradeCalculator.calculateGrade(60.0));
        }

        @Test
        void testGrade_C5() {
            assertEquals("C5", GradeCalculator.calculateGrade(55.0));
        }

        @Test
        void testGrade_C6_boundary() {
            assertEquals("C6", GradeCalculator.calculateGrade(50.0));
        }

        @Test
        void testGrade_D7() {
            assertEquals("D7", GradeCalculator.calculateGrade(45.0));
        }

        @Test
        void testGrade_E8() {
            assertEquals("E8", GradeCalculator.calculateGrade(40.0));
        }

        @Test
        void testGrade_F9_boundary() {
            assertEquals("F9", GradeCalculator.calculateGrade(39.9));
        }

        @Test
        void testGrade_F9_zero() {
            assertEquals("F9", GradeCalculator.calculateGrade(0.0));
        }
    }

    // ==================== calculateGradePoint() ====================

    @Nested
    @DisplayName("calculateGradePoint()")
    class CalculateGradePoint {

        @Test
        void testGradePoint_A1() {
            assertEquals(4.0, GradeCalculator.calculateGradePoint("A1"));
        }

        @Test
        void testGradePoint_A2() {
            assertEquals(3.6, GradeCalculator.calculateGradePoint("A2"));
        }

        @Test
        void testGradePoint_B2() {
            assertEquals(3.2, GradeCalculator.calculateGradePoint("B2"));
        }

        @Test
        void testGradePoint_B3() {
            assertEquals(2.8, GradeCalculator.calculateGradePoint("B3"));
        }

        @Test
        void testGradePoint_C4() {
            assertEquals(2.4, GradeCalculator.calculateGradePoint("C4"));
        }

        @Test
        void testGradePoint_C5() {
            assertEquals(2.0, GradeCalculator.calculateGradePoint("C5"));
        }

        @Test
        void testGradePoint_C6() {
            assertEquals(1.6, GradeCalculator.calculateGradePoint("C6"));
        }

        @Test
        void testGradePoint_D7() {
            assertEquals(1.2, GradeCalculator.calculateGradePoint("D7"));
        }

        @Test
        void testGradePoint_E8() {
            assertEquals(0.8, GradeCalculator.calculateGradePoint("E8"));
        }

        @Test
        void testGradePoint_F9() {
            assertEquals(0.0, GradeCalculator.calculateGradePoint("F9"));
        }

        @Test
        void testGradePoint_unknownGrade_returnsZero() {
            assertEquals(0.0, GradeCalculator.calculateGradePoint("XY"));
        }
    }

    // ==================== isPassing() ====================

    @Nested
    @DisplayName("isPassing()")
    class IsPassing {

        @Test
        void testIsPassing_C6() {
            assertTrue(GradeCalculator.isPassing("C6"));
        }

        @Test
        void testIsPassing_C4() {
            assertTrue(GradeCalculator.isPassing("C4"));
        }

        @Test
        void testIsPassing_A1() {
            assertTrue(GradeCalculator.isPassing("A1"));
        }

        @Test
        void testIsFailing_D7() {
            assertFalse(GradeCalculator.isPassing("D7"));
        }

        @Test
        void testIsFailing_F9() {
            assertFalse(GradeCalculator.isPassing("F9"));
        }

        @Test
        void testIsFailing_E8() {
            assertFalse(GradeCalculator.isPassing("E8"));
        }
    }

    // ==================== getRemarks() ====================

    @Nested
    @DisplayName("getRemarks()")
    class GetRemarks {

        @Test
        void testRemarks_Excellent_A1() {
            assertEquals("Excellent", GradeCalculator.getRemarks("A1"));
        }

        @Test
        void testRemarks_Excellent_A2() {
            assertEquals("Excellent", GradeCalculator.getRemarks("A2"));
        }

        @Test
        void testRemarks_VeryGood_B2() {
            assertEquals("Very Good", GradeCalculator.getRemarks("B2"));
        }

        @Test
        void testRemarks_VeryGood_B3() {
            assertEquals("Very Good", GradeCalculator.getRemarks("B3"));
        }

        @Test
        void testRemarks_Good_C4() {
            assertEquals("Good", GradeCalculator.getRemarks("C4"));
        }

        @Test
        void testRemarks_Good_C5() {
            assertEquals("Good", GradeCalculator.getRemarks("C5"));
        }

        @Test
        void testRemarks_Good_C6() {
            assertEquals("Good", GradeCalculator.getRemarks("C6"));
        }

        @Test
        void testRemarks_Pass_D7() {
            assertEquals("Pass", GradeCalculator.getRemarks("D7"));
        }

        @Test
        void testRemarks_Fail_E8() {
            assertEquals("Fail", GradeCalculator.getRemarks("E8"));
        }

        @Test
        void testRemarks_Fail_F9() {
            assertEquals("Fail", GradeCalculator.getRemarks("F9"));
        }

        @Test
        void testRemarks_Unknown() {
            assertEquals("Unknown", GradeCalculator.getRemarks("Z1"));
        }
    }

    // ==================== Boundary edge cases ====================

    @Nested
    @DisplayName("Boundary edge cases")
    class BoundaryEdgeCases {

        @Test
        void testScore_exactly_50_is_C6_not_D7() {
            assertEquals("C6", GradeCalculator.calculateGrade(50.0));
            assertNotEquals("D7", GradeCalculator.calculateGrade(50.0));
        }

        @Test
        void testScore_exactly_80_is_A1_not_A2() {
            assertEquals("A1", GradeCalculator.calculateGrade(80.0));
            assertNotEquals("A2", GradeCalculator.calculateGrade(80.0));
        }

        @Test
        void testScore_exactly_75_is_A2_not_B2() {
            assertEquals("A2", GradeCalculator.calculateGrade(75.0));
            assertNotEquals("B2", GradeCalculator.calculateGrade(75.0));
        }

        @Test
        void testScore_exactly_40_is_E8_not_F9() {
            assertEquals("E8", GradeCalculator.calculateGrade(40.0));
        }

        @Test
        void testScore_exactly_45_is_D7_not_E8() {
            assertEquals("D7", GradeCalculator.calculateGrade(45.0));
        }

        @Test
        void testScore_justBelow_50_is_D7() {
            assertEquals("D7", GradeCalculator.calculateGrade(49.9));
        }

        @Test
        void testGrade_gradePoint_roundTrip() {
            // Score → Grade → GradePoint → isPassing consistency
            String grade = GradeCalculator.calculateGrade(72.0);
            assertEquals("B2", grade);
            assertEquals(3.2, GradeCalculator.calculateGradePoint(grade));
            assertTrue(GradeCalculator.isPassing(grade));
            assertEquals("Very Good", GradeCalculator.getRemarks(grade));
        }
    }
}
