import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FileText, ArrowLeft, Printer, Edit, CheckCircle2, Send,
  MapPin, Calendar, User, Building2, Hash, RefreshCw, Trash2,
  AlertTriangle, Clock, Mail, X, Phone, MessageCircle, MessageSquare, Sparkles,
} from 'lucide-react';
import { salesQuotationsApi } from '../api/salesQuotationsApi';
import { useAdminAuth } from '../context/AdminAuthContext';
import QuotationFollowupModal from '../components/quotations/QuotationFollowupModal';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import { calculateGstSplit } from '../utils/tax';

interface QuotationDetail {
  id: string;
  referenceNumber?: string;
  quotationNumber?: string;
  revisionNumber: number;
  date: string;
  validUntil?: string;
  status: string;
  nextFollowupDate?: string;
  followupStatus?: string;
  lastFollowupDate?: string;
  followupCount?: number;
  followups?: any[];
  projectName?: string;
  subject?: string;
  title?: string;
  currency: string;
  // Recipient
  recipientSalutation?: string;
  recipientName?: string;
  recipientCompany?: string;
  recipientAddress?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  // Pricing
  basicPrice?: number;
  installationCharge?: number;
  installationRatePerCubicle?: number;
  installationCubicleCount?: number;
  freightTerms?: string;
  freightAmount?: number;
  gstRate?: number;
  isSezExempt?: boolean;
  // frontend compat alias
  isSez?: boolean;
  sezCertificateRef?: string;
  gstAmount?: number;
  grandTotal?: number;
  taxableAmount?: number;
  subtotal?: number;
  amountInWords?: string;
  // Terms
  paymentTerms?: string;
  deliveryTerms?: string;
  warrantyText?: string;
  accessoriesText?: string;
  generalTerms?: string;
  otherTerms?: string;
  notes?: string;
  termsAndConditions?: string;
  // Site (legacy draft format)
  siteName?: string;
  siteAddress?: string;
  // Relations
  customer?: { legalName?: string; tradeName?: string; email?: string; phone?: string };
  companyProfile?: { companyName?: string; logoUrl?: string };
  issuingStaff?: { firstName?: string; lastName?: string; email?: string };
  items: Array<{
    id?: string;
    serialNumber: number;
    description?: string;
    itemDescription?: string;
    unit?: string;
    quantity: number;
    rate?: number;
    unitPrice?: number;
    amount?: number;
    totalAmount?: number;
    cubicleSize?: string;
    boardColor?: string;
    boardThickness?: string;
    doorSize?: string;
    overallHeight?: string;
  }>;
  revisions?: Array<{ id: string; revisionNumber: number; reason?: string; createdAt?: string }>;
  convertedOrderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-white/5 text-gray-300 border-white/10',
  SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACCEPTED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  CONVERTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  EXPIRED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export default function SalesQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useAdminAuth();

  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [sendingStatus, setSendingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    subject: '',
    message: '',
  });
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [showFollowupModal, setShowFollowupModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    salesQuotationsApi
      .getById(id)
      .then((res) => {
        const data = res.data?.data ?? (res.data as any);
        setQuotation(data);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load quotation');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const quotationNum = quotation?.referenceNumber || quotation?.quotationNumber || '—';
  const rawPhone = quotation?.recipientPhone || quotation?.customer?.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const whatsappMsg = `Dear ${quotation?.recipientName || quotation?.customer?.legalName || 'Client'},\n\nGreetings from Pacific Products & Solutions!\n\nFollowing up on formal commercial quotation ${quotationNum} for ${quotation?.projectName || 'Toilet Cubicles'} (Amount: ₹${Number(quotation?.grandTotal || 0).toLocaleString('en-IN')}). Please let us know if you require any technical adjustments, board color samples, or site measurement.\n\nLooking forward to hearing from you!`;

  const handlePrintPdf = async () => {
    if (!id) return;
    setPdfLoading(true);
    try {
      const pdfUrl = salesQuotationsApi.getPdfUrl(id);
      const res = await fetch(pdfUrl, {
        headers: { Authorization: `Bearer ${localStorage.getItem('pacific_access_token') || ''}` },
      });
      const html = await res.text();
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 600);
      }
    } catch {
      const url = salesQuotationsApi.getPdfUrl(id);
      window.open(url, '_blank');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleOpenEmailModal = () => {
    if (!quotation) return;
    const defaultEmail = quotation.recipientEmail || quotation.customer?.email || '';
    setEmailForm({
      recipientEmail: defaultEmail,
      subject: `Pacific Quotation Ref: ${quotationNum} — ${quotation.projectName || quotation.title || 'Restroom Cubicles Offer'}`,
      message: '',
    });
    setEmailErrors({});
    setEmailSuccess(null);
    setShowEmailModal(true);
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !quotation) return;

    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailForm.recipientEmail.trim()) {
      errors.recipientEmail = 'Recipient email address is required.';
    } else if (!emailRegex.test(emailForm.recipientEmail.trim())) {
      errors.recipientEmail = 'Please enter a valid email address (e.g. client@company.com).';
    }

    if (!emailForm.subject.trim()) {
      errors.subject = 'Subject is required.';
    }

    if (Object.keys(errors).length > 0) {
      setEmailErrors(errors);
      return;
    }

    setSendingEmail(true);
    setEmailErrors({});
    try {
      const res = await salesQuotationsApi.sendEmail(id, {
        recipientEmail: emailForm.recipientEmail.trim(),
        subject: emailForm.subject.trim(),
        message: emailForm.message.trim() || undefined,
      });
      const msg = res.data?.message || `Quotation successfully emailed to ${emailForm.recipientEmail}`;
      setEmailSuccess(msg);
      setQuotation((prev) => (prev ? { ...prev, status: 'SENT' } : prev));
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailSuccess(null);
      }, 2200);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to send email';
      setEmailErrors({ form: errMsg });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMarkSent = async () => {
    if (!id || !quotation) return;
    setSendingStatus(true);
    try {
      await salesQuotationsApi.send(id);
      setQuotation((prev) => prev ? { ...prev, status: 'SENT' } : prev);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to mark as sent');
    } finally {
      setSendingStatus(false);
    }
  };

  const handleConvertToPI = async () => {
    if (!id || !quotation) return;
    if (!confirm(`Convert Quotation ${quotationNum} into an official Proforma Invoice (Stage 2)?\n\nThis will generate the PI with cubicle specifications and initialize the Advance Payment Tracking system.`)) return;
    setConverting(true);
    try {
      const res = await salesQuotationsApi.convertToPI(id);
      const piNumber = (res.data?.data as any)?.piNumber || 'Proforma Invoice';
      alert(`Successfully generated Proforma Invoice: ${piNumber}`);
      navigate('/admin/dashboard/proforma-invoices');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Conversion to PI failed');
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !quotation) return;
    if (!confirm(`Permanently delete quotation ${quotationNum}? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await salesQuotationsApi.delete(id);
      navigate('/admin/dashboard/sales-quotations');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete quotation');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading quotation details...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 text-sm">{error || 'Quotation not found'}</p>
          <Link
            to="/admin/dashboard/sales-quotations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-sm hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </Link>
        </div>
      </div>
    );
  }

  const items = quotation.items || [];
  const calculatedItemsTotal = items.reduce(
    (sum, it) => sum + Number(it.rate ?? it.unitPrice ?? 0) * Number(it.quantity ?? 1),
    0
  );
  const basicPrice = Number(quotation.basicPrice || calculatedItemsTotal || quotation.taxableAmount || 0);
  const isSez = quotation.isSezExempt || quotation.isSez || false;
  const gstAmount = Number(quotation.gstAmount || (isSez ? 0 : Math.round(basicPrice * ((quotation.gstRate ?? 18) / 100))));
  const grandTotal = Number(
    quotation.grandTotal ||
      basicPrice + Number(quotation.installationCharge || 0) + Number(quotation.freightAmount || 0) + gstAmount
  );
  const statusStyle = STATUS_STYLES[quotation.status] || STATUS_STYLES['DRAFT'];

  return (
    <div className="space-y-5 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          to="/admin/dashboard/sales-quotations"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Sales Quotation Letters
        </Link>
      </div>

      {/* Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white font-mono">
                  {quotationNum}
                </h1>
                {quotation.revisionNumber > 1 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Rev {quotation.revisionNumber}
                  </span>
                )}
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusStyle}`}>
                  {quotation.status}
                </span>
                {isSez && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    SEZ 0% IGST
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                {quotation.customer?.legalName || quotation.recipientCompany || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Follow-Up Hub Button */}
          <button
            onClick={() => navigate(`/admin/dashboard/sales-quotations/${id}/follow-up`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-gradient-to-r from-[#7FB706] to-[#B5F823] hover:opacity-95 text-black font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-[#7FB706]/20"
            title="Open Follow-Up & Client Engagement Hub"
          >
            <Clock className="w-4 h-4" /> Follow-Up ({quotation.followupCount || 0})
          </button>

          {/* Quick Direct WhatsApp */}
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 rounded-xl text-sm font-semibold transition-all"
              title="Chat with client on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}

          {/* Quick Direct Call */}
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-sm font-semibold transition-all"
              title="Call client directly"
            >
              <Phone className="w-4 h-4" /> Call
            </a>
          )}

          <button
            onClick={handlePrintPdf}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {pdfLoading ? 'Loading...' : 'Print / PDF'}
          </button>

          <button
            onClick={handleOpenEmailModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            title="Email quotation directly to customer via Resend"
          >
            <Mail className="w-4 h-4" /> Email to Customer
          </button>

          {quotation.status === 'DRAFT' && (
            <button
              onClick={handleMarkSent}
              disabled={sendingStatus}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sendingStatus ? 'Marking...' : 'Mark Sent'}
            </button>
          )}

          <Link
            to={`/admin/dashboard/sales-quotations/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            <Edit className="w-4 h-4" /> Edit
          </Link>

          {quotation.status !== 'CONVERTED' ? (
            <button
              onClick={handleConvertToPI}
              disabled={converting}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {converting ? 'Generating PI...' : 'Convert to PI (Stage 2)'}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Converted to PI
            </span>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* ── Universal 7-Stage Document Timeline (Stage 1 highlighted) ── */}
      <DocumentFlowTimeline
        currentStage={1}
        documentRef={quotationNum}
        currentStatus={quotation.status}
        linkedDocs={{
          quotationId: quotation.id,
          quotationRef: quotationNum,
          piId: (quotation as any).convertedPiId,
          orderId: (quotation as any).convertedOrderId,
        }}
      />

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Customer & Recipient Info */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Recipient
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-xs text-gray-500">Customer</div>
              <div className="font-semibold text-white">{quotation.customer?.legalName || '—'}</div>
            </div>
            {quotation.recipientName && (
              <div>
                <div className="text-xs text-gray-500">Contact Person</div>
                <div className="text-gray-300">
                  {quotation.recipientSalutation} {quotation.recipientName}
                </div>
              </div>
            )}
            {quotation.recipientCompany && (
              <div>
                <div className="text-xs text-gray-500">Company</div>
                <div className="text-gray-300">{quotation.recipientCompany}</div>
              </div>
            )}
            {quotation.recipientAddress && (
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="text-gray-400 text-xs leading-relaxed">{quotation.recipientAddress}</div>
              </div>
            )}
            {quotation.recipientEmail && (
              <div className="text-xs text-gray-400">{quotation.recipientEmail}</div>
            )}
            {quotation.recipientPhone && (
              <div className="text-xs text-gray-400">{quotation.recipientPhone}</div>
            )}
          </div>
        </div>

        {/* Project & Dates */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Project Details
          </h3>
          <div className="space-y-2 text-sm">
            {quotation.projectName && (
              <div>
                <div className="text-xs text-gray-500">Project Name</div>
                <div className="font-semibold text-white">{quotation.projectName}</div>
              </div>
            )}
            {(quotation.siteName || quotation.siteAddress) && (
              <div>
                <div className="text-xs text-gray-500">Site</div>
                <div className="text-gray-300">
                  {quotation.siteName}
                  {quotation.siteName && quotation.siteAddress && ', '}
                  {quotation.siteAddress}
                </div>
              </div>
            )}
            {quotation.subject && (
              <div>
                <div className="text-xs text-gray-500">Subject</div>
                <div className="text-gray-400 text-xs leading-relaxed">{quotation.subject}</div>
              </div>
            )}
            <div className="flex items-center gap-1.5 pt-1">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-400">
                Dated: <strong className="text-white">{new Date(quotation.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </span>
            </div>
            {quotation.validUntil && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-400">
                  Valid Until: <strong className="text-amber-400">{new Date(quotation.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" /> Pricing
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Basic Price</span>
              <span className="text-gray-300 font-mono">₹ {basicPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {Number(quotation.installationCharge || 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">
                  Installation
                  {quotation.installationRatePerCubicle ? (
                    <span className="text-[11px] text-[#7FB706] ml-1 font-mono">
                      (@ ₹ {quotation.installationRatePerCubicle.toLocaleString('en-IN')}/Cubicle{quotation.installationCubicleCount ? ` for ${quotation.installationCubicleCount} Cubicles` : ''})
                    </span>
                  ) : null}
                </span>
                <span className="text-gray-300 font-mono">₹ {Number(quotation.installationCharge).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {Number(quotation.freightAmount || 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Freight ({quotation.freightTerms || 'Extra'})</span>
                <span className="text-gray-300 font-mono">₹ {Number(quotation.freightAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {(() => {
              const breakdown = calculateGstSplit(
                basicPrice + Number(quotation.installationCharge || 0) + Number(quotation.freightAmount || 0),
                null,
                null,
                isSez,
                Number(quotation.gstRate ?? 18),
                ((quotation.customer as any)?.gstin || (quotation as any)?.recipientGstin || null),
                quotation.recipientAddress
              );

              if (breakdown.isSez) {
                return (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">GST (SEZ Exempt 0%)</span>
                    <span className="text-gray-300 font-mono">₹ 0.00</span>
                  </div>
                );
              }

              if (breakdown.isDelhi) {
                return (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">CGST (9%)</span>
                      <span className="text-gray-300 font-mono">₹ {breakdown.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">SGST (9%)</span>
                      <span className="text-gray-300 font-mono">₹ {breakdown.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                );
              }

              return (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">IGST ({quotation.gstRate ?? 18}%)</span>
                  <span className="text-gray-300 font-mono">₹ {breakdown.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })()}
            <div className="flex justify-between pt-2 border-t border-white/5">
              <span className="font-bold text-white">Grand Total ({quotation.currency})</span>
              <span className="font-bold text-[#7FB706] text-lg font-mono">
                ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {quotation.amountInWords && (
              <p className="text-[11px] text-gray-500 italic leading-relaxed">{quotation.amountInWords}</p>
            )}
          </div>
        </div>

        {/* Card 4: Follow-Up & Touchpoints Hub */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#B5F823]" /> Follow-Up Hub
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono font-bold">
                {quotation.followupCount || 0} Touches
              </span>
            </div>

            <div>
              <div className="text-xs text-gray-500">Next Scheduled Touchpoint</div>
              <div className="font-semibold text-white mt-0.5">
                {quotation.nextFollowupDate ? (
                  <span className="text-amber-300 flex items-center gap-1 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(quotation.nextFollowupDate).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">No follow-up scheduled</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Current Lead Status</div>
              <div className="text-xs text-gray-300 mt-0.5 font-medium">
                {quotation.followupStatus ? quotation.followupStatus.replace('_', ' ') : 'PENDING'}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <a
                href={cleanPhone ? `tel:${cleanPhone}` : '#'}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 text-xs font-bold ${
                  cleanPhone
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                    : 'bg-white/5 text-gray-500 opacity-50 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  if (!cleanPhone) { e.preventDefault(); alert('No contact phone recorded'); }
                }}
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </a>

              <a
                href={cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 text-xs font-bold ${
                  cleanPhone
                    ? 'bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30'
                    : 'bg-white/5 text-gray-500 opacity-50 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  if (!cleanPhone) { e.preventDefault(); alert('No contact phone recorded'); }
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            </div>

            <button
              onClick={() => navigate(`/admin/dashboard/sales-quotations/${id}/follow-up`)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity cursor-pointer shadow-md shadow-[#7FB706]/20"
            >
              <Sparkles className="w-3.5 h-3.5" /> Manage & Log Discussion
            </button>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      {items.length > 0 && (
        <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="text-sm font-bold text-white">Line Items</h3>
          </div>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-[#0a0a1a] text-xs uppercase text-gray-500 border-b border-white/5">
                <tr>
                  <th className="py-3 px-4 text-center w-10">S.No</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center w-16">Unit</th>
                  <th className="py-3 px-4 text-right w-16">Qty</th>
                  <th className="py-3 px-4 text-right w-28">Rate (₹)</th>
                  <th className="py-3 px-4 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item, idx) => {
                  const rate = Number(item.rate ?? item.unitPrice ?? 0);
                  const qty = Number(item.quantity ?? 0);
                  const amount = Number(item.amount ?? item.totalAmount ?? qty * rate);
                  const desc = item.description || item.itemDescription || '—';
                  return (
                    <tr key={item.id ?? idx} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-center font-mono text-gray-400">{item.serialNumber ?? idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{desc}</div>
                        {(item.cubicleSize || item.boardThickness || item.boardColor || item.doorSize || item.overallHeight) && (
                          <div className="mt-1 text-[11px] text-gray-500 space-y-0.5">
                            {item.cubicleSize && <div>• Size: {item.cubicleSize}</div>}
                            {item.boardColor && <div>• Color: {item.boardColor}</div>}
                            {item.boardThickness && <div>• Thickness: {item.boardThickness}</div>}
                            {item.doorSize && <div>• Door: {item.doorSize}</div>}
                            {item.overallHeight && <div>• Height: {item.overallHeight}</div>}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-400">{item.unit || 'NOS'}</td>
                      <td className="py-3 px-4 text-right font-mono">{qty}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                        {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="md:hidden divide-y divide-white/5">
            {items.map((item, idx) => {
              const rate = Number(item.rate ?? item.unitPrice ?? 0);
              const qty = Number(item.quantity ?? 0);
              const amount = Number(item.amount ?? item.totalAmount ?? qty * rate);
              const desc = item.description || item.itemDescription || '—';
              return (
                <div key={item.id ?? idx} className="p-4 space-y-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="text-xs text-gray-500 font-mono">#{item.serialNumber ?? idx + 1}</span>
                      <div className="font-medium text-white text-sm">{desc}</div>
                    </div>
                    <div className="font-bold text-[#7FB706] font-mono text-sm ml-3">
                      ₹ {amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {qty} {item.unit || 'NOS'} × ₹{rate.toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Terms & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(quotation.paymentTerms || quotation.deliveryTerms || quotation.generalTerms || quotation.termsAndConditions) && (
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Terms & Conditions</h3>
            {quotation.paymentTerms && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-0.5">Payment Terms</div>
                <p className="text-xs text-gray-300 leading-relaxed">{quotation.paymentTerms}</p>
              </div>
            )}
            {quotation.deliveryTerms && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-0.5">Delivery & Lead Time</div>
                <p className="text-xs text-gray-300 leading-relaxed">{quotation.deliveryTerms}</p>
              </div>
            )}
            {quotation.generalTerms && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-0.5">General Terms</div>
                <p className="text-xs text-gray-300 leading-relaxed">{quotation.generalTerms}</p>
              </div>
            )}
            {quotation.termsAndConditions && !quotation.paymentTerms && (
              <p className="text-xs text-gray-300 leading-relaxed">{quotation.termsAndConditions}</p>
            )}
            {quotation.warrantyText && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-0.5">Warranty</div>
                <p className="text-xs text-gray-300 leading-relaxed">{quotation.warrantyText}</p>
              </div>
            )}
          </div>
        )}

        {(quotation.accessoriesText || quotation.notes || quotation.otherTerms) && (
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Notes & Accessories</h3>
            {quotation.accessoriesText && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-0.5">Standard Inclusions</div>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{quotation.accessoriesText}</p>
              </div>
            )}
            {quotation.notes && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-0.5">Internal Notes</div>
                <p className="text-xs text-gray-400 italic leading-relaxed">{quotation.notes}</p>
              </div>
            )}
            {quotation.otherTerms && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-0.5">Other Terms</div>
                <p className="text-xs text-gray-300 leading-relaxed">{quotation.otherTerms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Revision History */}
      {quotation.revisions && quotation.revisions.length > 0 && (
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Revision History</h3>
          <div className="space-y-2">
            {quotation.revisions.map((rev) => (
              <div key={rev.id} className="flex items-center gap-3 text-xs text-gray-400">
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded font-bold text-amber-400">
                  R{rev.revisionNumber}
                </span>
                <span>{rev.reason || 'Revision'}</span>
                {rev.createdAt && (
                  <span className="text-gray-500 ml-auto">
                    {new Date(rev.createdAt).toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta Footer */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        {quotation.issuingStaff && (
          <span>Issued by: {quotation.issuingStaff.firstName} {quotation.issuingStaff.lastName}</span>
        )}
        {quotation.createdAt && (
          <span>Created: {new Date(quotation.createdAt).toLocaleString('en-GB')}</span>
        )}
        {quotation.updatedAt && (
          <span>Updated: {new Date(quotation.updatedAt).toLocaleString('en-GB')}</span>
        )}
      </div>

      {/* Email Quotation Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Send Quotation to Customer</h3>
                  <p className="text-[11px] text-gray-400 font-mono">{quotationNum}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-1 text-gray-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="p-5 space-y-4">
              {emailSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{emailSuccess}</span>
                </div>
              )}

              {emailErrors.form && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{emailErrors.form}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Customer / Recipient Email *
                </label>
                <input
                  type="email"
                  value={emailForm.recipientEmail}
                  onChange={(e) => {
                    setEmailForm((f) => ({ ...f, recipientEmail: e.target.value }));
                    if (emailErrors.recipientEmail) {
                      setEmailErrors((prev) => {
                        const { recipientEmail, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  placeholder="client@company.com"
                  className={`w-full bg-[#0a0a1a] border rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors ${
                    emailErrors.recipientEmail ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-indigo-500'
                  }`}
                  required
                />
                {emailErrors.recipientEmail && (
                  <p className="mt-1 text-xs text-red-400">{emailErrors.recipientEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => {
                    setEmailForm((f) => ({ ...f, subject: e.target.value }));
                    if (emailErrors.subject) {
                      setEmailErrors((prev) => {
                        const { subject, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  placeholder="Quotation for Toilet Cubicle System"
                  className={`w-full bg-[#0a0a1a] border rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors ${
                    emailErrors.subject ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-indigo-500'
                  }`}
                  required
                />
                {emailErrors.subject && (
                  <p className="mt-1 text-xs text-red-400">{emailErrors.subject}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Custom Message / Note (optional)
                </label>
                <textarea
                  rows={3}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Add any specific notes, delivery details, or greetings for the client..."
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-400 space-y-1">
                <div>• Delivered via <strong>Resend</strong> infrastructure.</div>
                <div>• Formal HTML quotation letter attached automatically.</div>
                <div>• Embedded QR verification code included.</div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  disabled={sendingEmail}
                  className="px-4 py-2 min-h-[40px] bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail || Boolean(emailSuccess)}
                  className="inline-flex items-center gap-2 px-5 py-2 min-h-[40px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingEmail ? 'Sending via Resend...' : emailSuccess ? 'Sent!' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quotation Follow-up Modal */}
      {showFollowupModal && quotation && (
        <QuotationFollowupModal
          quotation={quotation as any}
          isOpen={showFollowupModal}
          onClose={() => setShowFollowupModal(false)}
          onFollowupLogged={(updatedQuote) => {
            setQuotation((prev) => (prev ? { ...prev, ...updatedQuote } : prev));
          }}
        />
      )}
    </div>
  );
}
