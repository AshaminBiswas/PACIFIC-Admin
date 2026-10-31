import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Receipt,
  PlusCircle,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  MapPin,
  Sparkles,
  Printer,
  SlidersHorizontal,
} from 'lucide-react';
import { useReportingPeriod } from '../../context/ReportingPeriodContext';
import { ReportingPeriodBar } from '../../components/reporting/ReportingPeriodBar';
import {
  BranchItem,
  BranchTransactionItem,
  BranchLedgerSummaryResponse,
} from '../../types/admin';
import { branchLedgerApi } from '../../api/branchLedgerApi';
import { AddEditBranchModal } from '../../components/branch-ledger/AddEditBranchModal';
import { AddEditBranchTransactionModal } from '../../components/branch-ledger/AddEditBranchTransactionModal';
import { BranchLedgerPdfModal } from '../../components/branch-ledger/BranchLedgerPdfModal';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const BranchLedgerPage: React.FC = () => {
  const { selection, resolvedPeriod, isRefreshing, triggerRefresh } = useReportingPeriod();

  // Branch states
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(true);

  // Transactions & Summary states
  const [transactions, setTransactions] = useState<BranchTransactionItem[]>([]);
  const [summary, setSummary] = useState<BranchLedgerSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [branchToEdit, setBranchToEdit] = useState<BranchItem | null>(null);

  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [txModalInitialType, setTxModalInitialType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [txToEdit, setTxToEdit] = useState<BranchTransactionItem | null>(null);

  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Load branches
  const loadBranches = useCallback(async () => {
    setIsLoadingBranches(true);
    try {
      const data = await branchLedgerApi.getBranches();
      setBranches(data);
    } catch (err: any) {
      console.error('Failed to load branches:', err);
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  // Load ledger transactions & summary
  const loadLedgerData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [txResult, summaryResult] = await Promise.all([
        branchLedgerApi.getTransactions({
          branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
          startDate: resolvedPeriod.startDate,
          endDate: resolvedPeriod.endDate,
          date: selection.date,
          type: typeFilter,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          paymentMode: paymentModeFilter !== 'ALL' ? paymentModeFilter : undefined,
          search: searchTerm.trim() || undefined,
          page,
          limit: 25,
        }),
        branchLedgerApi.getSummary({
          branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
          startDate: resolvedPeriod.startDate,
          endDate: resolvedPeriod.endDate,
          date: selection.date,
        }),
      ]);

      setTransactions(txResult.items || []);
      setTotalPages(txResult.pagination?.totalPages || 1);
      setTotalCount(txResult.pagination?.total || 0);
      setSummary(summaryResult);
    } catch (err: any) {
      console.error('Failed to load branch ledger data:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch ledger transactions.');
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedBranchId,
    resolvedPeriod.startDate,
    resolvedPeriod.endDate,
    selection.date,
    typeFilter,
    categoryFilter,
    paymentModeFilter,
    searchTerm,
    page,
  ]);

  useEffect(() => {
    loadLedgerData();
  }, [loadLedgerData]);

  // Selected Branch Object
  const currentBranch = useMemo(() => {
    if (selectedBranchId === 'ALL') return null;
    return branches.find((b) => b.id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  // Handle open add transaction
  const handleOpenAddTx = (txType: 'CREDIT' | 'DEBIT') => {
    setTxToEdit(null);
    setTxModalInitialType(txType);
    setIsTxModalOpen(true);
  };

  // Handle edit transaction
  const handleEditTx = (tx: BranchTransactionItem) => {
    setTxToEdit(tx);
    setTxModalInitialType(tx.type);
    setIsTxModalOpen(true);
  };

  // Handle delete transaction
  const handleDeleteTx = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this branch transaction?')) return;
    try {
      await branchLedgerApi.deleteTransaction(id);
      loadBranches();
      loadLedgerData();
      triggerRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete transaction.');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!transactions.length) {
      alert('No transactions to export.');
      return;
    }
    const headers = [
      'Date',
      'Branch',
      'Type',
      'Amount',
      'Running Balance',
      'Category',
      'Party / Payee',
      'Ref Number',
      'Payment Mode',
      'Status',
      'Particulars',
    ];
    const rows = transactions.map((t) => [
      t.entryDate,
      t.branchName || t.branchCode || '',
      t.type,
      t.amount,
      t.runningBalance,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.partyName || '').replace(/"/g, '""')}"`,
      `"${(t.referenceNo || '').replace(/"/g, '""')}"`,
      t.paymentMode,
      t.paymentStatus,
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Pacific_Branch_Ledger_${selectedBranchId}_${selection.date || resolvedPeriod.startDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header & Master Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
              <Building2 className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Branch Debit & Credit Management</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-lime-500/15 text-lime-400 border border-lime-500/30">
                  Dynamic Multi-Branch
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic book balance, credit (inflow) & debit (outflow) management with presentation-grade vector reports.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenAddTx('CREDIT')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-300" />
            <span>+ Record Credit</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddTx('DEBIT')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-300" />
            <span>+ Record Debit</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Dynamic Branch Switcher Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-lime-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Regional Branch Selector
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setBranchToEdit(null);
              setIsBranchModalOpen(true);
            }}
            className="px-3 py-1 rounded-xl text-[11px] font-bold bg-lime-500/15 hover:bg-lime-500/25 text-lime-400 border border-lime-500/30 flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add New Branch</span>
          </button>
        </div>

        {/* Branch Pills Carousel / Grid */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          {/* All Branches Consolidated Pill */}
          <button
            type="button"
            onClick={() => {
              setSelectedBranchId('ALL');
              setPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl border text-left shrink-0 transition-all ${
              selectedBranchId === 'ALL'
                ? 'bg-lime-500/15 border-lime-500/60 shadow-md shadow-lime-500/10'
                : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consolidated</div>
            <div className="text-xs font-black text-white flex items-center gap-1.5">
              <span>All Branches</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-lime-400 border border-slate-700">
                {branches.length}
              </span>
            </div>
          </button>

          {/* Dynamic Branch Pills */}
          {branches.map((b) => {
            const isSelected = selectedBranchId === b.id;
            const balance = Number(b.currentBalance || 0);

            return (
              <div
                key={b.id}
                className={`flex items-center rounded-xl border shrink-0 transition-all overflow-hidden ${
                  isSelected
                    ? 'bg-slate-800 border-lime-500 shadow-md shadow-lime-500/10'
                    : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBranchId(b.id);
                    setPage(1);
                  }}
                  className="px-3.5 py-2 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">{b.name}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-900 font-mono text-lime-400 border border-slate-700">
                      {b.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                    <span className="text-slate-400 text-[10px]">{b.city}</span>
                    <span className="text-slate-600">·</span>
                    <span className={`font-mono font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                </button>

                {/* Quick Edit Branch */}
                <button
                  type="button"
                  onClick={() => {
                    setBranchToEdit(b);
                    setIsBranchModalOpen(true);
                  }}
                  className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors border-l border-slate-700/40"
                  title="Edit branch details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Centralized Global Reporting Period Controller */}
      <ReportingPeriodBar onOpenExportModal={() => setIsPdfModalOpen(true)} />

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Live Financial Position KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Opening Balance */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Opening Balance</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-white tracking-tight">
              {formatCurrency(summary?.openingBalance || 0)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
            Base pool as of period start
          </div>
        </div>

        {/* KPI 2: Total Credits (Inflow) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">+ Total Credits (Inflow)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(summary?.totalCredits || 0)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Sales, HO & collections</span>
            <span className="font-bold text-emerald-400">Receipts</span>
          </div>
        </div>

        {/* KPI 3: Total Debits (Outflow) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">- Total Debits (Outflow)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-rose-400 tracking-tight">
              {formatCurrency(summary?.totalDebits || 0)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Expenses, freight & bills</span>
            <span className="font-bold text-rose-400">Payments</span>
          </div>
        </div>

        {/* KPI 4: Net Cash Flow */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Net Period Flow</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div
              className={`text-xl font-black tracking-tight ${
                (summary?.netCashFlow || 0) >= 0 ? 'text-cyan-400' : 'text-rose-400'
              }`}
            >
              {(summary?.netCashFlow || 0) >= 0 ? '+' : ''}
              {formatCurrency(summary?.netCashFlow || 0)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
            Credits minus Debits
          </div>
        </div>

        {/* KPI 5: Closing Book Balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-lime-500/40 rounded-2xl p-4 shadow-lg relative overflow-hidden group hover:border-lime-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-lime-400">Closing Book Balance</span>
            <div className="p-2 rounded-xl bg-lime-500/15 text-lime-400 border border-lime-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-white tracking-tight">
              {formatCurrency(summary?.closingBalance || 0)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Current Net Position</span>
            <span className="font-bold text-lime-400">Active</span>
          </div>
        </div>
      </div>

      {/* Cash vs Digital Bank Split Card */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <DollarSign className="w-5 h-5" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-300">Cash / Petty Cash Position</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Credits: +{formatCurrency(summary.cashPosition.credits)} · Debits: -{formatCurrency(summary.cashPosition.debits)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Net Cash</div>
              <div className="text-sm font-black text-amber-400">
                {formatCurrency(summary.cashPosition.net)}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Receipt className="w-5 h-5" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-300">Bank / Digital (UPI, IMPS, NEFT)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Credits: +{formatCurrency(summary.bankPosition.credits)} · Debits: -{formatCurrency(summary.bankPosition.debits)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Net Digital</div>
              <div className="text-sm font-black text-cyan-400">
                {formatCurrency(summary.bankPosition.net)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Ledger Table Hub */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tabs: All / Credits / Debits */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-fit">
            <button
              type="button"
              onClick={() => {
                setTypeFilter('ALL');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Transactions ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('CREDIT');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                typeFilter === 'CREDIT'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Credits Only</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('DEBIT');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                typeFilter === 'DEBIT'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Debits Only</span>
            </button>
          </div>

          {/* Search & Mode Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search party, ref, particulars..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500 w-52"
              />
            </div>

            <select
              value={paymentModeFilter}
              onChange={(e) => {
                setPaymentModeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-lime-500"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI / QR</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="NEFT_RTGS">NEFT / RTGS</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Type</th>
                {selectedBranchId === 'ALL' && <th className="py-3 px-3">Branch</th>}
                <th className="py-3 px-4">Particulars / Narration</th>
                <th className="py-3 px-4">Party / Payee</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Ref #</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-4 text-right">Credit (+)</th>
                <th className="py-3 px-4 text-right">Debit (-)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-lime-400 mb-2" />
                    <span>Loading branch ledger transactions...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    No transactions found matching the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isCredit = tx.type === 'CREDIT';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCredit ? 'bg-emerald-950/10' : 'bg-rose-950/10'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {formatDate(tx.entryDate)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCredit
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isCredit ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{tx.type}</span>
                        </span>
                      </td>

                      {selectedBranchId === 'ALL' && (
                        <td className="py-3 px-3 font-semibold text-slate-300">
                          {tx.branchName || tx.branchCode}
                        </td>
                      )}

                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {tx.description || tx.category}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-300">
                        {tx.partyName}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                          {tx.category}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                        {tx.referenceNo || '—'}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                          {tx.paymentMode}
                        </span>
                      </td>

                      {/* Credit (+) */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {isCredit ? `+${formatCurrency(tx.amount)}` : '—'}
                      </td>

                      {/* Debit (-) */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                        {!isCredit ? `-${formatCurrency(tx.amount)}` : '—'}
                      </td>

                      {/* Running Balance */}
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-100">
                        {formatCurrency(tx.runningBalance)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditTx(tx)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTx(tx.id)}
                            className="p-1 rounded text-rose-400/70 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {((page - 1) * 25) + 1} to {Math.min(page * 25, totalCount)} of {totalCount} transactions
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-200">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Branch Modal */}
      <AddEditBranchModal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        onSuccess={() => {
          loadBranches();
          loadLedgerData();
        }}
        branchToEdit={branchToEdit}
      />

      {/* Add / Edit Transaction Modal */}
      <AddEditBranchTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={() => {
          loadBranches();
          loadLedgerData();
          triggerRefresh();
        }}
        branches={branches}
        defaultBranchId={selectedBranchId}
        initialType={txModalInitialType}
        transactionToEdit={txToEdit}
      />

      {/* PDF Report Modal */}
      <BranchLedgerPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        branchId={selectedBranchId !== 'ALL' ? selectedBranchId : undefined}
        branchName={currentBranch ? currentBranch.name : 'All Consolidated Branches'}
        startDate={resolvedPeriod.startDate}
        endDate={resolvedPeriod.endDate}
        date={selection.date}
        periodLabel={resolvedPeriod.label}
      />
    </div>
  );
};

export default BranchLedgerPage;
