package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.SchoolDto;
import com.shs.academic.model.dto.TranscriptDto;
import com.shs.academic.model.entity.*;
import com.shs.academic.repository.*;
import com.shs.academic.util.GpaCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TranscriptService {

    private final StudentRepository studentRepository;
    private final TermResultRepository termResultRepository;
    private final ScoreRepository scoreRepository;
    private final CumulativeGPARepository cumulativeGPARepository;
    private final GpaCalculator gpaCalculator;

    // ================================================================
    // TRANSCRIPT GENERATION
    // ================================================================

    @Transactional(readOnly = true)
    public TranscriptDto generateTranscript(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student not found: " + studentId));

        // All term results in chronological order (year label asc, then term type)
        List<TermResult> allResults =
                termResultRepository.findByStudentIdOrderByTermAcademicYearYearLabelAsc(studentId);

        List<TranscriptDto.TermTranscriptDto> termDtos = allResults.stream()
                .map(tr -> buildTermTranscriptDto(tr, studentId))
                .collect(Collectors.toList());

        // CGPA — prefer stored value, fall back to recalculation
        Double cgpa = cumulativeGPARepository.findByStudentId(studentId)
                .map(CumulativeGPA::getCgpa)
                .orElseGet(() -> {
                    if (allResults.isEmpty()) return null;
                    List<Double> gpas = allResults.stream()
                            .map(TermResult::getGpa)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toList());
                    return gpas.isEmpty() ? null
                            : gpas.stream().mapToDouble(Double::doubleValue).average().orElse(0);
                });

        String classification = cgpa != null
                ? GpaCalculator.getClassification(cgpa) : "N/A";

        School school = student.getSchool();
        SchoolDto schoolDto = SchoolDto.builder()
                .id(school.getId())
                .schoolCode(school.getSchoolCode())
                .name(school.getName())
                .region(school.getRegion())
                .district(school.getDistrict())
                .address(school.getAddress())
                .phoneNumber(school.getPhoneNumber())
                .email(school.getEmail())
                .motto(school.getMotto())
                .logoUrl(school.getLogoUrl())
                .headmasterName(school.getHeadmasterName())
                .isActive(school.isActive())
                .createdAt(school.getCreatedAt())
                .build();

        return TranscriptDto.builder()
                .studentId(student.getId())
                .studentIndex(student.getStudentIndex())
                .fullName(student.getUser().getFullName())
                .email(student.getUser().getEmail())
                .gender(student.getGender())
                .dateOfBirth(student.getDateOfBirth())
                .admissionDate(student.getAdmissionDate())
                .graduationDate(null) // populated when graduation logic exists
                .schoolInfo(schoolDto)
                .programName(student.getCurrentProgram() != null
                        ? student.getCurrentProgram().getDisplayName() : null)
                .yearGroup(student.getCurrentYearGroup())
                .terms(termDtos)
                .cgpa(cgpa != null ? round2(cgpa) : null)
                .classification(classification)
                .totalTermsCompleted(termDtos.size())
                .build();
    }

    // ================================================================
    // PRIVATE HELPERS
    // ================================================================

    private TranscriptDto.TermTranscriptDto buildTermTranscriptDto(
            TermResult tr, Long studentId) {

        String termName = switch (tr.getTerm().getTermType()) {
            case TERM_1 -> "Term 1";
            case TERM_2 -> "Term 2";
            case TERM_3 -> "Term 3";
        };
        String termLabel = termName + " — " + tr.getTerm().getAcademicYear().getYearLabel();

        List<Score> scores = scoreRepository.findByStudentIdAndTermId(studentId, tr.getTerm().getId());
        List<TranscriptDto.SubjectScoreDto> subjectDtos = scores.stream()
                .sorted(Comparator.comparing(s -> s.getSubject().getName()))
                .map(this::toSubjectScoreDto)
                .collect(Collectors.toList());

        return TranscriptDto.TermTranscriptDto.builder()
                .termLabel(termLabel)
                .yearGroup(tr.getYearGroup())
                .className(tr.getClassRoom() != null ? tr.getClassRoom().getDisplayName() : null)
                .subjects(subjectDtos)
                .gpa(tr.getGpa())
                .position(tr.getPositionInClass())
                .totalStudents(tr.getTotalStudentsInClass())
                .conductRating(tr.getConductRating())
                .classTeacherRemarks(tr.getClassTeacherRemarks())
                .attendancePercentage(tr.getAttendancePercentage())
                .totalDaysPresent(tr.getTotalDaysPresent())
                .totalDaysAbsent(tr.getTotalDaysAbsent())
                .build();
    }

    private TranscriptDto.SubjectScoreDto toSubjectScoreDto(Score score) {
        return TranscriptDto.SubjectScoreDto.builder()
                .subjectName(score.getSubject().getName())
                .subjectCode(score.getSubject().getSubjectCode())
                .classScore(score.getClassScore())
                .examScore(score.getExamScore())
                .totalScore(score.getTotalScore())
                .grade(score.getGrade())
                .gradePoint(score.getGradePoint())
                .remarks(score.getRemarks())
                .isAbsent(score.isAbsent())
                .build();
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
