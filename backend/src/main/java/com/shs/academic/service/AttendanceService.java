package com.shs.academic.service;

import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.*;
import com.shs.academic.model.dto.ai.AtRiskAttendanceStudentDto;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.AttendanceStatus;
import com.shs.academic.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private static final double AT_RISK_THRESHOLD = 80.0;

    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final TermRepository termRepository;
    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final TermResultRepository termResultRepository;

    // ================================================================
    // BULK ATTENDANCE MARKING
    // ================================================================

    @Transactional
    public AttendanceResultDto markBulkAttendance(Long teacherUserId,
                                                   BulkAttendanceRequest request) {
        User markedBy = getUserOrThrow(teacherUserId);
        ClassRoom classRoom = getClassRoomOrThrow(request.getClassRoomId());
        Term term = getTermOrThrow(request.getTermId());

        List<AttendanceDto> records = new ArrayList<>();

        for (BulkAttendanceRequest.AttendanceEntry entry : request.getEntries()) {
            Student student = getStudentOrThrow(entry.getStudentId());

            Attendance attendance = attendanceRepository
                    .findByStudentIdAndDate(student.getId(), request.getDate())
                    .orElse(null);

            if (attendance == null) {
                attendance = Attendance.builder()
                        .student(student)
                        .classRoom(classRoom)
                        .term(term)
                        .date(request.getDate())
                        .isPresent(entry.isPresent())
                        .isLate(entry.isLate())
                        .reason(entry.getReason())
                        .markedBy(markedBy)
                        .build();
            } else {
                attendance.setPresent(entry.isPresent());
                attendance.setLate(entry.isLate());
                attendance.setReason(entry.getReason());
                attendance.setMarkedBy(markedBy);
            }

            records.add(AttendanceDto.fromEntity(attendanceRepository.save(attendance)));
        }

        long present = records.stream().filter(AttendanceDto::isPresent).count();
        long absent = records.stream().filter(r -> !r.isPresent()).count();
        long late = records.stream().filter(AttendanceDto::isLate).count();

        log.info("Bulk attendance marked: class={}, date={}, present={}, absent={}",
                classRoom.getDisplayName(), request.getDate(), present, absent);

        return AttendanceResultDto.builder()
                .classRoomId(classRoom.getId())
                .className(classRoom.getDisplayName())
                .termId(term.getId())
                .date(request.getDate())
                .totalStudents(records.size())
                .markedPresent((int) present)
                .markedAbsent((int) absent)
                .markedLate((int) late)
                .records(records)
                .build();
    }

    // ================================================================
    // SINGLE ATTENDANCE MARKING
    // ================================================================

    @Transactional
    public AttendanceDto markSingleAttendance(Long teacherUserId,
                                               MarkSingleAttendanceRequest request) {
        User markedBy = getUserOrThrow(teacherUserId);
        ClassRoom classRoom = getClassRoomOrThrow(request.getClassRoomId());
        Term term = getTermOrThrow(request.getTermId());
        Student student = getStudentOrThrow(request.getStudentId());

        Attendance attendance = attendanceRepository
                .findByStudentIdAndDate(student.getId(), request.getDate())
                .orElse(null);

        if (attendance == null) {
            attendance = Attendance.builder()
                    .student(student)
                    .classRoom(classRoom)
                    .term(term)
                    .date(request.getDate())
                    .isPresent(request.getIsPresent())
                    .isLate(Boolean.TRUE.equals(request.getIsLate()))
                    .reason(request.getReason())
                    .markedBy(markedBy)
                    .build();
        } else {
            attendance.setPresent(request.getIsPresent());
            attendance.setLate(Boolean.TRUE.equals(request.getIsLate()));
            attendance.setReason(request.getReason());
            attendance.setMarkedBy(markedBy);
        }

        return AttendanceDto.fromEntity(attendanceRepository.save(attendance));
    }

    // ================================================================
    // ADMIN OVERRIDE
    // ================================================================

    @Transactional
    public AttendanceDto adminOverrideAttendance(Long adminUserId,
                                                  AdminAttendanceOverrideRequest request) {
        User admin = getUserOrThrow(adminUserId);
        Student student = getStudentOrThrow(request.getStudentId());

        Attendance attendance = attendanceRepository
                .findByStudentIdAndDate(student.getId(), request.getDate())
                .orElseThrow(() -> new ResourceNotFoundException("Attendance",
                        "student/date", request.getStudentId() + "/" + request.getDate()));

        String overrideReason = request.getOverrideNote() != null
                ? "[ADMIN OVERRIDE] " + request.getOverrideNote()
                : "[ADMIN OVERRIDE]";
        if (request.getReason() != null) {
            overrideReason += " | " + request.getReason();
        }

        attendance.setPresent(request.getIsPresent());
        attendance.setLate(Boolean.TRUE.equals(request.getIsLate()));
        attendance.setReason(overrideReason);
        attendance.setMarkedBy(admin);

        log.info("Admin {} overrode attendance for student {} on {}",
                admin.getFullName(), student.getStudentIndex(), request.getDate());

        return AttendanceDto.fromEntity(attendanceRepository.save(attendance));
    }

    // ================================================================
    // CLASS ATTENDANCE SHEET  (student × date matrix)
    // ================================================================

    @Transactional(readOnly = true)
    public AttendanceSheetDto getClassAttendanceSheet(Long classRoomId, Long termId,
                                                       LocalDate startDate, LocalDate endDate) {
        ClassRoom classRoom = getClassRoomOrThrow(classRoomId);
        Term term = getTermOrThrow(termId);

        List<Student> students = studentRepository.findByCurrentClassId(classRoomId);
        List<LocalDate> dates = attendanceRepository
                .findDistinctDatesByClassRoomAndRange(classRoomId, startDate, endDate);

        List<Attendance> attendances = attendanceRepository
                .findByClassRoomIdAndDateBetween(classRoomId, startDate, endDate);

        // studentId → date → isPresent
        Map<Long, Map<LocalDate, Boolean>> matrix = new HashMap<>();
        // studentId → summary
        Map<Long, AttendanceSummaryDto> summaryMap = new HashMap<>();

        for (Student s : students) {
            matrix.put(s.getId(), new HashMap<>());
            summaryMap.put(s.getId(), AttendanceSummaryDto.builder()
                    .studentId(s.getId())
                    .studentIndex(s.getStudentIndex())
                    .studentName(s.getUser().getFullName())
                    .totalPresent(0).totalAbsent(0).totalLate(0).percentage(0.0)
                    .build());
        }

        for (Attendance a : attendances) {
            Long sid = a.getStudent().getId();
            matrix.computeIfAbsent(sid, k -> new HashMap<>())
                    .put(a.getDate(), a.isPresent());
            AttendanceSummaryDto summary = summaryMap.get(sid);
            if (summary != null) {
                if (a.isPresent()) {
                    summary.setTotalPresent(summary.getTotalPresent() + 1);
                    if (a.isLate()) summary.setTotalLate(summary.getTotalLate() + 1);
                } else {
                    summary.setTotalAbsent(summary.getTotalAbsent() + 1);
                }
            }
        }

        // Calculate percentages
        int totalDays = dates.size();
        summaryMap.values().forEach(s -> {
            if (totalDays > 0) {
                s.setPercentage((double) s.getTotalPresent() / totalDays * 100.0);
            }
        });

        List<StudentSummaryDto> studentSummaries = students.stream()
                .map(s -> StudentSummaryDto.builder()
                        .id(s.getId())
                        .studentIndex(s.getStudentIndex())
                        .fullName(s.getUser().getFullName())
                        .className(classRoom.getDisplayName())
                        .yearGroup(s.getCurrentYearGroup())
                        .programName(s.getCurrentProgram() != null
                                ? s.getCurrentProgram().getProgramType().name() : "")
                        .build())
                .toList();

        return AttendanceSheetDto.builder()
                .students(studentSummaries)
                .dates(dates)
                .attendanceMatrix(matrix)
                .summaryByStudent(summaryMap)
                .build();
    }

    // ================================================================
    // TODAY'S ATTENDANCE REPORT
    // ================================================================

    @Transactional(readOnly = true)
    public DailyAttendanceReportDto getTodayAttendance(Long classRoomId, Long termId) {
        return getDailyAttendanceReport(classRoomId, termId, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public DailyAttendanceReportDto getDailyAttendanceReport(Long classRoomId, Long termId,
                                                              LocalDate date) {
        ClassRoom classRoom = getClassRoomOrThrow(classRoomId);

        List<Student> students = studentRepository.findByCurrentClassId(classRoomId);
        List<Attendance> attendances = attendanceRepository
                .findByClassRoomIdAndDate(classRoomId, date);

        Map<Long, Attendance> attendanceByStudent = attendances.stream()
                .collect(Collectors.toMap(a -> a.getStudent().getId(), a -> a));

        List<DailyAttendanceReportDto.StudentStatusEntry> entries = new ArrayList<>();
        int presentCount = 0, absentCount = 0, lateCount = 0, notMarkedCount = 0;

        for (Student student : students) {
            Attendance a = attendanceByStudent.get(student.getId());
            AttendanceStatus status;
            String reason = null;

            if (a == null) {
                status = AttendanceStatus.NOT_MARKED;
                notMarkedCount++;
            } else if (a.isPresent()) {
                status = a.isLate() ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
                if (a.isLate()) lateCount++;
                else presentCount++;
                reason = a.getReason();
            } else {
                status = AttendanceStatus.ABSENT;
                absentCount++;
                reason = a.getReason();
            }

            entries.add(DailyAttendanceReportDto.StudentStatusEntry.builder()
                    .studentId(student.getId())
                    .studentIndex(student.getStudentIndex())
                    .studentName(student.getUser().getFullName())
                    .status(status)
                    .reason(reason)
                    .build());
        }

        return DailyAttendanceReportDto.builder()
                .classRoomId(classRoomId)
                .className(classRoom.getDisplayName())
                .termId(termId)
                .date(date)
                .totalStudents(students.size())
                .presentCount(presentCount)
                .absentCount(absentCount)
                .lateCount(lateCount)
                .notMarkedCount(notMarkedCount)
                .isFullyMarked(notMarkedCount == 0 && !students.isEmpty())
                .entries(entries)
                .build();
    }

    // ================================================================
    // CLASS ATTENDANCE STATS
    // ================================================================

    @Transactional(readOnly = true)
    public AttendanceStatsDto getClassAttendanceStats(Long classRoomId, Long termId) {
        ClassRoom classRoom = getClassRoomOrThrow(classRoomId);
        Term term = getTermOrThrow(termId);

        List<Student> students = studentRepository.findByCurrentClassId(classRoomId);
        int totalStudents = students.size();

        List<LocalDate> distinctDates = attendanceRepository
                .findDistinctDatesByClassRoomAndTerm(classRoomId, termId);
        int totalDays = distinctDates.size();
        int totalExpected = totalStudents * totalDays;

        Long totalPresent = attendanceRepository
                .countByClassRoomIdAndTermIdAndIsPresent(classRoomId, termId, true);
        Long totalAbsent = attendanceRepository
                .countByClassRoomIdAndTermIdAndIsPresent(classRoomId, termId, false);
        Long totalLate = countLateByClassAndTerm(classRoomId, termId);
        Long totalRecords = attendanceRepository
                .countByClassRoomIdAndTermId(classRoomId, termId);

        double attendanceRate = totalExpected > 0
                ? (double) totalPresent / totalExpected * 100.0 : 0.0;
        double punctualityRate = totalPresent > 0
                ? (double) (totalPresent - totalLate) / totalPresent * 100.0 : 0.0;

        // At-risk: attendance % < threshold
        List<Object[]> studentSummaries = attendanceRepository
                .findStudentSummaryByClassAndTerm(classRoomId, termId);

        int atRiskCount = 0;
        int perfectCount = 0;
        for (Object[] row : studentSummaries) {
            long present = row[1] != null ? ((Number) row[1]).longValue() : 0;
            long total = row[4] != null ? ((Number) row[4]).longValue() : 0;
            if (total > 0) {
                double rate = (double) present / total * 100.0;
                if (rate < AT_RISK_THRESHOLD) atRiskCount++;
                if (rate >= 100.0) perfectCount++;
            }
        }

        return AttendanceStatsDto.builder()
                .scopeId(classRoomId)
                .scopeName(classRoom.getDisplayName())
                .termId(termId)
                .termLabel(term.getTermType().name().replace("_", " "))
                .totalStudents(totalStudents)
                .totalDaysRecorded(totalDays)
                .totalExpectedRecords(totalExpected)
                .totalPresent(totalPresent.intValue())
                .totalAbsent(totalAbsent.intValue())
                .totalLate(totalLate.intValue())
                .overallAttendanceRate(Math.round(attendanceRate * 10.0) / 10.0)
                .punctualityRate(Math.round(punctualityRate * 10.0) / 10.0)
                .studentsWithPerfectAttendance(perfectCount)
                .studentsAtRisk(atRiskCount)
                .build();
    }

    // ================================================================
    // SCHOOL ATTENDANCE STATS
    // ================================================================

    @Transactional(readOnly = true)
    public AttendanceStatsDto getSchoolAttendanceStats(Long schoolId, Long termId) {
        Term term = getTermOrThrow(termId);

        Long totalPresent = attendanceRepository
                .countBySchoolIdAndTermIdAndIsPresent(schoolId, termId, true);
        Long totalAbsent = attendanceRepository
                .countBySchoolIdAndTermIdAndIsPresent(schoolId, termId, false);
        Long totalRecords = attendanceRepository
                .countBySchoolIdAndTermId(schoolId, termId);

        int totalStudents = (int) (totalPresent + totalAbsent);
        double attendanceRate = totalRecords > 0
                ? (double) totalPresent / totalRecords * 100.0 : 0.0;

        List<Object[]> classRows = attendanceRepository
                .findClassBreakdownBySchoolAndTerm(schoolId, termId);

        List<AttendanceStatsDto.ClassAttendanceBreakdownDto> breakdowns = classRows.stream()
                .map(row -> {
                    long p = row[2] != null ? ((Number) row[2]).longValue() : 0;
                    long a = row[3] != null ? ((Number) row[3]).longValue() : 0;
                    long count = row[4] != null ? ((Number) row[4]).longValue() : 0;
                    double rate = count > 0 ? (double) p / count * 100.0 : 0.0;
                    return AttendanceStatsDto.ClassAttendanceBreakdownDto.builder()
                            .classRoomId(((Number) row[0]).longValue())
                            .className((String) row[1])
                            .studentCount((int) (p + a))
                            .totalPresent((int) p)
                            .totalAbsent((int) a)
                            .attendanceRate(Math.round(rate * 10.0) / 10.0)
                            .build();
                })
                .toList();

        return AttendanceStatsDto.builder()
                .scopeId(schoolId)
                .scopeName("School")
                .termId(termId)
                .termLabel(term.getTermType().name().replace("_", " "))
                .totalPresent(totalPresent.intValue())
                .totalAbsent(totalAbsent.intValue())
                .totalLate(0)
                .overallAttendanceRate(Math.round(attendanceRate * 10.0) / 10.0)
                .classBreakdowns(breakdowns)
                .build();
    }

    // ================================================================
    // STUDENT ATTENDANCE ROWS  (for correlation service)
    // ================================================================

    @Transactional(readOnly = true)
    public List<StudentAttendanceRowDto> getStudentAttendanceRows(Long classRoomId, Long termId) {
        List<Student> students = studentRepository.findByCurrentClassId(classRoomId);
        List<Object[]> summaries = attendanceRepository
                .findStudentSummaryByClassAndTerm(classRoomId, termId);

        List<LocalDate> distinctDates = attendanceRepository
                .findDistinctDatesByClassRoomAndTerm(classRoomId, termId);
        List<Attendance> all = attendanceRepository
                .findByClassRoomIdAndTermId(classRoomId, termId);

        // studentId → date → status
        Map<Long, Map<LocalDate, AttendanceStatus>> statusMap = new HashMap<>();
        for (Attendance a : all) {
            Long sid = a.getStudent().getId();
            AttendanceStatus status = a.isPresent()
                    ? (a.isLate() ? AttendanceStatus.LATE : AttendanceStatus.PRESENT)
                    : AttendanceStatus.ABSENT;
            statusMap.computeIfAbsent(sid, k -> new HashMap<>()).put(a.getDate(), status);
        }

        Map<Long, Object[]> summaryBySid = summaries.stream()
                .collect(Collectors.toMap(r -> ((Number) r[0]).longValue(), r -> r));

        Map<Long, Student> studentById = students.stream()
                .collect(Collectors.toMap(Student::getId, s -> s));

        return students.stream().map(s -> {
            Object[] row = summaryBySid.get(s.getId());
            int present = row != null && row[1] != null ? ((Number) row[1]).intValue() : 0;
            int absent = row != null && row[2] != null ? ((Number) row[2]).intValue() : 0;
            int late = row != null && row[3] != null ? ((Number) row[3]).intValue() : 0;
            int total = row != null && row[4] != null ? ((Number) row[4]).intValue() : 0;
            double rate = total > 0 ? (double) present / total * 100.0 : 0.0;

            return StudentAttendanceRowDto.builder()
                    .studentId(s.getId())
                    .studentIndex(s.getStudentIndex())
                    .studentName(s.getUser().getFullName())
                    .totalPresent(present)
                    .totalAbsent(absent)
                    .totalLate(late)
                    .attendanceRate(Math.round(rate * 10.0) / 10.0)
                    .dailyStatus(statusMap.getOrDefault(s.getId(), Collections.emptyMap()))
                    .build();
        }).toList();
    }

    // ================================================================
    // AT-RISK STUDENTS
    // ================================================================

    @Transactional(readOnly = true)
    public List<AtRiskAttendanceStudentDto> getAtRiskStudents(Long classRoomId, Long termId,
                                                               double threshold) {
        List<Object[]> summaries = attendanceRepository
                .findStudentSummaryByClassAndTerm(classRoomId, termId);

        List<AtRiskAttendanceStudentDto> atRisk = new ArrayList<>();

        for (Object[] row : summaries) {
            Long sid = ((Number) row[0]).longValue();
            int present = row[1] != null ? ((Number) row[1]).intValue() : 0;
            int absent = row[2] != null ? ((Number) row[2]).intValue() : 0;
            int late = row[3] != null ? ((Number) row[3]).intValue() : 0;
            int total = row[4] != null ? ((Number) row[4]).intValue() : 0;

            if (total == 0) continue;
            double rate = (double) present / total * 100.0;

            if (rate < threshold) {
                Student student = getStudentOrThrow(sid);
                Double gpa = termResultRepository
                        .findByStudentIdAndTermId(sid, termId)
                        .map(tr -> tr.getGpa())
                        .orElse(null);

                String riskLevel;
                if (rate < 60) riskLevel = "HIGH";
                else if (rate < 75) riskLevel = "MEDIUM";
                else riskLevel = "LOW";

                atRisk.add(AtRiskAttendanceStudentDto.builder()
                        .studentId(sid)
                        .studentIndex(student.getStudentIndex())
                        .studentName(student.getUser().getFullName())
                        .attendanceRate(Math.round(rate * 10.0) / 10.0)
                        .totalPresent(present)
                        .totalAbsent(absent)
                        .totalLate(late)
                        .gpa(gpa)
                        .riskLevel(riskLevel)
                        .build());
            }
        }

        atRisk.sort(Comparator.comparingDouble(AtRiskAttendanceStudentDto::getAttendanceRate));
        return atRisk;
    }

    // ================================================================
    // HELPERS
    // ================================================================

    private Long countLateByClassAndTerm(Long classRoomId, Long termId) {
        List<Attendance> all = attendanceRepository.findByClassRoomIdAndTermId(classRoomId, termId);
        return all.stream().filter(a -> a.isPresent() && a.isLate()).count();
    }

    private User getUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    private ClassRoom getClassRoomOrThrow(Long classRoomId) {
        return classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
    }

    private Term getTermOrThrow(Long termId) {
        return termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));
    }

    private Student getStudentOrThrow(Long studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));
    }
}
