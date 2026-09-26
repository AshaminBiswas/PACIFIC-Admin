import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Globe,
  Building2,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  Mail,
  Phone,
  CreditCard,
  FileText,
  X,
  RefreshCw,
  Eye,
  Send,
  CheckCircle2,
  Lock,
  Trash2,
} from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type {
  BusinessParty,
  ExportCustomer360,
  ExportCountry,
  ExportIncoterm,
  ExportPort,
} from '../../types/admin';

export const ExportCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Customer 360 Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customer360, setCustomer360] = useState<ExportCustomer360 | null>(null);
  const [loading360, setLoading360] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'bank' | 'emails'>('profile');

  // Modals
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Add Bank Account Form
  const [bankForm, setBankForm] = useState({
    bankName: '',
    swiftBic: '',
    iban: '',
    accountNumberMasked: '',
    routingNumber: '',
    currency: 'USD',
    isVerified: true,
  });
  const [savingBank, setSavingBank] = useState(false);

  // Quick Email Form
  const [emailForm, setEmailForm] = useState({
    subject: '',
    templateCode: 'EXPORT_ORDER_CONFIRMATION',
    bodyHtml: '',
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  const loadCustomers = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await exportApi.listCustomers({
        page,
        limit: 15,
        search: search || undefined,
      });
      if (res.data.success && res.data.data) {
        setCustomers(res.data.data.items);
        setTotalPages(res.data.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to load foreign customers', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete foreign buyer "${name}"? This action cannot be undone.`)) return;
    try {
      await exportApi.deleteCustomer(id);
      loadCustomers(true);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete foreign buyer');
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, search]);

  const handleOpen360 = async (partyId: string) => {
    setSelectedCustomerId(partyId);
    setActiveTab('profile');
    try {
      setLoading360(true);
      const res = await exportApi.getCustomer360(partyId);
      if (res.data.success && res.data.data) {
        setCustomer360(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load customer 360', err);
    } finally {
      setLoading360(false);
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    try {
      setSavingBank(true);
      const res = await exportApi.addCustomerBankAccount(selectedCustomerId, bankForm);
      if (res.data.success) {
        setShowAddBankModal(false);
        handleOpen360(selectedCustomerId);
        setBankForm({
          bankName: '',
          swiftBic: '',
          iban: '',
          accountNumberMasked: '',
          routingNumber: '',
          currency: 'USD',
          isVerified: true,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add bank account');
    } finally {
      setSavingBank(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer360?.party.email) {
      alert('This customer does not have a primary email registered.');
      return;
    }
    try {
      setSendingEmail(true);
      const res = await exportApi.sendTradeEmail({
        partyId: customer360.party.id,
        recipientEmail: customer360.party.email,
        templateCode: emailForm.templateCode,
        subject: emailForm.subject || `Trade Communication from Pacific Products & Solutions`,
        bodyHtml: emailForm.bodyHtml || `<p>Dear ${customer360.party.legalName},</p><p>Thank you for partnering with Pacific Products & Solutions.</p>`,
      });
      if (res.data.success) {
        setEmailSentSuccess(true);
        setTimeout(() => {
          setEmailSentSuccess(false);
          setShowEmailModal(false);
          handleOpen360(customer360.party.id);
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
            <Users className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Foreign Buyers &amp; International CRM
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Customer 360, SWIFT/IBAN Bank Details, Sanctions Compliance &amp; Trade Balances
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => loadCustomers(true)}
            disabled={refreshing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#7FB706]' : ''}`} />
            <span>Sync Live</span>
          </button>

          <Link
            to="/admin/dashboard/export/customers/new"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-bold transition shadow-lg shadow-[#7FB706]/20 active:scale-95 min-h-[44px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Buyer</span>
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-[#0f0e26]/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search foreign buyers by company name, email, country, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
          />
        </div>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#070714] border border-white/10 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mb-3" />
          <p className="text-xs text-gray-400 font-medium">Loading international buyers...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#070714] border border-white/10 rounded-2xl text-center">
          <Users className="w-12 h-12 text-gray-600 mb-3 stroke-[1.5]" />
          <h3 className="text-base font-bold text-white mb-1">No Foreign Buyers Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mb-4">
            Register foreign corporate buyers, configure export credit limits, and setup multi-currency settlement banks.
          </p>
          <Link
            to="/admin/dashboard/export/customers/new"
            className="flex items-center justify-center px-4 py-2 bg-[#7FB706] text-[#030213] rounded-xl text-xs font-bold hover:bg-[#B5F823] transition min-h-[44px]"
          >
            Register First Buyer
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto bg-[#070714] border border-white/10 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/10">
                <tr>
                  <th className="px-4 py-3.5">Company &amp; Trade Name</th>
                  <th className="px-4 py-3.5">Primary Contact</th>
                  <th className="px-4 py-3.5">Risk &amp; Compliance</th>
                  <th className="px-4 py-3.5">Credit Terms</th>
                  <th className="px-4 py-3.5">Export Orders</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white tracking-wide">{c.legalName}</div>
                      {c.tradeName && <div className="text-[11px] text-gray-400">{c.tradeName}</div>}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                          🌍 {c.exportCustomerProfile?.country?.name || 'International'}
                        </span>
                        {c.exportCustomerProfile?.vatTrn && (
                          <span className="text-[10px] text-gray-400">TRN: {c.exportCustomerProfile.vatTrn}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-gray-200">{c.email || 'No Email'}</div>
                      <div className="text-[10px] text-gray-400">{c.phone || 'No Phone'}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.exportCustomerProfile?.complianceStatus === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {c.exportCustomerProfile?.complianceStatus || 'VERIFIED'}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-300">
                          {c.exportCustomerProfile?.riskRating || 'LOW'} RISK
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-gray-200 font-semibold">
                        {c.exportCustomerProfile?.creditLimitUsd
                          ? `$${Number(c.exportCustomerProfile.creditLimitUsd).toLocaleString()} ${c.exportCustomerProfile?.defaultCurrency || 'USD'}`
                          : 'No Limit'}
                      </div>
                      <div className="text-[10px] text-gray-400">Net {c.exportCustomerProfile?.creditTermsDays || 30} Days</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[#7FB706] font-bold">
                        <span>{c._count?.exportOrders || 0} Orders</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleOpen360(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#7FB706] hover:text-[#B5F823] font-semibold text-xs transition active:scale-95 min-h-[36px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Buyer 360</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(c.id, c.legalName)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                          title="Delete foreign buyer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Transform */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <div
                key={c.id}
                className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div onClick={() => handleOpen360(c.id)} className="cursor-pointer">
                    <h4 className="text-sm font-black text-white">{c.legalName}</h4>
                    {c.tradeName && <p className="text-xs text-gray-400">{c.tradeName}</p>}
                    <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                      🌍 {c.exportCustomerProfile?.country?.name || 'International'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {c.exportCustomerProfile?.complianceStatus || 'VERIFIED'}
                    </span>
                    <button
                      onClick={() => handleDeleteCustomer(c.id, c.legalName)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/5 text-gray-400">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Contact Email</span>
                    <span className="text-gray-300 truncate block">{c.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Phone</span>
                    <span className="text-gray-300 truncate block">{c.phone || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleOpen360(c.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#7FB706] text-xs font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Buyer 360</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 bg-[#070714] border border-white/10 rounded-xl text-xs">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page <span className="text-white font-bold">{page}</span> of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Customer 360 Detail Drawer */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-6 bg-[#0f0e26] border-b border-white/10 flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black tracking-wider text-[#7FB706] uppercase">
                    FOREIGN BUYER 360
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    SANCTIONS CLEARED
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {customer360?.party.legalName || 'Loading Buyer...'}
                </h3>
                <p className="text-xs text-gray-400">
                  {customer360?.party.email} • {customer360?.party.phone}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#7FB706] text-[#030213] text-xs font-bold hover:bg-[#B5F823] transition flex items-center gap-1.5 min-h-[36px]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Email Buyer</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedCustomerId(null);
                    setCustomer360(null);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lifetime KPI Summary */}
            {customer360?.tradeMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-black/40 border-b border-white/5 text-xs">
                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-gray-400 text-[10px] block">Total Orders</span>
                  <span className="text-base font-black text-white">
                    {customer360.tradeMetrics.totalOrdersCount}
                  </span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-gray-400 text-[10px] block">Lifetime Value</span>
                  <span className="text-base font-black text-[#7FB706]">
                    ${customer360.tradeMetrics.lifetimeTradeValueUsd.toLocaleString()}
                  </span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-gray-400 text-[10px] block">Realized Amount</span>
                  <span className="text-base font-black text-emerald-400">
                    ${customer360.tradeMetrics.lifetimeRealizedUsd.toLocaleString()}
                  </span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-gray-400 text-[10px] block">Outstanding Balance</span>
                  <span className="text-base font-black text-amber-400">
                    ${customer360.tradeMetrics.outstandingBalanceUsd.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Drawer Tabs */}
            <div className="flex border-b border-white/10 px-4 sm:px-6 bg-[#0f0e26]/50">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  activeTab === 'profile'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Export Profile &amp; Terms
              </button>
              <button
                onClick={() => setActiveTab('bank')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  activeTab === 'bank'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Designated Bank Accounts ({customer360?.party.exportBankAccounts?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  activeTab === 'orders'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Export Orders ({customer360?.party.exportOrders?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('emails')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  activeTab === 'emails'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Email Communication ({customer360?.party.exportEmails?.length || 0})
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {loading360 ? (
                <div className="p-8 text-center text-xs text-gray-400">Loading buyer details...</div>
              ) : (
                <>
                  {activeTab === 'profile' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Destination Country
                          </span>
                          <p className="text-sm font-bold text-white">
                            {customer360?.party.exportCustomerProfile?.country?.name || 'United Arab Emirates (UAE)'}
                          </p>
                        </div>
                        <div className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Foreign Tax / VAT TRN
                          </span>
                          <p className="text-sm font-mono font-bold text-white">
                            {customer360?.party.exportCustomerProfile?.vatTrn ||
                              customer360?.party.gstin ||
                              '100293847291003'}
                          </p>
                        </div>
                        <div className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Approved Credit Limit
                          </span>
                          <p className="text-sm font-bold text-[#7FB706]">
                            $
                            {customer360?.party.exportCustomerProfile?.creditLimitUsd?.toLocaleString() ||
                              '50,000'}{' '}
                            USD
                          </p>
                          <p className="text-xs text-gray-500">
                            Terms: {customer360?.party.exportCustomerProfile?.creditTermsDays || 30} Days
                          </p>
                        </div>
                        <div className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Default Incoterm &amp; Port
                          </span>
                          <p className="text-sm font-bold text-white">
                            {customer360?.party.exportCustomerProfile?.defaultIncoterm?.code || 'CIF'} - Cost,
                            Insurance &amp; Freight
                          </p>
                          <p className="text-xs text-gray-500">
                            Port:{' '}
                            {customer360?.party.exportCustomerProfile?.defaultDestinationPort?.name ||
                              'Jebel Ali Port (AEJEA)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'bank' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Designated Buyer Remittance Accounts
                        </h4>
                        <button
                          onClick={() => setShowAddBankModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-[#7FB706] text-[#030213] text-xs font-bold hover:bg-[#B5F823] transition min-h-[36px]"
                        >
                          <Plus className="w-3.5 h-3.5 inline mr-1" />
                          Add Bank Account
                        </button>
                      </div>

                      {(!customer360?.party.exportBankAccounts ||
                        customer360.party.exportBankAccounts.length === 0) ? (
                        <div className="p-8 bg-black/30 border border-white/10 rounded-2xl text-center">
                          <CreditCard className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">No designated bank accounts registered.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {customer360.party.exportBankAccounts.map((b) => (
                            <div
                              key={b.id}
                              className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-2 text-xs"
                            >
                              <div className="flex justify-between items-start">
                                <h5 className="font-bold text-sm text-white">{b.bankName}</h5>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                                  VERIFIED
                                </span>
                              </div>
                              <div className="space-y-1 text-gray-400">
                                <div className="flex justify-between">
                                  <span>SWIFT / BIC:</span>
                                  <span className="font-mono text-white">{b.swiftBic || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>IBAN:</span>
                                  <span className="font-mono text-white">{b.iban || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Currency:</span>
                                  <span className="text-[#7FB706] font-bold">{b.currency}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'orders' && (
                    <div className="space-y-3">
                      {(!customer360?.party.exportOrders || customer360.party.exportOrders.length === 0) ? (
                        <div className="p-8 bg-black/30 border border-white/10 rounded-2xl text-center">
                          <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">No export orders found for this buyer.</p>
                        </div>
                      ) : (
                        customer360.party.exportOrders.map((ord) => (
                          <div
                            key={ord.id}
                            className="bg-black/40 border border-white/10 p-4 rounded-2xl flex justify-between items-center text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-white block">
                                {ord.exportOrderNumber}
                              </span>
                              <span className="text-gray-400 text-[11px]">
                                PO #{ord.buyerPoNumber || 'N/A'} • {new Date(ord.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-[#7FB706] block">
                                {ord.currency} {ord.totalOrderValue.toLocaleString()}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-300 font-bold uppercase">
                                {ord.stage.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'emails' && (
                    <div className="space-y-3">
                      {(!customer360?.party.exportEmails || customer360.party.exportEmails.length === 0) ? (
                        <div className="p-8 bg-black/30 border border-white/10 rounded-2xl text-center">
                          <Mail className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">No outbound emails dispatched yet.</p>
                        </div>
                      ) : (
                        customer360.party.exportEmails.map((em) => (
                          <div
                            key={em.id}
                            className="bg-black/40 border border-white/10 p-3 rounded-xl flex justify-between items-center text-xs"
                          >
                            <div>
                              <p className="font-bold text-white">{em.subject}</p>
                              <p className="text-[11px] text-gray-400">
                                To: {em.recipientEmail} • {new Date(em.sentAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {em.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Add International Bank Account</h3>
              <button
                onClick={() => setShowAddBankModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBank} className="space-y-3">
              <div>
                <label className="text-gray-400 font-bold block mb-1">Bank Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Emirates NBD / First Abu Dhabi Bank"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-gray-400 font-bold block mb-1">SWIFT / BIC Code *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. EBILAEADXXX"
                  value={bankForm.swiftBic}
                  onChange={(e) => setBankForm({ ...bankForm, swiftBic: e.target.value.toUpperCase() })}
                  className="w-full font-mono bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-gray-400 font-bold block mb-1">IBAN Number *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. AE070331234567890123456"
                  value={bankForm.iban}
                  onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value.toUpperCase() })}
                  className="w-full font-mono bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-gray-400 font-bold block mb-1">Settlement Currency</label>
                <select
                  value={bankForm.currency}
                  onChange={(e) => setBankForm({ ...bankForm, currency: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-4 py-2 bg-white/5 rounded-xl text-gray-300 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBank}
                  className="px-4 py-2 bg-[#7FB706] text-[#030213] rounded-xl font-bold min-h-[44px] disabled:opacity-50"
                >
                  {savingBank ? 'Saving...' : 'Save Bank Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Dispatch Trade Email</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailSentSuccess ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-[#7FB706] mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-white">Email Dispatched!</h4>
                <p className="text-xs text-gray-400">
                  Message queued and sent to {customer360?.party.email}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-3">
                <div>
                  <label className="text-gray-400 font-bold block mb-1">Recipient</label>
                  <input
                    readOnly
                    type="text"
                    value={customer360?.party.email || ''}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-gray-300 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-gray-400 font-bold block mb-1">Subject</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Pacific Products & Solutions — Trade Update"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-gray-400 font-bold block mb-1">Message Body</label>
                  <textarea
                    rows={4}
                    placeholder="Type your message to the foreign buyer..."
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
                    <span>{sendingEmail ? 'Dispatching...' : 'Send Email'}</span>
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

export default ExportCustomersPage;
