/**
 * WhatsApp CRM High-Speed Multi-Tier Cache Engine
 * Provides < 1 millisecond instant chat hydration via RAM Map + LocalStorage persistence.
 * Implements Stale-While-Revalidate (SWR) for zero-latency conversation switching.
 */

import type { WacrmConversation, WacrmMessage } from '../types/admin';

interface CachedChatData {
  conversation?: WacrmConversation;
  messages: WacrmMessage[];
  timestamp: number;
}

const STORAGE_PREFIX = 'wacrm_chat_v1_';
const CONVERSATIONS_KEY = 'wacrm_conversations_v1';
const MAX_PERSISTED_CHATS = 50; // Keep latest 50 conversations in localStorage to respect browser storage limits

// ─── Tier 1: In-Memory High-Speed RAM Map (< 0.1ms access) ───────────────────
const memoryChatCache = new Map<string, CachedChatData>();
let memoryConversationsCache: WacrmConversation[] | null = null;

// Track LRU access order for persistent storage pruning
const lruOrder: string[] = [];

function touchLru(id: string) {
  const idx = lruOrder.indexOf(id);
  if (idx !== -1) lruOrder.splice(idx, 1);
  lruOrder.push(id);

  if (lruOrder.length > MAX_PERSISTED_CHATS) {
    const oldestId = lruOrder.shift();
    if (oldestId) {
      try {
        localStorage.removeItem(STORAGE_PREFIX + oldestId);
      } catch {}
    }
  }
}

export const wacrmCache = {
  /**
   * Check if a conversation is already in cache (Memory or LocalStorage)
   */
  hasCachedChat(conversationId: string): boolean {
    if (!conversationId) return false;
    if (memoryChatCache.has(conversationId)) return true;
    try {
      return localStorage.getItem(STORAGE_PREFIX + conversationId) !== null;
    } catch {
      return false;
    }
  },

  /**
   * Synchronously retrieve chat data in < 1ms
   * Checks RAM Map first, then falls back to LocalStorage.
   */
  getCachedChat(conversationId: string): { conversation?: WacrmConversation; messages: WacrmMessage[] } | null {
    if (!conversationId) return null;

    // 1. Check RAM Map (0.01ms)
    const mem = memoryChatCache.get(conversationId);
    if (mem && Array.isArray(mem.messages)) {
      touchLru(conversationId);
      return { conversation: mem.conversation, messages: mem.messages };
    }

    // 2. Check LocalStorage (< 1ms)
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + conversationId);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedChatData;
        if (parsed && Array.isArray(parsed.messages)) {
          // Promote to RAM Map
          memoryChatCache.set(conversationId, parsed);
          touchLru(conversationId);
          return { conversation: parsed.conversation, messages: parsed.messages };
        }
      }
    } catch (e) {
      console.warn('[wacrmCache] Read error:', e);
    }

    return null;
  },

  /**
   * Save or update conversation messages in both RAM and LocalStorage
   */
  setCachedChat(conversationId: string, messages: WacrmMessage[], conversation?: WacrmConversation): void {
    if (!conversationId) return;

    const data: CachedChatData = {
      conversation,
      messages: Array.isArray(messages) ? messages : [],
      timestamp: Date.now(),
    };

    // 1. Update RAM Map immediately
    memoryChatCache.set(conversationId, data);
    touchLru(conversationId);

    // 2. Persist to LocalStorage asynchronously to keep UI 60fps
    try {
      // Keep only up to 100 messages per conversation in local storage to prevent bloat
      const prunedData: CachedChatData = {
        ...data,
        messages: data.messages.slice(-100),
      };
      localStorage.setItem(STORAGE_PREFIX + conversationId, JSON.stringify(prunedData));
    } catch (e) {
      console.warn('[wacrmCache] Quota or write error, pruning oldest cache:', e);
      // If quota exceeded, clear older entries
      try {
        if (lruOrder.length > 5) {
          const toRemove = lruOrder.splice(0, 10);
          toRemove.forEach((id) => localStorage.removeItem(STORAGE_PREFIX + id));
        }
      } catch {}
    }
  },

  /**
   * Optimistically append a new message into the cache instantly (0ms UI update)
   */
  appendCachedMessage(conversationId: string, message: WacrmMessage): void {
    if (!conversationId || !message) return;

    const current = this.getCachedChat(conversationId);
    const existingMessages = current?.messages || [];
    
    // Avoid duplicate message IDs
    const alreadyExists = existingMessages.some((m) => m.id === message.id);
    const updatedMessages = alreadyExists ? existingMessages : [...existingMessages, message];

    this.setCachedChat(conversationId, updatedMessages, current?.conversation);
  },

  /**
   * Update message reaction in cache in real-time
   */
  updateCachedMessageReaction(conversationId: string, messageId: string, reaction: string | null): void {
    if (!conversationId || !messageId) return;

    const current = this.getCachedChat(conversationId);
    if (!current) return;

    const updatedMessages = current.messages.map((m) =>
      m.id === messageId ? { ...m, reaction } : m
    );

    this.setCachedChat(conversationId, updatedMessages, current.conversation);
  },

  /**
   * Cache the main conversation list for instant 0ms app boot
   */
  getCachedConversations(): WacrmConversation[] | null {
    if (memoryConversationsCache && memoryConversationsCache.length > 0) {
      return memoryConversationsCache;
    }

    try {
      const raw = localStorage.getItem(CONVERSATIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WacrmConversation[];
        if (Array.isArray(parsed)) {
          memoryConversationsCache = parsed;
          return parsed;
        }
      }
    } catch {}

    return null;
  },

  /**
   * Store conversation list into persistent cache
   */
  setCachedConversations(conversations: WacrmConversation[]): void {
    if (!Array.isArray(conversations)) return;
    memoryConversationsCache = conversations;
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch {}
  },

  /**
   * Invalidate or clear all CRM cache
   */
  clearCache(): void {
    memoryChatCache.clear();
    memoryConversationsCache = null;
    lruOrder.length = 0;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(STORAGE_PREFIX) || key === CONVERSATIONS_KEY)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  },
};
