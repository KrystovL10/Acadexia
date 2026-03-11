import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';

export function usePowerRankings(schoolId: number, termId: number) {
  return useQuery({
    queryKey: ['power-rankings', schoolId, termId],
    queryFn: () => adminApi.getPowerRankings(schoolId, termId).then((res) => res.data.data),
    enabled: !!schoolId && !!termId,
  });
}

export function useTopStudents(schoolId: number, termId: number, limit?: number) {
  return useQuery({
    queryKey: ['top-students', schoolId, termId, limit],
    queryFn: () => adminApi.getTopStudents(schoolId, termId, limit).then((res) => res.data.data),
    enabled: !!schoolId && !!termId,
  });
}

export function useMostImproved(schoolId: number, termId: number) {
  return useQuery({
    queryKey: ['most-improved', schoolId, termId],
    queryFn: () => adminApi.getMostImproved(schoolId, termId).then((res) => res.data.data),
    enabled: !!schoolId && !!termId,
  });
}

export function useScholarshipCandidates(schoolId: number) {
  return useQuery({
    queryKey: ['scholarship-candidates', schoolId],
    queryFn: () => adminApi.getScholarshipCandidates(schoolId).then((res) => res.data.data),
    enabled: !!schoolId,
  });
}
