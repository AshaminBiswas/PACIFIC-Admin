import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  AdminUserManagementItem,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  RoleManagementItem,
  GroupedPermissionsResponse,
  CreateRolePayload,
  UpdateRolePayload,
  AdminActivityLogItem,
} from '../types/admin';

export const usersApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<AdminUserManagementItem>>>('/users', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<AdminUserManagementItem>>(`/users/${id}`),

  create: (data: CreateAdminUserPayload) =>
    apiClient.post<ApiResponse<AdminUserManagementItem>>('/users', data),

  update: (id: string, data: UpdateAdminUserPayload) =>
    apiClient.patch<ApiResponse<AdminUserManagementItem>>(`/users/${id}`, data),

  resetPassword: (id: string, password: string, forceChangeOnLogin = true) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string }>>(`/users/${id}/reset-password`, {
      password,
      forceChangeOnLogin,
    }),

  reset2fa: (id: string) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string }>>(`/users/${id}/reset-2fa`),

  revokeSessions: (id: string) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string }>>(`/users/${id}/revoke-sessions`),

  getEffectivePermissions: (id: string) =>
    apiClient.get<ApiResponse<{
      adminId: string;
      userId: string;
      roles: RoleManagementItem[];
      isSuperAdmin: boolean;
      effectivePermissions: any[];
      effectivePermissionCodes: string[];
    }>>(`/users/${id}/effective-permissions`),

  getUserActivity: (id: string, params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<AdminActivityLogItem>>>(`/users/${id}/activity`, { params }),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(`/users/${id}`),
};

export const rolesApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<RoleManagementItem[]>>('/roles', { params }),

  getPermissions: () =>
    apiClient.get<ApiResponse<GroupedPermissionsResponse>>('/roles/permissions'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<RoleManagementItem>>(`/roles/${id}`),

  create: (data: CreateRolePayload) =>
    apiClient.post<ApiResponse<RoleManagementItem>>('/roles', data),

  duplicate: (id: string, name?: string) =>
    apiClient.post<ApiResponse<RoleManagementItem>>(`/roles/${id}/duplicate`, { name }),

  update: (id: string, data: UpdateRolePayload) =>
    apiClient.patch<ApiResponse<RoleManagementItem>>(`/roles/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(`/roles/${id}`),
};

export const activityLogsApi = {
  listAdminActivity: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<AdminActivityLogItem>>>('/audit/admin-activity', { params }),

  listMutationAudit: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<any>>>('/audit', { params }),
};
