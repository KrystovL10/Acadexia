import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teacherApi } from '../../api/teacher.api';
import { useTeacherStore } from '../../store/teacher.store';

// ==================== QUERY KEY FACTORY ====================

export const teacherKeys = {
  all: ['teacher'] as const,

  myClass: () => [...teacherKeys.all, 'my-class'] as const,

  dashboard: (termId?: number) =>
    [...teacherKeys.all, 'dashboard', termId ?? 'current'] as const,

  students: () => [...teacherKeys.all, 'students'] as const,

  studentDetail: (studentId: number) =>
    [...teacherKeys.all, 'student', studentId] as const,

  scores: (termId?: number) =>
    [...teacherKeys.all, 'scores', termId ?? 'current'] as const,

  attendance: (termId?: number) =>
    [...teacherKeys.all, 'attendance', termId ?? 'current'] as const,

  attendanceSheet: (
    termId: number | undefined,
    startDate: string,
    endDate: string
  ) =>
    [
      ...teacherKeys.all,
      'attendance-sheet',
      termId ?? 'current',
      startDate,
      endDate,
    ] as const,

  behavior: (termId?: number) =>
    [...teacherKeys.all, 'behavior', termId ?? 'current'] as const,

  studentBehavior: (studentId: number, termId?: number) =>
    [
      ...teacherKeys.all,
      'behavior',
      'student',
      studentId,
      termId ?? 'current',
    ] as const,

  readiness: (classRoomId: number, termId: number) =>
    [...teacherKeys.all, 'readiness', classRoomId, termId] as const,

  termResults: (termId?: number) =>
    [...teacherKeys.all, 'term-results', termId ?? 'current'] as const,

  transcript: (studentId: number) =>
    [...teacherKeys.all, 'transcript', studentId] as const,
};

// ==================== CLASS INFO ====================

/** Fetches my assigned class and populates the teacher store. */
export function useMyClass() {
  const setClassContext = useTeacherStore((s) => s.setClassContext);

  const query = useQuery({
    queryKey: teacherKeys.myClass(),
    queryFn: () => teacherApi.getMyClass().then((res) => res.data.data),
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      setClassContext({
        classRoomId: query.data.id,
        classRoomName: query.data.displayName,
        yearGroup: query.data.yearGroup,
        programName: query.data.programName,
        currentTermId: null,
        currentTermLabel: null,
      });
    }
  }, [query.data, setClassContext]);

  return query;
}

// ==================== DASHBOARD ====================

export function useClassDashboard(termId?: number) {
  return useQuery({
    queryKey: teacherKeys.dashboard(termId),
    queryFn: () =>
      teacherApi.getDashboard(termId).then((res) => res.data.data),
    staleTime: 2 * 60 * 1000,
  });
}

// ==================== STUDENTS ====================

export function useClassStudents() {
  return useQuery({
    queryKey: teacherKeys.students(),
    queryFn: () =>
      teacherApi.getClassStudents().then((res) => res.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentDetail(studentId: number | null) {
  return useQuery({
    queryKey: teacherKeys.studentDetail(studentId ?? 0),
    queryFn: () =>
      teacherApi.getStudentDetail(studentId!).then((res) => res.data.data),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });
}
