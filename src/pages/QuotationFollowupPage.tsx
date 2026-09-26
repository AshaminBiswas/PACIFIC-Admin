import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
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
  Building2,
  MapPin,
  CreditCard,
  Download,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { salesQuotationsApi } from '../api/salesQuotationsApi';
import type {
  SalesQuotation,
  QuotationFollowup,
  QuotationFollowupChannel,
  QuotationFollowupStatus,
} from '../types/admin';

const QUICK_DISCUSSION_CHIPS = [
  'Spoke with client, currently reviewing offer with management.',
  'Client requested price negotiation / discount.',
  'Shared formal quotation on WhatsApp, awaiting feedback.',
  'Client requested site visit / mockup cubicle inspection.',
  'Quotation accepted! Client preparing formal Purchase Order.',
  'No response on call; sent WhatsApp message and email summary.',
];

const STATUS_LABELS: Record<
  QuotationFollowupStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING: {
    label: 'Pending First Follow-up',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  SCHEDULED: {
    label: 'Scheduled Follow-up',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  INTERESTED: {
    label: 'Client Interested (Warm)',
    color: 'text-[#B5F823]',
    bg: 'bg-[#7FB706]/10',
    border: 'border-[#7FB706]/30',
  },
  PRICE_NEGOTIATION: {
    label: 'Price Negotiation',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  CALLBACK_REQUESTED: {
    label: 'Callback Requested',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  NO_ANSWER: {
    label: 'No Answer / Busy',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  ORDER_CONFIRMED: {
    label: 'Order Confirmed 🎉',
    color: 'text-emerald-300 font-bold',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
  },
  DROPPED: {
    label: 'Dropped / Cancelled',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
};

export default function QuotationFollowupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Quotation state
  const [quotation, setQuotation] = useState<SalesQuotation | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Follow-ups state
  const [followups, setFollowups] = useState<QuotationFollowup[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'email'>('log');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [channel, setChannel] = useState<QuotationFollowupChannel>('CALL');
  const [status, setStatus] = useState<QuotationFollowupStatus>('COMPLETED');
  const [discussionNotes, setDiscussionNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Email form state
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    subject: '',
    message: '',
    notes: '',
  });

  // Fetch quotation
  const loadQuotation = useCallback(async () => {
    if (!id) return;
    try {
      const res = await salesQuotationsApi.getById(id);
      const data = res.data?.data ?? (res.data as any);
      setQuotation(data);

      const clientName = data.recipientName || data.customer?.contactName || data.customer?.legalName || '';
      const rawPhone = data.recipientPhone || data.customer?.phone || data.customer?.contactPhone || '';
      const clientEmail = data.recipientEmail || data.customer?.email || data.customer?.contactEmail || '';
      const quoteNum = data.referenceNumber || data.quotationNumber || '—';

      setContactPerson(clientName);
      setContactPhone(rawPhone);
      setContactEmail(clientEmail);

      // Initialize email template
      setEmailForm({
        recipientEmail: clientEmail,
        subject: `Follow-up: Commercial Quotation ${quoteNum} — ${data.projectName || 'Restroom Cubicles'}`,
        message: `Dear ${clientName || 'Client'},\n\nWe are following up regarding the formal commercial proposal submitted for your restroom cubicle project (${quoteNum}).\n\nPlease let us know if you would like to proceed or require any technical clarifications, board color samples, or site measurement assistance.\n\nBest regards,\nPacific Products & Solutions`,
        notes: 'Follow-up email dispatched to client requesting feedback on proposal.',
      });

      // Default next follow-up: +2.5 hours if none set
      if (data.nextFollowupDate) {
        const d = new Date(data.nextFollowupDate);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setNextFollowupDate(iso);
      } else {
        const defaultNext = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
        const iso = new Date(defaultNext.getTime() - defaultNext.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setNextFollowupDate(iso);
      }
    } catch (err: any) {
      console.error('Failed to load quotation:', err);
      setQuoteError(err?.response?.data?.message || err?.message || 'Failed to load quotation details');
    } finally {
      setLoadingQuote(false);
    }
  }, [id]);

  // Fetch follow-ups list
  const loadFollowups = useCallback(async () => {
    if (!id) return;
    setLoadingHistory(true);
    try {
      const res = await salesQuotationsApi.getFollowups(id);
      const list = (res.data?.data as any)?.followups || res.data?.data || [];
      setFollowups(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Failed to load quotation followups:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [id]);

  useEffect(() => {
    loadQuotation();
    loadFollowups();
  }, [loadQuotation, loadFollowups]);

  // Derived values
  const quoteNum = quotation?.referenceNumber || quotation?.quotationNumber || '—';
  const clientName = quotation?.recipientName || quotation?.customer?.contactName || quotation?.customer?.legalName || 'Client';
  const rawPhone = quotation?.recipientPhone || quotation?.customer?.phone || quotation?.customer?.contactPhone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : rawPhone;
  const clientEmail = quotation?.recipientEmail || quotation?.customer?.email || quotation?.customer?.contactEmail || '';
  const formattedAmount = `₹ ${Number(quotation?.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Pre-filled WhatsApp message
  const whatsappPitch = useMemo(() => {
    return `Dear ${clientName},\n\nGreetings from Pacific Products & Solutions!\n\nWe are following up regarding your formal commercial quotation *${quoteNum}* for *${quotation?.projectName || 'Toilet Cubicle Partitions'}* (Total: *${formattedAmount}*).\n\nCould you please let us know if the specifications meet your project requirements or if any adjustments/samples are needed?\n\nLooking forward to assisting you!\nBest regards,\nPacific Sales Team`;
  }, [clientName, quoteNum, quotation?.projectName, formattedAmount]);

  // Pre-filled SMS message
  const smsPitch = useMemo(() => {
    return `Hello ${clientName}, following up on Pacific Quotation ${quoteNum} (${formattedAmount}) for ${quotation?.projectName || 'Cubicles'}. Please let us know if you need any clarification or sample visit. Pacific Solutions.`;
  }, [clientName, quoteNum, formattedAmount, quotation?.projectName]);

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
    if (!quotation?.nextFollowupDate) {
      return {
        status: 'NONE',
        text: 'No follow-up currently scheduled',
        color: 'text-gray-400 bg-white/5 border-white/10',
      };
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
  }, [quotation?.nextFollowupDate]);

  // Handle logging a follow-up
  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !quotation) return;
    if (!discussionNotes.trim()) {
      setFeedback({ type: 'error', message: 'Please enter discussion notes or select a quick template chip.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await salesQuotationsApi.createFollowup(id, {
        channel,
        status,
        discussionNotes: discussionNotes.trim(),
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
        contactPerson: contactPerson.trim() || clientName,
        contactPhone: contactPhone.trim() || rawPhone || undefined,
        contactEmail: contactEmail.trim() || clientEmail || undefined,
      });

      const updatedQuote = (res.data?.data as any)?.quotation;
      if (updatedQuote) {
        setQuotation(updatedQuote);
      } else {
        await loadQuotation();
      }

      setFeedback({ type: 'success', message: 'Follow-up successfully recorded and schedule updated!' });
      setDiscussionNotes('');
      await loadFollowups();
      setActiveTab('history');
    } catch (err: any) {
      console.error('Failed to log followup:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to record follow-up.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle sending email follow-up
  const handleSendEmailFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !quotation) return;
    if (!emailForm.recipientEmail) {
      setFeedback({ type: 'error', message: 'Recipient email is required.' });
      return;
    }

    setSendingEmail(true);
    setFeedback(null);
    try {
      const res = await salesQuotationsApi.sendFollowupEmail(id, {
        recipientEmail: emailForm.recipientEmail.trim(),
        subject: emailForm.subject.trim(),
        message: emailForm.message.trim(),
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : undefined,
        notes: emailForm.notes.trim() || undefined,
      });

      const updatedQuote = (res.data?.data as any)?.quotation;
      if (updatedQuote) {
        setQuotation(updatedQuote);
      } else {
        await loadQuotation();
      }

      setFeedback({
        type: 'success',
        message: `Follow-up email successfully sent to ${emailForm.recipientEmail}!`,
      });
      await loadFollowups();
      setActiveTab('history');
    } catch (err: any) {
      console.error('Failed to dispatch follow-up email:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to dispatch email.',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loadingQuote) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading Quotation & Follow-Up details...</p>
        </div>
      </div>
    );
  }

  if (quoteError || !quotation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md bg-[#121226] border border-white/5 rounded-2xl p-6">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Quotation Not Found</h2>
          <p className="text-red-400 text-sm">{quoteError || 'Could not load quotation details.'}</p>
          <Link
            to="/admin/dashboard/sales-quotations"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 rounded-xl text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quotations List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link
            to="/admin/dashboard/sales-quotations"
            className="hover:text-white transition-colors"
          >
            Sales Quotations
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <Link
            to={`/admin/dashboard/sales-quotations/${id}`}
            className="hover:text-white transition-colors font-mono"
          >
            {quoteNum}
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <span className="text-[#B5F823] font-semibold">Follow-Up & Discussion Hub</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/admin/dashboard/sales-quotations/${id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Quotation Details
          </Link>
          <a
            href={salesQuotationsApi.getDownloadPdfUrl(quotation.id)}
            target="_blank"
            rel="noopener noreferrer"
            download={`Quotation_${String(quoteNum || id || 'quote').replace(/[\/\\]/g, '_')}.pdf`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </a>
        </div>
      </div>

      {/* Main Quotation Header Banner */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
                <FileText className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white font-mono">
                {quoteNum}
              </h1>
              {quotation.revisionNumber > 1 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Rev {quotation.revisionNumber}
                </span>
              )}
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  quotation.status === 'CONVERTED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : quotation.status === 'SENT'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : quotation.status === 'ACCEPTED'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-white/5 text-gray-300 border-white/10'
                }`}
              >
                {quotation.status}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1.5 ${timingInfo.color}`}
              >
                {timingInfo.text}
              </span>
            </div>

            <p className="text-sm text-gray-300 font-medium">
              {quotation.customer?.legalName || quotation.recipientCompany || 'Commercial Client'}
              {quotation.projectName && (
                <span className="text-gray-400"> • Project: <strong className="text-white">{quotation.projectName}</strong></span>
              )}
            </p>
          </div>

          {/* Pricing & Key Metrics */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 min-w-[130px]">
              <div className="text-gray-400 text-[11px]">Grand Total</div>
              <div className="text-base font-bold text-[#7FB706] font-mono">
                {formattedAmount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 min-w-[130px]">
              <div className="text-gray-400 text-[11px]">Follow-Up Touches</div>
              <div className="text-base font-bold text-cyan-400 font-mono">
                {quotation.followupCount || 0} Recorded
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 min-w-[140px]">
              <div className="text-gray-400 text-[11px]">Lead Status</div>
              <div className="text-xs font-bold text-white mt-1">
                {quotation.followupStatus ? quotation.followupStatus.replace('_', ' ') : 'PENDING'}
              </div>
            </div>
          </div>
        </div>

        {/* Client Contact Details Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/5 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">
              Contact: <strong className="text-white">{clientName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate font-mono">
              {formattedPhone ? <strong className="text-white">{formattedPhone}</strong> : 'No phone recorded'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">
              {clientEmail ? <strong className="text-white">{clientEmail}</strong> : 'No email recorded'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">
              {quotation.siteAddress || quotation.recipientAddress || 'Site address not specified'}
            </span>
          </div>
        </div>
      </div>

      {/* Omnichannel One-Touch Action Bar (Mobile-First >= 44px) */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-2.5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#B5F823]" /> One-Tap Client Engagement Channels
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Phone Call */}
          <a
            href={cleanPhone ? `tel:${cleanPhone}` : '#'}
            onClick={(e) => {
              if (!cleanPhone) {
                e.preventDefault();
                alert('No contact phone recorded for this client.');
                return;
              }
              setChannel('CALL');
              setActiveTab('log');
            }}
            className={`min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all shadow-md ${
              cleanPhone
                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:shadow-emerald-500/10'
                : 'bg-white/5 text-gray-500 opacity-60 cursor-not-allowed'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Call Client</span>
          </a>

          {/* WhatsApp */}
          <a
            href={cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappPitch)}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!cleanPhone) {
                e.preventDefault();
                alert('No contact phone recorded for this client.');
                return;
              }
              setChannel('WHATSAPP');
              setActiveTab('log');
            }}
            className={`min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all shadow-md ${
              cleanPhone
                ? 'bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 hover:shadow-[#25D366]/10'
                : 'bg-white/5 text-gray-500 opacity-60 cursor-not-allowed'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>

          {/* Messages (SMS) */}
          <a
            href={cleanPhone ? `sms:${cleanPhone}?body=${encodeURIComponent(smsPitch)}` : '#'}
            onClick={(e) => {
              if (!cleanPhone) {
                e.preventDefault();
                alert('No contact phone recorded for this client.');
                return;
              }
              setChannel('SMS');
              setActiveTab('log');
            }}
            className={`min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all shadow-md ${
              cleanPhone
                ? 'bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 hover:shadow-sky-500/10'
                : 'bg-white/5 text-gray-500 opacity-60 cursor-not-allowed'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Direct SMS</span>
          </a>

          {/* Email Dispatcher Trigger */}
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md ${
              activeTab === 'email'
                ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Dispatch Email</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-white/10 gap-2 sm:gap-6 bg-transparent overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('log')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 cursor-pointer whitespace-nowrap px-1 ${
            activeTab === 'log'
              ? 'text-[#B5F823] border-[#7FB706]'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Record Follow-Up</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 cursor-pointer whitespace-nowrap px-1 ${
            activeTab === 'history'
              ? 'text-[#B5F823] border-[#7FB706]'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Interaction History ({followups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 cursor-pointer whitespace-nowrap px-1 ${
            activeTab === 'email'
              ? 'text-[#B5F823] border-[#7FB706]'
              : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email Follow-up Hub</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-3 border shadow-md ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TAB CONTENT */}

      {/* TAB 1: RECORD NEW FOLLOW-UP */}
      {activeTab === 'log' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form (8 cols on lg) */}
          <div className="lg:col-span-8 bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6">
            <form onSubmit={handleSaveFollowup} className="space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#B5F823]" /> Log Discussion & Update Status
              </h2>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Channel Used for This Follow-Up
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'IN_PERSON', 'OTHER'] as QuotationFollowupChannel[]).map(
                    (ch) => (
                      <button
                        type="button"
                        key={ch}
                        onClick={() => setChannel(ch)}
                        className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                          channel === ch
                            ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823] shadow-md shadow-[#7FB706]/10'
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
                    )
                  )}
                </div>
              </div>

              {/* Status Outcome */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Follow-Up Outcome & Pipeline Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuotationFollowupStatus)}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="COMPLETED" className="bg-[#030213] text-white">General Discussion Completed</option>
                  <option value="INTERESTED" className="bg-[#030213] text-[#B5F823] font-bold">Client Highly Interested (Warm Lead)</option>
                  <option value="PRICE_NEGOTIATION" className="bg-[#030213] text-orange-400">Price Negotiation / Discount Requested</option>
                  <option value="CALLBACK_REQUESTED" className="bg-[#030213] text-cyan-400">Callback Requested at Specific Time</option>
                  <option value="NO_ANSWER" className="bg-[#030213] text-yellow-400">No Answer / Busy / Unreachable</option>
                  <option value="ORDER_CONFIRMED" className="bg-[#030213] text-emerald-400 font-bold">🎉 Order Confirmed (Accepts Quotation)</option>
                  <option value="DROPPED" className="bg-[#030213] text-rose-400">Dropped / Lost to Competitor</option>
                  <option value="SCHEDULED" className="bg-[#030213] text-white">Scheduled for Future Discussion</option>
                </select>
                {status === 'ORDER_CONFIRMED' && (
                  <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Marking Order Confirmed will automatically update quotation status to ACCEPTED.
                  </p>
                )}
              </div>

              {/* Quick Discussion Chips & Textarea */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-300">
                    Discussion Summary & Client Feedback
                  </label>
                  <span className="text-[11px] text-gray-500">Tap chip to append quick preset</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {QUICK_DISCUSSION_CHIPS.map((chip, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setDiscussionNotes((prev) => (prev ? `${prev}\n${chip}` : chip))}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 transition-colors text-left cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={4}
                  value={discussionNotes}
                  onChange={(e) => setDiscussionNotes(e.target.value)}
                  placeholder="Record client questions, requirements, delivery timeline, pricing objections, or next steps..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#7FB706]"
                  required
                />
              </div>

              {/* Next Follow-Up Schedule Picker */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#B5F823]" /> Schedule Next Follow-Up Touchpoint
                  </label>
                  <span className="text-[11px] text-gray-400">Standard: 2-3h after quote</span>
                </div>

                {/* Quick Schedule Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickDate(2.5)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 font-semibold cursor-pointer"
                  >
                    +2.5 Hours (First Follow-up)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(4)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer"
                  >
                    +4 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setTomorrowAt(10, 0)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20 cursor-pointer"
                  >
                    Tomorrow 10 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTomorrowAt(15, 0)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20 cursor-pointer"
                  >
                    Tomorrow 3 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(48)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(168)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer"
                  >
                    In 1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setNextFollowupDate('')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 cursor-pointer"
                  >
                    No Further Follow-up
                  </button>
                </div>

                <input
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* Contact Details (Prefilled / Editable) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Spoke With (Person)
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Client contact"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg shadow-[#7FB706]/20"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Follow-Up Record...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Save Follow-Up & Update Schedule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Context / History Preview (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#B5F823]" /> Past Follow-Ups ({followups.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-[#7FB706] hover:underline"
                >
                  View All
                </button>
              </div>

              {followups.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-gray-400 space-y-2">
                  <Clock className="w-6 h-6 text-gray-500 mx-auto" />
                  <p>No prior follow-ups recorded.</p>
                  <p className="text-[11px] text-gray-500">
                    The team should make the first contact within 2-3 hours of quotation generation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followups.slice(0, 3).map((item) => {
                    const st = STATUS_LABELS[item.status] || {
                      label: item.status,
                      color: 'text-gray-300',
                      bg: 'bg-white/5',
                      border: 'border-white/10',
                    };
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1">
                            {item.channel === 'CALL' && <Phone className="w-3 h-3 text-emerald-400" />}
                            {item.channel === 'WHATSAPP' && <MessageCircle className="w-3 h-3 text-[#25D366]" />}
                            {item.channel === 'EMAIL' && <Mail className="w-3 h-3 text-indigo-400" />}
                            {item.channel === 'SMS' && <MessageSquare className="w-3 h-3 text-sky-400" />}
                            {item.channel}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.bg} ${st.color} ${st.border}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-gray-300 text-[11px] line-clamp-2">
                          {item.discussionNotes}
                        </p>
                        <div className="text-[10px] text-gray-500 flex justify-between pt-1 border-t border-white/5">
                          <span>{item.performedByName || 'Staff'}</span>
                          <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Direct Quotation Actions Card */}
            <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" /> Quotation Quick Summary
              </h3>
              <div className="text-xs space-y-2 text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-500">Quotation Date:</span>
                  <span className="text-white font-mono">{new Date(quotation.date).toLocaleDateString('en-GB')}</span>
                </div>
                {quotation.validUntil && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valid Until:</span>
                    <span className="text-amber-400 font-mono">{new Date(quotation.validUntil).toLocaleDateString('en-GB')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Terms:</span>
                  <span className="text-white">{quotation.paymentTerms || 'Standard'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Timeline:</span>
                  <span className="text-white">{quotation.deliveryTerms || '2-3 Weeks'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTION HISTORY TIMELINE */}
      {activeTab === 'history' && (
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-[#B5F823]" /> Complete Interaction & Follow-Up Timeline
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Every client touchpoint, call, WhatsApp message, email, and scheduled callback logged chronologically.
              </p>
            </div>
            <button
              onClick={loadFollowups}
              disabled={loadingHistory}
              className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-12 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#7FB706]" /> Loading interaction history...
            </div>
          ) : followups.length === 0 ? (
            <div className="py-12 text-center bg-white/[0.02] rounded-2xl border border-white/5 p-6 max-w-lg mx-auto space-y-3">
              <Clock className="w-10 h-10 text-gray-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Follow-Ups Logged Yet</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Pacific standard operational procedure requires the sales team to contact the client within 2 to 3 hours of sending the commercial proposal.
              </p>
              <button
                onClick={() => setActiveTab('log')}
                className="mt-2 px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Record First Follow-Up
              </button>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
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
                    <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-[#030213] border-2 border-[#7FB706] flex items-center justify-center shadow-md">
                      <div className="w-2 h-2 rounded-full bg-[#B5F823]" />
                    </div>

                    {/* Timeline Entry Card */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-bold text-white px-2.5 py-1 rounded-xl bg-white/5 flex items-center gap-1.5 border border-white/10">
                            {item.channel === 'CALL' && <Phone className="w-3.5 h-3.5 text-emerald-400" />}
                            {item.channel === 'WHATSAPP' && <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />}
                            {item.channel === 'EMAIL' && <Mail className="w-3.5 h-3.5 text-indigo-400" />}
                            {item.channel === 'SMS' && <MessageSquare className="w-3.5 h-3.5 text-sky-400" />}
                            {item.channel}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${st.bg} ${st.color} ${st.border}`}>
                            {st.label}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/5 text-gray-200 text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                        {item.discussionNotes}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/5 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span>Logged by: <strong className="text-white">{item.performedByName || 'Sales Staff'}</strong></span>
                          {item.contactPerson && (
                            <span>Spoke with: <strong className="text-gray-300">{item.contactPerson}</strong></span>
                          )}
                        </div>
                        {item.nextFollowupDate && (
                          <span className="text-cyan-400 flex items-center gap-1.5 font-medium bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                            <Calendar className="w-3.5 h-3.5" /> Next: {new Date(item.nextFollowupDate).toLocaleDateString('en-IN', {
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
        <div className="max-w-3xl mx-auto bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6">
          <form onSubmit={handleSendEmailFollowup} className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 space-y-1.5">
              <p className="font-bold text-sm flex items-center gap-2 text-indigo-300">
                <Mail className="w-4 h-4 text-indigo-400" /> Send Professional Follow-Up Email via Resend
              </p>
              <p className="text-indigo-300/80 leading-relaxed">
                Dispatches an official proposal follow-up email directly to the client with quotation reference {quoteNum}, formatted layout, and automatically creates a new touchpoint entry in your CRM timeline.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={emailForm.recipientEmail}
                onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                placeholder="client@company.com"
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#7FB706]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email Subject
              </label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#7FB706]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email Message Body
              </label>
              <textarea
                rows={7}
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-sans placeholder:text-gray-500 focus:outline-none focus:border-[#7FB706] leading-relaxed"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Internal CRM Log Note
              </label>
              <input
                type="text"
                value={emailForm.notes}
                onChange={(e) => setEmailForm({ ...emailForm, notes: e.target.value })}
                placeholder="Internal memo on why this follow-up email was dispatched..."
                className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500"
              />
            </div>

            {/* Next Touchpoint schedule if email sent */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#B5F823]" /> Set Next Touchpoint After Email
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
                className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching Official Email via Resend...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Follow-Up Email & Log Timeline Event</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
