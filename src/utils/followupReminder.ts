/**
 * Pacific Enterprise Follow-Up Reminder & Alarm Subsystem
 * Supports omnichannel browser notifications, audio chimes, and persistent local alarms.
 */

export interface FollowupReminder {
  id: string;
  quotationId: string;
  quotationNumber: string;
  clientName: string;
  channel: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'SMS' | 'IN_PERSON' | 'OTHER';
  scheduledAt: string; // ISO timestamp
  discussionNotes?: string;
  pdfUrl?: string;
  clientPhone?: string;
  clientEmail?: string;
  fired?: boolean;
  createdAt: string;
}

import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'pacific_quotation_reminders';
const DISMISSED_KEY = 'pacific_dismissed_reminders';

// Module-level throttle & shared audio context to prevent device collision
let lastChimeTime = 0;
let sharedAudioCtx: AudioContext | null = null;

/**
 * Checks if HTML5 Notification API is supported and permission is granted.
 */
export function hasNotificationPermission(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

/**
 * Requests desktop notification permission from user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Plays a crisp, professional dual-tone alarm chime using Web Audio API.
 * Throttled to at most once every 10 seconds to protect device renderer.
 */
export function playReminderChime(): void {
  if (typeof window === 'undefined') return;
  const nowMs = Date.now();
  if (nowMs - lastChimeTime < 10000) return;
  lastChimeTime = nowMs;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Tone 1: High crisp alert (784 Hz - G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: Harmonic resolution (1046.5 Hz - C6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.15);
    gain2.gain.setValueAtTime(0.2, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn('AudioContext chime blocked or unsupported:', e);
  }
}

/**
 * Retrieves dismissed reminder IDs to prevent recurrence.
 */
export function getDismissedReminderIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Marks a reminder ID permanently dismissed locally.
 */
export function markReminderDismissedLocally(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDismissedReminderIds();
    set.add(id);
    const arr = Array.from(set).slice(-500); // Retain last 500 dismissed
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
  } catch {}
}

/**
 * Retrieves all stored quotation reminders from local cache (0ms instant access).
 */
export function getAllReminders(): FollowupReminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Fetches reminders scheduled in Supabase quotation_followups table and merges into cache.
 * Excludes already resolved followups, dismissed reminders, and stale dates older than 2 hours.
 */
export async function syncRemindersFromSupabase(): Promise<FollowupReminder[]> {
  try {
    const recentThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('quotation_followups')
      .select('id, quotationId, channel, status, discussionNotes, nextFollowupDate, contactPerson, contactPhone, contactEmail, createdAt')
      .not('nextFollowupDate', 'is', null)
      .neq('status', 'RESOLVED')
      .gte('nextFollowupDate', recentThreshold)
      .order('nextFollowupDate', { ascending: true })
      .limit(50);

    if (!error && Array.isArray(data)) {
      const dismissedIds = getDismissedReminderIds();
      const current = getAllReminders();
      const currentMap = new Map(current.map((r) => [r.id, r]));

      const remoteReminders: FollowupReminder[] = data
        .filter((row: any) => !dismissedIds.has(row.id))
        .map((row: any) => {
          const existing = currentMap.get(row.id);
          return {
            id: row.id,
            quotationId: row.quotationId,
            quotationNumber: existing?.quotationNumber || 'QUOTATION',
            clientName: row.contactPerson || existing?.clientName || 'Valued Client',
            channel: (row.channel || 'CALL') as any,
            scheduledAt: new Date(row.nextFollowupDate).toISOString(),
            discussionNotes: row.discussionNotes || '',
            clientPhone: row.contactPhone || undefined,
            clientEmail: row.contactEmail || undefined,
            fired: existing?.fired || false,
            createdAt: row.createdAt || new Date().toISOString(),
          };
        });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteReminders));
      } catch {}

      return remoteReminders;
    }
  } catch (err) {
    console.warn('[followupReminder] Could not sync reminders from Supabase:', err);
  }
  return getAllReminders();
}

/**
 * Saves a new or updated reminder into local cache and persists to Supabase database.
 */
