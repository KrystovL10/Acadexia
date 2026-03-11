import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../api/student.api';

export function useMyAttendanceSummary(termId: number | null) {
  return useQuery({
    queryKey: ['student-attendance', termId],
    queryFn: () => studentApi.getMyAttendanceSummary(termId!).then((res) => res.data.data),
    enabled: !!termId,
  });
}

export function useMyAttendanceHistory() {
  return useQuery({
    queryKey: ['student-attendance-history'],
    queryFn: () => studentApi.getMyAttendanceHistory().then((res) => res.data.data),
  });
}
