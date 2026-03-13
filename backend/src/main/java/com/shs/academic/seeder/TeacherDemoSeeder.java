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

/**
 * Seeds SHS 3 Science A (emmanuel.darko's class) with full demo data.
 * Runs after DemoDataSeeder (Order 10), only if SHS3 students don't yet exist.
 * Enable @Component to activate; disable again after seeding.
 */
@Slf4j
// @Component  // Disabled — enable manually when SHS 3 Science A data is needed
@Profile("demo")
@Order(15)
@RequiredArgsConstructor
public class TeacherDemoSeeder implements ApplicationListener<ContextRefreshedEvent> {

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

    private School school;
    private AcademicYear currentYear;
    private Term term1;
    private Map<String, Subject> subjectMap;
    private final Random random = new Random(99); // Different seed from DemoDataSeeder

    @Override
    @Transactional
    public void onApplicationEvent(ContextRefreshedEvent event) {
        if (alreadySeeded) return;
        alreadySeeded = true;

        // Load existing school and year
        school = schoolRepository.findFirstByIsActiveTrue().orElse(null);
        if (school == null) {
            log.warn("  TeacherDemoSeeder: no active school found, skipping");
            return;
        }

        currentYear = academicYearRepository.findBySchoolIdAndIsCurrentTrue(school.getId()).orElse(null);
        if (currentYear == null) {
            log.warn("  TeacherDemoSeeder: no current academic year found, skipping");
            return;
        }

        List<Term> terms = termRepository.findByAcademicYearId(currentYear.getId());
        term1 = terms.stream().filter(t -> t.getTermType() == TermType.TERM_1).findFirst().orElse(null);
        if (term1 == null) {
            log.warn("  TeacherDemoSeeder: no Term 1 found, skipping");
            return;
        }

        // Find SHS 3 Science A
        ClassRoom shs3SciA = classRoomRepository.findByClassCodeAndSchoolId("SHS3-SCI-A", school.getId()).orElse(null);
        if (shs3SciA == null) {
            log.warn("  TeacherDemoSeeder: SHS 3 Science A (SHS3-SCI-A) not found, skipping");
            return;
        }

        // Skip if already seeded
        int shs3StudentCount = studentRepository.findByCurrentClassId(shs3SciA.getId()).size();
        if (shs3StudentCount > 0) {
            log.info("  TeacherDemoSeeder: SHS 3 Science A already has {} students, skipping", shs3StudentCount);
            return;
        }

        log.info("\n" + "=".repeat(60) + "\n  TEACHER DEMO SEEDER — Seeding SHS 3 Science A...\n" + "=".repeat(60));
        long start = System.currentTimeMillis();

        // Load subjects
        subjectMap = new HashMap<>();
        subjectRepository.findBySchoolId(school.getId()).forEach(s -> subjectMap.put(s.getName(), s));

        // Load General Science program
        Program genScience = programRepository.findBySchoolIdAndIsActive(school.getId(), true)
                .stream().filter(p -> p.getDisplayName().equals("General Science"))
                .findFirst().orElse(null);
        if (genScience == null) {
            log.warn("  TeacherDemoSeeder: General Science program not found, skipping");
            return;
        }

        // Load teacher users
        Map<String, User> teachers = loadTeachers();

        // Ensure subject assignments for SHS 3 Science A
        seedShs3SubjectAssignments(shs3SciA, teachers);

        // Seed students
        List<Student> students = seedStudents(shs3SciA, genScience);

        // Seed academic data
        seedScores(students, shs3SciA, teachers);
        generateTermResults(shs3SciA);
        generateWarnings();
        seedAttendance(students, shs3SciA);
        seedBehaviorLogs(students, shs3SciA, teachers.get("emmanuel.darko"));

        long elapsed = (System.currentTimeMillis() - start) / 1000;
        log.info("\n  TeacherDemoSeeder completed in {}s\n  SHS 3 Science A is ready for emmanuel.darko\n" + "=".repeat(60), elapsed);
    }

    private Map<String, User> loadTeachers() {
        Map<String, User> teachers = new HashMap<>();
        String[] emails = {
                "emmanuel.darko", "akosua.mensah", "kofi.nkrumah",
                "grace.asamoah", "samuel.oppong", "adwoa.frimpong",
                "benjamin.agyei", "ama.asiedu"
        };
        for (String prefix : emails) {
            userRepository.findByEmail(prefix + "@staff.accraacademy.edu.gh")
                    .ifPresent(u -> teachers.put(prefix, u));
        }
        return teachers;
    }

