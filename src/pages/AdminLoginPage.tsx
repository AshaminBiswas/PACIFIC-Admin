import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { authApi } from '../api/authApi';
// @ts-ignore
import logo from '../image/logo/logo.webp';
import {
  Lock,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Download,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

type LoginStep = 'CREDENTIALS' | 'PASSWORD_RESET' | 'MFA_SETUP' | 'MFA_VERIFY';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, setAuthSession } = useAdminAuth();

  // Wizard Step State
  const [step, setStep] = useState<LoginStep>('CREDENTIALS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credentials Step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Temp token across steps
  const [tempToken, setTempToken] = useState<string>('');

  // Password Reset Step
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 2FA Setup Step
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [codesSavedConfirmed, setCodesSavedConfirmed] = useState(false);
  const [setupOtp, setSetupOtp] = useState('');

  // 2FA Verification Step
  const [verifyOtp, setVerifyOtp] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

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

  // ── Step 1: Submit Credentials ──
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email.trim(), password);

      if (res.requiresPasswordChange) {
        setTempToken(res.tempToken || '');
        setStep('PASSWORD_RESET');
      } else if (res.requires2FASetup) {
        setTempToken(res.tempToken || '');
        setQrCodeUrl(res.qrCodeUrl || '');
        setSecret(res.secret || '');
        setRecoveryCodes(res.recoveryCodes || []);
        setStep('MFA_SETUP');
      } else if (res.requires2FA) {
        setTempToken(res.tempToken || '');
        setStep('MFA_VERIFY');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: First-Time Password Change ──
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Please meet all password requirements before proceeding.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await authApi.firstTimeChangePassword(tempToken, newPassword);
      const data = res.data?.data;

      if (data?.requires2FASetup) {
        setTempToken(data.tempToken);
        setQrCodeUrl(data.qrCodeUrl || '');
        setSecret(data.secret || '');
        setRecoveryCodes(data.recoveryCodes || []);
        setStep('MFA_SETUP');
      } else {
        // If 2FA was already setup somehow, navigate
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: First-Time 2FA Verification ──
  const handleSetup2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codesSavedConfirmed) {
      setError('Please acknowledge that you have safely stored your recovery codes.');
      return;
    }
    if (setupOtp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code from your authenticator app.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await authApi.firstTimeVerify2fa(tempToken, setupOtp.trim());
      const data = res.data?.data;

      if (data) {
        setAuthSession(data);
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid authenticator code. Check clock sync and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Standard 2FA Verification ──
  const handleVerify2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = verifyOtp.trim();
    if (!token) {
      setError(useRecoveryCode ? 'Please enter a backup recovery code.' : 'Please enter the 6-digit authenticator code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await authApi.verify2fa(tempToken, token);
      const data = res.data?.data;

      if (data) {
        setAuthSession(data);
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Utility: Copy Secret ──
  const copySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // ── Utility: Copy Recovery Codes ──
  const copyRecoveryCodes = () => {
    if (!recoveryCodes.length) return;
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  // ── Utility: Download Recovery Codes ──
  const downloadRecoveryCodes = () => {
    const text = `PACIFIC ADMIN CONSOLE — 2FA RECOVERY BACKUP CODES\nGenerated: ${new Date().toISOString()}\nEmail: ${email}\n\nIMPORTANT: Each code can only be used once.\n\n${recoveryCodes.join('\n')}\n`;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `pacific-admin-recovery-codes-${email || 'account'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ── Reset to Credentials ──
  const resetToStart = () => {
    setStep('CREDENTIALS');
    setTempToken('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSetupOtp('');
    setVerifyOtp('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#030213] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#7FB706]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#B5F823]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-lg bg-[#07061d]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-3 shadow-inner">
            <img src={logo} alt="Pacific" className="h-10 w-auto object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">PACIFIC CUBICLES</h1>
          <p className="text-xs text-[#7FB706] font-bold tracking-widest uppercase mt-0.5">Enterprise Admin Portal</p>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* ── STEP 1: CREDENTIALS ── */}
        {step === 'CREDENTIALS' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Staff Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@pacific.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7FB706] focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-4 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7FB706] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[46px] mt-2 py-3 px-4 bg-[#7FB706] hover:bg-[#6fa005] active:scale-[0.99] text-[#030213] rounded-xl font-black text-sm tracking-wide transition shadow-lg shadow-[#7FB706]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#030213] border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 2: MANDATORY FIRST-TIME PASSWORD RESET ── */}
        {step === 'PASSWORD_RESET' && (
          <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
              <div className="font-bold flex items-center gap-2 mb-1">
                <Key className="w-4 h-4" />
                Temporary Password Detected
              </div>
              Your account was created with a temporary password. You must set a permanent secure password before proceeding.
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                New Secure Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter strong password"
                  required
                  autoComplete="new-password"
                  className="w-full pl-4 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7FB706] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white transition"
                  aria-label="Toggle password visibility"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7FB706] focus:border-transparent transition"
              />
            </div>

            {/* Password Requirement Checklist */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3.5 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Password Security Requirements:
              </p>
              {passwordRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {rule.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7FB706] shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  )}
                  <span className={rule.valid ? 'text-gray-200' : 'text-gray-500'}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full min-h-[46px] py-3 px-4 bg-[#7FB706] hover:bg-[#6fa005] active:scale-[0.99] text-[#030213] rounded-xl font-black text-sm tracking-wide transition shadow-lg shadow-[#7FB706]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#030213] border-t-transparent rounded-full animate-spin" />
                  <span>Updating Password…</span>
                </>
              ) : (
                <>
                  <span>Save & Continue to 2FA Setup</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetToStart}
              className="w-full py-2 text-xs text-gray-400 hover:text-white transition cursor-pointer"
            >
              Cancel and return to login
            </button>
          </form>
        )}

        {/* ── STEP 3: MANDATORY 2FA ENROLLMENT ── */}
        {step === 'MFA_SETUP' && (
          <form onSubmit={handleSetup2FASubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#7FB706]/10 border border-[#7FB706]/30 text-[#B5F823] text-xs leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 shrink-0 text-[#7FB706] mt-0.5" />
              <div>
                <span className="font-bold block">Mandatory 2FA Enrollment</span>
                Pacific admin accounts require two-factor authentication. Connect Google Authenticator, Microsoft Authenticator, or 1Password.
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              {qrCodeUrl ? (
                <div className="bg-white p-2 rounded-xl shrink-0 shadow-md">
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-32 h-32" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <QrCode className="w-10 h-10 text-gray-500 animate-pulse" />
                </div>
              )}

              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-gray-300">
                  1. Scan with your authenticator app
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Or enter this setup key manually into your authenticator:
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <code className="text-xs font-mono font-bold bg-white/5 px-2 py-1 rounded-lg text-[#7FB706] truncate border border-white/10 flex-1">
                    {secret || 'GENERATING…'}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition shrink-0 border border-white/10"
                    title="Copy Secret"
                  >
                    {copiedSecret ? <Check size={14} className="text-[#7FB706]" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Recovery Codes Section */}
            {recoveryCodes.length > 0 && (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    2. Emergency Backup Codes
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyRecoveryCodes}
                      className="inline-flex items-center gap-1 text-[11px] text-[#7FB706] hover:underline cursor-pointer"
                    >
                      {copiedCodes ? <Check size={12} /> : <Copy size={12} />}
                      {copiedCodes ? 'Copied' : 'Copy'}
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      type="button"
                      onClick={downloadRecoveryCodes}
                      className="inline-flex items-center gap-1 text-[11px] text-[#7FB706] hover:underline cursor-pointer"
                    >
                      <Download size={12} />
                      Download
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  Save these 10 one-time recovery codes in a secure location. You will need them if you lose access to your device.
                </p>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {recoveryCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="font-mono text-[11px] bg-black/40 border border-white/5 rounded-md px-2 py-1 text-center text-gray-300 font-semibold"
                    >
                      {code}
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={codesSavedConfirmed}
                    onChange={(e) => setCodesSavedConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-white/5 text-[#7FB706] focus:ring-[#7FB706]"
                  />
                  <span className="text-xs text-gray-300 leading-tight">
                    I have copied or downloaded my emergency recovery codes to a secure place.
                  </span>
                </label>
              </div>
            )}

            {/* OTP Verification */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                3. Enter 6-Digit Authenticator Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={setupOtp}
                onChange={(e) => setSetupOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                autoComplete="one-time-code"
                className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#7FB706] focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !codesSavedConfirmed || setupOtp.trim().length !== 6}
              className="w-full min-h-[46px] py-3 px-4 bg-[#7FB706] hover:bg-[#6fa005] active:scale-[0.99] text-[#030213] rounded-xl font-black text-sm tracking-wide transition shadow-lg shadow-[#7FB706]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#030213] border-t-transparent rounded-full animate-spin" />
                  <span>Verifying 2FA…</span>
                </>
              ) : (
                <>
                  <span>Activate 2FA & Launch Console</span>
                  <Check size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetToStart}
              className="w-full py-2 text-xs text-gray-400 hover:text-white transition cursor-pointer"
            >
              Back to login
            </button>
          </form>
        )}

        {/* ── STEP 4: STANDARD 2FA VERIFICATION ── */}
        {step === 'MFA_VERIFY' && (
          <form onSubmit={handleVerify2FASubmit} className="space-y-4">
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-[#7FB706]/10 border border-[#7FB706]/30 flex items-center justify-center mx-auto text-[#7FB706] mb-3">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white">Two-Factor Authentication</h2>
              <p className="text-xs text-gray-400 mt-1">
                {useRecoveryCode
                  ? 'Enter one of your 8-character single-use emergency backup codes.'
                  : 'Enter the 6-digit verification code from your authenticator app.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 text-center">
                {useRecoveryCode ? 'Backup Recovery Code' : '6-Digit Security Code'}
              </label>
              <input
                type="text"
                inputMode={useRecoveryCode ? 'text' : 'numeric'}
                maxLength={useRecoveryCode ? 16 : 6}
                value={verifyOtp}
                onChange={(e) =>
                  setVerifyOtp(
                    useRecoveryCode
                      ? e.target.value.toUpperCase().trim()
                      : e.target.value.replace(/\D/g, '')
                  )
                }
                placeholder={useRecoveryCode ? 'ABCD1234' : '000000'}
                required
                autoComplete="one-time-code"
                autoFocus
                className="w-full text-center tracking-[0.4em] font-mono font-bold text-xl px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#7FB706] focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !verifyOtp.trim()}
              className="w-full min-h-[46px] py-3 px-4 bg-[#7FB706] hover:bg-[#6fa005] active:scale-[0.99] text-[#030213] rounded-xl font-black text-sm tracking-wide transition shadow-lg shadow-[#7FB706]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#030213] border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Code…</span>
                </>
              ) : (
                <>
                  <span>Verify & Access Console</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryCode(!useRecoveryCode);
                  setVerifyOtp('');
                  setError(null);
                }}
                className="text-xs text-[#7FB706] hover:underline cursor-pointer"
              >
                {useRecoveryCode ? 'Use Authenticator App instead' : 'Use a backup recovery code'}
              </button>

              <button
                type="button"
                onClick={resetToStart}
                className="text-xs text-gray-400 hover:text-white transition cursor-pointer"
              >
                Sign in with another account
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Security Compliance Footer */}
      <div className="mt-8 text-center text-xs text-gray-500 flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-gray-500" />
        <span>End-to-end encrypted • RFC 6238 TOTP • Active Session Revocation</span>
      </div>
    </div>
  );
};

export default AdminLoginPage;
