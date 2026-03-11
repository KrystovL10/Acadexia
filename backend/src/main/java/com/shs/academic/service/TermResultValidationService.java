package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.ScoreCompletionStatusDto;
import com.shs.academic.model.dto.StudentSummaryDto;
import com.shs.academic.model.entity.*;
import com.shs.academic.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TermResultValidationService {

    private final ClassRoomRepository classRoomRepository;
    private final TermRepository termRepository;
    private final StudentRepository studentRepository;
    private final ScoreRepository scoreRepository;
    private final ClassSubjectAssignmentRepository classSubjectAssignmentRepository;

    /**
     * Check if all scores have been submitted for every student in a class for a term.
     */
    @Transactional(readOnly = true)
    public boolean allScoresSubmitted(Long classRoomId, Long termId) {
        ScoreCompletionStatusDto status = getScoreCompletionStatus(classRoomId, termId);
        return status.isAllComplete();
    }

    /**
     * Get detailed score completion status for a class and term.
     * For each subject assigned to this class, shows which students have/don't have scores.
     */
    @Transactional(readOnly = true)
    public ScoreCompletionStatusDto getScoreCompletionStatus(Long classRoomId, Long termId) {
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));

        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        // Get all active students in this class
        List<Student> students = studentRepository.findByCurrentClassId(classRoomId).stream()
                .filter(Student::isActive)
                .toList();

        // Get all active subject assignments for this class
        List<ClassSubjectAssignment> assignments =
                classSubjectAssignmentRepository.findByClassRoomIdAndIsActiveTrue(classRoomId);

        // Get all scores for this class and term
        List<Score> allScores = scoreRepository.findByClassRoomIdAndTermId(classRoomId, termId);

        // Build a set of (studentId, subjectId) pairs that have scores
        Set<String> scoredPairs = allScores.stream()
                .map(s -> s.getStudent().getId() + "_" + s.getSubject().getId())
                .collect(Collectors.toSet());

        List<ScoreCompletionStatusDto.SubjectCompletionDto> subjectCompletions = new ArrayList<>();
        int totalExpected = 0;
        int totalSubmitted = 0;

        for (ClassSubjectAssignment assignment : assignments) {
            Subject subject = assignment.getSubject();
            String tutorName = assignment.getTutor() != null
                    ? assignment.getTutor().getFullName() : "Unassigned";

            List<StudentSummaryDto> missingStudents = new ArrayList<>();
            int withScores = 0;
            int withoutScores = 0;

            for (Student student : students) {
                String key = student.getId() + "_" + subject.getId();
                if (scoredPairs.contains(key)) {
                    withScores++;
                } else {
                    withoutScores++;
                    missingStudents.add(StudentSummaryDto.fromEntity(student));
                }
            }

            totalExpected += students.size();
            totalSubmitted += withScores;

            subjectCompletions.add(ScoreCompletionStatusDto.SubjectCompletionDto.builder()
                    .subjectId(subject.getId())
                    .subjectName(subject.getName())
                    .tutorName(tutorName)
                    .studentsWithScores(withScores)
                    .studentsWithoutScores(withoutScores)
                    .missingStudents(missingStudents)
                    .build());
        }

        double completionPct = totalExpected > 0
                ? Math.round((totalSubmitted * 100.0 / totalExpected) * 100.0) / 100.0
                : 0.0;

        String termName = term.getTermType().name().replace("_", " ")
                + " \u2014 " + term.getAcademicYear().getYearLabel();

        return ScoreCompletionStatusDto.builder()
                .classRoomId(classRoomId)
                .className(classRoom.getDisplayName())
                .termId(termId)
                .termName(termName)
                .overallCompletionPercentage(completionPct)
                .allComplete(totalExpected > 0 && totalSubmitted == totalExpected)
                .totalStudents(students.size())
                .totalSubjects(assignments.size())
                .subjects(subjectCompletions)
                .build();
    }
}
