import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';
import type {
  UpdateSchoolRequest, CreateAcademicYearRequest, CreateTermRequest,
  CreateProgramRequest, AssignSubjectRequest,
  CreateSubjectRequest, UpdateSubjectRequest,
  CreateClassRoomRequest, UpdateClassRoomRequest,
} from '../../types/admin.types';

// ==================== ADMIN CONTEXT ====================

export function useAdminContext() {
  return useQuery({
    queryKey: ['admin-context'],
    queryFn: () => adminApi.getMyContext().then((res) => res.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== SCHOOL ====================

export function useGetSchoolProfile(schoolId: number) {
  return useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => adminApi.getSchoolProfile(schoolId).then((res) => res.data.data),
    enabled: !!schoolId,
  });
}

export function useUpdateSchoolProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schoolId, data }: { schoolId: number; data: UpdateSchoolRequest }) =>
      adminApi.updateSchoolProfile(schoolId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school', variables.schoolId] });
    },
  });
}

// ==================== ACADEMIC YEARS ====================

export function useGetAllAcademicYears(schoolId: number) {
  return useQuery({
    queryKey: ['academic-years', schoolId],
    queryFn: () => adminApi.getAllAcademicYears(schoolId).then((res) => res.data.data),
    enabled: !!schoolId,
  });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schoolId, data }: { schoolId: number; data: CreateAcademicYearRequest }) =>
      adminApi.createAcademicYear(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
}

export function useSetCurrentAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (yearId: number) => adminApi.setCurrentAcademicYear(yearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['school-context'] });
    },
  });
}

// ==================== TERMS ====================

export function useCreateTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTermRequest) => adminApi.createTerm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
}

export function useSetCurrentTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (termId: number) => adminApi.setCurrentTerm(termId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['school-context'] });
    },
  });
}

export function useLockTermScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (termId: number) => adminApi.lockTermScores(termId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
}

export function useUnlockTermScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (termId: number) => adminApi.unlockTermScores(termId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
}

// ==================== PROGRAMS ====================

export function useGetAllPrograms(schoolId: number) {
  return useQuery({
    queryKey: ['programs', schoolId],
    queryFn: () => adminApi.getAllPrograms(schoolId).then((res) => res.data.data),
    enabled: !!schoolId,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schoolId, data }: { schoolId: number; data: CreateProgramRequest }) =>
      adminApi.createProgram(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useAssignSubjectToProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignSubjectRequest) => adminApi.assignSubjectToProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useRemoveSubjectFromProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programSubjectId: number) => adminApi.removeSubjectFromProgram(programSubjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

// ==================== SUBJECTS ====================

export function useGetAllSubjects(schoolId: number) {
  return useQuery({
    queryKey: ['subjects', schoolId],
    queryFn: () => adminApi.getAllSubjects(schoolId).then((res) => res.data.data),
    enabled: !!schoolId,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schoolId, data }: { schoolId: number; data: CreateSubjectRequest }) =>
      adminApi.createSubject(schoolId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subjectId, data }: { subjectId: number; data: UpdateSubjectRequest }) =>
      adminApi.updateSubject(subjectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subjectId: number) => adminApi.deleteSubject(subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

// ==================== CLASSROOMS ====================

export function useGetAllClassRooms(schoolId: number, academicYearId?: number) {
  return useQuery({
    queryKey: ['classrooms', schoolId, academicYearId],
    queryFn: () => adminApi.getAllClassRooms(schoolId, academicYearId).then((res) => res.data.data),
    enabled: !!schoolId,
  });
}

export function useCreateClassRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClassRoomRequest) => adminApi.createClassRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateClassRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classRoomId, data }: { classRoomId: number; data: UpdateClassRoomRequest }) =>
      adminApi.updateClassRoom(classRoomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

export function useDeactivateClassRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classRoomId: number) => adminApi.deactivateClassRoom(classRoomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}
