import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Search, Plus, Printer, Download,
  CheckCircle2, Send,
  RefreshCw, X, Edit, Trash2, Mail, AlertTriangle,
  Clock, Calendar,
} from 'lucide-react';
import { salesQuotationsApi } from '../api/services';
import { useAdminAuth } from '../context/AdminAuthContext';
import type { SalesQuotation } from '../types/admin';
import QuotationFollowupModal from '../components/quotations/QuotationFollowupModal';

export default function SalesQuotationsPage() {
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [previewQuotation, setPreviewQuotation] = useState<SalesQuotation | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [revisionTarget, setRevisionTarget] = useState<SalesQuotation | null>(null);
  const [revisionReason, setRevisionReason] = useState('');
  const [followupQuotation, setFollowupQuotation] = useState<SalesQuotation | null>(null);

  // Email Modal State
  const [emailQuote, setEmailQuote] = useState<SalesQuotation | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  const renderFollowupBadge = (q: SalesQuotation) => {
    if (q.status === 'CONVERTED') {
      return (
        <span className="text-gray-500 text-xs">—</span>
      );
    }
    if (!q.nextFollowupDate) {
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
          Pending Setup
        </span>
      );
    }
    const diffMin = Math.round((new Date(q.nextFollowupDate).getTime() - Date.now()) / (60 * 1000));
    if (diffMin < 0) {
      const hours = Math.abs(Math.round(diffMin / 60));
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
          Overdue {hours > 0 ? `${hours}h` : `${Math.abs(diffMin)}m`}
        </span>
      );
    }
    if (diffMin <= 180) {
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          Due in {hours > 0 ? `${hours}h ` : ''}{mins}m
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
        <Calendar className="w-2.5 h-2.5" />
        {new Date(q.nextFollowupDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  };

  const handleOpenPreview = async (quote: SalesQuotation) => {
    setPreviewQuotation(quote);
    setPdfHtml('');
    setLoadingPdf(true);
    try {
      const res = await fetch(salesQuotationsApi.getPdfUrl(quote.id), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pacific_access_token') || ''}`,
        },
      });
      const html = await res.text();
      setPdfHtml(html);
    } catch (err) {
      console.error('Failed to load quotation PDF preview:', err);
    } finally {
      setLoadingPdf(false);
    }
  };

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, search };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await salesQuotationsApi.list(params);
      if (res.data?.data) {
        setQuotations(res.data.data.items || []);
        setTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // 1-Click Convert to Proforma Invoice (Stage 2)
  const handleConvertToPI = async (quote: SalesQuotation) => {
    if (!confirm(`Convert Quotation ${quote.referenceNumber || quote.quotationNumber} into an official Proforma Invoice (Stage 2)?\n\nThis creates the PI and initializes the Advance Payment Tracking system.`)) return;
    try {
      const res = await salesQuotationsApi.convertToPI(quote.id);
      const piNum = res.data?.data?.piNumber || 'Proforma Invoice';
      alert(`Successfully generated Proforma Invoice: ${piNum}`);
      fetchQuotations();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Conversion to PI failed');
    }
  };

  // Revision submit
  const handleSubmitRevision = async () => {
    if (!revisionTarget) return;
    try {
      await salesQuotationsApi.revise(revisionTarget.id, {
        reason: revisionReason,
        items: revisionTarget.items,
        discountAmount: revisionTarget.discountAmount,
        termsAndConditions: revisionTarget.termsAndConditions,
      });
      setRevisionTarget(null);
      setRevisionReason('');
      fetchQuotations();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Revision failed');
    }
  };


  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to permanently delete quotation ${num}? This action cannot be undone.`)) return;
    try {
      await salesQuotationsApi.delete(id);
      fetchQuotations();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete quotation');
    }
  };

  const handleOpenEmail = (quote: SalesQuotation) => {
    setEmailQuote(quote);
    const quoteNum = quote.referenceNumber || quote.quotationNumber || '';
    setRecipientEmail(quote.recipientEmail || quote.customer?.email || '');
    setEmailSubject(`Quotation ${quoteNum} - ${quote.projectName || 'Pacific Cubicles'}`);
    setEmailMessage(
      `Dear ${quote.recipientName || quote.customer?.contactName || quote.customer?.legalName || 'Customer'},\n\nPlease find attached quotation ${quoteNum} for your project ${quote.projectName || ''}.\n\nKindly review and let us know if you need any further clarifications.\n\nBest regards,\nPacific Products & Solutions`
    );
    setEmailError(null);
    setEmailSuccess(null);
  };

  const handleSendEmailFromList = async () => {
    if (!emailQuote) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail.trim())) {
      setEmailError('Please enter a valid recipient email address');
      return;
    }

    setSendingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);

    const quoteNum = emailQuote.referenceNumber || emailQuote.quotationNumber || '';
    try {
      await salesQuotationsApi.sendEmail(emailQuote.id, {
        recipientEmail: recipientEmail.trim(),
        subject: emailSubject.trim() || `Quotation ${quoteNum}`,
        message: emailMessage.trim() || undefined,
        customNotes: emailMessage.trim() || undefined,
      });
      setEmailSuccess('Quotation email sent successfully!');
      setTimeout(() => {
        setEmailQuote(null);
        setEmailSuccess(null);
        fetchQuotations();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to send quotation email:', err);
      setEmailError(err.response?.data?.message || err.message || 'Failed to send email. Please verify Resend configuration.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white">Sales Quotation Letters</h1>
              <p className="text-[11px] sm:text-sm text-gray-400">
                Formal project-specific proposal letters with narrative clauses, SEZ exemption & 1-click order conversion
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/admin/dashboard/sales-quotations/new"
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 sm:px-5 sm:py-3 min-h-[38px] sm:min-h-[48px] bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Draft Quotation Letter
        </Link>
      </div>


      {/* KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-[#121226] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-4">
          <div className="text-[10px] sm:text-xs text-gray-400">Total Quotations</div>
          <div className="text-lg sm:text-2xl font-bold text-white mt-0.5 sm:mt-1">{quotations.length}</div>
          <div className="text-[10px] sm:text-[11px] text-[#7FB706] mt-0.5 sm:mt-1 font-mono truncate">PPS/QT/26-27/... Series</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-4">
          <div className="text-[10px] sm:text-xs text-gray-400">Sent to Clients</div>
          <div className="text-lg sm:text-2xl font-bold text-blue-400 mt-0.5 sm:mt-1">
            {quotations.filter((q) => q.status === 'SENT').length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 sm:mt-1 truncate">Awaiting acceptance</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-4">
          <div className="text-[10px] sm:text-xs text-gray-400">Converted to Orders</div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400 mt-0.5 sm:mt-1">
            {quotations.filter((q) => q.status === 'CONVERTED').length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-500/80 mt-0.5 sm:mt-1 truncate">Active fulfillment pipeline</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-4">
          <div className="text-[10px] sm:text-xs text-gray-400">SEZ Zero-Rated</div>
          <div className="text-lg sm:text-2xl font-bold text-amber-400 mt-0.5 sm:mt-1">
            {quotations.filter((q) => q.isSez).length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-amber-500/80 mt-0.5 sm:mt-1 truncate">Statutory LUT compliance</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#121226] border border-white/5 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search quotation reference, site, or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-lg sm:rounded-xl pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'CONVERTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[34px] sm:min-h-[40px] ${
                statusFilter === st
                  ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
          <button
            onClick={() => fetchQuotations()}
            className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg sm:rounded-xl min-h-[34px] min-w-[34px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Quotations List: Table on Desktop, Card on Mobile */}
      <div className="bg-[#121226] border border-white/5 rounded-xl sm:rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 sm:p-12 text-center text-gray-400 text-xs sm:text-sm">Loading sales quotations...</div>
        ) : quotations.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-gray-500 space-y-2">
            <FileText className="w-8 h-8 sm:w-10 sm:h-10 mx-auto opacity-30" />
            <p className="text-xs sm:text-sm">No sales quotations found matching criteria</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0a0a1a] text-xs uppercase text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center w-12">#</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Quotation Number</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Customer</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Date</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Grand Total</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Status</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Follow-Up</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {quotations.map((q, idx) => (
                    <tr
                      key={q.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/dashboard/sales-quotations/${q.id}`)}
                    >
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-mono text-gray-400 text-xs">
                        {(page - 1) * 15 + idx + 1}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                        <div className="font-mono font-semibold text-white flex items-center gap-1.5">
                          {q.referenceNumber || q.quotationNumber || '—'}
                        </div>
                        {q.isSez && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            SEZ 0% IGST
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                        <div className="font-medium text-white">{q.customer?.legalName || q.recipientCompany || 'N/A'}</div>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-xs text-gray-300">
                        <div>{new Date(q.date).toLocaleDateString('en-GB')}</div>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-[#7FB706]">
                        ₹ {Number(q.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            q.status === 'CONVERTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : q.status === 'SENT'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : q.status === 'ACCEPTED'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-white/5 text-gray-300'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td
                        className="py-2.5 sm:py-3 px-3 sm:px-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/dashboard/sales-quotations/${q.id}/follow-up`);
                        }}
                      >
                        <div className="flex flex-col gap-1 cursor-pointer">
                          {renderFollowupBadge(q)}
                          {q.followupStatus && q.followupStatus !== 'PENDING' && q.followupStatus !== 'ORDER_CONFIRMED' && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              {q.followupStatus.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={salesQuotationsApi.getDownloadPdfUrl(q.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={`Quotation_${(q.referenceNumber || q.quotationNumber || q.id).replace(/[\/\\]/g, '_')}.pdf`}
                            className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => handleOpenEmail(q)}
                            className="p-1.5 sm:p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 cursor-pointer min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center transition-colors"
                            title="Email Quotation to Customer"
                          >
                            <Mail className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => navigate(`/admin/dashboard/sales-quotations/${q.id}/edit`)}
                            className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 cursor-pointer min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center transition-colors"
                            title="Edit Quotation"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(q.id, q.referenceNumber || q.quotationNumber || '')}
                            className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center transition-colors"
                            title="Delete Quotation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-white/5">
              {quotations.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-3 sm:p-4 space-y-2 sm:space-y-2.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/dashboard/sales-quotations/${q.id}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">
                        #{(page - 1) * 15 + idx + 1}
                      </span>
                      <span className="font-mono font-bold text-xs sm:text-sm text-white truncate">
                        {q.referenceNumber || q.quotationNumber || '—'}
                      </span>
                      {q.isSez && (
                        <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded flex-shrink-0">
                          SEZ
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        q.status === 'CONVERTED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : q.status === 'SENT'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : q.status === 'ACCEPTED'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-white/5 text-gray-300'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-300 font-medium truncate">
                    {q.customer?.legalName || q.recipientCompany || 'N/A'}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="text-gray-400 text-[11px] sm:text-xs">
                      {new Date(q.date).toLocaleDateString('en-GB')}
                    </div>
                    <div className="font-bold text-sm sm:text-base text-[#7FB706]">
                      ₹ {Number(q.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Follow-up Status Pill & History counter */}
                  <div
                    className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs cursor-pointer hover:bg-white/[0.04] transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/dashboard/sales-quotations/${q.id}/follow-up`);
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">Follow-Up:</span>
                      {renderFollowupBadge(q)}
                      {q.followupStatus && q.followupStatus !== 'PENDING' && q.followupStatus !== 'ORDER_CONFIRMED' && (
                        <span className="text-[9px] text-gray-400 font-mono truncate">
                          {q.followupStatus.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    {q.followupCount !== undefined && q.followupCount > 0 && (
                      <span className="text-[9px] sm:text-[10px] text-cyan-400 font-medium flex-shrink-0">
                        {q.followupCount} {q.followupCount === 1 ? 'touchpoint' : 'touchpoints'}
                      </span>
                    )}
                  </div>

                  {/* Clean Compact Action Buttons */}
                  <div
                    className="grid grid-cols-4 gap-1.5 pt-1.5 border-t border-white/5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={salesQuotationsApi.getDownloadPdfUrl(q.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`Quotation_${(q.referenceNumber || q.quotationNumber || q.id).replace(/[\/\\]/g, '_')}.pdf`}
                      className="min-h-[34px] sm:min-h-[36px] flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">PDF</span>
                    </a>

                    <button
                      onClick={() => handleOpenEmail(q)}
                      className="min-h-[34px] sm:min-h-[36px] flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors cursor-pointer"
                      title="Email Quotation"
                    >
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">Email</span>
                    </button>

                    <button
                      onClick={() => navigate(`/admin/dashboard/sales-quotations/${q.id}/edit`)}
                      className="min-h-[34px] sm:min-h-[36px] flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-medium bg-white/5 hover:bg-white/10 text-amber-300 rounded-lg transition-colors cursor-pointer"
                      title="Edit Quotation"
                    >
                      <Edit className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(q.id, q.referenceNumber || q.quotationNumber || '')}
                      className="min-h-[34px] sm:min-h-[36px] flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete Quotation"
                    >
                      <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Vector Letter Preview Modal (A4 Vector Embed) */}
      {previewQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7FB706]" />
                <span className="font-mono font-bold text-white">
                  {previewQuotation.quotationNumber}
                </span>
                <span className="text-xs text-gray-400">
                  ({previewQuotation.customer?.legalName})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow && pdfHtml) {
                      printWindow.document.write(pdfHtml);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }
                  }}
                  className="px-3 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 min-h-[40px] cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => {
                    setPreviewQuotation(null);
                    setPdfHtml('');
                  }}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-900 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
              {loadingPdf ? (
                <div className="text-gray-400 text-sm animate-pulse">Loading quotation preview...</div>
              ) : (
                <iframe
                  srcDoc={pdfHtml}
                  title="Quotation Letter Preview"
                  className="w-full h-full bg-white rounded-lg shadow-2xl border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revision Dialog */}
      {revisionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Create Revision (R{revisionTarget.revisionNumber + 1})
              </h4>
              <button onClick={() => setRevisionTarget(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              This will increment the quotation to <strong>R{revisionTarget.revisionNumber + 1}</strong> and archive the current version in audit logs.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Revision Reason *</label>
              <textarea
                rows={3}
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="e.g. Added 2 divider panels and adjusted discount as negotiated..."
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevisionTarget(null)}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-xs min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRevision}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs min-h-[44px]"
              >
                Create R{revisionTarget.revisionNumber + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Quotation Modal */}
      {emailQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Email Quotation to Customer</h3>
                  <p className="text-xs text-gray-400 font-mono">
                    {emailQuote.referenceNumber || emailQuote.quotationNumber} • {emailQuote.customer?.legalName || emailQuote.recipientName || 'Client'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailQuote(null)}
                disabled={sendingEmail}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {emailSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {emailSuccess}
                </div>
              )}

              {emailError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {emailError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="client@company.com"
                  className="w-full bg-[#0a0a1a] border border-white/10 focus:border-indigo-500 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Quotation for Toilet Cubicle System"
                  className="w-full bg-[#0a0a1a] border border-white/10 focus:border-indigo-500 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Custom Message / Note (optional)
                </label>
                <textarea
                  rows={3}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
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
                  onClick={() => setEmailQuote(null)}
                  disabled={sendingEmail}
                  className="px-4 py-2 min-h-[40px] bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendEmailFromList}
                  disabled={sendingEmail || Boolean(emailSuccess)}
                  className="inline-flex items-center gap-2 px-5 py-2 min-h-[40px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingEmail ? 'Sending via Resend...' : emailSuccess ? 'Sent!' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Quotation Follow-Up Modal */}
      {followupQuotation && (
        <QuotationFollowupModal
          quotation={followupQuotation}
          isOpen={Boolean(followupQuotation)}
          onClose={() => setFollowupQuotation(null)}
          onFollowupLogged={(updatedQuote) => {
            setQuotations((prev) =>
              prev.map((q) => (q.id === updatedQuote.id ? { ...q, ...updatedQuote } : q))
            );
          }}
        />
      )}

    </div>
  );
}
