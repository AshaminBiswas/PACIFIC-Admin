import apiClient from './client';
import type { QrScanResult, PublicVerificationData } from '../types/admin';

export const qrApi = {
  scan: (payload: string) => apiClient.post<QrScanResult>('/qr/scan', { payload }),
  generate: (entityType: string, entityId: string) =>
    apiClient.post('/qr/generate', { entityType, entityId }),
  getHistory: () => apiClient.get('/qr/history'),
  verifyPublicToken: (token: string) =>
    apiClient.get<PublicVerificationData>(`/verify/${token}`),
};
