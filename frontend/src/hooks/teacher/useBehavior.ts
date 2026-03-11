import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../../api/teacher.api';
import { useToast } from '../../components/ui/Toast';
import { teacherKeys } from './useClassDashboard';
import type { CreateBehaviorLogRequest } from '../../types/teacher.types';

// ==================== CLASS BEHAVIOR LOGS ====================

export function useClassBehaviorLogs(termId?: number) {
  return useQuery({
    queryKey: teacherKeys.behavior(termId),
    queryFn: () =>
      teacherApi.getClassBehaviorLogs(termId).then((res) => res.data.data),
    staleTime: 2 * 60 * 1000,
  });
}

// ==================== STUDENT BEHAVIOR LOGS ====================

export function useStudentBehaviorLogs(
  studentId: number | null,
  termId?: number
) {
  return useQuery({
    queryKey: teacherKeys.studentBehavior(studentId ?? 0, termId),
    queryFn: () =>
      teacherApi
        .getStudentBehaviorLogs(studentId!, termId)
        .then((res) => res.data.data),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });
}

// ==================== ADD BEHAVIOR LOG ====================

export function useAddBehaviorLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateBehaviorLogRequest) =>
      teacherApi.addBehaviorLog(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: teacherKeys.behavior(variables.termId),
      });
      queryClient.invalidateQueries({
        queryKey: teacherKeys.studentBehavior(
          variables.studentId,
          variables.termId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: teacherKeys.studentDetail(variables.studentId),
      });
      toast({ title: 'Behavior log added', variant: 'success' });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Failed to add behavior log';
      toast({ title: 'Log Failed', description: msg, variant: 'danger' });
    },
  });
}

// ==================== UPDATE BEHAVIOR LOG ====================

export function useUpdateBehaviorLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { logId: number; data: CreateBehaviorLogRequest }) =>
      teacherApi.updateBehaviorLog(params.logId, params.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: teacherKeys.behavior(variables.data.termId),
      });
      queryClient.invalidateQueries({
        queryKey: teacherKeys.studentBehavior(
          variables.data.studentId,
          variables.data.termId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: teacherKeys.studentDetail(variables.data.studentId),
      });
      toast({ title: 'Behavior log updated', variant: 'success' });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Failed to update behavior log';
      toast({ title: 'Update Failed', description: msg, variant: 'danger' });
    },
  });
}

// ==================== DELETE BEHAVIOR LOG ====================

export function useDeleteBehaviorLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { logId: number; termId?: number; studentId: number }) =>
      teacherApi.deleteBehaviorLog(params.logId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: teacherKeys.behavior(variables.termId),
      });
      queryClient.invalidateQueries({
        queryKey: teacherKeys.studentBehavior(
          variables.studentId,
          variables.termId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: teacherKeys.studentDetail(variables.studentId),
      });
      toast({ title: 'Behavior log deleted', variant: 'success' });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Failed to delete behavior log';
      toast({ title: 'Delete Failed', description: msg, variant: 'danger' });
    },
  });
}
