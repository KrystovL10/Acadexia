package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.ranking.*;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PowerRankingService {

    private final TermResultRepository termResultRepository;
    private final ScoreRepository scoreRepository;
    private final CumulativeGPARepository cumulativeGPARepository;
    private final ClassRoomRepository classRoomRepository;
    private final TermRepository termRepository;
    private final AcademicYearRepository academicYearRepository;
    private final SubjectRepository subjectRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "powerRanking", key = "#schoolId + '-' + #termId")
    public PowerRankingDto getSchoolPowerRanking(Long schoolId, Long termId) {
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        List<StudentRankDto> topTen = getTopStudents(schoolId, termId, 10);
        StudentRankDto bestStudent = topTen.isEmpty() ? null : topTen.get(0);

        List<ClassTopStudentDto> topPerClass = getTopStudentPerClass(schoolId, termId);
        List<YearGroupTopStudentDto> topPerYearGroup = getTopStudentPerYearGroup(schoolId, termId);
        List<SubjectTopStudentDto> topPerSubject = getTopStudentPerSubject(schoolId, termId);

        List<ImprovementDto> improvements = calculateImprovements(schoolId, termId);

        ImprovementDto mostImproved = improvements.stream()
                .filter(i -> i.getDelta() > 0)
                .max(Comparator.comparingDouble(ImprovementDto::getDelta))
                .orElse(null);

        ImprovementDto mostDeclined = improvements.stream()
                .filter(i -> i.getDelta() < 0)
                .min(Comparator.comparingDouble(ImprovementDto::getDelta))
                .orElse(null);

        List<ImprovementDto> topFiveImproved = improvements.stream()
                .filter(i -> i.getDelta() > 0)
                .sorted(Comparator.comparingDouble(ImprovementDto::getDelta).reversed())
                .limit(5)
                .toList();

        List<ScholarshipCandidateDto> scholarshipCandidates = getScholarshipCandidates(schoolId);

        return PowerRankingDto.builder()
                .bestStudent(bestStudent)
                .topTenStudents(topTen)
                .topStudentPerClass(topPerClass)
                .topStudentPerYearGroup(topPerYearGroup)
                .topStudentPerSubject(topPerSubject)
                .mostImproved(mostImproved)
                .mostDeclined(mostDeclined)
                .topFiveImproved(topFiveImproved)
                .scholarshipCandidates(scholarshipCandidates)
                .build();
    }

    @Transactional(readOnly = true)
    public List<StudentRankDto> getTopStudents(Long schoolId, Long termId, int limit) {
        List<TermResult> results = termResultRepository.findRankedResultsBySchoolAndTerm(
                schoolId, termId, PageRequest.of(0, limit));

        List<StudentRankDto> ranked = new ArrayList<>();
        for (int i = 0; i < results.size(); i++) {
            ranked.add(toStudentRankDto(results.get(i), i + 1));
        }
        return ranked;
    }

    @Transactional(readOnly = true)
    public ImprovementDto getMostImproved(Long schoolId, Long termId) {
        List<ImprovementDto> improvements = calculateImprovements(schoolId, termId);
        return improvements.stream()
                .filter(i -> i.getDelta() > 0)
                .max(Comparator.comparingDouble(ImprovementDto::getDelta))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public ImprovementDto getMostDeclined(Long schoolId, Long termId) {
        List<ImprovementDto> improvements = calculateImprovements(schoolId, termId);
        return improvements.stream()
                .filter(i -> i.getDelta() < 0)
                .min(Comparator.comparingDouble(ImprovementDto::getDelta))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<ScholarshipCandidateDto> getScholarshipCandidates(Long schoolId) {
        List<CumulativeGPA> candidates = cumulativeGPARepository.findScholarshipCandidates(schoolId, 3.5);

        return candidates.stream()
                .map(cgpa -> {
                    Student student = cgpa.getStudent();

                    // Count consecutive terms above 3.5
                    List<TermResult> allResults = termResultRepository
                            .findByStudentIdOrderByTermAcademicYearYearLabelAsc(student.getId());
                    int consecutive = countConsecutiveTermsAbove(allResults, 3.5);

                    StudentRankDto studentDto = StudentRankDto.builder()
                            .studentId(student.getId())
                            .studentIndex(student.getStudentIndex())
                            .fullName(student.getUser().getFullName())
                            .className(student.getCurrentClass() != null
                                    ? student.getCurrentClass().getDisplayName() : null)
                            .programName(student.getCurrentProgram().getDisplayName())
                            .yearGroup(student.getCurrentYearGroup())
                            .cgpa(round(cgpa.getCgpa()))
                            .profilePhotoUrl(student.getUser().getProfilePhotoUrl())
                            .build();

                    return ScholarshipCandidateDto.builder()
                            .student(studentDto)
                            .cgpa(round(cgpa.getCgpa()))
                            .termsCompleted(cgpa.getTotalTermsCompleted())
                            .consecutiveTermsAbove35(consecutive)
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubjectTopStudentDto> getTopStudentPerSubject(Long schoolId, Long termId) {
        List<Long> subjectIds = scoreRepository.findDistinctSubjectIdsByTermAndSchool(termId, schoolId);

        List<SubjectTopStudentDto> result = new ArrayList<>();
        for (Long subjectId : subjectIds) {
            List<Score> topScores = scoreRepository.findTopScoresBySubjectAndTerm(
                    subjectId, termId, PageRequest.of(0, 1));

            if (!topScores.isEmpty()) {
                Score topScore = topScores.get(0);
                Student student = topScore.getStudent();

                StudentRankDto studentDto = StudentRankDto.builder()
                        .studentId(student.getId())
                        .studentIndex(student.getStudentIndex())
                        .fullName(student.getUser().getFullName())
                        .className(topScore.getClassRoom().getDisplayName())
                        .programName(student.getCurrentProgram().getDisplayName())
                        .yearGroup(student.getCurrentYearGroup())
                        .profilePhotoUrl(student.getUser().getProfilePhotoUrl())
                        .build();

                result.add(SubjectTopStudentDto.builder()
                        .subjectId(subjectId)
                        .subjectName(topScore.getSubject().getName())
                        .student(studentDto)
                        .score(topScore.getTotalScore())
                        .grade(topScore.getGrade())
                        .build());
            }
        }

        return result;
    }

    @Transactional(readOnly = true)
    public List<ClassTopStudentDto> getTopStudentPerClass(Long schoolId, Long termId) {
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        List<ClassRoom> activeClasses = classRoomRepository
                .findBySchoolIdAndAcademicYearId(schoolId, term.getAcademicYear().getId())
                .stream()
                .filter(ClassRoom::isActive)
                .toList();

        List<ClassTopStudentDto> result = new ArrayList<>();
        for (ClassRoom classRoom : activeClasses) {
            List<TermResult> classResults = termResultRepository.findRankedResultsByClass(
                    classRoom.getId(), termId, PageRequest.of(0, 1));

            if (!classResults.isEmpty()) {
                TermResult topResult = classResults.get(0);
                result.add(ClassTopStudentDto.builder()
                        .classId(classRoom.getId())
                        .className(classRoom.getDisplayName())
                        .student(toStudentRankDto(topResult, 1))
                        .build());
            }
        }

        return result;
    }

    // ==================== HELPER METHODS ====================

    private List<YearGroupTopStudentDto> getTopStudentPerYearGroup(Long schoolId, Long termId) {
        List<YearGroupTopStudentDto> result = new ArrayList<>();

        for (YearGroup yg : YearGroup.values()) {
            List<TermResult> ygResults = termResultRepository.findRankedResultsByYearGroup(
                    schoolId, termId, yg, PageRequest.of(0, 1));

            if (!ygResults.isEmpty()) {
                result.add(YearGroupTopStudentDto.builder()
                        .yearGroup(yg)
                        .student(toStudentRankDto(ygResults.get(0), 1))
                        .build());
            }
        }

        return result;
    }

    private List<ImprovementDto> calculateImprovements(Long schoolId, Long termId) {
        Term currentTerm = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        // Find the previous term
        Term previousTerm = findPreviousTerm(currentTerm);
        if (previousTerm == null) {
            return List.of();
        }

        String currentTermLabel = currentTerm.getTermType().name().replace("_", " ")
                + " \u2014 " + currentTerm.getAcademicYear().getYearLabel();
        String previousTermLabel = previousTerm.getTermType().name().replace("_", " ")
                + " \u2014 " + previousTerm.getAcademicYear().getYearLabel();

        // Get all results for current term
        List<TermResult> currentResults = termResultRepository
                .findAllResultsBySchoolAndTermOrderByGpaDesc(schoolId, termId);

        List<ImprovementDto> improvements = new ArrayList<>();

        for (TermResult current : currentResults) {
            Optional<TermResult> previousOpt = termResultRepository
                    .findByStudentIdAndTermId(current.getStudent().getId(), previousTerm.getId());

            if (previousOpt.isPresent() && current.getGpa() != null && previousOpt.get().getGpa() != null) {
                TermResult previous = previousOpt.get();
                double delta = current.getGpa() - previous.getGpa();
                double percentageChange = previous.getGpa() != 0
                        ? (delta / previous.getGpa()) * 100.0
                        : 0.0;

                improvements.add(ImprovementDto.builder()
                        .student(toStudentRankDto(current, null))
                        .previousTermLabel(previousTermLabel)
                        .currentTermLabel(currentTermLabel)
                        .previousGpa(round(previous.getGpa()))
                        .currentGpa(round(current.getGpa()))
                        .delta(round(delta))
                        .percentageChange(round(percentageChange))
                        .build());
            }
        }

        return improvements;
    }

    private Term findPreviousTerm(Term currentTerm) {
        AcademicYear currentYear = currentTerm.getAcademicYear();
        List<Term> termsInYear = termRepository.findByAcademicYearId(currentYear.getId());

        // Sort by term type ordinal
        termsInYear.sort(Comparator.comparingInt(t -> t.getTermType().ordinal()));

        // Find previous term in same academic year
        for (int i = 0; i < termsInYear.size(); i++) {
            if (termsInYear.get(i).getId().equals(currentTerm.getId()) && i > 0) {
                return termsInYear.get(i - 1);
            }
        }

        // If this is TERM_1, look for TERM_3 of previous academic year
        if (currentTerm.getTermType().ordinal() == 0) {
            List<AcademicYear> allYears = academicYearRepository
                    .findBySchoolIdOrderByYearLabelDesc(currentYear.getSchool().getId());

            for (int i = 0; i < allYears.size(); i++) {
                if (allYears.get(i).getId().equals(currentYear.getId()) && i + 1 < allYears.size()) {
                    AcademicYear previousYear = allYears.get(i + 1);
                    List<Term> prevYearTerms = termRepository.findByAcademicYearId(previousYear.getId());
                    return prevYearTerms.stream()
                            .max(Comparator.comparingInt(t -> t.getTermType().ordinal()))
                            .orElse(null);
                }
            }
        }

        return null;
    }

    private int countConsecutiveTermsAbove(List<TermResult> results, double threshold) {
        int consecutive = 0;
        // Iterate from most recent backwards
        for (int i = results.size() - 1; i >= 0; i--) {
            if (results.get(i).getGpa() != null && results.get(i).getGpa() >= threshold) {
                consecutive++;
            } else {
                break;
            }
        }
        return consecutive;
    }

    private StudentRankDto toStudentRankDto(TermResult result, Integer rank) {
        Student student = result.getStudent();

        // Fetch CGPA
        Double cgpa = cumulativeGPARepository.findByStudentId(student.getId())
                .map(CumulativeGPA::getCgpa)
                .map(this::round)
                .orElse(null);

        return StudentRankDto.builder()
                .rank(rank)
                .studentId(student.getId())
                .studentIndex(student.getStudentIndex())
                .fullName(student.getUser().getFullName())
                .className(result.getClassRoom().getDisplayName())
                .programName(student.getCurrentProgram().getDisplayName())
                .yearGroup(result.getYearGroup())
                .gpa(round(result.getGpa()))
                .cgpa(cgpa)
                .profilePhotoUrl(student.getUser().getProfilePhotoUrl())
                .build();
    }

    private Double round(Double value) {
        if (value == null) return null;
        return Math.round(value * 100.0) / 100.0;
    }
}
