import api from './axios';
import type { ApiResponse } from '../types/auth.types';
import type {
  TutorAssignmentDto,
  TutorSubjectDto,
  TutorScoreSheetDto,
  ScoreEntryRequest,
  BulkScoreEntryRequest,
  ScoreUpdateRequest,
  MarkAbsentRequest,
  ScoreDto,
  BulkScoreResultDto,
  ScoreCompletionDto,
} from '../types/tutor.types';

// Base path matches backend controller: /api/tutor (no v1 prefix)
const BASE = '/tutor';

export const tutorApi = {
  // ==================== ASSIGNMENTS ====================

  getTutorAssignments: (termId?: number) =>
    api.get<ApiResponse<TutorAssignmentDto[]>>(`${BASE}/assignments`, {
      params: termId ? { termId } : undefined,
    }),

  getTutorSubjects: () =>
    api.get<ApiResponse<TutorSubjectDto[]>>(`${BASE}/assignments/subjects`),

  // ==================== SCORE SHEET ====================

  getScoreSheet: (classRoomId: number, subjectId: number, termId: number) =>
    api.get<ApiResponse<TutorScoreSheetDto>>(`${BASE}/scores/sheet`, {
      params: { classRoomId, subjectId, termId },
    }),

  getScoreCompletion: (classRoomId: number, subjectId: number, termId: number) =>
    api.get<ApiResponse<ScoreCompletionDto>>(`${BASE}/scores/completion`, {
      params: { classRoomId, subjectId, termId },
    }),

  // ==================== SCORE ENTRY ====================

  enterScore: (data: ScoreEntryRequest) =>
    api.post<ApiResponse<ScoreDto>>(`${BASE}/scores`, data),

  enterBulkScores: (data: BulkScoreEntryRequest) =>
    api.post<ApiResponse<BulkScoreResultDto>>(`${BASE}/scores/bulk`, data),

  updateScore: (scoreId: number, data: ScoreUpdateRequest) =>
    api.put<ApiResponse<ScoreDto>>(`${BASE}/scores/${scoreId}`, data),

  markAbsent: (data: MarkAbsentRequest) =>
    api.patch<ApiResponse<ScoreDto>>(`${BASE}/scores/mark-absent`, data),

  // ==================== EXCEL IMPORT / EXPORT ====================

  /** Returns the raw Blob — caller is responsible for triggering the download. */
  downloadScoreTemplate: async (
    classRoomId: number,
    subjectId: number,
    termId: number
  ): Promise<Blob> => {
    const response = await api.get(`${BASE}/scores/template`, {
      params: { classRoomId, subjectId, termId },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  importScoresFromExcel: (
    classRoomId: number,
    subjectId: number,
    termId: number,
    file: File
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<BulkScoreResultDto>>(
      `${BASE}/scores/import`,
      formData,
      {
        params: { classRoomId, subjectId, termId },
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  },
};
