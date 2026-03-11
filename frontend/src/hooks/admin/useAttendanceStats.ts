import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';
import { useToast } from '../../components/ui/Toast';
import type { AttendanceOverrideRequest } from '../../types/attendance.types';

// ==================== SCHOOL ATTENDANCE STATS ====================

export function useSchoolAttendanceStats(schoolId: number, termId: number) {
  return useQuery({
    queryKey: ['admin', 'attendance-stats', schoolId, termId],
    queryFn: () =>
      adminApi.getSchoolAttendanceStats(schoolId, termId).then((res) => res.data.data),
    enabled: !!schoolId && !!termId,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== ADMIN OVERRIDE ====================

export function useAdminOverrideAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: AttendanceOverrideRequest) =>
      adminApi.overrideAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance-stats'] });
      toast({ title: 'Attendance overridden', variant: 'success' });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Failed to override attendance';
      toast({ title: 'Override Failed', description: msg, variant: 'danger' });
    },
  });
}
