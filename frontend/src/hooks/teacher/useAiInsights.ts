import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../../api/teacher.api';
import type { ClassInsightsDto } from '../../types/ai.types';

export function useClassAiInsights(termId: number | null) {
  return useQuery({
    queryKey: ['class-ai-insights', termId],
    queryFn: () =>
      teacherApi.getClassAiInsights(termId!).then((res) => res.data.data as ClassInsightsDto),
    enabled: !!termId,
  });
}

export function useGenerateClassAiInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (termId: number) =>
      teacherApi.generateClassAiInsights(termId).then((res) => res.data.data as ClassInsightsDto),
    onSuccess: (_data, termId) => {
      queryClient.invalidateQueries({ queryKey: ['class-ai-insights', termId] });
    },
  });
}
