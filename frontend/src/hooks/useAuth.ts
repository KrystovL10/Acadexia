import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { UserRole } from '../types/enums';
import { ROUTES } from '../router/routes';
import type { ChangePasswordRequest, LoginRequest } from '../types/auth.types';

export const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: ROUTES.ADMIN_DASHBOARD,
  [UserRole.CLASS_TEACHER]: ROUTES.TEACHER_DASHBOARD,
  [UserRole.TUTOR]: ROUTES.TUTOR_DASHBOARD,
  [UserRole.STUDENT]: ROUTES.STUDENT_DASHBOARD,
  [UserRole.PARENT]: ROUTES.PARENT_DASHBOARD,
};

export function getRoleHome(role: UserRole): string {
  return ROLE_HOME[role] || ROUTES.LOGIN;
}

export function useLogin() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      const loginResponse = response.data.data;
      login(loginResponse);

      if (loginResponse.requiresPasswordChange) {
        navigate(ROUTES.CHANGE_PASSWORD);
      } else {
        navigate(getRoleHome(loginResponse.user.role));
      }
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return () => {
    authApi.logout().catch(() => {});
    logout();
    navigate(ROUTES.LOGIN);
  };
}

export function useChangePassword() {
  const { updateUser, user } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authApi.changePassword(data),
    onSuccess: () => {
      updateUser({ isFirstLogin: false, requiresPasswordChange: false });
      if (user) {
        navigate(getRoleHome(user.role));
      }
    },
  });
}