    private void seedShs3SubjectAssignments(ClassRoom shs3SciA, Map<String, User> teachers) {
        // Only create assignments that don't already exist for this classroom
        List<ClassSubjectAssignment> existing = classSubjectAssignmentRepository
                .findByClassRoomId(shs3SciA.getId());
        Set<String> assignedSubjects = new HashSet<>();
        existing.forEach(a -> assignedSubjects.add(a.getSubject().getName()));

        String[][] assignments = {
                {"Mathematics",         "kofi.nkrumah"},
                {"English Language",    "grace.asamoah"},
                {"Physics",             "benjamin.agyei"},
                {"Chemistry",           "adwoa.frimpong"},
                {"Biology",             "samuel.oppong"},
                {"Integrated Science",  "samuel.oppong"},
                {"Social Studies",      "grace.asamoah"},
                {"Elective Mathematics","kofi.nkrumah"},
        };

        int created = 0;
        for (String[] pair : assignments) {
            String subjectName = pair[0];
            String teacherKey = pair[1];
            if (assignedSubjects.contains(subjectName)) continue;
            Subject subject = subjectMap.get(subjectName);
            User tutor = teachers.get(teacherKey);
            if (subject == null || tutor == null) {
                log.warn("  TeacherDemoSeeder: skipping assignment {} — subject or tutor not found", subjectName);
                continue;
            }
            classSubjectAssignmentRepository.save(ClassSubjectAssignment.builder()
                    .classRoom(shs3SciA).subject(subject).tutor(tutor)
                    .academicYear(currentYear).isActive(true).build());
            created++;
        }
        if (created > 0) log.info("  Created {} subject assignments for SHS 3 Science A", created);
    }

