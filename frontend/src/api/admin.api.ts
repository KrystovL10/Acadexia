import api from './axios';
import type { ApiResponse, UserSession } from '../types/auth.types';
import type { PageResponse, AuditLogDto } from '../types/shared.types';
import type {
  AdminContextDto,
  UpdateProfileRequest,
  CreateTeacherRequest, UpdateTeacherRequest, TeacherDto, TeacherSummaryDto,
  AssignClassTeacherRequest, AssignTutorRequest,
  CreateStudentRequest, UpdateStudentRequest, StudentDto, StudentSummaryDto,
  PromoteStudentsRequest, GetStudentsParams,
  SchoolDto, UpdateSchoolRequest,
  AcademicYearDto, CreateAcademicYearRequest,
  TermDto, CreateTermRequest,
  ProgramDto, CreateProgramRequest, AssignSubjectRequest, ProgramSubjectDto,
  SubjectDto, CreateSubjectRequest, UpdateSubjectRequest,
  ClassRoomDto, CreateClassRoomRequest, UpdateClassRoomRequest,
  ScoreCompletionStatusDto, TermResultDto, CumulativeGPADto,
} from '../types/admin.types';
import type { TutorScoreSheetDto, ScoreDto, ScoreUpdateRequest } from '../types/tutor.types';
import type {
  AdminDashboardStatsDto, TermComparisonDto, GradeDistributionDto,
  ClassPerformanceDto, SubjectWeaknessDto, EnrollmentTrendDto,
  PowerRankingDto, StudentRankDto, ImprovementDto, ScholarshipCandidateDto,
  SubjectTopStudentDto, ClassTopStudentDto,
} from '../types/stats.types';
import type {
  EarlyWarningDto, EarlyWarningSummaryDto, ResolveWarningRequest,
} from '../types/warning.types';
import type {
  SchoolInsightsDto, WaecReadinessReportDto, StudentWaecPredictionDto,
} from '../types/ai.types';
import type {
  SchoolAttendanceStatsDto, AttendanceOverrideRequest,
} from '../types/attendance.types';

