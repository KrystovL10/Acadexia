package com.shs.academic.service;

import com.shs.academic.exception.DuplicateResourceException;
import com.shs.academic.exception.ResourceNotFoundException;
import com.shs.academic.model.dto.*;
import com.shs.academic.model.entity.*;
import com.shs.academic.model.enums.ProgramType;
import com.shs.academic.model.enums.YearGroup;
import com.shs.academic.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AcademicStructureService {

    private final SchoolRepository schoolRepository;
    private final AcademicYearRepository academicYearRepository;
    private final TermRepository termRepository;
    private final ProgramRepository programRepository;
    private final SubjectRepository subjectRepository;
    private final ProgramSubjectRepository programSubjectRepository;
    private final ClassRoomRepository classRoomRepository;
    private final StudentRepository studentRepository;

    // ==================== SCHOOL MANAGEMENT ====================

    @Transactional(readOnly = true)
    public SchoolDto getSchoolProfile(Long schoolId) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School", "id", schoolId));
        return SchoolDto.fromEntity(school);
    }

    @Transactional
    public SchoolDto updateSchoolProfile(Long schoolId, UpdateSchoolRequest request) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School", "id", schoolId));

        if (request.getName() != null) {
            school.setName(request.getName());
        }
        if (request.getAddress() != null) {
            school.setAddress(request.getAddress());
        }
        if (request.getPhoneNumber() != null) {
            school.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getEmail() != null) {
            school.setEmail(request.getEmail());
        }
        if (request.getMotto() != null) {
            school.setMotto(request.getMotto());
        }
        if (request.getHeadmasterName() != null) {
            school.setHeadmasterName(request.getHeadmasterName());
        }
        if (request.getLogoUrl() != null) {
            school.setLogoUrl(request.getLogoUrl());
        }

        school = schoolRepository.save(school);
        log.info("Updated school profile: {} (id: {})", school.getName(), schoolId);

        return SchoolDto.fromEntity(school);
    }

    // ==================== ACADEMIC YEAR MANAGEMENT ====================

    @Transactional
    public AcademicYearDto createAcademicYear(Long schoolId, CreateAcademicYearRequest request) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School", "id", schoolId));

        if (academicYearRepository.existsBySchoolIdAndYearLabel(schoolId, request.getYearLabel())) {
            throw new DuplicateResourceException("AcademicYear", "yearLabel", request.getYearLabel());
        }

        // If isCurrent=true, unset all other years first
        if (request.isCurrent()) {
            unsetAllCurrentAcademicYears(schoolId);
        }

        AcademicYear year = AcademicYear.builder()
                .school(school)
                .yearLabel(request.getYearLabel())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isCurrent(request.isCurrent())
                .terms(new ArrayList<>())
                .build();

        year = academicYearRepository.save(year);
        log.info("Created academic year: {} for school: {}", request.getYearLabel(), school.getName());

        return AcademicYearDto.fromEntity(year);
    }

    @Transactional
    public AcademicYearDto setCurrentAcademicYear(Long academicYearId) {
        AcademicYear year = academicYearRepository.findById(academicYearId)
                .orElseThrow(() -> new ResourceNotFoundException("AcademicYear", "id", academicYearId));

        unsetAllCurrentAcademicYears(year.getSchool().getId());

        year.setCurrent(true);
        year = academicYearRepository.save(year);
        log.info("Set current academic year: {} (id: {})", year.getYearLabel(), academicYearId);

        return AcademicYearDto.fromEntity(year);
    }

    @Transactional(readOnly = true)
    public List<AcademicYearDto> getAllAcademicYears(Long schoolId) {
        return academicYearRepository.findBySchoolIdOrderByYearLabelDesc(schoolId)
                .stream()
                .map(AcademicYearDto::fromEntity)
                .toList();
    }

    private void unsetAllCurrentAcademicYears(Long schoolId) {
        List<AcademicYear> allYears = academicYearRepository.findBySchoolIdOrderByYearLabelDesc(schoolId);
        for (AcademicYear y : allYears) {
            if (y.isCurrent()) {
                y.setCurrent(false);
                academicYearRepository.save(y);
            }
        }
    }

    // ==================== TERM MANAGEMENT ====================

    @Transactional
    public TermDto createTerm(CreateTermRequest request) {
        AcademicYear year = academicYearRepository.findById(request.getAcademicYearId())
                .orElseThrow(() -> new ResourceNotFoundException("AcademicYear", "id", request.getAcademicYearId()));

        if (termRepository.existsByAcademicYearIdAndTermType(year.getId(), request.getTermType())) {
            throw new DuplicateResourceException("Term", "termType",
                    request.getTermType().name() + " for academic year " + year.getYearLabel());
        }

        // If isCurrent=true, unset other terms in this year
        if (request.isCurrent()) {
            unsetAllCurrentTerms(year.getId());
        }

        Term term = Term.builder()
                .academicYear(year)
                .termType(request.getTermType())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isCurrent(request.isCurrent())
                .isScoresLocked(false)
                .build();

        term = termRepository.save(term);
        log.info("Created term: {} for academic year: {}", request.getTermType(), year.getYearLabel());

        return TermDto.fromEntity(term);
    }

    @Transactional
    public TermDto setCurrentTerm(Long termId) {
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        unsetAllCurrentTerms(term.getAcademicYear().getId());

        term.setCurrent(true);
        term = termRepository.save(term);
        log.info("Set current term: {} (id: {})", term.getTermType(), termId);

        return TermDto.fromEntity(term);
    }

    @Transactional
    public TermDto lockTermScores(Long termId) {
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        term.setScoresLocked(true);
        term = termRepository.save(term);
        log.info("Locked scores for term: {} (id: {})", term.getTermType(), termId);

        return TermDto.fromEntity(term);
    }

    @Transactional
    public TermDto unlockTermScores(Long termId) {
        Term term = termRepository.findById(termId)
                .orElseThrow(() -> new ResourceNotFoundException("Term", "id", termId));

        term.setScoresLocked(false);
        term = termRepository.save(term);
        log.info("Unlocked scores for term: {} (id: {})", term.getTermType(), termId);

        return TermDto.fromEntity(term);
    }

    private void unsetAllCurrentTerms(Long academicYearId) {
        List<Term> terms = termRepository.findByAcademicYearId(academicYearId);
        for (Term t : terms) {
            if (t.isCurrent()) {
                t.setCurrent(false);
                termRepository.save(t);
            }
        }
    }

    // ==================== PROGRAM MANAGEMENT ====================

    @Transactional
    public ProgramDto createProgram(Long schoolId, CreateProgramRequest request) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School", "id", schoolId));

        if (programRepository.findByProgramTypeAndSchoolId(request.getProgramType(), schoolId).isPresent()) {
            throw new DuplicateResourceException("Program", "programType", request.getProgramType().name());
        }

        String displayName = buildProgramDisplayName(request.getProgramType());

        Program program = Program.builder()
                .programType(request.getProgramType())
                .displayName(displayName)
                .description(request.getDescription())
                .school(school)
                .isActive(true)
                .programSubjects(new ArrayList<>())
                .build();

        program = programRepository.save(program);

        // Auto-seed default subjects for this program type
        seedDefaultSubjectsForProgram(program, school);

        // Re-fetch to include seeded subjects
        program = programRepository.findById(program.getId()).orElse(program);

        log.info("Created program: {} for school: {}", displayName, school.getName());

        return ProgramDto.fromEntity(program);
    }

    @Transactional(readOnly = true)
    public ProgramDto getProgramById(Long programId) {
        Program program = programRepository.findById(programId)
                .orElseThrow(() -> new ResourceNotFoundException("Program", "id", programId));
        return ProgramDto.fromEntity(program);
    }

    @Transactional(readOnly = true)
    public List<ProgramDto> getAllPrograms(Long schoolId) {
        return programRepository.findBySchoolIdAndIsActive(schoolId, true)
                .stream()
                .map(ProgramDto::fromEntity)
                .toList();
    }

    // ==================== SUBJECT MANAGEMENT ====================

    @Transactional
    public SubjectDto createSubject(Long schoolId, CreateSubjectRequest request) {
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School", "id", schoolId));

        String subjectCode = request.getSubjectCode();
        if (subjectCode == null || subjectCode.isBlank()) {
            subjectCode = generateSubjectCode(request.getName(), schoolId);
        }

        if (subjectRepository.findBySubjectCodeAndSchoolId(subjectCode, schoolId).isPresent()) {
            throw new DuplicateResourceException("Subject", "subjectCode", subjectCode);
        }

        Subject subject = Subject.builder()
                .subjectCode(subjectCode)
                .name(request.getName())
                .isCore(request.isCore())
                .isElective(request.isElective())
                .school(school)
                .isActive(true)
                .build();

        subject = subjectRepository.save(subject);
        log.info("Created subject: {} ({}) for school: {}", request.getName(), subjectCode, school.getName());

        return SubjectDto.fromEntity(subject);
    }

    @Transactional
    public SubjectDto updateSubject(Long subjectId, UpdateSubjectRequest request) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", subjectId));

        if (request.getName() != null) {
            subject.setName(request.getName());
        }
        if (request.getSubjectCode() != null) {
            // Validate no duplicate
            Optional<Subject> existing = subjectRepository.findBySubjectCodeAndSchoolId(
                    request.getSubjectCode(), subject.getSchool().getId());
            if (existing.isPresent() && !existing.get().getId().equals(subjectId)) {
                throw new DuplicateResourceException("Subject", "subjectCode", request.getSubjectCode());
            }
            subject.setSubjectCode(request.getSubjectCode());
        }
        if (request.getIsCore() != null) {
            subject.setCore(request.getIsCore());
        }
        if (request.getIsElective() != null) {
            subject.setElective(request.getIsElective());
        }

        subject = subjectRepository.save(subject);
        log.info("Updated subject: {} (id: {})", subject.getName(), subjectId);

        return SubjectDto.fromEntity(subject);
    }

    @Transactional
    public void deleteSubject(Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", subjectId));

        subject.setActive(false);
        subjectRepository.save(subject);
        log.info("Soft-deleted subject: {} (id: {})", subject.getName(), subjectId);
    }

    @Transactional(readOnly = true)
    public List<SubjectDto> getAllSubjects(Long schoolId) {
        return subjectRepository.findBySchoolId(schoolId)
                .stream()
                .filter(Subject::isActive)
                .map(SubjectDto::fromEntity)
                .toList();
    }

    // ==================== PROGRAM-SUBJECT ASSIGNMENT ====================

    @Transactional
    public ProgramSubjectDto assignSubjectToProgram(AssignSubjectRequest request) {
        Program program = programRepository.findById(request.getProgramId())
                .orElseThrow(() -> new ResourceNotFoundException("Program", "id", request.getProgramId()));

        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject", "id", request.getSubjectId()));

        if (programSubjectRepository.existsByProgramIdAndSubjectIdAndYearGroup(
                request.getProgramId(), request.getSubjectId(), request.getYearGroup())) {
            throw new DuplicateResourceException("ProgramSubject",
                    "program+subject+yearGroup",
                    program.getDisplayName() + " / " + subject.getName() + " / " + request.getYearGroup());
        }

        ProgramSubject ps = ProgramSubject.builder()
                .program(program)
                .subject(subject)
                .yearGroup(request.getYearGroup())
                .isCompulsory(request.isCompulsory())
                .build();

        ps = programSubjectRepository.save(ps);
        log.info("Assigned subject {} to program {} for {}",
                subject.getName(), program.getDisplayName(), request.getYearGroup());

        return ProgramSubjectDto.fromEntity(ps);
    }

    @Transactional
    public void removeSubjectFromProgram(Long programSubjectId) {
        ProgramSubject ps = programSubjectRepository.findById(programSubjectId)
                .orElseThrow(() -> new ResourceNotFoundException("ProgramSubject", "id", programSubjectId));

        programSubjectRepository.delete(ps);
        log.info("Removed subject {} from program {} (id: {})",
                ps.getSubject().getName(), ps.getProgram().getDisplayName(), programSubjectId);
    }

    // ==================== CLASSROOM MANAGEMENT ====================

    @Transactional
    public ClassRoomDto createClassRoom(CreateClassRoomRequest request) {
        School school = schoolRepository.findById(request.getSchoolId())
                .orElseThrow(() -> new ResourceNotFoundException("School", "id", request.getSchoolId()));

        AcademicYear academicYear = academicYearRepository.findById(request.getAcademicYearId())
                .orElseThrow(() -> new ResourceNotFoundException("AcademicYear", "id", request.getAcademicYearId()));

        Program program = programRepository.findById(request.getProgramId())
                .orElseThrow(() -> new ResourceNotFoundException("Program", "id", request.getProgramId()));

        // Validate no duplicate classCode per school per academic year
        Optional<ClassRoom> existing = classRoomRepository.findByClassCodeAndSchoolId(
                request.getClassCode(), request.getSchoolId());
        if (existing.isPresent() && existing.get().getAcademicYear().getId().equals(request.getAcademicYearId())) {
            throw new DuplicateResourceException("ClassRoom", "classCode",
                    request.getClassCode() + " for academic year " + academicYear.getYearLabel());
        }

        ClassRoom classRoom = ClassRoom.builder()
                .classCode(request.getClassCode())
                .displayName(request.getDisplayName())
                .yearGroup(request.getYearGroup())
                .program(program)
                .school(school)
                .academicYear(academicYear)
                .capacity(request.getCapacity() != null ? request.getCapacity() : 45)
                .isActive(true)
                .build();

        classRoom = classRoomRepository.save(classRoom);
        log.info("Created classroom: {} ({}) for school: {}",
                request.getDisplayName(), request.getClassCode(), school.getName());

        ClassRoomDto dto = ClassRoomDto.fromEntity(classRoom);
        dto.setStudentCount(0);
        return dto;
    }

    @Transactional
    public ClassRoomDto updateClassRoom(Long classRoomId, UpdateClassRoomRequest request) {
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));

        if (request.getDisplayName() != null) {
            classRoom.setDisplayName(request.getDisplayName());
        }
        if (request.getClassCode() != null) {
            // Check no duplicate
            Optional<ClassRoom> existing = classRoomRepository.findByClassCodeAndSchoolId(
                    request.getClassCode(), classRoom.getSchool().getId());
            if (existing.isPresent() && !existing.get().getId().equals(classRoomId)
                    && existing.get().getAcademicYear().getId().equals(classRoom.getAcademicYear().getId())) {
                throw new DuplicateResourceException("ClassRoom", "classCode", request.getClassCode());
            }
            classRoom.setClassCode(request.getClassCode());
        }
        if (request.getCapacity() != null) {
            classRoom.setCapacity(request.getCapacity());
        }

        classRoom = classRoomRepository.save(classRoom);
        log.info("Updated classroom: {} (id: {})", classRoom.getDisplayName(), classRoomId);

        ClassRoomDto dto = ClassRoomDto.fromEntity(classRoom);
        dto.setStudentCount(studentRepository.findByCurrentClassId(classRoomId).size());
        return dto;
    }

    @Transactional(readOnly = true)
    public List<ClassRoomDto> getAllClassRooms(Long schoolId, Long academicYearId) {
        List<ClassRoom> classRooms;
        if (academicYearId != null) {
            classRooms = classRoomRepository.findBySchoolIdAndAcademicYearId(schoolId, academicYearId);
        } else {
            // Get classrooms for current academic year
            Optional<AcademicYear> currentYear = academicYearRepository.findBySchoolIdAndIsCurrentTrue(schoolId);
            if (currentYear.isPresent()) {
                classRooms = classRoomRepository.findBySchoolIdAndAcademicYearId(schoolId, currentYear.get().getId());
            } else {
                classRooms = List.of();
            }
        }

        return classRooms.stream()
                .filter(ClassRoom::isActive)
                .map(cr -> {
                    ClassRoomDto dto = ClassRoomDto.fromEntity(cr);
                    dto.setStudentCount(studentRepository.findByCurrentClassId(cr.getId()).size());
                    return dto;
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClassRoomDto> getClassRoomsByYearGroup(Long schoolId, YearGroup yearGroup) {
        return classRoomRepository.findBySchoolIdAndYearGroup(schoolId, yearGroup)
                .stream()
                .filter(ClassRoom::isActive)
                .map(cr -> {
                    ClassRoomDto dto = ClassRoomDto.fromEntity(cr);
                    dto.setStudentCount(studentRepository.findByCurrentClassId(cr.getId()).size());
                    return dto;
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public ClassRoomDto getClassRoomById(Long classRoomId) {
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));

        ClassRoomDto dto = ClassRoomDto.fromEntity(classRoom);
        dto.setStudentCount(studentRepository.findByCurrentClassId(classRoomId).size());
        return dto;
    }

    @Transactional
    public void deactivateClassRoom(Long classRoomId) {
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));

        classRoom.setActive(false);
        classRoomRepository.save(classRoom);
        log.info("Deactivated classroom: {} (id: {})", classRoom.getDisplayName(), classRoomId);
    }

    // ==================== HELPER METHODS ====================

    private String generateSubjectCode(String name, Long schoolId) {
        String prefix = name.length() >= 3
                ? name.substring(0, 3).toUpperCase()
                : name.toUpperCase();

        List<Subject> existing = subjectRepository.findBySchoolId(schoolId);
        long count = existing.stream()
                .filter(s -> s.getSubjectCode().startsWith(prefix))
                .count();

        String code;
        do {
            count++;
            code = prefix + "-" + String.format("%02d", count);
        } while (subjectRepository.findBySubjectCodeAndSchoolId(code, schoolId).isPresent());

        return code;
    }

    private String buildProgramDisplayName(ProgramType type) {
        return switch (type) {
            case GENERAL_SCIENCE -> "General Science";
            case GENERAL_ARTS -> "General Arts";
            case BUSINESS -> "Business";
            case VISUAL_ARTS -> "Visual Arts";
            case HOME_ECONOMICS -> "Home Economics";
            case AGRICULTURAL_SCIENCE -> "Agricultural Science";
            case TECHNICAL -> "Technical";
        };
    }

    private void seedDefaultSubjectsForProgram(Program program, School school) {
        Map<String, List<String>> coreSubjects = getCoreSubjectsForProgram(program.getProgramType());
        Map<String, List<String>> electiveSubjects = getElectiveSubjectsForProgram(program.getProgramType());

        List<Subject> schoolSubjects = subjectRepository.findBySchoolId(school.getId());
        Map<String, Subject> subjectMap = schoolSubjects.stream()
                .collect(Collectors.toMap(Subject::getName, s -> s, (a, b) -> a));

        // Assign core subjects
        for (String subjectName : coreSubjects.getOrDefault("core", List.of())) {
            Subject subject = subjectMap.get(subjectName);
            if (subject != null) {
                for (YearGroup yg : YearGroup.values()) {
                    if (!programSubjectRepository.existsByProgramIdAndSubjectIdAndYearGroup(
                            program.getId(), subject.getId(), yg)) {
                        programSubjectRepository.save(ProgramSubject.builder()
                                .program(program)
                                .subject(subject)
                                .yearGroup(yg)
                                .isCompulsory(true)
                                .build());
                    }
                }
            }
        }

        // Assign elective subjects
        for (String subjectName : electiveSubjects.getOrDefault("elective", List.of())) {
            Subject subject = subjectMap.get(subjectName);
            if (subject != null) {
                for (YearGroup yg : YearGroup.values()) {
                    if (!programSubjectRepository.existsByProgramIdAndSubjectIdAndYearGroup(
                            program.getId(), subject.getId(), yg)) {
                        programSubjectRepository.save(ProgramSubject.builder()
                                .program(program)
                                .subject(subject)
                                .yearGroup(yg)
                                .isCompulsory(false)
                                .build());
                    }
                }
            }
        }
    }

    private Map<String, List<String>> getCoreSubjectsForProgram(ProgramType type) {
        List<String> core = switch (type) {
            case GENERAL_SCIENCE -> List.of("Mathematics", "English Language", "Integrated Science", "Social Studies");
            case GENERAL_ARTS -> List.of("Mathematics", "English Language", "Social Studies");
            case BUSINESS -> List.of("Mathematics", "English Language", "Social Studies");
            case VISUAL_ARTS -> List.of("Mathematics", "English Language", "Social Studies");
            case HOME_ECONOMICS -> List.of("Mathematics", "English Language", "Social Studies");
            case AGRICULTURAL_SCIENCE -> List.of("Mathematics", "English Language", "Social Studies");
            case TECHNICAL -> List.of("Mathematics", "English Language", "Integrated Science", "Social Studies");
        };
        return Map.of("core", core);
    }

    private Map<String, List<String>> getElectiveSubjectsForProgram(ProgramType type) {
        List<String> elective = switch (type) {
            case GENERAL_SCIENCE -> List.of("Physics", "Chemistry", "Biology", "Elective Mathematics");
            case GENERAL_ARTS -> List.of("Literature", "Government", "Economics", "French", "History");
            case BUSINESS -> List.of("Business Management", "Accounting", "Economics", "Elective Mathematics");
            case VISUAL_ARTS -> List.of("Picture Making", "Sculpture", "Ceramics", "Graphic Design");
            case HOME_ECONOMICS -> List.of("Food & Nutrition", "Clothing & Textiles", "Management in Living");
            case AGRICULTURAL_SCIENCE -> List.of("Animal Husbandry", "Crop Science", "Agricultural Economics");
            case TECHNICAL -> List.of("Physics", "Elective Mathematics");
        };
        return Map.of("elective", elective);
    }

    // ==================== ADMIN CONTEXT ====================

    @Transactional(readOnly = true)
    public AdminContextDto getAdminContext() {
        School school = schoolRepository.findFirstByIsActiveTrue()
                .orElseThrow(() -> new ResourceNotFoundException("School", "active", "true"));

        AcademicYear currentYear = academicYearRepository
                .findBySchoolIdAndIsCurrentTrue(school.getId())
                .orElse(null);

        Term currentTerm = null;
        if (currentYear != null) {
            currentTerm = termRepository
                    .findByAcademicYearIdAndIsCurrentTrue(currentYear.getId())
                    .orElse(null);
        }

        AdminContextDto.AdminContextDtoBuilder builder = AdminContextDto.builder()
                .schoolId(school.getId())
                .schoolName(school.getName());

        if (currentYear != null) {
            builder.academicYearId(currentYear.getId())
                   .academicYearLabel(currentYear.getYearLabel());
        }

        if (currentTerm != null) {
            builder.termId(currentTerm.getId())
                   .termLabel(currentTerm.getTermType().name().replace("_", " "))
                   .termLocked(currentTerm.isScoresLocked());
        }

        return builder.build();
    }
}
