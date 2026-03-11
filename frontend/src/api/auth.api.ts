import api from './axios';
import type {
  ApiResponse,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  UserSession,
} from '../types/auth.types';

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<ApiResponse<LoginResponse>>('/v1/auth/login', data),

  logout: () =>
    api.post<ApiResponse<string>>('/v1/auth/logout'),

  changePassword: (data: ChangePasswordRequest) =>
    api.post<ApiResponse<string>>('/v1/auth/change-password', data),

  refreshToken: (refreshToken: string) =>
    api.post<ApiResponse<LoginResponse>>('/v1/auth/refresh', { refreshToken }),

  me: () =>
    api.get<ApiResponse<UserSession>>('/v1/auth/me'),
};
