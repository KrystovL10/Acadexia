import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../../api/teacher.api';
import { useToast } from '../../components/ui/Toast';
import { teacherKeys } from './useClassDashboard';
import type { MarkAttendanceRequest } from '../../types/teacher.types';

// ==================== ATTENDANCE SUMMARY ====================

export function useAttendanceSummary(termId?: number) {
  return useQuery({
    queryKey: teacherKeys.attendance(termId),
    queryFn: () =>
      teacherApi.getAttendanceSummary(termId).then((res) => res.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== ATTENDANCE SHEET ====================

export function useAttendanceSheet(
  termId: number | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: teacherKeys.attendanceSheet(
      termId,
      startDate ?? '',
      endDate ?? ''
    ),
    queryFn: () =>
      teacherApi
        .getAttendanceSheet(termId, startDate!, endDate!)
        .then((res) => res.data.data),
    enabled: !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
}

// ==================== MARK ATTENDANCE ====================

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: MarkAttendanceRequest) =>
      teacherApi.markAttendance(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: teacherKeys.attendance(variables.termId),
      });
      queryClient.invalidateQueries({
        queryKey: teacherKeys.dashboard(variables.termId),
      });
      toast({ title: 'Attendance marked', variant: 'success' });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Failed to mark attendance';
      toast({ title: 'Attendance Failed', description: msg, variant: 'danger' });
    },
  });
}
