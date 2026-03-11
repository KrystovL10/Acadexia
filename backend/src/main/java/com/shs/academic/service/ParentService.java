package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.EarlyWarningDto;
import com.shs.academic.model.dto.StudentSummaryDto;
import com.shs.academic.model.dto.TermResultDto;
import com.shs.academic.model.entity.Student;
import com.shs.academic.model.entity.User;
import com.shs.academic.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParentService {

    private final StudentRepository studentRepository;
    private final GpaService gpaService;
    private final EarlyWarningService earlyWarningService;

    @Transactional(readOnly = true)
    public List<StudentSummaryDto> getMyChildren(User parent) {
        List<Student> children = studentRepository.findActiveByGuardianEmail(parent.getEmail());
        return children.stream()
                .map(StudentSummaryDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TermResultDto> getChildTermResults(User parent, Long studentId) {
        verifyChildAccess(parent, studentId);
        return gpaService.getStudentAllTermResults(studentId);
    }

    @Transactional(readOnly = true)
    public List<EarlyWarningDto> getChildWarnings(User parent, Long studentId) {
        verifyChildAccess(parent, studentId);
        return earlyWarningService.getStudentWarnings(studentId);
    }

    private void verifyChildAccess(User parent, Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));
        if (student.getGuardianEmail() == null
                || !parent.getEmail().equalsIgnoreCase(student.getGuardianEmail())) {
            throw new AccessDeniedException("You do not have access to this student's records");
        }
    }
}
