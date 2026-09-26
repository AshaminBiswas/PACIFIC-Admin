import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { authApi } from '../api/authApi';
import { supabase } from '../lib/supabase';
import { API_URL, parseJwtExpiry } from '../api/client';

export interface PacificAdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

interface AdminAuthContextType {
  user: PacificAdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
      } catch (err) {
        console.warn('[Pacific Auth] Proactive token auto-refresh warning:', err);
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
      if (res.data?.data?.user) {
        const u = res.data.data.user;
        setUser(u);
        localStorage.setItem('pacific_user', JSON.stringify(u));
      }
    } catch (err) {
      console.warn('[Pacific Auth] Failed to fetch current profile:', err);
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

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const data = res.data?.data;
    if (!data) throw new Error('Invalid response from server');

    if (data.accessToken) {
      localStorage.setItem('pacific_access_token', data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem('pacific_refresh_token', data.refreshToken);
    }
    if (data.user) {
      setUser(data.user);
      localStorage.setItem('pacific_user', JSON.stringify(data.user));
    }

    // Concurrent Supabase login for media uploads if available
    try {
      await supabase.auth.signInWithPassword({ email, password });
    } catch {
      // Non-blocking for cloud uploads
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore API logout error
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore Supabase logout error
    }

    localStorage.removeItem('pacific_access_token');
    localStorage.removeItem('pacific_refresh_token');
    localStorage.removeItem('pacific_user');
    setUser(null);
  };

  const hasRole = (allowedRoles: string[]) => {
    if (!user) return false;
    const roleUpper = user.role?.toUpperCase();
    if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN') return true;
    return allowedRoles.map((r) => r.toUpperCase()).includes(roleUpper);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
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
