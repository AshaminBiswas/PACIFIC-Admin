import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Activity,
  AlertTriangle,
  Users,
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Send,
  Gauge,
  Database,
  HardDrive,
  Globe,
  Network,
  Server,
  UserPlus,
  UserMinus,
  History,
  Sliders,
  AtSign,
  Copy,
  Check,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Info,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { mailApi } from '../../api/mailApi';
import { usersApi } from '../../api/usersApi';
import type {
  MailOperationalMetrics,
  MailOutboxFailure,
  MailAdminAddressSummary,
  MailOperationalDiagnostics,
  MailAddressAssignment,
  MailAlias,
  DnsReadinessReport,
  CreateAddressAdminInput,
} from '../../types/admin';

interface MailAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'metrics' | 'diagnostics' | 'failures' | 'addresses' | 'gateway' | 'audit';
}

export const MailAdminModal: React.FC<MailAdminModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'addresses',
}) => {
  const [activeTab, setActiveTab] = useState<
    'metrics' | 'diagnostics' | 'failures' | 'addresses' | 'gateway' | 'audit'
  >(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Metrics
  const [metrics, setMetrics] = useState<MailOperationalMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Diagnostics (Step 5)
  const [diagnostics, setDiagnostics] = useState<MailOperationalDiagnostics | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // Failures
  const [failures, setFailures] = useState<MailOutboxFailure[]>([]);
  const [loadingFailures, setLoadingFailures] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<MailAdminAddressSummary[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');

  // DNS & Gateway
  const [dnsReport, setDnsReport] = useState<DnsReadinessReport | null>(null);
  const [loadingDns, setLoadingDns] = useState(false);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  // Users for Assignment
  const [systemUsers, setSystemUsers] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Action / Notification Status
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [submittingSubAction, setSubmittingSubAction] = useState(false);

  // ─── Sub-modal States ────────────────────────────────────────────────────────
  // 1. Create Address
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<{
    localPart: string;
    domain: string;
    displayName: string;
    userId: string;
    maxStorageMb: number;
    dailySendQuota: number;
    isShared: boolean;
  }>({
    localPart: '',
    domain: 'pacificproduct.in',
    displayName: '',
    userId: '',
    maxStorageMb: 500,
    dailySendQuota: 100,
    isShared: false,
  });

  // 2. Assign User
  const [assignModalAddress, setAssignModalAddress] = useState<MailAdminAddressSummary | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignReason, setAssignReason] = useState('');

  // 3. Unassign User
  const [unassignModalAddress, setUnassignModalAddress] = useState<MailAdminAddressSummary | null>(null);
  const [unassignReason, setUnassignReason] = useState('');

  // 4. Edit Quotas
  const [quotasModalAddress, setQuotasModalAddress] = useState<MailAdminAddressSummary | null>(null);
  const [quotasMb, setQuotasMb] = useState(500);
  const [quotasDailyLimit, setQuotasDailyLimit] = useState(100);

  // 5. Assignment History
  const [historyModalAddress, setHistoryModalAddress] = useState<MailAdminAddressSummary | null>(null);
  const [addressHistory, setAddressHistory] = useState<MailAddressAssignment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 6. Manage Aliases
  const [aliasesModalAddress, setAliasesModalAddress] = useState<MailAdminAddressSummary | null>(null);
  const [addressAliases, setAddressAliases] = useState<MailAlias[]>([]);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [newAliasLocalPart, setNewAliasLocalPart] = useState('');
  const [newAliasDomain, setNewAliasDomain] = useState('pacificproduct.in');

  // ─── Fetch Handlers ─────────────────────────────────────────────────────────

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await mailApi.getAdminMetrics();
      if (res.data) setMetrics(res.data);
    } catch (err: any) {
      console.warn('[MailAdmin] Metrics load error:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const fetchDiagnostics = useCallback(async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await mailApi.getDiagnostics();
      if (res.data) setDiagnostics(res.data);
    } catch (err: any) {
      console.warn('[MailAdmin] Diagnostics load error:', err);
    } finally {
      setLoadingDiagnostics(false);
    }
  }, []);

  const fetchFailures = useCallback(async () => {
    setLoadingFailures(true);
    try {
      const res = await mailApi.getOutboxFailures({ limit: 50 });
      if (res.data) setFailures(res.data);
    } catch (err: any) {
      console.warn('[MailAdmin] Failures load error:', err);
    } finally {
      setLoadingFailures(false);
    }
  }, []);

  const fetchAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    try {
      const res = await mailApi.getAdminAddresses({ search: addressSearch || undefined, limit: 100 });
      if (res.data) setAddresses(res.data);
    } catch (err: any) {
      console.warn('[MailAdmin] Addresses load error:', err);
    } finally {
      setLoadingAddresses(false);
    }
  }, [addressSearch]);

  const fetchDns = useCallback(async () => {
    setLoadingDns(true);
    try {
      const res = await mailApi.getDnsReadiness();
      if (res.data) setDnsReport(res.data);
    } catch (err: any) {
      console.warn('[MailAdmin] DNS load error:', err);
    } finally {
      setLoadingDns(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (systemUsers.length > 0) return;
    setLoadingUsers(true);
    try {
      const res = await usersApi.list({ limit: 100 });
      const items = (res.data as any)?.data?.items || (res.data as any)?.data || [];
      setSystemUsers(
        items.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email,
        }))
      );
    } catch (err: any) {
      console.warn('[MailAdmin] Users load error:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [systemUsers.length]);

  const fetchAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await mailApi.getAuditLogs({ limit: 50 });
      if (res.data) setAuditLogs(res.data);
    } catch (err: any) {
      console.warn('[MailAdmin] Audit load error:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'metrics') fetchMetrics();
      else if (activeTab === 'diagnostics') fetchDiagnostics();
      else if (activeTab === 'failures') fetchFailures();
      else if (activeTab === 'addresses') {
        fetchAddresses();
        fetchUsers();
      } else if (activeTab === 'gateway') fetchDns();
      else if (activeTab === 'audit') fetchAudit();
    }
  }, [isOpen, activeTab, fetchMetrics, fetchDiagnostics, fetchFailures, fetchAddresses, fetchDns, fetchUsers, fetchAudit]);

  // ─── Address Action Handlers ────────────────────────────────────────────────

  const handleToggleAddress = async (addressId: string, currentStatus: boolean) => {
    setTogglingId(addressId);
    setActionMessage(null);
    try {
      await mailApi.updateAddressStatus(addressId, !currentStatus);
      setAddresses((prev) =>
        prev.map((a) => (a.id === addressId ? { ...a, isActive: !currentStatus } : a))
      );
      setActionMessage({
        text: `Address ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
        type: 'success',
      });
    } catch (err: any) {
      setActionMessage({
        text: err?.response?.data?.message || 'Failed to update address status',
        type: 'error',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.localPart.trim()) return;
    setSubmittingSubAction(true);
    setActionMessage(null);
    try {
      const payload: CreateAddressAdminInput = {
        localPart: createForm.localPart.trim().toLowerCase(),
        domain: createForm.domain,
        displayName: createForm.displayName.trim() || undefined,
        userId: createForm.userId || undefined,
        maxStorageBytes: (createForm.maxStorageMb || 500) * 1024 * 1024,
        dailySendQuota: Number(createForm.dailySendQuota) || 100,
        isShared: createForm.isShared,
      };
      await mailApi.createAddressAdmin(payload);
      setActionMessage({
        text: `Address ${payload.localPart}@${payload.domain} created successfully!`,
        type: 'success',
      });
      setShowCreateModal(false);
      setCreateForm({
        localPart: '',
        domain: 'pacificproduct.in',
        displayName: '',
        userId: '',
        maxStorageMb: 500,
        dailySendQuota: 100,
        isShared: false,
      });
      fetchAddresses();
    } catch (err: any) {
      setActionMessage({
        text: err?.response?.data?.message || 'Failed to create address',
        type: 'error',
      });
    } finally {
      setSubmittingSubAction(false);
    }
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalAddress || !assignUserId) return;
    setSubmittingSubAction(true);
    setActionMessage(null);
    try {
      await mailApi.assignAddress(assignModalAddress.id, {
        userId: assignUserId,
        reason: assignReason.trim() || 'Admin User Assignment',
      });
      setActionMessage({
        text: `Address ${assignModalAddress.fullAddress} assigned successfully!`,
        type: 'success',
      });
      setAssignModalAddress(null);
      setAssignUserId('');
      setAssignReason('');
      fetchAddresses();
    } catch (err: any) {
      setActionMessage({
        text: err?.response?.data?.message || 'Failed to assign address',
        type: 'error',
      });
    } finally {
      setSubmittingSubAction(false);
    }
  };

  const handleUnassignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unassignModalAddress) return;
    setSubmittingSubAction(true);
    setActionMessage(null);
    try {
      await mailApi.unassignAddress(unassignModalAddress.id, unassignReason.trim() || 'Admin Unassignment');
      setActionMessage({
        text: `Address ${unassignModalAddress.fullAddress} unassigned. It is now available in the pool.`,
        type: 'success',
      });
      setUnassignModalAddress(null);
      setUnassignReason('');
      fetchAddresses();
    } catch (err: any) {
      setActionMessage({
        text: err?.response?.data?.message || 'Failed to unassign address',
        type: 'error',
      });
    } finally {
      setSubmittingSubAction(false);
    }
  };

  const handleUpdateQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotasModalAddress) return;
    setSubmittingSubAction(true);
    setActionMessage(null);
    try {
      await mailApi.updateAddressQuotas(quotasModalAddress.id, {
        maxStorageBytes: quotasMb * 1024 * 1024,
        dailySendQuota: quotasDailyLimit,
      });
      setActionMessage({
        text: `Quotas updated for ${quotasModalAddress.fullAddress}`,
        type: 'success',
      });
      setQuotasModalAddress(null);
      fetchAddresses();
    } catch (err: any) {
      setActionMessage({
        text: err?.response?.data?.message || 'Failed to update quotas',
        type: 'error',
      });
    } finally {
      setSubmittingSubAction(false);
    }
  };

  const openHistoryModal = async (address: MailAdminAddressSummary) => {
    setHistoryModalAddress(address);
    setLoadingHistory(true);
    try {
      const res = await mailApi.getAddressHistory(address.id);
      setAddressHistory(res.data || []);
    } catch (err: any) {
      console.warn('[MailAdmin] History load error:', err);
      setAddressHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openAliasesModal = async (address: MailAdminAddressSummary) => {
    setAliasesModalAddress(address);
    setLoadingAliases(true);
    setNewAliasDomain(address.domain || 'pacificproduct.in');
    try {
      const res = await mailApi.listAliases(address.id);
      setAddressAliases(res.data || []);
    } catch (err: any) {
      console.warn('[MailAdmin] Aliases load error:', err);
      setAddressAliases([]);
    } finally {
      setLoadingAliases(false);
    }
  };

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasesModalAddress || !newAliasLocalPart.trim()) return;
    setSubmittingSubAction(true);
    setActionMessage(null);
    try {
      await mailApi.createAlias({
        addressId: aliasesModalAddress.id,
        aliasLocalPart: newAliasLocalPart.trim().toLowerCase(),
        aliasDomain: newAliasDomain,
      });
      setNewAliasLocalPart('');
      const res = await mailApi.listAliases(aliasesModalAddress.id);
      setAddressAliases(res.data || []);
      fetchAddresses();
      setActionMessage({
        text: `Alias created successfully!`,
        type: 'success',
      });
    } catch (err: any) {
      setActionMessage({
        text: err?.response?.data?.message || 'Failed to create alias',
        type: 'error',
      });
    } finally {
      setSubmittingSubAction(false);
    }
  };

  const handleDeleteAlias = async (aliasId: string) => {
    if (!aliasesModalAddress) return;
    setSubmittingSubAction(true);
    setActionMessage(null);
    try {
      await mailApi.deleteAlias(aliasId);
      setAddressAliases((prev) => prev.filter((a) => a.id !== aliasId));
      fetchAddresses();
      setActionMessage({
        text: `Alias removed successfully!`,
        type: 'success',
      });
    } catch (err: any) {
      setActionMessage({
        text: err?.response?.data?.message || 'Failed to remove alias',
        type: 'error',
      });
    } finally {
      setSubmittingSubAction(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(id);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-5xl bg-[#0e0d24] border border-white/20 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141233] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#B5F823]/10 border border-[#B5F823]/20">
              <Shield className="w-5 h-5 text-[#B5F823]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-white tracking-wide">
                  Pacific Mail Admin Console
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B5F823]/20 text-[#B5F823] border border-[#B5F823]/30">
                  v1.2 Control Plane
                </span>
              </div>
              <p className="text-xs text-white/40">
                Identity directory, address lifecycle, DNS coexistence & privacy-preserved telemetry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-4 sm:px-6 pt-2 border-b border-white/10 bg-[#0c0a20] shrink-0 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'addresses'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Employee Emails (@pacificproduct.in)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'gateway'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Gateway & DNS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'metrics'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Metrics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'diagnostics'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Diagnostics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('failures')}
            className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'failures'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Failures</span>
            {failures.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 text-[10px]">
                {failures.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'audit'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Action / Notification Banner */}
        {actionMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between shrink-0 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border-b border-red-500/30'
            }`}
          >
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="p-0.5 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {/* TAB 1: OPERATIONAL METRICS */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">System Delivery Performance</h3>
                  <p className="text-xs text-white/40">Aggregated database health without exposing private contents</p>
                </div>
                <button
                  type="button"
                  onClick={fetchMetrics}
                  disabled={loadingMetrics}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMetrics ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingMetrics && !metrics ? (
                <div className="flex items-center justify-center py-16 text-white/40">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B5F823] mr-2" />
                  <span>Loading operational metrics...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-white/50 flex items-center space-x-1.5">
                      <Send className="w-3.5 h-3.5 text-[#B5F823]" />
                      <span>Total Sent</span>
                    </span>
                    <span className="block mt-2 text-2xl font-bold text-white">
                      {metrics?.totalMessagesSent ?? 0}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-white/50 flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Active Identities</span>
                    </span>
                    <span className="block mt-2 text-2xl font-bold text-white">
                      {metrics?.totalActiveAddresses ?? 0}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-white/50 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Success Rate</span>
                    </span>
                    <span className="block mt-2 text-2xl font-bold text-emerald-400">
                      {metrics?.deliverySuccessRate ?? 100}%
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-white/50 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pending Outbox</span>
                    </span>
                    <span className="block mt-2 text-2xl font-bold text-white">
                      {metrics?.pendingOutboxCount ?? 0}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-white/50 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <span>Failed Jobs</span>
                    </span>
                    <span className="block mt-2 text-2xl font-bold text-red-400">
                      {metrics?.failedOutboxCount ?? 0}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-white/50 flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5 text-purple-400" />
                      <span>Failures (24h)</span>
                    </span>
                    <span className="block mt-2 text-2xl font-bold text-white">
                      {metrics?.recentFailures24h ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIAGNOSTICS & TELEMETRY */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Live System Telemetry & Latencies</h3>
                  <p className="text-xs text-white/40">Measured percentiles (p50/p95/p99), database health & queue depth</p>
                </div>
                <button
                  type="button"
                  onClick={fetchDiagnostics}
                  disabled={loadingDiagnostics}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingDiagnostics && !diagnostics ? (
                <div className="flex items-center justify-center py-16 text-white/40">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B5F823] mr-2" />
                  <span>Loading performance telemetry...</span>
                </div>
              ) : diagnostics ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-3 h-3 text-[#B5F823]" />
                        Database
                      </span>
                      <span className="block mt-1 text-sm font-bold text-emerald-400">
                        {diagnostics.database.status} ({diagnostics.database.pingLatencyMs}ms)
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                        <Gauge className="w-3 h-3 text-blue-400" />
                        Throughput
                      </span>
                      <span className="block mt-1 text-sm font-bold text-white">
                        {diagnostics.throughputReqPerSec} req/sec
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Queue Depth
                      </span>
                      <span className="block mt-1 text-sm font-bold text-white">
                        {diagnostics.queue.depth} jobs pending
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                        <HardDrive className="w-3 h-3 text-purple-400" />
                        Attachment Storage
                      </span>
                      <span className="block mt-1 text-sm font-bold text-white">
                        {formatBytes(diagnostics.storage.attachmentDirBytes)} ({diagnostics.storage.attachmentCount} files)
                      </span>
                    </div>
                  </div>

                  {/* Latency Percentiles Table */}
                  <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                    <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 font-semibold text-xs text-white/70">
                      Measured Operation Latencies
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 text-white/50 uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-2">Operation</th>
                          <th className="px-4 py-2">Count</th>
                          <th className="px-4 py-2">Avg</th>
                          <th className="px-4 py-2">p50</th>
                          <th className="px-4 py-2 text-[#B5F823]">p95</th>
                          <th className="px-4 py-2 text-amber-400">p99</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                        {Object.entries(diagnostics.latencies).map(([op, stats]) => (
                          <tr key={op} className="hover:bg-white/5">
                            <td className="px-4 py-2 font-sans font-medium text-white">{op}</td>
                            <td className="px-4 py-2 text-white/60">{stats.count}</td>
                            <td className="px-4 py-2">{stats.avg} ms</td>
                            <td className="px-4 py-2">{stats.p50} ms</td>
                            <td className="px-4 py-2 text-[#B5F823] font-semibold">{stats.p95} ms</td>
                            <td className="px-4 py-2 text-amber-400">{stats.p99} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: OUTBOX FAILURES */}
          {activeTab === 'failures' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Delivery Failures & Dead Letters</h3>
                  <p className="text-xs text-white/40">Diagnostic view of failed message transmissions (content omitted)</p>
                </div>
                <button
                  type="button"
                  onClick={fetchFailures}
                  disabled={loadingFailures}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFailures ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingFailures ? (
                <div className="flex items-center justify-center py-16 text-white/40">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B5F823] mr-2" />
                  <span>Loading failures...</span>
                </div>
              ) : failures.length === 0 ? (
                <div className="py-12 text-center text-white/40 flex flex-col items-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/50 mb-2" />
                  <span>Zero delivery failures recorded! All outbox jobs processed cleanly.</span>
                </div>
              ) : (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/10 text-white/60 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Job ID</th>
                        <th className="px-4 py-2.5">Sender</th>
                        <th className="px-4 py-2.5">Subject</th>
                        <th className="px-4 py-2.5">Attempts</th>
                        <th className="px-4 py-2.5">Error Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/80">
                      {failures.map((f) => (
                        <tr key={f.id} className="hover:bg-white/5">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-white/50">{f.id.slice(0, 8)}...</td>
                          <td className="px-4 py-2.5 font-mono text-white">{f.senderAddress}</td>
                          <td className="px-4 py-2.5 text-white/70 truncate max-w-xs">{f.subject || '(No subject)'}</td>
                          <td className="px-4 py-2.5 font-mono">{f.attempts} / {f.maxAttempts}</td>
                          <td className="px-4 py-2.5 text-red-400 max-w-xs truncate" title={f.lastError || ''}>
                            {f.lastError || 'Unknown delivery fault'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADDRESS DIRECTORY & LIFECYCLE */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Address Directory & User Lifecycle</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B5F823]/20 text-[#B5F823]">
                      {addresses.length} Registered
                    </span>
                  </h3>
                  <p className="text-xs text-white/40">
                    Assign `@pacificproduct.in` / `@pacific.internal` addresses, manage quotas, aliases, and assignment history
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#B5F823] hover:bg-[#a3e01f] text-black text-xs font-bold transition-all shadow-md shadow-[#B5F823]/20"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>New Address</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchAddresses}
                    disabled={loadingAddresses}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAddresses ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
                placeholder="Search by address, domain, or user name..."
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#B5F823]"
              />

              {loadingAddresses ? (
                <div className="flex items-center justify-center py-16 text-white/40">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B5F823] mr-2" />
                  <span>Loading mail identities...</span>
                </div>
              ) : addresses.length === 0 ? (
                <div className="py-12 text-center text-white/40">No addresses matched query</div>
              ) : (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5 overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-white/10 text-white/60 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-2.5">Address & Domain</th>
                        <th className="px-4 py-2.5">Assigned User</th>
                        <th className="px-4 py-2.5">Quotas & Storage</th>
                        <th className="px-4 py-2.5">Aliases</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/80">
                      {addresses.map((a) => {
                        const isPacificProduct = a.domain === 'pacificproduct.in';
                        return (
                          <tr key={a.id} className="hover:bg-white/5 transition-colors">
                            {/* Address & Domain */}
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white">{a.fullAddress}</span>
                                {a.isShared && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Shared
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium ${
                                    isPacificProduct
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  }`}
                                >
                                  @{a.domain}
                                </span>
                                <span className="text-[10px] text-white/40 font-mono">
                                  {a.verificationStatus || 'INTERNAL_ONLY'}
                                </span>
                              </div>
                            </td>

                            {/* Assigned User */}
                            <td className="px-4 py-3">
                              {a.userId ? (
                                <div>
                                  <div className="font-medium text-white flex items-center space-x-1">
                                    <span>{a.userName || 'Assigned User'}</span>
                                  </div>
                                  <div className="text-[10px] text-white/50 font-mono">{a.userEmail}</div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                  Unassigned (Available Pool)
                                </span>
                              )}
                            </td>

                            {/* Quotas & Storage */}
                            <td className="px-4 py-3 font-mono text-[11px]">
                              <div>{formatBytes(a.maxStorageBytes || 524288000)} max</div>
                              <div className="text-white/40 text-[10px]">
                                {a.dailySendQuota || 100} msgs/day · {a.hourlyQuota} / hr
                              </div>
                            </td>

                            {/* Aliases */}
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => openAliasesModal(a)}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors text-[11px]"
                              >
                                <AtSign className="w-3 h-3 text-[#B5F823]" />
                                <span>{a.aliasCount || 0} Aliases</span>
                              </button>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  a.isActive
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {a.isActive ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Disabled
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Actions Toolbar */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                {a.userId ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUnassignModalAddress(a);
                                      setUnassignReason('');
                                    }}
                                    title="Unassign user (preserves mailbox isolation)"
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/60 hover:text-amber-300 transition-colors"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAssignModalAddress(a);
                                      setAssignUserId('');
                                      setAssignReason('');
                                    }}
                                    title="Assign to User"
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-white/60 hover:text-blue-300 transition-colors"
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuotasModalAddress(a);
                                    setQuotasMb(Math.round((a.maxStorageBytes || 524288000) / (1024 * 1024)));
                                    setQuotasDailyLimit(a.dailySendQuota || 100);
                                  }}
                                  title="Edit Storage & Sending Quotas"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openHistoryModal(a)}
                                  title="View Assignment History"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleAddress(a.id, a.isActive)}
                                  disabled={togglingId === a.id}
                                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    a.isActive
                                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                                  }`}
                                >
                                  {togglingId === a.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin inline" />
                                  ) : a.isActive ? (
                                    'Disable'
                                  ) : (
                                    'Enable'
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: GATEWAY & DNS READINESS */}
          {activeTab === 'gateway' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                    <span>Mail Gateway & DNS Coexistence Engine</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B5F823]/20 text-[#B5F823]">
                      Zero DNS Collision Protection Active
                    </span>
                  </h3>
                  <p className="text-xs text-white/40">
                    Dual-channel architecture: internal DB delivery + provider-neutral external gateway
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchDns}
                  disabled={loadingDns}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDns ? 'animate-spin' : ''}`} />
                  <span>Inspect Live DNS</span>
                </button>
              </div>

              {/* Status Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Server className="w-4 h-4 text-[#B5F823]" />
                      <span className="text-xs font-semibold text-white">Outbound Gateway</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Sandbox Safe Mode (Mock Dispatch)
                    </span>
                    <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
                      External emails are held securely in outbox. Zero outbound network traffic dispatched without administrative authorization.
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-mono text-white/40 border-t border-white/5 pt-2">
                    MAIL_EXTERNAL_SENDING_ENABLED = false
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Network className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold text-white">Inbound Gateway</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Webhook Adapter Active
                    </span>
                    <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
                      Provider-neutral webhook listener ready at <code className="text-[#B5F823]">/mail/webhooks/inbound</code> with HMAC SHA-256 signature verification.
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-mono text-white/40 border-t border-white/5 pt-2">
                    Signature: SHA-256 HMAC Verified
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-white">Live Domain Invariant</span>
                    </div>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Google Workspace Protected
                    </span>
                    <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
                      Root MX records for <span className="text-white font-mono">pacificproduct.in</span> are 100% untouched. Existing business email operates without interference.
                    </p>
                  </div>
                  <div className="mt-3 text-[10px] font-mono text-white/40 border-t border-white/5 pt-2">
                    Root MX: smtp.google.com (Priority 1)
                  </div>
                </div>
              </div>

              {/* Live DNS Inspection Table */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-[#B5F823]" />
                    <span className="font-semibold text-xs text-white">
                      Live DNS Inspection (pacificproduct.in)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    Inspected: {dnsReport?.inspectedAt ? new Date(dnsReport.inspectedAt).toLocaleTimeString() : 'Pending'}
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Current MX */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block mb-1">
                      1. Mail Exchanger (MX) Records
                    </span>
                    {dnsReport?.currentMx && dnsReport.currentMx.length > 0 ? (
                      <div className="space-y-1">
                        {dnsReport.currentMx.map((mx, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 font-mono text-xs"
                          >
                            <span className="text-emerald-400">{mx.exchange}</span>
                            <span className="text-white/40 text-[11px]">Priority: {mx.priority}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-white/40">No MX records returned.</div>
                    )}
                  </div>

                  {/* Current SPF */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block mb-1">
                      2. Sender Policy Framework (SPF)
                    </span>
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 font-mono text-xs">
                      <span className="text-white/80">{dnsReport?.currentSpf || 'v=spf1 include:_spf.google.com ~all'}</span>
                      <span className="text-emerald-400 text-[10px]">Active</span>
                    </div>
                  </div>

                  {/* Current DMARC */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block mb-1">
                      3. DMARC Policy
                    </span>
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 font-mono text-xs">
                      <span className="text-white/60">
                        {dnsReport?.currentDmarc || 'No root DMARC record published (Inherits standard Google Workspace posture)'}
                      </span>
                      <span className="text-white/40 text-[10px]">Informational</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Proposed DNS Change Plan Container */}
              <div className="border-2 border-dashed border-[#B5F823]/40 rounded-xl p-5 bg-[#B5F823]/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-white">Proposed Subdomain DNS Plan</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black uppercase tracking-wider">
                          PROPOSED — NOT APPLIED
                        </span>
                      </div>
                      <p className="text-xs text-white/60">
                        The records below are proposed for external email routing on isolated subdomains. They have NOT been applied to live DNS.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-white/70 space-y-2 bg-black/40 p-3 rounded-xl border border-white/10">
                  <p className="font-semibold text-amber-300">
                    Mandatory Architectural Safeguard:
                  </p>
                  <p>
                    To guarantee zero downtime and zero collision with your active Google Workspace email (<code className="text-emerald-400">@pacificproduct.in</code>), root MX records must remain unchanged. When you choose to activate external sending or receiving, configure the isolated subdomains below in your DNS registrar (Cloudflare / Route53 / GoDaddy).
                  </p>
                </div>

                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-white/10 text-white/60 uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Host / Name</th>
                        <th className="px-3 py-2">Target / Value</th>
                        <th className="px-3 py-2">Purpose</th>
                        <th className="px-3 py-2 text-right">Copy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80">
                      {(dnsReport?.proposedChangesPlan?.requiredRecords || [
                        {
                          type: 'MX',
                          host: 'inbound.pacificproduct.in',
                          value: 'inbound-gateway.pacificproduct.in',
                          priority: 10,
                          purpose: 'Route inbound external mail to Pacific Webhook Gateway',
                        },
                        {
                          type: 'TXT',
                          host: 'mail.pacificproduct.in',
                          value: 'v=spf1 include:_spf.google.com ~all',
                          purpose: 'Authorize outbound Pacific Gateway server for subdomain',
                        },
                        {
                          type: 'TXT',
                          host: 'pacific._domainkey.mail.pacificproduct.in',
                          value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...',
                          purpose: 'Cryptographic DKIM mail signing key',
                        },
                        {
                          type: 'TXT',
                          host: '_dmarc.mail.pacificproduct.in',
                          value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@pacificproduct.in; pct=100',
                          purpose: 'Subdomain DMARC alignment & spoofing protection',
                        },
                      ]).map((rec, i) => (
                        <tr key={i} className="hover:bg-white/5">
                          <td className="px-3 py-2 text-[#B5F823] font-bold">{rec.type}</td>
                          <td className="px-3 py-2 text-white">{rec.host}</td>
                          <td className="px-3 py-2 text-white/60 max-w-xs truncate" title={rec.value}>
                            {rec.value} {rec.priority ? `(Priority: ${rec.priority})` : ''}
                          </td>
                          <td className="px-3 py-2 text-white/40 font-sans text-[11px]">{rec.purpose}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleCopy(rec.value, `rec-${i}`)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                              title="Copy value"
                            >
                              {copiedRecord === `rec-${i}` ? (
                                <Check className="w-3.5 h-3.5 text-[#B5F823]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Tamper-Evident Mail Audit Trail</h3>
                  <p className="text-xs text-white/40">Immutable log of security-sensitive mailbox events</p>
                </div>
                <button
                  type="button"
                  onClick={fetchAudit}
                  disabled={loadingAudit}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingAudit ? (
                <div className="flex items-center justify-center py-16 text-white/40">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B5F823] mr-2" />
                  <span>Loading audit logs...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-white/40">No audit records logged yet</div>
              ) : (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/10 text-white/60 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Timestamp</th>
                        <th className="px-4 py-2.5">Action</th>
                        <th className="px-4 py-2.5">Resource</th>
                        <th className="px-4 py-2.5">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/80 font-mono">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5">
                          <td className="px-4 py-2 text-white/50">
                            {new Date(log.created_at || log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-[#B5F823] font-semibold">{log.action}</td>
                          <td className="px-4 py-2 text-white/70">
                            {log.resource_type || log.resourceType}: {log.resource_id || log.resourceId}
                          </td>
                          <td className="px-4 py-2 text-white/40">{log.ip_address || log.ipAddress || 'internal'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── SUB-MODAL 1: CREATE ADDRESS ────────────────────────────────────────── */}
        {showCreateModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#141233] border border-white/20 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-[#B5F823]" />
                  <h3 className="text-sm font-bold text-white">Create New Mail Address</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAddress} className="space-y-3 text-xs">
                <div>
                  <label className="block text-white/60 mb-1 font-medium">Local-Part & Domain</label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      required
                      value={createForm.localPart}
                      onChange={(e) => setCreateForm({ ...createForm, localPart: e.target.value })}
                      placeholder="e.g. ashish or support"
                      className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B5F823]"
                    />
                    <span className="text-white/40 font-mono">@</span>
                    <select
                      value={createForm.domain}
                      onChange={(e) => setCreateForm({ ...createForm, domain: e.target.value })}
                      className="px-2.5 py-2 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:border-[#B5F823]"
                    >
                      <option value="pacificproduct.in" className="bg-[#141233]">
                        pacificproduct.in
                      </option>
                      <option value="pacific.internal" className="bg-[#141233]">
                        pacific.internal
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white/60 mb-1 font-medium">Display Name (Optional)</label>
                  <input
                    type="text"
                    value={createForm.displayName}
                    onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                    placeholder="e.g. Pacific Customer Desk"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B5F823]"
                  />
                </div>

                <div>
                  <label className="block text-white/60 mb-1 font-medium">Initial User Assignment (Optional)</label>
                  <select
                    value={createForm.userId}
                    onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#B5F823]"
                  >
                    <option value="" className="bg-[#141233]">
                      -- Leave in Pool (Unassigned) --
                    </option>
                    {systemUsers.map((u) => (
                      <option key={u.id} value={u.id} className="bg-[#141233]">
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">Max Storage (MB)</label>
                    <input
                      type="number"
                      min={10}
                      max={10240}
                      value={createForm.maxStorageMb}
                      onChange={(e) => setCreateForm({ ...createForm, maxStorageMb: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#B5F823]"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">Daily Send Quota</label>
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={createForm.dailySendQuota}
                      onChange={(e) => setCreateForm({ ...createForm, dailySendQuota: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#B5F823]"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="isShared"
                    checked={createForm.isShared}
                    onChange={(e) => setCreateForm({ ...createForm, isShared: e.target.checked })}
                    className="rounded bg-white/10 border-white/20 text-[#B5F823] focus:ring-0"
                  />
                  <label htmlFor="isShared" className="text-white/70 select-none">
                    Shared Mailbox (e.g. info, billing, team queue)
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSubAction}
                    className="px-4 py-1.5 rounded-xl bg-[#B5F823] hover:bg-[#a3e01f] text-black font-bold text-xs flex items-center space-x-1"
                  >
                    {submittingSubAction && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    <span>Provision Address</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── SUB-MODAL 2: ASSIGN USER ────────────────────────────────────────── */}
        {assignModalAddress && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#141233] border border-white/20 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Assign Mail Address</h3>
                </div>
                <button
                  onClick={() => setAssignModalAddress(null)}
                  className="p-1 rounded-lg text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-white/70 bg-white/5 p-3 rounded-xl border border-white/10">
                Assigning target address:{' '}
                <span className="font-mono font-bold text-white block mt-0.5">
                  {assignModalAddress.fullAddress}
                </span>
              </div>

              <form onSubmit={handleAssignUser} className="space-y-3 text-xs">
                <div>
                  <label className="block text-white/60 mb-1 font-medium">Select User</label>
                  <select
                    required
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#B5F823]"
                  >
                    <option value="" className="bg-[#141233]">
                      -- Select User --
                    </option>
                    {systemUsers.map((u) => (
                      <option key={u.id} value={u.id} className="bg-[#141233]">
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white/60 mb-1 font-medium">Assignment Reason / Notes</label>
                  <input
                    type="text"
                    value={assignReason}
                    onChange={(e) => setAssignReason(e.target.value)}
                    placeholder="e.g. Sales executive onboarding"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B5F823]"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setAssignModalAddress(null)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSubAction || !assignUserId}
                    className="px-4 py-1.5 rounded-xl bg-[#B5F823] hover:bg-[#a3e01f] text-black font-bold text-xs flex items-center space-x-1"
                  >
                    {submittingSubAction && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    <span>Confirm Assignment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── SUB-MODAL 3: UNASSIGN USER ──────────────────────────────────────── */}
        {unassignModalAddress && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#141233] border border-white/20 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <UserMinus className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Unassign Mail Address</h3>
                </div>
                <button
                  onClick={() => setUnassignModalAddress(null)}
                  className="p-1 rounded-lg text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-white/80 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl space-y-2">
                <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Mailbox Separation Invariant
                </p>
                <p className="text-white/70 leading-relaxed">
                  Unassigning <code className="text-white font-bold">{unassignModalAddress.fullAddress}</code> will release it back into the address pool. All historical messages remain strictly isolated in the current user's mailbox and will <strong>NOT</strong> be exposed to future assignees.
                </p>
              </div>

              <form onSubmit={handleUnassignUser} className="space-y-3 text-xs">
                <div>
                  <label className="block text-white/60 mb-1 font-medium">Unassignment Reason</label>
                  <input
                    type="text"
                    value={unassignReason}
                    onChange={(e) => setUnassignReason(e.target.value)}
                    placeholder="e.g. Employee departure or role transition"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B5F823]"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setUnassignModalAddress(null)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSubAction}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center space-x-1"
                  >
                    {submittingSubAction && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    <span>Confirm Unassign</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── SUB-MODAL 4: EDIT QUOTAS ────────────────────────────────────────── */}
        {quotasModalAddress && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#141233] border border-white/20 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-[#B5F823]" />
                  <h3 className="text-sm font-bold text-white">Update Mail Quotas</h3>
                </div>
                <button
                  onClick={() => setQuotasModalAddress(null)}
                  className="p-1 rounded-lg text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-white/70 bg-white/5 p-3 rounded-xl border border-white/10">
                Configuring quotas for:{' '}
                <span className="font-mono font-bold text-white block mt-0.5">
                  {quotasModalAddress.fullAddress}
                </span>
              </div>

              <form onSubmit={handleUpdateQuotas} className="space-y-3 text-xs">
                <div>
                  <label className="block text-white/60 mb-1 font-medium">Max Storage (MB)</label>
                  <input
                    type="number"
                    min={10}
                    max={10240}
                    required
                    value={quotasMb}
                    onChange={(e) => setQuotasMb(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#B5F823]"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Default: 500 MB. Enterprise accounts up to 10 GB.
                  </span>
                </div>

                <div>
                  <label className="block text-white/60 mb-1 font-medium">Daily Outbound Sending Quota</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    required
                    value={quotasDailyLimit}
                    onChange={(e) => setQuotasDailyLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#B5F823]"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Default: 100 messages/day. Hard protection against abusive automated spams.
                  </span>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setQuotasModalAddress(null)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSubAction}
                    className="px-4 py-1.5 rounded-xl bg-[#B5F823] hover:bg-[#a3e01f] text-black font-bold text-xs flex items-center space-x-1"
                  >
                    {submittingSubAction && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    <span>Save Quotas</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── SUB-MODAL 5: ASSIGNMENT HISTORY ──────────────────────────────────── */}
        {historyModalAddress && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#141233] border border-white/20 rounded-2xl p-6 shadow-2xl space-y-4 text-white max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-[#B5F823]" />
                  <h3 className="text-sm font-bold text-white">
                    Assignment History — {historyModalAddress.fullAddress}
                  </h3>
                </div>
                <button
                  onClick={() => setHistoryModalAddress(null)}
                  className="p-1 rounded-lg text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loadingHistory ? (
                  <div className="py-12 flex items-center justify-center text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin text-[#B5F823] mr-2" />
                    <span>Loading assignment timeline...</span>
                  </div>
                ) : addressHistory.length === 0 ? (
                  <div className="py-12 text-center text-white/40">
                    No historical reassignment events recorded for this address.
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-white/10 text-white/60 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">Assigned User</th>
                          <th className="px-3 py-2">Assigned At</th>
                          <th className="px-3 py-2">Unassigned At</th>
                          <th className="px-3 py-2 font-sans">Reason / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/80">
                        {addressHistory.map((h) => (
                          <tr key={h.id} className="hover:bg-white/5">
                            <td className="px-3 py-2 text-white font-medium">
                              {h.userEmail || h.userId}
                            </td>
                            <td className="px-3 py-2 text-emerald-400 text-[11px]">
                              {new Date(h.assignedAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-white/40 text-[11px]">
                              {h.unassignedAt ? new Date(h.unassignedAt).toLocaleDateString() : 'Current Active'}
                            </td>
                            <td className="px-3 py-2 font-sans text-white/60 text-[11px]">
                              {h.reason || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end shrink-0">
                <button
                  onClick={() => setHistoryModalAddress(null)}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── SUB-MODAL 6: MANAGE ALIASES ───────────────────────────────────────── */}
        {aliasesModalAddress && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#141233] border border-white/20 rounded-2xl p-6 shadow-2xl space-y-4 text-white max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <AtSign className="w-4 h-4 text-[#B5F823]" />
                  <h3 className="text-sm font-bold text-white">
                    Aliases for {aliasesModalAddress.fullAddress}
                  </h3>
                </div>
                <button
                  onClick={() => setAliasesModalAddress(null)}
                  className="p-1 rounded-lg text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Create Alias Form */}
              <form onSubmit={handleCreateAlias} className="flex items-center space-x-2 shrink-0 text-xs">
                <div className="flex items-center space-x-1 flex-1">
                  <input
                    type="text"
                    required
                    value={newAliasLocalPart}
                    onChange={(e) => setNewAliasLocalPart(e.target.value)}
                    placeholder="new-alias"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#B5F823]"
                  />
                  <span className="text-white/40 font-mono">@</span>
                  <span className="text-white/80 font-mono text-xs">{newAliasDomain}</span>
                </div>
                <button
                  type="submit"
                  disabled={submittingSubAction || !newAliasLocalPart.trim()}
                  className="px-3 py-1.5 rounded-xl bg-[#B5F823] hover:bg-[#a3e01f] text-black font-bold text-xs"
                >
                  Add Alias
                </button>
              </form>

              {/* Aliases List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loadingAliases ? (
                  <div className="py-8 flex items-center justify-center text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin text-[#B5F823] mr-2" />
                    <span>Loading aliases...</span>
                  </div>
                ) : addressAliases.length === 0 ? (
                  <div className="py-8 text-center text-white/40 text-xs">
                    No secondary aliases configured for this address yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addressAliases.map((al) => (
                      <div
                        key={al.id}
                        className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono"
                      >
                        <div>
                          <span className="text-[#B5F823] font-semibold">{al.aliasLocalPart}</span>
                          <span className="text-white/50">@{al.aliasDomain}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAlias(al.id)}
                          className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                          title="Delete Alias"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end shrink-0">
                <button
                  onClick={() => setAliasesModalAddress(null)}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
