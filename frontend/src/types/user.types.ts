import { UserRole } from './enums';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  active: boolean;
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  password: string;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  phone?: string;
  active?: boolean;
}
