import { apiClient } from './client';
import type {
  WacrmContact,
  WacrmConversation,
  WacrmMessage,
  WacrmPipeline,
  WacrmPipelineStage,
  WacrmDeal,
  WacrmTemplate,
  WacrmTag,
  WacrmBroadcast,
  WacrmConfig,
  WacrmDashboardData,
  CreateWacrmContactInput,
  SendWacrmMessageInput,
  CreateWacrmDealInput,
} from '../types/admin';

export const wacrmApi = {
  getDashboard: async () => {
    const res = await apiClient.get<{ success: boolean; data: WacrmDashboardData }>('/wacrm/dashboard');
    return res.data;
  },

  getConversations: async (status?: string, search?: string) => {
    const sp = new URLSearchParams();
    if (status && status !== 'all') sp.set('status', status);
    if (search && search.trim()) sp.set('search', search.trim());
    const query = sp.toString() ? `?${sp.toString()}` : '';
    const res = await apiClient.get<{ success: boolean; data: WacrmConversation[] }>(`/wacrm/conversations${query}`);
    return res.data;
  },

  getConversation: async (id: string) => {
    const res = await apiClient.get<{
      success: boolean;
      data: {
        conversation: WacrmConversation;
        messages: WacrmMessage[];
      };
    }>(`/wacrm/conversations/${id}`);
    return res.data;
  },

  sendMessage: async (data: SendWacrmMessageInput) => {
    const res = await apiClient.post<{ success: boolean; data: WacrmMessage }>('/wacrm/messages', data);
    return res.data;
  },

  updateConversation: async (id: string, data: { status: 'open' | 'pending' | 'closed'; assignedAgentName?: string | null }) => {
    const res = await apiClient.patch<{ success: boolean; data: any }>(`/wacrm/conversations/${id}`, data);
    return res.data;
  },

  getContacts: async (search?: string, tag?: string) => {
    const sp = new URLSearchParams();
    if (search && search.trim()) sp.set('search', search.trim());
    if (tag && tag.trim()) sp.set('tag', tag.trim());
    const query = sp.toString() ? `?${sp.toString()}` : '';
    const res = await apiClient.get<{ success: boolean; data: WacrmContact[] }>(`/wacrm/contacts${query}`);
    return res.data;
  },

  createContact: async (data: CreateWacrmContactInput) => {
    const res = await apiClient.post<{ success: boolean; data: WacrmContact }>('/wacrm/contacts', data);
    return res.data;
  },

  updateContact: async (id: string, data: Partial<CreateWacrmContactInput>) => {
    const res = await apiClient.patch<{ success: boolean; data: any }>(`/wacrm/contacts/${id}`, data);
    return res.data;
  },

  deleteContact: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; data: any }>(`/wacrm/contacts/${id}`);
    return res.data;
  },

  getPipeline: async () => {
    const res = await apiClient.get<{
      success: boolean;
      data: {
        pipeline: WacrmPipeline;
        stages: WacrmPipelineStage[];
        deals: WacrmDeal[];
      };
    }>('/wacrm/pipeline');
    return res.data;
  },

  createDeal: async (data: CreateWacrmDealInput) => {
    const res = await apiClient.post<{ success: boolean; data: WacrmDeal }>('/wacrm/deals', data);
    return res.data;
  },

  updateDeal: async (id: string, data: { stageId?: string; title?: string; value?: number; status?: string; notes?: string }) => {
    const res = await apiClient.patch<{ success: boolean; data: any }>(`/wacrm/deals/${id}`, data);
    return res.data;
  },

  deleteDeal: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; data: any }>(`/wacrm/deals/${id}`);
    return res.data;
  },

  getBroadcasts: async () => {
    const res = await apiClient.get<{ success: boolean; data: WacrmBroadcast[] }>('/wacrm/broadcasts');
    return res.data;
  },

  createBroadcast: async (data: { name: string; templateName: string; templateLanguage?: string; audienceFilter?: any }) => {
    const res = await apiClient.post<{ success: boolean; data: WacrmBroadcast }>('/wacrm/broadcasts', data);
    return res.data;
  },

  getTemplates: async () => {
    const res = await apiClient.get<{ success: boolean; data: WacrmTemplate[] }>('/wacrm/templates');
    return res.data;
  },

  getTags: async () => {
    const res = await apiClient.get<{ success: boolean; data: WacrmTag[] }>('/wacrm/tags');
    return res.data;
  },

  getConfig: async () => {
    const res = await apiClient.get<{ success: boolean; data: WacrmConfig }>('/wacrm/config');
    return res.data;
  },

  saveConfig: async (data: { phoneNumberId: string; wabaId?: string; accessToken: string; verifyToken?: string }) => {
    const res = await apiClient.post<{ success: boolean; data: any }>('/wacrm/config', data);
    return res.data;
  },
};
