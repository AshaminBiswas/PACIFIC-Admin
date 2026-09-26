import React from 'react';
import { useAdminAuth, AdminAuthProvider } from './AdminAuthContext';
import type { PacificAdminUser } from './AdminAuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
};

export const useAuth = () => {
  return useAdminAuth();
};

export type AdminUser = PacificAdminUser;

