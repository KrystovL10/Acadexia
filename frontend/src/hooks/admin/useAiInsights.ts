import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';
import type { SchoolInsightsDto, WaecReadinessReportDto } from '../../types/ai.types';

export function useAiInsights(schoolId: number, termId: number) {
  return useQuery({
    queryKey: ['ai-insights', schoolId, termId],
    queryFn: () =>
      adminApi.getAiInsights(schoolId, termId).then((res) => res.data.data as SchoolInsightsDto),
    enabled: !!schoolId && !!termId,
  });
}

export function useGenerateAiInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schoolId, termId }: { schoolId: number; termId: number }) =>
      adminApi.generateAiInsights(schoolId, termId).then((res) => res.data.data as SchoolInsightsDto),
    onSuccess: (_data, { schoolId, termId }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights', schoolId, termId] });
    },
  });
}

export function useWaecReadinessReport(schoolId: number, termId: number) {
  return useQuery({
    queryKey: ['waec-readiness', schoolId, termId],
    queryFn: () =>
      adminApi.getWaecReadinessReport(schoolId, termId).then((res) => res.data.data as WaecReadinessReportDto),
    enabled: !!schoolId && !!termId,
  });
}

export function useGenerateWaecReadiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schoolId, termId }: { schoolId: number; termId: number }) =>
      adminApi.generateWaecReadinessReport(schoolId, termId).then((res) => res.data.data as WaecReadinessReportDto),
    onSuccess: (_data, { schoolId, termId }) => {
      queryClient.invalidateQueries({ queryKey: ['waec-readiness', schoolId, termId] });
    },
  });
}
