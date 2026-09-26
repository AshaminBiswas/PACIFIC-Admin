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

  resetPassword: (id: string, password: string) =>
    apiClient.post<ApiResponse<{ success: boolean; message: string }>>(`/users/${id}/reset-password`, { password }),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(`/users/${id}`),
};

export const rolesApi = {
  list: () =>
    apiClient.get<ApiResponse<RoleManagementItem[]>>('/roles'),

  getPermissions: () =>
    apiClient.get<ApiResponse<GroupedPermissionsResponse>>('/roles/permissions'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<RoleManagementItem>>(`/roles/${id}`),

  create: (data: CreateRolePayload) =>
    apiClient.post<ApiResponse<RoleManagementItem>>('/roles', data),

  update: (id: string, data: UpdateRolePayload) =>
    apiClient.patch<ApiResponse<RoleManagementItem>>(`/roles/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(`/roles/${id}`),
};
