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
  ChevronDown,
  Layers,
  Sparkles,
  Info,
  Clock,
  RotateCcw,
  Mail,
  Copy,
  Phone,
  Building,
  Filter,
  Activity,
  SlidersHorizontal,
  FileText,
  Download,
  Upload,
  Calendar,
  ExternalLink,
  Smartphone,
  CheckSquare,
  Square,
  ArrowRight,
  Database,
  History,
  Laptop,
} from 'lucide-react';
import { usersApi, rolesApi, activityLogsApi } from '../api/services';
import { useAdminAuth } from '../context/AdminAuthContext';
import { MailAdminModal } from '../components/mail/MailAdminModal';
import type {
  AdminUserManagementItem,
  RoleManagementItem,
  Permission,
  GroupedPermissionsResponse,
  AdminActivityLogItem,
} from '../types/admin';

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = 'Pac@';
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export default function AdminManagementPage() {
  const { user: currentUser } = useAdminAuth();
  const roleUpper = currentUser?.role?.toUpperCase();
  const isSuperAdmin = Boolean(
    currentUser &&
      (currentUser.isSuperAdmin ||
        roleUpper === 'SUPER_ADMIN' ||
        currentUser.roles?.some((r) => r.code === 'SUPER_ADMIN'))
  );

  // Tabs
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES' | 'ACTIVITY'>('USERS');
  const [isMailAdminModalOpen, setIsMailAdminModalOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─── Users State ────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUserManagementItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userDeptFilter, setUserDeptFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userSortBy, setUserSortBy] = useState<'createdAt' | 'name' | 'adminId' | 'lastLoginAt'>('createdAt');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('desc');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // ─── Roles State ────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState<RoleManagementItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleCategoryFilter, setRoleCategoryFilter] = useState('ALL');
  const [allPermissionsData, setAllPermissionsData] = useState<GroupedPermissionsResponse | null>(null);

  // ─── Activity Logs State ────────────────────────────────────────────────────
  const [activityLogs, setActivityLogs] = useState<AdminActivityLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logTargetType, setLogTargetType] = useState('ALL');
  const [logActionFilter, setLogActionFilter] = useState('ALL');
  const [logActorFilter, setLogActorFilter] = useState('ALL');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [inspectingDiffLog, setInspectingDiffLog] = useState<AdminActivityLogItem | null>(null);

  // ─── Modals State ───────────────────────────────────────────────────────────
  // Create / Edit User Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserManagementItem | null>(null);
  const [userForm, setUserForm] = useState({
    adminId: '',
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    department: 'Sales & Commercial',
    designation: 'Sales Executive',
    profilePhoto: '',
    password: '',
    role: 'ADMIN',
    roleIds: [] as string[],
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING',
    mustChangePassword: true,
    isTwoFactorPending: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // Reset Password Modal
  const [resettingUser, setResettingUser] = useState<AdminUserManagementItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [forceChangeOnLogin, setForceChangeOnLogin] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);

  // User Profile / Access Overview Deep Dive Modal
  const [deepDiveUser, setDeepDiveUser] = useState<AdminUserManagementItem | null>(null);
  const [deepDiveTab, setDeepDiveTab] = useState<'OVERVIEW' | 'ROLES' | 'PERMISSIONS' | 'ACTIVITY'>('OVERVIEW');
  const [deepDiveEffectivePerms, setDeepDiveEffectivePerms] = useState<any[]>([]);
  const [deepDiveLoadingPerms, setDeepDiveLoadingPerms] = useState(false);
  const [deepDivePermFilter, setDeepDivePermFilter] = useState('');
  const [deepDiveUserLogs, setDeepDiveUserLogs] = useState<AdminActivityLogItem[]>([]);
  const [deepDiveLoadingLogs, setDeepDiveLoadingLogs] = useState(false);

  // Create / Edit Role Modal with Hierarchical Permission Matrix
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleManagementItem | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    department: 'General',
    category: 'Custom',
    permissionIds: [] as string[],
  });
  const [rolePermSearch, setRolePermSearch] = useState('');
  const [roleSelectedModule, setRoleSelectedModule] = useState<string>('ALL');
  const [savingRole, setSavingRole] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await usersApi.list({
        page: userPage,
        limit: 15,
        search: userSearch,
        role: userRoleFilter,
        department: userDeptFilter,
        status: userStatusFilter,
        sortBy: userSortBy,
        sortOrder: userSortOrder,
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
  }, [userPage, userSearch, userRoleFilter, userDeptFilter, userStatusFilter, userSortBy, userSortOrder]);

  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rolesApi.list({ search: roleSearch, category: roleCategoryFilter }),
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
  }, [roleSearch, roleCategoryFilter]);

  const fetchActivityLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await activityLogsApi.listAdminActivity({
        page: logPage,
        limit: 20,
        search: logSearch,
        targetType: logTargetType,
        action: logActionFilter,
        actorId: logActorFilter !== 'ALL' ? logActorFilter : undefined,
        dateFrom: logDateFrom || undefined,
        dateTo: logDateTo || undefined,
      });
      if (res.data?.data) {
        setActivityLogs(res.data.data.items || []);
        setLogTotalPages(res.data.data.totalPages || 1);
        setTotalLogsCount(res.data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [logPage, logSearch, logTargetType, logActionFilter, logActorFilter, logDateFrom, logDateTo]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (activeTab === 'ACTIVITY') {
      fetchActivityLogs();
    }
  }, [activeTab, fetchActivityLogs]);

  // Next sequential Admin ID preview helper
  const nextAdminIdPreview = useMemo(() => {
    if (!users || users.length === 0) return 'ADM-1006';
    let max = 1000;
    for (const u of users) {
      if (u.adminId) {
        const m = u.adminId.match(/^ADM-(\d+)$/);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num > max) max = num;
        }
      }
    }
    return `ADM-${max + 1}`;
  }, [users]);

  // Departments list for dropdowns
  const DEPARTMENTS = [
    'Management',
    'Sales & Commercial',
    'Logistics & Warehouse',
    'Finance & Accounts',
    'Procurement',
    'Digital Marketing',
    'Support & CRM',
    'General',
  ];

  // ─── User Actions Handlers ──────────────────────────────────────────────────

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      adminId: nextAdminIdPreview,
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: '',
      department: 'Sales & Commercial',
      designation: 'Sales Executive',
      profilePhoto: '',
      password: generateRandomPassword(),
      role: 'ADMIN',
      roleIds: [],
      status: 'ACTIVE',
      mustChangePassword: true,
      isTwoFactorPending: true,
    });
    setShowPassword(true);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: AdminUserManagementItem) => {
    setEditingUser(u);
    setUserForm({
      adminId: u.adminId || '',
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email,
      mobileNumber: u.mobileNumber || '',
      department: u.department || 'General',
      designation: u.designation || 'Staff',
      profilePhoto: u.profilePhoto || '',
      password: '',
      role: u.role,
      roleIds: u.roles ? u.roles.map((r) => r.id) : u.customRoles ? u.customRoles.map((r) => r.id) : [],
      status: (u.status as any) || (u.isActive ? 'ACTIVE' : 'INACTIVE'),
      mustChangePassword: Boolean(u.mustChangePassword),
      isTwoFactorPending: Boolean(u.isTwoFactorPending),
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
          mobileNumber: userForm.mobileNumber,
          department: userForm.department,
          designation: userForm.designation,
          profilePhoto: userForm.profilePhoto || null,
          role: userForm.role,
          roleIds: userForm.roleIds,
          status: userForm.status,
          mustChangePassword: userForm.mustChangePassword,
        });
        showToast(`Admin account ${userForm.email} updated successfully`);
      } else {
        await usersApi.create({
          adminId: userForm.adminId || undefined,
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
          mobileNumber: userForm.mobileNumber,
          department: userForm.department,
          designation: userForm.designation,
          profilePhoto: userForm.profilePhoto || null,
          password: userForm.password,
          role: userForm.role,
          roleIds: userForm.roleIds,
          status: userForm.status,
          mustChangePassword: userForm.mustChangePassword,
        });
        showToast(`Admin account "${userForm.firstName} ${userForm.lastName}" (${userForm.adminId || 'ADM-NEW'}) created!`);
      }
      setShowUserModal(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to save admin user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleOpenResetPassword = (u: AdminUserManagementItem) => {
    setResettingUser(u);
    setNewPassword(generateRandomPassword());
    setForceChangeOnLogin(true);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setSavingPassword(true);
    try {
      const res = await usersApi.resetPassword(resettingUser.id, newPassword, forceChangeOnLogin);
      showToast(res.data?.message || `Password reset successfully for ${resettingUser.email}`);
      setResettingUser(null);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleReset2fa = async (u: AdminUserManagementItem) => {
    if (
      !confirm(
        `Are you sure you want to reset 2FA for "${u.firstName} ${u.lastName}" (${u.adminId})? Their current authenticator key will be revoked, and they will be prompted to re-enroll upon their next login.`
      )
    )
      return;

    try {
      await usersApi.reset2fa(u.id);
      showToast(`Two-factor authentication reset for ${u.email}`);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to reset 2FA');
    }
  };

  const handleRevokeSessions = async (u: AdminUserManagementItem) => {
    if (
      !confirm(
        `Revoke all active device sessions for "${u.firstName} ${u.lastName}" (${u.adminId})? They will be immediately logged out of all web browsers and devices.`
      )
    )
      return;

    try {
      await usersApi.revokeSessions(u.id);
      showToast(`All active sessions revoked for ${u.email}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to revoke sessions');
    }
  };

  const handleDeleteUser = async (u: AdminUserManagementItem) => {
    if (
      !confirm(
        `DANGER: Are you sure you want to permanently delete admin user "${u.firstName} ${u.lastName}" (${u.adminId})? This action cannot be undone.`
      )
    )
      return;

    try {
      await usersApi.delete(u.id);
      showToast(`User ${u.email} permanently removed`);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete user');
    }
  };

  // Deep dive profile modal
  const handleOpenDeepDive = async (u: AdminUserManagementItem) => {
    setDeepDiveUser(u);
    setDeepDiveTab('OVERVIEW');
    setDeepDivePermFilter('');
    setDeepDiveLoadingPerms(true);
    setDeepDiveLoadingLogs(true);

    try {
      const [permRes, logsRes] = await Promise.all([
        usersApi.getEffectivePermissions(u.id),
        usersApi.getUserActivity(u.id, { limit: 20 }),
      ]);
      if (permRes.data?.data) {
        setDeepDiveEffectivePerms(permRes.data.data.effectivePermissions || []);
      }
      if (logsRes.data?.data) {
        setDeepDiveUserLogs(logsRes.data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load user access overview:', err);
    } finally {
      setDeepDiveLoadingPerms(false);
      setDeepDiveLoadingLogs(false);
    }
  };

  // ─── Role & Permissions Handlers ────────────────────────────────────────────

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleForm({
      name: '',
      code: '',
      description: '',
      department: 'General',
      category: 'Custom',
      permissionIds: [],
    });
    setRolePermSearch('');
    setRoleSelectedModule('ALL');
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (role: RoleManagementItem) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      code: role.code,
      description: role.description || '',
      department: role.department || 'General',
      category: role.category || 'Custom',
      permissionIds: role.permissions ? role.permissions.map((p) => p.id) : [],
    });
    setRolePermSearch('');
    setRoleSelectedModule('ALL');
    setShowRoleModal(true);
  };

  const handleDuplicateRole = async (role: RoleManagementItem) => {
    const newName = prompt(`Enter name for duplicated role:`, `${role.name} (Custom)`);
    if (!newName || !newName.trim()) return;

    try {
      await rolesApi.duplicate(role.id, newName.trim());
      showToast(`Role "${role.name}" cloned into "${newName.trim()}" successfully`);
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to duplicate role');
    }
  };

  const handleDeleteRole = async (role: RoleManagementItem) => {
    if (role.isSystem) {
      alert('System template roles are core to Pacific Admin and cannot be deleted.');
      return;
    }
    if ((role.assignedUsersCount || 0) > 0) {
      alert(`Cannot delete role "${role.name}" because it is currently assigned to ${role.assignedUsersCount} admin(s). Reassign them first.`);
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete custom role "${role.name}"?`)) return;

    try {
      await rolesApi.delete(role.id);
      showToast(`Role "${role.name}" deleted successfully`);
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete role');
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRole(true);
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, {
          name: roleForm.name,
          description: roleForm.description,
          department: roleForm.department,
          category: roleForm.category,
          permissionIds: roleForm.permissionIds,
        });
        showToast(`Role "${roleForm.name}" updated successfully with ${roleForm.permissionIds.length} permissions`);
      } else {
        await rolesApi.create({
          name: roleForm.name,
          code: roleForm.code || undefined,
          description: roleForm.description,
          department: roleForm.department,
          category: roleForm.category,
          permissionIds: roleForm.permissionIds,
        });
        showToast(`Custom role "${roleForm.name}" created with ${roleForm.permissionIds.length} permissions`);
      }
      setShowRoleModal(false);
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to save role');
    } finally {
      setSavingRole(false);
    }
  };

  // Quick Permission Presets
  const applyPermissionPreset = (preset: 'FULL' | 'READ_ONLY' | 'READ_CREATE' | 'READ_CREATE_UPDATE' | 'CLEAR') => {
    if (!allPermissionsData?.all) return;
    const all = allPermissionsData.all;

    if (preset === 'CLEAR') {
      setRoleForm((prev) => ({ ...prev, permissionIds: [] }));
      return;
    }

    if (preset === 'FULL') {
      setRoleForm((prev) => ({ ...prev, permissionIds: all.map((p) => p.id) }));
      return;
    }

    const filtered = all.filter((p) => {
      const code = p.code.toLowerCase();
      const action = (p.action || '').toUpperCase();

      const isRead =
        action === 'READ' ||
        action === 'VIEW' ||
        code.endsWith('.read') ||
        code.endsWith('.view') ||
        code.endsWith('.list') ||
        code.endsWith('.view_details');

      if (preset === 'READ_ONLY') return isRead;

      const isCreate =
        action === 'CREATE' ||
        code.endsWith('.create') ||
        code.endsWith('.new') ||
        code.endsWith('.add');

      if (preset === 'READ_CREATE') return isRead || isCreate;

      const isUpdate =
        action === 'UPDATE' ||
        action === 'EDIT' ||
        code.endsWith('.update') ||
        code.endsWith('.edit') ||
        code.endsWith('.change_status');

      if (preset === 'READ_CREATE_UPDATE') return isRead || isCreate || isUpdate;

      return false;
    });

    setRoleForm((prev) => ({ ...prev, permissionIds: filtered.map((p) => p.id) }));
  };

  // Module toggle in Permission Matrix
  const toggleAllModulePermissions = (moduleName: string) => {
    if (!allPermissionsData?.grouped?.[moduleName]) return;
    const modulePerms: Permission[] = allPermissionsData.grouped[moduleName].permissions || [];
    const modulePermIds = modulePerms.map((p) => p.id);

    const allSelected = modulePermIds.every((id) => roleForm.permissionIds.includes(id));

    setRoleForm((prev) => ({
      ...prev,
      permissionIds: allSelected
        ? prev.permissionIds.filter((id) => !modulePermIds.includes(id))
        : Array.from(new Set([...prev.permissionIds, ...modulePermIds])),
    }));
  };

  // Submodule toggle in Permission Matrix
  const toggleAllSubmodulePermissions = (submodulePerms: Permission[]) => {
    const subPermIds = submodulePerms.map((p) => p.id);
    const allSelected = subPermIds.every((id) => roleForm.permissionIds.includes(id));

    setRoleForm((prev) => ({
      ...prev,
      permissionIds: allSelected
        ? prev.permissionIds.filter((id) => !subPermIds.includes(id))
        : Array.from(new Set([...prev.permissionIds, ...subPermIds])),
    }));
  };

  // Toggle single permission
  const togglePermission = (id: string) => {
    setRoleForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id)
        ? prev.permissionIds.filter((pid) => pid !== id)
        : [...prev.permissionIds, id],
    }));
  };

  // Filtered permission modules for role editor
  const filteredModulesList = useMemo(() => {
    if (!allPermissionsData?.grouped) return [];
    const modules = Object.keys(allPermissionsData.grouped);

    if (roleSelectedModule !== 'ALL') {
      return modules.filter((m) => m === roleSelectedModule);
    }

    if (!rolePermSearch.trim()) return modules;

    const q = rolePermSearch.trim().toLowerCase();
    return modules.filter((m) => {
      if (m.toLowerCase().includes(q)) return true;
      const perms = allPermissionsData.grouped[m].permissions || [];
      return perms.some(
        (p: Permission) =>
          p.code.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.submodule && p.submodule.toLowerCase().includes(q))
      );
    });
  }, [allPermissionsData, roleSelectedModule, rolePermSearch]);

  // Selected role permissions cumulative preview for user form
  const cumulativeSelectedRolePermissions = useMemo(() => {
    if (!roles || userForm.roleIds.length === 0) return [];
    const selected = roles.filter((r) => userForm.roleIds.includes(r.id));
    const set = new Set<string>();
    for (const r of selected) {
      if (r.permissions) {
        for (const p of r.permissions) {
          set.add(p.code);
        }
      }
    }
    return Array.from(set);
  }, [roles, userForm.roleIds]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500/90 backdrop-blur border border-emerald-400 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                Admin Users & RBAC Architecture
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Pacific 2026 Enterprise
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                4-Level Granular Permissions • Deny-by-Default Authorization • Immutable Security Audit Trail
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsMailAdminModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition"
          >
            <Mail className="w-4 h-4 text-sky-400" />
            <span>Mail Accounts</span>
          </button>

          <button
            onClick={() => {
              if (activeTab === 'USERS') fetchUsers();
              else if (activeTab === 'ROLES') fetchRoles();
              else fetchActivityLogs();
              showToast('Refreshed data from secure backend');
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isSuperAdmin && (
            <>
              <button
                onClick={handleOpenCreateRole}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-300 text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Role</span>
              </button>

              <button
                onClick={handleOpenCreateUser}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Admin Account</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalUsersCount}</div>
            <div className="text-xs text-slate-400 font-medium">Total Administrators</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {users.filter((u) => u.isActive && u.status === 'ACTIVE').length}
            </div>
            <div className="text-xs text-slate-400 font-medium">Active Accounts</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{roles.length}</div>
            <div className="text-xs text-slate-400 font-medium">Roles Defined</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{allPermissionsData?.total || 268}</div>
            <div className="text-xs text-slate-400 font-medium">Granular Permissions</div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'USERS'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Admin Users</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300">
            {totalUsersCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ROLES')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'ROLES'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Roles & Permissions Matrix</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300">
            {roles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ACTIVITY')}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === 'ACTIVITY'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Activity & Audit Trail</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300">
            Live
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: ADMIN USERS LISTING & MANAGEMENT                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Search by Admin ID, Name, Email, or Mobile..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Department Filter */}
            <select
              value={userDeptFilter}
              onChange={(e) => {
                setUserDeptFilter(e.target.value);
                setUserPage(1);
              }}
              className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={userRoleFilter}
              onChange={(e) => {
                setUserRoleFilter(e.target.value);
                setUserPage(1);
              }}
              className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={userStatusFilter}
              onChange={(e) => {
                setUserStatusFilter(e.target.value);
                setUserPage(1);
              }}
              className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending Setup</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loadingUsers ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                <p>Loading administrators...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-base font-medium">No admin accounts found</p>
                <p className="text-xs text-slate-500 mt-1">Try adjusting search or filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Admin Profile</th>
                      <th className="py-3.5 px-4">Admin ID</th>
                      <th className="py-3.5 px-4">Department & Designation</th>
                      <th className="py-3.5 px-4">Assigned Roles</th>
                      <th className="py-3.5 px-4">Status & 2FA</th>
                      <th className="py-3.5 px-4">Last Activity</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => {
                      const isTargetSuper = u.role === 'SUPER_ADMIN' || u.roles?.some((r) => r.code === 'SUPER_ADMIN');
                      const statusColor =
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : u.status === 'SUSPENDED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : u.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/30';

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition">
                          {/* Profile */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                {u.profilePhoto ? (
                                  <img
                                    src={u.profilePhoto}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover border border-slate-700"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow">
                                    {(u.firstName?.[0] || 'A').toUpperCase()}
                                    {(u.lastName?.[0] || '').toUpperCase()}
                                  </div>
                                )}
                                <span
                                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                                    u.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-500'
                                  }`}
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-white flex items-center gap-1.5">
                                  {u.firstName} {u.lastName}
                                  {isTargetSuper && (
                                    <span className="px-1.5 py-0.2 text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded">
                                      SUPER
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{u.email}</span>
                                  {u.mobileNumber && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-400 flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-500" />
                                        {u.mobileNumber}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Admin ID */}
                          <td className="py-3.5 px-4 font-mono text-xs">
                            <div className="flex items-center space-x-1.5">
                              <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-indigo-300 rounded-lg font-bold">
                                {u.adminId || 'ADM-PENDING'}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(u.adminId);
                                  showToast(`Copied ${u.adminId}`);
                                }}
                                className="p-1 hover:text-white text-slate-500 transition"
                                title="Copy ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Department & Designation */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs font-medium text-slate-200">{u.designation || 'Administrator'}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{u.department || 'General'}</div>
                          </td>

                          {/* Assigned Roles */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                              {u.roles && u.roles.length > 0 ? (
                                u.roles.map((r) => (
                                  <span
                                    key={r.id}
                                    className={`px-2 py-0.5 text-xs rounded-md font-medium border ${
                                      r.code === 'SUPER_ADMIN'
                                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                        : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                    }`}
                                  >
                                    {r.name}
                                  </span>
                                ))
                              ) : (
                                <span className="px-2 py-0.5 text-xs rounded-md bg-slate-800 text-slate-400">
                                  {u.role}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status & 2FA */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusColor}`}>
                                {u.status || (u.isActive ? 'ACTIVE' : 'INACTIVE')}
                              </span>
                              {u.twoFactorEnabled ? (
                                <span
                                  className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium"
                                  title="Two-Factor Authentication Active"
                                >
                                  2FA
                                </span>
                              ) : (
                                <span
                                  className="p-1 rounded bg-slate-800 text-slate-500 text-[10px]"
                                  title="2FA Not Yet Enrolled"
                                >
                                  No 2FA
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Last Login */}
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {u.lastLoginAt ? (
                              <div>
                                <div className="text-slate-300 font-medium">
                                  {new Date(u.lastLoginAt).toLocaleDateString()}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {new Date(u.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600 italic">Never signed in</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleOpenDeepDive(u)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                title="View Permissions & Profile Deep Dive"
                              >
                                <Eye className="w-4 h-4 text-sky-400" />
                              </button>

                              {isSuperAdmin && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                    title="Edit Admin Details & Roles"
                                  >
                                    <Edit className="w-4 h-4 text-indigo-400" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenResetPassword(u)}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                    title="Reset Password"
                                  >
                                    <KeyRound className="w-4 h-4 text-amber-400" />
                                  </button>

                                  <button
                                    onClick={() => handleReset2fa(u)}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                    title="Reset 2FA Enrollment"
                                  >
                                    <RotateCcw className="w-4 h-4 text-cyan-400" />
                                  </button>

                                  <button
                                    onClick={() => handleRevokeSessions(u)}
                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                    title="Revoke All Device Sessions"
                                  >
                                    <ShieldAlert className="w-4 h-4 text-orange-400" />
                                  </button>

                                  {u.id !== currentUser?.id && (
                                    <button
                                      onClick={() => handleDeleteUser(u)}
                                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                                      title="Delete Admin"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
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
            )}

            {/* Pagination Controls */}
            {userTotalPages > 1 && (
              <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Page <span className="text-white font-medium">{userPage}</span> of{' '}
                  <span className="text-white font-medium">{userTotalPages}</span> ({totalUsersCount} admins)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-200 transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={userPage >= userTotalPages}
                    onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-200 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ROLES & GRANULAR PERMISSIONS MATRIX                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ROLES' && (
        <div className="space-y-6">
          {/* Roles Filter Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search roles by name, code, or department..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={roleCategoryFilter}
              onChange={(e) => setRoleCategoryFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="System">System Templates</option>
              <option value="Custom">Custom Roles</option>
              <option value="Executive">Executive</option>
              <option value="Commercial">Commercial</option>
              <option value="Logistics">Logistics</option>
              <option value="Finance">Finance</option>
              <option value="Content">Content</option>
            </select>
          </div>

          {/* Roles Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map((r) => {
              const isSuper = r.code === 'SUPER_ADMIN';
              const totalPerms = allPermissionsData?.total || 268;
              const permCount = r.permissionCount || r.permissions?.length || 0;
              const permPercent = Math.min(100, Math.round((permCount / totalPerms) * 100));

              return (
                <div
                  key={r.id}
                  className="bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all"
                >
                  <div>
                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          {r.name}
                          {isSuper && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              Master
                            </span>
                          )}
                        </h3>
                        <div className="font-mono text-xs text-indigo-400 mt-0.5">{r.code}</div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                          r.isSystem
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {r.isSystem ? 'System' : 'Custom'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-3 line-clamp-2">
                      {r.description || 'No description provided for this operational role.'}
                    </p>

                    {/* Department badge */}
                    <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>{r.department || 'General'}</span>
                      <span>•</span>
                      <span>{r.category || (r.isSystem ? 'System' : 'Custom')}</span>
                    </div>

                    {/* Permissions count & progress bar */}
                    <div className="mt-4 pt-4 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400 font-medium">Granted Permissions</span>
                        <span className="text-white font-bold">
                          {permCount} <span className="text-slate-500">/ {totalPerms}</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSuper
                              ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                              : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                          }`}
                          style={{ width: `${permPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        <strong className="text-white font-bold">{r.assignedUsersCount || 0}</strong> assigned admins
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDuplicateRole(r)}
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition"
                          title="Duplicate Role Template"
                        >
                          <Copy className="w-3.5 h-3.5 text-sky-400" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditRole(r)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600/20 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isSuperAdmin ? 'Configure' : 'View Permissions'}</span>
                      </button>

                      {isSuperAdmin && !r.isSystem && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 transition"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: ACTIVITY & IMMUTABLE AUDIT TRAIL                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ACTIVITY' && (
        <div className="space-y-4">
          {/* Audit Filters Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(1);
                }}
                placeholder="Search audit trail by actor, action, or details..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={logTargetType}
              onChange={(e) => {
                setLogTargetType(e.target.value);
                setLogPage(1);
              }}
              className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Target Types</option>
              <option value="USER">User Account</option>
              <option value="ROLE">Role & Permissions</option>
              <option value="AUTH">Authentication & 2FA</option>
              <option value="SECURITY">Security Policy</option>
            </select>

            <select
              value={logActionFilter}
              onChange={(e) => {
                setLogActionFilter(e.target.value);
                setLogPage(1);
              }}
              className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE_ADMIN">Create Admin</option>
              <option value="UPDATE_ADMIN">Update Admin</option>
              <option value="RESET_PASSWORD">Reset Password</option>
              <option value="RESET_2FA">Reset 2FA</option>
              <option value="REVOKE_SESSION">Revoke Session</option>
              <option value="CREATE_ROLE">Create Role</option>
              <option value="UPDATE_ROLE">Update Role</option>
              <option value="DELETE_ROLE">Delete Role</option>
              <option value="LOGIN">Admin Login</option>
            </select>

            <button
              onClick={fetchActivityLogs}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Audit Trail List */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loadingLogs ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                <p>Loading audit trail...</p>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Activity className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-base font-medium">No activity log entries found</p>
                <p className="text-xs text-slate-500 mt-1">Actions performed by administrators will stream here in real-time</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {activityLogs.map((log) => {
                  const actionColor =
                    log.action.includes('CREATE')
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : log.action.includes('UPDATE')
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                      : log.action.includes('DELETE') || log.action.includes('REVOKE')
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30';

                  return (
                    <div key={log.id} className="p-4 hover:bg-slate-800/30 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      {/* Left: Actor, Action badge & Details */}
                      <div className="flex items-start space-x-3.5">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                          {log.actor?.firstName?.[0] || 'A'}
                          {log.actor?.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-sm">
                              {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System Agent'}
                            </span>
                            {log.actor?.adminId && (
                              <span className="px-1.5 py-0.2 bg-slate-950 text-slate-400 border border-slate-800 text-[11px] rounded font-mono">
                                {log.actor.adminId}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${actionColor}`}>
                              {log.action}
                            </span>
                            <span className="px-2 py-0.5 text-xs rounded-md bg-slate-950 border border-slate-800 text-slate-400">
                              Target: {log.targetType}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 mt-1">
                            {log.details || 'Administrative record modified'}
                          </p>

                          <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-600" />
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                            {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right: State Diff Inspection */}
                      {(log.previousState || log.newState) && (
                        <button
                          onClick={() => setInspectingDiffLog(log)}
                          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 text-xs font-medium transition shrink-0 flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Inspect Changes</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {logTotalPages > 1 && (
              <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Page <span className="text-white font-medium">{logPage}</span> of{' '}
                  <span className="text-white font-medium">{logTotalPages}</span> ({totalLogsCount} events)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={logPage <= 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-200 transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={logPage >= logTotalPages}
                    onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-200 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE / EDIT ADMIN USER                                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingUser ? `Edit Administrator: ${editingUser.firstName} ${editingUser.lastName}` : 'Create New Administrator'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingUser
                      ? `Update account details, assigned roles, and operational status for ${editingUser.adminId}`
                      : 'Provision manual admin account with system Admin ID and role assignments'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Top Banner: Admin ID Preview */}
              <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    System Assigned Admin ID
                  </div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">
                    {userForm.adminId || nextAdminIdPreview}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <span>Status: </span>
                  <span className="font-semibold text-emerald-400">Unique Validated</span>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">First Name *</label>
                    <input
                      type="text"
                      required
                      value={userForm.firstName}
                      onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={userForm.lastName}
                      onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      disabled={Boolean(editingUser)}
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white disabled:opacity-60 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Mobile / WhatsApp Number</label>
                    <input
                      type="tel"
                      value={userForm.mobileNumber}
                      onChange={(e) => setUserForm({ ...userForm, mobileNumber: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Department</label>
                    <select
                      value={userForm.department}
                      onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Designation</label>
                    <input
                      type="text"
                      value={userForm.designation}
                      onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                      placeholder="e.g. Senior Sales Manager"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Password Section (Only for new user creation) */}
              {!editingUser && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    Initial Security & Credentials
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Temporary Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white pr-20 focus:outline-none focus:border-indigo-500"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(userForm.password);
                              showToast('Password copied to clipboard');
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-400"
                            title="Copy Password"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-end space-y-2">
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userForm.mustChangePassword}
                          onChange={(e) => setUserForm({ ...userForm, mustChangePassword: e.target.checked })}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <span>Enforce password change upon first sign-in</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userForm.isTwoFactorPending}
                          onChange={(e) => setUserForm({ ...userForm, isTwoFactorPending: e.target.checked })}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <span>Enforce mandatory Two-Factor Authentication setup</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Status (for editing) */}
              {editingUser && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Account Status & Lifecycle
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'] as const).map((st) => (
                      <button
                        type="button"
                        key={st}
                        onClick={() => setUserForm({ ...userForm, status: st })}
                        className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                          userForm.status === st
                            ? st === 'ACTIVE'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow'
                              : st === 'SUSPENDED'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow'
                              : 'bg-amber-500/20 border-amber-500 text-amber-300 shadow'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{st}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Role Assignment & Instant Permission Preview */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    Role Assignment & Access Control
                  </span>
                  <span className="text-indigo-400 font-medium">
                    {userForm.roleIds.length} role(s) selected
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1 border border-slate-800/80 rounded-xl bg-slate-950/50">
                  {roles.map((r) => {
                    const isChecked = userForm.roleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                          isChecked
                            ? 'bg-indigo-950/30 border-indigo-500 text-white shadow'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
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
                          className="mt-1 rounded border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-xs text-white">{r.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {r.permissionCount || r.permissions?.length || 0} perms
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{r.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Warning if Super Admin role is checked */}
                {userForm.roleIds.some((id) => roles.find((r) => r.id === id)?.code === 'SUPER_ADMIN') && (
                  <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>
                      <strong>Warning:</strong> You are granting unrestricted <strong>Super Administrator</strong> access to this user. They will have full authority over all system modules, finances, settings, and other admins.
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center space-x-2"
                >
                  {savingUser && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingUser ? 'Save Admin Changes' : 'Create Admin Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: RESET PASSWORD                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reset Admin Password</h3>
                <p className="text-xs text-slate-400">
                  {resettingUser.firstName} {resettingUser.lastName} ({resettingUser.adminId})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white pr-20 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setNewPassword(generateRandomPassword())}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Generate New Random"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(newPassword);
                        showToast('Password copied');
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-400"
                      title="Copy Password"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={forceChangeOnLogin}
                  onChange={(e) => setForceChangeOnLogin(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Force password change on next login</span>
              </label>

              <p className="text-xs text-slate-500 leading-relaxed">
                Note: Resetting this password will immediately revoke all active device sessions for this user.
              </p>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow transition flex items-center space-x-2"
                >
                  {savingPassword && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Confirm Reset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADMIN ACCESS OVERVIEW / PROFILE DEEP-DIVE                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {deepDiveUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow">
                  {(deepDiveUser.firstName?.[0] || 'A').toUpperCase()}
                  {(deepDiveUser.lastName?.[0] || '').toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {deepDiveUser.firstName} {deepDiveUser.lastName}
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                      {deepDiveUser.adminId}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {deepDiveUser.designation} • {deepDiveUser.department} • {deepDiveUser.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDeepDiveUser(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="flex items-center space-x-2 px-6 border-b border-slate-800 bg-slate-950/30 text-xs font-semibold">
              <button
                onClick={() => setDeepDiveTab('OVERVIEW')}
                className={`py-3 px-3 border-b-2 transition ${
                  deepDiveTab === 'OVERVIEW'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Profile & Security
              </button>
              <button
                onClick={() => setDeepDiveTab('PERMISSIONS')}
                className={`py-3 px-3 border-b-2 transition ${
                  deepDiveTab === 'PERMISSIONS'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Effective Permissions ({deepDiveEffectivePerms.length})
              </button>
              <button
                onClick={() => setDeepDiveTab('ACTIVITY')}
                className={`py-3 px-3 border-b-2 transition ${
                  deepDiveTab === 'ACTIVITY'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Audit Stream ({deepDiveUserLogs.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {deepDiveTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* Account Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="text-xs text-slate-400">Account Status</div>
                      <div className="text-sm font-bold text-emerald-400 mt-1">{deepDiveUser.status || 'ACTIVE'}</div>
                    </div>
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="text-xs text-slate-400">Two-Factor Authentication</div>
                      <div className="text-sm font-bold text-white mt-1">
                        {deepDiveUser.twoFactorEnabled ? 'Active (TOTP)' : 'Pending Enrollment'}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="text-xs text-slate-400">Created Date</div>
                      <div className="text-sm font-bold text-white mt-1">
                        {new Date(deepDiveUser.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="text-xs text-slate-400">Last Sign-in IP</div>
                      <div className="text-sm font-bold text-slate-300 mt-1 font-mono">
                        {deepDiveUser.lastLoginIp || 'No logins recorded'}
                      </div>
                    </div>
                  </div>

                  {/* Assigned Roles */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Assigned Roles & Templates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {deepDiveUser.roles && deepDiveUser.roles.length > 0 ? (
                        deepDiveUser.roles.map((r) => (
                          <div
                            key={r.id}
                            className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-sm text-white">{r.name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{r.department} • {r.category}</div>
                            </div>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300">
                              {r.code}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 italic">No custom roles assigned. Uses primary role {deepDiveUser.role}.</div>
                      )}
                    </div>
                  </div>

                  {/* Security Quick Actions */}
                  {isSuperAdmin && (
                    <div className="pt-4 border-t border-slate-800">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        Security Actions for this User
                      </h3>
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          onClick={() => handleOpenResetPassword(deepDiveUser)}
                          className="px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-500/30 hover:bg-amber-500/10 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span>Reset Password</span>
                        </button>
                        <button
                          onClick={() => handleReset2fa(deepDiveUser)}
                          className="px-3.5 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Reset 2FA Enrollment</span>
                        </button>
                        <button
                          onClick={() => handleRevokeSessions(deepDiveUser)}
                          className="px-3.5 py-2 rounded-xl bg-slate-950 border border-rose-500/30 hover:bg-rose-500/10 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          <span>Revoke All Device Sessions</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {deepDiveTab === 'PERMISSIONS' && (
                <div className="space-y-4">
                  {/* Search bar inside deep dive */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={deepDivePermFilter}
                      onChange={(e) => setDeepDivePermFilter(e.target.value)}
                      placeholder="Filter effective permissions..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {deepDiveLoadingPerms ? (
                    <div className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                      Resolving effective permissions matrix...
                    </div>
                  ) : deepDiveEffectivePerms.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No explicit permissions resolved for this user.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto p-1">
                      {deepDiveEffectivePerms
                        .filter(
                          (p) =>
                            !deepDivePermFilter ||
                            p.code.toLowerCase().includes(deepDivePermFilter.toLowerCase()) ||
                            p.description.toLowerCase().includes(deepDivePermFilter.toLowerCase()) ||
                            (p.module && p.module.toLowerCase().includes(deepDivePermFilter.toLowerCase()))
                        )
                        .map((p) => (
                          <div
                            key={p.id || p.code}
                            className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-start space-x-3"
                          >
                            <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-xs font-bold text-indigo-300 truncate">{p.code}</div>
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>
                              <div className="text-[10px] text-slate-500 mt-1">
                                {p.module} {p.submodule ? `• ${p.submodule}` : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {deepDiveTab === 'ACTIVITY' && (
                <div className="space-y-3">
                  {deepDiveLoadingLogs ? (
                    <div className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                      Loading activity history...
                    </div>
                  ) : deepDiveUserLogs.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No recorded audit events for this user yet.
                    </div>
                  ) : (
                    deepDiveUserLogs.map((l) => (
                      <div
                        key={l.id}
                        className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                              {l.action}
                            </span>
                            <span className="text-slate-400">{l.targetType}</span>
                          </div>
                          <p className="text-slate-300 mt-1 text-[11px]">{l.details}</p>
                        </div>
                        <div className="text-[10px] text-slate-500 shrink-0">
                          {new Date(l.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: HIERARCHICAL PERMISSION MATRIX EDITOR FOR ROLES                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl my-6 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {editingRole ? `Configure Role: ${editingRole.name}` : 'Create Custom Role Template'}
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {roleForm.permissionIds.length} Permissions Active
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define granular Level 1 (Module), Level 2 (Submodule), and Level 3 & 4 (CRUD & Advanced Actions)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form & Matrix Editor */}
            <form onSubmit={handleSaveRole} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Role Details Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Role Name *</label>
                    <input
                      type="text"
                      required
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                      placeholder="e.g. Senior Quotations Specialist"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Role Code</label>
                    <input
                      type="text"
                      disabled={Boolean(editingRole?.isSystem)}
                      value={roleForm.code}
                      onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. QUOTATIONS_SPECIALIST"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white disabled:opacity-60 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                    <select
                      value={roleForm.department}
                      onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={roleForm.category}
                      onChange={(e) => setRoleForm({ ...roleForm, category: e.target.value })}
                      placeholder="e.g. Commercial, Custom"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                    <input
                      type="text"
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      placeholder="Detailed responsibilities and access boundaries for this role..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Quick Presets & Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPermissionPreset('FULL')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition"
                    >
                      Full System Access
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPermissionPreset('READ_ONLY')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 transition"
                    >
                      Read Only
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPermissionPreset('READ_CREATE')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition"
                    >
                      Read + Create
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPermissionPreset('READ_CREATE_UPDATE')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition"
                    >
                      Read + Create + Update
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPermissionPreset('CLEAR')}
                      className="px-2.5 py-1 text-xs rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={rolePermSearch}
                      onChange={(e) => setRolePermSearch(e.target.value)}
                      placeholder="Search permissions..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Hierarchical Matrix Display */}
                <div className="space-y-4">
                  {filteredModulesList.map((moduleName) => {
                    const moduleData = allPermissionsData?.grouped?.[moduleName];
                    if (!moduleData) return null;

                    const modulePerms: Permission[] = moduleData.permissions || [];
                    const enabledCount = modulePerms.filter((p) => roleForm.permissionIds.includes(p.id)).length;
                    const isAllModuleSelected = modulePerms.length > 0 && enabledCount === modulePerms.length;

                    return (
                      <div
                        key={moduleName}
                        className="bg-slate-950/70 border border-slate-800/90 rounded-2xl overflow-hidden shadow"
                      >
                        {/* Module Level 1 Header */}
                        <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-sm text-white flex items-center gap-2">
                              {moduleName}
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-mono">
                                {enabledCount} / {modulePerms.length}
                              </span>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleAllModulePermissions(moduleName)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          >
                            {isAllModuleSelected ? 'Deselect Module' : 'Select All Module'}
                          </button>
                        </div>

                        {/* Submodules Level 2 & Actions Level 3/4 */}
                        <div className="p-4 space-y-4">
                          {Object.entries(moduleData.submodules || {}).map(([submoduleName, subPerms]: [string, any]) => {
                            const subAllSelected = subPerms.every((p: Permission) =>
                              roleForm.permissionIds.includes(p.id)
                            );

                            return (
                              <div key={submoduleName} className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/50">
                                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>{submoduleName}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleAllSubmodulePermissions(subPerms)}
                                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                                  >
                                    {subAllSelected ? 'Deselect Submodule' : 'Select All'}
                                  </button>
                                </div>

                                {/* Action Checkboxes Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {subPerms.map((p: Permission) => {
                                    const isChecked = roleForm.permissionIds.includes(p.id);
                                    const action = (p.action || 'CUSTOM').toUpperCase();
                                    const actionColor =
                                      action === 'READ' || action === 'VIEW'
                                        ? 'border-emerald-500/40 text-emerald-300'
                                        : action === 'CREATE'
                                        ? 'border-blue-500/40 text-blue-300'
                                        : action === 'UPDATE' || action === 'EDIT'
                                        ? 'border-amber-500/40 text-amber-300'
                                        : action === 'DELETE'
                                        ? 'border-rose-500/40 text-rose-300'
                                        : 'border-purple-500/40 text-purple-300';

                                    return (
                                      <label
                                        key={p.id}
                                        onClick={() => togglePermission(p.id)}
                                        className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start space-x-2.5 ${
                                          isChecked
                                            ? 'bg-indigo-950/40 border-indigo-500 text-white shadow'
                                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {}} // handled by parent div
                                          className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="font-mono text-[11px] font-bold text-slate-200 truncate">
                                              {p.code}
                                            </span>
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded border uppercase font-bold ${actionColor}`}>
                                              {action}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>
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
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer / Save Bar */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div className="text-xs text-slate-300">
                  Total Permissions Granted:{' '}
                  <strong className="text-white font-bold">{roleForm.permissionIds.length}</strong>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowRoleModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingRole}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center space-x-2"
                  >
                    {savingRole && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{editingRole ? 'Save Role Changes' : 'Create Custom Role'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: AUDIT CHANGES DIFF INSPECTOR                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {inspectingDiffLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Audit Change Diff</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    {inspectingDiffLog.action}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target: {inspectingDiffLog.targetType} ({inspectingDiffLog.targetId || 'N/A'})
                </p>
              </div>
              <button
                onClick={() => setInspectingDiffLog(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1">
              {inspectingDiffLog.previousState && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">Previous State</h4>
                  <pre className="p-3 bg-slate-950 border border-rose-950/40 rounded-xl text-xs text-rose-300 font-mono overflow-x-auto">
                    {JSON.stringify(inspectingDiffLog.previousState, null, 2)}
                  </pre>
                </div>
              )}

              {inspectingDiffLog.newState && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">New State</h4>
                  <pre className="p-3 bg-slate-950 border border-emerald-950/40 rounded-xl text-xs text-emerald-300 font-mono overflow-x-auto">
                    {JSON.stringify(inspectingDiffLog.newState, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectingDiffLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mail Admin Modal */}
      <MailAdminModal
        isOpen={isMailAdminModalOpen}
        onClose={() => setIsMailAdminModalOpen(false)}
      />
    </div>
  );
}
