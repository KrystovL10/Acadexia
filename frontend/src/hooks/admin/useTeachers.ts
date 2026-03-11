import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';
import type {
  CreateTeacherRequest, UpdateTeacherRequest,
  AssignClassTeacherRequest, AssignTutorRequest,
} from '../../types/admin.types';

export const teacherKeys = {
  all: ['teachers'] as const,
  lists: () => [...teacherKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...teacherKeys.lists(), params] as const,
  details: () => [...teacherKeys.all, 'detail'] as const,
  detail: (id: number) => [...teacherKeys.details(), id] as const,
};

export function useGetAllTeachers(params: { schoolId: number; page?: number; size?: number }) {
  return useQuery({
    queryKey: teacherKeys.list(params),
    queryFn: () => adminApi.getAllTeachers(params).then((res) => res.data.data),
    enabled: !!params.schoolId,
  });
}

export function useGetTeacherById(teacherId: number) {
  return useQuery({
    queryKey: teacherKeys.detail(teacherId),
    queryFn: () => adminApi.getTeacherById(teacherId).then((res) => res.data.data),
    enabled: !!teacherId,
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeacherRequest) => adminApi.createTeacher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teacherId, data }: { teacherId: number; data: UpdateTeacherRequest }) =>
      adminApi.updateTeacher(teacherId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.detail(variables.teacherId) });
    },
  });
}

export function useDeactivateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teacherId: number) => adminApi.deactivateTeacher(teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
  });
}

export function useReactivateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teacherId: number) => adminApi.reactivateTeacher(teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
  });
}

export function useAssignClassTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignClassTeacherRequest) => adminApi.assignClassTeacher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

export function useAssignTutor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignTutorRequest) => adminApi.assignTutor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
    },
  });
}