    private List<Student> seedStudents(ClassRoom shs3SciA, Program genScience) {
        List<Student> students = new ArrayList<>();

        String[][] studentData = {
                // firstName, lastName, studentIndex, gender, hometown, guardianName, guardianPhone
                {"Kwame",    "Nkrumah Boateng",    "0230023301", "Male",   "Accra",       "Mr. Yaw Boateng",       "0244100001"},
                {"Ama",      "Serwaah Darko",       "0230023302", "Female", "Kumasi",      "Mrs. Abena Darko",      "0244100002"},
                {"Kojo",     "Francis Tetteh",      "0230023303", "Male",   "Tema",        "Mr. Isaac Tetteh",      "0244100003"},
                {"Akosua",   "Eunice Frimpong",     "0230023304", "Female", "Takoradi",    "Mrs. Adwoa Frimpong",   "0244100004"},
                {"Yaw",      "Godfred Asare",       "0230023305", "Male",   "Koforidua",   "Mr. Kwesi Asare",       "0244100005"},
                {"Adwoa",    "Patience Owusu",      "0230023306", "Female", "Cape Coast",  "Mrs. Efua Owusu",       "0244100006"},
                {"Kwesi",    "Arnold Amponsah",     "0230023307", "Male",   "Tamale",      "Mr. Daniel Amponsah",   "0244100007"},
                {"Abena",    "Vivian Mensah",       "0230023308", "Female", "Sunyani",     "Mrs. Ama Mensah",       "0244100008"},
                {"Kofi",     "Clement Adu",         "0230023309", "Male",   "Ho",          "Mr. Kwame Adu",         "0244100009"},
                {"Efua",     "Cecilia Ankrah",      "0230023310", "Female", "Bolgatanga",  "Mrs. Akua Ankrah",      "0244100010"},
                {"Kwabena",  "Leonard Asante",      "0230023311", "Male",   "Accra",       "Mr. Yaw Asante",        "0244100011"},
                {"Akua",     "Claudia Antwi",       "0230023312", "Female", "Kumasi",      "Mrs. Grace Antwi",      "0244100012"},
                {"Yaw",      "Nicholas Adjei",      "0230023313", "Male",   "Tema",        "Mr. Kofi Adjei",        "0244100013"},
                {"Esi",      "Theresa Appiah",      "0230023314", "Female", "Takoradi",    "Mrs. Joyce Appiah",     "0244100014"},
                {"Kwame",    "Desmond Mensah",      "0230023315", "Male",   "Koforidua",   "Mr. Patrick Mensah",    "0244100015"},
                {"Afia",     "Georgina Boakye",     "0230023316", "Female", "Cape Coast",  "Mrs. Amma Boakye",      "0244100016"},
                {"Kojo",     "Victor Amoah",        "0230023317", "Male",   "Wa",          "Mr. Simon Amoah",       "0244100017"},
                {"Adwoa",    "Louisa Ofori",        "0230023318", "Female", "Accra",       "Mrs. Comfort Ofori",    "0244100018"},
                {"Kofi",     "Emmanuel Gyamfi",     "0230023319", "Male",   "Kumasi",      "Mr. Yaw Gyamfi",        "0244100019"},
                {"Ama",      "Christiana Acheampong","0230023320","Female", "Tema",        "Mrs. Akosua Acheampong","0244100020"},
                {"Kwesi",    "Clifford Oduro",      "0230023321", "Male",   "Sunyani",     "Mr. Kojo Oduro",        "0244100021"},
                {"Akosua",   "Florence Nyarko",     "0230023322", "Female", "Tamale",      "Mrs. Esi Nyarko",       "0244100022"},
                {"Yaw",      "Herman Asiedu",       "0230023323", "Male",   "Ho",          "Mr. Kwabena Asiedu",    "0244100023"},
                {"Efua",     "Sandra Quaye",        "0230023324", "Female", "Bolgatanga",  "Mrs. Adwoa Quaye",      "0244100024"},
                {"Kwabena",  "Prosper Sackey",      "0230023325", "Male",   "Accra",       "Mr. Emmanuel Sackey",   "0244100025"},
                {"Akua",     "Harriet Anim",        "0230023326", "Female", "Kumasi",      "Mrs. Afia Anim",        "0244100026"},
                {"Kojo",     "Sylvester Mensah",    "0230023327", "Male",   "Cape Coast",  "Mr. Kwame Mensah",      "0244100027"},
                {"Abena",    "Lydia Owusu",         "0230023328", "Female", "Takoradi",    "Mrs. Akosua Owusu",     "0244100028"},
                {"Kofi",     "Nathaniel Baffour",   "0230023329", "Male",   "Tema",        "Mr. Kojo Baffour",      "0244100029"},
                {"Esi",      "Mabel Opoku",         "0230023330", "Female", "Accra",       "Mrs. Yaa Opoku",        "0244100030"},
        };

        for (String[] data : studentData) {
            String encodedPwd = passwordEncoder.encode(data[2]);
            String lastName = data[1];
            String lastNamePart = lastName.split(" ")[lastName.split(" ").length - 1];
            String emailPrefix = (data[0] + "." + lastNamePart).toLowerCase();

            User user = userRepository.save(User.builder()
                    .userId("GES-S3-" + data[2].substring(data[2].length() - 4))
                    .firstName(data[0]).lastName(lastName)
                    .email(emailPrefix + ".s3@student.accraacademy.edu.gh")
                    .password(encodedPwd).role(UserRole.STUDENT)
                    .isActive(true).isFirstLogin(false).build());

            Student student = studentRepository.save(Student.builder()
                    .user(user).studentIndex(data[2])
                    .dateOfBirth(randomDob())
                    .gender(data[3]).nationality("Ghanaian").hometown(data[4])
                    .residentialAddress(data[4] + ", Ghana")
                    .guardianName(data[5]).guardianPhone(data[6])
                    .guardianRelationship(data[3].equals("Male") ? "Father" : "Mother")
                    .beceAggregate(randomBece()).beceYear("2021")
                    .admissionDate(LocalDate.of(2021, 9, 1))
                    .school(school).currentYearGroup(YearGroup.SHS3)
                    .currentProgram(genScience).currentClass(shs3SciA)
                    .isActive(true).hasGraduated(false).build());

            studentEnrollmentRepository.save(StudentEnrollment.builder()
                    .student(student).classRoom(shs3SciA)
                    .academicYear(currentYear).yearGroup(YearGroup.SHS3)
                    .enrollmentDate(LocalDate.of(2024, 9, 9))
                    .isRepeating(false).build());

            students.add(student);
        }

        log.info("  Created {} students in SHS 3 Science A", students.size());
        return students;
    }

