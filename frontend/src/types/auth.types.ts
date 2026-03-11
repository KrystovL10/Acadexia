import { UserRole } from './enums';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserSession {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  profilePhotoUrl?: string;
  isFirstLogin: boolean;
  requiresPasswordChange: boolean;
  schoolName?: string;
  assignedClassName?: string;
  assignedSubjects?: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  requiresPasswordChange: boolean;
  user: UserSession;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}
