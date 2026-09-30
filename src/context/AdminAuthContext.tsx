import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { authApi, LoginResult } from '../api/authApi';
import { supabase } from '../lib/supabase';
import { API_URL, parseJwtExpiry } from '../api/client';
import type { UserRole, AuthTokens } from '../types/admin';

export interface PacificAdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole | string;
  twoFactorEnabled?: boolean;
  mustChangePassword?: boolean;
  isTwoFactorPending?: boolean;
}

interface AdminAuthContextType {
  user: PacificAdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  setAuthSession: (tokens: AuthTokens & { sessionToken?: string }) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkAndRefreshToken: () => Promise<boolean>;
  hasRole: (allowedRoles: string[]) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PacificAdminUser | null>(() => {
    try {
      const stored = localStorage.getItem('pacific_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(user && localStorage.getItem('pacific_access_token'));

  const setAuthSession = useCallback((data: AuthTokens & { sessionToken?: string }) => {
    if (data.accessToken) {
      localStorage.setItem('pacific_access_token', data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem('pacific_refresh_token', data.refreshToken);
    }
    if (data.sessionToken) {
      localStorage.setItem('pacific_session_token', data.sessionToken);
    }
    if (data.user) {
      setUser(data.user);
      localStorage.setItem('pacific_user', JSON.stringify(data.user));
    }
  }, []);

  // Proactive token refresh: verifies expiration and fetches fresh tokens in background
  const checkAndRefreshToken = useCallback(async (): Promise<boolean> => {
    const accessToken = localStorage.getItem('pacific_access_token');
    const refreshToken = localStorage.getItem('pacific_refresh_token');
    if (!accessToken || !refreshToken) return false;

    const expiryTime = parseJwtExpiry(accessToken);
    if (!expiryTime) return false;

    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    // Refresh if expired or expiring within 3 minutes (180,000 ms)
    if (timeUntilExpiry < 3 * 60 * 1000) {
      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken },
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          }
        );
        const newAccess = data?.data?.accessToken;
        const newRefresh = data?.data?.refreshToken;
        if (newAccess) {
          localStorage.setItem('pacific_access_token', newAccess);
          if (newRefresh) {
            localStorage.setItem('pacific_refresh_token', newRefresh);
          }
          return true;
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          // Token or session revoked - clear credentials
          localStorage.removeItem('pacific_access_token');
          localStorage.removeItem('pacific_refresh_token');
          localStorage.removeItem('pacific_session_token');
          localStorage.removeItem('pacific_user');
          setUser(null);
        }
      }
    }
    return false;
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('pacific_access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authApi.me();
      if (res.data?.data) {
        const u = res.data.data;
        setUser(u);
        localStorage.setItem('pacific_user', JSON.stringify(u));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('pacific_access_token');
        localStorage.removeItem('pacific_refresh_token');
        localStorage.removeItem('pacific_session_token');
        localStorage.removeItem('pacific_user');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial profile and token refresh check
    checkAndRefreshToken().then(() => {
      refreshProfile();
    });

    // 2. Periodic background check every 60 seconds
    const interval = setInterval(() => {
      checkAndRefreshToken();
    }, 60 * 1000);

    // 3. Tab visibility / Window focus listeners
    const onWindowFocus = () => {
      checkAndRefreshToken();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefreshToken();
      }
    };

    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkAndRefreshToken, refreshProfile]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const res = await authApi.login(email, password);
    const data = res.data?.data;
    if (!data) throw new Error('Invalid response from server');

    // If fully authenticated (no 2FA or password reset required)
    if (!data.requiresPasswordChange && !data.requires2FA && !data.requires2FASetup && data.accessToken) {
      setAuthSession(data);

      // Concurrent Supabase login for media uploads if available
      try {
        await supabase.auth.signInWithPassword({ email, password });
      } catch {}
    }

    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {}

    try {
      await supabase.auth.signOut();
    } catch {}

    localStorage.removeItem('pacific_access_token');
    localStorage.removeItem('pacific_refresh_token');
    localStorage.removeItem('pacific_session_token');
    localStorage.removeItem('pacific_user');
    setUser(null);
  };

  const hasRole = (allowedRoles: string[]) => {
    if (!user) return false;
    const roleUpper = user.role?.toUpperCase();
    if (roleUpper === 'SUPER_ADMIN') return true;
    return allowedRoles.map((r) => r.toUpperCase()).includes(roleUpper);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        setAuthSession,
        logout,
        refreshProfile,
        checkAndRefreshToken,
        hasRole,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const useAuth = useAdminAuth;
