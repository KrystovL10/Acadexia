import { useQuery } from '@tanstack/react-query';
import { teacherApi } from '../../api/teacher.api';
import { teacherKeys } from './useClassDashboard';

// ==================== CLASS SCORE OVERVIEW ====================

export function useClassScoreOverview(termId?: number) {
  return useQuery({
    queryKey: teacherKeys.scores(termId),
    queryFn: () =>
      teacherApi.getClassScoreOverview(termId).then((res) => res.data.data),
    staleTime: 2 * 60 * 1000,
  });
}

// ==================== SCORE COMPLETION ====================

/**
 * Returns the subject completion breakdown from the class dashboard.
 * The score completion status is embedded in the dashboard payload.
 */
export function useScoreCompletion(termId?: number) {
  return useQuery({
    queryKey: [...teacherKeys.scores(termId), 'completion'],
    queryFn: () =>
      teacherApi
        .getDashboard(termId)
        .then((res) => res.data.data?.scoreCompletionStatus ?? null),
    staleTime: 2 * 60 * 1000,
  });
}
