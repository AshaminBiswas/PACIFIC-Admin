import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Plus,
  ArrowUpDown,
  Send,
  CheckCircle2,
  Clock,
  DollarSign,
  Globe,
  Trash2,
  X,
  RefreshCw,
  Eye,
  ShoppingBag,
  Building2,
  Tag,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type {
  ExportQuotation,
  ExportRfq,
  BusinessParty,
  ExportCountry,
  ExportIncoterm,
  ExportPort,
  ExportHsCode,
} from '../../types/admin';

export const ExportQuotationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quotations' | 'rfqs'>('quotations');

  // Quotations State
  const [quotations, setQuotations] = useState<ExportQuotation[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [searchQuotes, setSearchQuotes] = useState('');
  const [quotePage, setQuotePage] = useState(1);
  const [totalQuotePages, setTotalQuotePages] = useState(1);

  // View Quotation Modal
  const [selectedQuoteForView, setSelectedQuoteForView] = useState<ExportQuotation | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPdfHtml, setViewPdfHtml] = useState('');
  const [viewTab, setViewTab] = useState<'details' | 'pdf'>('details');

  // RFQs State
  const [rfqs, setRfqs] = useState<ExportRfq[]>([]);
  const [loadingRfqs, setLoadingRfqs] = useState(false);
  const [searchRfqs, setSearchRfqs] = useState('');

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedQuoteForEmail, setSelectedQuoteForEmail] = useState<ExportQuotation | null>(null);

  // Email form
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    subject: '',
    bodyHtml: '',
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const handleOpenViewModal = async (q: ExportQuotation) => {
    setSelectedQuoteForView(q);
    setViewTab('details');
    setViewPdfHtml('');
    setViewLoading(true);
    try {
      const [fullRes, pdfRes] = await Promise.all([
        exportApi.getQuotationById(q.id),
        fetch(exportApi.getPdfUrl(q.id), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('pacific_access_token') || ''}`,
          },
        }),
      ]);
      if (fullRes.data?.success && fullRes.data.data) {
        setSelectedQuoteForView(fullRes.data.data);
      }
      const html = await pdfRes.text();
      setViewPdfHtml(html);
    } catch (err) {
      console.error('Failed to load export quotation details / PDF:', err);
    } finally {
      setViewLoading(false);
    }
  };

  const loadQuotations = async () => {
    try {
      setLoadingQuotes(true);
      const res = await exportApi.listQuotations({
        page: quotePage,
        limit: 15,
        search: searchQuotes || undefined,
      });
      if (res.data.success && res.data.data) {
        setQuotations(res.data.data.items);
        setTotalQuotePages(res.data.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to load export quotes', err);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const loadRfqs = async () => {
    try {
      setLoadingRfqs(true);
      const res = await exportApi.listRfqs({
        limit: 50,
        search: searchRfqs || undefined,
      });
      if (res.data.success && res.data.data) {
        setRfqs(res.data.data.items);
      }
    } catch (err) {
      console.error('Failed to load export rfqs', err);
    } finally {
      setLoadingRfqs(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, [quotePage, searchQuotes]);

  useEffect(() => {
    if (activeTab === 'rfqs') {
      loadRfqs();
    }
  }, [activeTab, searchRfqs]);

  const handleConvertQuoteToOrder = async (quoteId: string) => {
    if (!confirm('Convert this export quotation into an active Export Order?')) return;
    try {
      const res = await exportApi.convertQuotationToOrder(quoteId);
      if (res.data.success && res.data.data) {
        alert(`Successfully converted! Export Order: ${res.data.data.exportOrderNumber}`);
        loadQuotations();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to convert quotation to order');
    }
  };

  const handleConvertRfqToQuote = async (rfqId: string) => {
    try {
      const res = await exportApi.convertRfqToQuotation(rfqId);
      if (res.data.success) {
        alert('RFQ converted to formal Quotation!');
        setActiveTab('quotations');
        loadQuotations();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to convert RFQ');
    }
  };

  const handleOpenEmailModal = (q: ExportQuotation) => {
    setSelectedQuoteForEmail(q);
    setEmailForm({
      recipientEmail: q.party?.email || '',
      subject: `Formal Export Quotation #${q.quotationNumber} — Pacific Products & Solutions`,
      bodyHtml: `<p>Dear ${q.party?.legalName},</p><p>Please find attached our export quotation <strong>${q.quotationNumber}</strong> for total value <strong>${q.currency} ${q.totalAmount.toLocaleString()}</strong>.</p>`,
    });
    setShowEmailModal(true);
  };

  const handleSendQuoteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteForEmail) return;
    try {
      setSendingEmail(true);
      const res = await exportApi.sendTradeEmail({
        partyId: selectedQuoteForEmail.partyId,
        recipientEmail: emailForm.recipientEmail,
        templateCode: 'EXPORT_QUOTATION',
        subject: emailForm.subject,
        bodyHtml: emailForm.bodyHtml,
      });
      if (res.data.success) {
        setEmailSuccess(true);
        setTimeout(() => {
          setEmailSuccess(false);
          setShowEmailModal(false);
        }, 1500);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to dispatch email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12 text-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#0f0e26] via-[#070714] to-[#0f0e26] p-4 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] flex items-center justify-center text-[#030213] shadow-lg shadow-[#7FB706]/30">
            <FileText className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Export Quotations &amp; RFQs
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Multi-Currency Proformas, Incoterms Costing, HS Classification &amp; Order Conversion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'quotations' ? (
            <Link
              to="/admin/dashboard/export/quotations/new?type=quotation"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-bold transition shadow-lg shadow-[#7FB706]/20 active:scale-95 min-h-[44px]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Quotation</span>
            </Link>
          ) : (
            <Link
              to="/admin/dashboard/export/quotations/new?type=rfq"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-bold transition shadow-lg shadow-[#7FB706]/20 active:scale-95 min-h-[44px]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record RFQ</span>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-[#0f0e26]/60 rounded-xl px-2">
        <button
          onClick={() => setActiveTab('quotations')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'quotations'
              ? 'border-[#7FB706] text-[#7FB706]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Export Quotations ({quotations.length})
        </button>
        <button
          onClick={() => setActiveTab('rfqs')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'rfqs'
              ? 'border-[#7FB706] text-[#7FB706]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Inbound RFQs ({rfqs.length})
        </button>
      </div>

      {/* Quotations View */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          <div className="bg-[#0f0e26]/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search quotations by quote number or buyer name..."
                value={searchQuotes}
                onChange={(e) => setSearchQuotes(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
          </div>

          {loadingQuotes ? (
            <div className="p-12 text-center text-xs text-gray-400">Loading quotations...</div>
          ) : quotations.length === 0 ? (
            <div className="p-12 bg-[#070714] border border-white/10 rounded-2xl text-center space-y-3">
              <FileText className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">No export quotations generated yet.</p>
              <Link
                to="/admin/dashboard/export/quotations/new?type=quotation"
                className="inline-flex items-center justify-center px-4 py-2 bg-[#7FB706] text-[#030213] rounded-xl text-xs font-bold min-h-[44px]"
              >
                Create Quotation
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto bg-[#070714] border border-white/10 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3.5">Quotation #</th>
                      <th className="px-4 py-3.5">Foreign Buyer</th>
                      <th className="px-4 py-3.5">Incoterm &amp; Port</th>
                      <th className="px-4 py-3.5">Total Value</th>
                      <th className="px-4 py-3.5">Validity</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {quotations.map((q) => (
                      <tr key={q.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3.5 font-mono font-bold text-white tracking-wide">
                          {q.quotationNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-gray-200">{q.party?.legalName}</div>
                          <div className="text-[10px] text-gray-500">{q.party?.email}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-gray-300 font-bold text-[#7FB706]">
                            {q.incoterm?.code || 'CIF'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {q.portOfDestination?.name || 'Dest. Port'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white">
                          {q.currency} {q.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-gray-400">
                          {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '30 Days'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-300 border border-white/10">
                            {q.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleOpenViewModal(q)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#7FB706] hover:text-[#B5F823] font-semibold text-xs min-h-[36px] cursor-pointer"
                            title="View Quotation"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => handleOpenEmailModal(q)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold text-xs min-h-[36px]"
                          >
                            <Send className="w-3 h-3" />
                            <span>Email</span>
                          </button>
                          {q.status !== 'CONVERTED' && (
                            <button
                              onClick={() => handleConvertQuoteToOrder(q.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#7FB706] hover:bg-[#B5F823] text-[#030213] font-bold text-xs min-h-[36px]"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>Convert</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Transform */}
              <div className="md:hidden space-y-3">
                {quotations.map((q) => (
                  <div
                    key={q.id}
                    className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono text-[#7FB706] font-bold block">
                          {q.quotationNumber}
                        </span>
                        <h4 className="text-sm font-black text-white">{q.party?.legalName}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-300">
                        {q.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5">
                      <div>
                        <span className="text-[10px] text-gray-500 block">Total Amount</span>
                        <span className="font-bold text-white">
                          {q.currency} {q.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenViewModal(q)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-[#7FB706] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          onClick={() => handleOpenEmailModal(q)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-xs font-semibold cursor-pointer"
                        >
                          Email
                        </button>
                        {q.status !== 'CONVERTED' && (
                          <button
                            onClick={() => handleConvertQuoteToOrder(q.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#7FB706] text-[#030213] text-xs font-bold cursor-pointer"
                          >
                            Convert
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RFQs View */}
      {activeTab === 'rfqs' && (
        <div className="space-y-4">
          {loadingRfqs ? (
            <div className="p-12 text-center text-xs text-gray-400">Loading inbound RFQs...</div>
          ) : rfqs.length === 0 ? (
            <div className="p-12 bg-[#070714] border border-white/10 rounded-2xl text-center space-y-3">
              <FileText className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">No international RFQs recorded yet.</p>
              <Link
                to="/admin/dashboard/export/quotations/new?type=rfq"
                className="inline-flex items-center justify-center px-4 py-2 bg-[#7FB706] text-[#030213] rounded-xl text-xs font-bold min-h-[44px]"
              >
                Record First RFQ
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rfqs.map((r) => (
                <div
                  key={r.id}
                  className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-[#7FB706] font-bold block">
                        {r.rfqNumber}
                      </span>
                      <h4 className="text-sm font-black text-white">{r.party?.legalName}</h4>
                      <p className="text-xs text-gray-400">{r.country?.name}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-300">
                      {r.status}
                    </span>
                  </div>

                  {r.notes && (
                    <p className="text-xs text-gray-300 bg-black/30 p-2.5 rounded-xl">{r.notes}</p>
                  )}

                  <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5">
                    <div>
                      <span className="text-[10px] text-gray-500 block">Est. Value</span>
                      <span className="font-bold text-white">
                        {r.currency} {r.estimatedValue.toLocaleString()}
                      </span>
                    </div>
                    {r.status !== 'QUOTED' && (
                      <button
                        onClick={() => handleConvertRfqToQuote(r.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#7FB706] text-[#030213] text-xs font-bold min-h-[36px]"
                      >
                        Generate Quote
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Quote Modal */}
      {showEmailModal && selectedQuoteForEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Send Quotation Email</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailSuccess ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-[#7FB706] mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-white">Quotation Dispatched!</h4>
                <p className="text-xs text-gray-400">
                  Email sent to {emailForm.recipientEmail} with quotation details.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendQuoteEmail} className="space-y-3">
                <div>
                  <label className="text-gray-400 font-bold block mb-1">Recipient Email</label>
                  <input
                    required
                    type="email"
                    value={emailForm.recipientEmail}
                    onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-gray-400 font-bold block mb-1">Subject</label>
                  <input
                    required
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-gray-400 font-bold block mb-1">Message Content</label>
                  <textarea
                    rows={4}
                    value={emailForm.bodyHtml}
                    onChange={(e) => setEmailForm({ ...emailForm, bodyHtml: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 bg-white/5 rounded-xl text-gray-300 min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="px-5 py-2.5 bg-[#7FB706] text-[#030213] rounded-xl font-bold flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sendingEmail ? 'Dispatching...' : 'Dispatch Quote'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Quotation Details & PDF Modal */}
      {selectedQuoteForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0f0e26] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#070714]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] flex items-center justify-center text-[#030213]">
                  <FileText className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-base">
                      {selectedQuoteForView.quotationNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20">
                      {selectedQuoteForView.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {selectedQuoteForView.party?.legalName || 'Foreign Buyer'} • {selectedQuoteForView.incoterm?.code || 'CIF'} • {selectedQuoteForView.currency} {Number(selectedQuoteForView.totalAmount).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Tab Switcher */}
                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 text-xs">
                  <button
                    onClick={() => setViewTab('details')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      viewTab === 'details' ? 'bg-[#7FB706] text-[#030213]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Breakdown
                  </button>
                  <button
                    onClick={() => setViewTab('pdf')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                      viewTab === 'pdf' ? 'bg-[#7FB706] text-[#030213]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Letter PDF
                  </button>
                </div>

                {viewTab === 'pdf' && viewPdfHtml && (
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(viewPdfHtml);
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                      }
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                    title="Print / Save PDF"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedQuoteForView(null);
                    setViewPdfHtml('');
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {viewLoading ? (
                <div className="py-20 text-center text-gray-400 text-sm animate-pulse">
                  Loading quotation details &amp; PDF preview...
                </div>
              ) : viewTab === 'details' ? (
                <div className="space-y-6 text-xs">
                  {/* Top Grid: Consignee & Commercial Terms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-black/30 border border-white/10 p-4 rounded-2xl space-y-2">
                      <h4 className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Consignee / Foreign Buyer</h4>
                      <div className="text-sm font-bold text-white">{selectedQuoteForView.party?.legalName}</div>
                      {selectedQuoteForView.country?.name && (
                        <div className="text-gray-300">Country: <strong className="text-white">{selectedQuoteForView.country.name}</strong></div>
                      )}
                      {selectedQuoteForView.party?.email && (
                        <div className="text-gray-400">Email: {selectedQuoteForView.party.email}</div>
                      )}
                      {selectedQuoteForView.party?.phone && (
                        <div className="text-gray-400">Phone: {selectedQuoteForView.party.phone}</div>
                      )}
                    </div>

                    <div className="bg-black/30 border border-white/10 p-4 rounded-2xl space-y-2">
                      <h4 className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Logistics &amp; Trade Terms</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Incoterm:</span>
                        <span className="font-bold text-[#7FB706] text-sm">{selectedQuoteForView.incoterm?.code || 'CIF'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Port of Loading:</span>
                        <span className="text-gray-200">{selectedQuoteForView.portOfLoading?.name || 'Any Indian Port'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Port of Destination:</span>
                        <span className="text-gray-200">{selectedQuoteForView.portOfDestination?.name || 'Destination Port'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Payment Terms:</span>
                        <span className="text-gray-200">{selectedQuoteForView.paymentTerms || '30% Advance, 70% LC'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Validity:</span>
                        <span className="text-gray-200">
                          {selectedQuoteForView.validUntil ? new Date(selectedQuoteForView.validUntil).toLocaleDateString() : '30 Days'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="bg-black/30 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-white/5 border-b border-white/10 font-bold text-white text-xs">
                      Quotation Line Items ({selectedQuoteForView.items?.length || 0})
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] text-gray-400 uppercase tracking-wider bg-white/[0.02] border-b border-white/5">
                          <tr>
                            <th className="px-4 py-2.5">#</th>
                            <th className="px-4 py-2.5">Description</th>
                            <th className="px-4 py-2.5 text-center">HS Code</th>
                            <th className="px-4 py-2.5 text-center">Unit</th>
                            <th className="px-4 py-2.5 text-right">Quantity</th>
                            <th className="px-4 py-2.5 text-right">Unit Rate</th>
                            <th className="px-4 py-2.5 text-right">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(selectedQuoteForView.items || []).map((it: any, idx: number) => (
                            <tr key={it.id || idx} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-2.5 text-gray-500">{idx + 1}</td>
                              <td className="px-4 py-2.5 font-medium text-white">
                                <div>{it.description}</div>
                                {it.itemCode && <div className="text-[10px] text-gray-500 font-mono">Code: {it.itemCode}</div>}
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-gray-300">{it.hsCode?.code || '-'}</td>
                              <td className="px-4 py-2.5 text-center text-gray-400">{it.unit}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-white">{Number(it.quantity)}</td>
                              <td className="px-4 py-2.5 text-right text-gray-300">
                                {selectedQuoteForView.currency} {Number(it.unitRate).toLocaleString()}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-[#7FB706]">
                                {selectedQuoteForView.currency} {Number(it.totalAmount).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Breakdown Card */}
                  <div className="bg-black/30 border border-white/10 p-4 rounded-2xl max-w-sm ml-auto space-y-2">
                    <div className="flex justify-between text-gray-400">
                      <span>FOB Subtotal:</span>
                      <span className="font-semibold text-white">
                        {selectedQuoteForView.currency} {Number(selectedQuoteForView.subtotal || 0).toLocaleString()}
                      </span>
                    </div>
                    {Number(selectedQuoteForView.freightCharges || 0) > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Freight Charges:</span>
                        <span className="text-white">
                          {selectedQuoteForView.currency} {Number(selectedQuoteForView.freightCharges).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {Number(selectedQuoteForView.insuranceCharges || 0) > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Insurance:</span>
                        <span className="text-white">
                          {selectedQuoteForView.currency} {Number(selectedQuoteForView.insuranceCharges).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {Number(selectedQuoteForView.otherCharges || 0) > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Other Charges:</span>
                        <span className="text-white">
                          {selectedQuoteForView.currency} {Number(selectedQuoteForView.otherCharges).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10 text-white">
                      <span>Total Offer ({selectedQuoteForView.currency}):</span>
                      <span className="text-[#7FB706]">
                        {selectedQuoteForView.currency} {Number(selectedQuoteForView.totalAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Notes / Special Instructions */}
                  {selectedQuoteForView.notes && (
                    <div className="bg-black/20 border border-white/5 p-3 rounded-xl text-gray-400">
                      <strong className="text-gray-300 block mb-1">Commercial Notes:</strong>
                      {selectedQuoteForView.notes}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                      onClick={() => handleOpenEmailModal(selectedQuoteForView)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-bold flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                    >
                      <Send className="w-3.5 h-3.5" /> Email Quote
                    </button>
                    {selectedQuoteForView.status !== 'CONVERTED' && (
                      <button
                        onClick={() => {
                          const quoteId = selectedQuoteForView.id;
                          setSelectedQuoteForView(null);
                          handleConvertQuoteToOrder(quoteId);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#B5F823] text-[#030213] font-bold flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Convert to Export Order
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* PDF Preview Tab */
                <div className="w-full h-[68vh] bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center">
                  <iframe
                    srcDoc={viewPdfHtml}
                    title="Export Quotation PDF Preview"
                    className="w-full h-full bg-white rounded-2xl border-0"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportQuotationsPage;
