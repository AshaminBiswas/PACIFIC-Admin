import { apiClient } from './client';
import type {
  MailAddress,
  MailMessageDetail,
  MailThreadSummary,
  MailFolderCounts,
  SendMailRequest,
  CreateDraftRequest,
  ReplyMailRequest,
  ForwardMailRequest,
  UpdateMailboxItemRequest,
  BulkMailboxActionRequest,
  MailSearchQuery,
  MailViewFolder,
  MailOperationalMetrics,
  MailOutboxFailure,
  MailAdminAddressSummary,
  AttachmentUploadResponse,
  MailOperationalDiagnostics,
} from '../types/admin';

export const mailApi = {
  /**
   * Get verified internal address for current authenticated user.
   */
  getMyAddress: async () => {
    const res = await apiClient.get<{ success: boolean; data: MailAddress }>('/mail/addresses/me');
    return res.data;
  },

  /**
   * Provision or customize local-part for user.
   */
  provisionAddress: async (data: { localPart: string; displayName?: string }) => {
    const res = await apiClient.post<{ success: boolean; data: MailAddress }>('/mail/addresses', data);
    return res.data;
  },

  /**
   * List paginated threads in a given folder (or 'STARRED' view).
   */
  listFolder: async (
    folder: MailViewFolder | string,
    params?: { page?: number; limit?: number; search?: string; isRead?: boolean; isStarred?: boolean }
  ) => {
    const res = await apiClient.get<{
      success: boolean;
      data: MailThreadSummary[];
      pagination?: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>(`/mail/folders/${folder.toLowerCase()}`, { params });
    return res.data;
  },

  /**
   * Get thread detail with messages and participant access verification.
   */
  getThreadDetail: async (threadId: string) => {
    const res = await apiClient.get<{
      success: boolean;
      data: {
        thread: { id: string; subject: string; messageCount: number; lastMessageAt: string };
        messages: MailMessageDetail[];
      };
    }>(`/mail/threads/${threadId}`);
    return res.data;
  },

  /**
   * Get single message detail (BCC omitted for non-senders).
   */
  getMessageDetail: async (messageId: string) => {
    const res = await apiClient.get<{ success: boolean; data: MailMessageDetail }>(`/mail/messages/${messageId}`);
    return res.data;
  },

  /**
   * Get total and unread counts across all mailbox folders.
   */
  getCounts: async () => {
    const res = await apiClient.get<{ success: boolean; data: MailFolderCounts }>('/mail/counts');
    return res.data;
  },

  /**
   * Create a new draft.
   */
  createDraft: async (data: CreateDraftRequest) => {
    const res = await apiClient.post<{ success: boolean; data: { message: MailMessageDetail } }>('/mail/drafts', data);
    return res.data;
  },

  /**
   * Update an existing draft, or send it by passing send=true.
   */
  updateDraft: async (draftId: string, data: Partial<CreateDraftRequest> & { send?: boolean }) => {
    const res = await apiClient.patch<{ success: boolean; data: any }>(`/mail/drafts/${draftId}`, data);
    return res.data;
  },

  /**
   * Atomically send a message (internal DB delivery).
   */
  sendMail: async (data: SendMailRequest) => {
    const headers: Record<string, string> = {};
    if (data.idempotencyKey) {
      headers['idempotency-key'] = data.idempotencyKey;
    }
    const res = await apiClient.post<{
      success: boolean;
      data: { message: any; thread: any; replayed?: boolean };
      message: string;
    }>('/mail/send', data, { headers });
    return res.data;
  },

  /**
   * Reply to a message in an existing thread.
   */
  replyMessage: async (messageId: string, data: ReplyMailRequest) => {
    const headers: Record<string, string> = {};
    if (data.idempotencyKey) {
      headers['idempotency-key'] = data.idempotencyKey;
    }
    const res = await apiClient.post<{ success: boolean; data: { message: any; thread: any } }>(
      `/mail/messages/${messageId}/reply`,
      data,
      { headers }
    );
    return res.data;
  },

  /**
   * Forward a message to recipients with citation headers.
   */
  forwardMessage: async (messageId: string, data: ForwardMailRequest) => {
    const headers: Record<string, string> = {};
    if (data.idempotencyKey) {
      headers['idempotency-key'] = data.idempotencyKey;
    }
    const res = await apiClient.post<{ success: boolean; data: { message: any; thread: any } }>(
      `/mail/messages/${messageId}/forward`,
      data,
      { headers }
    );
    return res.data;
  },

  /**
   * Update mailbox item (read, star, folder, labels).
   */
  updateItem: async (itemId: string, data: UpdateMailboxItemRequest) => {
    const res = await apiClient.patch<{ success: boolean; data: any }>(`/mail/items/${itemId}`, data);
    return res.data;
  },

  /**
   * Delete mailbox item (moves to TRASH, or permanently deletes if already in TRASH).
   */
  deleteItem: async (itemId: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/mail/items/${itemId}`);
    return res.data;
  },

  /**
   * Bulk action across multiple mailbox items.
   */
  bulkAction: async (data: BulkMailboxActionRequest) => {
    const res = await apiClient.post<{ success: boolean; data: { affected: number } }>('/mail/items/bulk', data);
    return res.data;
  },

  /**
   * Search messages across folders, senders, subjects, and dates.
   */
  searchMail: async (query: MailSearchQuery) => {
    const res = await apiClient.get<{
      success: boolean;
      data: MailThreadSummary[];
      pagination?: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>('/mail/search', { params: query });
    return res.data;
  },

  // ─── Attachments (Step 4 Security & Storage) ──────────────────────────────
  /**
   * Upload an attachment linked to a message or draft.
   */
  uploadAttachment: async (messageId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('messageId', messageId);

    const res = await apiClient.post<{
      success: boolean;
      data: AttachmentUploadResponse;
      message: string;
    }>('/mail/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * Download an attachment via authorized endpoint.
   */
  downloadAttachment: async (attachmentId: string, filename: string) => {
    const res = await apiClient.get(`/mail/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Get direct download endpoint URL for authenticated usage.
   */
  getAttachmentDownloadUrl: (attachmentId: string): string => {
    return `/api/v1/mail/attachments/${attachmentId}/download`;
  },

  // ─── Admin Control Plane (Step 4 SUPER_ADMIN & ADMIN) ─────────────────────
  /**
   * Get operational delivery metrics and queue health.
   */
  getAdminMetrics: async () => {
    const res = await apiClient.get<{ success: boolean; data: MailOperationalMetrics }>('/mail/admin/metrics');
    return res.data;
  },

  /**
   * Get outbox delivery failures for operational troubleshooting.
   */
  getOutboxFailures: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<{
      success: boolean;
      data: MailOutboxFailure[];
      pagination?: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>('/mail/admin/outbox-failures', { params });
    return res.data;
  },

  /**
   * List all internal mail addresses with user bindings and quotas.
   */
  getAdminAddresses: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<{
      success: boolean;
      data: MailAdminAddressSummary[];
      pagination?: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>('/mail/admin/addresses', { params });
    return res.data;
  },

  /**
   * Enable or disable an internal mail address.
   */
  updateAddressStatus: async (addressId: string, isActive: boolean) => {
    const res = await apiClient.patch<{ success: boolean; data: MailAddress }>(
      `/mail/admin/addresses/${addressId}/status`,
      { isActive }
    );
    return res.data;
  },

  /**
   * Enable or disable all mail access for a user.
   */
  toggleUserAccess: async (userId: string, isActive: boolean) => {
    const res = await apiClient.patch<{ success: boolean; data: { success: boolean; targetUserId: string; isActive: boolean } }>(
      `/mail/admin/users/${userId}/access`,
      { isActive }
    );
    return res.data;
  },

  /**
   * View immutable mail audit logs.
   */
  getAuditLogs: async (params?: { page?: number; limit?: number; actorUserId?: string }) => {
    const res = await apiClient.get<{
      success: boolean;
      data: any[];
      pagination?: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    }>('/mail/audit', { params });
    return res.data;
  },

  /**
   * Performance diagnostics, latency percentiles & queue telemetry (Step 5).
   */
  getDiagnostics: async () => {
    const res = await apiClient.get<{ success: boolean; data: MailOperationalDiagnostics }>(
      '/mail/admin/diagnostics'
    );
    return res.data;
  },

  /**
   * Public liveness check.
   */
  getHealth: async () => {
    const res = await apiClient.get<{ status: string; uptimeSeconds: number }>('/mail/health');
    return res.data;
  },

  /**
   * Public readiness check.
   */
  getReadiness: async () => {
    const res = await apiClient.get<{ status: string; database: any; queueDepth: number }>('/mail/ready');
    return res.data;
  },
};
