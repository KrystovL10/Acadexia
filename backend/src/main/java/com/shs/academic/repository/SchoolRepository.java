package com.shs.academic.repository;

import com.shs.academic.model.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SchoolRepository extends JpaRepository<School, Long> {

    Optional<School> findBySchoolCode(String code);

    Optional<School> findFirstByIsActiveTrue();

    boolean existsBySchoolCode(String code);
}
