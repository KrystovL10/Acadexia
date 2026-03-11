import { useMutation, useQuery } from '@tanstack/react-query';
import { studentApi } from '../../api/student.api';
import type { ChatMessageDto } from '../../types/ai.types';

export function useMyAiInsights(termId: number | null) {
  return useQuery({
    queryKey: ['student-ai-insights', termId],
    queryFn: () => studentApi.getMyAiInsights(termId!).then((res) => res.data.data),
    enabled: !!termId,
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

export function useChatWithAssistant() {
  return useMutation({
    mutationFn: ({ message, history }: { message: string; history?: ChatMessageDto[] }) =>
      studentApi
        .chatWithAssistant({ message, history: history ?? [] })
        .then((res) => res.data.data),
  });
}
