package com.shs.academic.model.enums;

import lombok.Getter;

@Getter
public enum GradeValue {
    A1("A1", 4.0),
    A2("A2", 3.6),
    B2("B2", 3.2),
    B3("B3", 2.8),
    C4("C4", 2.4),
    C5("C5", 2.0),
    C6("C6", 1.6),
    D7("D7", 1.2),
    E8("E8", 0.8),
    F9("F9", 0.0);

    private final String grade;
    private final double gradePoint;

    GradeValue(String grade, double gradePoint) {
        this.grade = grade;
        this.gradePoint = gradePoint;
    }

    public static GradeValue fromGrade(String grade) {
        for (GradeValue gv : values()) {
            if (gv.grade.equalsIgnoreCase(grade)) {
                return gv;
            }
        }
        throw new IllegalArgumentException("Unknown grade: " + grade);
    }
}
