import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Copy,
  Edit,
  RotateCcw,
  Layers,
  ChevronDown,
  Filter,
  Check,
  Calendar,
  Anchor,
  TrendingUp,
} from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type {
  ExportQuotation,
  ExportRfq,
  BusinessParty,
  ExportCountry,
  ExportIncoterm,
  ExportPort,
} from '../../types/admin';

export const ExportQuotationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'quotations' | 'rfqs'>('quotations');

  // Quotations State
  const [quotations, setQuotations] = useState<ExportQuotation[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [searchQuotes, setSearchQuotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [incotermFilter, setIncotermFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
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

  // Deleting Quotation / RFQ
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Load Quotations
  const loadQuotations = async () => {
    try {
      setLoadingQuotes(true);
      const res = await exportApi.listQuotations({
        page: quotePage,
        limit: 50,
        search: searchQuotes || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      if (res.data.success && res.data.data) {
        setQuotations(res.data.data.items);
        setTotalQuotePages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load export quotes', err);
    } finally {
      setLoadingQuotes(false);
    }
  };

  // Load RFQs
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
  }, [quotePage, searchQuotes, statusFilter]);

  useEffect(() => {
    if (activeTab === 'rfqs') {
      loadRfqs();
    }
  }, [activeTab, searchRfqs]);

  // View modal opener with live PDF fetch
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

  // Convert Quote to Order
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

  // Duplicate / Clone Quotation
  const handleDuplicateQuote = (q: ExportQuotation) => {
    if (confirm(`Duplicate quotation ${q.quotationNumber} into a new draft?`)) {
      navigate(`/admin/dashboard/export/quotations/new?clone=true&sourceId=${q.id}`);
    }
  };

  // Delete Quotation
  const handleDeleteQuote = async (quoteId: string, quoteNumber: string) => {
    if (!confirm(`Are you sure you want to permanently delete export quotation ${quoteNumber}?`)) {
      return;
    }
    try {
      setIsDeleting(quoteId);
      const res = await exportApi.deleteQuotation(quoteId);
      if (res.data?.success) {
        alert(`Quotation ${quoteNumber} deleted successfully.`);
        setQuotations((prev) => prev.filter((q) => q.id !== quoteId));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete quotation');
    } finally {
      setIsDeleting(null);
    }
  };

  // Quick Status Update
  const handleQuickStatusChange = async (quoteId: string, newStatus: any) => {
    try {
      const res = await exportApi.updateQuotation(quoteId, { status: newStatus });
      if (res.data?.success) {
        setQuotations((prev) =>
          prev.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q))
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update quotation status');
    }
  };

  // Convert RFQ to Quote
  const handleConvertRfqToQuote = (rfq: ExportRfq) => {
    navigate(`/admin/dashboard/export/quotations/new?rfqId=${rfq.id}`);
  };

  // Open Email Modal
  const handleOpenEmailModal = (q: ExportQuotation) => {
    setSelectedQuoteForEmail(q);
    setEmailForm({
      recipientEmail: q.party?.email || '',
      subject: `Formal Export Quotation #${q.quotationNumber} — Pacific Products & Solutions`,
      bodyHtml: `<p>Dear ${q.party?.legalName || 'Valued Client'},</p>
<p>Thank you for your interest in Pacific Restroom Cubicle Systems. Please find attached our formal export quotation <strong>${q.quotationNumber}</strong> for total value <strong>${q.currency} ${Number(q.totalAmount).toLocaleString()}</strong>.</p>
<p>• <strong>Trade Term:</strong> ${q.incoterm?.code || 'FOB'}
<br/>• <strong>Destination Port:</strong> ${q.portOfDestination?.name || 'Destination Port'}
<br/>• <strong>Payment Terms:</strong> ${q.paymentTerms || '30% Advance, 70% against BL'}</p>
<p>Should you require customized fabrication drawings or technical physical samples, our export division is at your disposal.</p>
<p>Warm regards,<br/><strong>Pacific Export &amp; Trade Division</strong><br/>Mandoli Industrial Area, Delhi, India<br/>www.pacificrestroom.com</p>`,
    });
    setShowEmailModal(true);
  };

  // Send Email
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

  // Filtered & Sorted Quotations
  const displayedQuotations = useMemo(() => {
    let filtered = [...quotations];

    if (currencyFilter !== 'ALL') {
      filtered = filtered.filter((q) => q.currency === currencyFilter);
    }

    if (incotermFilter !== 'ALL') {
      filtered = filtered.filter((q) => q.incoterm?.code === incotermFilter);
    }

    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return filtered;
  }, [quotations, currencyFilter, incotermFilter, sortOrder]);

  // Aggregate KPI Calculations
  const stats = useMemo(() => {
    const totalCount = quotations.length;
    const convertedCount = quotations.filter((q) => q.status === 'CONVERTED').length;
    const totalPipelineUSD = quotations
      .filter((q) => q.currency === 'USD')
      .reduce((sum, q) => sum + Number(q.totalAmount || 0), 0);
    const rfqCount = rfqs.length;

    return {
      totalCount,
      convertedCount,
      conversionRate: totalCount > 0 ? Math.round((convertedCount / totalCount) * 100) : 0,
      totalPipelineUSD,
      rfqCount,
    };
  }, [quotations, rfqs]);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto pb-28 text-gray-200">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#0f0e26] via-[#070714] to-[#0f0e26] p-4 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] flex items-center justify-center text-[#030213] shadow-lg shadow-[#7FB706]/30">
            <FileText className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Export Quotations Hub
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              International Multi-Currency Proformas, Incoterms Costing, HS Classification &amp; Order Conversion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadQuotations}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loadingQuotes ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'quotations' ? (
            <Link
              to="/admin/dashboard/export/quotations/new?type=quotation"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-black transition shadow-lg shadow-[#7FB706]/20 active:scale-95 min-h-[44px]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Export Quotation</span>
            </Link>
          ) : (
            <Link
              to="/admin/dashboard/export/quotations/new?type=rfq"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-black transition shadow-lg shadow-[#7FB706]/20 active:scale-95 min-h-[44px]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record Inbound RFQ</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#0f0e26]/80 border border-white/10 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Total Quotations
          </span>
          <div className="text-xl sm:text-2xl font-black text-white">{stats.totalCount}</div>
          <span className="text-[11px] text-gray-500">Across all international markets</span>
        </div>

        <div className="bg-[#0f0e26]/80 border border-white/10 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Pipeline Value (USD)
          </span>
          <div className="text-xl sm:text-2xl font-black text-[#7FB706]">
            ${stats.totalPipelineUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-gray-500">Active quotes in USD</span>
        </div>

        <div className="bg-[#0f0e26]/80 border border-white/10 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Converted to Orders
          </span>
          <div className="text-xl sm:text-2xl font-black text-white flex items-baseline gap-2">
            <span>{stats.convertedCount}</span>
            <span className="text-xs font-bold text-emerald-400">({stats.conversionRate}%)</span>
          </div>
          <span className="text-[11px] text-gray-500">Successful export orders</span>
        </div>

        <div className="bg-[#0f0e26]/80 border border-white/10 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Inbound RFQs
          </span>
          <div className="text-xl sm:text-2xl font-black text-white">{rfqs.length}</div>
          <span className="text-[11px] text-gray-500">Pending quotation conversion</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-[#0f0e26]/60 rounded-xl px-2">
        <button
          onClick={() => setActiveTab('quotations')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'quotations'
              ? 'border-[#7FB706] text-[#7FB706]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Export Quotations ({quotations.length})
        </button>
        <button
          onClick={() => setActiveTab('rfqs')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'rfqs'
              ? 'border-[#7FB706] text-[#7FB706]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Inbound RFQs ({rfqs.length})
        </button>
      </div>

      {/* QUOTATIONS TAB */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          {/* Multi-Filter & Search Bar */}
          <div className="bg-[#0f0e26]/70 p-3.5 rounded-2xl border border-white/10 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by quotation number, foreign buyer, port, or country..."
                  value={searchQuotes}
                  onChange={(e) => setSearchQuotes(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-44">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="SENT">Sent to Buyer</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="CONVERTED">Converted to Order</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Currency Filter */}
              <div className="w-full sm:w-32">
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                >
                  <option value="ALL">All Currencies</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="SAR">SAR (﷼)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              {/* Incoterm Filter */}
              <div className="w-full sm:w-32">
                <select
                  value={incotermFilter}
                  onChange={(e) => setIncotermFilter(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                >
                  <option value="ALL">All Incoterms</option>
                  <option value="FOB">FOB</option>
                  <option value="CIF">CIF</option>
                  <option value="CFR">CFR</option>
                  <option value="EXW">EXW</option>
                  <option value="DAP">DAP</option>
                  <option value="DDP">DDP</option>
                </select>
              </div>

              {/* Sort Order Toggle */}
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition min-h-[44px] cursor-pointer"
                title="Toggle Date Sort Order"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
              </button>

              {(searchQuotes || statusFilter !== 'ALL' || currencyFilter !== 'ALL' || incotermFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuotes('');
                    setStatusFilter('ALL');
                    setCurrencyFilter('ALL');
                    setIncotermFilter('ALL');
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1 transition min-h-[44px] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Quotations Content */}
          {loadingQuotes ? (
            <div className="p-16 text-center text-xs text-gray-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7FB706]" />
              <p>Loading export quotations...</p>
            </div>
          ) : displayedQuotations.length === 0 ? (
            <div className="p-16 bg-[#070714] border border-white/10 rounded-2xl text-center space-y-4 shadow-xl">
              <FileText className="w-12 h-12 text-gray-600 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-white">No Export Quotations Found</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {searchQuotes || statusFilter !== 'ALL'
                    ? 'No quotations match the active search filter criteria.'
                    : 'Create your first international export proforma quotation.'}
                </p>
              </div>
              <Link
                to="/admin/dashboard/export/quotations/new?type=quotation"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-[#7FB706] text-[#030213] rounded-xl text-xs font-bold min-h-[44px] cursor-pointer shadow-lg shadow-[#7FB706]/20"
              >
                <Plus className="w-4 h-4 stroke-[3] mr-1.5" />
                <span>Create Export Quotation</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto bg-[#070714] border border-white/10 rounded-2xl shadow-xl">
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
                    {displayedQuotations.map((q) => (
                      <tr key={q.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3.5 font-mono font-bold text-white tracking-wide">
                          <span className="text-[#7FB706]">{q.quotationNumber}</span>
                          <div className="text-[10px] text-gray-500 font-normal">
                            {new Date(q.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-gray-200">{q.party?.legalName}</div>
                          <div className="text-[10px] text-gray-400">
                            {q.country?.name ? `${q.country.name} • ` : ''}
                            {q.party?.email || 'No email registered'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-gray-200 font-bold text-[#7FB706]">
                            {q.incoterm?.code || 'FOB'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {q.portOfDestination?.name || 'Destination Port'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white">
                          <div>
                            {q.currency} {Number(q.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-gray-500 font-normal">
                            {q.items?.length || 0} line items
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400">
                          {q.validUntil ? (
                            <span
                              className={
                                new Date(q.validUntil).getTime() < Date.now()
                                  ? 'text-rose-400 font-semibold'
                                  : 'text-gray-300'
                              }
                            >
                              {new Date(q.validUntil).toLocaleDateString()}
                            </span>
                          ) : (
                            '30 Days'
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={q.status}
                            onChange={(e) => handleQuickStatusChange(q.id, e.target.value)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-gray-200 focus:outline-none focus:border-[#7FB706] cursor-pointer"
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                            <option value="APPROVED">APPROVED</option>
                            <option value="SENT">SENT</option>
                            <option value="ACCEPTED">ACCEPTED</option>
                            <option value="CONVERTED">CONVERTED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {/* View */}
                          <button
                            onClick={() => handleOpenViewModal(q)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#7FB706] hover:text-[#B5F823] font-semibold text-xs min-h-[36px] cursor-pointer"
                            title="View Breakdown &amp; PDF"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {/* Edit */}
                          <Link
                            to={`/admin/dashboard/export/quotations/${q.id}/edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold text-xs min-h-[36px] cursor-pointer"
                            title="Edit Quotation"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </Link>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicateQuote(q)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold text-xs min-h-[36px] cursor-pointer"
                            title="Duplicate as New Draft"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Email */}
                          <button
                            onClick={() => handleOpenEmailModal(q)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold text-xs min-h-[36px] cursor-pointer"
                            title="Send Email to Buyer"
                          >
                            <Send className="w-3 h-3" />
                          </button>

                          {/* Convert to Order */}
                          {q.status !== 'CONVERTED' && (
                            <button
                              onClick={() => handleConvertQuoteToOrder(q.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#7FB706] hover:bg-[#B5F823] text-[#030213] font-bold text-xs min-h-[36px] cursor-pointer"
                              title="Convert to Active Export Order"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>Convert</span>
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteQuote(q.id, q.quotationNumber)}
                            disabled={isDeleting === q.id}
                            className="inline-flex items-center p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs min-h-[36px] cursor-pointer disabled:opacity-50"
                            title="Delete Quotation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Transform View */}
              <div className="lg:hidden space-y-3">
                {displayedQuotations.map((q) => (
                  <div
                    key={q.id}
                    className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-3 shadow-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono text-[#7FB706] font-bold block">
                          {q.quotationNumber}
                        </span>
                        <h4 className="text-sm font-black text-white">{q.party?.legalName}</h4>
                        <div className="text-[10px] text-gray-400">
                          {q.country?.name || 'International Buyer'} • {q.incoterm?.code || 'FOB'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-300 border border-white/10">
                        {q.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                      <div>
                        <span className="text-[10px] text-gray-500 block">Total Offer</span>
                        <span className="font-bold text-white text-sm">
                          {q.currency} {Number(q.totalAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 block">Validity</span>
                        <span className="text-gray-300">
                          {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '30 Days'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleOpenViewModal(q)}
                        className="flex-1 py-2 px-3 rounded-xl bg-white/5 text-[#7FB706] text-xs font-bold flex items-center justify-center gap-1 min-h-[40px] cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <Link
                        to={`/admin/dashboard/export/quotations/${q.id}/edit`}
                        className="py-2 px-3 rounded-xl bg-white/5 text-gray-200 text-xs font-bold flex items-center justify-center gap-1 min-h-[40px] cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </Link>
                      <button
                        onClick={() => handleDuplicateQuote(q)}
                        className="p-2 rounded-xl bg-white/5 text-gray-300 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEmailModal(q)}
                        className="p-2 rounded-xl bg-white/5 text-gray-300 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                        title="Email"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      {q.status !== 'CONVERTED' && (
                        <button
                          onClick={() => handleConvertQuoteToOrder(q.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#7FB706] text-[#030213] text-xs font-bold flex items-center justify-center gap-1 min-h-[40px] cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> Convert
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RFQs TAB */}
      {activeTab === 'rfqs' && (
        <div className="space-y-4">
          <div className="bg-[#0f0e26]/70 p-3.5 rounded-2xl border border-white/10 shadow-lg">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search RFQs by number or customer name..."
                value={searchRfqs}
                onChange={(e) => setSearchRfqs(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
          </div>

          {loadingRfqs ? (
            <div className="p-16 text-center text-xs text-gray-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7FB706]" />
              <p>Loading inbound RFQs...</p>
            </div>
          ) : rfqs.length === 0 ? (
            <div className="p-16 bg-[#070714] border border-white/10 rounded-2xl text-center space-y-4 shadow-xl">
              <FileText className="w-12 h-12 text-gray-600 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-white">No International RFQs Recorded</h3>
                <p className="text-xs text-gray-400 mt-1">Capture inbound inquiries from foreign buyers.</p>
              </div>
              <Link
                to="/admin/dashboard/export/quotations/new?type=rfq"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-[#7FB706] text-[#030213] rounded-xl text-xs font-bold min-h-[44px] cursor-pointer shadow-lg shadow-[#7FB706]/20"
              >
                <Plus className="w-4 h-4 stroke-[3] mr-1.5" />
                <span>Record Inbound RFQ</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rfqs.map((r) => (
                <div
                  key={r.id}
                  className="bg-[#070714] border border-white/10 p-5 rounded-2xl space-y-3 shadow-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono text-[#7FB706] font-bold block">
                        {r.rfqNumber}
                      </span>
                      <h4 className="text-sm font-black text-white">{r.party?.legalName}</h4>
                      <p className="text-xs text-gray-400">{r.country?.name || 'International'}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-300 border border-white/10">
                      {r.status}
                    </span>
                  </div>

                  {r.notes && (
                    <p className="text-xs text-gray-300 bg-black/40 p-3 rounded-xl border border-white/5">
                      {r.notes}
                    </p>
                  )}

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                    <div>
                      <span className="text-[10px] text-gray-500 block">Est. Inbound Value</span>
                      <span className="font-bold text-white">
                        {r.currency} {Number(r.estimatedValue).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConvertRfqToQuote(r)}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-black min-h-[40px] flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#7FB706]/20"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Generate Quotation</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Quotation Details & Live PDF Modal */}
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
                    {selectedQuoteForView.party?.legalName || 'Foreign Buyer'} • {selectedQuoteForView.incoterm?.code || 'FOB'} • {selectedQuoteForView.currency} {Number(selectedQuoteForView.totalAmount).toLocaleString()}
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
                <div className="py-20 text-center text-gray-400 text-sm animate-pulse space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#7FB706]" />
                  <p>Loading quotation details &amp; PDF preview...</p>
                </div>
              ) : viewTab === 'details' ? (
                <div className="space-y-6 text-xs">
                  {/* Top Grid: Consignee & Commercial Terms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-black/30 border border-white/10 p-4 rounded-2xl space-y-2">
                      <h4 className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        Consignee / Foreign Buyer
                      </h4>
                      <div className="text-sm font-bold text-white">{selectedQuoteForView.party?.legalName}</div>
                      {selectedQuoteForView.country?.name && (
                        <div className="text-gray-300">
                          Country: <strong className="text-white">{selectedQuoteForView.country.name}</strong>
                        </div>
                      )}
                      {selectedQuoteForView.party?.email && (
                        <div className="text-gray-400">Email: {selectedQuoteForView.party.email}</div>
                      )}
                      {selectedQuoteForView.party?.phone && (
                        <div className="text-gray-400">Phone: {selectedQuoteForView.party.phone}</div>
                      )}
                    </div>

                    <div className="bg-black/30 border border-white/10 p-4 rounded-2xl space-y-2">
                      <h4 className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        Logistics &amp; Trade Terms
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Incoterm:</span>
                        <span className="font-bold text-[#7FB706] text-sm">
                          {selectedQuoteForView.incoterm?.code || 'FOB'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Port of Loading:</span>
                        <span className="text-gray-200">
                          {selectedQuoteForView.portOfLoading?.name || 'Any Indian Port'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Port of Destination:</span>
                        <span className="text-gray-200">
                          {selectedQuoteForView.portOfDestination?.name || 'Destination Port'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Payment Terms:</span>
                        <span className="text-gray-200">
                          {selectedQuoteForView.paymentTerms || '30% Advance, 70% LC'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Validity:</span>
                        <span className="text-gray-200">
                          {selectedQuoteForView.validUntil
                            ? new Date(selectedQuoteForView.validUntil).toLocaleDateString()
                            : '30 Days'}
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
                              <td className="px-4 py-2.5 text-gray-500 font-mono">{idx + 1}</td>
                              <td className="px-4 py-2.5 font-medium text-white">
                                <div className="font-bold text-gray-200">{it.itemCode || 'EXP-ITEM'}</div>
                                <div className="text-[11px] text-gray-400 whitespace-pre-line">{it.description}</div>
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-gray-300">
                                {it.hsCode?.hsCode || (it.hsCode as any)?.code || '3925.90.90'}
                              </td>
                              <td className="px-4 py-2.5 text-center text-gray-400">{it.unit}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-white">{Number(it.quantity)}</td>
                              <td className="px-4 py-2.5 text-right text-gray-300">
                                {selectedQuoteForView.currency} {Number(it.unitRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-[#7FB706]">
                                {selectedQuoteForView.currency} {Number(it.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        {selectedQuoteForView.currency} {Number(selectedQuoteForView.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {Number(selectedQuoteForView.freightCharges || 0) > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Freight Charges:</span>
                        <span className="text-white">
                          {selectedQuoteForView.currency} {Number(selectedQuoteForView.freightCharges).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {Number(selectedQuoteForView.insuranceCharges || 0) > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Insurance:</span>
                        <span className="text-white">
                          {selectedQuoteForView.currency} {Number(selectedQuoteForView.insuranceCharges).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {Number(selectedQuoteForView.otherCharges || 0) > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Other Charges:</span>
                        <span className="text-white">
                          {selectedQuoteForView.currency} {Number(selectedQuoteForView.otherCharges).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/10 text-white">
                      <span>Total Offer ({selectedQuoteForView.incoterm?.code || 'FOB'}):</span>
                      <span className="text-[#7FB706]">
                        {selectedQuoteForView.currency} {Number(selectedQuoteForView.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Commercial Notes */}
                  {selectedQuoteForView.notes && (
                    <div className="bg-black/20 border border-white/5 p-3 rounded-xl text-gray-400 whitespace-pre-line">
                      <strong className="text-gray-300 block mb-1">Commercial Notes:</strong>
                      {selectedQuoteForView.notes}
                    </div>
                  )}

                  {/* Actions in View Modal */}
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <Link
                      to={`/admin/dashboard/export/quotations/${selectedQuoteForView.id}/edit`}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-bold flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                    >
                      <Edit className="w-3.5 h-3.5 text-[#7FB706]" /> Edit Quotation
                    </Link>

                    <div className="flex gap-2">
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

      {/* Email Quote Modal */}
      {showEmailModal && selectedQuoteForEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Send Export Quotation Email</h3>
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
                  Email sent to {emailForm.recipientEmail} with official proforma quotation details.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendQuoteEmail} className="space-y-3">
                <div>
                  <label className="text-gray-400 font-bold block mb-1">Recipient Email *</label>
                  <input
                    required
                    type="email"
                    value={emailForm.recipientEmail}
                    onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-gray-400 font-bold block mb-1">Subject *</label>
                  <input
                    required
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-gray-400 font-bold block mb-1">Message Content (HTML allowed)</label>
                  <textarea
                    rows={6}
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
                    className="px-5 py-2.5 bg-[#7FB706] text-[#030213] rounded-xl font-bold flex items-center gap-1.5 min-h-[44px] disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sendingEmail ? 'Dispatching...' : 'Dispatch Quotation'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportQuotationsPage;
