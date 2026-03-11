package com.shs.academic.scheduler;

import com.shs.academic.model.entity.AcademicYear;
import com.shs.academic.model.entity.ClassRoom;
import com.shs.academic.model.entity.EarlyWarning;
import com.shs.academic.model.entity.School;
import com.shs.academic.model.entity.Term;
import com.shs.academic.repository.AcademicYearRepository;
import com.shs.academic.repository.AttendanceRepository;
import com.shs.academic.repository.ClassRoomRepository;
import com.shs.academic.repository.SchoolRepository;
import com.shs.academic.repository.TermRepository;
import com.shs.academic.service.EarlyWarningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class WarningScheduler {

    private final EarlyWarningService earlyWarningService;
    private final SchoolRepository schoolRepository;
    private final AcademicYearRepository academicYearRepository;
    private final TermRepository termRepository;
    private final ClassRoomRepository classRoomRepository;
    private final AttendanceRepository attendanceRepository;

    /**
     * Runs every Monday at 2:00 AM.
     * Analyzes all active students and generates early warnings for the current term.
     */
    @Scheduled(cron = "0 0 2 * * MON")
    public void runWeeklyWarningAnalysis() {
        log.info("Starting scheduled weekly warning analysis...");

        Optional<School> schoolOpt = schoolRepository.findFirstByIsActiveTrue();
        if (schoolOpt.isEmpty()) {
            log.warn("No active school found. Skipping warning analysis.");
            return;
        }

        School school = schoolOpt.get();

        Optional<AcademicYear> yearOpt = academicYearRepository
                .findBySchoolIdAndIsCurrentTrue(school.getId());
        if (yearOpt.isEmpty()) {
            log.warn("No current academic year for school {}. Skipping.", school.getName());
            return;
        }

        Optional<Term> termOpt = termRepository
                .findByAcademicYearIdAndIsCurrentTrue(yearOpt.get().getId());
        if (termOpt.isEmpty()) {
            log.warn("No current term for academic year {}. Skipping.", yearOpt.get().getYearLabel());
            return;
        }

        Term currentTerm = termOpt.get();

        try {
            List<EarlyWarning> warnings = earlyWarningService
                    .analyzeAndGenerateWarnings(school.getId(), currentTerm.getId());

            log.info("Scheduled warning analysis complete: {} warnings generated for {} ({})",
                    warnings.size(), school.getName(),
                    currentTerm.getTermType().name() + " " + yearOpt.get().getYearLabel());
        } catch (Exception e) {
            log.error("Error during scheduled warning analysis: {}", e.getMessage(), e);
        }
    }

    /**
     * Runs every weekday (Mon–Fri) at 4:00 PM.
     * Checks which classes have NOT yet submitted attendance for today and logs a warning.
     */
    @Scheduled(cron = "0 0 16 * * MON-FRI")
    public void checkDailyUnmarkedAttendance() {
        log.info("Starting daily unmarked-attendance check...");

        Optional<School> schoolOpt = schoolRepository.findFirstByIsActiveTrue();
        if (schoolOpt.isEmpty()) return;

        School school = schoolOpt.get();
        Optional<AcademicYear> yearOpt = academicYearRepository
                .findBySchoolIdAndIsCurrentTrue(school.getId());
        if (yearOpt.isEmpty()) return;

        List<ClassRoom> classRooms = classRoomRepository
                .findBySchoolIdAndAcademicYearId(school.getId(), yearOpt.get().getId());

        LocalDate today = LocalDate.now();
        List<String> unmarked = classRooms.stream()
                .filter(cr -> !attendanceRepository.existsByClassRoomIdAndDate(cr.getId(), today))
                .map(ClassRoom::getDisplayName)
                .toList();

        if (unmarked.isEmpty()) {
            log.info("All {} classes have marked attendance for {}.", classRooms.size(), today);
        } else {
            log.warn("Unmarked attendance for {} on {}: {}",
                    today, unmarked.size(), String.join(", ", unmarked));
        }
    }
}
