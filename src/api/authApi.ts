import apiClient from './client';
import type { ApiResponse, AuthTokens, AdminSession, TwoFactorSetupData } from '../types/admin';

export interface LoginResult extends AuthTokens {
  requiresPasswordChange?: boolean;
  requires2FA?: boolean;
  requires2FASetup?: boolean;
  tempToken?: string;
  secret?: string;
  qrCodeUrl?: string;
  recoveryCodes?: string[];
  message?: string;
  sessionToken?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<LoginResult>>('/auth/login', { email, password }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get('/auth/me'),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }),

  superAdmin: (data: any) => apiClient.post<ApiResponse<any>>('/auth/super-admin', data),

  // First-time login onboarding flow
  firstTimeChangePassword: (tempToken: string, newPassword: string) =>
    apiClient.post<ApiResponse<{
      requires2FASetup: boolean;
      tempToken: string;
      secret: string;
      qrCodeUrl: string;
      recoveryCodes: string[];
      message: string;
    }>>('/auth/first-time/change-password', { newPassword }, {
      headers: { Authorization: `Bearer ${tempToken}` },
    }),

  firstTimeVerify2fa: (tempToken: string, code: string) =>
    apiClient.post<ApiResponse<AuthTokens>>('/auth/first-time/verify-2fa', { code }, {
      headers: { Authorization: `Bearer ${tempToken}` },
    }),

  // Standard 2FA verification for regular logins
  verify2fa: (tempToken: string, code: string) =>
    apiClient.post<ApiResponse<AuthTokens & { usedRecoveryCode?: boolean }>>('/auth/2fa/verify', { code }, {
      headers: { Authorization: `Bearer ${tempToken}` },
    }),

  // User Settings 2FA Management
  setup2fa: () =>
    apiClient.post<ApiResponse<TwoFactorSetupData>>('/auth/2fa/setup'),

  enable2fa: (code: string) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/auth/2fa/enable', { code }),

  disable2fa: (password: string) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/auth/2fa/disable', { password }),

  regenerateRecoveryCodes: (password: string) =>
    apiClient.post<ApiResponse<{ success: boolean; recoveryCodes: string[] }>>('/auth/2fa/regenerate-recovery-codes', { password }),

  // Device Sessions & Remote Revocation
  getSessions: () =>
    apiClient.get<ApiResponse<AdminSession[]>>('/auth/sessions'),

  revokeSession: (id: string) =>
    apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(`/auth/sessions/${id}`),

  revokeOtherSessions: () =>
    apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/auth/sessions/revoke-others'),
};
