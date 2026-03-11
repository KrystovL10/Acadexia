package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.student.*;
import com.shs.academic.model.entity.*;
import com.shs.academic.repository.*;
import com.shs.academic.util.GpaCalculator;
import com.shs.academic.util.StudentOwnershipValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudentPortalService {

    private final StudentRepository studentRepository;
    private final ScoreRepository scoreRepository;
    private final TermResultRepository termResultRepository;
    private final CumulativeGPARepository cumulativeGPARepository;
    private final AttendanceRepository attendanceRepository;
    private final EarlyWarningRepository earlyWarningRepository;
    private final TermRepository termRepository;
    private final TranscriptService transcriptService;
    private final PdfGeneratorService pdfGeneratorService;
    private final StudentOwnershipValidator ownershipValidator;

    // ================================================================
    // PROFILE
    // ================================================================

    @Transactional(readOnly = true)
    public StudentProfileDto getMyProfile(Long userId) {
        Student student = ownershipValidator.resolveAndValidate(userId);
        return StudentProfileDto.fromEntity(student);
    }

    @Transactional
    public StudentProfileDto updateMyProfile(Long userId, UpdateStudentProfileRequest request) {
        Student student = ownershipValidator.resolveAndValidate(userId);
        User user = student.getUser();

        // Students can ONLY update these fields
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getResidentialAddress() != null) {
            student.setResidentialAddress(request.getResidentialAddress());
        }
        if (request.getProfilePhotoUrl() != null) {
            user.setProfilePhotoUrl(request.getProfilePhotoUrl());
        }

        studentRepository.save(student);
        return StudentProfileDto.fromEntity(student);
    }

    // ================================================================
    // ACADEMIC RESULTS
    // ================================================================

    @Transactional(readOnly = true)
    public StudentTermResultDto getMyTermResult(Long userId, Long termId) {
        Student student = ownershipValidator.resolveAndValidate(userId);

        TermResult tr = termResultRepository.findByStudentIdAndTermId(student.getId(), termId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Results for this term have not been published yet."));

        if (!tr.isGenerated()) {
            throw new ResourceNotFoundException(
                    "Results for this term have not been published yet.");
        }

        return buildStudentTermResult(tr, student.getId());
    }

    @Transactional(readOnly = true)
    public List<TermResultSummaryDto> getMyAllTermResults(Long userId) {
        Student student = ownershipValidator.resolveAndValidate(userId);

        return termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(student.getId())
                .stream()
                .filter(TermResult::isGenerated)
                .map(TermResultSummaryDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentTermResultDto getMyLatestTermResult(Long userId) {
        Student student = ownershipValidator.resolveAndValidate(userId);

        List<TermResult> allResults = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(student.getId())
                .stream()
                .filter(TermResult::isGenerated)
                .toList();

        if (allResults.isEmpty()) {
            throw new ResourceNotFoundException("No published results found.");
        }

        TermResult latest = allResults.get(allResults.size() - 1);
        return buildStudentTermResult(latest, student.getId());
    }

    // ================================================================
    // GPA & CGPA
    // ================================================================

    @Transactional(readOnly = true)
    public StudentGpaHistoryDto getMyGpaHistory(Long userId) {
        Student student = ownershipValidator.resolveAndValidate(userId);

        List<TermResult> allResults = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(student.getId())
                .stream()
                .filter(TermResult::isGenerated)
                .filter(tr -> tr.getGpa() != null)
                .toList();

        // Current CGPA
        Double currentCgpa = cumulativeGPARepository.findByStudentId(student.getId())
                .map(CumulativeGPA::getCgpa)
                .orElse(null);

        String classification = currentCgpa != null
                ? GpaCalculator.getClassification(currentCgpa) : null;

        // Term history with trend
        List<StudentGpaHistoryDto.TermGpaDto> termHistory = new ArrayList<>();
        Double previousGpa = null;

        for (TermResult tr : allResults) {
            String trend = "STABLE";
            if (previousGpa != null) {
                double diff = tr.getGpa() - previousGpa;
                if (diff > 0.05) trend = "UP";
                else if (diff < -0.05) trend = "DOWN";
            }

            String termLabel = tr.getTerm().getTermType().name().replace("_", " ")
                    + " — " + tr.getTerm().getAcademicYear().getYearLabel();

            termHistory.add(StudentGpaHistoryDto.TermGpaDto.builder()
                    .termLabel(termLabel)
                    .yearGroup(tr.getYearGroup())
                    .gpa(tr.getGpa())
                    .positionInClass(tr.getPositionInClass())
                    .totalStudents(tr.getTotalStudentsInClass())
                    .trend(trend)
                    .build());

            previousGpa = tr.getGpa();
        }

        // CGPA progression
        List<StudentGpaHistoryDto.CgpaPointDto> cgpaProgression = new ArrayList<>();
        double runningTotal = 0;
        for (int i = 0; i < allResults.size(); i++) {
            TermResult tr = allResults.get(i);
            runningTotal += tr.getGpa();
            double cgpaAfter = GpaCalculator.round(runningTotal / (i + 1));

            String termLabel = tr.getTerm().getTermType().name().replace("_", " ")
                    + " — " + tr.getTerm().getAcademicYear().getYearLabel();

            cgpaProgression.add(StudentGpaHistoryDto.CgpaPointDto.builder()
                    .termLabel(termLabel)
                    .cgpaAfterThisTerm(cgpaAfter)
                    .build());
        }

        return StudentGpaHistoryDto.builder()
                .currentCgpa(currentCgpa != null ? GpaCalculator.round(currentCgpa) : null)
                .currentClassification(classification)
                .termHistory(termHistory)
                .cgpaProgression(cgpaProgression)
                .build();
    }

    // ================================================================
    // SUBJECT PERFORMANCE
    // ================================================================

    @Transactional(readOnly = true)
    public SubjectPerformanceSummaryDto getMySubjectPerformance(Long userId) {
        Student student = ownershipValidator.resolveAndValidate(userId);

        List<Score> allScores = scoreRepository.findByStudentId(student.getId());

        // Group by subject
        Map<String, List<Score>> bySubject = allScores.stream()
                .filter(s -> !s.isAbsent() && s.getTotalScore() != null)
                .collect(Collectors.groupingBy(s -> s.getSubject().getName()));

        List<SubjectPerformanceSummaryDto.SubjectStatDto> allSubjectStats = new ArrayList<>();

        for (Map.Entry<String, List<Score>> entry : bySubject.entrySet()) {
            String subjectName = entry.getKey();
            List<Score> scores = entry.getValue();

            // Sort by term for trend analysis
            scores.sort(Comparator.comparing(s -> s.getTerm().getId()));

            double avg = scores.stream().mapToDouble(Score::getTotalScore).average().orElse(0);
            double best = scores.stream().mapToDouble(Score::getTotalScore).max().orElse(0);
            double worst = scores.stream().mapToDouble(Score::getTotalScore).min().orElse(0);

            String bestGrade = scores.stream()
                    .max(Comparator.comparingDouble(Score::getTotalScore))
                    .map(Score::getGrade)
                    .orElse(null);

            String latestGrade = scores.get(scores.size() - 1).getGrade();

            // Trend: compare last score vs average of earlier scores
            String trend = "STABLE";
            if (scores.size() >= 2) {
                double lastScore = scores.get(scores.size() - 1).getTotalScore();
                double earlierAvg = scores.subList(0, scores.size() - 1).stream()
                        .mapToDouble(Score::getTotalScore).average().orElse(lastScore);
                double diff = lastScore - earlierAvg;
                if (diff > 3) trend = "IMPROVING";
                else if (diff < -3) trend = "DECLINING";
            }

            allSubjectStats.add(SubjectPerformanceSummaryDto.SubjectStatDto.builder()
                    .subjectName(subjectName)
                    .termsAppeared(scores.size())
                    .averageScore(GpaCalculator.round(avg))
                    .bestScore(best)
                    .worstScore(worst)
                    .bestGrade(bestGrade)
                    .latestGrade(latestGrade)
                    .trend(trend)
                    .build());
        }

        // Sort by average descending
        allSubjectStats.sort(Comparator.comparingDouble(
                SubjectPerformanceSummaryDto.SubjectStatDto::getAverageScore).reversed());

        int topN = Math.min(3, allSubjectStats.size());
        List<SubjectPerformanceSummaryDto.SubjectStatDto> strongest = allSubjectStats.subList(0, topN);
        List<SubjectPerformanceSummaryDto.SubjectStatDto> weakest = allSubjectStats.size() > 3
                ? allSubjectStats.subList(allSubjectStats.size() - topN, allSubjectStats.size())
                : new ArrayList<>(allSubjectStats);

        return SubjectPerformanceSummaryDto.builder()
                .strongestSubjects(new ArrayList<>(strongest))
                .weakestSubjects(new ArrayList<>(weakest))
                .allSubjects(allSubjectStats)
                .build();
    }

    // ================================================================
    // TRANSCRIPT
    // ================================================================

    @Transactional(readOnly = true)
    public Object getMyTranscript(Long userId) {
        Student student = ownershipValidator.resolveAndValidate(userId);

        // Verify student has at least 1 generated result
        boolean hasResults = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(student.getId())
                .stream()
                .anyMatch(TermResult::isGenerated);

        if (!hasResults) {
            throw new ResourceNotFoundException(
                    "No published results available to generate a transcript.");
        }

        return transcriptService.generateTranscript(student.getId());
    }

    @Transactional(readOnly = true)
    public byte[] downloadMyTranscript(Long userId) {
        Student student = ownershipValidator.resolveAndValidate(userId);
        return pdfGeneratorService.generateTranscriptPdf(student.getId());
    }

    @Transactional(readOnly = true)
    public byte[] downloadMyTermReport(Long userId, Long termId) {
        Student student = ownershipValidator.resolveAndValidate(userId);

        // Validate the term result exists and is generated
        TermResult tr = termResultRepository.findByStudentIdAndTermId(student.getId(), termId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Results for this term have not been published yet."));

        if (!tr.isGenerated()) {
            throw new ResourceNotFoundException(
                    "Results for this term have not been published yet.");
        }

        return pdfGeneratorService.generateTerminalReportPdf(student.getId(), termId);
    }

    // ================================================================
    // ATTENDANCE
    // ================================================================

    @Transactional(readOnly = true)
    public StudentAttendanceSummaryDto getMyAttendanceSummary(Long userId, Long termId) {
        Student student = ownershipValidator.resolveAndValidate(userId);

        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term not found: " + termId));

        String termLabel = term.getTermType().name().replace("_", " ")
                + " — " + term.getAcademicYear().getYearLabel();

        List<Attendance> records = attendanceRepository
                .findByStudentIdAndTermId(student.getId(), termId);

        int present = 0, absent = 0, late = 0;
        List<StudentAttendanceSummaryDto.AbsentDateDto> absentDates = new ArrayList<>();

        for (Attendance a : records) {
            if (a.isPresent()) {
                present++;
                if (a.isLate()) late++;
            } else {
                absent++;
                absentDates.add(StudentAttendanceSummaryDto.AbsentDateDto.builder()
                        .date(a.getDate())
                        .reason(a.getReason())
                        .build());
            }
        }

        int total = present + absent;
        Double percentage = total > 0 ? GpaCalculator.round(present * 100.0 / total) : null;

        return StudentAttendanceSummaryDto.builder()
                .termLabel(termLabel)
                .termId(termId)
                .totalPresent(present)
                .totalAbsent(absent)
                .totalLate(late)
                .percentage(percentage)
                .absentDates(absentDates)
                .build();
    }

    @Transactional(readOnly = true)
    public List<StudentAttendanceSummaryDto> getMyAttendanceHistory(Long userId) {
        Student student = ownershipValidator.resolveAndValidate(userId);

        // Get all term results to find terms the student has been enrolled in
        List<TermResult> allResults = termResultRepository
                .findByStudentIdOrderByTermAcademicYearYearLabelAsc(student.getId());

        List<StudentAttendanceSummaryDto> history = new ArrayList<>();

        for (TermResult tr : allResults) {
            Long termId = tr.getTerm().getId();
            String termLabel = tr.getTerm().getTermType().name().replace("_", " ")
                    + " — " + tr.getTerm().getAcademicYear().getYearLabel();

            Long presentCount = attendanceRepository
                    .countByStudentIdAndTermIdAndIsPresent(student.getId(), termId, true);
            Long absentCount = attendanceRepository
                    .countByStudentIdAndTermIdAndIsPresent(student.getId(), termId, false);

            int present = presentCount != null ? presentCount.intValue() : 0;
            int absent = absentCount != null ? absentCount.intValue() : 0;
            int total = present + absent;
            Double pct = total > 0 ? GpaCalculator.round(present * 100.0 / total) : null;

            history.add(StudentAttendanceSummaryDto.builder()
                    .termLabel(termLabel)
                    .termId(termId)
                    .totalPresent(present)
                    .totalAbsent(absent)
                    .percentage(pct)
                    .build());
        }

        return history;
    }

    // ================================================================
    // NOTIFICATIONS & WARNINGS
    // ================================================================

    private static final Set<String> HIDDEN_WARNING_TYPES = Set.of("BEHAVIORAL_CONCERN");

    private static final Map<String, String> WARNING_FRIENDLY_MESSAGES = Map.of(
            "FAILING_MULTIPLE_SUBJECTS", "You are at risk in several subjects. Consider seeking extra help from your teachers.",
            "GPA_DECLINE", "Your GPA has been declining. Let's work on turning this around.",
            "ATTENDANCE_ISSUE", "Your attendance needs improvement. Regular attendance is key to good performance.",
            "SINGLE_SUBJECT_FAILURE", "You are struggling in a subject. Ask your teacher for additional support.",
            "LOW_PERFORMANCE", "Your overall performance needs attention. Consider adjusting your study habits."
    );

    @Transactional(readOnly = true)
    public List<StudentWarningDto> getMyActiveWarnings(Long userId) {
        Student student = ownershipValidator.resolveAndValidate(userId);

        return earlyWarningRepository
                .findByStudentIdAndIsResolved(student.getId(), false)
                .stream()
                .filter(w -> !HIDDEN_WARNING_TYPES.contains(w.getWarningType()))
                .map(w -> StudentWarningDto.builder()
                        .id(w.getId())
                        .warningLevel(w.getWarningLevel())
                        .warningType(w.getWarningType())
                        .friendlyMessage(WARNING_FRIENDLY_MESSAGES.getOrDefault(
                                w.getWarningType(),
                                "There is an area of your academic performance that needs attention."))
                        .suggestedAction(w.getSuggestedAction())
                        .generatedAt(w.getGeneratedAt())
                        .build())
                .toList();
    }

    // ================================================================
    // PRIVATE HELPERS
    // ================================================================

    private StudentTermResultDto buildStudentTermResult(TermResult tr, Long studentId) {
        List<Score> scores = scoreRepository.findByStudentIdAndTermId(studentId, tr.getTerm().getId());

        List<StudentTermResultDto.StudentScoreDto> scoreDtos = scores.stream()
                .sorted(Comparator.comparing(s -> s.getSubject().getName()))
                .map(s -> StudentTermResultDto.StudentScoreDto.builder()
                        .subjectName(s.getSubject().getName())
                        .classScore(s.getClassScore())
                        .examScore(s.getExamScore())
                        .totalScore(s.getTotalScore())
                        .grade(s.getGrade())
                        .gradePoint(s.getGradePoint())
                        .remarks(s.getRemarks())
                        .isAbsent(s.isAbsent())
                        .build())
                .toList();

        StudentTermResultDto dto = StudentTermResultDto.fromEntity(tr);
        dto.setScores(scoreDtos);
        return dto;
    }
}
