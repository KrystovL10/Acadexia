package com.shs.academic.util;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.exception.UnauthorizedException;
import com.shs.academic.model.entity.Student;
import com.shs.academic.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StudentOwnershipValidator {

    private final StudentRepository studentRepository;

    /**
     * Resolves and returns the Student entity for the given userId.
     * Ensures the student can only access their own data.
     */
    public Student resolveAndValidate(Long userId) {
        return studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student profile not found for userId=" + userId));
    }

    /**
     * Validates that the given studentId belongs to the user with userId.
     * Throws UnauthorizedException if ownership check fails.
     */
    public void validateStudentOwnership(Long userId, Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student not found: " + studentId));

        if (!student.getUser().getId().equals(userId)) {
            throw new UnauthorizedException(
                    "Access denied. You can only view your own academic records.");
        }
    }
}
