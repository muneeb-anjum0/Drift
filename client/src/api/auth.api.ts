import { api } from './axios';
import type { ApiResponse } from '../types/api.types';
import type { User } from '../types';

interface AuthPayload {
  user: User;
  token: string;
}

export const authApi = {
  register: async (payload: { name: string; email: string; password: string }) => {
    const response = await api.post<ApiResponse<AuthPayload>>('/auth/register', payload);
    return response.data.data;
  },
  login: async (payload: { email: string; password: string }) => {
    const response = await api.post<ApiResponse<AuthPayload>>('/auth/login', payload);
    return response.data.data;
  },
  me: async () => {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data.user;
  },
  logout: async () => {
    const response = await api.post<ApiResponse<Record<string, never>>>('/auth/logout');
    return response.data.data;
  },
};
