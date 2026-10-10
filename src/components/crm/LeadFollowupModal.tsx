import React, { useState } from 'react';
import {
  X,
  Clock,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Send,
  User,
  Flame,
  FileText,
  ThumbsUp,
} from 'lucide-react';
import { leadManagementApi } from '../../api/leadManagementApi';
import type {
  Lead,
  LeadFollowupChannel,
  LeadStatus,
} from '../../types/admin';

interface LeadFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead: Lead | null;
}

const CHANNELS: {
  id: LeadFollowupChannel;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { id: 'PHONE_CALL', label: 'Phone Call', icon: Phone, color: 'text-amber-400 bg-amber-500/10' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/10' },
  { id: 'EMAIL', label: 'Email', icon: Mail, color: 'text-sky-400 bg-sky-500/10' },
  { id: 'SITE_VISIT', label: 'Site Visit / Meeting', icon: MapPin, color: 'text-purple-400 bg-purple-500/10' },
];

const OUTCOMES = [
  { value: 'INTEREST_CONFIRMED', label: '⭐ Customer Confirmed Interest (Awaiting Quote)', defaultStatus: 'INTERESTED' as LeadStatus },
  { value: 'QUOTATION_DISCUSSED', label: '📄 Quotation Discussed / Reviewed', defaultStatus: 'NEGOTIATING' as LeadStatus },
  { value: 'PRICE_NEGOTIATION', label: '💰 Price / Terms Negotiation', defaultStatus: 'NEGOTIATING' as LeadStatus },
  { value: 'SAMPLE_REQUESTED', label: '📦 Requested Board / Hardware Samples', defaultStatus: 'REQUIREMENT_GATHERED' as LeadStatus },
  { value: 'DRAWINGS_AWAITED', label: '📐 Awaiting Layout Drawings / Site Measurements', defaultStatus: 'REQUIREMENT_GATHERED' as LeadStatus },
  { value: 'CALLBACK_REQUESTED', label: '⏰ Callback Requested by Client', defaultStatus: undefined },
  { value: 'NO_ANSWER', label: '❌ Phone Busy / No Answer', defaultStatus: undefined },
  { value: 'ORDER_CONFIRMED', label: '🏆 Won / Order Confirmed!', defaultStatus: 'WON' as LeadStatus },
  { value: 'LOST', label: '🚫 Dropped / Competitor Chosen', defaultStatus: 'LOST' as LeadStatus },
];

export default function LeadFollowupModal({
  isOpen,
  onClose,
  onSuccess,
  lead,
}: LeadFollowupModalProps) {
  const [channel, setChannel] = useState<LeadFollowupChannel>('PHONE_CALL');
  const [outcome, setOutcome] = useState('INTEREST_CONFIRMED');
  const [discussionNotes, setDiscussionNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [nextFollowupTime, setNextFollowupTime] = useState('11:00');
  const [updateStatus, setUpdateStatus] = useState<LeadStatus | ''>('INTERESTED');
  const [performedByName, setPerformedByName] = useState('Sales Executive');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  // Handle outcome change to auto-suggest new status
  const handleOutcomeChange = (newOutcome: string) => {
    setOutcome(newOutcome);
    const match = OUTCOMES.find((o) => o.value === newOutcome);
    if (match && match.defaultStatus) {
      setUpdateStatus(match.defaultStatus);
    }
  };

  // Quick Preset Handlers
  const handleSetPresetDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setNextFollowupDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!discussionNotes.trim()) {
      setError('Please enter discussion summary notes.');
      return;
    }

    try {
      setIsSubmitting(true);
      const combinedNextDateTime = nextFollowupDate
        ? `${nextFollowupDate}T${nextFollowupTime || '11:00'}:00.000Z`
        : null;

      await leadManagementApi.addFollowup(lead.id, {
        channel,
        outcome,
        discussionNotes: discussionNotes.trim(),
        nextFollowupDate: combinedNextDateTime,
        nextFollowupTime,
        contactPerson: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        contactPhone: lead.phone,
        performedByName,
        updateLeadStatus: updateStatus ? (updateStatus as LeadStatus) : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to log follow-up record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Log Omnichannel Follow-Up</h2>
              <p className="text-xs text-gray-400">
                Record customer interaction for {lead.firstName} {lead.lastName || ''} ({lead.company || 'Client'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Step 1: Communication Channel */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Communication Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHANNELS.map((ch) => {
                const Icon = ch.icon;
                const isSelected = channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannel(ch.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 text-xs font-semibold ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500/50 text-white shadow-lg shadow-sky-950/40'
                        : 'bg-white/5 border-white/5 hover:border-white/15 text-gray-400'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${ch.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Discussion Outcome & Sentiment */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Call / Touchpoint Outcome
            </label>
            <select
              value={outcome}
              onChange={(e) => handleOutcomeChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Discussion Summary Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Discussion Summary Notes *
            </label>
            <textarea
              required
              rows={3}
              value={discussionNotes}
              onChange={(e) => setDiscussionNotes(e.target.value)}
              className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
              placeholder="e.g. Spoke with Project Manager. Client confirmed they are interested in 12mm Compact Board with SS304 fittings. Requested quotation and board sample by Wednesday."
            />
          </div>

          {/* Step 4: Advance Status on Lead */}
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2">
            <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider block">
              Update Lead Status (Optional)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {(['INTERESTED', 'QUOTATION_SENT', 'NEGOTIATING', 'WON', 'LOST'] as LeadStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setUpdateStatus(updateStatus === st ? '' : st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition border ${
                    updateStatus === st
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {st === 'INTERESTED' && '⭐ '}
                  {st === 'QUOTATION_SENT' && '📄 '}
                  {st === 'NEGOTIATING' && '💰 '}
                  {st === 'WON' && '🏆 '}
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Step 5: Schedule Next Follow-up */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Schedule Next Follow-Up Date & Time
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleSetPresetDate(1)}
                  className="px-2 py-0.5 rounded bg-white/10 text-gray-300 hover:text-white"
                >
                  +24h
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetDate(2)}
                  className="px-2 py-0.5 rounded bg-white/10 text-gray-300 hover:text-white"
                >
                  +48h
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetDate(7)}
                  className="px-2 py-0.5 rounded bg-white/10 text-gray-300 hover:text-white"
                >
                  +1 Wk
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <input
                  type="time"
                  value={nextFollowupTime}
                  onChange={(e) => setNextFollowupTime(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 transition shadow-lg shadow-sky-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Recording Touchpoint...' : 'Log Follow-Up Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
