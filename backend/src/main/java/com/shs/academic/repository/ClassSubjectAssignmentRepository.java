package com.shs.academic.repository;

import com.shs.academic.model.entity.ClassSubjectAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassSubjectAssignmentRepository extends JpaRepository<ClassSubjectAssignment, Long> {

    List<ClassSubjectAssignment> findByClassRoomId(Long classRoomId);

    List<ClassSubjectAssignment> findByTutorId(Long tutorId);

    List<ClassSubjectAssignment> findByTutorIdAndAcademicYearId(Long tutorId, Long yearId);

    Optional<ClassSubjectAssignment> findByClassRoomIdAndSubjectId(Long classRoomId, Long subjectId);

    boolean existsByTutorIdAndClassRoomIdAndSubjectIdAndIsActiveTrue(Long tutorId, Long classRoomId, Long subjectId);

    List<ClassSubjectAssignment> findByTutorIdAndIsActiveTrue(Long tutorId);

    List<ClassSubjectAssignment> findByClassRoomIdAndIsActiveTrue(Long classRoomId);
}
