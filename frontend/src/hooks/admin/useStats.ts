import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';

export function useAdminDashboardStats(schoolId: number, termId: number) {
  return useQuery({
    queryKey: ['dashboard-stats', schoolId, termId],
    queryFn: () => adminApi.getDashboardStats(schoolId, termId).then((res) => res.data.data),
    enabled: !!schoolId && !!termId,
  });
}

export function useTermComparisonData(schoolId: number) {
  return useQuery({
    queryKey: ['term-comparison', schoolId],
    queryFn: () => adminApi.getTermComparisonData(schoolId).then((res) => res.data.data),
    enabled: !!schoolId,
  });
}

export function useGradeDistribution(schoolId: number, termId: number) {
  return useQuery({
    queryKey: ['grade-distribution', schoolId, termId],
    queryFn: () => adminApi.getGradeDistribution(schoolId, termId).then((res) => res.data.data),
    enabled: !!schoolId && !!termId,
  });
}

export function useClassPerformance(schoolId: number, termId: number) {
  return useQuery({
    queryKey: ['class-performance', schoolId, termId],
    queryFn: () => adminApi.getClassPerformance(schoolId, termId).then((res) => res.data.data),
    enabled: !!schoolId && !!termId,
  });
}

export function useSubjectWeakness(schoolId: number, termId: number) {
  return useQuery({
    queryKey: ['subject-weakness', schoolId, termId],
    queryFn: () => adminApi.getSubjectWeakness(schoolId, termId).then((res) => res.data.data),
    enabled: !!schoolId && !!termId,
  });
}

export function useEnrollmentTrends(schoolId: number) {
  return useQuery({
    queryKey: ['enrollment-trends', schoolId],
    queryFn: () => adminApi.getEnrollmentTrends(schoolId).then((res) => res.data.data),
    enabled: !!schoolId,
  });
}
