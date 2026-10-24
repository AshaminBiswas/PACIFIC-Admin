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
} from 'lucide-react';
import { mailApi } from '../../api/mailApi';
import type {
  MailOperationalMetrics,
  MailOutboxFailure,
  MailAdminAddressSummary,
  MailOperationalDiagnostics,
} from '../../types/admin';

interface MailAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MailAdminModal: React.FC<MailAdminModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'diagnostics' | 'failures' | 'addresses' | 'audit'>('metrics');

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

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
      const res = await mailApi.getAdminAddresses({ search: addressSearch || undefined, limit: 50 });
      if (res.data) setAddresses(res.data);
    } catch (err: any) {
      console.warn('[MailAdmin] Addresses load error:', err);
    } finally {
      setLoadingAddresses(false);
    }
  }, [addressSearch]);

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
      else if (activeTab === 'addresses') fetchAddresses();
      else if (activeTab === 'audit') fetchAudit();
    }
  }, [isOpen, activeTab, fetchMetrics, fetchDiagnostics, fetchFailures, fetchAddresses, fetchAudit]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#0e0d24] border border-white/20 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141233]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#B5F823]/10 border border-[#B5F823]/20">
              <Shield className="w-5 h-5 text-[#B5F823]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Pacific Mail Admin Control
              </h2>
              <p className="text-xs text-white/40">
                Operational metrics, queue health & identity management (Privacy-Preserved)
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
        <div className="flex items-center space-x-1 px-6 pt-3 border-b border-white/10 bg-[#0c0a20]">
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
              activeTab === 'metrics'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Operational Metrics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
              activeTab === 'diagnostics'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>Diagnostics & Latency</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('failures')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
              activeTab === 'failures'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Delivery Failures</span>
            {failures.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px]">
                {failures.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
              activeTab === 'addresses'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Mail Identities & Quotas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-[#B5F823] text-[#B5F823] bg-white/5'
                : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Action / Notification Banner */}
        {actionMessage && (
          <div
            className={`px-6 py-2 text-xs font-medium flex items-center justify-between ${
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

        {/* Tab Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">
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
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10"
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

          {/* TAB 1B: DIAGNOSTICS & TELEMETRY (Step 5) */}
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
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10"
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
                  {/* Health Ribbon */}
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
                        {diagnostics.throughputReqPerSec} req/s
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Queue Depth
                      </span>
                      <span className="block mt-1 text-sm font-bold text-white">
                        {diagnostics.queue.depth} pending (oldest: {diagnostics.queue.oldestPendingJobSeconds}s)
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                        <HardDrive className="w-3 h-3 text-purple-400" />
                        Attachments
                      </span>
                      <span className="block mt-1 text-sm font-bold text-white">
                        {diagnostics.storage.attachmentCount} files ({Math.round(diagnostics.storage.attachmentDirBytes / 1024)} KB)
                      </span>
                    </div>
                  </div>

                  {/* Latency Percentiles Table */}
                  <div>
                    <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                      Response Latency Percentiles (ms)
                    </h4>
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-white/10 text-white/60 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-3.5 py-2 font-sans">Operation</th>
                            <th className="px-3 py-2 text-right">Samples</th>
                            <th className="px-3 py-2 text-right">Avg</th>
                            <th className="px-3 py-2 text-right text-emerald-400">p50</th>
                            <th className="px-3 py-2 text-right text-blue-400">p90</th>
                            <th className="px-3 py-2 text-right text-amber-400">p95</th>
                            <th className="px-3 py-2 text-right text-red-400">p99</th>
                            <th className="px-3 py-2 text-right">Max</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-white/80">
                          {Object.entries(diagnostics.latencies).map(([name, stats]) => (
                            <tr key={name} className="hover:bg-white/5">
                              <td className="px-3.5 py-2 font-sans font-medium text-white capitalize">
                                {name.replace(/([A-Z])/g, ' $1')}
                              </td>
                              <td className="px-3 py-2 text-right text-white/50">{stats.count}</td>
                              <td className="px-3 py-2 text-right">{stats.avg} ms</td>
                              <td className="px-3 py-2 text-right text-emerald-400 font-semibold">{stats.p50} ms</td>
                              <td className="px-3 py-2 text-right text-blue-400">{stats.p90} ms</td>
                              <td className="px-3 py-2 text-right text-amber-400">{stats.p95} ms</td>
                              <td className="px-3 py-2 text-right text-red-400 font-semibold">{stats.p99} ms</td>
                              <td className="px-3 py-2 text-right text-white/40">{stats.max} ms</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Anomaly & Error Counters */}
                  <div>
                    <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                      Operational Error & Access Telemetry
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-white/50 block text-[10px]">Client 4xx Errors</span>
                        <span className="text-lg font-bold text-amber-400 mt-1 block">
                          {diagnostics.counters.http4xxErrors}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-white/50 block text-[10px]">Server 5xx Errors</span>
                        <span className="text-lg font-bold text-red-400 mt-1 block">
                          {diagnostics.counters.http5xxErrors}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-white/50 block text-[10px]">Auth/Authz Rejections</span>
                        <span className="text-lg font-bold text-purple-400 mt-1 block">
                          {diagnostics.counters.authFailures}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-white/50 block text-[10px]">Rate Limit Rejections</span>
                        <span className="text-lg font-bold text-blue-400 mt-1 block">
                          {diagnostics.counters.rateLimitHits}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: OUTBOX FAILURES */}
          {activeTab === 'failures' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Outbox Failure Queue</h3>
                  <p className="text-xs text-white/40">
                    Operational error tracking (message body is excluded to protect privacy)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchFailures}
                  disabled={loadingFailures}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingFailures ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingFailures ? (
                <div className="flex items-center justify-center py-16 text-white/40">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B5F823] mr-2" />
                  <span>Loading delivery failures...</span>
                </div>
              ) : failures.length === 0 ? (
                <div className="py-12 text-center text-white/40 border border-white/5 rounded-2xl bg-white/[0.02]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-white/80">All outbox jobs delivered successfully</p>
                  <p className="text-xs text-white/40 mt-1">Zero delivery failures currently in queue</p>
                </div>
              ) : (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/10 text-white/60 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Sender</th>
                        <th className="px-4 py-2.5">Subject</th>
                        <th className="px-4 py-2.5">Transport</th>
                        <th className="px-4 py-2.5">Attempts</th>
                        <th className="px-4 py-2.5">Last Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/80">
                      {failures.map((f) => (
                        <tr key={f.id} className="hover:bg-white/5">
                          <td className="px-4 py-2.5 font-medium text-white">{f.senderAddress}</td>
                          <td className="px-4 py-2.5 truncate max-w-[200px]">{f.subject}</td>
                          <td className="px-4 py-2.5 uppercase font-mono">{f.transport}</td>
                          <td className="px-4 py-2.5">{f.attempts} / {f.maxAttempts}</td>
                          <td className="px-4 py-2.5 text-red-400 truncate max-w-[250px]">{f.lastError || 'Unknown'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADDRESSES & IDENTITIES */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Internal Mail Identities</h3>
                  <p className="text-xs text-white/40">Toggle user mail access and inspect quotas</p>
                </div>
                <button
                  type="button"
                  onClick={fetchAddresses}
                  disabled={loadingAddresses}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAddresses ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <input
                type="text"
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
                placeholder="Filter by local-part or user email..."
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#B5F823]"
              />

              {loadingAddresses ? (
                <div className="flex items-center justify-center py-16 text-white/40">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B5F823] mr-2" />
                  <span>Loading mail identities...</span>
                </div>
              ) : addresses.length === 0 ? (
                <div className="py-12 text-center text-white/40">No internal addresses matched query</div>
              ) : (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/10 text-white/60 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Address</th>
                        <th className="px-4 py-2.5">User Account</th>
                        <th className="px-4 py-2.5">Quota</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/80">
                      {addresses.map((a) => (
                        <tr key={a.id} className="hover:bg-white/5">
                          <td className="px-4 py-2.5 font-medium text-white">{a.fullAddress}</td>
                          <td className="px-4 py-2.5">
                            <div>{a.userName}</div>
                            <div className="text-[10px] text-white/40">{a.userEmail}</div>
                          </td>
                          <td className="px-4 py-2.5 font-mono">{a.hourlyQuota} msg/hr</td>
                          <td className="px-4 py-2.5">
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
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleAddress(a.id, a.isActive)}
                              disabled={togglingId === a.id}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
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
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10"
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
      </div>
    </div>
  );
};
