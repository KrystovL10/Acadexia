import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../api/student.api';

export function useMySubjectPerformance() {
  return useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => studentApi.getMySubjectPerformance().then((res) => res.data.data),
  });
}
