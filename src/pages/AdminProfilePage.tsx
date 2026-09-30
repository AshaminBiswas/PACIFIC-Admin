import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { authApi } from '../api/authApi';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getRoleBadgeInfo } from '../utils/rbacNavigation';
import type { AdminSession, TwoFactorSetupData } from '../types/admin';
// @ts-ignore
import logo from '../image/logo/logo.webp';
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Key,
  Laptop,
  Smartphone,
  Tablet,
  LogOut,
  QrCode,
  Download,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';

export const AdminProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, refreshProfile } = useAdminAuth();
  const pwa = usePWAInstall();

  // Active Sessions State
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingAllOthers, setRevokingAllOthers] = useState(false);

  // Recovery Codes State
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // 2FA Setup & Enrollment Modal State
  const [showSetup2FAModal, setShowSetup2FAModal] = useState(false);
  const [setup2FAData, setSetup2FAData] = useState<TwoFactorSetupData | null>(null);
  const [loading2FASetup, setLoading2FASetup] = useState(false);
  const [setup2FACode, setSetup2FACode] = useState('');
  const [setup2FAError, setSetup2FAError] = useState<string | null>(null);
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [setup2FACopiedSecret, setSetup2FACopiedSecret] = useState(false);
  const [setup2FACopiedCodes, setSetup2FACopiedCodes] = useState(false);
  const [setup2FACodesSaved, setSetup2FACodesSaved] = useState(false);

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // General Notification Alert
  const [generalAlert, setGeneralAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const roleInfo = getRoleBadgeInfo(user?.role);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await authApi.getSessions();
      setSessions(res.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    refreshProfile();
  }, [fetchSessions, refreshProfile]);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setGeneralAlert({ type, message });
    setTimeout(() => setGeneralAlert(null), 4000);
  };

  // ── Session Revocation ──
  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this active device session? It will be signed out immediately.')) {
      return;
    }
    setRevokingSessionId(sessionId);
    try {
      await authApi.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showAlert('success', 'Device session terminated successfully.');
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm('This will sign out all other devices and active browser sessions except your current one. Continue?')) {
      return;
    }
    setRevokingAllOthers(true);
    try {
      await authApi.revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      showAlert('success', 'All other active device sessions have been revoked.');
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Failed to terminate other sessions');
    } finally {
      setRevokingAllOthers(false);
    }
  };

  // ── 2FA Enrollment Handlers ──
  const handleOpenSetup2FA = async () => {
    setLoading2FASetup(true);
    setSetup2FAError(null);
    setSetup2FACode('');
    setSetup2FACodesSaved(false);
    try {
      const res = await authApi.setup2fa();
      if (res.data?.data) {
        setSetup2FAData(res.data.data);
        setShowSetup2FAModal(true);
      }
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Failed to initialize 2FA setup');
    } finally {
      setLoading2FASetup(false);
    }
  };

  const handleConfirmEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setup2FACodesSaved) {
      setSetup2FAError('Please confirm that you have safely stored your recovery backup codes.');
      return;
    }
    if (setup2FACode.trim().length !== 6) {
      setSetup2FAError('Please enter the 6-digit verification code from your authenticator app.');
      return;
    }

    setEnabling2FA(true);
    setSetup2FAError(null);
    try {
      await authApi.enable2fa(setup2FACode.trim());
      setShowSetup2FAModal(false);
      showAlert('success', 'Two-Factor Authentication is now active and protecting your account!');
      await refreshProfile();
    } catch (err: any) {
      setSetup2FAError(err?.response?.data?.message || 'Invalid verification code. Check your clock sync and try again.');
    } finally {
      setEnabling2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    const password = prompt('Enter your admin password to confirm disabling Two-Factor Authentication:');
    if (!password) return;

    setDisabling2FA(true);
    try {
      await authApi.disable2fa(password);
      showAlert('success', 'Two-Factor Authentication has been disabled.');
      await refreshProfile();
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Failed to disable 2FA. Verify your password.');
    } finally {
      setDisabling2FA(false);
    }
  };

  // ── Recovery Codes Regeneration ──
  const handleRegenerateCodes = async () => {
    const password = prompt('Please enter your current admin password to generate a fresh set of emergency recovery codes:');
    if (!password) return;

    setGeneratingCodes(true);
    try {
      const res = await authApi.regenerateRecoveryCodes(password);
      setNewRecoveryCodes(res.data?.data?.recoveryCodes || []);
      showAlert('success', '10 new emergency backup codes generated. Please copy and download them now.');
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Failed to regenerate backup codes. Check your password.');
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
    const text = `PACIFIC RESTROOM CUBICLE — ADMIN RECOVERY BACKUP CODES\nAccount: ${user?.email}\nGenerated: ${new Date().toISOString()}\n\nIMPORTANT: Each emergency code can only be used once.\n\n${newRecoveryCodes.join('\n')}\n`;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `pacific-admin-recovery-codes-${user?.email || 'admin'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ── Password Validation Rules ──
  const passwordRules = [
    { label: 'At least 8 characters', valid: newPassword.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'At least one number (0-9)', valid: /\d/.test(newPassword) },
    { label: 'At least one special character (@$!%*?&#)', valid: /[@$!%*?&#^()_+\-=[\]{}|;:,.<>]/.test(newPassword) },
    { label: 'Passwords match', valid: newPassword.length > 0 && newPassword === confirmPassword },
  ];
  const isPasswordValid = passwordRules.every((r) => r.valid);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!isPasswordValid) {
      setPasswordError('Please satisfy all password complexity requirements.');
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password updated successfully! All other active sessions have been safely terminated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchSessions();
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || 'Failed to update password. Verify your current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to securely log out of the Pacific Admin Console?')) {
      await logout();
      navigate('/login');
    }
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

  const formatRelativeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Active recently';
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
  const userInitials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.email?.[0]?.toUpperCase() || 'A';

  return (
    <div className="space-y-6 pb-12">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link to="/admin/dashboard" className="hover:text-[#7FB706] transition">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">Admin Profile & Security</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>Staff Account Profile</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${roleInfo.badgeClass}`}>
              {roleInfo.name}
            </span>
          </h1>
        </div>

        <button
          onClick={handleLogout}
          className="self-start sm:self-auto min-h-[44px] px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer active:scale-95"
          title="Sign out of console"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* ── Global Notification Banner ── */}
      {generalAlert && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-3 transition-all animate-fade-in ${
            generalAlert.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {generalAlert.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{generalAlert.message}</span>
        </div>
      )}

      {/* ── Top Hero User Card ── */}
      <div className="bg-[#121226] border border-white/10 rounded-3xl p-6 lg:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#7FB706]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#7FB706] to-[#B5F823] p-1 shadow-lg shadow-[#7FB706]/30 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#030213] flex items-center justify-center text-2xl font-black text-[#B5F823]">
                {userInitials}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Pacific Administrator'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Account
                </span>
              </div>
              <p className="text-xs font-mono text-gray-400 mt-1">{user?.email}</p>
              <p className="text-[11px] text-gray-500 mt-1.5 max-w-xl leading-relaxed">
                {roleInfo.description}
              </p>
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
            <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">2FA Security</p>
              <p className="text-xs font-bold text-[#7FB706] mt-1 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user?.twoFactorEnabled ? 'Active' : 'Pending'}
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Devices</p>
              <p className="text-xs font-bold text-cyan-400 mt-1 flex items-center justify-center gap-1">
                <Laptop className="w-3.5 h-3.5" />
                {sessions.length} Connected
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Access Scope</p>
              <p className="text-xs font-bold text-purple-400 mt-1 truncate">
                {user?.role || 'SUPER_ADMIN'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: 2FA & Active Sessions */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── 1. TWO-FACTOR AUTHENTICATION HUB ── */}
          <div className="bg-[#121226] border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7FB706]/10 border border-[#7FB706]/30 flex items-center justify-center text-[#7FB706]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Two-Factor Authentication (2FA)</h3>
                  <p className="text-xs text-gray-400">TOTP RFC 6238 multi-factor authentication security</p>
                </div>
              </div>

              {user?.twoFactorEnabled ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Enabled & Protected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  Setup Pending
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-gray-300 leading-relaxed space-y-2">
              <p>
                Your Pacific Admin Console is protected by an Authenticator app (such as Google Authenticator, Microsoft Authenticator, or 1Password). A rotating 6-digit TOTP code is required on every login.
              </p>
              <p className="text-gray-400 text-[11px]">
                In the event that you replace your phone or lose access to your authenticator, single-use emergency recovery backup codes provide an instant fallback.
              </p>
            </div>

            {!user?.twoFactorEnabled ? (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Two-Factor Authentication Setup Required</h4>
                    <p className="text-xs text-gray-300 mt-1 max-w-lg leading-relaxed">
                      Your account does not have 2FA activated yet. Configure Google Authenticator, Microsoft Authenticator, or 1Password to secure your admin account.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenSetup2FA}
                  disabled={loading2FASetup}
                  className="px-5 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-black flex items-center gap-2 shadow-lg shadow-[#7FB706]/20 transition cursor-pointer self-start sm:self-auto min-h-[44px] shrink-0"
                >
                  <Key className="w-4 h-4" />
                  <span>{loading2FASetup ? 'Initializing…' : 'Setup Two-Factor Authentication'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-[#7FB706] shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">2FA Protection Active & Enforced</span>
                      <span className="text-[11px] text-gray-400">Authenticated via rotating TOTP (RFC 6238) and single-use recovery keys</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisable2FA}
                    disabled={disabling2FA}
                    className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                  >
                    {disabling2FA ? 'Disabling…' : 'Disable 2FA'}
                  </button>
                </div>

                {/* Emergency Recovery Codes Box */}
                <div className="bg-black/30 border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Emergency Backup Recovery Codes
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Each emergency key can only be used once. Keep these codes stored securely offline.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRegenerateCodes}
                      disabled={generatingCodes}
                      className="self-start sm:self-auto min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#7FB706] border border-[#7FB706]/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generatingCodes ? 'animate-spin' : ''}`} />
                      <span>{generatingCodes ? 'Generating…' : 'Generate 10 Fresh Codes'}</span>
                    </button>
                  </div>

              {/* Display newly generated codes */}
              {newRecoveryCodes.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">Your Fresh 10 Recovery Codes:</span>
                    <div className="flex items-center gap-3">
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
                        Download (.txt)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {newRecoveryCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="font-mono text-xs bg-black/60 border border-white/10 rounded-lg p-2 text-center text-white font-semibold"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

          {/* ── 2. ACTIVE DEVICES & SESSION MANAGEMENT ── */}
          <div className="bg-[#121226] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Active Devices & Sessions</h3>
                  <p className="text-xs text-gray-400">
                    Sessions are verified on every API request. Revoked sessions are blocked instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchSessions}
                  disabled={loadingSessions}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title="Refresh Sessions"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin' : ''}`} />
                </button>

                {otherSessionsCount > 0 && (
                  <button
                    onClick={handleRevokeAllOthers}
                    disabled={revokingAllOthers}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{revokingAllOthers ? 'Revoking…' : `Revoke Other Devices (${otherSessionsCount})`}</span>
                  </button>
                )}
              </div>
            </div>

            {loadingSessions ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
                Fetching active session tokens…
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">No active device sessions found.</div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      s.isCurrent
                        ? 'bg-[#7FB706]/10 border-[#7FB706]/40 shadow-inner'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                        {getDeviceIcon(s.deviceType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {s.browser || 'Web Browser'} on {s.os || 'Operating System'}
                          </span>
                          {s.isCurrent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-[#7FB706] text-[#030213] tracking-wide uppercase">
                              Current Device
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400 mt-1 font-mono">
                          <span>IP: {s.ipAddress || '127.0.0.1'}</span>
                          <span>•</span>
                          <span className="text-[#7FB706] font-sans font-semibold">
                            {formatRelativeTime(s.lastActiveAt)}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Logged in on: {new Date(s.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>

                    {!s.isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        disabled={revokingSessionId === s.id}
                        className="self-end sm:self-center min-h-[38px] px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition border border-red-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{revokingSessionId === s.id ? 'Revoking…' : 'Revoke Session'}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Quick Tools, PWA, Verify QR & Password Change */}
        <div className="space-y-6">
          {/* ── 3. QUICK TOOLS (MOVED FROM HEADER) ── */}
          <div className="bg-[#121226] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Admin Quick Tools
            </h3>

            {/* Verify QR Card */}
            <a
              href="/verify/sample"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#7FB706]/40 hover:bg-[#7FB706]/5 transition flex items-start gap-3.5 group cursor-pointer block"
            >
              <div className="p-2.5 rounded-xl bg-[#7FB706]/10 text-[#7FB706] group-hover:scale-110 transition shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white group-hover:text-[#7FB706] transition">
                    Verify QR Document
                  </h4>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#7FB706] transition" />
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Cryptographically authenticate client quotations, proforma invoices, and warranty tokens.
                </p>
              </div>
            </a>

            {/* Install App Card */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 transition flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white">Install Mobile App (PWA)</h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Add the Pacific Admin Console to your phone or desktop home screen for one-tap native access.
                </p>
                <div className="mt-3">
                  {pwa.isInstalled ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7FB706] font-bold">
                      <Check className="w-3.5 h-3.5" />
                      App Installed on this device
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={pwa.promptInstall}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#7FB706]/20 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Install Console App</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. CHANGE ACCOUNT PASSWORD ── */}
          <div className="bg-[#121226] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <Lock className="w-4 h-4 text-[#7FB706]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Update Account Password
              </h3>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Confirm New Password *</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* Real-time Checklist */}
              {newPassword.length > 0 && (
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                  {passwordRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px]">
                      {rule.valid ? (
                        <CheckCircle2 className="w-3 h-3 text-[#7FB706] shrink-0" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-gray-600 shrink-0" />
                      )}
                      <span className={rule.valid ? 'text-gray-200' : 'text-gray-500'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={savingPassword || !isPasswordValid || !currentPassword}
                className="w-full min-h-[44px] py-2.5 px-4 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] rounded-xl font-bold text-xs transition shadow-md shadow-[#7FB706]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {savingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#030213] border-t-transparent rounded-full animate-spin" />
                    <span>Updating Password…</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Save New Password</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── 2FA ENROLLMENT MODAL ── */}
      {showSetup2FAModal && setup2FAData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#7FB706]/10 border border-[#7FB706]/30 flex items-center justify-center text-[#7FB706]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Enable Two-Factor Authentication</h3>
                  <p className="text-[11px] text-gray-400">Scan QR Code & configure your authenticator app</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSetup2FAModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmEnable2FA} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {setup2FAError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{setup2FAError}</span>
                </div>
              )}

              {/* Step 1: Scan QR */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#7FB706] text-[#030213] text-[11px] font-black flex items-center justify-center">1</span>
                  <span className="font-bold text-white text-xs">Scan Authenticator QR Code</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0a0a1a] border border-white/5 p-4 rounded-2xl">
                  <div className="bg-white p-2.5 rounded-2xl shadow-inner shrink-0">
                    <img
                      src={setup2FAData.qrCodeUrl}
                      alt="2FA QR Code"
                      className="w-36 h-36 rounded-lg object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-left w-full">
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      Scan this barcode using Google Authenticator, Microsoft Authenticator, Apple Passwords, or 1Password.
                    </p>
                    <div className="pt-1">
                      <span className="text-[10px] text-gray-400 block mb-1">Or enter key manually:</span>
                      <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-2.5 py-1.5 rounded-xl font-mono text-xs text-[#7FB706] justify-between">
                        <span className="truncate select-all">{setup2FAData.secret}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(setup2FAData.secret);
                            setSetup2FACopiedSecret(true);
                            setTimeout(() => setSetup2FACopiedSecret(false), 2000);
                          }}
                          className="text-gray-400 hover:text-white shrink-0 cursor-pointer"
                          title="Copy Secret"
                        >
                          {setup2FACopiedSecret ? <Check className="w-3.5 h-3.5 text-[#7FB706]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Emergency Recovery Codes */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#7FB706] text-[#030213] text-[11px] font-black flex items-center justify-center">2</span>
                    <span className="font-bold text-white text-xs">Save 10 Backup Recovery Codes</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(setup2FAData.recoveryCodes.join('\n'));
                        setSetup2FACopiedCodes(true);
                        setTimeout(() => setSetup2FACopiedCodes(false), 2000);
                      }}
                      className="text-[11px] text-[#7FB706] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {setup2FACopiedCodes ? <Check size={12} /> : <Copy size={12} />}
                      {setup2FACopiedCodes ? 'Copied' : 'Copy'}
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `PACIFIC ADMIN 2FA RECOVERY CODES\nAccount: ${user?.email}\nGenerated: ${new Date().toISOString()}\n\n${setup2FAData.recoveryCodes.join('\n')}\n`;
                        const blob = new Blob([text], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `pacific-recovery-codes-${user?.email || 'admin'}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-[11px] text-[#7FB706] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download size={12} /> Download
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
                  {setup2FAData.recoveryCodes.map((c, i) => (
                    <div key={i} className="font-mono text-[11px] text-center text-gray-200 bg-white/5 rounded px-1.5 py-1">
                      {c}
                    </div>
                  ))}
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                  <input
                    type="checkbox"
                    checked={setup2FACodesSaved}
                    onChange={(e) => setSetup2FACodesSaved(e.target.checked)}
                    className="rounded accent-[#7FB706] cursor-pointer"
                  />
                  <span className="text-[11px] text-gray-300">
                    I confirm that I have safely copied or downloaded these recovery codes.
                  </span>
                </label>
              </div>

              {/* Step 3: Enter 6-digit Code */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#7FB706] text-[#030213] text-[11px] font-black flex items-center justify-center">3</span>
                  <span className="font-bold text-white text-xs">Verify & Activate</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Enter the live 6-digit code currently generated by your Authenticator app:
                </p>

                <input
                  type="text"
                  maxLength={6}
                  required
                  value={setup2FACode}
                  onChange={(e) => setSetup2FACode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-center text-xl font-mono tracking-widest text-[#7FB706] placeholder-gray-600 focus:outline-none focus:border-[#7FB706] font-bold"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSetup2FAModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enabling2FA || !setup2FACodesSaved || setup2FACode.length !== 6}
                  className="px-6 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold rounded-xl text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[44px] flex items-center gap-2 shadow-lg shadow-[#7FB706]/20"
                >
                  {enabling2FA ? 'Activating 2FA…' : 'Activate Two-Factor Authentication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfilePage;
