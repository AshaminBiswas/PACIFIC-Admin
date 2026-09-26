import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Mail,
  MessageSquare,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User,
  Send,
  ExternalLink,
  History,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Tag,
  FileText,
  Plus,
} from 'lucide-react';
import { salesQuotationsApi } from '../../api/salesQuotationsApi';
import type {
  SalesQuotation,
  QuotationFollowup,
  QuotationFollowupChannel,
  QuotationFollowupStatus,
} from '../../types/admin';

interface QuotationFollowupModalProps {
  quotation: SalesQuotation;
  isOpen: boolean;
  onClose: () => void;
  onFollowupLogged?: (updatedQuotation: SalesQuotation) => void;
}

const QUICK_DISCUSSION_CHIPS = [
  'Spoke with client, currently reviewing offer with management.',
  'Client requested price negotiation / discount.',
  'Shared formal quotation on WhatsApp, awaiting feedback.',
  'Client requested site visit / mockup cubicle inspection.',
  'Quotation accepted! Client preparing formal Purchase Order.',
  'No response on call; sent WhatsApp message and email summary.',
];

const STATUS_LABELS: Record<QuotationFollowupStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: 'Pending First Follow-up', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  SCHEDULED: { label: 'Scheduled Follow-up', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  INTERESTED: { label: 'Client Interested (Warm)', color: 'text-[#B5F823]', bg: 'bg-[#7FB706]/10', border: 'border-[#7FB706]/30' },
  PRICE_NEGOTIATION: { label: 'Price Negotiation', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  CALLBACK_REQUESTED: { label: 'Callback Requested', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  NO_ANSWER: { label: 'No Answer / Busy', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  ORDER_CONFIRMED: { label: 'Order Confirmed 🎉', color: 'text-emerald-300 font-bold', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
  DROPPED: { label: 'Dropped / Cancelled', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

export const QuotationFollowupModal: React.FC<QuotationFollowupModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onFollowupLogged,
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'email'>('log');
  const [followups, setFollowups] = useState<QuotationFollowup[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [channel, setChannel] = useState<QuotationFollowupChannel>('CALL');
  const [status, setStatus] = useState<QuotationFollowupStatus>('COMPLETED');
  const [discussionNotes, setDiscussionNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');

  // Email form state
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    subject: '',
    message: '',
    notes: '',
  });

  const quoteNum = quotation.referenceNumber || quotation.quotationNumber || '—';
  const clientName = quotation.recipientName || quotation.customer?.contactName || quotation.customer?.legalName || 'Client';
  const rawPhone = quotation.recipientPhone || quotation.customer?.phone || quotation.customer?.contactPhone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : rawPhone;
  const clientEmail = quotation.recipientEmail || quotation.customer?.email || quotation.customer?.contactEmail || '';
  const formattedAmount = `₹ ${Number(quotation.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Pre-filled WhatsApp message
  const whatsappPitch = useMemo(() => {
    return `Dear ${clientName},\n\nGreetings from Pacific Products & Solutions!\n\nWe are following up regarding your formal commercial quotation *${quoteNum}* for *${quotation.projectName || 'Toilet Cubicle Partitions'}* (Total: *${formattedAmount}*).\n\nCould you please let us know if the specifications meet your project requirements or if any adjustments/samples are needed?\n\nLooking forward to assisting you!\nBest regards,\nPacific Sales Team`;
  }, [clientName, quoteNum, quotation.projectName, formattedAmount]);

  // Pre-filled SMS message
  const smsPitch = useMemo(() => {
    return `Hello ${clientName}, following up on Pacific Quotation ${quoteNum} (${formattedAmount}) for ${quotation.projectName || 'Cubicles'}. Please let us know if you need any clarification or sample visit. Pacific Solutions.`;
  }, [clientName, quoteNum, formattedAmount, quotation.projectName]);

  // Fetch follow-up history
  const loadFollowups = async () => {
    setLoadingHistory(true);
    try {
      const res = await salesQuotationsApi.getFollowups(quotation.id);
      const list = (res.data?.data as any)?.followups || res.data?.data || [];
      setFollowups(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Failed to load quotation followups:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFollowups();
      // Initialize default next follow-up (+2.5 hrs if none scheduled)
      const defaultNext = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
      const isoLocal = new Date(defaultNext.getTime() - defaultNext.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setNextFollowupDate(isoLocal);
      setFeedback(null);
      setEmailForm({
        recipientEmail: clientEmail,
        subject: `Follow-up: Commercial Quotation ${quoteNum} — ${quotation.projectName || 'Restroom Cubicles'}`,
        message: `Dear ${clientName},\n\nWe are following up regarding the commercial proposal submitted for your restroom cubicle project.\n\nPlease let us know if you would like to proceed or require any technical clarifications, board color samples, or site measurement assistance.\n\nBest regards,\nPacific Products & Solutions`,
        notes: 'Follow-up email dispatched to client requesting feedback on proposal.',
      });
    }
  }, [isOpen, quotation.id]);

  // Quick next date setters
  const setQuickDate = (hoursAhead: number) => {
    const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setNextFollowupDate(iso);
  };

  const setTomorrowAt = (hour: number, minute: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, minute, 0, 0);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setNextFollowupDate(iso);
  };

  // Follow-up timing calculations
  const timingInfo = useMemo(() => {
    if (!quotation.nextFollowupDate) {
      return { status: 'NONE', text: 'No follow-up currently scheduled', color: 'text-gray-400 bg-white/5' };
    }
    const target = new Date(quotation.nextFollowupDate).getTime();
    const now = Date.now();
    const diffMin = Math.round((target - now) / (60 * 1000));

    if (diffMin < 0) {
      const overdueHours = Math.abs(Math.round(diffMin / 60));
      return {
        status: 'OVERDUE',
        text: `⚠️ Overdue by ${overdueHours > 0 ? `${overdueHours}h` : `${Math.abs(diffMin)}m`}`,
        color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
      };
    }
    if (diffMin <= 180) {
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return {
        status: 'DUE_SOON',
        text: `⏰ Due in ${hours > 0 ? `${hours}h ` : ''}${mins}m`,
        color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      };
    }
    return {
      status: 'SCHEDULED',
      text: `📅 Scheduled for ${new Date(quotation.nextFollowupDate).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    };
  }, [quotation.nextFollowupDate]);

  // Handle logging a follow-up
  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionNotes.trim()) {
      setFeedback({ type: 'error', message: 'Please enter discussion notes or select a quick template chip.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await salesQuotationsApi.createFollowup(quotation.id, {
        channel,
        status,
        discussionNotes: discussionNotes.trim(),
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
        contactPerson: clientName,
        contactPhone: rawPhone || undefined,
        contactEmail: clientEmail || undefined,
      });

      const updatedQuote = (res.data?.data as any)?.quotation;
      if (updatedQuote && onFollowupLogged) {
        onFollowupLogged(updatedQuote);
      }

      setFeedback({ type: 'success', message: 'Follow-up successfully recorded and next schedule updated!' });
      setDiscussionNotes('');
      await loadFollowups();
      setActiveTab('history');
    } catch (err: any) {
      console.error('Failed to log followup:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to record follow-up.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle sending email follow-up
  const handleSendEmailFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.recipientEmail) {
      setFeedback({ type: 'error', message: 'Recipient email is required.' });
      return;
    }

    setSendingEmail(true);
    setFeedback(null);
    try {
      const res = await salesQuotationsApi.sendFollowupEmail(quotation.id, {
        recipientEmail: emailForm.recipientEmail.trim(),
        subject: emailForm.subject.trim(),
        message: emailForm.message.trim(),
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : undefined,
        notes: emailForm.notes.trim() || undefined,
      });

      const updatedQuote = (res.data?.data as any)?.quotation;
      if (updatedQuote && onFollowupLogged) {
        onFollowupLogged(updatedQuote);
      }

      setFeedback({ type: 'success', message: `Follow-up email successfully sent to ${emailForm.recipientEmail}!` });
      await loadFollowups();
      setActiveTab('history');
    } catch (err: any) {
      console.error('Failed to dispatch follow-up email:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to dispatch email.' });
    } finally {
      setSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#030213] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-white/[0.02] flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm sm:text-base font-bold text-white">
                {quoteNum}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300 font-medium">
                {quotation.customer?.legalName || quotation.recipientCompany || 'Client'}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 ${timingInfo.color}`}
              >
                {timingInfo.text}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
              <span>Contact: <strong className="text-white">{clientName}</strong></span>
              {rawPhone && <span>Phone: <strong className="text-white font-mono">{rawPhone}</strong></span>}
              <span>Value: <strong className="text-[#7FB706]">{formattedAmount}</strong></span>
              {quotation.followupCount !== undefined && quotation.followupCount > 0 && (
                <span className="text-cyan-400">Total Follow-ups: {quotation.followupCount}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Omnichannel Quick Action Hub (Mobile-First 44px Buttons) */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-white/[0.01] to-white/[0.04]">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#B5F823]" /> One-Tap Instant Follow-Up Channels
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Phone Call */}
            <a
              href={rawPhone ? `tel:${cleanPhone}` : '#'}
              onClick={(e) => {
                if (!rawPhone) {
                  e.preventDefault();
                  alert('No phone number recorded for this client.');
                  return;
                }
                setChannel('CALL');
                setActiveTab('log');
              }}
              className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                rawPhone
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow-lg'
                  : 'bg-white/5 text-gray-500 opacity-60 cursor-not-allowed'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Call Client</span>
            </a>

            {/* WhatsApp */}
            <a
              href={rawPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappPitch)}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!rawPhone) {
                  e.preventDefault();
                  alert('No phone number recorded for this client.');
                  return;
                }
                setChannel('WHATSAPP');
                setActiveTab('log');
              }}
              className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                rawPhone
                  ? 'bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 shadow-lg'
                  : 'bg-white/5 text-gray-500 opacity-60 cursor-not-allowed'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>

            {/* Messages (SMS) */}
            <a
              href={rawPhone ? `sms:${cleanPhone}?body=${encodeURIComponent(smsPitch)}` : '#'}
              onClick={(e) => {
                if (!rawPhone) {
                  e.preventDefault();
                  alert('No phone number recorded for this client.');
                  return;
                }
                setChannel('SMS');
                setActiveTab('log');
              }}
              className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                rawPhone
                  ? 'bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 shadow-lg'
                  : 'bg-white/5 text-gray-500 opacity-60 cursor-not-allowed'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>SMS Direct</span>
            </a>

            {/* Email Dispatcher */}
            <button
              onClick={() => setActiveTab('email')}
              className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Send Email</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-4 pt-2 gap-4 bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('log')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer min-h-[40px] ${
              activeTab === 'log'
                ? 'text-[#B5F823] border-[#7FB706]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Record Follow-Up</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer min-h-[40px] ${
              activeTab === 'history'
                ? 'text-[#B5F823] border-[#7FB706]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Interaction History ({followups.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer min-h-[40px] ${
              activeTab === 'email'
                ? 'text-[#B5F823] border-[#7FB706]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Follow-up Hub</span>
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* TAB 1: RECORD NEW FOLLOW-UP */}
          {activeTab === 'log' && (
            <form onSubmit={handleSaveFollowup} className="space-y-4">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Follow-Up Channel Used
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'IN_PERSON', 'OTHER'] as QuotationFollowupChannel[]).map((ch) => (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={`min-h-[42px] px-2 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                        channel === ch
                          ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {ch === 'CALL' && <Phone className="w-3.5 h-3.5" />}
                      {ch === 'WHATSAPP' && <MessageCircle className="w-3.5 h-3.5" />}
                      {ch === 'EMAIL' && <Mail className="w-3.5 h-3.5" />}
                      {ch === 'SMS' && <MessageSquare className="w-3.5 h-3.5" />}
                      {ch === 'IN_PERSON' && <User className="w-3.5 h-3.5" />}
                      {ch === 'OTHER' && <Tag className="w-3.5 h-3.5" />}
                      <span>{ch.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Outcome */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Follow-Up Outcome / Quotation Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuotationFollowupStatus)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="COMPLETED" className="bg-[#030213] text-white">General Discussion Completed</option>
                  <option value="INTERESTED" className="bg-[#030213] text-white">Client Highly Interested (Warm Lead)</option>
                  <option value="PRICE_NEGOTIATION" className="bg-[#030213] text-white">Price Negotiation / Discount Requested</option>
                  <option value="CALLBACK_REQUESTED" className="bg-[#030213] text-white">Callback Requested at Specific Time</option>
                  <option value="NO_ANSWER" className="bg-[#030213] text-white">No Answer / Busy / Unreachable</option>
                  <option value="ORDER_CONFIRMED" className="bg-[#030213] text-emerald-400 font-bold">🎉 Order Confirmed (Accepts Quotation)</option>
                  <option value="DROPPED" className="bg-[#030213] text-rose-400">Dropped / Lost to Competitor</option>
                  <option value="SCHEDULED" className="bg-[#030213] text-white">Scheduled for Future Discussion</option>
                </select>
                {status === 'ORDER_CONFIRMED' && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Marking Order Confirmed will automatically update Quotation status to ACCEPTED.
                  </p>
                )}
              </div>

              {/* Quick Preset Discussion Chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Discussion Notes
                  </label>
                  <span className="text-[11px] text-gray-500">Tap chip to insert preset</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_DISCUSSION_CHIPS.map((chip, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setDiscussionNotes((prev) => (prev ? `${prev}\n${chip}` : chip))}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 transition-colors text-left"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={discussionNotes}
                  onChange={(e) => setDiscussionNotes(e.target.value)}
                  placeholder="Record client questions, requirements, objections, or commitments..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-[#7FB706]"
                  required
                />
              </div>

              {/* Next Follow-Up Schedule Picker */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#B5F823]" /> Next Follow-Up Date & Time
                  </label>
                  <span className="text-[11px] text-gray-400">Next touchpoint</span>
                </div>

                {/* Quick Schedule Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuickDate(2)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/20"
                  >
                    +2 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(4)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                  >
                    +4 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setTomorrowAt(10, 0)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20"
                  >
                    Tomorrow 10 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTomorrowAt(15, 0)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20"
                  >
                    Tomorrow 3 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(48)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(168)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                  >
                    In 1 Week
                  </button>
                </div>

                <input
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg shadow-[#7FB706]/20"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Follow-Up...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Follow-Up & Schedule Next Touchpoint</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: INTERACTION HISTORY TIMELINE */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Timeline of Past Interactions
                </h3>
                <button
                  onClick={loadFollowups}
                  disabled={loadingHistory}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#7FB706]" /> Loading history...
                </div>
              ) : followups.length === 0 ? (
                <div className="py-8 text-center bg-white/[0.02] rounded-xl border border-white/5 p-4">
                  <Clock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-300 font-semibold">No follow-ups recorded yet</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Team is scheduled to make the first contact within 2-3 hours of quotation generation.
                  </p>
                  <button
                    onClick={() => setActiveTab('log')}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-[#7FB706] text-black font-bold text-xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log First Follow-Up
                  </button>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                  {followups.map((item) => {
                    const st = STATUS_LABELS[item.status] || {
                      label: item.status,
                      color: 'text-gray-300',
                      bg: 'bg-white/5',
                      border: 'border-white/10',
                    };
                    return (
                      <div key={item.id} className="relative group">
                        {/* Timeline Bullet */}
                        <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-[#030213] border-2 border-[#7FB706] flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#B5F823]" />
                        </div>

                        {/* Card */}
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-white/5 flex items-center gap-1">
                                {item.channel === 'CALL' && <Phone className="w-3 h-3 text-emerald-400" />}
                                {item.channel === 'WHATSAPP' && <MessageCircle className="w-3 h-3 text-[#25D366]" />}
                                {item.channel === 'EMAIL' && <Mail className="w-3 h-3 text-indigo-400" />}
                                {item.channel === 'SMS' && <MessageSquare className="w-3 h-3 text-sky-400" />}
                                {item.channel}
                              </span>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${st.bg} ${st.color} ${st.border}`}>
                                {st.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-500 font-mono">
                              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                            {item.discussionNotes}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-white/5">
                            <span>Logged by: <strong className="text-gray-400">{item.performedByName || 'Staff'}</strong></span>
                            {item.nextFollowupDate && (
                              <span className="text-cyan-400 flex items-center gap-1 font-medium">
                                <Calendar className="w-3 h-3" /> Next: {new Date(item.nextFollowupDate).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EMAIL FOLLOW-UP HUB */}
          {activeTab === 'email' && (
            <form onSubmit={handleSendEmailFollowup} className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> Send Professional Follow-Up Email
                </p>
                <p className="text-[11px] text-indigo-300/80">
                  Sends an official follow-up email to the client, includes quotation summary reference, and automatically logs the action in your CRM timeline.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={emailForm.recipientEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                  placeholder="client@company.com"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Follow-up Message Body
                </label>
                <textarea
                  rows={5}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                  required
                />
              </div>

              {/* Next follow up date for email */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Schedule Next Follow-Up After Email
                </label>
                <input
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="w-full min-h-[46px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/30"
                >
                  {sendingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Follow-Up Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch Follow-Up Email & Update Timeline</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default QuotationFollowupModal;
