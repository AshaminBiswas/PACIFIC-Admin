import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  DollarSign,
  Send,
  MessageCircle,
  Mail,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  MapPin,
  Layers,
  Sparkles,
  Link2,
  ExternalLink,
  Percent,
} from 'lucide-react';
import { leadManagementApi } from '../../api/leadManagementApi';
import { salesQuotationsApi } from '../../api/salesQuotationsApi';
import type { Lead, SalesQuotation } from '../../types/admin';

interface GenerateQuotationFromLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead: Lead | null;
}

export default function GenerateQuotationFromLeadModal({
  isOpen,
  onClose,
  onSuccess,
  lead,
}: GenerateQuotationFromLeadModalProps) {
  const [activeTab, setActiveTab] = useState<'GENERATE' | 'LINK_EXISTING' | 'SEND'>('GENERATE');

  // Generation options
  const [ratePerUnit, setRatePerUnit] = useState<number>(9500);
  const [installationPerUnit, setInstallationPerUnit] = useState<number>(500);
  const [freightTerms, setFreightTerms] = useState<string>('Extra as Actual / To Pay');
  const [customNotes, setCustomNotes] = useState('');

  // Existing quotations search for linking
  const [existingQuotes, setExistingQuotes] = useState<SalesQuotation[]>([]);
  const [selectedExistingQuoteId, setSelectedExistingQuoteId] = useState<string>('');
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  // Send preview
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-set default rates according to product category
  useEffect(() => {
    if (lead) {
      if (lead.productCategory === 'RESTROOM_CUBICLE') {
        setRatePerUnit(9500);
        setInstallationPerUnit(500);
      } else if (lead.productCategory === 'LOCKER_SYSTEM') {
        setRatePerUnit(6500);
        setInstallationPerUnit(400);
      } else if (lead.productCategory === 'URINAL_PARTITION') {
        setRatePerUnit(3500);
        setInstallationPerUnit(300);
      } else {
        setRatePerUnit(12000);
        setInstallationPerUnit(800);
      }

      // Default WhatsApp text
      const quoteNo = lead.quotationNumber || 'PPS/D/26-27/---';
      const categoryLabel = lead.productCategory?.replace('_', ' ') || 'Cubicles';
      setCustomWhatsAppMsg(
        `Dear ${lead.firstName},\n\nThank you for your interest in Pacific Restroom Cubicles & Lockers. We are pleased to submit our formal commercial quotation ${quoteNo} for your ${categoryLabel} requirement at ${lead.company || lead.city || 'your site'}.\n\nPlease let us know if you require any material samples or technical drawings.\n\nWarm regards,\nPacific Restroom Cubicle Team\n+91 98112 34567`
      );

      // If already has quotation, default to SEND tab
      if (lead.quotationNumber) {
        setActiveTab('SEND');
      } else {
        setActiveTab('GENERATE');
      }
    }
  }, [lead, isOpen]);

  // Load existing quotations when clicking Link tab
  useEffect(() => {
    if (isOpen && activeTab === 'LINK_EXISTING') {
      const fetchQuotes = async () => {
        try {
          setIsLoadingQuotes(true);
          const res = await salesQuotationsApi.list({ limit: 100 });
          if (res.data?.data?.items) {
            setExistingQuotes(res.data.data.items);
            if (res.data.data.items.length > 0) {
              setSelectedExistingQuoteId(res.data.data.items[0].id);
            }
          }
        } catch (err) {
          console.warn('Could not fetch existing quotations:', err);
        } finally {
          setIsLoadingQuotes(false);
        }
      };
      fetchQuotes();
    }
  }, [isOpen, activeTab]);

  if (!isOpen || !lead) return null;

  // Real-time calculations
  const qty = Number(lead.estimatedQuantity) || 1;
  const basicPrice = qty * ratePerUnit;
  const installCharge = qty * installationPerUnit;
  const taxableAmount = basicPrice + installCharge;
  const gstAmount = Math.round(taxableAmount * 0.18);
  const totalAmount = taxableAmount + gstAmount;

  // Handle Generate Quotation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    try {
      setIsSubmitting(true);
      const res = await leadManagementApi.generateQuotation({
        leadId: lead.id,
        ratePerUnit,
        installationPerUnit,
        freightTerms,
        customNotes,
      });

      setSuccessMsg(`Formal Quotation ${res.data?.quotation?.referenceNumber} generated successfully!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to generate quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Link Existing Quotation
  const handleLinkExisting = async () => {
    if (!selectedExistingQuoteId) return;
    setError(null);

    const match = existingQuotes.find((q) => q.id === selectedExistingQuoteId);
    if (!match) return;

    try {
      setIsSubmitting(true);
      await leadManagementApi.linkExistingQuotation(lead.id, {
        id: match.id,
        referenceNumber: match.referenceNumber || 'PPS/D/---',
        grandTotal: Number(match.grandTotal) || undefined,
        status: match.status,
      });

      setSuccessMsg(`Quotation ${match.referenceNumber} successfully linked!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to link quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle WhatsApp click-to-chat dispatch
  const handleSendWhatsApp = () => {
    if (!lead.phone) {
      alert('Phone number missing on this lead.');
      return;
    }
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(customWhatsAppMsg);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#09071a] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Glow Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500" />

        {/* Title Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Quotation Integration & Dispatch
              </h2>
              <p className="text-xs text-gray-400">
                Link commercial quote for {lead.firstName} {lead.lastName || ''} ({lead.productCategory?.replace('_', ' ')})
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

        {/* Lead Context Pill */}
        <div className="mt-3 p-3 bg-white/5 border border-white/5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-emerald-400">{lead.leadNumber}</span>
            <span className="text-gray-300 font-semibold">{lead.company || `${lead.firstName} ${lead.lastName || ''}`}</span>
            {lead.city && <span className="text-gray-400">• {lead.city}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] text-gray-300">
              {lead.productCategory?.replace('_', ' ')}: {lead.estimatedQuantity} Units
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                lead.status === 'INTERESTED'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : lead.status === 'QUOTATION_SENT'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              Status: {lead.status}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-4 border-b border-white/10 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('GENERATE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'GENERATE'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            1-Click Generate Quote
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LINK_EXISTING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'LINK_EXISTING'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Link Existing Quote
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SEND')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'SEND'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Send Quote to Customer
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: 1-Click Generate Formal Quote */}
        {activeTab === 'GENERATE' && (
          <form onSubmit={handleGenerate} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 leading-relaxed">
              <strong>Instant ERP Integration:</strong> Creates a formal Sales Quotation (<code className="font-mono">PPS/D/26-27/...</code>)
              with pre-filled technical specifications, advances lead status to <strong>QUOTATION_SENT</strong>, and records an audit follow-up touchpoint automatically.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Rate Per Unit (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-gray-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={ratePerUnit}
                    onChange={(e) => setRatePerUnit(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Installation / Unit (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-gray-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={installationPerUnit}
                    onChange={(e) => setInstallationPerUnit(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Freight & Handling Terms</label>
                <select
                  value={freightTerms}
                  onChange={(e) => setFreightTerms(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Extra as Actual / To Pay">Extra as Actual / To Pay</option>
                  <option value="Included in basic price">Included in basic price</option>
                  <option value="To Pay at Destination">To Pay at Destination</option>
                </select>
              </div>
            </div>

            {/* Live Commercial Calculation Dock */}
            <div className="p-4 bg-black/50 border border-white/10 rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Supply Basic ({qty} units × ₹{ratePerUnit.toLocaleString('en-IN')})</span>
                <span className="text-white">₹{basicPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Installation & Erection ({qty} units × ₹{installationPerUnit.toLocaleString('en-IN')})</span>
                <span className="text-white">₹{installCharge.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-400 pt-1 border-t border-white/10">
                <span>Taxable Amount</span>
                <span className="text-white font-semibold">₹{taxableAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>GST (18%)</span>
                <span className="text-white">₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold text-sm pt-2 border-t border-white/10">
                <span>Grand Total (Net Commercial Amount)</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Quotation Notes / Terms</label>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                placeholder="e.g. 50% Advance with Purchase Order, Balance against Proforma Invoice before dispatch."
              />
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
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmitting ? 'Generating Quotation...' : 'Generate & Link Formal Quotation'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Link Existing Quotation */}
        {activeTab === 'LINK_EXISTING' && (
          <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
            <p className="text-xs text-gray-400 leading-relaxed">
              Select an existing Sales Quotation created previously in the Pacific Quotation Hub to attach to this lead record.
            </p>

            {isLoadingQuotes ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading existing quotations...</div>
            ) : existingQuotes.length === 0 ? (
              <div className="p-6 bg-white/5 rounded-xl text-center text-xs text-gray-400">
                No existing quotations found in the database.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {existingQuotes.map((q) => {
                  const isSelected = selectedExistingQuoteId === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedExistingQuoteId(q.id)}
                      className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-500/50 text-white'
                          : 'bg-white/5 border-white/5 hover:border-white/15 text-gray-300'
                      }`}
                    >
                      <div>
                        <div className="font-mono font-bold text-sky-400">{q.referenceNumber}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5">
                          {q.projectName || q.recipientCompany || q.recipientName}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-white">
                          ₹{Number(q.grandTotal || 0).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                          {q.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLinkExisting}
                disabled={isSubmitting || !selectedExistingQuoteId}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition shadow-lg shadow-sky-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Link2 className="w-4 h-4" />
                {isSubmitting ? 'Linking...' : 'Link Selected Quotation'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Send Quotation to Customer */}
        {activeTab === 'SEND' && (
          <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Linked Quotation Details</span>
                {lead.quotationNumber && (
                  <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    {lead.quotationNumber}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                <div>
                  <span className="text-gray-500">Recipient Phone:</span> {lead.phone || '—'}
                </div>
                <div>
                  <span className="text-gray-500">Recipient Email:</span> {lead.email || '—'}
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span>{' '}
                  <span className="font-mono text-emerald-400 font-bold">
                    ₹{Number(lead.quotationAmount || lead.estimatedValue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span> {lead.quotationStatus || 'SENT'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                WhatsApp Dispatch Message Preview
              </label>
              <textarea
                rows={5}
                value={customWhatsAppMsg}
                onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Dispatch via WhatsApp ({lead.phone || 'Phone'})
              </button>

              {lead.email && (
                <button
                  type="button"
                  onClick={() => {
                    const mailto = `mailto:${lead.email}?subject=${encodeURIComponent(
                      `Formal Quotation ${lead.quotationNumber || ''} - Pacific Restroom Cubicles`
                    )}&body=${encodeURIComponent(customWhatsAppMsg)}`;
                    window.location.href = mailto;
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 transition flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Open in Email Client
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
