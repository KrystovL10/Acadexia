package com.shs.academic.integration;

import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.*;
import com.shs.academic.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Helper factory for creating test entities in integration tests.
 * All entities are persisted to the database (H2) via their repositories.
 */
@Component
public class TestDataFactory {

    @Autowired private UserRepository userRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private AcademicYearRepository academicYearRepository;
    @Autowired private TermRepository termRepository;
    @Autowired private ProgramRepository programRepository;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private ClassRoomRepository classRoomRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private TeacherRepository teacherRepository;
    @Autowired private ClassSubjectAssignmentRepository classSubjectAssignmentRepository;
    @Autowired private ScoreRepository scoreRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    // ── School ──

    public School createSchool(String code, String name) {
        return schoolRepository.save(School.builder()
                .schoolCode(code)
                .name(name)
                .region("Greater Accra")
                .district("Accra Metropolitan")
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
    }

    // ── Academic Year ──

    public AcademicYear createAcademicYear(School school, String label, boolean isCurrent) {
        return academicYearRepository.save(AcademicYear.builder()
                .school(school)
                .yearLabel(label)
                .startDate(LocalDate.of(2024, 9, 1))
                .endDate(LocalDate.of(2025, 7, 31))
                .isCurrent(isCurrent)
                .createdAt(LocalDateTime.now())
                .build());
    }

    // ── Term ──

    public Term createTerm(AcademicYear year, TermType type, boolean isCurrent) {
        return termRepository.save(Term.builder()
                .academicYear(year)
                .termType(type)
                .startDate(LocalDate.of(2024, 9, 1))
                .endDate(LocalDate.of(2024, 12, 20))
                .isCurrent(isCurrent)
                .isScoresLocked(false)
                .createdAt(LocalDateTime.now())
                .build());
    }

    // ── Program ──

    public Program createProgram(School school, ProgramType type, String displayName) {
        return programRepository.save(Program.builder()
                .school(school)
                .programType(type)
                .displayName(displayName)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
    }

    // ── Subject ──

    public Subject createSubject(School school, String code, String name, boolean isCore) {
        return subjectRepository.save(Subject.builder()
                .school(school)
                .subjectCode(code)
                .name(name)
                .isCore(isCore)
                .isElective(!isCore)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
    }

    // ── ClassRoom ──

    public ClassRoom createClassRoom(School school, AcademicYear year, Program program,
                                     String code, String displayName, YearGroup yearGroup) {
        return classRoomRepository.save(ClassRoom.builder()
                .school(school)
                .academicYear(year)
                .program(program)
                .classCode(code)
                .displayName(displayName)
                .yearGroup(yearGroup)
                .capacity(45)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
    }

    // ── User ──

    public User createUser(String userId, String firstName, String lastName,
                           String email, String rawPassword, UserRole role) {
        return userRepository.save(User.builder()
                .userId(userId)
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .role(role)
                .isActive(true)
                .isFirstLogin(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
    }

    // ── Student ──

    public Student createStudent(User user, School school, Program program,
                                 ClassRoom classRoom, String index, YearGroup yearGroup) {
        return studentRepository.save(Student.builder()
                .user(user)
                .school(school)
                .currentProgram(program)
                .currentClass(classRoom)
                .studentIndex(index)
                .currentYearGroup(yearGroup)
                .dateOfBirth(LocalDate.of(2006, 3, 15))
                .gender("Male")
                .nationality("Ghanaian")
                .isActive(true)
                .hasGraduated(false)
                .createdAt(LocalDateTime.now())
                .build());
    }

    // ── Teacher ──

    public Teacher createTeacher(User user, School school, String staffId,
                                 boolean isClassTeacher, ClassRoom assignedClass) {
        return teacherRepository.save(Teacher.builder()
                .user(user)
                .school(school)
                .staffId(staffId)
                .isClassTeacher(isClassTeacher)
                .assignedClass(assignedClass)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
    }

    // ── Class Subject Assignment (Tutor → Class + Subject) ──

    public ClassSubjectAssignment createAssignment(ClassRoom classRoom, Subject subject,
                                                   User tutor, AcademicYear year) {
        return classSubjectAssignmentRepository.save(ClassSubjectAssignment.builder()
                .classRoom(classRoom)
                .subject(subject)
                .tutor(tutor)
                .academicYear(year)
                .isActive(true)
                .build());
    }

    // ── Score ──

    public Score createScore(Student student, Subject subject, ClassRoom classRoom,
                             Term term, AcademicYear year, User enteredBy,
                             Double classScore, Double examScore) {
        return scoreRepository.save(Score.builder()
                .student(student)
                .subject(subject)
                .classRoom(classRoom)
                .term(term)
                .academicYear(year)
                .enteredBy(enteredBy)
                .classScore(classScore)
                .examScore(examScore)
                .isAbsent(false)
                .isLocked(false)
                .build());
    }

    public Score createAbsentScore(Student student, Subject subject, ClassRoom classRoom,
                                   Term term, AcademicYear year, User enteredBy) {
        return scoreRepository.save(Score.builder()
                .student(student)
                .subject(subject)
                .classRoom(classRoom)
                .term(term)
                .academicYear(year)
                .enteredBy(enteredBy)
                .isAbsent(true)
                .isLocked(false)
                .build());
    }
}
