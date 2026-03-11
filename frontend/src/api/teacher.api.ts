import api from './axios';
import type { ApiResponse } from '../types/auth.types';
import type { StudentSummaryDto, ClassRoomDto } from '../types/admin.types';
import type {
  ClassDashboardDto,
  ClassScoreOverviewDto,
  StudentDetailDto,
  TermResultDto,
  TranscriptDto,
  AttendanceSummaryDto,
  AttendanceSheetDto,
  AttendanceResultDto,
  AttendanceDto,
  DailyAttendanceReportDto,
  AttendanceStatsDto,
  StudentAttendanceRowDto,
  AttendanceCorrelationDto,
  MarkAttendanceRequest,
  MarkSingleAttendanceRequest,
  BehaviorLogDto,
  CreateBehaviorLogRequest,
  StudentBehaviorSummaryDto,
  ClassBehaviorReportDto,
  ReportReadinessDto,
  ReportProgressDto,
  UpdateRemarksRequest,
} from '../types/teacher.types';
import type { ClassInsightsDto } from '../types/ai.types';

export const teacherApi = {
  // ── Class Info ────────────────────────────────────────────────────────────

  getMyClass: () =>
    api.get<ApiResponse<ClassRoomDto>>('/v1/teachers/class'),

  // ── Dashboard ─────────────────────────────────────────────────────────────

  getDashboard: (termId?: number) =>
    api.get<ApiResponse<ClassDashboardDto>>('/v1/teachers/dashboard', {
      params: termId ? { termId } : undefined,
    }),

  // ── Students ──────────────────────────────────────────────────────────────

  getClassStudents: () =>
    api.get<ApiResponse<StudentSummaryDto[]>>('/v1/teachers/students'),

  getStudentDetail: (studentId: number) =>
    api.get<ApiResponse<StudentDetailDto>>(`/v1/teachers/students/${studentId}`),

  // ── Score Overview ────────────────────────────────────────────────────────

  getClassScoreOverview: (termId?: number) =>
    api.get<ApiResponse<ClassScoreOverviewDto>>('/v1/teachers/scores', {
      params: termId ? { termId } : undefined,
    }),

  // ── Attendance ────────────────────────────────────────────────────────────

  markAttendance: (data: MarkAttendanceRequest) =>
    api.post<ApiResponse<AttendanceResultDto>>('/v1/teachers/attendance', data),

  markSingleAttendance: (data: MarkSingleAttendanceRequest) =>
    api.post<ApiResponse<AttendanceDto>>('/v1/teachers/attendance/single', data),

  getTodayAttendance: (classRoomId: number, termId: number) =>
    api.get<ApiResponse<DailyAttendanceReportDto>>('/v1/teachers/attendance/today', {
      params: { classRoomId, termId },
    }),

  getDailyAttendance: (classRoomId: number, termId: number, date: string) =>
    api.get<ApiResponse<DailyAttendanceReportDto>>('/v1/teachers/attendance/daily', {
      params: { classRoomId, termId, date },
    }),

  getAttendanceStats: (classRoomId: number, termId: number) =>
    api.get<ApiResponse<AttendanceStatsDto>>('/v1/teachers/attendance/stats', {
      params: { classRoomId, termId },
    }),

  getAttendanceRows: (classRoomId: number, termId: number) =>
    api.get<ApiResponse<StudentAttendanceRowDto[]>>('/v1/teachers/attendance/rows', {
      params: { classRoomId, termId },
    }),

  getAttendanceSummary: (termId?: number) =>
    api.get<ApiResponse<AttendanceSummaryDto[]>>('/v1/teachers/attendance', {
      params: termId ? { termId } : undefined,
    }),

  getAttendanceSheet: (
    classRoomId: number,
    termId: number,
    startDate: string,
    endDate: string
  ) =>
    api.get<ApiResponse<AttendanceSheetDto>>('/v1/teachers/attendance/sheet', {
      params: { classRoomId, termId, startDate, endDate },
    }),

  getAttendanceCorrelation: (classRoomId: number, termId: number) =>
    api.get<ApiResponse<AttendanceCorrelationDto>>('/v1/teachers/attendance/correlation', {
      params: { classRoomId, termId },
    }),

  // ── Behavior ──────────────────────────────────────────────────────────────

  addBehaviorLog: (data: CreateBehaviorLogRequest) =>
    api.post<ApiResponse<BehaviorLogDto>>('/v1/teachers/behavior', data),

  getClassBehaviorLogs: (termId?: number) =>
    api.get<ApiResponse<BehaviorLogDto[]>>('/v1/teachers/behavior', {
      params: termId ? { termId } : undefined,
    }),

  getStudentBehaviorLogs: (studentId: number, termId?: number) =>
    api.get<ApiResponse<BehaviorLogDto[]>>(
      `/v1/teachers/behavior/student/${studentId}`,
      { params: termId ? { termId } : undefined }
    ),

  updateBehaviorLog: (logId: number, data: CreateBehaviorLogRequest) =>
    api.put<ApiResponse<BehaviorLogDto>>(`/v1/teachers/behavior/${logId}`, data),

  deleteBehaviorLog: (logId: number) =>
    api.delete<ApiResponse<void>>(`/v1/teachers/behavior/${logId}`),

  getStudentBehaviorSummary: (studentId: number, termId?: number) =>
    api.get<ApiResponse<StudentBehaviorSummaryDto>>(
      `/v1/teachers/behavior/student/${studentId}/summary`,
      { params: termId ? { termId } : undefined }
    ),

  getClassBehaviorReport: (termId?: number) =>
    api.get<ApiResponse<ClassBehaviorReportDto>>('/v1/teachers/behavior/report', {
      params: termId ? { termId } : undefined,
    }),

  // ── Reports ───────────────────────────────────────────────────────────────

  checkReportReadiness: (classRoomId: number, termId: number) =>
    api.get<ApiResponse<ReportReadinessDto>>('/v1/teachers/reports/readiness', {
      params: { classRoomId, termId },
    }),

  generateReports: (termId: number) =>
    api.post<ApiResponse<TermResultDto[]>>('/v1/teachers/reports/generate', {
      termId,
    }),

  /** Polls report generation progress for a class/term. */
  getReportProgress: (classRoomId: number, termId: number) =>
    api.get<ApiResponse<ReportProgressDto | null>>('/v1/teachers/reports/progress', {
      params: { classRoomId, termId },
    }),

  /** Downloads all student report PDFs zipped. Returns raw Blob. */
  downloadClassReports: (termId: number): Promise<Blob> =>
    api
      .get(`/v1/teachers/reports/${termId}/download`, { responseType: 'blob' })
      .then((r) => r.data as Blob),

  /** Downloads a single student's terminal report PDF. Returns raw Blob. */
  downloadStudentReport: (studentId: number, termId: number): Promise<Blob> =>
    api
      .get(`/v1/teachers/students/${studentId}/reports/${termId}`, {
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),

  // ── Term Results ──────────────────────────────────────────────────────────

  updateRemarks: (termResultId: number, data: UpdateRemarksRequest) =>
    api.put<ApiResponse<TermResultDto>>(
      `/v1/teachers/term-results/${termResultId}/remarks`,
      data
    ),

  // ── Transcript ────────────────────────────────────────────────────────────

  /** Fetches a student's full academic transcript (JSON). */
  getStudentTranscript: (studentId: number) =>
    api.get<ApiResponse<TranscriptDto>>(
      `/v1/teachers/students/${studentId}/transcript`
    ),

  /** Downloads a student's transcript as a PDF. Returns raw Blob. */
  downloadTranscript: (studentId: number): Promise<Blob> =>
    api
      .get(`/v1/teachers/students/${studentId}/transcript/download`, {
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),

  // ── AI Insights ─────────────────────────────────────────────────────────────

  getClassAiInsights: (termId: number) =>
    api.get<ApiResponse<ClassInsightsDto>>('/v1/teachers/ai/insights', {
      params: { termId },
    }),

  generateClassAiInsights: (termId: number) =>
    api.post<ApiResponse<ClassInsightsDto>>('/v1/teachers/ai/insights', null, {
      params: { termId },
    }),
};
