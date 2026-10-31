import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Receipt,
  CreditCard,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  FileSpreadsheet,
  Building2,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useReportingPeriod } from '../../context/ReportingPeriodContext';
import { ReportingPeriodBar } from '../../components/reporting/ReportingPeriodBar';
import { PeriodComparisonBadge } from '../../components/reporting/PeriodComparisonBadge';
import { AsyncReportExportModal } from '../../components/reporting/AsyncReportExportModal';
import { analyticsApi } from '../../api/analyticsApi';
import {
  DashboardAnalyticsResponse,
  TransactionLedgerItem,
  TransactionLedgerResponse,
} from '../../types/admin';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PIE_COLORS = ['#84cc16', '#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

export const EnterpriseAnalyticsPage: React.FC = () => {
  const { selection, resolvedPeriod, refreshCount, isRefreshing } = useReportingPeriod();

  const [analyticsData, setAnalyticsData] = useState<DashboardAnalyticsResponse | null>(null);
  const [ledgerData, setLedgerData] = useState<TransactionLedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Transaction Ledger Filters & Pagination
  const [ledgerType, setLedgerType] = useState<'ALL' | 'SALES' | 'PURCHASE' | 'PAYMENT'>('ALL');
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Fetch Dashboard Analytics whenever selected period changes
  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getDashboard({
        periodType: selection.type,
        date: selection.date,
        week: selection.week,
        month: selection.month,
        quarter: selection.quarter,
        quarterYear: selection.quarterYear,
        quarterType: selection.quarterType,
        halfYear: selection.halfYear,
        year: selection.year,
        financialYear: selection.financialYear || selection.halfYearFiscalYear,
        customStart: selection.customStart,
        customEnd: selection.customEnd,
        compareCustomStart: selection.compareCustomStart,
        compareCustomEnd: selection.compareCustomEnd,
        comparisonMode: selection.comparisonMode,
      });
      setAnalyticsData(data);
    } catch (err: any) {
      console.error('Failed to load analytics dashboard:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch analytics metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [selection]);

  // Fetch synchronized transaction ledger
  const loadLedger = useCallback(async () => {
    try {
      const data = await analyticsApi.getTransactions({
        startDate: resolvedPeriod.startDate,
        endDate: resolvedPeriod.endDate,
        type: ledgerType,
        page: ledgerPage,
        limit: 15,
      });
      setLedgerData(data);
    } catch (err) {
      console.error('Failed to load transaction ledger:', err);
    }
  }, [resolvedPeriod.startDate, resolvedPeriod.endDate, ledgerType, ledgerPage]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, refreshCount]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger, refreshCount]);

  const kpis = analyticsData?.kpis;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Enterprise Analytics & Reporting
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time financial performance, multi-period comparative analytics, and enterprise transaction intelligence.
          </p>
        </div>

        {/* Scalability & Timing Badges */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {analyticsData && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700/80 text-slate-300"
              title="Stateless server query & caching latency"
            >
              <Zap className="w-3.5 h-3.5 text-lime-400" />
              <span>Query: {analyticsData.serverTimingMs}ms</span>
              {analyticsData.cached && (
                <span className="px-1.5 py-0.2 rounded bg-lime-500/20 text-lime-300 text-[10px] font-bold">
                  CACHED
                </span>
              )}
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>P95 &lt; 2s Target</span>
          </span>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-lime-500 hover:bg-lime-400 text-slate-950 shadow-md shadow-lime-500/20 flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Centralized Global Reporting Period Controller */}
      <ReportingPeriodBar onOpenExportModal={() => setIsExportModalOpen(true)} />

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Synchronized KPI Cards with Mathematical Comparison Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Sales / Revenue */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Sales & Invoiced Revenue</span>
            <div className="p-2 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(kpis?.revenue?.current || 0)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <PeriodComparisonBadge comparison={kpis?.revenue} showPreviousValue />
          </div>
        </div>

        {/* KPI 2: Direct Procurement / POs */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Procurement & Purchases</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(kpis?.purchases?.current || 0)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <PeriodComparisonBadge comparison={kpis?.purchases} invertColors showPreviousValue />
          </div>
        </div>

        {/* KPI 3: Gross Profit & Margin % */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Gross Margin & Profit</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(kpis?.grossProfit?.current || 0)}
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {kpis?.marginPct || 0}% margin
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <PeriodComparisonBadge comparison={kpis?.grossProfit} showPreviousValue />
          </div>
        </div>

        {/* KPI 4: Collections & Payments */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Inward Collections</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(kpis?.collections?.current || 0)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <PeriodComparisonBadge comparison={kpis?.collections} showPreviousValue />
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Net Receivables</div>
            <div className="text-base font-bold text-amber-300 mt-0.5">
              {formatCurrency(kpis?.netReceivables || 0)}
            </div>
          </div>
          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
            Outstanding
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Net Payables</div>
            <div className="text-base font-bold text-rose-300 mt-0.5">
              {formatCurrency(kpis?.netPayables || 0)}
            </div>
          </div>
          <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
            Due Vendors
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Quotations Issued</div>
            <div className="text-base font-bold text-slate-200 mt-0.5">
              {kpis?.quotationsCount?.current || 0} quotes
            </div>
          </div>
          <PeriodComparisonBadge comparison={kpis?.quotationsCount} />
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Quote Win Rate</div>
            <div className="text-base font-bold text-lime-400 mt-0.5">
              {kpis?.quoteConversionPct || 0}%
            </div>
          </div>
          <span className="text-xs text-lime-400 bg-lime-500/10 px-2 py-1 rounded border border-lime-500/20">
            Conversion
          </span>
        </div>
      </div>

      {/* Main Visualizations: Revenue Trend & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Purchases Comparative Trend Area Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-lime-400" />
                <span>Financial Trend ({resolvedPeriod.label})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic time-series buckets: Revenue vs Purchases vs Gross Profit
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            {analyticsData?.charts?.revenueTrend && analyticsData.charts.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.charts.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#84cc16" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#84cc16" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorPurch" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    itemStyle={{ fontSize: 12 }}
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="revenue" name="Sales Revenue" stroke="#84cc16" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPurch)" />
                  <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No trend transactions recorded in this selected period.
              </div>
            )}
          </div>
        </div>

        {/* Product Category Breakdown Donut Chart (1 Column) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              <span>Category Distribution</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Product mix by revenue contribution</p>
          </div>

          <div className="h-56 w-full flex-1">
            {analyticsData?.charts?.categoryDistribution && analyticsData.charts.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.charts.categoryDistribution}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {analyticsData.charts.categoryDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    itemStyle={{ fontSize: 12 }}
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No category breakdown available for period.
              </div>
            )}
          </div>

          {/* Category List */}
          <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto pr-1">
            {analyticsData?.charts?.categoryDistribution?.map((cat, i) => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate max-w-[120px]">{cat.category}</span>
                </span>
                <span className="font-semibold text-slate-200">
                  {cat.percentage}% ({formatCurrency(cat.amount)})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Entities Section: Top 10 Customers & Top 10 Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 B2B Customers */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-lime-500/10 text-lime-400">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">Top 10 Clients by Invoiced Revenue</h3>
                <p className="text-xs text-slate-400">Ranked by proforma invoice volume in selected period</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-2.5 pl-1">#</th>
                  <th className="pb-2.5">Customer Name</th>
                  <th className="pb-2.5 text-right">Orders</th>
                  <th className="pb-2.5 text-right pr-1">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analyticsData?.topCustomers && analyticsData.topCustomers.length > 0 ? (
                  analyticsData.topCustomers.map((cust, idx) => (
                    <tr key={cust.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 pl-1 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 font-medium text-slate-200 max-w-[200px] truncate">
                        {cust.name}
                      </td>
                      <td className="py-2.5 text-right text-slate-400">{cust.ordersCount}</td>
                      <td className="py-2.5 text-right font-bold text-lime-400 pr-1">
                        {formatCurrency(cust.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No customer transactions in this reporting range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 10 Suppliers */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Building2 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">Top 10 Suppliers by Procurement Spend</h3>
                <p className="text-xs text-slate-400">Ranked by purchase order totals in selected period</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-2.5 pl-1">#</th>
                  <th className="pb-2.5">Supplier Name</th>
                  <th className="pb-2.5 text-right">POs</th>
                  <th className="pb-2.5 text-right pr-1">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analyticsData?.topSuppliers && analyticsData.topSuppliers.length > 0 ? (
                  analyticsData.topSuppliers.map((supp, idx) => (
                    <tr key={supp.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 pl-1 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 font-medium text-slate-200 max-w-[200px] truncate">
                        {supp.name}
                      </td>
                      <td className="py-2.5 text-right text-slate-400">{supp.ordersCount}</td>
                      <td className="py-2.5 text-right font-bold text-amber-400 pr-1">
                        {formatCurrency(supp.spend)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No supplier purchase orders in this reporting range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Synchronized Transaction Ledger Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-lime-400" />
              <span>Synchronized Transaction Ledger</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtered to exact period: {resolvedPeriod.startDateLocal} to {resolvedPeriod.endDateLocal}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {(['ALL', 'SALES', 'PURCHASE', 'PAYMENT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setLedgerType(t);
                  setLedgerPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  ledgerType === t
                    ? 'bg-lime-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                <th className="p-3 pl-4">Doc #</th>
                <th className="p-3">Type</th>
                <th className="p-3">Date</th>
                <th className="p-3">Party Name</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Tax (₹)</th>
                <th className="p-3 text-right pr-4">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ledgerData?.transactions && ledgerData.transactions.length > 0 ? (
                ledgerData.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 pl-4 font-mono font-semibold text-lime-400">{tx.docNumber}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          tx.type === 'SALES'
                            ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20'
                            : tx.type === 'PURCHASE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{formatDate(tx.date)}</td>
                    <td className="p-3 font-medium text-slate-200 max-w-[220px] truncate">{tx.partyName}</td>
                    <td className="p-3">
                      <span className="text-[11px] text-slate-400 font-medium">{tx.status}</span>
                    </td>
                    <td className="p-3 text-right text-slate-400">{formatCurrency(tx.taxAmount)}</td>
                    <td className="p-3 text-right font-bold text-white pr-4">
                      {formatCurrency(tx.grandTotal)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No transactions found for the selected period filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Pagination */}
        {ledgerData?.pagination && ledgerData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Showing {((ledgerPage - 1) * ledgerData.pagination.limit) + 1} to{' '}
              {Math.min(ledgerPage * ledgerData.pagination.limit, ledgerData.pagination.total)} of{' '}
              {ledgerData.pagination.total} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={ledgerPage <= 1}
                onClick={() => setLedgerPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-200">
                Page {ledgerPage} of {ledgerData.pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={ledgerPage >= ledgerData.pagination.totalPages}
                onClick={() => setLedgerPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Asynchronous Export Report Modal */}
      <AsyncReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
export default EnterpriseAnalyticsPage;
