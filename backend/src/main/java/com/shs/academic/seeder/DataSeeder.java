package com.shs.academic.seeder;

import com.shs.academic.model.entity.Program;
import com.shs.academic.model.entity.ProgramSubject;
import com.shs.academic.model.entity.School;
import com.shs.academic.model.entity.Subject;
import com.shs.academic.model.enums.ProgramType;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.repository.ProgramRepository;
import com.shs.academic.repository.ProgramSubjectRepository;
import com.shs.academic.repository.SchoolRepository;
import com.shs.academic.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
// @Component  // Disabled — enable manually when seed data is needed
@Profile({"dev", "demo"})
@Order(5)
@RequiredArgsConstructor
public class DataSeeder implements ApplicationListener<ContextRefreshedEvent> {

    private final SchoolRepository schoolRepository;
    private final SubjectRepository subjectRepository;
    private final ProgramRepository programRepository;
    private final ProgramSubjectRepository programSubjectRepository;

    private static volatile boolean alreadyRun = false;

    @Override
    @Transactional
    public void onApplicationEvent(ContextRefreshedEvent event) {
        if (alreadyRun) return;
        alreadyRun = true;
        if (subjectRepository.count() > 0) {
            log.info("Subjects already seeded, skipping data seeder");
            return;
        }

        Optional<School> schoolOpt = schoolRepository.findFirstByIsActiveTrue();
        if (schoolOpt.isEmpty()) {
            log.warn("No active school found. Creating default school for seeding...");
            School defaultSchool = School.builder()
                    .schoolCode("GES-SCH-001")
                    .name("Default SHS")
                    .region("Greater Accra")
                    .district("Accra Metropolitan")
                    .isActive(true)
                    .build();
            schoolOpt = Optional.of(schoolRepository.save(defaultSchool));
            log.info("Default school created: {}", defaultSchool.getName());
        }

        School school = schoolOpt.get();
        log.info("Seeding programs and subjects for school: {}", school.getName());

        // Core subjects (shared across all programs)
        Map<String, Subject> subjectMap = new HashMap<>();
        subjectMap.put("Mathematics", createSubject("MATH-01", "Mathematics", true, false, school));
        subjectMap.put("English Language", createSubject("ENG-01", "English Language", true, false, school));
        subjectMap.put("Integrated Science", createSubject("SCI-01", "Integrated Science", true, false, school));
        subjectMap.put("Social Studies", createSubject("SOC-01", "Social Studies", true, false, school));

        // Elective subjects
        subjectMap.put("Physics", createSubject("PHY-01", "Physics", false, true, school));
        subjectMap.put("Chemistry", createSubject("CHM-01", "Chemistry", false, true, school));
        subjectMap.put("Biology", createSubject("BIO-01", "Biology", false, true, school));
        subjectMap.put("Elective Mathematics", createSubject("EMATH-01", "Elective Mathematics", false, true, school));
        subjectMap.put("Literature", createSubject("LIT-01", "Literature", false, true, school));
        subjectMap.put("Government", createSubject("GOV-01", "Government", false, true, school));
        subjectMap.put("Economics", createSubject("ECO-01", "Economics", false, true, school));
        subjectMap.put("French", createSubject("FRE-01", "French", false, true, school));
        subjectMap.put("History", createSubject("HIS-01", "History", false, true, school));
        subjectMap.put("Business Management", createSubject("BM-01", "Business Management", false, true, school));
        subjectMap.put("Accounting", createSubject("ACC-01", "Accounting", false, true, school));
        subjectMap.put("Picture Making", createSubject("PM-01", "Picture Making", false, true, school));
        subjectMap.put("Sculpture", createSubject("SCU-01", "Sculpture", false, true, school));
        subjectMap.put("Ceramics", createSubject("CER-01", "Ceramics", false, true, school));
        subjectMap.put("Graphic Design", createSubject("GD-01", "Graphic Design", false, true, school));
        subjectMap.put("Food & Nutrition", createSubject("FN-01", "Food & Nutrition", false, true, school));
        subjectMap.put("Clothing & Textiles", createSubject("CT-01", "Clothing & Textiles", false, true, school));
        subjectMap.put("Management in Living", createSubject("MIL-01", "Management in Living", false, true, school));
        subjectMap.put("Animal Husbandry", createSubject("AH-01", "Animal Husbandry", false, true, school));
        subjectMap.put("Crop Science", createSubject("CS-01", "Crop Science", false, true, school));
        subjectMap.put("Agricultural Economics", createSubject("AGEC-01", "Agricultural Economics", false, true, school));

        subjectRepository.saveAll(subjectMap.values());
        log.info("Seeded {} subjects", subjectMap.size());

        // Define program → subject mappings
        Map<ProgramType, ProgramConfig> programConfigs = new LinkedHashMap<>();

        programConfigs.put(ProgramType.GENERAL_SCIENCE, new ProgramConfig(
                "General Science",
                "Science-focused program covering Physics, Chemistry, Biology and Elective Mathematics",
                List.of("Mathematics", "English Language", "Integrated Science", "Social Studies"),
                List.of("Physics", "Chemistry", "Biology", "Elective Mathematics")
        ));

        programConfigs.put(ProgramType.GENERAL_ARTS, new ProgramConfig(
                "General Arts",
                "Arts-focused program covering Literature, Government, Economics and Languages",
                List.of("Mathematics", "English Language", "Social Studies"),
                List.of("Literature", "Government", "Economics", "French", "History")
        ));

        programConfigs.put(ProgramType.BUSINESS, new ProgramConfig(
                "Business",
                "Business-oriented program covering Management, Accounting and Economics",
                List.of("Mathematics", "English Language", "Social Studies"),
                List.of("Business Management", "Accounting", "Economics", "Elective Mathematics")
        ));

        programConfigs.put(ProgramType.VISUAL_ARTS, new ProgramConfig(
                "Visual Arts",
                "Creative arts program covering Picture Making, Sculpture, Ceramics and Graphic Design",
                List.of("Mathematics", "English Language", "Social Studies"),
                List.of("Picture Making", "Sculpture", "Ceramics", "Graphic Design")
        ));

        programConfigs.put(ProgramType.HOME_ECONOMICS, new ProgramConfig(
                "Home Economics",
                "Home science program covering Food & Nutrition, Clothing & Textiles and Management in Living",
                List.of("Mathematics", "English Language", "Social Studies"),
                List.of("Food & Nutrition", "Clothing & Textiles", "Management in Living")
        ));

        programConfigs.put(ProgramType.AGRICULTURAL_SCIENCE, new ProgramConfig(
                "Agricultural Science",
                "Agriculture-focused program covering Animal Husbandry, Crop Science and Agricultural Economics",
                List.of("Mathematics", "English Language", "Social Studies"),
                List.of("Animal Husbandry", "Crop Science", "Agricultural Economics")
        ));

        for (Map.Entry<ProgramType, ProgramConfig> entry : programConfigs.entrySet()) {
            ProgramType type = entry.getKey();
            ProgramConfig config = entry.getValue();

            Program program = Program.builder()
                    .programType(type)
                    .displayName(config.displayName)
                    .description(config.description)
                    .school(school)
                    .isActive(true)
                    .build();
            program = programRepository.save(program);

            // Map core subjects as compulsory for all year groups
            for (String subjectName : config.coreSubjects) {
                Subject subject = subjectMap.get(subjectName);
                for (YearGroup yg : YearGroup.values()) {
                    programSubjectRepository.save(ProgramSubject.builder()
                            .program(program)
                            .subject(subject)
                            .yearGroup(yg)
                            .isCompulsory(true)
                            .build());
                }
            }

            // Map elective subjects for all year groups
            for (String subjectName : config.electiveSubjects) {
                Subject subject = subjectMap.get(subjectName);
                for (YearGroup yg : YearGroup.values()) {
                    programSubjectRepository.save(ProgramSubject.builder()
                            .program(program)
                            .subject(subject)
                            .yearGroup(yg)
                            .isCompulsory(false)
                            .build());
                }
            }

            log.info("Seeded program: {} with {} core + {} elective subjects",
                    config.displayName, config.coreSubjects.size(), config.electiveSubjects.size());
        }

        log.info("Data seeding completed successfully!");
    }

    private Subject createSubject(String code, String name, boolean isCore, boolean isElective, School school) {
        return Subject.builder()
                .subjectCode(code)
                .name(name)
                .isCore(isCore)
                .isElective(isElective)
                .school(school)
                .isActive(true)
                .build();
    }

    private record ProgramConfig(
            String displayName,
            String description,
            List<String> coreSubjects,
            List<String> electiveSubjects
    ) {}
}
