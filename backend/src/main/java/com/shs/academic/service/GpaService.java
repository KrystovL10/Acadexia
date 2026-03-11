package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.*;
import com.shs.academic.model.entity.*;
import com.shs.academic.repository.*;
import com.shs.academic.util.GpaCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GpaService {

    private final StudentRepository studentRepository;
    private final ScoreRepository scoreRepository;
    private final TermResultRepository termResultRepository;
    private final CumulativeGPARepository cumulativeGPARepository;
    private final AttendanceRepository attendanceRepository;
    private final TermRepository termRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassSubjectAssignmentRepository classSubjectAssignmentRepository;
    private final GpaCalculator gpaCalculator;

    private static final Set<String> PASSING_GRADES = Set.of("A1", "A2", "B2", "B3", "C4", "C5", "C6");

    // ==================== GENERATE SINGLE TERM RESULT ====================

    @Caching(evict = {
            @CacheEvict(value = "dashboardStats", allEntries = true),
            @CacheEvict(value = "termComparison", allEntries = true),
            @CacheEvict(value = "powerRanking", allEntries = true),
            @CacheEvict(value = "gradeDistribution", allEntries = true),
            @CacheEvict(value = "classPerformance", allEntries = true)
    })
    @Transactional
    public TermResult generateTermResult(Long studentId, Long termId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        ClassRoom classRoom = student.getCurrentClass();
        if (classRoom == null) {
            throw new IllegalStateException(
                    "Student " + student.getStudentIndex() + " is not assigned to a class");
        }

        // Get all active subject assignments for the student's class
        List<ClassSubjectAssignment> assignments =
                classSubjectAssignmentRepository.findByClassRoomIdAndIsActiveTrue(classRoom.getId());

        // Get scores for the student this term
        List<Score> scores = scoreRepository.findByStudentIdAndTermId(studentId, termId);

        // Check if all subjects have scores
        Set<Long> scoredSubjectIds = scores.stream()
                .map(s -> s.getSubject().getId())
                .collect(Collectors.toSet());

        List<String> missingSubjects = assignments.stream()
                .filter(a -> !scoredSubjectIds.contains(a.getSubject().getId()))
                .map(a -> a.getSubject().getName())
                .toList();

        if (!missingSubjects.isEmpty()) {
            throw new IllegalStateException(
                    "Not all scores have been entered for this student. Missing: "
                            + String.join(", ", missingSubjects));
        }

        // Calculate GPA from non-absent scores
        double gpa = GpaCalculator.calculateGpa(scores);

        // Count passed/failed
        List<Score> validScores = scores.stream()
                .filter(s -> !s.isAbsent() && s.getGrade() != null)
                .toList();

        int subjectsPassed = (int) validScores.stream()
                .filter(s -> PASSING_GRADES.contains(s.getGrade()))
                .count();
        int subjectsFailed = validScores.size() - subjectsPassed;

        double totalPoints = validScores.stream()
                .mapToDouble(s -> s.getGradePoint() != null ? s.getGradePoint() : 0.0)
                .sum();

        // Attendance summary
        Long presentCount = attendanceRepository.countByStudentIdAndTermIdAndIsPresent(
                studentId, termId, true);
        Long absentCount = attendanceRepository.countByStudentIdAndTermIdAndIsPresent(
                studentId, termId, false);

        int present = presentCount != null ? presentCount.intValue() : 0;
        int absent = absentCount != null ? absentCount.intValue() : 0;
        int totalDays = present + absent;
        Double attendancePct = totalDays > 0
                ? GpaCalculator.round(present * 100.0 / totalDays) : null;

        // Create or update TermResult
        TermResult termResult = termResultRepository
                .findByStudentIdAndTermId(studentId, termId)
                .orElse(TermResult.builder()
                        .student(student)
                        .term(term)
                        .academicYear(term.getAcademicYear())
                        .classRoom(classRoom)
                        .yearGroup(student.getCurrentYearGroup())
                        .build());

        termResult.setTotalSubjects(validScores.size());
        termResult.setSubjectsPassed(subjectsPassed);
        termResult.setSubjectsFailed(subjectsFailed);
        termResult.setTotalPoints(GpaCalculator.round(totalPoints));
        termResult.setGpa(gpa);
        termResult.setTotalDaysPresent(present);
        termResult.setTotalDaysAbsent(absent);
        termResult.setAttendancePercentage(attendancePct);
        termResult.setGenerated(true);
        termResult.setGeneratedAt(LocalDateTime.now());

        termResult = termResultRepository.save(termResult);

        // Update Cumulative GPA
        updateCumulativeGpa(student);

        log.info("Generated term result for student {} ({}): GPA={}, passed={}, failed={}",
                student.getStudentIndex(), student.getUser().getFullName(),
                gpa, subjectsPassed, subjectsFailed);

        return termResult;
    }

    // ==================== GENERATE ALL TERM RESULTS FOR A CLASS ====================

    @Caching(evict = {
            @CacheEvict(value = "dashboardStats", allEntries = true),
            @CacheEvict(value = "termComparison", allEntries = true),
            @CacheEvict(value = "powerRanking", allEntries = true),
            @CacheEvict(value = "gradeDistribution", allEntries = true),
            @CacheEvict(value = "classPerformance", allEntries = true)
    })
    @Transactional
    public List<TermResult> generateAllTermResults(Long classRoomId, Long termId) {
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));

        termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        List<Student> students = studentRepository.findByCurrentClassId(classRoomId).stream()
                .filter(Student::isActive)
                .toList();

        List<TermResult> results = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (Student student : students) {
            try {
                TermResult result = generateTermResult(student.getId(), termId);
                results.add(result);
            } catch (Exception e) {
                String error = String.format("%s (%s): %s",
                        student.getUser().getFullName(),
                        student.getStudentIndex(),
                        e.getMessage());
                errors.add(error);
                log.warn("Failed to generate term result for student {}: {}",
                        student.getStudentIndex(), e.getMessage());
            }
        }

        // Calculate positions after all results are generated
        if (!results.isEmpty()) {
            gpaCalculator.calculateAndSavePositions(termId, classRoom.getSchool().getId());

            // Re-fetch results to get updated positions
            results = termResultRepository.findByClassRoomIdAndTermId(classRoomId, termId);
        }

        log.info("Generated {} term results for class {} ({}). {} errors.",
                results.size(), classRoom.getDisplayName(), classRoom.getClassCode(), errors.size());

        return results;
    }

    // ==================== CALCULATE AND SAVE POSITIONS ====================

    @Transactional
    public void calculateAndSavePositions(Long classRoomId, Long termId) {
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));

        gpaCalculator.calculateAndSavePositions(termId, classRoom.getSchool().getId());
    }

    // ==================== UPDATE CUMULATIVE GPA ====================

    private void updateCumulativeGpa(Student student) {
        List<TermResult> allTermResults = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(student.getId());

        List<TermResult> generatedResults = allTermResults.stream()
                .filter(TermResult::isGenerated)
                .filter(tr -> tr.getGpa() != null)
                .toList();

        if (generatedResults.isEmpty()) {
            return;
        }

        double totalGradePoints = generatedResults.stream()
                .mapToDouble(TermResult::getGpa)
                .sum();

        CumulativeGPA cumGpa = cumulativeGPARepository.findByStudentId(student.getId())
                .orElse(CumulativeGPA.builder()
                        .student(student)
                        .build());

        cumGpa.setTotalTermsCompleted(generatedResults.size());
        cumGpa.setTotalGradePoints(GpaCalculator.round(totalGradePoints));
        // cgpa is auto-computed by @PrePersist/@PreUpdate in CumulativeGPA entity
        cumGpa.setAcademicYear(generatedResults.get(generatedResults.size() - 1)
                .getAcademicYear());

        cumulativeGPARepository.save(cumGpa);
    }

    // ==================== GET STUDENT TERM RESULT ====================

    @Transactional(readOnly = true)
    public TermResultDto getStudentTermResult(Long studentId, Long termId) {
        TermResult result = termResultRepository.findByStudentIdAndTermId(studentId, termId)
                .orElseThrow(() -> new ResourceNotFoundException("TermResult",
                        "studentId/termId", studentId + "/" + termId));

        List<Score> scores = scoreRepository.findByStudentIdAndTermId(studentId, termId);
        List<ScoreDto> scoreDtos = scores.stream()
                .map(ScoreDto::fromEntity)
                .toList();

        return TermResultDto.fromEntityWithScores(result, scoreDtos);
    }

    // ==================== GET STUDENT ALL TERM RESULTS ====================

    @Transactional(readOnly = true)
    public List<TermResultDto> getStudentAllTermResults(Long studentId) {
        studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        List<TermResult> results = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(studentId);

        return results.stream()
                .map(TermResultDto::fromEntity)
                .toList();
    }

    // ==================== GET STUDENT CGPA ====================

    @Transactional(readOnly = true)
    public CumulativeGPADto getStudentCgpa(Long studentId) {
        studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        CumulativeGPA cumGpa = cumulativeGPARepository.findByStudentId(studentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "CumulativeGPA", "studentId", studentId));

        // Build term-by-term breakdown
        List<TermResult> termResults = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(studentId).stream()
                .filter(TermResult::isGenerated)
                .filter(tr -> tr.getGpa() != null)
                .toList();

        List<CumulativeGPADto.TermGpaBreakdownDto> breakdown = termResults.stream()
                .map(tr -> CumulativeGPADto.TermGpaBreakdownDto.builder()
                        .termId(tr.getTerm().getId())
                        .termName(tr.getTerm().getTermType().name().replace("_", " "))
                        .academicYear(tr.getAcademicYear() != null
                                ? tr.getAcademicYear().getYearLabel() : null)
                        .gpa(tr.getGpa())
                        .classification(GpaCalculator.getClassification(tr.getGpa()))
                        .positionInClass(tr.getPositionInClass())
                        .totalStudentsInClass(tr.getTotalStudentsInClass())
                        .build())
                .toList();

        return CumulativeGPADto.fromEntityWithBreakdown(cumGpa, breakdown);
    }
}