export function saveFollowupReminder(
  data: Omit<FollowupReminder, 'id' | 'createdAt' | 'fired'> & { id?: string }
): FollowupReminder {
  const current = getAllReminders();
  const id = data.id || `rem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const reminder: FollowupReminder = {
    ...data,
    id,
    fired: false,
    createdAt: new Date().toISOString(),
  };

  // Replace existing reminder for this quotation if present, or append
  const filtered = current.filter((r) => r.quotationId !== data.quotationId);
  filtered.push(reminder);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save reminder to localStorage:', err);
  }

  // Also broadcast event so open pages update their reminder badge
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pacific-reminders-updated', { detail: reminder }));
  }

  // Authoritative background persistence to Supabase database
  (async () => {
    try {
      await supabase.from('quotation_followups').upsert({
        id: reminder.id,
        quotationId: reminder.quotationId,
        channel: reminder.channel,
        status: 'PENDING',
        discussionNotes: reminder.discussionNotes || `Scheduled reminder for ${reminder.clientName}`,
        nextFollowupDate: reminder.scheduledAt,
        contactPerson: reminder.clientName,
        contactPhone: reminder.clientPhone,
        contactEmail: reminder.clientEmail,
      });
    } catch (err) {
      console.warn('Could not sync reminder to Supabase quotation_followups:', err);
    }
  })();

  return reminder;
}

/**
 * Retrieves active reminders specifically for a quotation ID.
 */
export function getRemindersForQuotation(quotationId: string): FollowupReminder[] {
  return getAllReminders().filter((r) => r.quotationId === quotationId);
}

/**
 * Dismisses / clears a reminder by ID and updates Supabase.
 */
export function dismissReminder(id: string): void {
  markReminderDismissedLocally(id);
  const current = getAllReminders();
  const updated = current.filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pacific-reminders-updated'));
  }

  (async () => {
    try {
      await supabase
        .from('quotation_followups')
        .update({ status: 'RESOLVED', nextFollowupDate: null })
        .eq('id', id);
    } catch {}
  })();
}

/**
 * Triggers a desktop notification and audio alarm for a due reminder.
 */
export function triggerReminderAlarm(reminder: FollowupReminder): void {
  playReminderChime();

  if (hasNotificationPermission()) {
    try {
      const channelLabel = reminder.channel.replace('_', ' ');
      const notif = new Notification(`⏰ Follow-Up Reminder: ${reminder.quotationNumber}`, {
        body: `Client: ${reminder.clientName}\nChannel: ${channelLabel}\n${reminder.discussionNotes ? `Notes: ${reminder.discussionNotes}` : 'Click to view quotation follow-up.'}`,
        icon: '/favicon.ico',
        tag: `reminder-${reminder.id}`,
        requireInteraction: true,
      });

      notif.onclick = () => {
        window.focus();
        window.location.href = `/admin/dashboard/sales-quotations/${reminder.quotationId}/follow-up`;
        notif.close();
      };
    } catch (e) {
      console.warn('Failed to fire desktop notification:', e);
    }
  }

  // Dispatch custom in-app event for toast or banner alerts
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pacific-reminder-due', { detail: reminder }));
  }
}

/**
 * Starts a lightweight interval monitor that checks for due reminders every 15 seconds.
 */
export function startReminderMonitor(
  onDue?: (reminder: FollowupReminder) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const checkDueReminders = () => {
    const list = getAllReminders();
    const dismissedIds = getDismissedReminderIds();
    const now = Date.now();
    let mutated = false;

    // Filter out dismissed
    const activeList = list.filter((r) => !dismissedIds.has(r.id));
    if (activeList.length !== list.length) {
      mutated = true;
    }

    const updated = activeList.map((r) => {
      if (r.fired) return r;
      const targetTime = new Date(r.scheduledAt).getTime();
      // Only fire if reminder is due and not ancient (> 1 hour late)
      if (targetTime <= now && now - targetTime < 60 * 60 * 1000) {
        triggerReminderAlarm(r);
        if (onDue) onDue(r);
        mutated = true;
        return { ...r, fired: true };
      } else if (targetTime <= now) {
        // Ancient overdue reminder, mark fired without alarm
        mutated = true;
        return { ...r, fired: true };
      }
      return r;
    });

    if (mutated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  };

  // Run initial check and sync fresh reminders from Supabase
  checkDueReminders();
  syncRemindersFromSupabase().then(() => checkDueReminders());
  const intervalId = setInterval(checkDueReminders, 15000);

  return () => clearInterval(intervalId);
}
