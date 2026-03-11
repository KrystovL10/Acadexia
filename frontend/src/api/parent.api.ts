import api from './axios';
import type { ApiResponse } from '../types/auth.types';
import type { StudentSummaryDto, TermResultDto } from '../types/admin.types';
import type { EarlyWarningDto } from '../types/warning.types';

export const parentApi = {

  getMyChildren: () =>
    api.get<ApiResponse<StudentSummaryDto[]>>('/v1/parents/my-children'),

  getChildTermResults: (studentId: number) =>
    api.get<ApiResponse<TermResultDto[]>>(`/v1/parents/children/${studentId}/term-results`),

  getChildWarnings: (studentId: number) =>
    api.get<ApiResponse<EarlyWarningDto[]>>(`/v1/parents/children/${studentId}/warnings`),
};
