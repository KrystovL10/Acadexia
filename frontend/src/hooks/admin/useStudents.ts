import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';
import type {
  CreateStudentRequest, UpdateStudentRequest,
  PromoteStudentsRequest, GetStudentsParams,
} from '../../types/admin.types';

export const studentKeys = {
  all: ['admin-students'] as const,
  lists: () => [...studentKeys.all, 'list'] as const,
  list: (params: GetStudentsParams) => [...studentKeys.lists(), params] as const,
  details: () => [...studentKeys.all, 'detail'] as const,
  detail: (id: number) => [...studentKeys.details(), id] as const,
};

export function useGetAllStudents(params: GetStudentsParams) {
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => adminApi.getAllStudents(params).then((res) => res.data.data),
    enabled: !!params.schoolId,
  });
}

export function useGetStudentById(studentId: number) {
  return useQuery({
    queryKey: studentKeys.detail(studentId),
    queryFn: () => adminApi.getStudentById(studentId).then((res) => res.data.data),
    enabled: !!studentId,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudentRequest) => adminApi.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: number; data: UpdateStudentRequest }) =>
      adminApi.updateStudent(studentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(variables.studentId) });
    },
  });
}

export function usePromoteStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PromoteStudentsRequest) => adminApi.promoteStudents(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useGraduateStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentIds: number[]) => adminApi.graduateStudents(studentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
