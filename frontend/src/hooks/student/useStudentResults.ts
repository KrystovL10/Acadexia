import { useMutation, useQuery } from '@tanstack/react-query';
import { studentApi } from '../../api/student.api';
import { downloadBlob } from '../../lib/utils';

export function useMyTermResult(termId: number | null) {
  return useQuery({
    queryKey: ['student-result', termId],
    queryFn: () => studentApi.getMyTermResult(termId!).then((res) => res.data.data),
    enabled: !!termId,
  });
}

export function useMyAllTermResults() {
  return useQuery({
    queryKey: ['student-all-results'],
    queryFn: () => studentApi.getMyAllTermResults().then((res) => res.data.data),
  });
}

export function useMyLatestTermResult() {
  return useQuery({
    queryKey: ['student-latest-result'],
    queryFn: () => studentApi.getMyLatestTermResult().then((res) => res.data.data),
  });
}

export function useDownloadTermReport() {
  return useMutation({
    mutationFn: (termId: number) =>
      studentApi.downloadMyTermReport(termId).then((res) => res.data),
    onSuccess: (blob) => {
      downloadBlob(blob, 'term-report.pdf');
    },
  });
}

export function useMyGpaHistory() {
  return useQuery({
    queryKey: ['student-gpa-history'],
    queryFn: () => studentApi.getMyGpaHistory().then((res) => res.data.data),
  });
}
