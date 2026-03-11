import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tutorApi } from '../../api/tutor.api';
import { useToast } from '../../components/ui/Toast';
import type {
  ScoreEntryRequest,
  BulkScoreEntryRequest,
  ScoreUpdateRequest,
  MarkAbsentRequest,
} from '../../types/tutor.types';

// ==================== QUERY KEY FACTORY ====================

export const tutorKeys = {
  all: ['tutor'] as const,

  assignments: (termId?: number) =>
    [...tutorKeys.all, 'assignments', termId ?? 'current'] as const,

  subjects: () =>
    [...tutorKeys.all, 'subjects'] as const,

  sheet: (classRoomId: number, subjectId: number, termId: number) =>
    [...tutorKeys.all, 'score-sheet', classRoomId, subjectId, termId] as const,

  completion: (classRoomId: number, subjectId: number, termId: number) =>
    [...tutorKeys.all, 'completion', classRoomId, subjectId, termId] as const,
};

// ==================== ASSIGNMENT HOOKS ====================

export function useTutorAssignments(termId?: number) {
  return useQuery({
    queryKey: tutorKeys.assignments(termId),
    queryFn: () =>
      tutorApi.getTutorAssignments(termId).then((res) => res.data.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTutorSubjects() {
  return useQuery({
    queryKey: tutorKeys.subjects(),
    queryFn: () => tutorApi.getTutorSubjects().then((res) => res.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== SCORE SHEET HOOKS ====================

export function useScoreSheet(
  classRoomId: number | null,
  subjectId: number | null,
  termId: number | null
) {
  return useQuery({
    queryKey: tutorKeys.sheet(
      classRoomId ?? 0,
      subjectId ?? 0,
      termId ?? 0
    ),
    queryFn: () =>
      tutorApi
        .getScoreSheet(classRoomId!, subjectId!, termId!)
        .then((res) => res.data.data),
    enabled: !!classRoomId && !!subjectId && !!termId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useScoreCompletion(
  classRoomId: number | null,
  subjectId: number | null,
  termId: number | null
) {
  return useQuery({
    queryKey: tutorKeys.completion(
      classRoomId ?? 0,
      subjectId ?? 0,
      termId ?? 0
    ),
    queryFn: () =>
      tutorApi
        .getScoreCompletion(classRoomId!, subjectId!, termId!)
        .then((res) => res.data.data),
    enabled: !!classRoomId && !!subjectId && !!termId,
    staleTime: 60 * 1000,
  });
}

// ==================== SCORE ENTRY HOOKS ====================

export function useEnterScore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: ScoreEntryRequest) => tutorApi.enterScore(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tutorKeys.sheet(
          variables.classRoomId,
          variables.subjectId,
          variables.termId
        ),
      });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Failed to enter score';
      toast({ title: 'Score Entry Failed', description: msg, variant: 'danger' });
    },
  });
}

export function useEnterBulkScores() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: BulkScoreEntryRequest) => tutorApi.enterBulkScores(data),
    onSuccess: (res, variables) => {
      const result = res.data.data;
      queryClient.invalidateQueries({
        queryKey: tutorKeys.sheet(
          variables.classRoomId,
          variables.subjectId,
          variables.termId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: tutorKeys.assignments(),
      });
      if (result.failureCount > 0) {
        toast({
          title: `Bulk Entry: ${result.successCount} saved, ${result.failureCount} failed`,
          description: result.errors[0]?.errorMessage,
          variant: 'warning',
        });
      } else {
        toast({
          title: `${result.successCount} scores saved`,
          variant: 'success',
        });
      }
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Bulk score entry failed';
      toast({ title: 'Bulk Entry Failed', description: msg, variant: 'danger' });
    },
  });
}

export function useUpdateScore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      scoreId,
      data,
    }: {
      scoreId: number;
      data: ScoreUpdateRequest;
      // Pass context so we can invalidate the right sheet
      classRoomId: number;
      subjectId: number;
      termId: number;
    }) => tutorApi.updateScore(scoreId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tutorKeys.sheet(
          variables.classRoomId,
          variables.subjectId,
          variables.termId
        ),
      });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Failed to update score';
      toast({ title: 'Update Failed', description: msg, variant: 'danger' });
    },
  });
}

export function useMarkAbsent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: MarkAbsentRequest) => tutorApi.markAbsent(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tutorKeys.sheet(
          variables.classRoomId,
          variables.subjectId,
          variables.termId
        ),
      });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Failed to mark student absent';
      toast({ title: 'Mark Absent Failed', description: msg, variant: 'danger' });
    },
  });
}

// ==================== EXCEL IMPORT ====================

export function useImportScores() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      classRoomId,
      subjectId,
      termId,
      file,
    }: {
      classRoomId: number;
      subjectId: number;
      termId: number;
      file: File;
    }) => tutorApi.importScoresFromExcel(classRoomId, subjectId, termId, file),
    onSuccess: (res, variables) => {
      const result = res.data.data;
      queryClient.invalidateQueries({
        queryKey: tutorKeys.sheet(
          variables.classRoomId,
          variables.subjectId,
          variables.termId
        ),
      });
      if (result.failureCount > 0) {
        toast({
          title: `Import: ${result.successCount} saved, ${result.failureCount} failed`,
          description: result.errors[0]?.errorMessage,
          variant: 'warning',
        });
      } else {
        toast({
          title: `Import successful — ${result.successCount} scores imported`,
          variant: 'success',
        });
      }
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Import failed';
      toast({ title: 'Import Failed', description: msg, variant: 'danger' });
    },
  });
}

// ==================== TEMPLATE DOWNLOAD (not a mutation — utility) ====================

/**
 * Triggers a browser download of the score sheet template.
 * Not wrapped in useMutation since it's a fire-and-forget download.
 */
export function useDownloadTemplate() {
  const { toast } = useToast();

  const download = async (
    classRoomId: number,
    subjectId: number,
    termId: number,
    filename?: string
  ) => {
    try {
      const blob = await tutorApi.downloadScoreTemplate(
        classRoomId,
        subjectId,
        termId
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `score_sheet_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: 'Download Failed',
        description: 'Could not download the score sheet template',
        variant: 'danger',
      });
    }
  };

  return { download };
}
