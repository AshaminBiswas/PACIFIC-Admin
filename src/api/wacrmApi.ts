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
  WacrmAutomation,
  WacrmAutomationLog,
  WacrmFlow,
  WacrmQuickReply,
  WacrmAiConfig,
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

  updateDeal: async (id: string, data: { stageId?: string; title?: string; value?: number; status?: string; notes?: string; expectedCloseDate?: string }) => {
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

  testConnection: async () => {
    const res = await apiClient.post<{ success: boolean; data: any }>('/wacrm/config/test');
    return res.data;
  },

  createTemplate: async (data: { name: string; category: string; language?: string; bodyText: string; buttons?: any }) => {
    const res = await apiClient.post<{ success: boolean; data: WacrmTemplate }>('/wacrm/templates', data);
    return res.data;
  },

  reactToMessage: async (messageId: string, emoji: string | null) => {
    const res = await apiClient.patch<{ success: boolean; data: any }>(`/wacrm/messages/${messageId}/react`, { emoji });
    return res.data;
  },

  getAutomations: async () => {
    const res = await apiClient.get<{ success: boolean; data: WacrmAutomation[] }>('/wacrm/automations');
    return res.data;
  },

  createAutomation: async (data: { name: string; description?: string; triggerType: string; triggerConfig?: any; isActive?: boolean }) => {
    const res = await apiClient.post<{ success: boolean; data: WacrmAutomation }>('/wacrm/automations', data);
    return res.data;
  },

  updateAutomation: async (id: string, data: { name?: string; description?: string; triggerType?: string; triggerConfig?: any; isActive?: boolean }) => {
    const res = await apiClient.patch<{ success: boolean; data: any }>(`/wacrm/automations/${id}`, data);
    return res.data;
  },

  deleteAutomation: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; data: any }>(`/wacrm/automations/${id}`);
    return res.data;
  },

  getAutomationLogs: async (automationId?: string) => {
    const query = automationId ? `?automationId=${encodeURIComponent(automationId)}` : '';
    const res = await apiClient.get<{ success: boolean; data: WacrmAutomationLog[] }>(`/wacrm/automations/logs${query}`);
    return res.data;
  },

  getFlows: async () => {
    const res = await apiClient.get<{ success: boolean; data: WacrmFlow[] }>('/wacrm/flows');
    return res.data;
  },

  getFlow: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; data: WacrmFlow }>(`/wacrm/flows/${id}`);
    return res.data;
  },

  saveFlow: async (data: { id?: string; name: string; description?: string; status?: string; triggerType?: string; nodes: any[]; edges: any[] }) => {
    const res = await apiClient.post<{ success: boolean; data: any }>('/wacrm/flows', data);
    return res.data;
  },

  deleteFlow: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; data: any }>(`/wacrm/flows/${id}`);
    return res.data;
  },

  getQuickReplies: async () => {
    const res = await apiClient.get<{ success: boolean; data: WacrmQuickReply[] }>('/wacrm/quick-replies');
    return res.data;
  },

  createQuickReply: async (data: { shortcut: string; title: string; kind?: string; contentText?: string; interactivePayload?: any }) => {
    const res = await apiClient.post<{ success: boolean; data: WacrmQuickReply }>('/wacrm/quick-replies', data);
    return res.data;
  },

  deleteQuickReply: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; data: any }>(`/wacrm/quick-replies/${id}`);
    return res.data;
  },

  getAiConfig: async () => {
    const res = await apiClient.get<{ success: boolean; data: WacrmAiConfig }>('/wacrm/ai/config');
    return res.data;
  },

  saveAiConfig: async (data: Partial<WacrmAiConfig> & { apiKey?: string }) => {
    const res = await apiClient.post<{ success: boolean; data: any }>('/wacrm/ai/config', data);
    return res.data;
  },

  generateAiDraft: async (conversationId: string) => {
    const res = await apiClient.post<{ success: boolean; data: { draft: string; provider: string; model: string } }>('/wacrm/ai/draft', { conversationId });
    return res.data;
  },
};
