import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';

export function useScoreCompletionStatus(classRoomId: number | null, termId: number | null) {
  return useQuery({
    queryKey: ['score-status', classRoomId, termId],
    queryFn: () =>
      adminApi.getScoreCompletionStatus(classRoomId!, termId!).then((res) => res.data.data),
    enabled: !!classRoomId && !!termId,
  });
}

export function useGenerateTermResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classRoomId, termId }: { classRoomId: number; termId: number }) =>
      adminApi.generateTermResults(classRoomId, termId).then((res) => res.data.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['score-status', variables.classRoomId] });
    },
  });
}

export function useStudentAllTermResults(studentId: number | null) {
  return useQuery({
    queryKey: ['term-results', studentId],
    queryFn: () =>
      adminApi.getStudentAllTermResults(studentId!).then((res) => res.data.data),
    enabled: !!studentId,
  });
}

export function useStudentCgpa(studentId: number | null) {
  return useQuery({
    queryKey: ['cgpa', studentId],
    queryFn: () =>
      adminApi.getStudentCgpa(studentId!).then((res) => res.data.data),
    enabled: !!studentId,
  });
}
