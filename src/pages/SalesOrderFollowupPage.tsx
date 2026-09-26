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
  Layers,
  Package,
  Truck,
} from 'lucide-react';
import { salesOrdersApi } from '../api/salesOrdersApi';
import type {
  SalesOrder,
  SalesOrderFollowup,
  SalesOrderFollowupChannel,
  SalesOrderFollowupStatus,
} from '../types/admin';

const ORDER_DISCUSSION_CHIPS = [
  'Site measurement verified by installation team.',
  'Advance payment received; started fabrication in factory.',
  'Hardware kit picked and verified against store issue slip.',
  'Factory fabrication complete; packing list prepared.',
  'Client confirmed site is ready for delivery & installation.',
  'Called client regarding progress billing milestone; callback requested.',
];

const ORDER_STATUS_LABELS: Record<
  SalesOrderFollowupStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING: {
    label: 'Pending Initial Follow-up',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  SCHEDULED: {
    label: 'Scheduled Touchpoint',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  COMPLETED: {
    label: 'Discussion Completed',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  SITE_MEASUREMENT_PENDING: {
    label: 'Site Measurement Pending',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  ADVANCE_PAYMENT_PENDING: {
    label: 'Advance Payment Pending',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  PRODUCTION_HOLD: {
    label: 'Production on Hold',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  FABRICATION_IN_PROGRESS: {
    label: 'Fabrication in Progress',
    color: 'text-[#B5F823]',
    bg: 'bg-[#7FB706]/15',
    border: 'border-[#7FB706]/30',
  },
  READY_FOR_DISPATCH: {
    label: 'Ready for Dispatch 📦',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  DISPATCHED: {
    label: 'Dispatched to Site 🚚',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  DELIVERY_CONFIRMED: {
    label: 'Delivery Confirmed 🎉',
    color: 'text-emerald-300 font-bold',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
  },
  CANCELLED: {
    label: 'Cancelled / Hold',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
};

export default function SalesOrderFollowupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [followups, setFollowups] = useState<SalesOrderFollowup[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'email'>('log');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [channel, setChannel] = useState<SalesOrderFollowupChannel>('CALL');
  const [status, setStatus] = useState<SalesOrderFollowupStatus>('COMPLETED');
  const [discussionNotes, setDiscussionNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Email Form State
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    subject: '',
    message: '',
    notes: '',
  });

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      const res = await salesOrdersApi.getById(id);
      const data = (res.data?.data as any) || res.data;
      setOrder(data);

      const clientName =
        (data.customer as any)?.contacts?.[0]?.name ||
        data.customer?.legalName ||
        data.customer?.tradeName ||
        '';
      const rawPhone =
        (data.customer as any)?.contacts?.[0]?.phone ||
        data.customer?.phone ||
        (data.siteContactSnapshot as any)?.contactPhone ||
        '';
      const clientEmail =
        (data.customer as any)?.contacts?.[0]?.email ||
        data.customer?.email ||
        '';

      setContactPerson(clientName);
      setContactPhone(rawPhone);
      setContactEmail(clientEmail);

      setEmailForm({
        recipientEmail: clientEmail,
        subject: `Order Progress Update: Pacific Sales Order ${data.orderNumber} — ${data.customer?.legalName || 'Client'}`,
        message: `Dear ${clientName || 'Customer'},\n\nWe are following up regarding active Sales Order ${data.orderNumber} for your restroom cubicles.\n\nOur production & engineering team is tracking your order fabrication and dispatch schedule. Please let us know if your site is ready for delivery or if any technical coordination is required.\n\nBest regards,\nPacific Products & Solutions`,
        notes: 'Follow-up email dispatched regarding order fabrication and site readiness.',
      });

      if (data.nextFollowupDate) {
        const d = new Date(data.nextFollowupDate);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setNextFollowupDate(iso);
      } else {
        const defaultNext = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
        const iso = new Date(defaultNext.getTime() - defaultNext.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setNextFollowupDate(iso);
      }
    } catch (err: any) {
      console.error('Failed to load sales order:', err);
      setOrderError(err?.response?.data?.message || err?.message || 'Failed to load sales order');
    } finally {
      setLoadingOrder(false);
    }
  }, [id]);

  const loadFollowups = useCallback(async () => {
    if (!id) return;
    setLoadingHistory(true);
    try {
      const res = await salesOrdersApi.getFollowups(id);
      const list = (res.data?.data as any)?.followups || res.data?.data || [];
      setFollowups(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Failed to load order followups:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
    loadFollowups();
  }, [loadOrder, loadFollowups]);

  // Derived values
  const customerName = order?.customer?.legalName || order?.customer?.tradeName || 'Client';
  const rawPhone =
    (order?.customer as any)?.contacts?.[0]?.phone ||
    order?.customer?.phone ||
    (order as any)?.siteContactSnapshot?.contactPhone ||
    '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : rawPhone;
  const clientEmail = (order?.customer as any)?.contacts?.[0]?.email || order?.customer?.email || '';
  const formattedAmount = `₹ ${Number(order?.grandTotal || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  })}`;
  const siteInfo =
    (order as any)?.shippingAddressSnapshot?.siteName ||
    order?.siteName ||
    (order as any)?.shippingAddressSnapshot?.address ||
    order?.siteAddress ||
    '';

  // Pre-filled WhatsApp message
  const whatsappPitch = useMemo(() => {
    return `Dear ${customerName},\n\nGreetings from Pacific Products & Solutions!\n\nWe are following up regarding your Sales Order *${order?.orderNumber}* (${formattedAmount}).\n\nOur production team is preparing your cubicle partitions. Could you please confirm if your site at *${siteInfo || 'the project location'}* is ready for delivery / installation?\n\nThank you!\nPacific Operations Team`;
  }, [customerName, order?.orderNumber, formattedAmount, siteInfo]);

  // Pre-filled SMS message
  const smsPitch = useMemo(() => {
    return `Hello ${customerName}, update on Pacific Sales Order ${order?.orderNumber} (${formattedAmount}). Please confirm if site is ready for cubicle delivery. Pacific Operations.`;
  }, [customerName, order?.orderNumber, formattedAmount]);

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

  // Follow-up urgency badge
  const timingInfo = useMemo(() => {
    if (!order?.nextFollowupDate) {
      return {
        status: 'NONE',
        text: 'No touchpoint currently scheduled',
        color: 'text-gray-400 bg-white/5 border-white/10',
      };
    }
    const target = new Date(order.nextFollowupDate).getTime();
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
      text: `📅 Scheduled for ${new Date(order.nextFollowupDate).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    };
  }, [order?.nextFollowupDate]);

  // Handle saving follow-up
  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !order) return;
    if (!discussionNotes.trim()) {
      setFeedback({ type: 'error', message: 'Please enter discussion notes or select a preset chip.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await salesOrdersApi.createFollowup(id, {
        channel,
        status,
        discussionNotes: discussionNotes.trim(),
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
        contactPerson: contactPerson.trim() || customerName,
        contactPhone: contactPhone.trim() || rawPhone || undefined,
        contactEmail: contactEmail.trim() || clientEmail || undefined,
      });

      const updatedOrder = (res.data?.data as any)?.order;
      if (updatedOrder) {
        setOrder(updatedOrder);
      } else {
        await loadOrder();
      }

      setFeedback({ type: 'success', message: 'Order follow-up recorded and schedule updated!' });
      setDiscussionNotes('');
      await loadFollowups();
      setActiveTab('history');
    } catch (err: any) {
      console.error('Failed to log order follow-up:', err);
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
    if (!id || !order) return;
    if (!emailForm.recipientEmail) {
      setFeedback({ type: 'error', message: 'Recipient email is required.' });
      return;
    }

    setSendingEmail(true);
    setFeedback(null);
    try {
      const res = await salesOrdersApi.sendFollowupEmail(id, {
        recipientEmail: emailForm.recipientEmail.trim(),
        subject: emailForm.subject.trim(),
        message: emailForm.message.trim(),
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : undefined,
        notes: emailForm.notes.trim() || undefined,
      });

      const updatedOrder = (res.data?.data as any)?.order;
      if (updatedOrder) {
        setOrder(updatedOrder);
      } else {
        await loadOrder();
      }

      setFeedback({
        type: 'success',
        message: `Order status email sent to ${emailForm.recipientEmail}!`,
      });
      await loadFollowups();
      setActiveTab('history');
    } catch (err: any) {
      console.error('Failed to dispatch order email:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to dispatch email.',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading Order Follow-Up Hub...</p>
        </div>
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md bg-[#121226] border border-white/5 rounded-2xl p-6">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Sales Order Not Found</h2>
          <p className="text-red-400 text-sm">{orderError || 'Could not load order details.'}</p>
          <Link
            to="/admin/dashboard/sales-orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 rounded-xl text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sales Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
          <Link to="/admin/dashboard/sales-orders" className="hover:text-white transition-colors">
            Sales Orders
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <span className="font-mono text-white">{order.orderNumber}</span>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <span className="text-[#B5F823] font-semibold">Follow-Up & Client Engagement Hub</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/admin/dashboard/sales-orders/${id}/timeline`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#7FB706]" /> View Document Timeline
          </Link>
        </div>
      </div>

      {/* Main Order Header Summary */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
                <Layers className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white font-mono">{order.orderNumber}</h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  order.status === 'FULLY_DISPATCHED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : order.status === 'PARTIALLY_DISPATCHED'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : order.status === 'APPROVED'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : order.status === 'PENDING'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                {order.status}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1.5 ${timingInfo.color}`}
              >
                {timingInfo.text}
              </span>
            </div>

            <p className="text-sm text-gray-300 font-medium">
              {customerName}
              {siteInfo && <span className="text-gray-400"> • Site: <strong className="text-white">{siteInfo}</strong></span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 min-w-[130px]">
              <div className="text-gray-400 text-[11px]">Grand Total</div>
              <div className="text-base font-bold text-[#7FB706] font-mono">{formattedAmount}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 min-w-[130px]">
              <div className="text-gray-400 text-[11px]">Order Touches</div>
              <div className="text-base font-bold text-cyan-400 font-mono">
                {order.followupCount || 0} Recorded
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 min-w-[140px]">
              <div className="text-gray-400 text-[11px]">Lifecycle Stage</div>
              <div className="text-xs font-bold text-white mt-1">
                {order.followupStatus ? order.followupStatus.replace(/_/g, ' ') : 'PENDING'}
              </div>
            </div>
          </div>
        </div>

        {/* Client Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/5 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">Customer: <strong className="text-white">{customerName}</strong></span>
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
            <span className="truncate">Delivery Site: <strong className="text-white">{siteInfo || '—'}</strong></span>
          </div>
        </div>
      </div>

      {/* Omnichannel One-Touch Action Bar (>= 48px) */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-2.5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#B5F823]" /> One-Tap Order Communication Channels
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
            <span>Call Customer</span>
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
            <span>WhatsApp Status</span>
          </a>

          {/* Direct SMS */}
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

          {/* Dispatch Email Trigger */}
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

      {/* Tabs */}
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
          <span>Record Order Follow-Up</span>
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
          <span>Email Dispatch Hub</span>
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

      {/* TAB 1: RECORD ORDER FOLLOW-UP */}
      {activeTab === 'log' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6">
            <form onSubmit={handleSaveFollowup} className="space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#B5F823]" /> Log Discussion & Update Order Progress
              </h2>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Communication Channel Used
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'IN_PERSON', 'OTHER'] as SalesOrderFollowupChannel[]).map(
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

              {/* Outcome Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Order Lifecycle Stage / Follow-Up Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SalesOrderFollowupStatus)}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="COMPLETED" className="bg-[#030213] text-white">General Discussion Completed</option>
                  <option value="SITE_MEASUREMENT_PENDING" className="bg-[#030213] text-orange-400">Site Measurement Pending Verification</option>
                  <option value="ADVANCE_PAYMENT_PENDING" className="bg-[#030213] text-rose-400">Advance Payment Pending</option>
                  <option value="FABRICATION_IN_PROGRESS" className="bg-[#030213] text-[#B5F823] font-bold">Fabrication in Progress (CNC / Edge Banding)</option>
                  <option value="PRODUCTION_HOLD" className="bg-[#030213] text-yellow-400">Production on Hold (Client Request)</option>
                  <option value="READY_FOR_DISPATCH" className="bg-[#030213] text-indigo-400 font-bold">Ready for Dispatch (Factory Finished)</option>
                  <option value="DISPATCHED" className="bg-[#030213] text-purple-400">Dispatched from Factory to Site</option>
                  <option value="DELIVERY_CONFIRMED" className="bg-[#030213] text-emerald-400 font-bold">🎉 Delivery Confirmed & Received at Site</option>
                  <option value="SCHEDULED" className="bg-[#030213] text-white">Scheduled for Future Discussion</option>
                  <option value="CANCELLED" className="bg-[#030213] text-rose-400">Cancelled / Terminated</option>
                </select>
              </div>

              {/* Discussion Chips & Textarea */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-300">
                    Discussion Summary & Order Notes
                  </label>
                  <span className="text-[11px] text-gray-500">Tap chip to append quick preset</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {ORDER_DISCUSSION_CHIPS.map((chip, idx) => (
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
                  placeholder="Record customer coordination, site readiness, fabrication status, delivery timeline, or logistics instructions..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#7FB706]"
                  required
                />
              </div>

              {/* Next Touchpoint Scheduler */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#B5F823]" /> Schedule Next Follow-Up Touchpoint
                  </label>
                  <span className="text-[11px] text-gray-400">Order tracking milestone</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickDate(2.5)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 font-semibold cursor-pointer"
                  >
                    +2.5 Hours (Initial Order Rule)
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

              {/* Contact Person Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Spoke With (Person)
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Customer contact"
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

              {/* Submit */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg shadow-[#7FB706]/20"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Order Follow-Up...</span>
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

          {/* Quick Context & Recent Touches */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#B5F823]" /> Order Touches ({followups.length})
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
                  <p>No order follow-ups recorded yet.</p>
                  <p className="text-[11px] text-gray-500">
                    The team should make the first contact within 2-3 hours of order entry.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followups.slice(0, 3).map((item) => {
                    const st = ORDER_STATUS_LABELS[item.status] || {
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
                        <p className="text-gray-300 text-[11px] line-clamp-2">{item.discussionNotes}</p>
                        <div className="text-[10px] text-gray-500 flex justify-between pt-1 border-t border-white/5">
                          <span>{item.performedByName || 'Staff'}</span>
                          <span>
                            {new Date(item.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Document Flow Quick Link */}
            <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#7FB706]" /> Lifecycle Flow
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Track connected Quotation, Proforma Invoices, Factory Packing Lists, and Hardware Issue Slips.
              </p>
              <Link
                to={`/admin/dashboard/sales-orders/${id}/timeline`}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-[#7FB706]" /> View Document Timeline Page
              </Link>
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
                <History className="w-5 h-5 text-[#B5F823]" /> Complete Sales Order Follow-Up Timeline
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Every customer interaction, call, WhatsApp message, email, and scheduled milestone logged chronologically.
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
              <RefreshCw className="w-5 h-5 animate-spin text-[#7FB706]" /> Loading history...
            </div>
          ) : followups.length === 0 ? (
            <div className="py-12 text-center bg-white/[0.02] rounded-2xl border border-white/5 p-6 max-w-lg mx-auto space-y-3">
              <Clock className="w-10 h-10 text-gray-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Order Touches Recorded Yet</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Contact the customer within 2 to 3 hours to verify final site measurements, specs, and advance billing.
              </p>
              <button
                onClick={() => setActiveTab('log')}
                className="mt-2 px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Record First Order Follow-Up
              </button>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {followups.map((item) => {
                const st = ORDER_STATUS_LABELS[item.status] || {
                  label: item.status,
                  color: 'text-gray-300',
                  bg: 'bg-white/5',
                  border: 'border-white/10',
                };
                return (
                  <div key={item.id} className="relative group">
                    <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-[#030213] border-2 border-[#7FB706] flex items-center justify-center shadow-md">
                      <div className="w-2 h-2 rounded-full bg-[#B5F823]" />
                    </div>

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
                          <span>Logged by: <strong className="text-white">{item.performedByName || 'Operations Staff'}</strong></span>
                          {item.contactPerson && (
                            <span>Contact: <strong className="text-gray-300">{item.contactPerson}</strong></span>
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
                <Mail className="w-4 h-4 text-indigo-400" /> Send Order Follow-Up Email via Resend
              </p>
              <p className="text-indigo-300/80 leading-relaxed">
                Sends an official order progress update to the customer with reference {order.orderNumber}, value {formattedAmount}, and records a touchpoint in your CRM timeline.
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
                placeholder="customer@company.com"
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

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#B5F823]" /> Next Touchpoint After Email
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
                    <span>Send Order Update Email & Log Touchpoint</span>
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
