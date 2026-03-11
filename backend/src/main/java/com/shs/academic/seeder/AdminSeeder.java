package com.shs.academic.seeder;

import com.shs.academic.model.entity.AcademicYear;
import com.shs.academic.model.entity.School;
import com.shs.academic.model.entity.Term;
import com.shs.academic.model.entity.User;
import com.shs.academic.model.enums.TermType;
import com.shs.academic.model.enums.UserRole;
import com.shs.academic.repository.AcademicYearRepository;
import com.shs.academic.repository.SchoolRepository;
import com.shs.academic.repository.TermRepository;
import com.shs.academic.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
// @Component  // Disabled — enable manually when initial seed data is needed
@Order(1)
@RequiredArgsConstructor
public class AdminSeeder implements ApplicationListener<ContextRefreshedEvent> {

    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final AcademicYearRepository academicYearRepository;
    private final TermRepository termRepository;
    private final PasswordEncoder passwordEncoder;

    private static volatile boolean alreadySeeded = false;

    @Override
    @Transactional
    public void onApplicationEvent(ContextRefreshedEvent event) {
        if (alreadySeeded) {
            return;
        }
        alreadySeeded = true;

        if (!userRepository.findByRole(UserRole.SUPER_ADMIN).isEmpty()) {
            log.info("Super Admin already exists, skipping admin seeder");
            return;
        }

        School school = seedSchool();
        seedAcademicYearAndTerms(school);
        seedSuperAdmin();

        log.info("\n==============================================\n"
                + "  DEFAULT ADMIN CREATED\n"
                + "  Email:    admin@shs.edu.gh\n"
                + "  PLEASE CHANGE PASSWORD AFTER FIRST LOGIN\n"
                + "==============================================");
    }

    private School seedSchool() {
        return schoolRepository.findFirstByIsActiveTrue()
                .orElseGet(() -> {
                    School school = School.builder()
                            .schoolCode("GES-SCH-001")
                            .name("Demo Senior High School")
                            .region("Greater Accra")
                            .district("Accra Metropolitan")
                            .headmasterName("The Headmaster")
                            .isActive(true)
                            .build();
                    school = schoolRepository.save(school);
                    log.info("Default school created: {}", school.getName());
                    return school;
                });
    }

    private void seedAcademicYearAndTerms(School school) {
        if (academicYearRepository.existsBySchoolIdAndYearLabel(school.getId(), "2024/2025")) {
            log.info("Academic year 2024/2025 already exists, skipping");
            return;
        }

        AcademicYear academicYear = AcademicYear.builder()
                .school(school)
                .yearLabel("2024/2025")
                .isCurrent(true)
                .build();
        academicYear = academicYearRepository.save(academicYear);
        log.info("Default academic year created: {}", academicYear.getYearLabel());

        for (TermType termType : TermType.values()) {
            Term term = Term.builder()
                    .academicYear(academicYear)
                    .termType(termType)
                    .isCurrent(termType == TermType.TERM_1)
                    .build();
            termRepository.save(term);
        }
        log.info("Default terms created: TERM_1 (current), TERM_2, TERM_3");
    }

    private void seedSuperAdmin() {
        // Never overwrite an existing admin's password
        if (userRepository.findByEmail("admin@shs.edu.gh").isPresent()) {
            log.info("Admin user already exists — skipping seedSuperAdmin");
            return;
        }
        User admin = User.builder()
                .userId("GES-ADM-0001")
                .firstName("System")
                .lastName("Administrator")
                .email("admin@shs.edu.gh")
                .password(passwordEncoder.encode("Admin@1234"))
                .role(UserRole.SUPER_ADMIN)
                .isActive(true)
                .isFirstLogin(true)
                .build();
        userRepository.save(admin);
    }
}
