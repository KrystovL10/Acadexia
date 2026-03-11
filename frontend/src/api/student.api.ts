import api from './axios';
import type { ApiResponse } from '../types/auth.types';
import type { EarlyWarningDto } from '../types/warning.types';
import type { StudentInsightsDto, ChatMessageDto } from '../types/ai.types';
import type {
  StudentProfileDto,
  UpdateStudentProfileRequest,
  StudentTermResultDto,
  TermResultSummaryDto,
  StudentGpaHistoryDto,
  SubjectPerformanceSummaryDto,
  AttendanceSummaryDto,
  TranscriptDto,
} from '../types/student.types';

export const studentApi = {
  // ── Profile ───────────────────────────────────────────────────────────────

  getMyProfile: () =>
    api.get<ApiResponse<StudentProfileDto>>('/student/profile'),

  updateMyProfile: (data: UpdateStudentProfileRequest) =>
    api.put<ApiResponse<StudentProfileDto>>('/student/profile', data),

  // ── Results ───────────────────────────────────────────────────────────────

  getMyTermResult: (termId: number) =>
    api.get<ApiResponse<StudentTermResultDto>>('/student/results', {
      params: { termId },
    }),

  getMyAllTermResults: () =>
    api.get<ApiResponse<TermResultSummaryDto[]>>('/student/results/all'),

  getMyLatestTermResult: () =>
    api.get<ApiResponse<StudentTermResultDto>>('/student/results/latest'),

  // ── GPA ───────────────────────────────────────────────────────────────────

  getMyGpaHistory: () =>
    api.get<ApiResponse<StudentGpaHistoryDto>>('/student/gpa'),

  // ── Subjects ─────────────────────────────────────────────────────────────

  getMySubjectPerformance: () =>
    api.get<ApiResponse<SubjectPerformanceSummaryDto>>('/student/subjects/performance'),

  // ── Transcript ────────────────────────────────────────────────────────────

  getMyTranscript: () =>
    api.get<ApiResponse<TranscriptDto>>('/student/transcript'),

  downloadMyTranscript: () =>
    api.get<Blob>('/student/transcript/download', { responseType: 'blob' }),

  downloadMyTermReport: (termId: number) =>
    api.get<Blob>('/student/reports/download', {
      params: { termId },
      responseType: 'blob',
    }),

  // ── Attendance ────────────────────────────────────────────────────────────

  getMyAttendanceSummary: (termId: number) =>
    api.get<ApiResponse<AttendanceSummaryDto>>('/student/attendance', {
      params: { termId },
    }),

  getMyAttendanceHistory: () =>
    api.get<ApiResponse<AttendanceSummaryDto[]>>('/student/attendance/history'),

  // ── Warnings ─────────────────────────────────────────────────────────────

  getMyWarnings: () =>
    api.get<ApiResponse<EarlyWarningDto[]>>('/student/warnings'),

  // ── AI ────────────────────────────────────────────────────────────────────

  getMyAiInsights: (termId: number) =>
    api.get<ApiResponse<StudentInsightsDto>>('/student/ai/insights', {
      params: { termId },
    }),

  chatWithAssistant: (data: { message: string; history: ChatMessageDto[] }) =>
    api.post<ApiResponse<string>>('/student/ai/chat', data),
};
