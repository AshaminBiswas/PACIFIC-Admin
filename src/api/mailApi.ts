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
};