export const adminApi = {

  // ==================== TEACHERS ====================

  createTeacher: (data: CreateTeacherRequest) =>
    api.post<ApiResponse<TeacherDto>>('/v1/admin/users/teachers', data),

  getAllTeachers: (params: { schoolId: number; page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<TeacherSummaryDto>>>('/v1/admin/users/teachers', { params }),

  getTeacherById: (teacherId: number) =>
    api.get<ApiResponse<TeacherDto>>(`/v1/admin/users/teachers/${teacherId}`),

  updateTeacher: (teacherId: number, data: UpdateTeacherRequest) =>
    api.put<ApiResponse<TeacherDto>>(`/v1/admin/users/teachers/${teacherId}`, data),

  deactivateTeacher: (teacherId: number) =>
    api.patch<ApiResponse<void>>(`/v1/admin/users/teachers/${teacherId}/deactivate`),

  reactivateTeacher: (teacherId: number) =>
    api.patch<ApiResponse<void>>(`/v1/admin/users/teachers/${teacherId}/reactivate`),

  assignClassTeacher: (data: AssignClassTeacherRequest) =>
    api.post<ApiResponse<void>>('/v1/admin/users/teachers/assign-class', data),

  assignTutor: (data: AssignTutorRequest) =>
    api.post<ApiResponse<void>>('/v1/admin/users/teachers/assign-tutor', data),

  // ==================== STUDENTS ====================

  createStudent: (data: CreateStudentRequest) =>
    api.post<ApiResponse<StudentDto>>('/v1/admin/users/students', data),

  getAllStudents: (params: GetStudentsParams) =>
    api.get<ApiResponse<PageResponse<StudentSummaryDto>>>('/v1/admin/users/students', { params }),

  getStudentById: (studentId: number) =>
    api.get<ApiResponse<StudentDto>>(`/v1/admin/users/students/${studentId}`),

  updateStudent: (studentId: number, data: UpdateStudentRequest) =>
    api.put<ApiResponse<StudentDto>>(`/v1/admin/users/students/${studentId}`, data),

  promoteStudents: (data: PromoteStudentsRequest) =>
    api.post<ApiResponse<void>>('/v1/admin/users/students/promote', data),

  graduateStudents: (studentIds: number[]) =>
    api.post<ApiResponse<void>>('/v1/admin/users/students/graduate', studentIds),

  // ==================== ADMIN CONTEXT ====================

  getMyContext: () =>
    api.get<ApiResponse<AdminContextDto>>('/v1/admin/my-context'),

  // ==================== SCHOOL ====================

  getSchoolProfile: (schoolId: number) =>
    api.get<ApiResponse<SchoolDto>>('/v1/admin/school', { params: { schoolId } }),

  updateSchoolProfile: (schoolId: number, data: UpdateSchoolRequest) =>
    api.put<ApiResponse<SchoolDto>>('/v1/admin/school', data, { params: { schoolId } }),

  // ==================== ACADEMIC YEARS ====================

  createAcademicYear: (schoolId: number, data: CreateAcademicYearRequest) =>
    api.post<ApiResponse<AcademicYearDto>>('/v1/admin/academic-years', data, {
      params: { schoolId },
    }),

  getAllAcademicYears: (schoolId: number) =>
    api.get<ApiResponse<AcademicYearDto[]>>('/v1/admin/academic-years', {
      params: { schoolId },
    }),

  setCurrentAcademicYear: (yearId: number) =>
    api.patch<ApiResponse<AcademicYearDto>>(`/v1/admin/academic-years/${yearId}/set-current`),

  // ==================== TERMS ====================

  createTerm: (data: CreateTermRequest) =>
    api.post<ApiResponse<TermDto>>('/v1/admin/terms', data),

  setCurrentTerm: (termId: number) =>
    api.patch<ApiResponse<TermDto>>(`/v1/admin/terms/${termId}/set-current`),

  lockTermScores: (termId: number) =>
    api.patch<ApiResponse<TermDto>>(`/v1/admin/terms/${termId}/lock`),

  unlockTermScores: (termId: number) =>
    api.patch<ApiResponse<TermDto>>(`/v1/admin/terms/${termId}/unlock`),

  // ==================== PROGRAMS ====================

  createProgram: (schoolId: number, data: CreateProgramRequest) =>
    api.post<ApiResponse<ProgramDto>>('/v1/admin/programs', data, {
      params: { schoolId },
    }),

  getAllPrograms: (schoolId: number) =>
    api.get<ApiResponse<ProgramDto[]>>('/v1/admin/programs', { params: { schoolId } }),

  getProgramById: (programId: number) =>
    api.get<ApiResponse<ProgramDto>>(`/v1/admin/programs/${programId}`),

  assignSubjectToProgram: (data: AssignSubjectRequest) =>
    api.post<ApiResponse<ProgramSubjectDto>>('/v1/admin/programs/assign-subject', data),

  removeSubjectFromProgram: (programSubjectId: number) =>
    api.delete<ApiResponse<void>>(`/v1/admin/programs/subject/${programSubjectId}`),

  // ==================== SUBJECTS ====================

  createSubject: (schoolId: number, data: CreateSubjectRequest) =>
    api.post<ApiResponse<SubjectDto>>('/v1/admin/subjects', data, {
      params: { schoolId },
    }),

  getAllSubjects: (schoolId: number) =>
    api.get<ApiResponse<SubjectDto[]>>('/v1/admin/subjects', { params: { schoolId } }),

  updateSubject: (subjectId: number, data: UpdateSubjectRequest) =>
    api.put<ApiResponse<SubjectDto>>(`/v1/admin/subjects/${subjectId}`, data),

  deleteSubject: (subjectId: number) =>
    api.delete<ApiResponse<void>>(`/v1/admin/subjects/${subjectId}`),

  // ==================== CLASSROOMS ====================

  createClassRoom: (data: CreateClassRoomRequest) =>
    api.post<ApiResponse<ClassRoomDto>>('/v1/admin/classrooms', data),

  getAllClassRooms: (schoolId: number, academicYearId?: number) =>
    api.get<ApiResponse<ClassRoomDto[]>>('/v1/admin/classrooms', {
      params: { schoolId, academicYearId },
    }),

  getClassRoomById: (classRoomId: number) =>
    api.get<ApiResponse<ClassRoomDto>>(`/v1/admin/classrooms/${classRoomId}`),

  updateClassRoom: (classRoomId: number, data: UpdateClassRoomRequest) =>
    api.put<ApiResponse<ClassRoomDto>>(`/v1/admin/classrooms/${classRoomId}`, data),

  deactivateClassRoom: (classRoomId: number) =>
    api.patch<ApiResponse<void>>(`/v1/admin/classrooms/${classRoomId}/deactivate`),

  // ==================== STATISTICS ====================

  getDashboardStats: (schoolId: number, termId: number) =>
    api.get<ApiResponse<AdminDashboardStatsDto>>('/v1/admin/stats/dashboard', {
      params: { schoolId, termId },
    }),

  getTermComparisonData: (schoolId: number) =>
    api.get<ApiResponse<TermComparisonDto[]>>('/v1/admin/stats/term-comparison', {
      params: { schoolId },
    }),

  getGradeDistribution: (schoolId: number, termId: number) =>
    api.get<ApiResponse<GradeDistributionDto[]>>('/v1/admin/stats/grade-distribution', {
      params: { schoolId, termId },
    }),

  getClassPerformance: (schoolId: number, termId: number) =>
    api.get<ApiResponse<ClassPerformanceDto[]>>('/v1/admin/stats/class-performance', {
      params: { schoolId, termId },
    }),

  getSubjectWeakness: (schoolId: number, termId: number) =>
    api.get<ApiResponse<SubjectWeaknessDto[]>>('/v1/admin/stats/subject-weakness', {
      params: { schoolId, termId },
    }),

  getEnrollmentTrends: (schoolId: number) =>
    api.get<ApiResponse<EnrollmentTrendDto[]>>('/v1/admin/stats/enrollment-trends', {
      params: { schoolId },
    }),

  // ==================== RANKINGS ====================

  getPowerRankings: (schoolId: number, termId: number) =>
    api.get<ApiResponse<PowerRankingDto>>('/v1/admin/rankings', {
      params: { schoolId, termId },
    }),

  getTopStudents: (schoolId: number, termId: number, limit?: number) =>
    api.get<ApiResponse<StudentRankDto[]>>('/v1/admin/rankings/top-students', {
      params: { schoolId, termId, limit },
    }),

  getMostImproved: (schoolId: number, termId: number) =>
    api.get<ApiResponse<ImprovementDto>>('/v1/admin/rankings/most-improved', {
      params: { schoolId, termId },
    }),

  getMostDeclined: (schoolId: number, termId: number) =>
    api.get<ApiResponse<ImprovementDto>>('/v1/admin/rankings/most-declined', {
      params: { schoolId, termId },
    }),

  getScholarshipCandidates: (schoolId: number) =>
    api.get<ApiResponse<ScholarshipCandidateDto[]>>('/v1/admin/rankings/scholarship-candidates', {
      params: { schoolId },
    }),

  getTopBySubject: (schoolId: number, termId: number) =>
    api.get<ApiResponse<SubjectTopStudentDto[]>>('/v1/admin/rankings/by-subject', {
      params: { schoolId, termId },
    }),

  getTopByClass: (schoolId: number, termId: number) =>
    api.get<ApiResponse<ClassTopStudentDto[]>>('/v1/admin/rankings/by-class', {
      params: { schoolId, termId },
    }),

  // ==================== EARLY WARNINGS ====================

  triggerWarningAnalysis: (schoolId: number, termId: number) =>
    api.post<ApiResponse<number>>('/v1/admin/warnings/analyze', null, {
      params: { schoolId, termId },
    }),

  getWarningSummary: (schoolId: number, termId: number) =>
    api.get<ApiResponse<EarlyWarningSummaryDto>>('/v1/admin/warnings/summary', {
      params: { schoolId, termId },
    }),

  getTermWarnings: (params: { termId: number; level?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<EarlyWarningDto>>>('/v1/admin/warnings', { params }),

  getStudentWarnings: (studentId: number) =>
    api.get<ApiResponse<EarlyWarningDto[]>>(`/v1/admin/warnings/student/${studentId}`),

  resolveWarning: (warningId: number, data: ResolveWarningRequest) =>
    api.patch<ApiResponse<EarlyWarningDto>>(`/v1/admin/warnings/${warningId}/resolve`, data),

  deleteWarning: (warningId: number) =>
    api.delete<ApiResponse<void>>(`/v1/admin/warnings/${warningId}`),

  // ==================== ATTENDANCE ====================

  getSchoolAttendanceStats: (schoolId: number, termId: number) =>
    api.get<ApiResponse<SchoolAttendanceStatsDto>>('/v1/admin/stats/attendance', {
      params: { schoolId, termId },
    }),

  getClassAttendanceStats: (classRoomId: number, termId: number) =>
    api.get<ApiResponse<SchoolAttendanceStatsDto>>('/v1/admin/stats/attendance/class', {
      params: { classRoomId, termId },
    }),

  getStudentAttendance: (studentId: number, classRoomId: number, termId: number) =>
    api.get<ApiResponse<SchoolAttendanceStatsDto>>(`/v1/admin/users/students/${studentId}/attendance`, {
      params: { classRoomId, termId },
    }),

  overrideAttendance: (data: AttendanceOverrideRequest) =>
    api.patch<ApiResponse<void>>('/v1/admin/users/students/attendance/override', data),

  // ==================== REPORTS ====================

  getScoreCompletionStatus: (classRoomId: number, termId: number) =>
    api.get<ApiResponse<ScoreCompletionStatusDto>>('/v1/admin/reports/score-status', {
      params: { classRoomId, termId },
    }),

  generateTermResults: (classRoomId: number, termId: number) =>
    api.post<ApiResponse<{ totalGenerated: number; results: TermResultDto[] }>>(
      '/v1/admin/reports/generate-term-results', null, {
        params: { classRoomId, termId },
      }),

  getStudentTermResult: (studentId: number, termId: number) =>
    api.get<ApiResponse<TermResultDto>>(`/v1/admin/reports/term-result/${studentId}`, {
      params: { termId },
    }),

  getStudentAllTermResults: (studentId: number) =>
    api.get<ApiResponse<TermResultDto[]>>(`/v1/admin/reports/term-results/${studentId}`),

  getStudentCgpa: (studentId: number) =>
    api.get<ApiResponse<CumulativeGPADto>>(`/v1/admin/reports/cgpa/${studentId}`),

  // ==================== AI INSIGHTS ====================

  getAiInsights: (schoolId: number, termId: number) =>
    api.get<ApiResponse<SchoolInsightsDto>>('/v1/admin/ai/insights', {
      params: { schoolId, termId },
    }),

  generateAiInsights: (schoolId: number, termId: number) =>
    api.post<ApiResponse<SchoolInsightsDto>>('/v1/admin/ai/insights', null, {
      params: { schoolId, termId },
    }),

  invalidateAiInsights: (schoolId: number, termId: number) =>
    api.post<ApiResponse<void>>('/v1/admin/ai/insights/invalidate', null, {
      params: { schoolId, termId },
    }),

  // ── WAEC Readiness ──

  getWaecReadinessReport: (schoolId: number, termId: number) =>
    api.get<ApiResponse<WaecReadinessReportDto>>('/v1/admin/ai/waec-readiness', {
      params: { schoolId, termId },
    }),

  generateWaecReadinessReport: (schoolId: number, termId: number) =>
    api.post<ApiResponse<WaecReadinessReportDto>>('/v1/admin/ai/waec-readiness', null, {
      params: { schoolId, termId },
    }),

  getStudentWaecPrediction: (studentId: number, termId: number) =>
    api.get<ApiResponse<StudentWaecPredictionDto>>(`/v1/admin/ai/waec-readiness/student/${studentId}`, {
      params: { termId },
    }),

  // ==================== ADMIN PROFILE ====================

  getAdminProfile: () =>
    api.get<ApiResponse<UserSession>>('/v1/admin/profile'),

  updateAdminProfile: (data: UpdateProfileRequest) =>
    api.put<ApiResponse<UserSession>>('/v1/admin/profile', data),

  // ==================== ADMIN SCORES ====================

  getAdminScoreSheet: (classRoomId: number, subjectId: number, termId: number) =>
    api.get<ApiResponse<TutorScoreSheetDto>>('/v1/admin/scores', {
      params: { classRoomId, subjectId, termId },
    }),

  adminOverrideScore: (scoreId: number, data: ScoreUpdateRequest) =>
    api.put<ApiResponse<ScoreDto>>(`/v1/admin/scores/${scoreId}`, data),

  adminDeleteScore: (scoreId: number) =>
    api.delete<ApiResponse<void>>(`/v1/admin/scores/${scoreId}`),

  getMissingScores: (classRoomId: number, termId: number) =>
    api.get<ApiResponse<ScoreCompletionStatusDto>>('/v1/admin/scores/missing', {
      params: { classRoomId, termId },
    }),

  // ==================== AUDIT LOGS ====================

  getAuditLogs: (params: { page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<AuditLogDto>>>('/v1/admin/audit-logs', { params }),

  getAuditLogsByUser: (userId: number, params: { page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<AuditLogDto>>>(`/v1/admin/audit-logs/user/${userId}`, { params }),

  getAuditLogsByAction: (action: string, params: { page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<AuditLogDto>>>(`/v1/admin/audit-logs/action/${action}`, { params }),
};
