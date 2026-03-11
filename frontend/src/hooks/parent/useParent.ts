import { useQuery } from '@tanstack/react-query';
import { parentApi } from '../../api/parent.api';

export function useMyChildren() {
  return useQuery({
    queryKey: ['parent-children'],
    queryFn: () => parentApi.getMyChildren().then((res) => res.data.data),
  });
}

export function useChildTermResults(studentId: number | null) {
  return useQuery({
    queryKey: ['child-term-results', studentId],
    queryFn: () => parentApi.getChildTermResults(studentId!).then((res) => res.data.data),
    enabled: !!studentId,
  });
}

export function useChildWarnings(studentId: number | null) {
  return useQuery({
    queryKey: ['child-warnings', studentId],
    queryFn: () => parentApi.getChildWarnings(studentId!).then((res) => res.data.data),
    enabled: !!studentId,
  });
}
