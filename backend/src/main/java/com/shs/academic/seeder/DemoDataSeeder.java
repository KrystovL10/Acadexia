package com.shs.academic.seeder;

import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.*;
import com.shs.academic.repository.*;
import com.shs.academic.service.EarlyWarningService;
import com.shs.academic.service.GpaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Comprehensive demo data seeder for the Ghana SHS Academic Management System.
 * Only runs with the "demo" profile: spring.profiles.active=demo
 * Seeds realistic Ghanaian SHS data for testing and demonstration.
 */
@Slf4j
@Component
@Profile("demo")
@Order(10) // Run after AdminSeeder (1) and DataSeeder
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationListener<ContextRefreshedEvent> {

    private final SchoolRepository schoolRepository;
    private final AcademicYearRepository academicYearRepository;
    private final TermRepository termRepository;
    private final ProgramRepository programRepository;
    private final SubjectRepository subjectRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassSubjectAssignmentRepository classSubjectAssignmentRepository;
    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final StudentEnrollmentRepository studentEnrollmentRepository;
    private final ScoreRepository scoreRepository;
    private final AttendanceRepository attendanceRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final GpaService gpaService;
    private final EarlyWarningService earlyWarningService;

    private static volatile boolean alreadySeeded = false;

    // Shared references
    private School school;
    private AcademicYear currentYear;
    private Term term1;
    private Map<String, Subject> subjectMap;
    private final Random random = new Random(42); // Fixed seed for reproducibility

    @Override
    @Transactional
    public void onApplicationEvent(ContextRefreshedEvent event) {
        if (alreadySeeded) return;
        alreadySeeded = true;

        // Only seed if no students exist
        if (studentRepository.count() > 0) {
            log.info("Students already exist, skipping demo data seeder");
            return;
        }

        log.info("\n" + "=".repeat(60) + "\n  DEMO DATA SEEDER — Starting...\n" + "=".repeat(60));

        long start = System.currentTimeMillis();

        seedSchool();
        seedAcademicYears();
        loadSubjects();
        Map<String, Program> programs = loadPrograms();
        Map<String, ClassRoom> classes = seedClasses(programs);
        Map<String, User> teacherUsers = seedTeachers(classes);
        seedSubjectAssignments(classes, teacherUsers);
        List<Student> students = seedStudents(classes.get("SHS 2 Science A"), programs.get("General Science"));
        seedScores(students, classes.get("SHS 2 Science A"), teacherUsers);
        generateTermResults(classes.get("SHS 2 Science A"));
        generateWarnings();
        seedAttendance(students, classes.get("SHS 2 Science A"));
        seedBehaviorLogs(students, classes.get("SHS 2 Science A"), teacherUsers.get("akosua.mensah"));

        long elapsed = (System.currentTimeMillis() - start) / 1000;

        printCredentials();
        log.info("\n  Demo data seeding completed in {}s\n" + "=".repeat(60), elapsed);
    }

    // ─── 1. SCHOOL ────────────────────────────────────────────────

    private void seedSchool() {
        school = schoolRepository.findFirstByIsActiveTrue().orElse(null);
        if (school != null) {
            // Update existing school for demo
            school.setName("Accra Academy Senior High School");
            school.setSchoolCode("GES-SCH-001");
            school.setRegion("Greater Accra");
            school.setDistrict("Accra Metropolitan");
            school.setHeadmasterName("Mr. Emmanuel Boateng");
            school.setMotto("Knowledge is Power");
            school = schoolRepository.save(school);
        } else {
            school = schoolRepository.save(School.builder()
                    .schoolCode("GES-SCH-001")
                    .name("Accra Academy Senior High School")
                    .region("Greater Accra")
                    .district("Accra Metropolitan")
                    .headmasterName("Mr. Emmanuel Boateng")
                    .motto("Knowledge is Power")
                    .isActive(true)
                    .build());
        }
        log.info("  School: {}", school.getName());

        // Update admin user for demo
        userRepository.findByEmail("admin@shs.edu.gh").ifPresent(admin -> {
            admin.setEmail("admin@accraacademy.edu.gh");
            admin.setPassword(passwordEncoder.encode("Admin@2024"));
            admin.setFirstLogin(false);
            userRepository.save(admin);
        });
    }

    // ─── 2-3. ACADEMIC YEARS & TERMS ──────────────────────────────

    private void seedAcademicYears() {
        // Past years
        seedYear("2022/2023", false);
        seedYear("2023/2024", false);

        // Current year
        currentYear = academicYearRepository.findBySchoolIdAndIsCurrentTrue(school.getId())
                .orElseGet(() -> seedYear("2024/2025", true));

        // Ensure terms for current year
        List<Term> terms = termRepository.findByAcademicYearId(currentYear.getId());
        if (terms.isEmpty()) {
            term1 = termRepository.save(Term.builder()
                    .academicYear(currentYear).termType(TermType.TERM_1)
                    .startDate(LocalDate.of(2024, 9, 9)).endDate(LocalDate.of(2024, 12, 20))
                    .isCurrent(true).isScoresLocked(false).build());
            termRepository.save(Term.builder()
                    .academicYear(currentYear).termType(TermType.TERM_2)
                    .startDate(LocalDate.of(2025, 1, 6)).endDate(LocalDate.of(2025, 4, 11))
                    .isCurrent(false).build());
            termRepository.save(Term.builder()
                    .academicYear(currentYear).termType(TermType.TERM_3)
                    .startDate(LocalDate.of(2025, 5, 5)).endDate(LocalDate.of(2025, 8, 1))
                    .isCurrent(false).build());
        } else {
            term1 = terms.stream()
                    .filter(t -> t.getTermType() == TermType.TERM_1)
                    .findFirst().orElse(terms.get(0));
        }
        log.info("  Academic Year: {} | Current Term: {}", currentYear.getYearLabel(), term1.getTermType());
    }

    private AcademicYear seedYear(String label, boolean isCurrent) {
        return academicYearRepository.findBySchoolIdAndIsCurrentTrue(school.getId())
                .filter(y -> y.getYearLabel().equals(label))
                .orElseGet(() -> {
                    if (!academicYearRepository.existsBySchoolIdAndYearLabel(school.getId(), label)) {
                        return academicYearRepository.save(AcademicYear.builder()
                                .school(school).yearLabel(label).isCurrent(isCurrent).build());
                    }
                    return null;
                });
    }

    // ─── 4. LOAD SUBJECTS & PROGRAMS ──────────────────────────────

    private void loadSubjects() {
        subjectMap = new HashMap<>();
        subjectRepository.findBySchoolId(school.getId()).forEach(s -> subjectMap.put(s.getName(), s));
        log.info("  Loaded {} subjects", subjectMap.size());
    }

    private Map<String, Program> loadPrograms() {
        Map<String, Program> programs = new HashMap<>();
        programRepository.findBySchoolIdAndIsActive(school.getId(), true)
                .forEach(p -> programs.put(p.getDisplayName(), p));
        log.info("  Loaded {} programs", programs.size());
        return programs;
    }

    // ─── 5. CLASSES ───────────────────────────────────────────────

    private Map<String, ClassRoom> seedClasses(Map<String, Program> programs) {
        Map<String, ClassRoom> classes = new LinkedHashMap<>();

        // SHS 1
        classes.put("SHS 1 Science A", createClass("SHS1-SCI-A", "SHS 1 Science A", YearGroup.SHS1, programs.get("General Science"), 40));
        classes.put("SHS 1 Arts A", createClass("SHS1-ART-A", "SHS 1 Arts A", YearGroup.SHS1, programs.get("General Arts"), 35));
        classes.put("SHS 1 Business A", createClass("SHS1-BUS-A", "SHS 1 Business A", YearGroup.SHS1, programs.get("Business"), 38));

        // SHS 2
        classes.put("SHS 2 Science A", createClass("SHS2-SCI-A", "SHS 2 Science A", YearGroup.SHS2, programs.get("General Science"), 38));
        classes.put("SHS 2 Science B", createClass("SHS2-SCI-B", "SHS 2 Science B", YearGroup.SHS2, programs.get("General Science"), 36));
        classes.put("SHS 2 Arts A", createClass("SHS2-ART-A", "SHS 2 Arts A", YearGroup.SHS2, programs.get("General Arts"), 32));

        // SHS 3
        classes.put("SHS 3 Science A", createClass("SHS3-SCI-A", "SHS 3 Science A", YearGroup.SHS3, programs.get("General Science"), 35));
        classes.put("SHS 3 Arts A", createClass("SHS3-ART-A", "SHS 3 Arts A", YearGroup.SHS3, programs.get("General Arts"), 30));

        log.info("  Created {} classes", classes.size());
        return classes;
    }

    private ClassRoom createClass(String code, String name, YearGroup yg, Program program, int capacity) {
        return classRoomRepository.save(ClassRoom.builder()
                .classCode(code).displayName(name).yearGroup(yg)
                .program(program).school(school).academicYear(currentYear)
                .capacity(capacity).isActive(true).build());
    }

    // ─── 6. TEACHERS ──────────────────────────────────────────────

    private Map<String, User> seedTeachers(Map<String, ClassRoom> classes) {
        Map<String, User> teacherUsers = new LinkedHashMap<>();
        String encodedPwd = passwordEncoder.encode("Teacher@1234");

        // Class Teachers
        teacherUsers.put("akosua.mensah", createTeacherWithClass(
                "Akosua", "Mensah", "akosua.mensah@staff.accraacademy.edu.gh",
                "TCH-2024-001", "Science", encodedPwd, classes.get("SHS 2 Science A")));
        teacherUsers.put("kweku.asante", createTeacherWithClass(
                "Kweku", "Asante", "kweku.asante@staff.accraacademy.edu.gh",
                "TCH-2024-002", "Science", encodedPwd, classes.get("SHS 2 Science B")));
        teacherUsers.put("abena.osei", createTeacherWithClass(
                "Abena", "Osei", "abena.osei@staff.accraacademy.edu.gh",
                "TCH-2024-003", "Science", encodedPwd, classes.get("SHS 1 Science A")));
        teacherUsers.put("emmanuel.darko", createTeacherWithClass(
                "Emmanuel", "Darko", "emmanuel.darko@staff.accraacademy.edu.gh",
                "TCH-2024-004", "Science", encodedPwd, classes.get("SHS 3 Science A")));
        teacherUsers.put("comfort.boateng", createTeacherWithClass(
                "Comfort", "Boateng", "comfort.boateng@staff.accraacademy.edu.gh",
                "TCH-2024-005", "Arts", encodedPwd, classes.get("SHS 2 Arts A")));
        teacherUsers.put("yaw.owusu", createTeacherWithClass(
                "Yaw", "Owusu", "yaw.owusu@staff.accraacademy.edu.gh",
                "TCH-2024-006", "Arts", encodedPwd, classes.get("SHS 1 Arts A")));

        // Subject Tutors
        teacherUsers.put("benjamin.agyei", createTutor(
                "Benjamin", "Agyei", "benjamin.agyei@staff.accraacademy.edu.gh",
                "TUT-2024-001", "Physics", encodedPwd));
        teacherUsers.put("adwoa.frimpong", createTutor(
                "Adwoa", "Frimpong", "adwoa.frimpong@staff.accraacademy.edu.gh",
                "TUT-2024-002", "Chemistry", encodedPwd));
        teacherUsers.put("kofi.nkrumah", createTutor(
                "Kofi", "Nkrumah", "kofi.nkrumah@staff.accraacademy.edu.gh",
                "TUT-2024-003", "Mathematics", encodedPwd));
        teacherUsers.put("grace.asamoah", createTutor(
                "Grace", "Asamoah", "grace.asamoah@staff.accraacademy.edu.gh",
                "TUT-2024-004", "English", encodedPwd));
        teacherUsers.put("samuel.oppong", createTutor(
                "Samuel", "Oppong", "samuel.oppong@staff.accraacademy.edu.gh",
                "TUT-2024-005", "Biology", encodedPwd));
        teacherUsers.put("ama.asiedu", createTutor(
                "Ama", "Asiedu", "ama.asiedu@staff.accraacademy.edu.gh",
                "TUT-2024-006", "Economics", encodedPwd));

        log.info("  Created {} teachers (6 class teachers + 6 tutors)", teacherUsers.size());
        return teacherUsers;
    }

    private User createTeacherWithClass(String first, String last, String email,
                                         String staffId, String dept, String pwd, ClassRoom classRoom) {
        User user = userRepository.save(User.builder()
                .userId("GES-" + staffId).firstName(first).lastName(last).email(email)
                .password(pwd).role(UserRole.CLASS_TEACHER)
                .isActive(true).isFirstLogin(false).build());

        Teacher teacher = teacherRepository.save(Teacher.builder()
                .user(user).staffId(staffId).department(dept)
                .school(school).isClassTeacher(true).assignedClass(classRoom)
                .isActive(true).dateJoined(LocalDate.of(2022, 9, 1)).build());

        // Set class teacher on classroom
        classRoom.setClassTeacher(user);
        classRoomRepository.save(classRoom);

        return user;
    }

    private User createTutor(String first, String last, String email,
                              String staffId, String dept, String pwd) {
        User user = userRepository.save(User.builder()
                .userId("GES-" + staffId).firstName(first).lastName(last).email(email)
                .password(pwd).role(UserRole.TUTOR)
                .isActive(true).isFirstLogin(false).build());

        teacherRepository.save(Teacher.builder()
                .user(user).staffId(staffId).department(dept)
                .school(school).isClassTeacher(false)
                .isActive(true).dateJoined(LocalDate.of(2023, 9, 1)).build());

        return user;
    }

    // ─── SUBJECT ASSIGNMENTS ──────────────────────────────────────

    private void seedSubjectAssignments(Map<String, ClassRoom> classes, Map<String, User> teachers) {
        // Physics: Benjamin Agyei → SHS2 Science A, SHS2 Science B
        assignSubject(classes.get("SHS 2 Science A"), "Physics", teachers.get("benjamin.agyei"));
        assignSubject(classes.get("SHS 2 Science B"), "Physics", teachers.get("benjamin.agyei"));

        // Chemistry: Adwoa Frimpong → SHS2 Science A, SHS1 Science A
        assignSubject(classes.get("SHS 2 Science A"), "Chemistry", teachers.get("adwoa.frimpong"));
        assignSubject(classes.get("SHS 1 Science A"), "Chemistry", teachers.get("adwoa.frimpong"));

        // Mathematics: Kofi Nkrumah → All Science classes
        for (String name : List.of("SHS 1 Science A", "SHS 2 Science A", "SHS 2 Science B", "SHS 3 Science A")) {
            assignSubject(classes.get(name), "Mathematics", teachers.get("kofi.nkrumah"));
        }

        // English: Grace Asamoah → SHS2 Science A, SHS2 Arts A
        assignSubject(classes.get("SHS 2 Science A"), "English Language", teachers.get("grace.asamoah"));
        assignSubject(classes.get("SHS 2 Arts A"), "English Language", teachers.get("grace.asamoah"));

        // Biology: Samuel Oppong → SHS2 Science A, SHS3 Science A
        assignSubject(classes.get("SHS 2 Science A"), "Biology", teachers.get("samuel.oppong"));
        assignSubject(classes.get("SHS 3 Science A"), "Biology", teachers.get("samuel.oppong"));

        // Economics: Ama Asiedu → SHS2 Arts A
        assignSubject(classes.get("SHS 2 Arts A"), "Economics", teachers.get("ama.asiedu"));

        // Also assign core subjects to SHS 2 Science A (for complete score entry)
        assignSubject(classes.get("SHS 2 Science A"), "Integrated Science", teachers.get("samuel.oppong"));
        assignSubject(classes.get("SHS 2 Science A"), "Social Studies", teachers.get("grace.asamoah"));
        assignSubject(classes.get("SHS 2 Science A"), "Elective Mathematics", teachers.get("kofi.nkrumah"));

        log.info("  Created subject-class-tutor assignments");
    }

    private void assignSubject(ClassRoom classroom, String subjectName, User tutor) {
        Subject subject = subjectMap.get(subjectName);
        if (subject == null) {
            log.warn("  Subject not found: {}", subjectName);
            return;
        }
        classSubjectAssignmentRepository.save(ClassSubjectAssignment.builder()
                .classRoom(classroom).subject(subject).tutor(tutor)
                .academicYear(currentYear).isActive(true).build());
    }

    // ─── 7. STUDENTS ──────────────────────────────────────────────

    private List<Student> seedStudents(ClassRoom shs2SciA, Program genScience) {
        String encodedPwd; // Each student's password = their studentIndex
        List<Student> students = new ArrayList<>();

        String[][] studentData = {
                // firstName, lastName, studentIndex, gender, hometown, guardianName, guardianPhone
                {"Kwame", "Asante Boateng", "0240023401", "Male", "Accra", "Mr. Kofi Boateng", "0244567801"},
                {"Ama", "Serwaa Mensah", "0240023402", "Female", "Kumasi", "Mrs. Akua Mensah", "0244567802"},
                {"Kojo", "Emmanuel Darko", "0240023403", "Male", "Tema", "Mr. James Darko", "0244567803"},
                {"Akosua", "Patience Frimpong", "0240023404", "Female", "Takoradi", "Mrs. Grace Frimpong", "0244567804"},
                {"Yaw", "Nana Asare", "0240023405", "Male", "Koforidua", "Mr. Nana Asare", "0244567805"},
                {"Adwoa", "Gifty Owusu", "0240023406", "Female", "Cape Coast", "Mrs. Comfort Owusu", "0244567806"},
                {"Kwesi", "Daniel Amponsah", "0240023407", "Male", "Tamale", "Mr. Daniel Amponsah", "0244567807"},
                {"Abena", "Victoria Okyere", "0240023408", "Female", "Sunyani", "Mrs. Victoria Okyere", "0244567808"},
                {"Kofi", "Bright Adu", "0240023409", "Male", "Ho", "Mr. Bright Adu", "0244567809"},
                {"Efua", "Millicent Ankrah", "0240023410", "Female", "Bolgatanga", "Mrs. Millicent Ankrah", "0244567810"},
                {"Kwabena", "Isaac Tetteh", "0240023411", "Male", "Accra", "Mr. Isaac Tetteh", "0244567811"},
                {"Akua", "Beatrice Antwi", "0240023412", "Female", "Kumasi", "Mrs. Beatrice Antwi", "0244567812"},
                {"Yaw", "Prince Adjei", "0240023413", "Male", "Tema", "Mr. Prince Adjei", "0244567813"},
                {"Esi", "Comfort Appiah", "0240023414", "Female", "Takoradi", "Mrs. Comfort Appiah", "0244567814"},
                {"Kwame", "Solomon Mensah", "0240023415", "Male", "Koforidua", "Mr. Solomon Mensah", "0244567815"},
                {"Afia", "Priscilla Boakye", "0240023416", "Female", "Cape Coast", "Mrs. Priscilla Boakye", "0244567816"},
                {"Kojo", "Michael Amoah", "0240023417", "Male", "Wa", "Mr. Michael Amoah", "0244567817"},
                {"Adwoa", "Felicia Ofori", "0240023418", "Female", "Accra", "Mrs. Felicia Ofori", "0244567818"},
                {"Kofi", "Stephen Gyamfi", "0240023419", "Male", "Kumasi", "Mr. Stephen Gyamfi", "0244567819"},
                {"Ama", "Gladys Acheampong", "0240023420", "Female", "Tema", "Mrs. Gladys Acheampong", "0244567820"},
                {"Kwesi", "Robert Oduro", "0240023421", "Male", "Sunyani", "Mr. Robert Oduro", "0244567821"},
                {"Akosua", "Mercy Nyarko", "0240023422", "Female", "Tamale", "Mrs. Mercy Nyarko", "0244567822"},
                {"Yaw", "Frederick Asiedu", "0240023423", "Male", "Ho", "Mr. Frederick Asiedu", "0244567823"},
                {"Efua", "Diana Quaye", "0240023424", "Female", "Bolgatanga", "Mrs. Diana Quaye", "0244567824"},
                {"Kwabena", "Emmanuel Sackey", "0240023425", "Male", "Accra", "Mr. Emmanuel Sackey", "0244567825"},
                {"Akua", "Josephine Anim", "0240023426", "Female", "Kumasi", "Mrs. Josephine Anim", "0244567826"},
                {"Kojo", "Augustine Mensah", "0240023427", "Male", "Cape Coast", "Mr. Augustine Mensah", "0244567827"},
                {"Abena", "Rebecca Owusu", "0240023428", "Female", "Takoradi", "Mrs. Rebecca Owusu", "0244567828"},
                {"Kofi", "Williams Baffour", "0240023429", "Male", "Tema", "Mr. Williams Baffour", "0244567829"},
                {"Esi", "Charlotte Opoku", "0240023430", "Female", "Accra", "Mrs. Charlotte Opoku", "0244567830"},
                {"Kwame", "Patrick Asante", "0240023431", "Male", "Kumasi", "Mr. Patrick Asante", "0244567831"},
                {"Afia", "Esther Danquah", "0240023432", "Female", "Koforidua", "Mrs. Esther Danquah", "0244567832"},
                {"Yaw", "Benjamin Agyeman", "0240023433", "Male", "Sunyani", "Mr. Benjamin Agyeman", "0244567833"},
                {"Adwoa", "Martha Adomako", "0240023434", "Female", "Ho", "Mrs. Martha Adomako", "0244567834"},
                {"Kwesi", "Richard Oti", "0240023435", "Male", "Tamale", "Mr. Richard Oti", "0244567835"},
        };

        for (String[] data : studentData) {
            encodedPwd = passwordEncoder.encode(data[2]); // password = studentIndex
            String emailPrefix = (data[0] + "." + data[1].split(" ")[data[1].split(" ").length - 1]).toLowerCase();

            User user = userRepository.save(User.builder()
                    .userId("GES-STD-" + data[2].substring(data[2].length() - 4))
                    .firstName(data[0]).lastName(data[1])
                    .email(emailPrefix + "@student.accraacademy.edu.gh")
                    .password(encodedPwd).role(UserRole.STUDENT)
                    .isActive(true).isFirstLogin(false).build());

            Student student = studentRepository.save(Student.builder()
                    .user(user).studentIndex(data[2])
                    .dateOfBirth(randomDob())
                    .gender(data[3]).nationality("Ghanaian").hometown(data[4])
                    .residentialAddress(data[4] + ", Ghana")
                    .guardianName(data[5]).guardianPhone(data[6])
                    .guardianRelationship(data[3].equals("Male") ? "Father" : "Mother")
                    .beceAggregate(randomBece()).beceYear("2023")
                    .admissionDate(LocalDate.of(2023, 9, 1))
                    .school(school).currentYearGroup(YearGroup.SHS2)
                    .currentProgram(genScience).currentClass(shs2SciA)
                    .isActive(true).hasGraduated(false).build());

            // Enrollment
            studentEnrollmentRepository.save(StudentEnrollment.builder()
                    .student(student).classRoom(shs2SciA)
                    .academicYear(currentYear).yearGroup(YearGroup.SHS2)
                    .enrollmentDate(LocalDate.of(2024, 9, 9))
                    .isRepeating(false).build());

            students.add(student);
        }

        log.info("  Created {} students in SHS 2 Science A", students.size());
        return students;
    }

    // ─── 8. SCORES ────────────────────────────────────────────────

    private void seedScores(List<Student> students, ClassRoom classroom, Map<String, User> teachers) {
        // 8 subjects for General Science
        String[] subjects = {
                "Mathematics", "English Language", "Physics", "Chemistry",
                "Biology", "Integrated Science", "Social Studies", "Elective Mathematics"
        };

        // Map subjects to their tutors (for enteredBy)
        Map<String, User> subjectTutors = Map.of(
                "Mathematics", teachers.get("kofi.nkrumah"),
                "English Language", teachers.get("grace.asamoah"),
                "Physics", teachers.get("benjamin.agyei"),
                "Chemistry", teachers.get("adwoa.frimpong"),
                "Biology", teachers.get("samuel.oppong"),
                "Integrated Science", teachers.get("samuel.oppong"),
                "Social Studies", teachers.get("grace.asamoah"),
                "Elective Mathematics", teachers.get("kofi.nkrumah")
        );

        /*
         * Student tiers for realistic distribution:
         *  0-4   (5 students)  → Excellent: class 25-30, exam 50-65
         *  5-14  (10 students) → Good:      class 20-28, exam 40-55
         *  15-26 (12 students) → Average:   class 15-24, exam 30-45
         *  27-32 (6 students)  → Struggling: class 8-18, exam 20-38
         *  33-34 (2 students)  → At-risk:   class 5-14, exam 10-30
         */

        int scoreCount = 0;
        for (int i = 0; i < students.size(); i++) {
            Student student = students.get(i);

            for (String subjectName : subjects) {
                Subject subject = subjectMap.get(subjectName);
                if (subject == null) continue;

                User tutor = subjectTutors.getOrDefault(subjectName, teachers.get("kofi.nkrumah"));
                int[] range = getScoreRange(i);

                double classScore = range[0] + random.nextInt(range[1] - range[0] + 1);
                double examScore = range[2] + random.nextInt(range[3] - range[2] + 1);

                // Add some subject-specific variation
                if (subjectName.equals("Mathematics") || subjectName.equals("Elective Mathematics")) {
                    // Math tends to have more variation
                    classScore = Math.max(0, classScore + random.nextInt(5) - 3);
                    examScore = Math.max(0, examScore + random.nextInt(8) - 4);
                }

                classScore = Math.min(30, Math.max(0, classScore));
                examScore = Math.min(70, Math.max(0, examScore));

                Score score = Score.builder()
                        .student(student).subject(subject).classRoom(classroom)
                        .term(term1).academicYear(currentYear).enteredBy(tutor)
                        .classScore(classScore).examScore(examScore)
                        .isAbsent(false).isLocked(false)
                        .build();

                scoreRepository.save(score); // @PrePersist computes grade
                scoreCount++;
            }
        }

        log.info("  Created {} scores ({} students × {} subjects)", scoreCount, students.size(), subjects.length);
    }

    private int[] getScoreRange(int studentIndex) {
        // Returns {minClass, maxClass, minExam, maxExam}
        if (studentIndex < 5) return new int[]{25, 30, 50, 65};       // Excellent
        if (studentIndex < 15) return new int[]{20, 28, 40, 55};      // Good
        if (studentIndex < 27) return new int[]{15, 24, 30, 45};      // Average
        if (studentIndex < 33) return new int[]{8, 18, 20, 38};       // Struggling
        return new int[]{5, 14, 10, 30};                               // At-risk
    }

    // ─── 9. TERM RESULTS ──────────────────────────────────────────

    private void generateTermResults(ClassRoom classroom) {
        try {
            gpaService.generateAllTermResults(classroom.getId(), term1.getId());
            log.info("  Generated term results and positions for SHS 2 Science A");
        } catch (Exception e) {
            log.error("  Failed to generate term results: {}", e.getMessage());
        }
    }

    // ─── 10. EARLY WARNINGS ──────────────────────────────────────

    private void generateWarnings() {
        try {
            List<EarlyWarning> warnings = earlyWarningService.analyzeAndGenerateWarnings(
                    school.getId(), term1.getId());
            log.info("  Generated {} early warnings", warnings.size());
        } catch (Exception e) {
            log.error("  Failed to generate warnings: {}", e.getMessage());
        }
    }

    // ─── 11. ATTENDANCE ───────────────────────────────────────────

    private void seedAttendance(List<Student> students, ClassRoom classroom) {
        // Generate 60 school days (Sep-Dec 2024, weekdays)
        List<LocalDate> schoolDays = new ArrayList<>();
        LocalDate date = LocalDate.of(2024, 9, 9);
        while (schoolDays.size() < 60 && date.isBefore(LocalDate.of(2024, 12, 21))) {
            if (date.getDayOfWeek().getValue() <= 5) { // Mon-Fri
                schoolDays.add(date);
            }
            date = date.plusDays(1);
        }

        User classTeacher = classroom.getClassTeacher();
        int attendanceCount = 0;

        for (int i = 0; i < students.size(); i++) {
            Student student = students.get(i);
            int targetPresent = getTargetAttendance(i, schoolDays.size());

            // Randomly select absent days
            Set<Integer> absentDays = new HashSet<>();
            int absentTarget = schoolDays.size() - targetPresent;
            while (absentDays.size() < absentTarget) {
                absentDays.add(random.nextInt(schoolDays.size()));
            }

            for (int d = 0; d < schoolDays.size(); d++) {
                boolean isPresent = !absentDays.contains(d);
                boolean isLate = isPresent && random.nextInt(20) == 0; // 5% chance of late

                attendanceRepository.save(Attendance.builder()
                        .student(student).classRoom(classroom).term(term1)
                        .date(schoolDays.get(d)).isPresent(isPresent).isLate(isLate)
                        .reason(!isPresent ? randomAbsenceReason() : null)
                        .markedBy(classTeacher).build());
                attendanceCount++;
            }
        }

        log.info("  Created {} attendance records ({} students × {} days)", attendanceCount, students.size(), schoolDays.size());
    }

    private int getTargetAttendance(int studentIndex, int totalDays) {
        if (studentIndex < 5) return totalDays - random.nextInt(3);           // Excellent: 58-60
        if (studentIndex < 15) return totalDays - 2 - random.nextInt(4);      // Good: 54-58
        if (studentIndex < 27) return totalDays - 4 - random.nextInt(6);      // Average: 50-56
        if (studentIndex < 33) return totalDays - 8 - random.nextInt(8);      // Struggling: 44-52
        return totalDays - 12 - random.nextInt(10);                            // At-risk: 38-48
    }

    private String randomAbsenceReason() {
        String[] reasons = {"Illness", "Family event", "Travel", "No reason given", "Medical appointment", "Personal reasons"};
        return reasons[random.nextInt(reasons.length)];
    }

    // ─── 12. BEHAVIOR LOGS ───────────────────────────────────────

    private void seedBehaviorLogs(List<Student> students, ClassRoom classroom, User classTeacher) {
        // 5 Achievement entries
        createBehavior(students.get(0), classroom, "ACHIEVEMENT", "Quiz Competition Winner",
                "Won first place in the inter-class Mathematics quiz competition", "HIGH", classTeacher);
        createBehavior(students.get(1), classroom, "ACHIEVEMENT", "Science Fair Project",
                "Presented outstanding research on renewable energy sources", "HIGH", classTeacher);
        createBehavior(students.get(4), classroom, "ACHIEVEMENT", "Class Prefect Leadership",
                "Demonstrated excellent leadership as class prefect this term", "MEDIUM", classTeacher);
        createBehavior(students.get(2), classroom, "ACHIEVEMENT", "Perfect Attendance Award",
                "Maintained perfect attendance for the first half of Term 1", "MEDIUM", classTeacher);
        createBehavior(students.get(8), classroom, "ACHIEVEMENT", "Sports Day Contribution",
                "Led the science class team to victory in inter-class football", "LOW", classTeacher);

        // 5 Discipline entries
        createBehavior(students.get(30), classroom, "DISCIPLINE", "Late to Class",
                "Arrived 30 minutes late to morning assembly without valid reason", "LOW", classTeacher);
        createBehavior(students.get(33), classroom, "DISCIPLINE", "Incomplete Homework",
                "Failed to submit homework assignments for Mathematics and English for two consecutive weeks", "MEDIUM", classTeacher);
        createBehavior(students.get(34), classroom, "DISCIPLINE", "Classroom Disruption",
                "Repeatedly disrupted Physics class by talking during the lesson", "MEDIUM", classTeacher);
        createBehavior(students.get(28), classroom, "DISCIPLINE", "Uniform Violation",
                "Came to school without proper school uniform on multiple occasions", "LOW", classTeacher);
        createBehavior(students.get(31), classroom, "DISCIPLINE", "Exam Misconduct Warning",
                "Found with unauthorized notes during class test. Given verbal warning.", "HIGH", classTeacher);

        log.info("  Created 10 behavior log entries (5 achievements + 5 discipline)");
    }

    private void createBehavior(Student student, ClassRoom classroom, String type,
                                 String title, String desc, String severity, User teacher) {
        behaviorLogRepository.save(BehaviorLog.builder()
                .student(student).classRoom(classroom).term(term1)
                .logType(type).title(title).description(desc).severity(severity)
                .loggedBy(teacher).isDeleted(false).build());
    }

    // ─── 13. PRINT CREDENTIALS ────────────────────────────────────

    private void printCredentials() {
        log.info("""

                =================================================
                  DEMO SYSTEM — ACCESS CREDENTIALS
                =================================================
                  SUPER ADMIN:
                    Email:    admin@accraacademy.edu.gh
                    Password: Admin@2024

                  CLASS TEACHER (SHS 2 Science A):
                    Email:    akosua.mensah@staff.accraacademy.edu.gh
                    Password: Teacher@1234

                  SUBJECT TUTOR (Mathematics):
                    Email:    kofi.nkrumah@staff.accraacademy.edu.gh
                    Password: Teacher@1234

                  STUDENT (Top performer):
                    Email:    kwame.boateng@student.accraacademy.edu.gh
                    Password: 0240023401 (studentIndex)

                  STUDENT (At-risk):
                    Email:    adwoa.adomako@student.accraacademy.edu.gh
                    Password: 0240023434 (studentIndex)
                =================================================
                  To activate: spring.profiles.active=demo
                  Or run: mvn spring-boot:run -Dspring-boot.run.profiles=demo
                =================================================
                """);
    }

    // ─── HELPERS ──────────────────────────────────────────────────

    private LocalDate randomDob() {
        // Students born between 2006-2008
        int year = 2006 + random.nextInt(3);
        int month = 1 + random.nextInt(12);
        int day = 1 + random.nextInt(28);
        return LocalDate.of(year, month, day);
    }

    private int randomBece() {
        // BECE aggregate: 6 (best) to 30 (average), with most in 10-20 range
        return 8 + random.nextInt(16);
    }
}
