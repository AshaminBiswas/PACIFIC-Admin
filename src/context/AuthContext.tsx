import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/services';
import type { AdminUser } from '../types/admin';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('pacific_access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data.data);
    } catch {
      localStorage.removeItem('pacific_access_token');
      localStorage.removeItem('pacific_refresh_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    const { accessToken, refreshToken, user: userData } = data.data!;
    localStorage.setItem('pacific_access_token', accessToken);
    localStorage.setItem('pacific_refresh_token', refreshToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('pacific_access_token');
    localStorage.removeItem('pacific_refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
