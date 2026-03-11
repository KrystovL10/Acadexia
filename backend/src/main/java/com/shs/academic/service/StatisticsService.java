package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.stats.*;
import com.shs.academic.model.entity.AcademicYear;
import com.shs.academic.model.entity.Term;
import com.shs.academic.model.enums.TermType;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final ClassRoomRepository classRoomRepository;
    private final AcademicYearRepository academicYearRepository;
    private final TermRepository termRepository;
    private final ScoreRepository scoreRepository;
    private final TermResultRepository termResultRepository;
    private final CumulativeGPARepository cumulativeGPARepository;
    private final EarlyWarningRepository earlyWarningRepository;
    private final StudentEnrollmentRepository studentEnrollmentRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "dashboardStats", key = "#schoolId + '-' + #termId")
    public AdminDashboardStatsDto getAdminDashboardStats(Long schoolId, Long termId) {
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        AcademicYear academicYear = term.getAcademicYear();

        // Basic counts
        long totalStudents = studentRepository.countBySchoolIdAndIsActiveTrue(schoolId);
        long totalTeachers = teacherRepository.countBySchoolIdAndIsActiveTrue(schoolId);
        long totalClasses = classRoomRepository.countBySchoolIdAndAcademicYearIdAndIsActiveTrue(
                schoolId, academicYear.getId());

        String currentTermName = term.getTermType().name().replace("_", " ")
                + " \u2014 " + academicYear.getYearLabel();

        // GPA stats
        Double averageSchoolGpa = termResultRepository.findSchoolAverageGpaByTerm(schoolId, termId);
        Long passingCount = termResultRepository.countPassingStudents(schoolId, termId);
        Long totalResults = termResultRepository.countTotalResultsBySchoolAndTerm(schoolId, termId);

        double passRate = 0.0;
        double failRate = 0.0;
        if (totalResults != null && totalResults > 0) {
            passRate = (passingCount != null ? passingCount : 0) * 100.0 / totalResults;
            failRate = 100.0 - passRate;
        }

        // Active warnings
        long activeWarnings = earlyWarningRepository.countByTermIdAndIsResolved(termId, false);

        // Scholarship candidates (CGPA >= 3.5)
        long scholarshipCandidates = cumulativeGPARepository.countBySchoolIdAndCgpaGreaterThanEqual(schoolId, 3.5);

        // Year group breakdown
        List<YearGroupStatsDto> byYearGroup = buildYearGroupStats(schoolId, termId);

        // Subject performance
        List<SubjectPerformanceDto> subjectPerformance = buildSubjectPerformance(termId);

        return AdminDashboardStatsDto.builder()
                .totalStudents(totalStudents)
                .totalTeachers(totalTeachers)
                .totalClasses(totalClasses)
                .currentTermName(currentTermName)
                .averageSchoolGpa(averageSchoolGpa != null ? round(averageSchoolGpa) : null)
                .passRate(round(passRate))
                .failRate(round(failRate))
                .activeWarnings(activeWarnings)
                .scholarshipCandidates(scholarshipCandidates)
                .byYearGroup(byYearGroup)
                .subjectPerformance(subjectPerformance)
                .build();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "termComparison", key = "#schoolId")
    public List<TermComparisonDto> getTermComparisonData(Long schoolId) {
        List<Object[]> rows = termResultRepository.findTermComparisonData(schoolId);

        // Group by term label: "TERM_1 — 2024/2025"
        Map<String, Map<YearGroup, Double>> termMap = new LinkedHashMap<>();

        for (Object[] row : rows) {
            TermType termType = (TermType) row[0];
            String yearLabel = (String) row[1];
            YearGroup yearGroup = (YearGroup) row[2];
            Double avgGpa = (Double) row[3];

            String termLabel = termType.name().replace("_", " ") + " \u2014 " + yearLabel;
            termMap.computeIfAbsent(termLabel, k -> new EnumMap<>(YearGroup.class))
                    .put(yearGroup, avgGpa);
        }

        return termMap.entrySet().stream()
                .map(entry -> TermComparisonDto.builder()
                        .termLabel(entry.getKey())
                        .shs1Avg(round(entry.getValue().get(YearGroup.SHS1)))
                        .shs2Avg(round(entry.getValue().get(YearGroup.SHS2)))
                        .shs3Avg(round(entry.getValue().get(YearGroup.SHS3)))
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "gradeDistribution", key = "#schoolId + '-' + #termId")
    public List<GradeDistributionDto> getGradeDistribution(Long schoolId, Long termId) {
        List<Object[]> rows = scoreRepository.findGradeDistributionByTerm(termId);

        long totalCount = rows.stream()
                .mapToLong(row -> (Long) row[1])
                .sum();

        return rows.stream()
                .map(row -> {
                    String grade = (String) row[0];
                    long count = (Long) row[1];
                    double percentage = totalCount > 0 ? count * 100.0 / totalCount : 0.0;

                    return GradeDistributionDto.builder()
                            .grade(grade)
                            .count(count)
                            .percentage(round(percentage))
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "classPerformance", key = "#schoolId + '-' + #termId")
    public List<ClassPerformanceDto> getClassPerformanceComparison(Long schoolId, Long termId) {
        List<Object[]> rows = termResultRepository.findClassPerformanceBySchoolAndTerm(schoolId, termId);

        return rows.stream()
                .map(row -> {
                    String className = (String) row[1];
                    Double avgGpa = (Double) row[2];
                    Long studentCount = (Long) row[3];
                    Long passingCount = (Long) row[4];

                    double passRate = studentCount > 0 ? passingCount * 100.0 / studentCount : 0.0;

                    return ClassPerformanceDto.builder()
                            .className(className)
                            .avgGpa(round(avgGpa))
                            .studentCount(studentCount)
                            .passRate(round(passRate))
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "subjectWeakness", key = "#schoolId + '-' + #termId")
    public List<SubjectWeaknessDto> getSubjectWeaknessAnalysis(Long schoolId, Long termId) {
        List<Object[]> rows = scoreRepository.findSubjectWeaknessByTerm(termId);

        return rows.stream()
                .map(row -> {
                    String subjectName = (String) row[0];
                    Long failCount = (Long) row[1];
                    Long totalCount = (Long) row[2];
                    Double avgScore = (Double) row[3];
                    Long affectedClasses = (Long) row[4];

                    double failureRate = totalCount > 0 ? failCount * 100.0 / totalCount : 0.0;

                    return SubjectWeaknessDto.builder()
                            .subjectName(subjectName)
                            .failureRate(round(failureRate))
                            .avgScore(round(avgScore))
                            .affectedClasses(affectedClasses)
                            .build();
                })
                .filter(dto -> dto.getFailureRate() > 0)
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "enrollmentTrends", key = "#schoolId")
    public List<EnrollmentTrendDto> getEnrollmentTrends(Long schoolId) {
        List<Object[]> rows = studentEnrollmentRepository.findEnrollmentTrendsBySchool(schoolId);

        // Group by yearLabel
        Map<String, Map<String, Long>> yearMap = new LinkedHashMap<>();

        for (Object[] row : rows) {
            String yearLabel = (String) row[0];
            String programName = (String) row[1];
            Long count = (Long) row[2];

            yearMap.computeIfAbsent(yearLabel, k -> new LinkedHashMap<>())
                    .put(programName, count);
        }

        return yearMap.entrySet().stream()
                .map(entry -> {
                    Map<String, Long> programCounts = entry.getValue();
                    long totalStudents = programCounts.values().stream().mapToLong(Long::longValue).sum();

                    return EnrollmentTrendDto.builder()
                            .yearLabel(entry.getKey())
                            .programCounts(programCounts)
                            .totalStudents(totalStudents)
                            .build();
                })
                .toList();
    }

    // ==================== HELPER METHODS ====================

    private List<YearGroupStatsDto> buildYearGroupStats(Long schoolId, Long termId) {
        List<Object[]> rows = termResultRepository.findAverageGpaByYearGroup(schoolId, termId);

        List<YearGroupStatsDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            YearGroup yearGroup = (YearGroup) row[0];
            Double avgGpa = (Double) row[1];
            Long studentCount = (Long) row[2];
            Long passingCount = (Long) row[3];

            double passRate = studentCount > 0 ? passingCount * 100.0 / studentCount : 0.0;

            result.add(YearGroupStatsDto.builder()
                    .yearGroup(yearGroup)
                    .studentCount(studentCount)
                    .avgGpa(round(avgGpa))
                    .passRate(round(passRate))
                    .build());
        }

        return result;
    }

    private List<SubjectPerformanceDto> buildSubjectPerformance(Long termId) {
        List<Object[]> rows = scoreRepository.findSubjectPerformanceSummaryByTerm(termId);

        return rows.stream()
                .map(row -> {
                    String subjectName = (String) row[1];
                    Double avgScore = (Double) row[2];
                    Long passingCount = (Long) row[3];
                    Long totalCount = (Long) row[4];
                    Double highestScore = (Double) row[5];
                    Double lowestScore = (Double) row[6];

                    double passRate = totalCount > 0 ? passingCount * 100.0 / totalCount : 0.0;

                    return SubjectPerformanceDto.builder()
                            .subjectName(subjectName)
                            .avgScore(round(avgScore))
                            .passRate(round(passRate))
                            .highestScore(highestScore)
                            .lowestScore(lowestScore)
                            .build();
                })
                .toList();
    }

    private Double round(Double value) {
        if (value == null) return null;
        return Math.round(value * 100.0) / 100.0;
    }
}
