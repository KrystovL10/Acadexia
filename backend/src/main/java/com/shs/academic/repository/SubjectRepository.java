package com.shs.academic.repository;

import com.shs.academic.model.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {

    List<Subject> findBySchoolId(Long schoolId);

    Optional<Subject> findBySubjectCodeAndSchoolId(String code, Long schoolId);
}
