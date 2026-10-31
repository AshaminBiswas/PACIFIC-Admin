import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  PlusCircle,
  FileSpreadsheet,
  Search,
  Filter,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  Users,
  Building2,
  Receipt,
  RotateCw,
  Tag,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useReportingPeriod } from '../../context/ReportingPeriodContext';
import { ReportingPeriodBar } from '../../components/reporting/ReportingPeriodBar';
import { AsyncReportExportModal } from '../../components/reporting/AsyncReportExportModal';
import { AddEditDailySalesPurchaseModal } from '../../components/daily-reports/AddEditDailySalesPurchaseModal';
import { dailySalesPurchasesApi } from '../../api/dailySalesPurchasesApi';
import {
  DailySalesPurchaseItem,
  DailySalesPurchaseSummaryResponse,
} from '../../types/admin';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const DailySalesPurchasePage: React.FC = () => {
  const { selection, resolvedPeriod, refreshCount, triggerRefresh } = useReportingPeriod();

  // State
  const [items, setItems] = useState<DailySalesPurchaseItem[]>([]);
  const [summary, setSummary] = useState<DailySalesPurchaseSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [modalInitialType, setModalInitialType] = useState<'SALES' | 'PURCHASE'>('SALES');
  const [editingItem, setEditingItem] = useState<DailySalesPurchaseItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Fetch summary and list
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, listRes] = await Promise.all([
        dailySalesPurchasesApi.getSummary({
          startDate: resolvedPeriod.startDate,
          endDate: resolvedPeriod.endDate,
        }),
        dailySalesPurchasesApi.list({
          startDate: resolvedPeriod.startDate,
          endDate: resolvedPeriod.endDate,
          type: activeTab,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          search: searchQuery.trim() || undefined,
          page: currentPage,
          limit: 20,
        }),
      ]);

      setSummary(summaryRes);
      setItems(listRes.items || []);
      setTotalPages(listRes.pagination?.totalPages || 1);
      setTotalCount(listRes.pagination?.total || 0);
    } catch (err: any) {
      console.error('Failed to load daily sales & purchase data:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch daily entries.');
    } finally {
      setIsLoading(false);
    }
  }, [resolvedPeriod.startDate, resolvedPeriod.endDate, activeTab, selectedCategory, searchQuery, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshCount]);

  // Open add modal
  const handleOpenAdd = (targetType: 'SALES' | 'PURCHASE') => {
    setEditingItem(null);
    setModalInitialType(targetType);
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const handleEdit = (item: DailySalesPurchaseItem) => {
    setEditingItem(item);
    setModalInitialType(item.type);
    setIsAddModalOpen(true);
  };

  // Delete entry
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this daily entry?')) return;
    try {
      await dailySalesPurchasesApi.delete(id);
      loadData();
      triggerRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete daily entry.');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
              <Receipt className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Daily Sales & Purchase Report</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-lime-500/15 text-lime-400 border border-lime-500/30">
                  Delinked from PI
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manual daily sales & purchase entries with direct Customer / Vendor selection and reporting periods.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenAdd('SALES')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-lime-500 hover:bg-lime-400 text-slate-950 shadow-md shadow-lime-500/20 flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Record Daily Sale</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdd('PURCHASE')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Record Daily Purchase</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Centralized Global Reporting Period Controller */}
      <ReportingPeriodBar onOpenExportModal={() => setIsExportModalOpen(true)} />

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Sales KPI */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-lime-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Sales (Direct Customers)</span>
            <div className="p-2 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(summary?.totalSales || 0)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-lime-400" />
              <span>{summary?.salesCount || 0} Sales recorded in period</span>
            </div>
          </div>
        </div>

        {/* Purchase KPI */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Purchases (Direct Vendors)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(summary?.totalPurchases || 0)}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{summary?.purchaseCount || 0} Purchases recorded in period</span>
            </div>
          </div>
        </div>

        {/* Gross Margin KPI */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Net Balance & Margin</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(summary?.grossProfit || 0)}
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {summary?.marginPct || 0}% margin
            </span>
          </div>
        </div>
      </div>

      {/* Main Transactions Hub */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Records ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('SALES');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'SALES'
                  ? 'bg-lime-500 text-slate-950 font-black shadow-md shadow-lime-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Daily Sales</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('PURCHASE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'PURCHASE'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Daily Purchases</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search party, bill, note..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl pl-9 pr-3 py-1.5 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-lime-400 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Restroom Cubicles">Restroom Cubicles</option>
              <option value="Urinal Modesty Partitions">Urinal Modesty Partitions</option>
              <option value="Modular Lockers">Modular Lockers</option>
              <option value="Hardware & Fittings">Hardware & Fittings</option>
              <option value="Raw Materials / Boards">Raw Materials / Boards</option>
              <option value="General Store / Consumables">General Store / Consumables</option>
              <option value="Other Services">Other Services</option>
            </select>

            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Refresh Records"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pl-2">Date</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Reference / Bill #</th>
                <th className="pb-3">Customer / Vendor Party</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Mode</th>
                <th className="pb-3 text-right">Amount (₹)</th>
                <th className="pb-3 text-right">Total (₹)</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RotateCw className="w-4 h-4 animate-spin text-lime-400" />
                      <span>Loading daily sales & purchase records...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((item) => {
                  const partyName =
                    item.partyName ||
                    item.customer?.party?.tradeName ||
                    item.customer?.party?.legalName ||
                    item.vendor?.party?.tradeName ||
                    item.vendor?.party?.legalName ||
                    (item.type === 'SALES' ? 'Direct Customer' : 'Direct Supplier');

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-3 pl-2 whitespace-nowrap font-mono text-slate-300">
                        {formatDate(item.entryDate)}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.type === 'SALES'
                              ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.type === 'SALES' ? (
                            <Users className="w-3 h-3" />
                          ) : (
                            <Building2 className="w-3 h-3" />
                          )}
                          <span>{item.type}</span>
                        </span>
                      </td>
                      <td className="py-3 whitespace-nowrap font-mono font-medium text-slate-200">
                        {item.referenceNo || '—'}
                      </td>
                      <td className="py-3 font-semibold text-white max-w-[200px] truncate" title={partyName}>
                        {partyName}
                      </td>
                      <td className="py-3 text-slate-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 max-w-[220px] truncate" title={item.description || ''}>
                        {item.description || '—'}
                      </td>
                      <td className="py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {item.paymentMode || 'CASH'}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-300 whitespace-nowrap">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-3 text-right font-mono font-bold whitespace-nowrap">
                        <span className={item.type === 'SALES' ? 'text-lime-400' : 'text-amber-400'}>
                          {formatCurrency(item.totalAmount)}
                        </span>
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.paymentStatus === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {item.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="p-1 text-slate-400 hover:text-lime-400 rounded hover:bg-slate-800 transition-colors"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-slate-400">No daily entries found</p>
                      <p className="text-xs text-slate-500">
                        Use the buttons above to manually record daily sales with customer selection or daily purchases with vendor selection.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {currentPage} of {totalPages} ({totalCount} total entries)
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Entry Modal */}
      <AddEditDailySalesPurchaseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadData();
          triggerRefresh();
        }}
        initialType={modalInitialType}
        initialDate={selection.date}
        editItem={editingItem}
      />

      {/* Export Report Modal */}
      <AsyncReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

export default DailySalesPurchasePage;
