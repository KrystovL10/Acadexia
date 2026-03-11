import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { studentApi } from '../../api/student.api';
import type { UpdateStudentProfileRequest } from '../../types/student.types';

export function useMyProfile() {
  return useQuery({
    queryKey: ['student-profile'],
    queryFn: () => studentApi.getMyProfile().then((res) => res.data.data),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStudentProfileRequest) =>
      studentApi.updateMyProfile(data).then((res) => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });
}
