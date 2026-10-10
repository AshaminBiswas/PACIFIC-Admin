import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Layers,
  Lock,
  Columns,
  Sparkles,
  FileText,
  DollarSign,
  Plus,
  Send,
  MessageCircle,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Flame,
  User,
  Share2,
  ShieldAlert,
  ChevronRight,
  Edit,
} from 'lucide-react';
import { leadManagementApi } from '../../api/leadManagementApi';
import type {
  Lead,
  LeadStatus,
  LeadPriority,
  LeadProductCategory,
  LeadFollowupChannel,
} from '../../types/admin';
import GenerateQuotationFromLeadModal from '../../components/crm/GenerateQuotationFromLeadModal';
import LeadFollowupModal from '../../components/crm/LeadFollowupModal';

const STATUS_OPTIONS: { value: LeadStatus; label: string; badge: string }[] = [
  { value: 'NEW', label: '🆕 New Inquiry', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'CONTACTED', label: '📞 Contacted / Discussion', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { value: 'REQUIREMENT_GATHERED', label: '📐 Specs Finalized', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'INTERESTED', label: '⭐ Interested / Ready for Quote', badge: 'bg-[#7FB706]/15 text-[#7FB706] border-[#7FB706]/30 font-bold' },
  { value: 'QUOTATION_SENT', label: '📄 Quotation Dispatched', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  { value: 'NEGOTIATING', label: '🤝 Price Negotiation', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'WON', label: '🏆 Won / Order Confirmed', badge: 'bg-[#7FB706] text-black font-extrabold border-[#7FB706]' },
  { value: 'LOST', label: '❌ Deal Lost', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { value: 'INACTIVE', label: '⏸️ Shelved / Inactive', badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);

  // Fetch lead record
  const loadLead = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await leadManagementApi.getById(id);
      if (res.data) {
        setLead(res.data);
      } else {
        setError('Commercial lead record not found.');
      }
    } catch (err: any) {
      console.error('Failed to load lead details:', err);
      setError(err?.message || 'Failed to retrieve lead record.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  // Handle Quick Status Change
  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return;
    try {
      await leadManagementApi.update(lead.id, { status: newStatus });
      loadLead();

      // If marked as interested and no quotation yet, prompt quote modal
      if (newStatus === 'INTERESTED' && !lead.quotationNumber) {
        setIsQuotationModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update pipeline status.');
    }
  };

  // Delete Lead
  const handleDelete = async () => {
    if (!lead) return;
    if (!window.confirm(`Permanently delete lead ${lead.leadNumber || lead.id}? This cannot be undone.`)) {
      return;
    }
    try {
      await leadManagementApi.delete(lead.id);
      navigate('/admin/dashboard/crm-leads');
    } catch (err) {
      alert('Failed to delete lead.');
    }
  };

  // Helper for Product Category badge
  const getCategoryBadge = (cat?: LeadProductCategory) => {
    switch (cat) {
      case 'RESTROOM_CUBICLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
            <Layers className="w-3.5 h-3.5" /> Toilet Cubicle
          </span>
        );
      case 'LOCKER_SYSTEM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Lock className="w-3.5 h-3.5" /> Locker System
          </span>
        );
      case 'URINAL_PARTITION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Columns className="w-3.5 h-3.5" /> Urinal Partition
          </span>
        );
      case 'COMBO_WASHROOM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Turnkey Combo
          </span>
        );
      default:
        return null;
    }
  };

  // Helper for Followup Countdown Badge
  const getFollowupBadge = (dueDate?: string) => {
    if (!dueDate) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-400">
          <Calendar className="w-3.5 h-3.5" /> Not Scheduled
        </span>
      );
    }

    const now = Date.now();
    const dueTime = new Date(dueDate).getTime();
    const diffHours = Math.round((dueTime - now) / (3600 * 1000));

    if (diffHours < 0) {
      const days = Math.abs(Math.round(diffHours / 24));
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-rose-400" /> Overdue by {days > 0 ? `${days}d` : `${Math.abs(diffHours)}h`}
        </span>
      );
    }

    if (diffHours <= 12) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 text-amber-400" /> Due in {diffHours}h
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-300">
        <Calendar className="w-3.5 h-3.5" /> {new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-2 border-[#7FB706] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs sm:text-sm text-gray-400">Loading commercial lead record...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="py-16 max-w-md mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Lead Record Not Found</h2>
          <p className="text-xs text-gray-400 mt-1">{error || 'The requested commercial lead could not be located.'}</p>
        </div>
        <button
          onClick={() => navigate('/admin/dashboard/crm-leads')}
          className="px-4 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#8ecb08] text-white font-bold text-xs transition inline-flex items-center gap-1.5 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Leads Pipeline
        </button>
      </div>
    );
  }

  const cleanPhone = (lead.phone || '').replace(/\D/g, '');
  const whatsAppPhone = cleanPhone.startsWith('91') ? cleanPhone : cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsAppUrl = `https://wa.me/${whatsAppPhone}?text=${encodeURIComponent(
    `Hello ${lead.firstName}, thank you for contacting Pacific Restroom Cubicles regarding your ${lead.productCategory?.replace('_', ' ')} requirements. We have prepared details for your review.`
  )}`;

  return (
    <div className="space-y-6 pb-24">
      {/* Top Breadcrumb & Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
            <Link
              to="/admin/dashboard/crm-leads"
              className="hover:text-[#7FB706] transition flex items-center gap-1 min-h-[32px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Leads & Enquiries
            </Link>
            <span>/</span>
            <span className="text-[#7FB706] font-mono font-bold">{lead.leadNumber}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {lead.firstName} {lead.lastName || ''}
            </h1>
            {getCategoryBadge(lead.productCategory)}
            {lead.priority === 'HOT' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Flame className="w-3.5 h-3.5 text-rose-400" /> HOT LEAD
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-gray-500" /> {lead.company || 'Direct End-User'} • {lead.city || 'Site'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct WhatsApp Callout */}
          {cleanPhone && (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 min-h-[44px]"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}

          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center gap-1.5 min-h-[44px]"
              title="Call Prospect"
            >
              <Phone className="w-4 h-4" /> Call
            </a>
          )}

          <button
            onClick={() => setIsFollowupModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-200 bg-white/5 hover:bg-white/10 border border-[#7FB706]/40 transition flex items-center gap-1.5 min-h-[44px]"
          >
            <Clock className="w-4 h-4 text-[#7FB706]" /> Log Touchpoint
          </button>

          {!lead.quotationNumber ? (
            <button
              onClick={() => setIsQuotationModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-[#7FB706] to-[#B5F823] hover:from-[#8ecb08] hover:to-[#c4fa3f] transition shadow-lg shadow-[#7FB706]/20 flex items-center gap-1.5 min-h-[44px]"
            >
              <FileText className="w-4 h-4" /> Generate Quotation
            </button>
          ) : (
            <Link
              to="/admin/dashboard/sales-quotations"
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition shadow-lg shadow-sky-600/20 flex items-center gap-1.5 min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" /> View Quote {lead.quotationNumber}
            </Link>
          )}

          <button
            onClick={handleDelete}
            className="p-2.5 rounded-xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Delete Lead"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#121029] border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-gray-400">Total Units / Doors</span>
          <p className="text-xl sm:text-2xl font-mono font-bold text-white">
            {lead.estimatedQuantity || 1} <span className="text-xs text-gray-500 font-sans font-normal">Units</span>
          </p>
          <span className="text-[10px] text-[#7FB706] block font-medium">
            {lead.productCategory?.replace('_', ' ')}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-[#121029] border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-gray-400">Estimated Sizing</span>
          <p className="text-xl sm:text-2xl font-mono font-bold text-white">
            ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-gray-500 block">Projected Value</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-[#121029] border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-gray-400">Quotation Status</span>
          <p className="text-sm sm:text-base font-bold text-white truncate">
            {lead.quotationNumber ? lead.quotationNumber : 'Not Dispatched'}
          </p>
          <span className="text-[10px] text-sky-400 block font-semibold">
            {lead.quotationAmount ? `₹${lead.quotationAmount.toLocaleString('en-IN')} • ${lead.quotationStatus || 'SENT'}` : 'Awaiting Generation'}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-[#121029] border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-gray-400">Follow-Up Schedule</span>
          <div className="pt-0.5">{getFollowupBadge(lead.nextFollowupDate)}</div>
          <span className="text-[10px] text-gray-500 block">
            {lead.followupCount || 0} touchpoints logged
          </span>
        </div>
      </div>

      {/* Pipeline Stage Bar */}
      <div className="p-4 rounded-2xl bg-[#121029] border border-[#7FB706]/30 shadow-xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
            <Flame className="w-4 h-4" /> Pipeline Stage & Progress
          </span>
          <span className="text-xs text-gray-400">
            Current Stage: <span className="text-white font-bold">{lead.status}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = lead.status === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 min-h-[40px] border ${
                  isActive
                    ? 'bg-[#7FB706] text-black font-extrabold border-[#7FB706] shadow-md shadow-[#7FB706]/20'
                    : 'bg-white/[0.02] text-gray-400 border-white/10 hover:text-white hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Details & Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Prospect & Technical Specs (2 cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Technical Product Specifications Card */}
          <div className="p-5 rounded-2xl bg-[#121029] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Technical Specifications
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {lead.productCategory}
              </span>
            </div>

            {/* Restroom Cubicle Specifications */}
            {lead.cubicleSpecs && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#7FB706]" /> Restroom Cubicle Package
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Mounting Model</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.cubicleSpecs.cubicleModel || 'Pacific Classic'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Board Core & Thickness</span>
                    <span className="font-semibold text-white mt-0.5 block">
                      {lead.cubicleSpecs.boardThickness || '12mm'} • {lead.cubicleSpecs.boardType || 'Compact HPL (Phenolic)'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Hardware Fittings</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.cubicleSpecs.hardwarePackage || 'SS 304 Premium'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Color / Finish</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.cubicleSpecs.colorPreference || 'Natural Woodgrain'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Locker Specifications */}
            {lead.lockerSpecs && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-sky-400" /> Modular Locker Package
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Tier Configuration</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.lockerSpecs.lockerTiers || '2-Tier'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Compartments</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.lockerSpecs.compartmentsCount || 24} Units</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Lock Mechanism</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.lockerSpecs.lockType || 'Digital Code'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Material Grade</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.lockerSpecs.material || '12mm Compact HPL'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Urinal Partition Specifications */}
            {lead.urinalSpecs && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5 text-amber-400" /> Urinal Modesty Partition Package
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Screen Dimensions</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.urinalSpecs.screenDimensions || '450 x 900 mm'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Mounting Hardware</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.urinalSpecs.mountingType || 'Wall-hung with SS Brackets'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Board Type</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.urinalSpecs.boardType || '12mm Compact Laminate'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Quantity</span>
                    <span className="font-semibold text-white mt-0.5 block">{lead.urinalSpecs.screensCount || 6} Screens</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes & Requirements */}
            {lead.message && (
              <div className="p-4 rounded-xl bg-[#0d0b21] border border-white/5 text-xs text-gray-300">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Prospect Scope / Message</span>
                <p className="leading-relaxed whitespace-pre-wrap">{lead.message}</p>
              </div>
            )}

            {lead.notes && (
              <div className="p-4 rounded-xl bg-[#0d0b21] border border-white/5 text-xs text-gray-300">
                <span className="text-[10px] uppercase font-bold text-[#7FB706] block mb-1">Internal Sales Notes</span>
                <p className="leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Follow-up Touchpoint History Timeline */}
          <div className="p-5 rounded-2xl bg-[#121029] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Touchpoint & Follow-Up History ({lead.followups?.length || 0})
              </span>
              <button
                onClick={() => setIsFollowupModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] text-xs font-bold transition flex items-center gap-1 min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" /> Log Touchpoint
              </button>
            </div>

            {(!lead.followups || lead.followups.length === 0) ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                <Clock className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                No follow-up touchpoints logged yet. Click &quot;Log Touchpoint&quot; to record calls, visits or discussions.
              </div>
            ) : (
              <div className="space-y-3">
                {lead.followups.map((fup) => (
                  <div
                    key={fup.id}
                    className="p-3.5 rounded-xl bg-[#0d0b21] border border-white/5 space-y-2 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase text-[11px] px-2 py-0.5 rounded bg-white/10">
                          {fup.channel}
                        </span>
                        {fup.outcome && (
                          <span className="text-[#7FB706] text-[11px] font-semibold">
                            {fup.outcome.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {new Date(fup.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-gray-300 leading-relaxed">{fup.discussionNotes}</p>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-white/5">
                      <span>By: <span className="text-gray-300">{fup.performedByName || 'Sales Executive'}</span></span>
                      {fup.nextFollowupDate && (
                        <span>
                          Next: <span className="text-amber-400 font-semibold">{new Date(fup.nextFollowupDate).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Prospect Profile & Quotation Card */}
        <div className="space-y-6">
          {/* Prospect Contact Card */}
          <div className="p-5 rounded-2xl bg-[#121029] border border-white/10 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
              <User className="w-4 h-4" /> Prospect Details
            </span>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0d0b21] border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-[#7FB706]/10 text-[#7FB706] flex items-center justify-center font-bold">
                  {lead.firstName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{lead.firstName} {lead.lastName || ''}</div>
                  <div className="text-gray-400 text-[11px]">{lead.clientType}</div>
                </div>
              </div>

              {lead.phone && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#0d0b21] border border-white/5">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                    <span>{lead.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${lead.phone}`}
                      className="px-2 py-1 rounded bg-white/10 text-white hover:bg-white/20 text-[10px] font-bold"
                    >
                      Call
                    </a>
                    {cleanPhone && (
                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600/50 text-[10px] font-bold"
                      >
                        WA
                      </a>
                    )}
                  </div>
                </div>
              )}

              {lead.email && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0d0b21] border border-white/5 text-gray-300">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  <a href={`mailto:${lead.email}`} className="hover:text-[#7FB706] truncate">
                    {lead.email}
                  </a>
                </div>
              )}

              {lead.company && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0d0b21] border border-white/5 text-gray-300">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  <span className="truncate">{lead.company}</span>
                </div>
              )}

              {(lead.address || lead.city) && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-[#0d0b21] border border-white/5 text-gray-300">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">
                    {[lead.address, lead.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0d0b21] border border-white/5 text-gray-400 text-[11px]">
                <span>Assigned Sales Rep:</span>
                <span className="font-semibold text-white">{lead.assignedTo || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          {/* Quotation Linkage Card */}
          <div className="p-5 rounded-2xl bg-[#121029] border border-[#7FB706]/30 shadow-xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706] flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Commercial Quotation Linkage
            </span>

            {lead.quotationNumber ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#0d0b21] border border-sky-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-sky-400">
                      {lead.quotationNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      {lead.quotationStatus || 'SENT'}
                    </span>
                  </div>

                  <div className="text-lg font-mono font-black text-white">
                    ₹{(lead.quotationAmount || 0).toLocaleString('en-IN')}
                  </div>

                  {lead.quotationDate && (
                    <div className="text-[10px] text-gray-500">
                      Dispatched on {new Date(lead.quotationDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>

                <Link
                  to="/admin/dashboard/sales-quotations"
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition border border-white/10 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <ExternalLink className="w-4 h-4 text-[#7FB706]" /> Open Sales Quotation
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 leading-relaxed">
                  No quotation has been generated for this lead yet. You can automatically create and link a formal sales proposal in 1 click.
                </p>

                <button
                  onClick={() => setIsQuotationModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] hover:from-[#8ecb08] hover:to-[#c4fa3f] text-black font-extrabold text-xs transition shadow-lg shadow-[#7FB706]/20 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <FileText className="w-4 h-4" /> 1-Click Quotation Generator
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <GenerateQuotationFromLeadModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        onSuccess={loadLead}
        lead={lead}
      />

      <LeadFollowupModal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        onSuccess={loadLead}
        lead={lead}
      />
    </div>
  );
}
