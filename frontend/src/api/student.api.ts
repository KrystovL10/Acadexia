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
    api.get<ApiResponse<StudentProfileDto>>('/v1/students/profile'),

  updateMyProfile: (data: UpdateStudentProfileRequest) =>
    api.put<ApiResponse<StudentProfileDto>>('/v1/students/profile', data),

  // ── Results ───────────────────────────────────────────────────────────────

  getMyTermResult: (termId: number) =>
    api.get<ApiResponse<StudentTermResultDto>>('/v1/students/results', {
      params: { termId },
    }),

  getMyAllTermResults: () =>
    api.get<ApiResponse<TermResultSummaryDto[]>>('/v1/students/results/all'),

  getMyLatestTermResult: () =>
    api.get<ApiResponse<StudentTermResultDto>>('/v1/students/results/latest'),

  // ── GPA ───────────────────────────────────────────────────────────────────

  getMyGpaHistory: () =>
    api.get<ApiResponse<StudentGpaHistoryDto>>('/v1/students/gpa'),

  // ── Subjects ─────────────────────────────────────────────────────────────

  getMySubjectPerformance: () =>
    api.get<ApiResponse<SubjectPerformanceSummaryDto>>('/v1/students/subjects/performance'),

  // ── Transcript ────────────────────────────────────────────────────────────

  getMyTranscript: () =>
    api.get<ApiResponse<TranscriptDto>>('/v1/students/transcript'),

  downloadMyTranscript: () =>
    api.get<Blob>('/v1/students/transcript/download', { responseType: 'blob' }),

  downloadMyTermReport: (termId: number) =>
    api.get<Blob>('/v1/students/reports/download', {
      params: { termId },
      responseType: 'blob',
    }),

  // ── Attendance ────────────────────────────────────────────────────────────

  getMyAttendanceSummary: (termId: number) =>
    api.get<ApiResponse<AttendanceSummaryDto>>('/v1/students/attendance', {
      params: { termId },
    }),

  getMyAttendanceHistory: () =>
    api.get<ApiResponse<AttendanceSummaryDto[]>>('/v1/students/attendance/history'),

  // ── Warnings ─────────────────────────────────────────────────────────────

  getMyWarnings: () =>
    api.get<ApiResponse<EarlyWarningDto[]>>('/v1/students/warnings'),

  // ── AI ────────────────────────────────────────────────────────────────────

  getMyAiInsights: (termId: number) =>
    api.get<ApiResponse<StudentInsightsDto>>('/v1/students/ai/insights', {
      params: { termId },
    }),

  chatWithAssistant: (data: { message: string; history: ChatMessageDto[] }) =>
    api.post<ApiResponse<string>>('/v1/students/ai/chat', data),
};
