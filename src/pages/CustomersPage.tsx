import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Plus, Phone, Mail, MapPin, Building,
  FileText, CreditCard, ChevronRight, X, Eye, AlertCircle, RefreshCw, Check,
  GitMerge, Layers, ShoppingBag, Package, Wrench, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { crmApi } from '../api/services';
import type { BusinessParty, Customer360Data } from '../types/admin';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selected360, setSelected360] = useState<Customer360Data | null>(null);
  const [loading360, setLoading360] = useState(false);
  const [active360Tab, setActive360Tab] = useState<'OVERVIEW' | 'TIMELINE' | 'TRANSACTIONS' | 'CONTACTS'>('OVERVIEW');

  // Deduplication & Merge State
  const [duplicateMatches, setDuplicateMatches] = useState<BusinessParty[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [canonicalCustomerId, setCanonicalCustomerId] = useState('');
  const [mergedCustomerId, setMergedCustomerId] = useState('');
  const [mergeReason, setMergeReason] = useState('Duplicate customer consolidation');
  const [merging, setMerging] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    legalName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    email: '',
    phone: '',
    customerType: 'CONTRACTOR',
    creditLimit: '',
    paymentTermsDays: '30',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    billingAddress: '',
    billingCity: 'Delhi',
    billingState: 'Delhi',
    billingStateCode: '07',
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.listCustomers({ page, limit: 15, search });
      if (res.data?.data) {
        setCustomers(res.data.data.items || []);
        setTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Real-time Duplicate Check
  useEffect(() => {
    if (!showCreateModal) {
      setDuplicateMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      const hasMinLength =
        (formData.legalName?.trim().length || 0) >= 4 ||
        (formData.phone?.trim().length || 0) >= 6 ||
        (formData.gstin?.trim().length || 0) >= 5;
      if (!hasMinLength) {
        setDuplicateMatches([]);
        return;
      }
      setCheckingDuplicates(true);
      try {
        const res = await crmApi.checkDuplicates({
          legalName: formData.legalName,
          phone: formData.phone,
          gstin: formData.gstin,
        });
        if (res.data?.data) {
          setDuplicateMatches(res.data.data);
        }
      } catch (err) {
        console.error('Failed to check duplicates:', err);
      } finally {
        setCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.legalName, formData.phone, formData.gstin, showCreateModal]);

  const handleMergeCustomers = async () => {
    if (!canonicalCustomerId || !mergedCustomerId) {
      alert('Please select both the target canonical customer and the duplicate customer to merge.');
      return;
    }
    if (canonicalCustomerId === mergedCustomerId) {
      alert('Canonical customer and duplicate customer cannot be the same.');
      return;
    }
    if (!confirm('Are you sure you want to merge these customers? All historic Quotations, Orders, PIs, Packing Lists, Hardware Issues, and Payments will be consolidated.')) {
      return;
    }
    setMerging(true);
    try {
      await crmApi.mergeCustomers(canonicalCustomerId, mergedCustomerId, mergeReason);
      alert('Customers successfully merged!');
      setShowMergeModal(false);
      setCanonicalCustomerId('');
      setMergedCustomerId('');
      fetchCustomers();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to merge customers');
    } finally {
      setMerging(false);
    }
  };

  const handleOpen360 = async (id: string) => {
    setLoading360(true);
    setActive360Tab('OVERVIEW');
    try {
      const res = await crmApi.getCustomer360(id);
      if (res.data?.data) {
        setSelected360(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load Customer 360:', err);
    } finally {
      setLoading360(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmApi.createCustomer({
        legalName: formData.legalName,
        tradeName: formData.tradeName || formData.legalName,
        gstin: formData.gstin,
        pan: formData.pan,
        email: formData.email,
        phone: formData.phone,
        customerType: formData.customerType,
        creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
        paymentTermsDays: Number(formData.paymentTermsDays),
        contacts: formData.contactName
          ? [{ name: formData.contactName, phone: formData.contactPhone, email: formData.contactEmail, isPrimary: true }]
          : [],
        addresses: formData.billingAddress
          ? [{
              addressType: 'BILLING',
              addressLine1: formData.billingAddress,
              city: formData.billingCity,
              state: formData.billingState,
              stateCode: formData.billingStateCode,
              isDefaultBilling: true,
            }]
          : [],
      });
      setShowCreateModal(false);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to create customer:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#7FB706]" />
            B2B Customers & CRM
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Enterprise customer master, contacts, credit limits, and real-time Customer 360 KPIs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMergeModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-semibold rounded-xl border border-white/10 transition-all cursor-pointer min-h-[44px]"
            title="Consolidate duplicate customer records"
          >
            <GitMerge className="w-4 h-4 text-amber-400" />
            Merge Records
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company name, GSTIN, phone, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>
        <button
          onClick={() => fetchCustomers()}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl border border-white/5 flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Customer List (Desktop Table + Mobile Cards) */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
            Loading customer master...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-white">No customers found</p>
            <p className="text-xs text-gray-500 mt-1">Create your first B2B customer to begin tracking transactions.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0e0e1e] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">GSTIN / PAN</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Terms</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{c.legalName}</div>
                        {c.tradeName && c.tradeName !== c.legalName && (
                          <div className="text-xs text-gray-500">{c.tradeName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        <div>{c.gstin || 'N/A'}</div>
                        {c.pan && <div className="text-gray-500">PAN: {c.pan}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20">
                          {c.customerProfile?.customerType || 'CONTRACTOR'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div>{c.email || c.contacts?.[0]?.email || '-'}</div>
                        <div className="text-gray-500">{c.phone || c.contacts?.[0]?.phone || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {c.customerProfile?.paymentTermsDays || 30} Days
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpen360(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] text-xs font-semibold rounded-lg border border-[#7FB706]/30 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Customer 360
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Touch-Optimized) */}
            <div className="lg:hidden p-4 space-y-3">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#0d0d1e] border border-white/5 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-base">{c.legalName}</h4>
                      {c.tradeName && <p className="text-xs text-gray-400">{c.tradeName}</p>}
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#7FB706]/15 text-[#7FB706] shrink-0">
                      {c.customerProfile?.customerType || 'CONTRACTOR'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 pt-1 border-t border-white/5">
                    <div>
                      <span className="text-gray-500">GSTIN:</span> {c.gstin || 'N/A'}
                    </div>
                    <div>
                      <span className="text-gray-500">Terms:</span> {c.customerProfile?.paymentTermsDays || 30} Days
                    </div>
                    {c.phone && (
                      <div className="col-span-2 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-500" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpen360(c.id)}
                    className="w-full py-2 bg-[#7FB706]/10 text-[#7FB706] text-xs font-semibold rounded-lg border border-[#7FB706]/30 flex items-center justify-center gap-2 mt-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Customer 360
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer 360 View Modal with Unified Timeline & Multi-System KPIs */}
      {selected360 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#7FB706] tracking-wider uppercase">Customer 360 Intelligence</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{selected360.customer.legalName}</h2>
                <p className="text-xs text-gray-400">
                  GSTIN: {selected360.customer.gstin || 'N/A'} | PAN: {selected360.customer.pan || 'N/A'} | Phone: {selected360.customer.phone || 'N/A'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCanonicalCustomerId(selected360.customer.id);
                    setShowMergeModal(true);
                  }}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg border border-amber-500/20 flex items-center gap-1.5 min-h-[38px]"
                  title="Merge another record into this customer"
                >
                  <GitMerge className="w-3.5 h-3.5" /> Merge Records
                </button>
                <button
                  onClick={() => setSelected360(null)}
                  className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 360 Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto">
              {[
                { id: 'OVERVIEW', label: 'Overview & KPIs' },
                { id: 'TIMELINE', label: `Unified Timeline (${selected360.timeline?.length || 0})` },
                { id: 'TRANSACTIONS', label: 'Orders & Quotes' },
                { id: 'CONTACTS', label: 'Contacts & Addresses' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActive360Tab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[40px] ${
                    active360Tab === tab.id
                      ? 'bg-[#7FB706] text-white'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: Overview & Extended KPIs */}
            {active360Tab === 'OVERVIEW' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3.5">
                    <span className="text-[11px] text-gray-400">Total Quoted</span>
                    <div className="text-base sm:text-lg font-bold text-amber-400 mt-1">
                      ₹ {Number(selected360.kpis.totalQuotedValue || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3.5">
                    <span className="text-[11px] text-gray-400">Total Ordered</span>
                    <div className="text-base sm:text-lg font-bold text-white mt-1">
                      ₹ {Number(selected360.kpis.totalOrderedValue || selected360.kpis.totalPurchaseValue || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3.5">
                    <span className="text-[11px] text-gray-400">Total Dispatched</span>
                    <div className="text-base sm:text-lg font-bold text-blue-400 mt-1">
                      ₹ {Number(selected360.kpis.totalDispatchedValue || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3.5">
                    <span className="text-[11px] text-gray-400">Conversion Rate</span>
                    <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1">
                      {selected360.kpis.conversionRatePercent != null ? `${selected360.kpis.conversionRatePercent}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3.5">
                    <span className="text-[11px] text-gray-400">Total Invoiced</span>
                    <div className="text-base sm:text-lg font-bold text-white mt-1">
                      ₹ {Number(selected360.kpis.totalInvoiced).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3.5">
                    <span className="text-[11px] text-gray-400">Total Paid</span>
                    <div className="text-base sm:text-lg font-bold text-[#7FB706] mt-1">
                      ₹ {Number(selected360.kpis.totalPaid).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3.5">
                    <span className="text-[11px] text-gray-400">Outstanding Due</span>
                    <div className="text-base sm:text-lg font-bold text-red-400 mt-1">
                      ₹ {Number(selected360.kpis.outstandingBalance).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3.5">
                    <span className="text-[11px] text-gray-400">Open Invoices</span>
                    <div className="text-base sm:text-lg font-bold text-purple-400 mt-1">
                      {selected360.kpis.openInvoicesCount}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Unified Cross-Module Timeline */}
            {active360Tab === 'TIMELINE' && (
              <div className="space-y-4">
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                  {!selected360.timeline || selected360.timeline.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs">
                      No document history recorded for this customer yet.
                    </div>
                  ) : (
                    selected360.timeline.map((item, idx) => {
                      let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                      let Icon = FileText;

                      if (item.type === 'QUOTATION') {
                        badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                        Icon = FileText;
                      } else if (item.type === 'ORDER') {
                        badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                        Icon = ShoppingBag;
                      } else if (item.type === 'PI') {
                        badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                        Icon = FileText;
                      } else if (item.type === 'PACKING_LIST') {
                        badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        Icon = Package;
                      } else if (item.type === 'HARDWARE_ISSUE') {
                        badgeColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                        Icon = Wrench;
                      } else if (item.type === 'PAYMENT') {
                        badgeColor = 'bg-[#7FB706]/10 text-[#7FB706] border-[#7FB706]/20';
                        Icon = CreditCard;
                      }

                      return (
                        <div key={idx} className="relative group">
                          <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-[#121226] border-2 border-[#7FB706] flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#7FB706]" />
                          </div>

                          <div className="p-3 rounded-xl bg-[#0a0a1a] border border-white/5 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor} flex items-center gap-1`}>
                                <Icon className="w-3 h-3" /> {item.type}
                              </span>
                              <span className="text-gray-400">
                                {new Date(item.date).toLocaleDateString('en-GB')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-mono font-bold text-white text-xs">{item.referenceNumber}</span>
                                <span className="text-xs text-gray-400 ml-2">{item.title}</span>
                              </div>
                              {item.amount != null && (
                                <span className="font-bold text-xs text-[#7FB706]">
                                  ₹ {Number(item.amount).toLocaleString()}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-gray-500">Status: {item.status}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB: Transactions */}
            {active360Tab === 'TRANSACTIONS' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Proforma Invoices</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-300">
                      <thead className="bg-[#0a0a1a] text-gray-500 uppercase border-b border-white/5">
                        <tr>
                          <th className="py-2 px-3">PI Number</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selected360.recentProformaInvoices.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2 px-3 font-mono text-white">{p.piNumber}</td>
                            <td className="py-2 px-3">{new Date(p.piDate).toLocaleDateString('en-GB')}</td>
                            <td className="py-2 px-3 font-semibold text-[#7FB706]">₹ {Number(p.grandTotal).toLocaleString()}</td>
                            <td className="py-2 px-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/5">{p.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Contacts & Addresses */}
            {active360Tab === 'CONTACTS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#7FB706]" /> Primary Contacts
                  </h4>
                  {selected360.customer.contacts && selected360.customer.contacts.length > 0 ? (
                    <div className="space-y-2 text-xs">
                      {selected360.customer.contacts.map((ct) => (
                        <div key={ct.id} className="border-b border-white/5 pb-1.5 last:border-0">
                          <div className="font-semibold text-white">{ct.name} {ct.designation && `(${ct.designation})`}</div>
                          <div className="text-gray-400">{ct.phone || ct.email}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No contacts saved</p>
                  )}
                </div>

                <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#7FB706]" /> Registered Addresses
                  </h4>
                  {selected360.customer.addresses && selected360.customer.addresses.length > 0 ? (
                    <div className="space-y-2 text-xs">
                      {selected360.customer.addresses.map((ad) => (
                        <div key={ad.id} className="border-b border-white/5 pb-1.5 last:border-0 text-gray-300">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 mr-1.5">{ad.addressType}</span>
                          {ad.addressLine1}, {ad.city}, {ad.state}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No address saved</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Touch-Optimized Create Customer Modal with Real-time Duplicate Warning */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#7FB706]" /> New B2B Customer
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Real-time Deduplication Alert Banner */}
            {duplicateMatches.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <ShieldAlert className="w-4 h-4" /> Potential Duplicate Customer(s) Detected ({duplicateMatches.length})
                </div>
                <p className="text-amber-200/90">
                  Existing records match the legal name, phone, or GSTIN entered:
                </p>
                <div className="space-y-1.5">
                  {duplicateMatches.map((d) => (
                    <div key={d.id} className="p-2.5 rounded-lg bg-[#0a0a1a] border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{d.legalName}</div>
                        <div className="text-gray-400 font-mono text-[11px]">
                          GSTIN: {d.gstin || 'None'} | Phone: {d.phone || 'None'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCanonicalCustomerId(d.id);
                          setShowCreateModal(false);
                          setShowMergeModal(true);
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-lg min-h-[36px]"
                      >
                        Merge with this
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Company Legal Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    placeholder="e.g. Gencon Infrastructure Pvt. Ltd."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Trade Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    placeholder="e.g. Gencon"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Customer Category</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="CONTRACTOR">General Contractor</option>
                    <option value="ARCHITECT">Architect / Consultant</option>
                    <option value="CORPORATE">Corporate Client</option>
                    <option value="INSTITUTIONAL">Institutional / Hospital</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">GSTIN (15 Characters)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-[#7FB706]"
                    placeholder="e.g. 07AAAAG1234A1Z5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-[#7FB706]"
                    placeholder="e.g. AAAAG1234A"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    placeholder="procurement@gencon.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Mobile / Phone</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    placeholder="9818592113"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Billing Address Line</label>
                  <input
                    type="text"
                    value={formData.billingAddress}
                    onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    placeholder="Floor 4, Tower B, Business Park"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold text-sm rounded-xl"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Merge Tool Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-amber-400" /> Customer Merge Tool
              </h4>
              <button onClick={() => setShowMergeModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Consolidate duplicate records into a canonical surviving master. All historic Quotations, Orders, Invoices, Packing Lists, Hardware Issues, and Payments will be safely re-linked.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#7FB706] mb-1">
                  1. Canonical Surviving Customer (Target) *
                </label>
                <select
                  value={canonicalCustomerId}
                  onChange={(e) => setCanonicalCustomerId(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-[#7FB706]/40 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                >
                  <option value="">-- Select Canonical Target Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.legalName} ({c.gstin || c.phone || 'No GSTIN'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-red-400 mb-1">
                  2. Duplicate Customer to Merge & Deactivate (Source) *
                </label>
                <select
                  value={mergedCustomerId}
                  onChange={(e) => setMergedCustomerId(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-red-500/40 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                >
                  <option value="">-- Select Duplicate Customer to Archive --</option>
                  {customers
                    .filter((c) => c.id !== canonicalCustomerId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName} ({c.gstin || c.phone || 'No GSTIN'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Merge Reason *</label>
                <input
                  type="text"
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  placeholder="e.g. Accidental duplicate created during quotation drafting..."
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-xs min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={merging}
                onClick={handleMergeCustomers}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs min-h-[44px] flex items-center gap-1.5 disabled:opacity-50"
              >
                <GitMerge className="w-4 h-4" />
                {merging ? 'Consolidating...' : 'Execute Merge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
