import { useMutation, useQuery } from '@tanstack/react-query';
import { studentApi } from '../api/student.api';
import { downloadBlob } from '../lib/utils';

// Thin compatibility wrappers used by existing student page components.
// New code should import directly from hooks/student/*.

export function useTermResults(termId?: number) {
  return useQuery({
    queryKey: ['term-results', termId ?? 'latest'],
    queryFn: async () => {
      if (termId) {
        const res = await studentApi.getMyTermResult(termId);
        return res.data.data.scores.map((s, i) => ({
          id: i,
          subjectName: s.subjectName,
          classScore: s.classScore ?? 0,
          examScore: s.examScore ?? 0,
          totalScore: s.total ?? 0,
          grade: s.grade ?? '',
          gradePoint: s.gradePoint ?? 0,
          remarks: s.remarks ?? '',
        }));
      }
      const res = await studentApi.getMyLatestTermResult();
      return res.data.data.scores.map((s, i) => ({
        id: i,
        subjectName: s.subjectName,
        classScore: s.classScore ?? 0,
        examScore: s.examScore ?? 0,
        totalScore: s.total ?? 0,
        grade: s.grade ?? '',
        gradePoint: s.gradePoint ?? 0,
        remarks: s.remarks ?? '',
      }));
    },
  });
}

export function useTranscript() {
  return useQuery({
    queryKey: ['transcript'],
    queryFn: () => studentApi.getMyTranscript().then((res) => res.data.data),
  });
}

export function useDownloadTranscript() {
  return useMutation({
    mutationFn: () => studentApi.downloadMyTranscript().then((res) => res.data),
    onSuccess: (blob) => downloadBlob(blob, 'transcript.pdf'),
  });
}
