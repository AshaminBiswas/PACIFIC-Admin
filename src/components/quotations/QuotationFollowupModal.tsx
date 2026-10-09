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
  Bell,
  BellRing,
  Copy,
  Check,
  Eye,
  Download,
  ShieldCheck,
  Award,
  ChevronRight,
  Share2,
  Link2,
} from 'lucide-react';
import { salesQuotationsApi } from '../../api/salesQuotationsApi';
import type {
  SalesQuotation,
  QuotationFollowup,
  QuotationFollowupChannel,
  QuotationFollowupStatus,
} from '../../types/admin';
import {
  hasNotificationPermission,
  requestNotificationPermission,
  saveFollowupReminder,
  playReminderChime,
} from '../../utils/followupReminder';

interface QuotationFollowupModalProps {
  quotation: SalesQuotation;
  isOpen: boolean;
  onClose: () => void;
  onFollowupLogged?: (updatedQuotation: SalesQuotation) => void;
}

type FollowupTab = 'WHATSAPP' | 'EMAIL' | 'CALL' | 'SMS' | 'HISTORY';
type FollowupScenario = 'STANDARD' | 'URGENT_VALIDITY' | 'PRICE_NEGOTIATION' | 'SAMPLE_REQUEST' | 'ORDER_CONFIRMATION';

