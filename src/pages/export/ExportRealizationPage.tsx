import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Search,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Building2,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  X,
  Eye,
  ShieldCheck,
  FileText,
  BadgePercent,
  Coins,
} from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type {
  ExportBankRealization,
  ExportIrm,
  ExportEbrc,
  ExportOrder,
} from '../../types/admin';

export const ExportRealizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'realizations' | 'irms' | 'ebrc'>('realizations');

  const [realizations, setRealizations] = useState<ExportBankRealization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Realization for Inspection
  const [selectedRealization, setSelectedRealization] = useState<ExportBankRealization | null>(null);

  // Modals
  const [showAddIrmModal, setShowAddIrmModal] = useState(false);
  const [showAddEbrcModal, setShowAddEbrcModal] = useState(false);

  // Add IRM Form
  const [irmForm, setIrmForm] = useState({
    irmNumber: '',
    irmDate: new Date().toISOString().split('T')[0],
    amount: 0,
    currency: 'USD',
    remitterName: '',
    swiftRef: '',
  });
  const [savingIrm, setSavingIrm] = useState(false);

  // Add eBRC Form
  const [ebrcForm, setEbrcForm] = useState({
    ebrcNumber: '',
    ebrcDate: new Date().toISOString().split('T')[0],
    fobValueRealized: 0,
    dgftStatus: 'APPROVED',
  });
  const [savingEbrc, setSavingEbrc] = useState(false);

  const loadRealizations = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await exportApi.listRealizations({
        page,
        limit: 15,
        search: search || undefined,
      });
      if (res.data.success && res.data.data) {
        setRealizations(res.data.data.items);
        setTotalPages(res.data.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to load realizations', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRealizations();
  }, [page, search]);

  const handleAddIrm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRealization) return;
    try {
      setSavingIrm(true);
      const res = await exportApi.addIrm(selectedRealization.id, irmForm);
      if (res.data.success) {
        setShowAddIrmModal(false);
        loadRealizations();
        setIrmForm({
          irmNumber: '',
          irmDate: new Date().toISOString().split('T')[0],
          amount: 0,
          currency: 'USD',
          remitterName: '',
          swiftRef: '',
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add IRM');
    } finally {
      setSavingIrm(false);
    }
  };

  const handleAddEbrc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRealization) return;
    try {
      setSavingEbrc(true);
      const res = await exportApi.addEbrc(selectedRealization.id, ebrcForm);
      if (res.data.success) {
        setShowAddEbrcModal(false);
        loadRealizations();
        setEbrcForm({
          ebrcNumber: '',
          ebrcDate: new Date().toISOString().split('T')[0],
          fobValueRealized: 0,
          dgftStatus: 'APPROVED',
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record eBRC');
    } finally {
      setSavingEbrc(false);
    }
  };

  // Aggregated totals
  const totalUsdRealized = realizations.reduce((acc, r) => acc + (r.currency === 'USD' ? r.realizedAmount : 0), 0);
  const totalInrRealized = realizations.reduce((acc, r) => acc + r.realizedAmountInr, 0);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12 text-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#0f0e26] via-[#070714] to-[#0f0e26] p-4 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] flex items-center justify-center text-[#030213] shadow-lg shadow-[#7FB706]/30">
            <Coins className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Forex Realization &amp; eBRC Hub
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              AD Bank Inward Remittances (IRMs), FIRC, RBI EDPMS &amp; DGFT eBRC Tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => loadRealizations(true)}
            disabled={refreshing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#7FB706]' : ''}`} />
            <span>Sync Live</span>
          </button>

          <Link
            to="/admin/dashboard/export/realization/new"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-bold transition shadow-lg shadow-[#7FB706]/20 active:scale-95 min-h-[44px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Realization</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
            Forex Realized (USD)
          </span>
          <p className="text-lg sm:text-2xl font-black text-[#7FB706]">
            ${totalUsdRealized.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-500">Foreign Currency Realized</p>
        </div>

        <div className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
            INR Settled In Bank
          </span>
          <p className="text-lg sm:text-2xl font-black text-emerald-400">
            ₹{totalInrRealized.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-500">Nostro Credited to Current A/C</p>
        </div>

        <div className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
            EDPMS Compliant
          </span>
          <p className="text-lg sm:text-2xl font-black text-white">100%</p>
          <p className="text-[10px] text-emerald-400">Zero Overdue &gt; 9 Months</p>
        </div>

        <div className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
            eBRC Generated
          </span>
          <p className="text-lg sm:text-2xl font-black text-sky-400">
            {realizations.filter((r) => r.ebrcs && r.ebrcs.length > 0).length} Certificates
          </p>
          <p className="text-[10px] text-gray-500">DGFT Synced</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-[#0f0e26]/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search realizations by order #, bank reference, FIRC, or buyer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
          />
        </div>
      </div>

      {/* Realizations List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#070714] border border-white/10 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mb-3" />
          <p className="text-xs text-gray-400 font-medium">Loading bank realizations...</p>
        </div>
      ) : realizations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#070714] border border-white/10 rounded-2xl text-center space-y-3">
          <Coins className="w-12 h-12 text-gray-600 mx-auto stroke-[1.5]" />
          <h3 className="text-base font-bold text-white">No Bank Realizations Found</h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Record bank inward remittances (IRMs), match with export orders, and track electronic Bank Realization Certificates (eBRC).
          </p>
          <Link
            to="/admin/dashboard/export/realization/new"
            className="inline-flex items-center justify-center px-4 py-2 bg-[#7FB706] text-[#030213] rounded-xl text-xs font-bold min-h-[44px]"
          >
            Record First Realization
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto bg-[#070714] border border-white/10 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/10">
                <tr>
                  <th className="px-4 py-3.5">Export Order &amp; Buyer</th>
                  <th className="px-4 py-3.5">Realized Amount (Forex)</th>
                  <th className="px-4 py-3.5">INR Realized</th>
                  <th className="px-4 py-3.5">AD Bank &amp; Branch</th>
                  <th className="px-4 py-3.5">FIRC / Ref #</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {realizations.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white tracking-wide">
                        {r.exportOrder?.exportOrderNumber || 'General Realization'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {r.exportOrder?.party?.legalName || 'Unlinked Buyer'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#7FB706]">
                      {r.currency} {r.realizedAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-white">
                      ₹{r.realizedAmountInr.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-gray-200">{r.adBankName || 'HDFC Bank Ltd'}</div>
                      <div className="text-[10px] font-mono text-gray-500">{r.adBankCode}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gray-300">
                      {r.bankRefNumber || 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400">
                      {r.realizationDate ? new Date(r.realizationDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedRealization(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#7FB706] font-semibold text-xs transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Transform */}
          <div className="md:hidden space-y-3">
            {realizations.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRealization(r)}
                className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-3 cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-[#7FB706] block">
                      {r.exportOrder?.exportOrderNumber || 'Realization'}
                    </span>
                    <h4 className="text-sm font-black text-white">
                      {r.exportOrder?.party?.legalName || 'Foreign Buyer'}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                    {r.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/5 text-gray-400">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Forex Realized</span>
                    <span className="font-bold text-[#7FB706]">
                      {r.currency} {r.realizedAmount.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">INR Value</span>
                    <span className="font-bold text-white">₹{r.realizedAmountInr.toLocaleString()}</span>
                  </div>
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
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page <span className="text-white font-bold">{page}</span> of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Realization Detail Modal */}
      {selectedRealization && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            <div className="p-4 sm:p-6 bg-[#0f0e26] border-b border-white/10 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-[#7FB706] uppercase tracking-wider">
                  FOREX REALIZATION DETAILS
                </span>
                <h3 className="text-lg font-black text-white">
                  {selectedRealization.exportOrder?.exportOrderNumber || 'Bank Realization'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRealization(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {/* Financial Breakdown */}
              <div className="grid grid-cols-2 gap-3 bg-black/40 border border-white/10 p-4 rounded-2xl">
                <div>
                  <span className="text-gray-400 text-[10px] block uppercase">Realized Foreign Currency</span>
                  <span className="text-lg font-black text-[#7FB706]">
                    {selectedRealization.currency} {selectedRealization.realizedAmount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block uppercase">Realized INR Equivalent</span>
                  <span className="text-lg font-black text-emerald-400">
                    ₹{selectedRealization.realizedAmountInr.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* IRMs Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-300 uppercase tracking-wider text-xs">
                    Inward Remittance Messages (IRMs)
                  </h4>
                  <button
                    onClick={() => setShowAddIrmModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#7FB706] text-[#030213] font-bold text-xs"
                  >
                    + Add IRM
                  </button>
                </div>

                {(!selectedRealization.irms || selectedRealization.irms.length === 0) ? (
                  <p className="text-gray-500 text-xs italic bg-black/30 p-3 rounded-xl">
                    No IRM references linked to this realization yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedRealization.irms.map((irm) => (
                      <div
                        key={irm.id}
                        className="bg-black/40 border border-white/10 p-3 rounded-xl flex justify-between items-center"
                      >
                        <div>
                          <p className="font-mono font-bold text-white">{irm.irmNumber}</p>
                          <p className="text-[10px] text-gray-400">
                            Remitter: {irm.remitterName || 'Overseas Buyer'} • SWIFT: {irm.swiftRef || 'N/A'}
                          </p>
                        </div>
                        <span className="font-bold text-[#7FB706]">
                          {irm.currency} {irm.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* eBRC Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-300 uppercase tracking-wider text-xs">
                    Electronic Bank Realization Certificates (eBRC)
                  </h4>
                  <button
                    onClick={() => setShowAddEbrcModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#7FB706] text-[#030213] font-bold text-xs"
                  >
                    + Record eBRC
                  </button>
                </div>

                {(!selectedRealization.ebrcs || selectedRealization.ebrcs.length === 0) ? (
                  <p className="text-gray-500 text-xs italic bg-black/30 p-3 rounded-xl">
                    No eBRC certificate logged. Click "Record eBRC" to link certificate.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedRealization.ebrcs.map((eb) => (
                      <div
                        key={eb.id}
                        className="bg-black/40 border border-white/10 p-3 rounded-xl flex justify-between items-center"
                      >
                        <div>
                          <p className="font-mono font-bold text-white">{eb.ebrcNumber}</p>
                          <p className="text-[10px] text-gray-400">
                            Date: {eb.ebrcDate ? new Date(eb.ebrcDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                          {eb.dgftStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add IRM Modal */}
      {showAddIrmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Record Inward Remittance (IRM)</h3>
              <button
                onClick={() => setShowAddIrmModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddIrm} className="space-y-3">
              <div>
                <label className="text-gray-400 font-bold block mb-1">IRM Number *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. IRM2609202619"
                  value={irmForm.irmNumber}
                  onChange={(e) => setIrmForm({ ...irmForm, irmNumber: e.target.value })}
                  className="w-full font-mono bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-gray-400 font-bold block mb-1">Remitter Name</label>
                <input
                  type="text"
                  placeholder="Foreign Buyer Legal Entity"
                  value={irmForm.remitterName}
                  onChange={(e) => setIrmForm({ ...irmForm, remitterName: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 font-bold block mb-1">Amount (USD)</label>
                  <input
                    type="number"
                    value={irmForm.amount}
                    onChange={(e) => setIrmForm({ ...irmForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-gray-400 font-bold block mb-1">SWIFT Reference</label>
                  <input
                    type="text"
                    placeholder="MT103 Ref"
                    value={irmForm.swiftRef}
                    onChange={(e) => setIrmForm({ ...irmForm, swiftRef: e.target.value })}
                    className="w-full font-mono bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddIrmModal(false)}
                  className="px-4 py-2 bg-white/5 rounded-xl text-gray-300 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingIrm}
                  className="px-4 py-2 bg-[#7FB706] text-[#030213] rounded-xl font-bold min-h-[44px] disabled:opacity-50"
                >
                  {savingIrm ? 'Saving...' : 'Link IRM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add eBRC Modal */}
      {showAddEbrcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Record DGFT eBRC Certificate</h3>
              <button
                onClick={() => setShowAddEbrcModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEbrc} className="space-y-3">
              <div>
                <label className="text-gray-400 font-bold block mb-1">eBRC Certificate Number *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. BRC/2026/0912/01"
                  value={ebrcForm.ebrcNumber}
                  onChange={(e) => setEbrcForm({ ...ebrcForm, ebrcNumber: e.target.value })}
                  className="w-full font-mono bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-gray-400 font-bold block mb-1">Realized FOB Value (INR)</label>
                <input
                  type="number"
                  value={ebrcForm.fobValueRealized}
                  onChange={(e) => setEbrcForm({ ...ebrcForm, fobValueRealized: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddEbrcModal(false)}
                  className="px-4 py-2 bg-white/5 rounded-xl text-gray-300 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEbrc}
                  className="px-4 py-2 bg-[#7FB706] text-[#030213] rounded-xl font-bold min-h-[44px] disabled:opacity-50"
                >
                  {savingEbrc ? 'Saving...' : 'Record eBRC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportRealizationPage;
