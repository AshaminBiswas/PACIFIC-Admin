import React, { useState, useEffect, useCallback } from 'react';
import { authApi } from '../../api/authApi';
import type { AdminSession } from '../../types/admin';
import {
  Shield,
  Smartphone,
  Laptop,
  Tablet,
  LogOut,
  X,
  RefreshCw,
  Clock,
  Key,
  Download,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface SecuritySessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecuritySessionsModal: React.FC<SecuritySessionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'SESSIONS' | '2FA'>('SESSIONS');
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Recovery codes regeneration
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.getSessions();
      setSessions(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
      setSuccess(null);
      setError(null);
    }
  }, [isOpen, fetchSessions]);

  if (!isOpen) return null;

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this active session? The device will be signed out immediately.')) {
      return;
    }
    setRevokingId(sessionId);
    try {
      await authApi.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSuccess('Session revoked successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to terminate session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm('This will sign out all other devices and active browser sessions except this one. Continue?')) {
      return;
    }
    setRevokingAll(true);
    try {
      await authApi.revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setSuccess('All other sessions have been terminated.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to terminate other sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  const handleRegenerateCodes = async () => {
    const password = prompt('Enter your admin password to confirm regenerating emergency recovery codes:');
    if (!password) return;

    setGeneratingCodes(true);
    setError(null);
    try {
      const res = await authApi.regenerateRecoveryCodes(password);
      setNewRecoveryCodes(res.data?.data?.recoveryCodes || []);
      setSuccess('10 new recovery codes generated. Please copy and store them safely.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to regenerate recovery codes');
    } finally {
      setGeneratingCodes(false);
    }
  };

  const copyCodes = () => {
    if (!newRecoveryCodes.length) return;
    navigator.clipboard.writeText(newRecoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const downloadCodes = () => {
    const text = `PACIFIC ADMIN CONSOLE — NEW 2FA RECOVERY CODES\nGenerated: ${new Date().toISOString()}\n\n${newRecoveryCodes.join('\n')}\n`;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `pacific-recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getDeviceIcon = (deviceType?: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-[#7FB706]" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-amber-400" />;
      default:
        return <Laptop className="w-5 h-5 text-cyan-400" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Active just now';
    if (minutes < 60) return `Active ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Active ${days}d ago`;
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-[#07061d] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#030213]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#7FB706]/10 border border-[#7FB706]/30 flex items-center justify-center text-[#7FB706]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Security & Active Sessions</h2>
              <p className="text-[11px] text-gray-400">Manage authenticated devices and 2FA settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 px-4 pt-2 gap-2 bg-[#030213]/50 shrink-0">
          <button
            onClick={() => setActiveTab('SESSIONS')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SESSIONS'
                ? 'border-[#7FB706] text-[#7FB706]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Laptop className="w-4 h-4" />
            Active Devices ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('2FA')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === '2FA'
                ? 'border-[#7FB706] text-[#7FB706]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            2FA & Recovery Keys
          </button>
        </div>

        {/* Status Alerts */}
        <div className="px-4 pt-3 space-y-2">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'SESSIONS' && (
            <>
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    Authorized Devices
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Sessions are verified on every request. Terminated sessions are immediately blocked.
                  </p>
                </div>
                <button
                  onClick={fetchSessions}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                  title="Refresh Sessions"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
                  Querying session tokens…
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No active sessions found.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        s.isCurrent
                          ? 'bg-[#7FB706]/10 border-[#7FB706]/30 shadow-inner'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                          {getDeviceIcon(s.deviceType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {s.browser || 'Browser'} on {s.os || 'Device'}
                            </span>
                            {s.isCurrent && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-[#7FB706] text-[#030213] tracking-wide uppercase">
                                Current Device
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400 mt-1 font-mono">
                            <span>IP: {s.ipAddress || 'Unknown'}</span>
                            <span>•</span>
                            <span className="text-[#7FB706] font-sans font-semibold">
                              {formatRelativeTime(s.lastActiveAt)}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Signed in: {new Date(s.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {!s.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(s.id)}
                          disabled={revokingId === s.id}
                          className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition border border-red-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{revokingId === s.id ? 'Revoking…' : 'Revoke'}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Bulk Revoke Action */}
              {otherSessionsCount > 0 && (
                <div className="pt-3 border-t border-white/10 flex justify-end">
                  <button
                    onClick={handleRevokeAllOthers}
                    disabled={revokingAll}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold transition border border-red-500/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>
                      {revokingAll
                        ? 'Revoking All Other Devices…'
                        : `Sign Out All Other Devices (${otherSessionsCount})`}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === '2FA' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#7FB706]/10 border border-[#7FB706]/30 flex items-start gap-3 text-xs leading-relaxed">
                <ShieldCheck className="w-5 h-5 text-[#7FB706] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#B5F823]">Two-Factor Authentication is Active</h4>
                  <p className="text-gray-300 mt-0.5">
                    Your account is safeguarded by time-based one-time password (TOTP RFC 6238) verification on every new login.
                  </p>
                </div>
              </div>

              {/* Regenerate Recovery Codes */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    Emergency Backup Recovery Codes
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    If you lose access to your authenticator device, recovery backup keys allow one-time entry. If you have misplaced your backup codes, you can regenerate a new batch of 10 codes.
                  </p>
                </div>

                {newRecoveryCodes.length > 0 ? (
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#7FB706]">New 10 Recovery Codes:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={copyCodes}
                          className="inline-flex items-center gap-1 text-xs text-[#7FB706] hover:underline cursor-pointer"
                        >
                          {copiedCodes ? <Check size={13} /> : <Copy size={13} />}
                          {copiedCodes ? 'Copied' : 'Copy All'}
                        </button>
                        <span className="text-gray-600">|</span>
                        <button
                          type="button"
                          onClick={downloadCodes}
                          className="inline-flex items-center gap-1 text-xs text-[#7FB706] hover:underline cursor-pointer"
                        >
                          <Download size={13} />
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {newRecoveryCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="font-mono text-xs bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-center text-gray-200 font-semibold"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleRegenerateCodes}
                    disabled={generatingCodes}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-bold transition border border-white/10 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>{generatingCodes ? 'Generating…' : 'Generate New Emergency Recovery Codes'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end shrink-0 bg-[#030213]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
