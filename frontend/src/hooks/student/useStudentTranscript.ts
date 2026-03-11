import { useMutation, useQuery } from '@tanstack/react-query';
import { studentApi } from '../../api/student.api';
import { downloadBlob } from '../../lib/utils';

export function useMyTranscript() {
  return useQuery({
    queryKey: ['student-transcript'],
    queryFn: () => studentApi.getMyTranscript().then((res) => res.data.data),
  });
}

export function useDownloadTranscript() {
  return useMutation({
    mutationFn: () => studentApi.downloadMyTranscript().then((res) => res.data),
    onSuccess: (blob) => {
      downloadBlob(blob, 'transcript.pdf');
    },
  });
}
