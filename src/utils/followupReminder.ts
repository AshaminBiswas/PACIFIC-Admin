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
 * No external MP3 dependencies required.
 */
export function playReminderChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: High crisp alert (784 Hz - G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, now);
    gain1.gain.setValueAtTime(0.2, now);
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
    gain2.gain.setValueAtTime(0.25, now + 0.15);
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
 * Retrieves all stored quotation reminders from localStorage.
 */
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
 */
export async function syncRemindersFromSupabase(): Promise<FollowupReminder[]> {
  try {
    const { data, error } = await supabase
      .from('quotation_followups')
      .select('id, quotationId, channel, discussionNotes, nextFollowupDate, contactPerson, contactPhone, contactEmail, createdAt, quotation:sales_quotations(referenceNumber)')
      .not('nextFollowupDate', 'is', null)
      .order('nextFollowupDate', { ascending: true });

    if (!error && Array.isArray(data)) {
      const current = getAllReminders();
      const currentMap = new Map(current.map((r) => [r.id, r]));

      const remoteReminders: FollowupReminder[] = data.map((row: any) => {
        const existing = currentMap.get(row.id);
        return {
          id: row.id,
          quotationId: row.quotationId,
          quotationNumber: row.quotation?.referenceNumber || existing?.quotationNumber || 'QUOTATION',
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pacific-reminders-updated'));
      }
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
    const now = Date.now();
    let mutated = false;

    const updated = list.map((r) => {
      if (r.fired) return r;
      const targetTime = new Date(r.scheduledAt).getTime();
      // If reminder is due or within 10 seconds past
      if (targetTime <= now) {
        triggerReminderAlarm(r);
        if (onDue) onDue(r);
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
