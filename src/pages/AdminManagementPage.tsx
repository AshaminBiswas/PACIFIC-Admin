import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Shield,
  KeyRound,
  Search,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  UserCheck,
  UserX,
  ShieldAlert,
  ChevronRight,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { usersApi, rolesApi } from '../api/services';
import { useAdminAuth } from '../context/AdminAuthContext';
import type {
  AdminUserManagementItem,
  RoleManagementItem,
  Permission,
  GroupedPermissionsResponse,
} from '../types/admin';

export default function AdminManagementPage() {
  const { user: currentUser } = useAdminAuth();
  const isSuperAdmin = currentUser?.role?.toUpperCase() === 'SUPER_ADMIN';

  // Tabs
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');

  // ─── Users State ────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUserManagementItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // ─── Roles State ────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState<RoleManagementItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState<'ALL' | 'SYSTEM' | 'CUSTOM'>('ALL');
  const [allPermissionsData, setAllPermissionsData] = useState<GroupedPermissionsResponse | null>(null);

  // ─── Modals State ───────────────────────────────────────────────────────────
  // Create / Edit User Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserManagementItem | null>(null);
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'EDITOR',
    roleIds: [] as string[],
    isActive: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // Reset Password Modal
  const [resettingUser, setResettingUser] = useState<AdminUserManagementItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Create / Edit Role Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleManagementItem | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    permissionIds: [] as string[],
  });
  const [savingRole, setSavingRole] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await usersApi.list({
        page: userPage,
        limit: 15,
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
      });
      if (res.data?.data) {
        setUsers(res.data.data.items || []);
        setUserTotalPages(res.data.data.totalPages || 1);
        setTotalUsersCount(res.data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [userPage, userSearch, userRoleFilter, userStatusFilter]);

  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rolesApi.list(),
        rolesApi.getPermissions(),
      ]);
      if (rolesRes.data?.data) {
        setRoles(rolesRes.data.data);
      }
      if (permsRes.data?.data) {
        setAllPermissionsData(permsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load roles and permissions:', err);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ─── User Actions ───────────────────────────────────────────────────────────

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      password: generateRandomPassword(),
      role: 'EDITOR',
      roleIds: [],
      isActive: true,
    });
    setShowPassword(true);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: AdminUserManagementItem) => {
    setEditingUser(user);
    setUserForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      password: '',
      role: user.role,
      roleIds: user.customRoles ? user.customRoles.map((r) => r.id) : [],
      isActive: user.isActive,
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          role: userForm.role,
          roleIds: userForm.roleIds,
          isActive: userForm.isActive,
        });
        showToast(`User ${userForm.email} updated successfully`);
      } else {
        await usersApi.create({
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
          roleIds: userForm.roleIds,
          isActive: userForm.isActive,
        });
        showToast(`Admin user ${userForm.email} created successfully`);
      }
      setShowUserModal(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to save admin user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleUserStatus = async (user: AdminUserManagementItem) => {
    if (user.id === currentUser?.id) {
      alert('You cannot deactivate your own account.');
      return;
    }
    const newStatus = !user.isActive;
    try {
      await usersApi.update(user.id, { isActive: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
      showToast(`User ${user.email} is now ${newStatus ? 'Active' : 'Suspended'}`);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update user status');
    }
  };

  const handleOpenResetPassword = (user: AdminUserManagementItem) => {
    setResettingUser(user);
    setNewPassword(generateRandomPassword());
  };

  const handleSaveResetPassword = async () => {
    if (!resettingUser || !newPassword.trim()) return;
    setSavingPassword(true);
    try {
      await usersApi.resetPassword(resettingUser.id, newPassword.trim());
      showToast(`Password reset successfully for ${resettingUser.email}`);
      setResettingUser(null);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteUser = async (user: AdminUserManagementItem) => {
    if (user.id === currentUser?.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (
      !confirm(
        `Are you sure you want to permanently delete admin user "${user.firstName} ${user.lastName}" (${user.email})? This action cannot be undone.`
      )
    )
      return;

    try {
      await usersApi.delete(user.id);
      showToast(`User ${user.email} deleted successfully`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete user');
    }
  };

  // ─── Role Actions ───────────────────────────────────────────────────────────

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleForm({
      name: '',
      code: '',
      description: '',
      permissionIds: [],
    });
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (role: RoleManagementItem) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      code: role.code,
      description: role.description || '',
      permissionIds: role.permissions ? role.permissions.map((p) => p.id) : [],
    });
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      alert('Role name is required');
      return;
    }
    setSavingRole(true);
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, {
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          permissionIds: roleForm.permissionIds,
        });
        showToast(`Role ${roleForm.name} updated successfully`);
      } else {
        await rolesApi.create({
          name: roleForm.name.trim(),
          code: roleForm.code.trim() || undefined,
          description: roleForm.description.trim(),
          permissionIds: roleForm.permissionIds,
        });
        showToast(`Custom role ${roleForm.name} created successfully`);
      }
      setShowRoleModal(false);
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to save role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (role: RoleManagementItem) => {
    if (role.isSystem) {
      alert('Built-in system roles cannot be deleted.');
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete custom role "${role.name}" (${role.code})? Users assigned to this role must be reassigned first.`
      )
    )
      return;

    try {
      await rolesApi.delete(role.id);
      showToast(`Role ${role.name} deleted successfully`);
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete role');
    }
  };

  // Helper: toggle a single permission
  const handleTogglePermission = (permId: string) => {
    setRoleForm((prev) => {
      const exists = prev.permissionIds.includes(permId);
      return {
        ...prev,
        permissionIds: exists
          ? prev.permissionIds.filter((id) => id !== permId)
          : [...prev.permissionIds, permId],
      };
    });
  };

  // Helper: toggle all permissions for a specific module
  const handleToggleModulePermissions = (moduleName: string) => {
    if (!allPermissionsData) return;
    const modulePerms = allPermissionsData.grouped[moduleName] || [];
    const modulePermIds = modulePerms.map((p) => p.id);

    setRoleForm((prev) => {
      const allSelected = modulePermIds.every((id) => prev.permissionIds.includes(id));
      if (allSelected) {
        // Deselect all in module
        return {
          ...prev,
          permissionIds: prev.permissionIds.filter((id) => !modulePermIds.includes(id)),
        };
      } else {
        // Select all in module
        const combined = Array.from(new Set([...prev.permissionIds, ...modulePermIds]));
        return { ...prev, permissionIds: combined };
      }
    });
  };

  // Helper: select or clear all permissions
  const handleToggleAllPermissions = (selectAll: boolean) => {
    if (!allPermissionsData) return;
    setRoleForm((prev) => ({
      ...prev,
      permissionIds: selectAll ? allPermissionsData.all.map((p) => p.id) : [],
    }));
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function generateRandomPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#%&*';
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }



  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchesSearch =
        !roleSearch ||
        r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
        r.code.toLowerCase().includes(roleSearch.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(roleSearch.toLowerCase()));

      const matchesType =
        roleTypeFilter === 'ALL' ||
        (roleTypeFilter === 'SYSTEM' && r.isSystem) ||
        (roleTypeFilter === 'CUSTOM' && !r.isSystem);

      return matchesSearch && matchesType;
    });
  }, [roles, roleSearch, roleTypeFilter]);

  // Role pill color styling
  const getRoleBadgeColor = (roleStr: string) => {
    switch (roleStr?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'ADMIN':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'SALES_MANAGER':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'WAREHOUSE_MANAGER':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'FINANCE_OFFICER':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'EXPORT_MANAGER':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'PROCUREMENT_MANAGER':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'EDITOR':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121226] border border-[#7FB706]/40 shadow-2xl text-white px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#7FB706]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Metric Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#7FB706] font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> Role-Based Access Control (RBAC)
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            Admin & Role Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage admin users, configure custom permissions, and enforce enterprise platform security.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <>
              {activeTab === 'USERS' ? (
                <button
                  onClick={handleOpenCreateUser}
                  className="px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" /> New Admin User
                </button>
              ) : (
                <button
                  onClick={handleOpenCreateRole}
                  className="px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" /> Create Custom Role
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Total Admins</div>
            <div className="text-2xl font-black text-white mt-1">{totalUsersCount}</div>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Active Staff</div>
            <div className="text-2xl font-black text-[#7FB706] mt-1">
              {users.filter((u) => u.isActive).length}
            </div>
          </div>
          <div className="p-3 bg-[#7FB706]/10 text-[#7FB706] rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Custom Roles</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {roles.filter((r) => !r.isSystem).length}
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Platform Perms</div>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {allPermissionsData?.total || 52}
            </div>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'USERS'
              ? 'border-[#7FB706] text-[#7FB706]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Administrators & Staff
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-gray-300">
            {totalUsersCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ROLES')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'ROLES'
              ? 'border-[#7FB706] text-[#7FB706]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" /> Roles & Permission Matrix
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-gray-300">
            {roles.length}
          </span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: USERS MANAGEMENT                                                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search admin users by name or email..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUserPage(1);
                }}
                className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              >
                <option value="ALL">All Primary Roles</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="ADMIN">ADMIN</option>
                <option value="EDITOR">EDITOR</option>
                <option value="VIEWER">VIEWER</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  setUserPage(1);
                }}
                className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Suspended</option>
              </select>

              <button
                onClick={fetchUsers}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Refresh user list"
              >
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Desktop Users Table */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            {loadingUsers ? (
              <div className="p-8 text-center text-gray-400 text-xs animate-pulse">Loading admin users...</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Users className="w-8 h-8 text-gray-600 mx-auto" />
                <div className="text-sm font-bold text-gray-300">No Admin Users Found</div>
                <div className="text-xs text-gray-500">Try changing your search term or filter parameters.</div>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-[#0a0a1a] text-gray-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Primary Role</th>
                        <th className="py-3 px-4">Custom Roles</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Created Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || 'U';

                        return (
                          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7FB706]/20 to-[#121226] border border-[#7FB706]/30 flex items-center justify-center font-bold text-[#7FB706] text-xs shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    {u.firstName} {u.lastName}
                                    {isSelf && (
                                      <span className="text-[10px] bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30 px-1.5 py-0.2 rounded font-mono">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-gray-400 text-[11px] font-mono">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                                  u.role
                                )}`}
                              >
                                {u.role}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {u.customRoles && u.customRoles.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {u.customRoles.map((cr) => (
                                    <span
                                      key={cr.id}
                                      className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-gray-300"
                                      title={cr.name}
                                    >
                                      {cr.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-600 text-[11px]">None</span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                disabled={isSelf}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-all ${
                                  u.isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                } ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}
                                title={isSelf ? 'Cannot deactivate self' : 'Click to toggle status'}
                              >
                                {u.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                {u.isActive ? 'Active' : 'Suspended'}
                              </button>
                            </td>

                            <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isSuperAdmin && (
                                  <>
                                    <button
                                      onClick={() => handleOpenResetPassword(u)}
                                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                                      title="Reset Password"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditUser(u)}
                                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                                      title="Edit User Profile & Roles"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(u)}
                                      disabled={isSelf}
                                      className={`p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center ${
                                        isSelf ? 'opacity-30 cursor-not-allowed' : ''
                                      }`}
                                      title={isSelf ? 'Cannot delete self' : 'Delete User (Super Admin Only)'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-white/5">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const initials = `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || 'U';

                    return (
                      <div key={u.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7FB706]/20 to-[#121226] border border-[#7FB706]/30 flex items-center justify-center font-bold text-[#7FB706] text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                                {u.firstName} {u.lastName}
                                {isSelf && (
                                  <span className="text-[10px] bg-[#7FB706]/10 text-[#7FB706] px-1 py-0.2 rounded font-mono">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-400 text-[11px] font-mono">{u.email}</div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                              u.role
                            )}`}
                          >
                            {u.role}
                          </span>
                        </div>

                        {u.customRoles && u.customRoles.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {u.customRoles.map((cr) => (
                              <span
                                key={cr.id}
                                className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-300"
                              >
                                {cr.name}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                          <span>Status:</span>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={isSelf}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              u.isActive
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Suspended'}
                          </button>
                        </div>

                        {isSuperAdmin && (
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                            <button
                              onClick={() => handleOpenResetPassword(u)}
                              className="min-h-[40px] flex items-center justify-center gap-1 text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-cyan-400 rounded-xl"
                            >
                              <KeyRound className="w-3.5 h-3.5" /> Key
                            </button>
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="min-h-[40px] flex items-center justify-center gap-1 text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-amber-400 rounded-xl"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSelf}
                              className={`min-h-[40px] flex items-center justify-center gap-1 text-[11px] font-semibold bg-red-500/10 text-red-400 rounded-xl ${
                                isSelf ? 'opacity-30 cursor-not-allowed' : ''
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Pagination */}
            {userTotalPages > 1 && (
              <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 bg-[#0a0a1a]">
                <span>
                  Page {userPage} of {userTotalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                    disabled={userPage === userTotalPages}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: ROLES & PERMISSION MATRIX                                       */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'ROLES' && (
        <div className="space-y-4">
          {/* Role Filters Bar */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search roles by name, code, or description..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleTypeFilter}
                onChange={(e) => setRoleTypeFilter(e.target.value as any)}
                className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
              >
                <option value="ALL">All Roles ({roles.length})</option>
                <option value="SYSTEM">System Roles (Protected)</option>
                <option value="CUSTOM">Custom Roles</option>
              </select>

              <button
                onClick={fetchRoles}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Refresh roles"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRoles ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Roles Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingRoles ? (
              <div className="col-span-full p-8 text-center text-gray-400 text-xs animate-pulse">
                Loading role capabilities...
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="col-span-full p-12 text-center text-gray-500 text-xs">
                No roles match your search filter.
              </div>
            ) : (
              filteredRoles.map((r) => {
                const totalPerms = allPermissionsData?.total || 52;
                const permCount = r.permissionCount || r.permissions?.length || 0;
                const permPct = Math.round((permCount / totalPerms) * 100);

                return (
                  <div
                    key={r.id}
                    className="bg-[#121226] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-white text-sm tracking-tight">{r.name}</h3>
                          <span className="font-mono text-[11px] text-[#7FB706] font-semibold">{r.code}</span>
                        </div>
                        {r.isSystem ? (
                          <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold">
                            System
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                            Custom
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                        {r.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Permissions Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Permissions Granted</span>
                        <span className="font-mono font-bold text-white">
                          {permCount} / {totalPerms} ({permPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#7FB706] h-full rounded-full transition-all duration-500"
                          style={{ width: `${permPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Users Assigned */}
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{r.assignedUsersCount || 0} Staff Assigned</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleOpenEditRole(r)}
                        className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[40px]"
                      >
                        <Shield className="w-3.5 h-3.5 text-[#7FB706]" />
                        {r.isSystem ? 'View Permissions' : 'Configure Matrix'}
                      </button>

                      {!r.isSystem && isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center transition-all"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: CREATE / EDIT ADMIN USER                                      */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#7FB706]" />
                <h3 className="text-sm font-bold text-white">
                  {editingUser ? `Edit Admin User — ${editingUser.email}` : 'Add New Admin / Staff User'}
                </h3>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={userForm.firstName}
                    onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                    placeholder="e.g. Rahul"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                    placeholder="e.g. Sharma"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingUser)}
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="name@pacificrestroomcubicle.com"
                  className={`w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] ${
                    editingUser ? 'opacity-60 cursor-not-allowed font-mono' : ''
                  }`}
                />
              </div>

              {!editingUser && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-gray-300">Initial Password *</label>
                    <button
                      type="button"
                      onClick={() => setUserForm({ ...userForm, password: generateRandomPassword() })}
                      className="text-[11px] text-[#7FB706] hover:text-[#90ce08] flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#7FB706] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Primary Access Tier</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Authority & Delete)</option>
                  <option value="ADMIN">ADMIN (Operations & Management)</option>
                  <option value="EDITOR">EDITOR (Content & Day-to-Day Records)</option>
                  <option value="VIEWER">VIEWER (Read-Only Observer)</option>
                </select>
              </div>

              {/* Custom Roles Assignment */}
              <div className="pt-2 border-t border-white/10">
                <label className="block font-semibold text-gray-300 mb-2">
                  Assigned Capability & Functional Roles
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {roles.map((r) => {
                    const isChecked = userForm.roleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#7FB706]/10 border-[#7FB706]/40 text-white'
                            : 'bg-[#0a0a1a] border-white/5 text-gray-400 hover:border-white/10'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setUserForm((prev) => ({
                              ...prev,
                              roleIds: isChecked
                                ? prev.roleIds.filter((id) => id !== r.id)
                                : [...prev.roleIds, r.id],
                            }));
                          }}
                          className="mt-0.5 rounded accent-[#7FB706]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs">{r.name}</span>
                            <span className="font-mono text-[10px] text-gray-500">({r.code})</span>
                          </div>
                          {r.description && <p className="text-[11px] text-gray-400 mt-0.5">{r.description}</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-300 block">Account Status</span>
                  <span className="text-[11px] text-gray-500">Allow user to log in and access authorized paths</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUserForm({ ...userForm, isActive: !userForm.isActive })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    userForm.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}
                >
                  {userForm.isActive ? 'Active' : 'Suspended'}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-6 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {savingUser ? 'Saving...' : editingUser ? 'Update Admin' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: RESET PASSWORD                                                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Reset User Password</h3>
              </div>
              <button onClick={() => setResettingUser(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Resetting the password for <strong className="text-white">{resettingUser.email}</strong> will revoke all
              their current active sessions and require them to log in again.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-300">Generated New Password</span>
                <button
                  type="button"
                  onClick={() => setNewPassword(generateRandomPassword())}
                  className="text-[#7FB706] hover:text-[#90ce08] flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3" /> Regenerate
                </button>
              </div>

              <div>
                <input
                  type="text"
                  readOnly
                  value={newPassword}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-[#7FB706] font-mono text-sm tracking-wider select-all cursor-text text-center font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResetPassword}
                disabled={savingPassword}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer min-h-[40px]"
              >
                {savingPassword ? 'Resetting...' : 'Apply New Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: CREATE / EDIT ROLE & PERMISSION MATRIX                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-[#7FB706]" />
                <h3 className="text-sm font-bold text-white">
                  {editingRole
                    ? `${editingRole.isSystem ? 'View Permissions' : 'Configure Role'} — ${editingRole.name}`
                    : 'Create New Custom Role'}
                </h3>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.isSystem}
                    value={roleForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const autoCode = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                      setRoleForm({
                        ...roleForm,
                        name,
                        code: editingRole ? roleForm.code : autoCode,
                      });
                    }}
                    placeholder="e.g. Export Logistics Officer"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Unique Role Code</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingRole)}
                    value={roleForm.code}
                    onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                    placeholder="e.g. EXPORT_LOGISTICS_OFFICER"
                    className={`w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#7FB706] ${
                      editingRole ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  disabled={editingRole?.isSystem}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Outline responsibilities and operational boundaries..."
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* Permissions Header & Bulk Toggles */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#7FB706]" /> Granular Permissions Matrix
                    </h4>
                    <span className="text-[11px] text-gray-400">
                      {roleForm.permissionIds.length} of {allPermissionsData?.total || 52} capabilities selected
                    </span>
                  </div>

                  {!editingRole?.isSystem && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAllPermissions(true)}
                        className="px-2.5 py-1 bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Grant All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAllPermissions(false)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-400 text-[11px] rounded-lg cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                {/* Modules Grid */}
                <div className="space-y-4">
                  {allPermissionsData &&
                    allPermissionsData.modules.map((moduleName) => {
                      const perms = allPermissionsData.grouped[moduleName] || [];
                      const modulePermIds = perms.map((p) => p.id);
                      const allModuleSelected = modulePermIds.every((id) =>
                        roleForm.permissionIds.includes(id)
                      );
                      const someModuleSelected =
                        !allModuleSelected &&
                        modulePermIds.some((id) => roleForm.permissionIds.includes(id));

                      return (
                        <div
                          key={moduleName}
                          className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3.5 space-y-3"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <span className="font-bold text-gray-200 text-xs tracking-wide">
                              {moduleName} ({perms.length})
                            </span>
                            {!editingRole?.isSystem && (
                              <button
                                type="button"
                                onClick={() => handleToggleModulePermissions(moduleName)}
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer ${
                                  allModuleSelected
                                    ? 'bg-[#7FB706]/20 text-[#7FB706]'
                                    : someModuleSelected
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'text-gray-500 hover:text-white'
                                }`}
                              >
                                {allModuleSelected ? 'Deselect Module' : 'Select All'}
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {perms.map((p) => {
                              const isChecked = roleForm.permissionIds.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-[#7FB706]/5 border-[#7FB706]/30 text-white'
                                      : 'bg-[#121226]/50 border-white/5 text-gray-400 hover:border-white/10'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={editingRole?.isSystem}
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(p.id)}
                                    className="mt-0.5 rounded accent-[#7FB706]"
                                  />
                                  <div className="flex-1">
                                    <div className="font-mono text-[11px] font-semibold text-[#7FB706]">
                                      {p.code}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                                      {p.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs cursor-pointer min-h-[44px]"
                >
                  Close
                </button>
                {!editingRole?.isSystem && isSuperAdmin && (
                  <button
                    type="submit"
                    disabled={savingRole}
                    className="px-6 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer min-h-[44px]"
                  >
                    {savingRole ? 'Saving...' : editingRole ? 'Update Role Matrix' : 'Save Custom Role'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