const QUICK_DISCUSSION_CHIPS = [
  'Spoke with client, currently reviewing offer with management.',
  'Client requested price negotiation / commercial discount.',
  'Shared formal quotation on WhatsApp with PDF attachment, awaiting review.',
  'Client requested site survey and physical mockup cubicle inspection.',
  'Quotation accepted! Client preparing formal Purchase Order.',
  'No response on call; dispatched WhatsApp proposal link and email summary.',
  'Client requested revised drawing / alternate hardware finish.',
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
  PAUSED: { label: 'Timer Paused ⏸', color: 'text-amber-300 font-bold', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  DROPPED: { label: 'Dropped / Cancelled', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

const SCENARIOS: { id: FollowupScenario; label: string; badge: string; icon: string }[] = [
  { id: 'STANDARD', label: 'Standard Follow-up', badge: 'Courteous Review', icon: '🌟' },
  { id: 'URGENT_VALIDITY', label: 'Validity Expiring', badge: 'Time Sensitive', icon: '⏰' },
  { id: 'PRICE_NEGOTIATION', label: 'Price Negotiation', badge: 'Commercial Value', icon: '💰' },
  { id: 'SAMPLE_REQUEST', label: 'Sample / Site Visit', badge: 'Technical Inspection', icon: '📐' },
  { id: 'ORDER_CONFIRMATION', label: 'Order Closing', badge: 'PO & Advance', icon: '🎉' },
];

export const QuotationFollowupModal: React.FC<QuotationFollowupModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onFollowupLogged,
}) => {
  const [activeTab, setActiveTab] = useState<FollowupTab>('WHATSAPP');
  const [scenario, setScenario] = useState<FollowupScenario>('STANDARD');
  const [followups, setFollowups] = useState<QuotationFollowup[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Reminder & Alarm State
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [hasNotifPermission, setHasNotifPermission] = useState(hasNotificationPermission());

  // Follow-up status outcome
  const [status, setStatus] = useState<QuotationFollowupStatus>('COMPLETED');

  // Contact details
  const quoteNum = quotation.referenceNumber || quotation.quotationNumber || '—';
  const clientName = quotation.recipientName || quotation.customer?.contactName || quotation.customer?.legalName || 'Valued Client';
  const rawPhone = quotation.recipientPhone || quotation.customer?.phone || quotation.customer?.contactPhone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : rawPhone;
  const clientEmail = quotation.recipientEmail || quotation.customer?.email || quotation.customer?.contactEmail || '';
  const formattedAmount = `₹ ${Number(quotation.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const validUntilFormatted = quotation.validUntil
    ? new Date(quotation.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Within 15 Days';
  const projectName = quotation.projectName || quotation.subject || 'Restroom Cubicles Project';

  // Quotation Document URLs (Clean short links without personal JWT tokens)
  const shortDocUrl = salesQuotationsApi.getShortUrl(quotation.id, false);
  const pdfDownloadUrl = salesQuotationsApi.getShortUrl(quotation.id, true);
  const pdfPreviewUrl = salesQuotationsApi.getPdfUrl(quotation.id);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.pacificproduct.in';
  const verifyUrl = `${origin}/verify/${quotation.verificationToken || quotation.id}`;

  // Channel Form States
  const [whatsappText, setWhatsappText] = useState('');
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    subject: '',
    message: '',
    notes: '',
  });
  const [smsText, setSmsText] = useState('');
  const [callNotes, setCallNotes] = useState('');

  // Auto-generate messages based on scenario and quotation context
  useEffect(() => {
    // 1. WhatsApp Template
    let wa = '';
    if (scenario === 'STANDARD') {
      wa = `Dear ${clientName},\n\nGreetings from *Pacific Products & Solutions*! 👋\n\nWe are following up regarding your formal commercial proposal *${quoteNum}* for *${projectName}* (Total: *${formattedAmount}*).\n\n📄 *Attached Quotation Document (PDF):*\n${pdfDownloadUrl}\n\n✨ *Key Specifications Included:*\n• 12mm Compact Laminate (HPL) Moisture-Resistant Board\n• Grade 304 Stainless Steel Architectural Hardware\n• 10-Year Board Warranty + 1-Year Hardware Guarantee\n• Heavy-duty, anti-bacterial & fire-retardant build\n\nCould you please let us know if the specifications meet your requirements or if you would like to schedule a site survey or sample inspection?\n\nLooking forward to assisting you!\nBest regards,\n*Pacific Sales & Project Team*`;
    } else if (scenario === 'URGENT_VALIDITY') {
      wa = `Dear ${clientName},\n\n⏰ *Urgent Validity Notice* from Pacific Products & Solutions.\n\nThis is a gentle reminder regarding commercial proposal *${quoteNum}* for *${projectName}* (Amount: *${formattedAmount}*).\n\n⚠️ *Validity Notice:* The current approved rates are valid until *${validUntilFormatted}*. After this date, raw material and dispatch schedules will require re-validation.\n\n📄 *Attached Quotation (PDF):*\n${pdfDownloadUrl}\n\nTo lock in the factory production slot and guarantee current pricing, please share your confirmation or Purchase Order.\n\nBest regards,\nPacific Sales Team`;
    } else if (scenario === 'PRICE_NEGOTIATION') {
      wa = `Dear ${clientName},\n\nThank you for discussing the commercial terms for *${quoteNum}* (*${projectName}*).\n\n📄 *Attached Quotation (PDF):*\n${pdfDownloadUrl}\n\nWe understand your budget parameters and value this partnership. We can explore value-engineered hardware options or special volume packaging to meet your target budget while preserving our 10-year warranty standard.\n\nCould we connect for a brief 5-minute call today to finalize mutually agreeable terms?\n\nWarm regards,\n*Pacific Commercial Division*`;
    } else if (scenario === 'SAMPLE_REQUEST') {
      wa = `Dear ${clientName},\n\nGreetings from Pacific Products & Solutions!\n\nRegarding quotation *${quoteNum}* for *${projectName}* (${formattedAmount}), our project engineer is available to bring physical *12mm Compact Laminate board shade samples* and *Grade 304 SS hardware mockups* to your office or site.\n\n📄 *View Attached Quotation:* ${pdfDownloadUrl}\n\nPlease share a convenient date and time for the mockup inspection.\n\nBest regards,\nPacific Technical Team`;
    } else {
      wa = `Dear ${clientName},\n\n🎉 Fantastic news! We are ready to proceed with quotation *${quoteNum}* for *${projectName}* (Grand Total: *${formattedAmount}*).\n\n📄 *Official Quotation PDF:* ${pdfDownloadUrl}\n\nKindly share your formal Purchase Order (PO) and billing GST details so our factory can immediately initiate fabrication and issue the Proforma Invoice.\n\nThank you for choosing Pacific!\nPacific Projects Team`;
    }
    setWhatsappText(wa);

    // 2. Email Subject & Body
    let subj = '';
    let body = '';
    if (scenario === 'STANDARD') {
      subj = `Follow-up: Commercial Quotation ${quoteNum} — ${projectName} | Pacific Products`;
      body = `Dear ${clientName},\n\nWe hope this email finds you well.\n\nWe are following up regarding the commercial proposal ${quoteNum} submitted for ${projectName}, amounting to ${formattedAmount} (incl. GST).\n\nPlease note that the formal quotation letter has been attached as a PDF document for your review and archival. You may also access the authenticated vector copy directly via this link:\n${pdfDownloadUrl}\n\nProposal Highlights:\n• Quotation Ref: ${quoteNum}\n• Project: ${projectName}\n• Grand Total: ${formattedAmount}\n• Validity: ${validUntilFormatted}\n• Specifications: 12mm Compact Laminate (HPL) Board, Grade 304 Stainless Steel Hardware, 10-Year Warranty.\n\nOur engineering team is at your disposal to coordinate physical color swatches, technical drawings, or site measurements.\n\nKindly let us know how you would like to proceed.\n\nWarm regards,\nSales & Projects Team\nPacific Products & Solutions\nhttps://www.pacificproduct.in`;
    } else if (scenario === 'URGENT_VALIDITY') {
      subj = `Action Required: Quotation Validity Ending Soon — ${quoteNum} (${projectName})`;
      body = `Dear ${clientName},\n\nThis is a priority notification regarding quotation proposal ${quoteNum} for ${projectName} (Total: ${formattedAmount}).\n\nThe commercial terms and factory production slot allocated for this project are valid until ${validUntilFormatted}. To ensure no project delays and maintain the approved pricing, we request you to review the attached quotation PDF and confirm your acceptance.\n\nDirect PDF Link: ${pdfDownloadUrl}\n\nPlease let us know if you require any final clarifications today.\n\nBest regards,\nCommercial Management\nPacific Products & Solutions`;
    } else if (scenario === 'PRICE_NEGOTIATION') {
      subj = `Commercial Discussion & Value Optimization: Quotation ${quoteNum} (${projectName})`;
      body = `Dear ${clientName},\n\nThank you for your valuable feedback regarding quotation ${quoteNum} (${formattedAmount}).\n\nWe are keen to support your project and are open to reviewing volume discounts and commercial payment schedules that meet your budgetary requirements without compromising on our high durability standards.\n\nPlease find the quotation attached for reference: ${pdfDownloadUrl}\n\nLet us know when we can arrange a brief discussion to finalize terms.\n\nSincerely,\nPacific Commercial Division`;
    } else if (scenario === 'SAMPLE_REQUEST') {
      subj = `Material Sample & Technical Mockup: Quotation ${quoteNum} (${projectName})`;
      body = `Dear ${clientName},\n\nTo assist your team in finalizing the cubicle finish and hardware package for ${projectName} (Quotation ${quoteNum}), we would be delighted to arrange a physical sample kit containing our 12mm HPL board swatches and Grade 304 SS accessories.\n\nAttached Quotation: ${pdfDownloadUrl}\n\nPlease let us know your preferred site address and convenient time for our executive to visit.\n\nBest regards,\nPacific Technical Team`;
    } else {
      subj = `Quotation Acceptance & Next Steps: ${quoteNum} — ${projectName}`;
      body = `Dear ${clientName},\n\nThank you for approving quotation ${quoteNum} for ${projectName} (Total: ${formattedAmount}).\n\nPlease find the final verified quotation PDF attached: ${pdfDownloadUrl}\n\nTo schedule immediate factory dispatch, kindly provide:\n1. Your formal Purchase Order (PO)\n2. Confirmed delivery site address & contact person\n3. GSTIN registration certificate\n\nWe look forward to a successful project delivery.\n\nWarm regards,\nPacific Order Fulfillment Team`;
    }

    setEmailForm((prev) => ({
      ...prev,
      recipientEmail: clientEmail || prev.recipientEmail,
      subject: subj,
      message: body,
      notes: `Dispatched ${scenario} follow-up email to client.`,
    }));

    // 3. SMS Template
    let sms = '';
    if (scenario === 'STANDARD') {
      sms = `Hello ${clientName}, following up on Pacific Quotation ${quoteNum} (${formattedAmount}) for ${projectName}. Attached PDF: ${verifyUrl} - Pacific Solutions.`;
    } else if (scenario === 'URGENT_VALIDITY') {
      sms = `Urgent: Pacific Quotation ${quoteNum} (${formattedAmount}) validity ends on ${validUntilFormatted}. Confirm now to lock price: ${verifyUrl} - Pacific.`;
    } else if (scenario === 'PRICE_NEGOTIATION') {
      sms = `Hello ${clientName}, regarding quote ${quoteNum} (${formattedAmount}), we reviewed your budget request. Let's connect for 2 mins: ${verifyUrl} - Pacific.`;
    } else {
      sms = `Hello ${clientName}, ready to initiate production for Pacific Quote ${quoteNum} (${formattedAmount}). View quote: ${verifyUrl} - Pacific.`;
    }
    setSmsText(sms);
  }, [scenario, clientName, quoteNum, projectName, formattedAmount, validUntilFormatted, pdfDownloadUrl, verifyUrl, clientEmail]);

  // Load history on open
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
      // Initialize default next follow-up (+2.5 hrs standard rule)
      const defaultNext = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
      const isoLocal = new Date(defaultNext.getTime() - defaultNext.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setNextFollowupDate(isoLocal);
      setFeedback(null);
      setHasNotifPermission(hasNotificationPermission());
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
      return { status: 'NONE', text: 'No reminder scheduled', color: 'text-gray-400 bg-white/5 border-white/10' };
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
      text: `📅 Scheduled: ${new Date(quotation.nextFollowupDate).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    };
  }, [quotation.nextFollowupDate]);

  // Request browser notification permission
  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setHasNotifPermission(res === 'granted');
    if (res === 'granted') {
      playReminderChime();
      setFeedback({ type: 'success', message: '🔔 Desktop alarm notifications enabled! You will be alerted when reminders are due.' });
    } else {
      setFeedback({ type: 'error', message: 'Notification permission was dismissed or denied in browser settings.' });
    }
  };

  // Copy helper with feedback
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Helper to persist reminder locally and play preview chime
  const scheduleLocalReminderAlarm = (channelUsed: QuotationFollowupChannel, notes: string) => {
    if (!nextFollowupDate) return;
    try {
      const targetIso = new Date(nextFollowupDate).toISOString();
      saveFollowupReminder({
        quotationId: quotation.id,
        quotationNumber: quoteNum,
        clientName,
        channel: channelUsed,
        scheduledAt: targetIso,
        discussionNotes: notes,
        pdfUrl: pdfDownloadUrl,
        clientPhone: rawPhone,
        clientEmail,
      });
      if (alarmEnabled) {
        playReminderChime();
      }
    } catch (e) {
      console.warn('Failed to schedule local reminder alarm:', e);
    }
  };

  // 1. WhatsApp Action
  const handleSendWhatsApp = async () => {
    if (!rawPhone) {
      setFeedback({ type: 'error', message: 'Client does not have a recorded phone number.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const notes = `Dispatched WhatsApp follow-up (${scenario.replace('_', ' ')}). Message: "${whatsappText.slice(0, 120)}..."`;
      const res = await salesQuotationsApi.createFollowup(quotation.id, {
        channel: 'WHATSAPP',
        status,
        discussionNotes: notes,
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
        contactPerson: clientName,
        contactPhone: rawPhone,
        contactEmail: clientEmail || undefined,
      });

      scheduleLocalReminderAlarm('WHATSAPP', notes);

      const updatedQuote = (res.data?.data as any)?.quotation;
      if (updatedQuote && onFollowupLogged) onFollowupLogged(updatedQuote);

      // Open WhatsApp Web / App
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`, '_blank');

      setFeedback({ type: 'success', message: 'WhatsApp message prepared & reminder alarm successfully scheduled!' });
      await loadFollowups();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to save follow-up.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Email Action
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.recipientEmail) {
      setFeedback({ type: 'error', message: 'Recipient email address is required.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await salesQuotationsApi.sendFollowupEmail(quotation.id, {
        recipientEmail: emailForm.recipientEmail.trim(),
        subject: emailForm.subject.trim(),
        message: emailForm.message.trim(),
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : undefined,
        notes: emailForm.notes.trim() || `Follow-up email dispatched (${scenario}) with quotation PDF attached.`,
      });

      scheduleLocalReminderAlarm('EMAIL', emailForm.subject);

      const updatedQuote = (res.data?.data as any)?.quotation;
      if (updatedQuote && onFollowupLogged) onFollowupLogged(updatedQuote);

      setFeedback({ type: 'success', message: `Quotation PDF & follow-up email dispatched to ${emailForm.recipientEmail}!` });
      await loadFollowups();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to dispatch email.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Call Action
  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callNotes.trim()) {
      setFeedback({ type: 'error', message: 'Please enter discussion notes or select a quick chip.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await salesQuotationsApi.createFollowup(quotation.id, {
        channel: 'CALL',
        status,
        discussionNotes: callNotes.trim(),
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
        contactPerson: clientName,
        contactPhone: rawPhone || undefined,
        contactEmail: clientEmail || undefined,
      });

      scheduleLocalReminderAlarm('CALL', callNotes);

      const updatedQuote = (res.data?.data as any)?.quotation;
      if (updatedQuote && onFollowupLogged) onFollowupLogged(updatedQuote);

      setFeedback({ type: 'success', message: 'Call discussion logged and reminder alarm successfully set!' });
      setCallNotes('');
      await loadFollowups();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to log call.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 4. SMS Action
  const handleSendSMS = async () => {
    if (!rawPhone) {
      setFeedback({ type: 'error', message: 'Client phone number is missing.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const notes = `Dispatched SMS to ${rawPhone}: "${smsText}"`;
      const res = await salesQuotationsApi.createFollowup(quotation.id, {
        channel: 'SMS',
        status,
        discussionNotes: notes,
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
        contactPerson: clientName,
        contactPhone: rawPhone,
        contactEmail: clientEmail || undefined,
      });

      scheduleLocalReminderAlarm('SMS', notes);

      const updatedQuote = (res.data?.data as any)?.quotation;
      if (updatedQuote && onFollowupLogged) onFollowupLogged(updatedQuote);

      // Open SMS URI
      window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(smsText)}`;

      setFeedback({ type: 'success', message: 'SMS launched & reminder alarm set!' });
      await loadFollowups();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to save SMS log.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#030213] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-white/[0.02] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base sm:text-lg font-bold text-white tracking-wide">
                {quoteNum}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-gray-300 font-medium">
                {quotation.customer?.legalName || quotation.recipientCompany || 'Commercial Client'}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 ${timingInfo.color}`}>
                {timingInfo.text}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <span>Client: <strong className="text-white">{clientName}</strong></span>
              {rawPhone && <span>Phone: <strong className="text-white font-mono">{formattedPhone}</strong></span>}
              <span>Total: <strong className="text-[#7FB706]">{formattedAmount}</strong></span>
              <span>Project: <strong className="text-cyan-300">{projectName}</strong></span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Omnichannel Channel Selector (>= 44px Touch Targets) */}
        <div className="px-4 pt-3 pb-2 border-b border-white/10 bg-gradient-to-r from-white/[0.02] to-white/[0.04]">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('WHATSAPP')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  activeTab === 'WHATSAPP'
                    ? 'bg-[#25D366]/20 border-[#25D366] text-[#25D366] shadow-lg shadow-[#25D366]/10'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('EMAIL')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  activeTab === 'EMAIL'
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>Email Hub</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CALL')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  activeTab === 'CALL'
                    ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Phone Call & Script</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SMS')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  activeTab === 'SMS'
                    ? 'bg-sky-600/25 border-sky-500 text-sky-300 shadow-lg shadow-sky-500/10'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <span>SMS Direct</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap ${
                activeTab === 'HISTORY'
                  ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({followups.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 border shadow-md ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
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

          {/* ATTACHED QUOTATION DOCUMENT CARD (VISIBLE IN ALL SEND CHANNELS) */}
          {activeTab !== 'HISTORY' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/10 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white font-mono">
                        Quotation_{String(quoteNum).replace(/[\/\\]/g, '_')}.pdf
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Attached & Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Official A4 Vector Quotation Document with cryptographic QR verification
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowPdfModal(true)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#B5F823]" /> Preview PDF
                  </button>

                  <a
                    href={pdfDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`Quotation_${String(quoteNum).replace(/[\/\\]/g, '_')}.pdf`}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" /> Download
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopy(shortDocUrl, 'short-url')}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                    title="Copy concise short proposal link for sharing"
                  >
                    {copiedKey === 'short-url' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Short Link!
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3.5 h-3.5 text-indigo-400" /> Copy Short Link
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(pdfDownloadUrl, 'pdf-url')}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                    title="Copy direct download link"
                  >
                    {copiedKey === 'pdf-url' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" /> Copy PDF Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCENARIO SELECTOR CHIPS (FOR WHATSAPP, EMAIL, SMS, CALL) */}
          {activeTab !== 'HISTORY' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#B5F823]" /> Select Message Intent / Discussion Stage
                </label>
                <span className="text-[11px] text-gray-400">Auto-generates context-rich pitch</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {SCENARIOS.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setScenario(s.id)}
                    className={`min-h-[42px] p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      scenario === s.id
                        ? 'bg-[#7FB706]/20 border-[#7FB706] text-white shadow-md'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1 truncate">
                      <span>{s.icon}</span>
                      <span className="truncate">{s.label}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 truncate mt-0.5">{s.badge}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 1: WHATSAPP WORKSPACE */}
          {activeTab === 'WHATSAPP' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> Auto-Generated WhatsApp Proposal (With PDF Attachment)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(whatsappText, 'wa-text')}
                    className="text-xs text-[#25D366] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'wa-text' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'wa-text' ? 'Copied to Clipboard' : 'Copy Message'}</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={whatsappText}
                  onChange={(e) => setWhatsappText(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs sm:text-sm font-sans leading-relaxed focus:outline-none focus:border-[#25D366]"
                  placeholder="Auto-generated WhatsApp proposal..."
                />
              </div>

              {/* Status Outcome */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Quotation Pipeline Status Outcome
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
                </select>
              </div>

              {/* REMINDER & ALARM SCHEDULER */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#B5F823]" />
                    <span className="text-xs font-bold text-white">Next Follow-Up Reminder & Alarm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasNotifPermission ? (
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <Bell className="w-3 h-3" /> Enable Alarm Notifications
                      </button>
                    ) : (
                      <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-semibold">
                        <BellRing className="w-3 h-3 text-[#B5F823]" /> Alarm Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setQuickDate(1)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer">+1 Hour</button>
                  <button type="button" onClick={() => setQuickDate(2.5)} className="text-[11px] px-2.5 py-1 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 font-bold cursor-pointer">+2.5 Hours (Standard)</button>
                  <button type="button" onClick={() => setQuickDate(4)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer">+4 Hours</button>
                  <button type="button" onClick={() => setTomorrowAt(10, 0)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20 cursor-pointer">Tomorrow 10 AM</button>
                  <button type="button" onClick={() => setTomorrowAt(15, 0)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20 cursor-pointer">Tomorrow 3 PM</button>
                  <button type="button" onClick={() => setQuickDate(48)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer">In 2 Days</button>
                  <button type="button" onClick={() => setQuickDate(168)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer">In 1 Week</button>
                </div>

                <input
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={submitting || !rawPhone}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg shadow-[#25D366]/20"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Preparing WhatsApp Proposal & Setting Reminder...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    <span>Open WhatsApp, Send Proposal with PDF & Set Reminder</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: EMAIL WORKSPACE */}
          {activeTab === 'EMAIL' && (
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Mail className="w-4 h-4 text-indigo-400" /> Quotation PDF will be automatically compiled & attached to this email.
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  PDF Attached
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={emailForm.recipientEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                  placeholder="client@company.com"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
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
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Email Message Body
                </label>
                <textarea
                  rows={6}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-sans leading-relaxed focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* REMINDER & ALARM SCHEDULER */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Next Follow-Up Reminder & Alarm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasNotifPermission ? (
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <Bell className="w-3 h-3" /> Enable Alarm
                      </button>
                    ) : (
                      <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-semibold">
                        <BellRing className="w-3 h-3 text-[#B5F823]" /> Alarm Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setQuickDate(1)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer">+1 Hour</button>
                  <button type="button" onClick={() => setQuickDate(2.5)} className="text-[11px] px-2.5 py-1 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 font-bold cursor-pointer">+2.5 Hours</button>
                  <button type="button" onClick={() => setTomorrowAt(10, 0)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20 cursor-pointer">Tomorrow 10 AM</button>
                  <button type="button" onClick={() => setTomorrowAt(15, 0)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20 cursor-pointer">Tomorrow 3 PM</button>
                  <button type="button" onClick={() => setQuickDate(48)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer">In 2 Days</button>
                </div>

                <input
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !emailForm.recipientEmail}
                className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/30"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching Email with PDF & Setting Reminder...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch Email with Attached PDF & Set Reminder</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: PHONE CALL & TALKING SCRIPT WORKSPACE */}
          {activeTab === 'CALL' && (
            <form onSubmit={handleLogCall} className="space-y-4">
              {/* Interactive Call Script Card */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-400" /> Interactive Sales Call Script & Talking Points
                  </div>
                  <a
                    href={rawPhone ? `tel:${cleanPhone}` : '#'}
                    className="px-3 py-1 rounded-lg bg-emerald-500 text-black font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-400 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Dial {formattedPhone || 'Client'}
                  </a>
                </div>

                <div className="space-y-2 text-xs text-gray-200">
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <strong className="text-emerald-300">1. Opening Greeting:</strong> "Hello {clientName}, this is Pacific Products & Solutions calling regarding quotation {quoteNum} for {projectName}."
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <strong className="text-[#B5F823]">2. Commercial Review:</strong> "The proposal total is {formattedAmount} (incl. GST). Did you have a chance to review the attached PDF specifications?"
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <strong className="text-cyan-300">3. Technical Value Proposition:</strong> "We supply 12mm Compact Laminate HPL with a 10-year warranty, Grade 304 Stainless Steel hardware, and water/termite-proof durability."
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <strong className="text-amber-300">4. Call-to-Action / Next Step:</strong> "Would you like our engineer to bring board samples to your site, or should we finalize the order and issue the Proforma Invoice?"
                  </div>
                </div>
              </div>

              {/* Call Outcome Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Call Outcome Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuotationFollowupStatus)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="COMPLETED" className="bg-[#030213] text-white">Call Completed — Client Reviewing</option>
                  <option value="INTERESTED" className="bg-[#030213] text-[#B5F823] font-bold">Client Warm & Interested</option>
                  <option value="CALLBACK_REQUESTED" className="bg-[#030213] text-cyan-400">Callback Requested</option>
                  <option value="PRICE_NEGOTIATION" className="bg-[#030213] text-orange-400">Price Negotiation Requested</option>
                  <option value="NO_ANSWER" className="bg-[#030213] text-yellow-400">No Answer / Busy / Line Busy</option>
                  <option value="ORDER_CONFIRMED" className="bg-[#030213] text-emerald-400 font-bold">🎉 Order Confirmed on Call</option>
                  <option value="DROPPED" className="bg-[#030213] text-rose-400">Dropped / Lost to Competitor</option>
                </select>
              </div>

              {/* Quick Preset Discussion Chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Call Notes & Client Feedback
                  </label>
                  <span className="text-[11px] text-gray-500">Tap chip to append</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {QUICK_DISCUSSION_CHIPS.map((chip, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setCallNotes((prev) => (prev ? `${prev}\n${chip}` : chip))}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 transition-colors text-left cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Record client questions, commitments, or next steps..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-[#7FB706]"
                  required
                />
              </div>

              {/* REMINDER & ALARM SCHEDULER */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Next Follow-Up Reminder & Alarm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasNotifPermission ? (
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <Bell className="w-3 h-3" /> Enable Alarm
                      </button>
                    ) : (
                      <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-semibold">
                        <BellRing className="w-3 h-3 text-[#B5F823]" /> Alarm Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setQuickDate(1)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer">+1 Hour</button>
                  <button type="button" onClick={() => setQuickDate(2.5)} className="text-[11px] px-2.5 py-1 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 font-bold cursor-pointer">+2.5 Hours</button>
                  <button type="button" onClick={() => setTomorrowAt(10, 0)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20 cursor-pointer">Tomorrow 10 AM</button>
                  <button type="button" onClick={() => setTomorrowAt(15, 0)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20 cursor-pointer">Tomorrow 3 PM</button>
                  <button type="button" onClick={() => setQuickDate(48)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer">In 2 Days</button>
                </div>

                <input
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Call Log & Setting Reminder...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Call Discussion & Set Next Reminder</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 4: SMS WORKSPACE */}
          {activeTab === 'SMS' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-sky-400" /> Auto-Generated SMS (With Quotation Link)
                  </label>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {smsText.length} characters {smsText.length > 160 && '(multi-part)'}
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs sm:text-sm font-sans leading-relaxed focus:outline-none focus:border-sky-500"
                  placeholder="Auto-generated SMS message..."
                />
              </div>

              {/* Status Outcome */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Quotation Pipeline Status Outcome
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuotationFollowupStatus)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="COMPLETED" className="bg-[#030213] text-white">General Follow-Up Sent</option>
                  <option value="INTERESTED" className="bg-[#030213] text-white">Client Interested</option>
                  <option value="CALLBACK_REQUESTED" className="bg-[#030213] text-white">Callback Requested</option>
                  <option value="ORDER_CONFIRMED" className="bg-[#030213] text-emerald-400 font-bold">🎉 Order Confirmed</option>
                </select>
              </div>

              {/* REMINDER & ALARM SCHEDULER */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">Next Follow-Up Reminder & Alarm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasNotifPermission ? (
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <Bell className="w-3 h-3" /> Enable Alarm
                      </button>
                    ) : (
                      <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-semibold">
                        <BellRing className="w-3 h-3 text-[#B5F823]" /> Alarm Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setQuickDate(1)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 cursor-pointer">+1 Hour</button>
                  <button type="button" onClick={() => setQuickDate(2.5)} className="text-[11px] px-2.5 py-1 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 font-bold cursor-pointer">+2.5 Hours</button>
                  <button type="button" onClick={() => setTomorrowAt(10, 0)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20 cursor-pointer">Tomorrow 10 AM</button>
                  <button type="button" onClick={() => setTomorrowAt(15, 0)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-blue-500/20 cursor-pointer">Tomorrow 3 PM</button>
                </div>

                <input
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSendSMS}
                disabled={submitting || !rawPhone}
                className="w-full min-h-[48px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-sky-600/30"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Preparing SMS & Setting Reminder...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>Open SMS App, Send Quotation Link & Set Reminder</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 5: HISTORY TIMELINE */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Timeline of Past Interactions & Dispatches
                </h3>
                <button
                  type="button"
                  onClick={loadFollowups}
                  disabled={loadingHistory}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#7FB706]" /> Loading history...
                </div>
              ) : followups.length === 0 ? (
                <div className="py-10 text-center bg-white/[0.02] rounded-xl border border-white/5 p-4">
                  <Clock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-300 font-semibold">No follow-ups recorded yet</p>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                    Pacific standard operating procedure recommends dispatching the first follow-up via WhatsApp or Email within 2 to 3 hours of quotation generation.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('WHATSAPP')}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#7FB706] text-black font-bold text-xs inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Start First Follow-Up
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

                          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-white/5 flex-wrap gap-2">
                            <span>Logged by: <strong className="text-gray-400">{item.performedByName || 'Staff'}</strong></span>
                            {item.nextFollowupDate && (
                              <span className="text-cyan-400 flex items-center gap-1 font-medium bg-cyan-500/10 px-2 py-0.5 rounded">
                                <Calendar className="w-3 h-3" /> Next Reminder: {new Date(item.nextFollowupDate).toLocaleDateString('en-IN', {
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
        </div>
      </div>

      {/* Embedded Quotation PDF Preview Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-5xl h-[90vh] bg-[#030213] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#B5F823]" />
                <span className="text-sm font-bold text-white font-mono">
                  Attached Document: Quotation_{quoteNum}.pdf
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-neutral-900">
              <iframe
                src={pdfPreviewUrl}
                title="Quotation PDF Preview"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationFollowupModal;
