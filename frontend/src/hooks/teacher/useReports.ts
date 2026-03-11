import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../../api/teacher.api';
import { useToast } from '../../components/ui/Toast';
import { downloadFile } from '../../lib/downloadUtils';
import { teacherKeys } from './useClassDashboard';
import type { UpdateRemarksRequest, ReportProgressDto } from '../../types/teacher.types';

// ==================== READINESS ====================

export function useReportReadiness(classRoomId: number | null, termId: number | null) {
  return useQuery({
    queryKey: teacherKeys.readiness(classRoomId ?? 0, termId ?? 0),
    queryFn: () =>
      teacherApi
        .checkReportReadiness(classRoomId!, termId!)
        .then((res) => res.data.data),
    enabled: !!classRoomId && !!termId,
    staleTime: 30 * 1000,
  });
}

// ==================== GENERATE REPORTS ====================

export function useGenerateReports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (termId: number) => teacherApi.generateReports(termId),
    onSuccess: (res) => {
      const results = res.data.data ?? [];
      queryClient.invalidateQueries({ queryKey: teacherKeys.termResults() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.readiness(0, 0) });
      queryClient.invalidateQueries({ queryKey: teacherKeys.dashboard() });
      toast({
        title: `${results.length} report(s) generated`,
        variant: 'success',
      });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Report generation failed';
      toast({ title: 'Generation Failed', description: msg, variant: 'danger' });
    },
  });
}

// ==================== REPORT STATUS (polling) ====================

/**
 * Polls the readiness endpoint while reports have not yet been generated.
 * Refetches every 3 seconds when `isReady` is false.
 */
export function useReportStatus(
  classRoomId: number | null,
  termId: number | null
) {
  return useQuery({
    queryKey: [...teacherKeys.readiness(classRoomId ?? 0, termId ?? 0), 'poll'],
    queryFn: () =>
      teacherApi
        .checkReportReadiness(classRoomId!, termId!)
        .then((res) => res.data.data),
    enabled: !!classRoomId && !!termId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.isReady ? false : 3000;
    },
  });
}

// ==================== REPORT PROGRESS (real-time polling) ====================

/**
 * Polls the progress endpoint every 2 seconds while generation is in progress.
 * Stops polling when status is COMPLETE or FAILED.
 */
export function useReportProgress(
  classRoomId: number | null,
  termId: number | null,
  enabled: boolean
) {
  return useQuery<ReportProgressDto | null>({
    queryKey: ['reportProgress', classRoomId, termId],
    queryFn: () =>
      teacherApi
        .getReportProgress(classRoomId!, termId!)
        .then((res) => res.data.data ?? null),
    enabled: enabled && !!classRoomId && !!termId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === 'COMPLETE' || data.status === 'FAILED') return false;
      return 2000;
    },
  });
}

// ==================== TERM RESULTS ====================

export function useTermResults(termId?: number) {
  return useQuery({
    queryKey: teacherKeys.termResults(termId),
    queryFn: () =>
      teacherApi.getDashboard(termId).then((res) => {
        // Term results are surfaced via the dashboard's score completion data.
        // A dedicated term-results list endpoint can be wired in when available.
        return res.data.data;
      }),
    enabled: !!termId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useStudentTermResult(
  studentId: number | null,
  termId: number | null
) {
  return useQuery({
    queryKey: [...teacherKeys.studentDetail(studentId ?? 0), 'term', termId],
    queryFn: () =>
      teacherApi.getStudentDetail(studentId!).then((res) => res.data.data),
    enabled: !!studentId && !!termId,
    staleTime: 2 * 60 * 1000,
  });
}

// ==================== REMARKS ====================

export function useUpdateRemarks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      termResultId,
      data,
    }: {
      termResultId: number;
      data: UpdateRemarksRequest;
    }) => teacherApi.updateRemarks(termResultId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.termResults() });
      toast({ title: 'Remarks updated', variant: 'success' });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Failed to update remarks';
      toast({ title: 'Update Failed', description: msg, variant: 'danger' });
    },
  });
}

// ==================== DOWNLOADS ====================

export function useDownloadReport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      studentId,
      termId,
    }: {
      studentId: number;
      termId: number;
    }) => {
      await downloadFile(
        () => teacherApi.downloadStudentReport(studentId, termId),
        `report_student${studentId}_term${termId}.pdf`
      );
    },
    onSuccess: () => {
      toast({ title: 'Report downloaded', variant: 'success' });
    },
    onError: () => {
      toast({
        title: 'Download Failed',
        description: 'Could not download the student report',
        variant: 'danger',
      });
    },
  });
}

export function useDownloadClassReports() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (termId: number) => {
      await downloadFile(
        () => teacherApi.downloadClassReports(termId),
        `class_reports_term${termId}.zip`
      );
    },
    onSuccess: () => {
      toast({ title: 'Class reports downloaded', variant: 'success' });
    },
    onError: () => {
      toast({
        title: 'Download Failed',
        description: 'Could not download class reports',
        variant: 'danger',
      });
    },
  });
}

// ==================== TRANSCRIPT ====================

export function useGenerateTranscript(studentId: number | null) {
  return useQuery({
    queryKey: teacherKeys.transcript(studentId ?? 0),
    queryFn: () =>
      teacherApi.getStudentTranscript(studentId!).then((res) => res.data.data),
    enabled: !!studentId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useDownloadTranscript() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (studentId: number) => {
      await downloadFile(
        () => teacherApi.downloadTranscript(studentId),
        `transcript_student${studentId}.pdf`
      );
    },
    onSuccess: () => {
      toast({ title: 'Transcript downloaded', variant: 'success' });
    },
    onError: () => {
      toast({
        title: 'Download Failed',
        description: 'Could not download the transcript',
        variant: 'danger',
      });
    },
  });
}