    private void seedScores(List<Student> students, ClassRoom classroom, Map<String, User> teachers) {
        String[] subjects = {
                "Mathematics", "English Language", "Physics", "Chemistry",
                "Biology", "Integrated Science", "Social Studies", "Elective Mathematics"
        };

        Map<String, User> subjectTutors = Map.of(
                "Mathematics",          teachers.getOrDefault("kofi.nkrumah",    teachers.values().iterator().next()),
                "English Language",     teachers.getOrDefault("grace.asamoah",   teachers.values().iterator().next()),
                "Physics",              teachers.getOrDefault("benjamin.agyei",  teachers.values().iterator().next()),
                "Chemistry",            teachers.getOrDefault("adwoa.frimpong",  teachers.values().iterator().next()),
                "Biology",              teachers.getOrDefault("samuel.oppong",   teachers.values().iterator().next()),
                "Integrated Science",   teachers.getOrDefault("samuel.oppong",   teachers.values().iterator().next()),
                "Social Studies",       teachers.getOrDefault("grace.asamoah",   teachers.values().iterator().next()),
                "Elective Mathematics", teachers.getOrDefault("kofi.nkrumah",    teachers.values().iterator().next())
        );

        /*
         * SHS3 student tiers (final year — slightly higher scores overall):
         *  0-3   (4  students) → Excellent: class 26-30, exam 52-68
         *  4-13  (10 students) → Good:      class 21-28, exam 42-57
         *  14-24 (11 students) → Average:   class 16-25, exam 32-47
         *  25-28 (4  students) → Struggling: class 9-19, exam 22-40
         *  29    (1  student)  → At-risk:   class 6-14, exam 12-30
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
                double examScore  = range[2] + random.nextInt(range[3] - range[2] + 1);

                if (subjectName.equals("Mathematics") || subjectName.equals("Elective Mathematics")) {
                    classScore = Math.max(0, classScore + random.nextInt(5) - 3);
                    examScore  = Math.max(0, examScore  + random.nextInt(8) - 4);
                }

                classScore = Math.min(30, Math.max(0, classScore));
                examScore  = Math.min(70, Math.max(0, examScore));

                scoreRepository.save(Score.builder()
                        .student(student).subject(subject).classRoom(classroom)
                        .term(term1).academicYear(currentYear).enteredBy(tutor)
                        .classScore(classScore).examScore(examScore)
                        .isAbsent(false).isLocked(false)
                        .build());
                scoreCount++;
            }
        }
        log.info("  Created {} scores ({} students × {} subjects)", scoreCount, students.size(), subjects.length);
    }

    private int[] getScoreRange(int i) {
        if (i < 4)  return new int[]{26, 30, 52, 68};
        if (i < 14) return new int[]{21, 28, 42, 57};
        if (i < 25) return new int[]{16, 25, 32, 47};
        if (i < 29) return new int[]{9,  19, 22, 40};
        return new int[]{6, 14, 12, 30};
    }

    private void generateTermResults(ClassRoom classroom) {
        try {
            gpaService.generateAllTermResults(classroom.getId(), term1.getId());
            log.info("  Generated term results for SHS 3 Science A");
        } catch (Exception e) {
            log.error("  Failed to generate term results: {}", e.getMessage());
        }
    }

    private void generateWarnings() {
        try {
            List<EarlyWarning> warnings = earlyWarningService.analyzeAndGenerateWarnings(school.getId(), term1.getId());
            log.info("  Refreshed early warnings ({} total)", warnings.size());
        } catch (Exception e) {
            log.error("  Failed to refresh warnings: {}", e.getMessage());
        }
    }

    private void seedAttendance(List<Student> students, ClassRoom classroom) {
        List<LocalDate> schoolDays = new ArrayList<>();
        LocalDate date = LocalDate.of(2024, 9, 9);
        while (schoolDays.size() < 60 && date.isBefore(LocalDate.of(2024, 12, 21))) {
            if (date.getDayOfWeek().getValue() <= 5) schoolDays.add(date);
            date = date.plusDays(1);
        }

        User classTeacher = classroom.getClassTeacher();
        int attendanceCount = 0;

        for (int i = 0; i < students.size(); i++) {
            Student student = students.get(i);
            int targetPresent = getTargetAttendance(i, schoolDays.size());
            Set<Integer> absentDays = new HashSet<>();
            int absentTarget = schoolDays.size() - targetPresent;
            while (absentDays.size() < absentTarget) absentDays.add(random.nextInt(schoolDays.size()));

            for (int d = 0; d < schoolDays.size(); d++) {
                boolean isPresent = !absentDays.contains(d);
                boolean isLate    = isPresent && random.nextInt(20) == 0;

                attendanceRepository.save(Attendance.builder()
                        .student(student).classRoom(classroom).term(term1)
                        .date(schoolDays.get(d)).isPresent(isPresent).isLate(isLate)
                        .reason(!isPresent ? randomAbsenceReason() : null)
                        .markedBy(classTeacher).build());
                attendanceCount++;
            }
        }
        log.info("  Created {} attendance records", attendanceCount);
    }

    private int getTargetAttendance(int i, int total) {
        if (i < 4)  return total - random.nextInt(3);
        if (i < 14) return total - 2 - random.nextInt(4);
        if (i < 25) return total - 4 - random.nextInt(6);
        if (i < 29) return total - 8 - random.nextInt(8);
        return total - 12 - random.nextInt(10);
    }

    private String randomAbsenceReason() {
        String[] reasons = {"Illness", "Family event", "Travel", "No reason given", "Medical appointment", "Personal reasons"};
        return reasons[random.nextInt(reasons.length)];
    }

    private void seedBehaviorLogs(List<Student> students, ClassRoom classroom, User classTeacher) {
        if (classTeacher == null) {
            log.warn("  TeacherDemoSeeder: classTeacher user not found for behavior logs, skipping");
            return;
        }

        // 5 achievements
        createBehavior(students.get(0), classroom, "ACHIEVEMENT", "WASSCE Mock Top Scorer",
                "Scored highest in school in WASSCE mock examination", "HIGH", classTeacher);
        createBehavior(students.get(1), classroom, "ACHIEVEMENT", "Science Research Award",
                "Won regional award for outstanding chemistry project on water purification", "HIGH", classTeacher);
        createBehavior(students.get(3), classroom, "ACHIEVEMENT", "Student Council President",
                "Elected Student Council President for the 2024/2025 academic year", "HIGH", classTeacher);
        createBehavior(students.get(2), classroom, "ACHIEVEMENT", "Perfect Attendance",
                "Maintained 100% attendance for the entire first term", "MEDIUM", classTeacher);
        createBehavior(students.get(7), classroom, "ACHIEVEMENT", "Inter-School Debate Winner",
                "Represented school at inter-school debate and won best speaker award", "MEDIUM", classTeacher);

        // 5 discipline entries
        createBehavior(students.get(28), classroom, "DISCIPLINE", "Late Submission",
                "Failed to submit Biology and Chemistry coursework for three weeks", "MEDIUM", classTeacher);
        createBehavior(students.get(29), classroom, "DISCIPLINE", "Truancy Warning",
                "Absent without valid reason on multiple consecutive days", "HIGH", classTeacher);
        createBehavior(students.get(25), classroom, "DISCIPLINE", "Phone Policy Violation",
                "Caught using mobile phone during Physics class examination", "MEDIUM", classTeacher);
        createBehavior(students.get(26), classroom, "DISCIPLINE", "Disrespect to Teacher",
                "Was disrespectful to a subject tutor during a class session", "HIGH", classTeacher);
        createBehavior(students.get(27), classroom, "DISCIPLINE", "Uniform Infringement",
                "Repeatedly wore non-regulation shoes despite prior warnings", "LOW", classTeacher);

        log.info("  Created 10 behavior log entries for SHS 3 Science A");
    }

    private void createBehavior(Student student, ClassRoom classroom, String type,
                                 String title, String desc, String severity, User teacher) {
        behaviorLogRepository.save(BehaviorLog.builder()
                .student(student).classRoom(classroom).term(term1)
                .logType(type).title(title).description(desc).severity(severity)
                .loggedBy(teacher).isDeleted(false).build());
    }

    private LocalDate randomDob() {
        int year = 2004 + random.nextInt(2); // SHS3 students born 2004-2005
        return LocalDate.of(year, 1 + random.nextInt(12), 1 + random.nextInt(28));
    }

    private int randomBece() {
        return 6 + random.nextInt(14); // 6-19 aggregate (SHS3 students did BECE in 2021)
    }
}
