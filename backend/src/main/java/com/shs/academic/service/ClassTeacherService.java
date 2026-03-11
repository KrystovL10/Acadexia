package com.shs.academic.service;

import com.shs.academic.exception.BadRequestException;
import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.exception.ScoreLockedException;
import com.shs.academic.exception.UnauthorizedScoreAccessException;
import com.shs.academic.model.dto.*;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.WarningLevel;
import com.shs.academic.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClassTeacherService {

    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final TermRepository termRepository;
    private final TermResultRepository termResultRepository;
    private final ScoreRepository scoreRepository;
    private final AttendanceRepository attendanceRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final EarlyWarningRepository earlyWarningRepository;
    private final ClassSubjectAssignmentRepository classSubjectAssignmentRepository;
    private final CumulativeGPARepository cumulativeGPARepository;
    private final UserRepository userRepository;

    // ================================================================
    // CLASS INFO
    // ================================================================

    @Transactional(readOnly = true)
    public ClassRoomDto getMyClass(Long teacherUserId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);
        return buildClassRoomDto(classRoom);
    }

    // ================================================================
    // DASHBOARD
    // ================================================================

    @Transactional(readOnly = true)
    public ClassDashboardDto getClassDashboard(Long teacherUserId, Long termId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);
        Term term = resolveTerm(classRoom, termId);

        List<Student> students = studentRepository.findByCurrentClassId(classRoom.getId());
        int totalStudents = students.size();

        // ─── GPA stats from TermResult ────────────────────────────────
        List<TermResult> termResults =
                termResultRepository.findByClassRoomIdAndTermId(classRoom.getId(), term.getId());

        Double averageGpa = null;
        ClassDashboardDto.StudentGpaDto highestGpa = null;
        ClassDashboardDto.StudentGpaDto lowestGpa = null;
        double passRate = 0;
        double failRate = 0;

        if (!termResults.isEmpty()) {
            averageGpa = termResults.stream()
                    .mapToDouble(TermResult::getGpa)
                    .average()
                    .orElse(0);

            TermResult best = termResults.stream()
                    .max(Comparator.comparingDouble(TermResult::getGpa))
                    .orElseThrow();
            TermResult worst = termResults.stream()
                    .min(Comparator.comparingDouble(TermResult::getGpa))
                    .orElseThrow();

            highestGpa = toStudentGpaDto(best);
            lowestGpa = toStudentGpaDto(worst);

            long passing = termResults.stream()
                    .filter(tr -> tr.getGpa() != null && tr.getGpa() >= 1.6)
                    .count();
            passRate = (passing * 100.0 / termResults.size());
            failRate = 100.0 - passRate;
        }

        // ─── Subject performance ──────────────────────────────────────
        List<ClassSubjectAssignment> assignments =
                classSubjectAssignmentRepository.findByClassRoomIdAndIsActiveTrue(classRoom.getId());
        List<ClassDashboardDto.SubjectPerformanceDto> subjectPerformance =
                buildSubjectPerformance(classRoom.getId(), term.getId(), assignments, totalStudents);

        // ─── Score completion status ──────────────────────────────────
        ScoreCompletionStatusDto scoreCompletionStatus =
                buildScoreCompletionStatus(classRoom, term, assignments, students);

        // ─── Attendance summary ───────────────────────────────────────
        ClassDashboardDto.AttendanceSummaryStats attendanceSummary =
                buildAttendanceSummary(students, term.getId());

        // ─── Active warnings ──────────────────────────────────────────
        Long warningCount = earlyWarningRepository
                .countUnresolvedByClassAndTerm(classRoom.getId(), term.getId());

        // ─── Recent activity (last 5 subjects with score submissions) ─
        List<ClassDashboardDto.RecentActivityDto> recentActivity =
                buildRecentActivity(classRoom.getId(), term.getId(), assignments);

        return ClassDashboardDto.builder()
                .classInfo(buildClassRoomDto(classRoom))
                .termLabel(buildTermLabel(term))
                .totalStudents(totalStudents)
                .averageGpa(averageGpa != null ? round2(averageGpa) : null)
                .highestGpa(highestGpa)
                .lowestGpa(lowestGpa)
                .passRate(round2(passRate))
                .failRate(round2(failRate))
                .subjectPerformance(subjectPerformance)
                .scoreCompletionStatus(scoreCompletionStatus)
                .attendanceSummary(attendanceSummary)
                .activeWarnings(warningCount != null ? warningCount.intValue() : 0)
                .recentActivity(recentActivity)
                .build();
    }

    // ================================================================
    // STUDENT MANAGEMENT
    // ================================================================

    @Transactional(readOnly = true)
    public List<StudentSummaryDto> getClassStudents(Long teacherUserId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);
        return studentRepository.findByCurrentClassId(classRoom.getId())
                .stream()
                .map(StudentSummaryDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudentDetailDto getStudentDetail(Long teacherUserId, Long studentId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student not found: " + studentId));
        validateStudentInClass(student, classRoom);

        Term currentTerm = findCurrentTermForClass(classRoom);

        List<ScoreDto> currentTermScores = currentTerm != null
                ? scoreRepository.findByStudentIdAndTermId(student.getId(), currentTerm.getId())
                        .stream().map(ScoreDto::fromEntity).collect(Collectors.toList())
                : Collections.emptyList();

        Double currentGpa = null;
        Integer positionInClass = null;
        if (currentTerm != null) {
            Optional<TermResult> tr = termResultRepository
                    .findByStudentIdAndTermId(student.getId(), currentTerm.getId());
            if (tr.isPresent()) {
                currentGpa = tr.get().getGpa();
                positionInClass = tr.get().getPositionInClass();
            }
        }

        Double cgpa = cumulativeGPARepository.findByStudentId(student.getId())
                .map(CumulativeGPA::getCgpa)
                .orElse(null);

        List<EarlyWarningDto> activeWarnings = earlyWarningRepository
                .findByStudentIdAndIsResolved(student.getId(), false)
                .stream().map(EarlyWarningDto::fromEntity).collect(Collectors.toList());

        AttendanceSummaryDto attendanceSummary = currentTerm != null
                ? buildStudentAttendanceSummary(student, currentTerm.getId())
                : emptyAttendanceSummary(student);

        StudentDetailDto.BehaviorSummaryDto behaviorSummary = buildBehaviorSummary(
                student.getId(), currentTerm != null ? currentTerm.getId() : null);

        User user = student.getUser();
        return StudentDetailDto.builder()
                .id(student.getId())
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .isFirstLogin(user.isFirstLogin())
                .studentIndex(student.getStudentIndex())
                .dateOfBirth(student.getDateOfBirth())
                .gender(student.getGender())
                .nationality(student.getNationality())
                .hometown(student.getHometown())
                .residentialAddress(student.getResidentialAddress())
                .guardianName(student.getGuardianName())
                .guardianPhone(student.getGuardianPhone())
                .guardianEmail(student.getGuardianEmail())
                .guardianRelationship(student.getGuardianRelationship())
                .beceAggregate(student.getBeceAggregate())
                .beceYear(student.getBeceYear())
                .admissionDate(student.getAdmissionDate())
                .schoolId(student.getSchool().getId())
                .schoolName(student.getSchool().getName())
                .currentYearGroup(student.getCurrentYearGroup() != null
                        ? student.getCurrentYearGroup().name() : null)
                .currentProgramId(student.getCurrentProgram() != null
                        ? student.getCurrentProgram().getId() : null)
                .currentProgramName(student.getCurrentProgram() != null
                        ? student.getCurrentProgram().getDisplayName() : null)
                .currentClassId(classRoom.getId())
                .currentClassName(classRoom.getDisplayName())
                .isActive(student.isActive())
                .hasGraduated(student.isHasGraduated())
                .createdAt(student.getCreatedAt())
                .currentTermScores(currentTermScores)
                .currentGpa(currentGpa)
                .cgpa(cgpa)
                .positionInClass(positionInClass)
                .activeWarnings(activeWarnings)
                .attendanceSummary(attendanceSummary)
                .behaviorSummary(behaviorSummary)
                .build();
    }

    // ================================================================
    // SCORE OVERVIEW (read-only)
    // ================================================================

    @Transactional(readOnly = true)
    public ClassScoreOverviewDto getClassScoreOverview(Long teacherUserId, Long termId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);
        Term term = resolveTerm(classRoom, termId);

        List<Student> students = studentRepository.findByCurrentClassId(classRoom.getId());
        List<StudentSummaryDto> studentDtos = students.stream()
                .map(StudentSummaryDto::fromEntity)
                .collect(Collectors.toList());

        List<ClassSubjectAssignment> assignments =
                classSubjectAssignmentRepository.findByClassRoomIdAndIsActiveTrue(classRoom.getId());
        List<SubjectDto> subjectDtos = assignments.stream()
                .map(a -> SubjectDto.fromEntity(a.getSubject()))
                .collect(Collectors.toList());

        // Build score matrix: studentId → subjectId → ScoreDto
        List<Score> allScores = scoreRepository.findByClassRoomIdAndTermId(
                classRoom.getId(), term.getId());
        Map<Long, Map<Long, ScoreDto>> scoreMatrix = new HashMap<>();
        for (Student s : students) {
            scoreMatrix.put(s.getId(), new HashMap<>());
        }
        for (Score score : allScores) {
            scoreMatrix.computeIfAbsent(score.getStudent().getId(), k -> new HashMap<>())
                       .put(score.getSubject().getId(), ScoreDto.fromEntity(score));
        }

        List<ScoreCompletionStatusDto.SubjectCompletionDto> subjectCompletions =
                buildSubjectCompletionList(assignments, students, scoreMatrix);

        return ClassScoreOverviewDto.builder()
                .students(studentDtos)
                .subjects(subjectDtos)
                .scoreMatrix(scoreMatrix)
                .subjectCompletions(subjectCompletions)
                .build();
    }

    // ================================================================
    // ATTENDANCE MANAGEMENT
    // ================================================================

    @Transactional
    public AttendanceDto markAttendance(Long teacherUserId, MarkAttendanceRequest request) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = classRoomRepository.findById(request.getClassRoomId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ClassRoom not found: " + request.getClassRoomId()));

        validateTeacherOwnsClass(teacher, classRoom);

        if (request.getDate().isAfter(LocalDate.now())) {
            throw new BadRequestException("Cannot mark attendance for a future date");
        }

        Term term = termRepository.findById(request.getTermId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Term not found: " + request.getTermId()));

        if (term.isScoresLocked()) {
            throw new ScoreLockedException("Term is locked. Attendance cannot be modified.");
        }

        User markedByUser = teacher.getUser();

        boolean alreadyMarked = attendanceRepository
                .existsByClassRoomIdAndDate(classRoom.getId(), request.getDate());

        int presentCount = 0;
        int absentCount = 0;

        for (MarkAttendanceRequest.AttendanceEntryDto entry : request.getEntries()) {
            Student student = studentRepository.findById(entry.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Student not found: " + entry.getStudentId()));
            validateStudentInClass(student, classRoom);

            boolean isPresent = Boolean.TRUE.equals(entry.getIsPresent());

            if (alreadyMarked) {
                List<Attendance> existing = attendanceRepository.findByClassRoomIdAndDate(
                        classRoom.getId(), request.getDate());
                Optional<Attendance> match = existing.stream()
                        .filter(a -> a.getStudent().getId().equals(entry.getStudentId()))
                        .findFirst();
                if (match.isPresent()) {
                    Attendance att = match.get();
                    att.setPresent(isPresent);
                    att.setLate(Boolean.TRUE.equals(entry.getIsLate()));
                    att.setReason(entry.getReason());
                    att.setMarkedBy(markedByUser);
                    att.setMarkedAt(LocalDateTime.now());
                    attendanceRepository.save(att);
                } else {
                    createAttendanceRecord(student, classRoom, term,
                            request.getDate(), isPresent, entry, markedByUser);
                }
            } else {
                createAttendanceRecord(student, classRoom, term,
                        request.getDate(), isPresent, entry, markedByUser);
            }

            if (isPresent) presentCount++;
            else absentCount++;
        }

        log.info("Attendance marked for class {} on {} — present: {}, absent: {}",
                classRoom.getDisplayName(), request.getDate(), presentCount, absentCount);

        return AttendanceDto.builder()
                .classRoomId(classRoom.getId())
                .className(classRoom.getDisplayName())
                .termId(term.getId())
                .date(request.getDate())
                .markedById(teacher.getUser().getId())
                .markedByName(teacher.getUser().getFullName())
                .markedAt(LocalDateTime.now())
                .build();
    }

    @Transactional(readOnly = true)
    public List<AttendanceSummaryDto> getClassAttendanceSummary(
            Long teacherUserId, Long termId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);
        Term term = resolveTerm(classRoom, termId);

        return studentRepository.findByCurrentClassId(classRoom.getId())
                .stream()
                .map(s -> buildStudentAttendanceSummary(s, term.getId()))
                .sorted(Comparator.comparingDouble(AttendanceSummaryDto::getPercentage))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AttendanceSheetDto getAttendanceSheet(
            Long teacherUserId, Long termId,
            LocalDate startDate, LocalDate endDate) {

        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);
        Term term = resolveTerm(classRoom, termId);

        List<Student> students = studentRepository.findByCurrentClassId(classRoom.getId());
        List<StudentSummaryDto> studentDtos = students.stream()
                .map(StudentSummaryDto::fromEntity)
                .collect(Collectors.toList());

        List<Attendance> records = attendanceRepository
                .findByClassRoomIdAndDateBetween(classRoom.getId(), startDate, endDate);

        List<LocalDate> dates = records.stream()
                .map(Attendance::getDate)
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        Map<Long, Map<LocalDate, Boolean>> matrix = new HashMap<>();
        for (Student s : students) matrix.put(s.getId(), new HashMap<>());
        for (Attendance att : records) {
            matrix.computeIfAbsent(att.getStudent().getId(), k -> new HashMap<>())
                  .put(att.getDate(), att.isPresent());
        }

        Map<Long, AttendanceSummaryDto> summaryByStudent = new LinkedHashMap<>();
        for (Student s : students) {
            summaryByStudent.put(s.getId(), buildStudentAttendanceSummary(s, term.getId()));
        }

        return AttendanceSheetDto.builder()
                .students(studentDtos)
                .dates(dates)
                .attendanceMatrix(matrix)
                .summaryByStudent(summaryByStudent)
                .build();
    }

    // ================================================================
    // BEHAVIOR LOG
    // ================================================================

    @Transactional
    public BehaviorLogDto addBehaviorLog(Long teacherUserId,
            CreateBehaviorLogRequest request) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = classRoomRepository.findById(request.getClassRoomId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ClassRoom not found: " + request.getClassRoomId()));

        validateTeacherOwnsClass(teacher, classRoom);

        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student not found: " + request.getStudentId()));
        validateStudentInClass(student, classRoom);

        Term term = termRepository.findById(request.getTermId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Term not found: " + request.getTermId()));

        BehaviorLog behaviorLog = BehaviorLog.builder()
                .student(student)
                .classRoom(classRoom)
                .term(term)
                .logType(request.getLogType())
                .title(request.getTitle())
                .description(request.getDescription())
                .severity(request.getSeverity())
                .loggedBy(teacher.getUser())
                .build();

        behaviorLog = behaviorLogRepository.save(behaviorLog);

        // Auto-create LOW early warning for HIGH-severity discipline issues
        if ("DISCIPLINE_ISSUE".equalsIgnoreCase(request.getLogType())
                && "HIGH".equalsIgnoreCase(request.getSeverity())) {
            autoCreateBehaviourWarning(student, term, request);
        }

        return BehaviorLogDto.fromEntity(behaviorLog);
    }

    @Transactional(readOnly = true)
    public List<BehaviorLogDto> getStudentBehaviorLogs(
            Long teacherUserId, Long studentId, Long termId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student not found: " + studentId));
        validateStudentInClass(student, classRoom);

        Term term = resolveTerm(classRoom, termId);

        return behaviorLogRepository.findByStudentIdAndTermId(student.getId(), term.getId())
                .stream()
                .map(BehaviorLogDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BehaviorLogDto> getClassBehaviorLogs(Long teacherUserId, Long termId) {
        Teacher teacher = resolveTeacher(teacherUserId);
        ClassRoom classRoom = requireAssignedClass(teacher);
        Term term = resolveTerm(classRoom, termId);

        return behaviorLogRepository
                .findByClassRoomIdAndTermId(classRoom.getId(), term.getId())
                .stream()
                .sorted(Comparator.comparing(BehaviorLog::getLoggedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(BehaviorLogDto::fromEntity)
                .collect(Collectors.toList());
    }

    // ================================================================
    // PRIVATE HELPERS
    // ================================================================

    private Teacher resolveTeacher(Long userPk) {
        return teacherRepository.findByUserId(userPk)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Teacher profile not found for userId=" + userPk));
    }

    private ClassRoom requireAssignedClass(Teacher teacher) {
        if (teacher.getAssignedClass() == null) {
            throw new ResourceNotFoundException(
                    "Teacher " + teacher.getStaffId() + " has no assigned class");
        }
        return teacher.getAssignedClass();
    }

    private void validateTeacherOwnsClass(Teacher teacher, ClassRoom classRoom) {
        if (teacher.getAssignedClass() == null
                || !teacher.getAssignedClass().getId().equals(classRoom.getId())) {
            throw new UnauthorizedScoreAccessException(
                    "Teacher is not the class teacher for classRoom " + classRoom.getId());
        }
    }

    private void validateStudentInClass(Student student, ClassRoom classRoom) {
        if (student.getCurrentClass() == null
                || !student.getCurrentClass().getId().equals(classRoom.getId())) {
            throw new UnauthorizedScoreAccessException(
                    "Student " + student.getStudentIndex()
                            + " does not belong to class " + classRoom.getDisplayName());
        }
    }

    private Term resolveTerm(ClassRoom classRoom, Long termId) {
        if (termId != null) {
            return termRepository.findById(termId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Term not found: " + termId));
        }
        return termRepository
                .findByAcademicYearIdAndIsCurrentTrue(classRoom.getAcademicYear().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No current term found for academic year "
                                + classRoom.getAcademicYear().getYearLabel()));
    }

    private Term findCurrentTermForClass(ClassRoom classRoom) {
        return termRepository
                .findByAcademicYearIdAndIsCurrentTrue(classRoom.getAcademicYear().getId())
                .orElse(null);
    }

    private String buildTermLabel(Term term) {
        String termName = switch (term.getTermType()) {
            case TERM_1 -> "Term 1";
            case TERM_2 -> "Term 2";
            case TERM_3 -> "Term 3";
        };
        return termName + " — " + term.getAcademicYear().getYearLabel();
    }

    private ClassRoomDto buildClassRoomDto(ClassRoom classRoom) {
        List<Student> students = studentRepository.findByCurrentClassId(classRoom.getId());
        ClassRoomDto dto = ClassRoomDto.fromEntity(classRoom);
        dto.setStudentCount(students.size());
        return dto;
    }

    private ClassDashboardDto.StudentGpaDto toStudentGpaDto(TermResult tr) {
        return ClassDashboardDto.StudentGpaDto.builder()
                .studentId(tr.getStudent().getId())
                .studentName(tr.getStudent().getUser().getFullName())
                .studentIndex(tr.getStudent().getStudentIndex())
                .gpa(tr.getGpa())
                .build();
    }

    private List<ClassDashboardDto.SubjectPerformanceDto> buildSubjectPerformance(
            Long classRoomId, Long termId,
            List<ClassSubjectAssignment> assignments, int totalStudents) {

        List<Score> allScores = scoreRepository.findByClassRoomIdAndTermId(classRoomId, termId);

        Map<Long, List<Score>> bySubject = allScores.stream()
                .filter(s -> !s.isAbsent() && s.getTotalScore() != null)
                .collect(Collectors.groupingBy(s -> s.getSubject().getId()));

        return assignments.stream().map(assignment -> {
            Long subjectId = assignment.getSubject().getId();
            List<Score> subjectScores = bySubject.getOrDefault(subjectId, Collections.emptyList());

            double avgScore = subjectScores.isEmpty() ? 0
                    : subjectScores.stream().mapToDouble(Score::getTotalScore).average().orElse(0);

            long passing = subjectScores.stream()
                    .filter(s -> s.getTotalScore() != null && s.getTotalScore() >= 50)
                    .count();
            double subjectPassRate = subjectScores.isEmpty() ? 0
                    : (passing * 100.0 / subjectScores.size());

            String tutorName = assignment.getTutor() != null
                    ? assignment.getTutor().getFullName() : "Unassigned";

            return ClassDashboardDto.SubjectPerformanceDto.builder()
                    .subjectId(subjectId)
                    .subjectName(assignment.getSubject().getName())
                    .subjectCode(assignment.getSubject().getSubjectCode())
                    .avgScore(round2(avgScore))
                    .passRate(round2(subjectPassRate))
                    .tutorName(tutorName)
                    .studentsWithScores(subjectScores.size())
                    .totalStudents(totalStudents)
                    .build();
        }).collect(Collectors.toList());
    }

    private ScoreCompletionStatusDto buildScoreCompletionStatus(
            ClassRoom classRoom, Term term,
            List<ClassSubjectAssignment> assignments, List<Student> students) {

        List<Score> allScores = scoreRepository.findByClassRoomIdAndTermId(
                classRoom.getId(), term.getId());
        Map<Long, Map<Long, ScoreDto>> scoreMatrix = new HashMap<>();
        for (Student s : students) scoreMatrix.put(s.getId(), new HashMap<>());
        for (Score score : allScores) {
            scoreMatrix.computeIfAbsent(score.getStudent().getId(), k -> new HashMap<>())
                       .put(score.getSubject().getId(), ScoreDto.fromEntity(score));
        }

        List<ScoreCompletionStatusDto.SubjectCompletionDto> subjectCompletions =
                buildSubjectCompletionList(assignments, students, scoreMatrix);

        int totalStudents = students.size();
        int totalSubjects = assignments.size();
        int totalExpected = totalStudents * totalSubjects;
        int totalSubmitted = subjectCompletions.stream()
                .mapToInt(ScoreCompletionStatusDto.SubjectCompletionDto::getStudentsWithScores)
                .sum();

        double overallPct = totalExpected > 0
                ? (totalSubmitted * 100.0 / totalExpected) : 0;
        boolean allComplete = subjectCompletions.stream()
                .allMatch(s -> s.getStudentsWithoutScores() == 0);

        return ScoreCompletionStatusDto.builder()
                .classRoomId(classRoom.getId())
                .className(classRoom.getDisplayName())
                .termId(term.getId())
                .termName(buildTermLabel(term))
                .overallCompletionPercentage(round2(overallPct))
                .allComplete(allComplete)
                .totalStudents(totalStudents)
                .totalSubjects(totalSubjects)
                .subjects(subjectCompletions)
                .build();
    }

    private List<ScoreCompletionStatusDto.SubjectCompletionDto> buildSubjectCompletionList(
            List<ClassSubjectAssignment> assignments,
            List<Student> students,
            Map<Long, Map<Long, ScoreDto>> scoreMatrix) {

        return assignments.stream().map(assignment -> {
            Long subjectId = assignment.getSubject().getId();

            List<StudentSummaryDto> missing = students.stream()
                    .filter(s -> !scoreMatrix.getOrDefault(s.getId(), Collections.emptyMap())
                            .containsKey(subjectId))
                    .map(StudentSummaryDto::fromEntity)
                    .collect(Collectors.toList());

            int withScores = students.size() - missing.size();
            String tutorName = assignment.getTutor() != null
                    ? assignment.getTutor().getFullName() : "Unassigned";

            return ScoreCompletionStatusDto.SubjectCompletionDto.builder()
                    .subjectId(subjectId)
                    .subjectName(assignment.getSubject().getName())
                    .tutorName(tutorName)
                    .studentsWithScores(withScores)
                    .studentsWithoutScores(missing.size())
                    .missingStudents(missing)
                    .build();
        }).collect(Collectors.toList());
    }

    private ClassDashboardDto.AttendanceSummaryStats buildAttendanceSummary(
            List<Student> students, Long termId) {

        if (students.isEmpty()) {
            return ClassDashboardDto.AttendanceSummaryStats.builder()
                    .avgAttendance(0.0).studentsBelow75Percent(0).build();
        }

        double total = 0;
        int below75 = 0;
        for (Student s : students) {
            double pct = buildStudentAttendanceSummary(s, termId).getPercentage();
            total += pct;
            if (pct < 75.0) below75++;
        }

        return ClassDashboardDto.AttendanceSummaryStats.builder()
                .avgAttendance(round2(total / students.size()))
                .studentsBelow75Percent(below75)
                .build();
    }

    private AttendanceSummaryDto buildStudentAttendanceSummary(Student student, Long termId) {
        Long present = attendanceRepository
                .countByStudentIdAndTermIdAndIsPresent(student.getId(), termId, true);
        Long absent = attendanceRepository
                .countByStudentIdAndTermIdAndIsPresent(student.getId(), termId, false);

        long presentVal = present != null ? present : 0;
        long absentVal = absent != null ? absent : 0;
        long total = presentVal + absentVal;
        double pct = total > 0 ? (presentVal * 100.0 / total) : 0.0;

        return AttendanceSummaryDto.builder()
                .studentId(student.getId())
                .studentIndex(student.getStudentIndex())
                .studentName(student.getUser().getFullName())
                .totalPresent((int) presentVal)
                .totalAbsent((int) absentVal)
                .totalLate(0)
                .percentage(round2(pct))
                .build();
    }

    private AttendanceSummaryDto emptyAttendanceSummary(Student student) {
        return AttendanceSummaryDto.builder()
                .studentId(student.getId())
                .studentIndex(student.getStudentIndex())
                .studentName(student.getUser().getFullName())
                .totalPresent(0).totalAbsent(0).totalLate(0).percentage(0.0)
                .build();
    }

    private List<ClassDashboardDto.RecentActivityDto> buildRecentActivity(
            Long classRoomId, Long termId,
            List<ClassSubjectAssignment> assignments) {

        List<Score> allScores = scoreRepository.findByClassRoomIdAndTermId(classRoomId, termId);
        Map<Long, List<Score>> bySubject = allScores.stream()
                .collect(Collectors.groupingBy(s -> s.getSubject().getId()));

        List<ClassDashboardDto.RecentActivityDto> activities = new ArrayList<>();
        for (ClassSubjectAssignment assignment : assignments) {
            Long subjectId = assignment.getSubject().getId();
            List<Score> subjectScores = bySubject.getOrDefault(subjectId, Collections.emptyList());
            if (subjectScores.isEmpty()) continue;

            LocalDateTime lastAt = subjectScores.stream()
                    .map(Score::getSubmittedAt)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(null);
            if (lastAt == null) continue;

            activities.add(ClassDashboardDto.RecentActivityDto.builder()
                    .subjectId(subjectId)
                    .subjectName(assignment.getSubject().getName())
                    .tutorName(assignment.getTutor() != null
                            ? assignment.getTutor().getFullName() : "Unassigned")
                    .scoresSubmitted(subjectScores.size())
                    .lastSubmittedAt(lastAt)
                    .build());
        }

        return activities.stream()
                .sorted(Comparator.comparing(ClassDashboardDto.RecentActivityDto::getLastSubmittedAt,
                        Comparator.reverseOrder()))
                .limit(5)
                .collect(Collectors.toList());
    }

    private StudentDetailDto.BehaviorSummaryDto buildBehaviorSummary(
            Long studentId, Long termId) {
        List<BehaviorLog> logs = termId != null
                ? behaviorLogRepository.findByStudentIdAndTermId(studentId, termId)
                : behaviorLogRepository.findByStudentId(studentId);

        int achievements = (int) logs.stream()
                .filter(l -> "ACHIEVEMENT".equalsIgnoreCase(l.getLogType()))
                .count();
        int discipline = (int) logs.stream()
                .filter(l -> "DISCIPLINE_ISSUE".equalsIgnoreCase(l.getLogType()))
                .count();
        LocalDateTime lastLogDate = logs.stream()
                .map(BehaviorLog::getLoggedAt)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);

        return StudentDetailDto.BehaviorSummaryDto.builder()
                .achievementCount(achievements)
                .disciplineCount(discipline)
                .lastLogDate(lastLogDate)
                .build();
    }

    private void autoCreateBehaviourWarning(Student student, Term term,
            CreateBehaviorLogRequest request) {
        String warningType = "BEHAVIOUR_CONCERN";
        boolean exists = earlyWarningRepository
                .findByStudentIdAndTermIdAndWarningTypeAndIsResolvedFalse(
                        student.getId(), term.getId(), warningType)
                .isPresent();
        if (exists) return;

        String desc = "Behaviour concern logged: " + request.getTitle()
                + (request.getDescription() != null ? " — " + request.getDescription() : "");

        EarlyWarning warning = EarlyWarning.builder()
                .student(student)
                .term(term)
                .warningLevel(WarningLevel.LOW)
                .warningType(warningType)
                .description(desc)
                .suggestedAction(
                        "Review student behaviour record and schedule a meeting with guardian.")
                .isResolved(false)
                .isAiGenerated(false)
                .build();
        earlyWarningRepository.save(warning);
        log.info("Auto-created LOW behaviour warning for student {} term {}",
                student.getStudentIndex(), term.getId());
    }

    private void createAttendanceRecord(Student student, ClassRoom classRoom, Term term,
            LocalDate date, boolean isPresent,
            MarkAttendanceRequest.AttendanceEntryDto entry, User markedBy) {
        Attendance att = Attendance.builder()
                .student(student)
                .classRoom(classRoom)
                .term(term)
                .date(date)
                .isPresent(isPresent)
                .isLate(Boolean.TRUE.equals(entry.getIsLate()))
                .reason(entry.getReason())
                .markedBy(markedBy)
                .markedAt(LocalDateTime.now())
                .build();
        attendanceRepository.save(att);
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
