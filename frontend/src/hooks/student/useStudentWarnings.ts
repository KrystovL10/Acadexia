import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../api/student.api';

export function useMyWarnings() {
  return useQuery({
    queryKey: ['student-warnings'],
    queryFn: () => studentApi.getMyWarnings().then((res) => res.data.data),
  });
}
