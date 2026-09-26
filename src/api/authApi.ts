import apiClient from './client';
import type { ApiResponse, AuthTokens } from '../types/admin';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<AuthTokens>>('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }),
  superAdmin: (data: any) => apiClient.post<ApiResponse<any>>('/auth/super-admin', data),
};
