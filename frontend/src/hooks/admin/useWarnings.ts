import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';
import type { ResolveWarningRequest } from '../../types/warning.types';

export const warningKeys = {
  all: ['warnings'] as const,
  summary: (schoolId: number, termId: number) =>
    [...warningKeys.all, 'summary', schoolId, termId] as const,
  list: (params: Record<string, unknown>) =>
    [...warningKeys.all, 'list', params] as const,
  student: (studentId: number) =>
    [...warningKeys.all, 'student', studentId] as const,
};

export function useWarningSummary(schoolId: number, termId: number) {
  return useQuery({
    queryKey: warningKeys.summary(schoolId, termId),
    queryFn: () => adminApi.getWarningSummary(schoolId, termId).then((res) => res.data.data),
    enabled: !!schoolId && !!termId,
  });
}

export function useTermWarnings(params: {
  termId: number;
  level?: string;
  page?: number;
  size?: number;
}) {
  return useQuery({
    queryKey: warningKeys.list(params as Record<string, unknown>),
    queryFn: () => adminApi.getTermWarnings(params).then((res) => res.data.data),
    enabled: !!params.termId,
  });
}

export function useStudentWarnings(studentId: number) {
  return useQuery({
    queryKey: warningKeys.student(studentId),
    queryFn: () => adminApi.getStudentWarnings(studentId).then((res) => res.data.data),
    enabled: !!studentId,
  });
}

export function useResolveWarning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ warningId, data }: { warningId: number; data: ResolveWarningRequest }) =>
      adminApi.resolveWarning(warningId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warningKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useDeleteWarning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (warningId: number) => adminApi.deleteWarning(warningId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warningKeys.all });
    },
  });
}

export function useTriggerWarningAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schoolId, termId }: { schoolId: number; termId: number }) =>
      adminApi.triggerWarningAnalysis(schoolId, termId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warningKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
