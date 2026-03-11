package com.shs.academic.service;

import com.shs.academic.exception.BadRequestException;
import com.shs.academic.exception.DuplicateResourceException;
import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.*;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.UserRole;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.repository.*;
import com.shs.academic.util.SecurityUtil;
import com.shs.academic.util.UserIdGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Year;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final SchoolRepository schoolRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ProgramRepository programRepository;
    private final SubjectRepository subjectRepository;
    private final AcademicYearRepository academicYearRepository;
    private final ClassSubjectAssignmentRepository classSubjectAssignmentRepository;
    private final StudentEnrollmentRepository studentEnrollmentRepository;
    private final UserIdGenerator userIdGenerator;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    private static final String DEFAULT_TEACHER_PASSWORD = "Welcome@GES1";

    // ==================== TEACHER MANAGEMENT ====================

    @Transactional
    public TeacherDto createTeacher(CreateTeacherRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        School school = schoolRepository.findById(request.getSchoolId())
                .orElseThrow(() -> new ResourceNotFoundException("School", "id", request.getSchoolId()));

        String userId = userIdGenerator.generate(UserRole.TUTOR);

        User user = User.builder()
                .userId(userId)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(DEFAULT_TEACHER_PASSWORD))
                .role(UserRole.TUTOR)
                .phoneNumber(request.getPhoneNumber())
                .isActive(true)
                .isFirstLogin(true)
                .build();

        user = userRepository.save(user);

        String staffId = generateStaffId();

        Teacher teacher = Teacher.builder()
                .user(user)
                .staffId(staffId)
                .department(request.getDepartment())
                .qualification(request.getQualification())
                .specialization(request.getSpecialization())
                .dateJoined(request.getDateJoined() != null ? request.getDateJoined() : LocalDate.now())
                .school(school)
                .isClassTeacher(false)
                .isActive(true)
                .build();

        teacher = teacherRepository.save(teacher);

        sendWelcomeEmail(user.getEmail(), user.getFullName(), userId);

        log.info("Created teacher: {} (staffId: {}, userId: {})", user.getFullName(), staffId, userId);

        auditLogService.logAction("USER_CREATED", SecurityUtil.getCurrentUserId(), "TEACHER", teacher.getId(), "Created teacher: " + user.getFullName());

        return buildTeacherDto(teacher);
    }

    @Transactional
    public TeacherDto updateTeacher(Long teacherId, UpdateTeacherRequest request) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherId));

        User user = teacher.getUser();

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getDepartment() != null) {
            teacher.setDepartment(request.getDepartment());
        }
        if (request.getQualification() != null) {
            teacher.setQualification(request.getQualification());
        }
        if (request.getSpecialization() != null) {
            teacher.setSpecialization(request.getSpecialization());
        }

        userRepository.save(user);
        teacher = teacherRepository.save(teacher);

        log.info("Updated teacher: {} (id: {})", user.getFullName(), teacherId);

        return buildTeacherDto(teacher);
    }

    @Transactional
    public void deactivateTeacher(Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherId));

        User user = teacher.getUser();
        user.setActive(false);
        userRepository.save(user);

        teacher.setActive(false);

        // If teacher is a class teacher, remove class assignment
        if (teacher.isClassTeacher()) {
            ClassRoom assignedClass = teacher.getAssignedClass();
            if (assignedClass != null) {
                assignedClass.setClassTeacher(null);
                classRoomRepository.save(assignedClass);
            }
            teacher.setClassTeacher(false);
            teacher.setAssignedClass(null);
        }

        teacherRepository.save(teacher);

        log.info("Deactivated teacher: {} (id: {})", user.getFullName(), teacherId);

        auditLogService.logAction("USER_DEACTIVATED", SecurityUtil.getCurrentUserId(), "TEACHER", teacherId, "Deactivated teacher");
    }

    @Transactional
    public void reactivateTeacher(Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherId));

        User user = teacher.getUser();
        user.setActive(true);
        userRepository.save(user);

        teacher.setActive(true);
        teacherRepository.save(teacher);

        log.info("Reactivated teacher: {} (id: {})", user.getFullName(), teacherId);
    }

    @Transactional(readOnly = true)
    public Page<TeacherSummaryDto> getAllTeachers(Long schoolId, Pageable pageable) {
        return teacherRepository.findBySchoolId(schoolId, pageable)
                .map(TeacherSummaryDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public TeacherDto getTeacherById(Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherId));

        return buildTeacherDto(teacher);
    }

    @Transactional
    public void assignClassTeacher(AssignClassTeacherRequest request) {
        Teacher teacher = teacherRepository.findById(request.getTeacherId())
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", request.getTeacherId()));

        if (!teacher.isActive() || !teacher.getUser().isActive()) {
            throw new IllegalStateException("Cannot assign an inactive teacher as class teacher");
        }

        ClassRoom classRoom = classRoomRepository.findById(request.getClassRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", request.getClassRoomId()));

        // If classroom already has a class teacher, unassign first
        if (classRoom.getClassTeacher() != null) {
            User previousTeacherUser = classRoom.getClassTeacher();
            Teacher previousTeacher = teacherRepository.findByUserId(previousTeacherUser.getId())
                    .orElse(null);
            if (previousTeacher != null) {
                previousTeacher.setClassTeacher(false);
                previousTeacher.setAssignedClass(null);
                previousTeacher.getUser().setRole(UserRole.TUTOR);
                userRepository.save(previousTeacher.getUser());
                teacherRepository.save(previousTeacher);
            }
        }

        // If this teacher was already assigned to another class, unassign from that class
        if (teacher.getAssignedClass() != null && !teacher.getAssignedClass().getId().equals(classRoom.getId())) {
            ClassRoom oldClass = teacher.getAssignedClass();
            oldClass.setClassTeacher(null);
            classRoomRepository.save(oldClass);
        }

        // Assign
        teacher.setClassTeacher(true);
        teacher.setAssignedClass(classRoom);
        teacherRepository.save(teacher);

        classRoom.setClassTeacher(teacher.getUser());
        classRoomRepository.save(classRoom);

        // Update user role to CLASS_TEACHER
        User user = teacher.getUser();
        user.setRole(UserRole.CLASS_TEACHER);
        userRepository.save(user);

        log.info("Assigned teacher {} as class teacher of {}", user.getFullName(), classRoom.getDisplayName());
    }

    @Transactional
    public void assignTutor(AssignTutorRequest request) {
        Teacher teacher = teacherRepository.findById(request.getTeacherId())
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", request.getTeacherId()));

        ClassRoom classRoom = classRoomRepository.findById(request.getClassRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", request.getClassRoomId()));

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", request.getSubjectId()));

        // Check no duplicate assignment
        boolean exists = classSubjectAssignmentRepository
                .existsByTutorIdAndClassRoomIdAndSubjectIdAndIsActiveTrue(
                        teacher.getUser().getId(), classRoom.getId(), subject.getId());
        if (exists) {
            throw new DuplicateResourceException("ClassSubjectAssignment",
                    "tutor+class+subject",
                    teacher.getUser().getFullName() + " / " + classRoom.getDisplayName() + " / " + subject.getName());
        }

        AcademicYear currentYear = academicYearRepository.findBySchoolIdAndIsCurrentTrue(classRoom.getSchool().getId())
                .orElseThrow(() -> new ResourceNotFoundException("AcademicYear", "current", "true"));

        ClassSubjectAssignment assignment = ClassSubjectAssignment.builder()
                .classRoom(classRoom)
                .subject(subject)
                .tutor(teacher.getUser())
                .academicYear(currentYear)
                .isActive(true)
                .build();

        classSubjectAssignmentRepository.save(assignment);

        // Ensure teacher role includes TUTOR (if not already CLASS_TEACHER)
        User user = teacher.getUser();
        if (user.getRole() != UserRole.CLASS_TEACHER) {
            user.setRole(UserRole.TUTOR);
            userRepository.save(user);
        }

        log.info("Assigned tutor {} to teach {} in {}",
                user.getFullName(), subject.getName(), classRoom.getDisplayName());
    }

    // ==================== STUDENT MANAGEMENT ====================

    @Transactional
    public StudentDto createStudent(CreateStudentRequest request) {
        if (studentRepository.existsByStudentIndex(request.getStudentIndex())) {
            throw new DuplicateResourceException("Student", "studentIndex", request.getStudentIndex());
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        School school = schoolRepository.findById(request.getSchoolId())
                .orElseThrow(() -> new ResourceNotFoundException("School", "id", request.getSchoolId()));

        Program program = programRepository.findById(request.getProgramId())
                .orElseThrow(() -> new ResourceNotFoundException("Program", "id", request.getProgramId()));

        ClassRoom classRoom = null;
        if (request.getClassId() != null) {
            classRoom = classRoomRepository.findById(request.getClassId())
                    .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", request.getClassId()));
            if (!classRoom.getSchool().getId().equals(school.getId())) {
                throw new BadRequestException("ClassRoom does not belong to the specified school");
            }
        }

        String userId = userIdGenerator.generate(UserRole.STUDENT);

        // Default password is the student's index number
        User user = User.builder()
                .userId(userId)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getStudentIndex()))
                .role(UserRole.STUDENT)
                .isActive(true)
                .isFirstLogin(true)
                .build();

        user = userRepository.save(user);

        Student student = Student.builder()
                .user(user)
                .studentIndex(request.getStudentIndex())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .nationality(request.getNationality() != null ? request.getNationality() : "Ghanaian")
                .hometown(request.getHometown())
                .residentialAddress(request.getResidentialAddress())
                .guardianName(request.getGuardianName())
                .guardianPhone(request.getGuardianPhone())
                .guardianEmail(request.getGuardianEmail())
                .guardianRelationship(request.getGuardianRelationship())
                .beceAggregate(request.getBeceAggregate())
                .beceYear(request.getBeceYear())
                .admissionDate(request.getAdmissionDate() != null ? request.getAdmissionDate() : LocalDate.now())
                .school(school)
                .currentYearGroup(request.getYearGroup())
                .currentProgram(program)
                .currentClass(classRoom)
                .isActive(true)
                .hasGraduated(false)
                .build();

        student = studentRepository.save(student);

        // Create enrollment for current academic year
        AcademicYear currentYear = academicYearRepository.findBySchoolIdAndIsCurrentTrue(school.getId())
                .orElse(null);

        if (currentYear != null && classRoom != null) {
            StudentEnrollment enrollment = StudentEnrollment.builder()
                    .student(student)
                    .classRoom(classRoom)
                    .academicYear(currentYear)
                    .yearGroup(request.getYearGroup())
                    .enrollmentDate(LocalDate.now())
                    .isRepeating(false)
                    .build();

            studentEnrollmentRepository.save(enrollment);
        }

        log.info("Created student: {} (index: {}, userId: {})",
                user.getFullName(), request.getStudentIndex(), userId);

        auditLogService.logAction("USER_CREATED", SecurityUtil.getCurrentUserId(), "STUDENT", student.getId(), "Created student: " + user.getFullName());

        return StudentDto.fromEntity(student);
    }

    @Transactional
    public StudentDto updateStudent(Long studentId, UpdateStudentRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        User user = student.getUser();

        if (request.getGuardianName() != null) {
            student.setGuardianName(request.getGuardianName());
        }
        if (request.getGuardianPhone() != null) {
            student.setGuardianPhone(request.getGuardianPhone());
        }
        if (request.getGuardianEmail() != null) {
            student.setGuardianEmail(request.getGuardianEmail());
        }
        if (request.getGuardianRelationship() != null) {
            student.setGuardianRelationship(request.getGuardianRelationship());
        }
        if (request.getResidentialAddress() != null) {
            student.setResidentialAddress(request.getResidentialAddress());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
            userRepository.save(user);
        }
        if (request.getProfilePhotoUrl() != null) {
            user.setProfilePhotoUrl(request.getProfilePhotoUrl());
            userRepository.save(user);
        }

        student = studentRepository.save(student);

        log.info("Updated student: {} (id: {})", user.getFullName(), studentId);

        return StudentDto.fromEntity(student);
    }

    @Transactional(readOnly = true)
    public Page<StudentSummaryDto> getAllStudents(Long schoolId, Pageable pageable,
                                                  YearGroup yearGroup, Long programId, Long classId) {
        return studentRepository.findByFilters(schoolId, yearGroup, programId, classId, pageable)
                .map(StudentSummaryDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public StudentDto getStudentById(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));
        return StudentDto.fromEntity(student);
    }

    @Transactional
    public void promoteStudents(PromoteStudentsRequest request) {
        if (request.getTargetYearGroup() == YearGroup.SHS3) {
            // Validate: cannot promote TO SHS3 if coming from SHS3 (they should graduate)
            // But promoting SHS2 -> SHS3 is valid
        }

        ClassRoom targetClass = classRoomRepository.findById(request.getTargetClassId())
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", request.getTargetClassId()));

        AcademicYear targetAcademicYear = academicYearRepository.findById(request.getTargetAcademicYearId())
                .orElseThrow(() -> new ResourceNotFoundException("AcademicYear", "id", request.getTargetAcademicYearId()));

        for (Long studentId : request.getStudentIds()) {
            Student student = studentRepository.findById(studentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

            if (student.getCurrentYearGroup() == YearGroup.SHS3) {
                throw new IllegalStateException(
                        "Cannot promote SHS3 student " + student.getUser().getFullName()
                                + ". Use the graduate endpoint instead.");
            }

            student.setCurrentYearGroup(request.getTargetYearGroup());
            student.setCurrentClass(targetClass);
            studentRepository.save(student);

            // Create new enrollment
            StudentEnrollment enrollment = StudentEnrollment.builder()
                    .student(student)
                    .classRoom(targetClass)
                    .academicYear(targetAcademicYear)
                    .yearGroup(request.getTargetYearGroup())
                    .enrollmentDate(LocalDate.now())
                    .isRepeating(false)
                    .build();

            studentEnrollmentRepository.save(enrollment);
        }

        log.info("Promoted {} students to {} in class {}",
                request.getStudentIds().size(), request.getTargetYearGroup(), targetClass.getDisplayName());
    }

    @Transactional
    public void graduateStudents(List<Long> studentIds) {
        for (Long studentId : studentIds) {
            Student student = studentRepository.findById(studentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

            student.setHasGraduated(true);
            student.setActive(false);
            studentRepository.save(student);

            User user = student.getUser();
            user.setActive(false);
            userRepository.save(user);
        }

        log.info("Graduated {} students", studentIds.size());
    }

    // ==================== HELPER METHODS ====================

    private String generateStaffId() {
        String yearPart = String.valueOf(Year.now().getValue());
        String prefix = "TCH-" + yearPart + "-";

        // Find next sequence number
        long count = teacherRepository.countBySchoolIdAndStaffIdStartingWith(0L, prefix);
        // Use a simpler approach: count all teachers with this prefix
        long existingCount = teacherRepository.findAll().stream()
                .filter(t -> t.getStaffId().startsWith(prefix))
                .count();

        String staffId;
        do {
            existingCount++;
            staffId = prefix + String.format("%03d", existingCount);
        } while (teacherRepository.existsByStaffId(staffId));

        return staffId;
    }

    private TeacherDto buildTeacherDto(Teacher teacher) {
        TeacherDto dto = TeacherDto.fromEntity(teacher);

        // Include subject assignments
        List<ClassSubjectAssignment> assignments =
                classSubjectAssignmentRepository.findByTutorIdAndIsActiveTrue(teacher.getUser().getId());

        List<SubjectClassDto> subjectAssignments = assignments.stream()
                .map(SubjectClassDto::fromEntity)
                .toList();

        dto.setSubjectAssignments(subjectAssignments);

        return dto;
    }

    /**
     * Stub method — email sending will be implemented in a later phase.
     */
    private void sendWelcomeEmail(String email, String fullName, String userId) {
        // TODO: Implement email sending in Phase 3
        log.info("Welcome email stub — would send to: {} ({}) with userId: {}", email, fullName, userId);
    }
}
