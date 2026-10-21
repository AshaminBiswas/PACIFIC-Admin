import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Coins,
  LayoutDashboard,
  Receipt,
  Wallet,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  FolderTree,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Trash2,
  Edit2,
  Eye,
  FileText,
  Upload,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Printer,
  FileSpreadsheet,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Layers,
  CheckSquare,
  Square,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { upApi } from "../../api/upApi";
import { UPPresentationModal } from "./components/UPPresentationModal";
import { AddEditExpenseModal } from "./components/AddEditExpenseModal";
import { ExpenseDetailModal } from "./components/ExpenseDetailModal";
import { ReconcileCashModal } from "./components/ReconcileCashModal";
import { CategoryManagerModal } from "./components/CategoryManagerModal";
import type {
  UPExpense,
  UPCategory,
  UPCashDay,
  UPDashboardData,
  CreateUpExpenseInput,
} from "../../types/admin";

type UPTab = "ledger" | "analytics" | "cash" | "categories";
type DateFilterPreset = "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "all" | "custom";

const formatInr = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return "0";
  return Number(val).toLocaleString("en-IN");
};

export default function UPExpensesPage() {
  const { user } = useAdminAuth();

  // ─── Super Admin Access Verification ─────────────────────────────────────────
  const isSuperAdmin = useMemo(() => {
    const roleClean = (user?.role || "").toUpperCase().replace(/[-_]/g, "");
    return roleClean === "SUPERADMIN";
  }, [user]);

  // ─── Core UI States ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<UPTab>("ledger");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Data States ─────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<UPExpense[]>([]);
  const [categories, setCategories] = useState<UPCategory[]>([]);
  const [dashboardData, setDashboardData] = useState<UPDashboardData | null>(null);
  const [cashDays, setCashDays] = useState<UPCashDay[]>([]);
  const [cashToday, setCashToday] = useState<UPCashDay | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    totalAmount: 0,
  });

  // ─── Filter States ───────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>("");
  const [selectedVerified, setSelectedVerified] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // ─── Multi-Select Bulk Actions ───────────────────────────────────────────────
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);

  // ─── Modals State ────────────────────────────────────────────────────────────
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<UPExpense | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<UPExpense | null>(null);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);

  // ─── Calculate Date Bounds from Preset ───────────────────────────────────────
  const computePresetDates = useCallback((preset: DateFilterPreset) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      return { start: todayStr, end: todayStr };
    }
    if (preset === "yesterday") {
      const yDate = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      return { start: yDate, end: yDate };
    }
    if (preset === "this_week") {
      const day = now.getDay() || 7; // Monday = 1
      const mon = new Date(now);
      mon.setDate(now.getDate() - day + 1);
      return { start: mon.toISOString().split("T")[0], end: todayStr };
    }
    if (preset === "this_month") {
      const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split("T")[0];
      const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().split("T")[0];
      return { start, end };
    }
    if (preset === "last_month") {
      const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1)).toISOString().split("T")[0];
      const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0)).toISOString().split("T")[0];
      return { start, end };
    }
    return { start: "", end: "" };
  }, []);

  // ─── Fetch Categories ────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const res = await upApi.listCategories(true);
      setCategories(res.data || []);
    } catch (err: any) {
      console.warn("Error fetching categories:", err);
    }
  }, []);

  // ─── Fetch Expenses ──────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async (pageToLoad = 1) => {
    try {
      setIsLoading(true);
      let sDate = startDate;
      let eDate = endDate;

      if (datePreset !== "custom" && datePreset !== "all") {
        const computed = computePresetDates(datePreset);
        sDate = computed.start;
        eDate = computed.end;
      }

      const res = await upApi.getExpenses({
        page: pageToLoad,
        limit: 50,
        startDate: sDate || undefined,
        endDate: eDate || undefined,
        categoryId: selectedCategory || undefined,
        paymentMode: selectedPaymentMode || undefined,
        verified: selectedVerified !== "all" ? selectedVerified : undefined,
        search: searchQuery.trim() || undefined,
      });

      const data = res.data;
      setExpenses(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 1, totalAmount: 0 });
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load UP daily expenses");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, datePreset, selectedCategory, selectedPaymentMode, selectedVerified, searchQuery, computePresetDates]);

  // ─── Fetch Analytics Dashboard ───────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      let rangeType = "month";
      let sDate = startDate;
      let eDate = endDate;

      if (datePreset === "today") {
        rangeType = "today";
      } else if (datePreset === "custom" && startDate && endDate) {
        rangeType = "custom";
      }

      const res = await upApi.getDashboard(rangeType, sDate || undefined, eDate || undefined);
      setDashboardData(res.data || null);
    } catch (err: any) {
      console.warn("Failed to load dashboard metrics:", err);
    }
  }, [datePreset, startDate, endDate]);

  // ─── Fetch Cash Status ───────────────────────────────────────────────────────
  const fetchCashData = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const [todayRes, listRes] = await Promise.all([
        upApi.getCashStatus(todayStr),
        upApi.listCashDays(30),
      ]);
      setCashToday(todayRes.data || null);
      setCashDays(listRes.data || []);
    } catch (err: any) {
      console.warn("Failed to load cash reconciliation:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isSuperAdmin) {
      fetchCategories();
      fetchExpenses(1);
      fetchDashboard();
      fetchCashData();
    }
  }, [isSuperAdmin, fetchCategories, fetchExpenses, fetchDashboard, fetchCashData]);

  // Feedback toast timer
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 3500);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setErrorMessage(null);
    await Promise.all([fetchExpenses(pagination.page), fetchDashboard(), fetchCashData()]);
    setSuccessMessage("Refreshed latest UP expense records");
  };

  const handleCreateOrUpdate = async (input: CreateUpExpenseInput) => {
    if (expenseToEdit) {
      await upApi.updateExpense(expenseToEdit.id, input);
      setSuccessMessage("Expense updated successfully");
    } else {
      await upApi.createExpense(input);
      setSuccessMessage("Expense recorded successfully");
    }
    setExpenseToEdit(null);
    fetchExpenses(1);
    fetchDashboard();
    fetchCashData();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await upApi.deleteExpense(id);
      setSuccessMessage("Expense deleted successfully");
      fetchExpenses(pagination.page);
      fetchDashboard();
      fetchCashData();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to delete expense");
    }
  };

  const handleToggleVerify = async (id: string, currentStatus: boolean) => {
    try {
      await upApi.verifyExpense(id, !currentStatus);
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, verified: !currentStatus } : e))
      );
      if (selectedExpense && selectedExpense.id === id) {
        setSelectedExpense((prev) => (prev ? { ...prev, verified: !currentStatus } : null));
      }
      setSuccessMessage(!currentStatus ? "Expense verified" : "Expense marked pending");
      fetchDashboard();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to toggle verification");
    }
  };

  const handleBulkVerify = async (verifyStatus: boolean) => {
    if (selectedExpenseIds.length === 0) return;
    try {
      setIsBulkVerifying(true);
      await upApi.bulkVerifyExpenses(selectedExpenseIds, verifyStatus);
      setSuccessMessage(
        `Bulk ${verifyStatus ? "verified" : "unverified"} ${selectedExpenseIds.length} expenses`
      );
      setSelectedExpenseIds([]);
      fetchExpenses(pagination.page);
      fetchDashboard();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to bulk verify");
    } finally {
      setIsBulkVerifying(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      let sDate = startDate;
      let eDate = endDate;
      if (datePreset !== "custom" && datePreset !== "all") {
        const computed = computePresetDates(datePreset);
        sDate = computed.start;
        eDate = computed.end;
      }
      await upApi.exportReport({
        startDate: sDate || undefined,
        endDate: eDate || undefined,
        categoryId: selectedCategory || undefined,
        paymentMode: selectedPaymentMode || undefined,
        verified: selectedVerified !== "all" ? selectedVerified : undefined,
        search: searchQuery.trim() || undefined,
      });
      setSuccessMessage("Export completed. Downloading Excel file...");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to export Excel report");
    }
  };

  // ─── Super Admin Access Guard ────────────────────────────────────────────────
  if (!isSuperAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#030213] border border-red-500/30 rounded-2xl p-6 lg:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">403 — Super Admin Only</h2>
          <p className="text-sm text-gray-400 mt-2">
            The UP Daily Cash Expense module is strictly classified and restricted to Super Admin
            credentials.
          </p>
          <div className="mt-6">
            <button
              onClick={() => window.history.back()}
              className="py-2.5 px-6 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-20 lg:pb-8">
      {/* Toast Notification Banner */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-[#030213] border-2 border-[#7FB706] text-white shadow-2xl shadow-[#7FB706]/30 flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#B5F823] shrink-0" />
          <span className="text-xs font-bold">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-[#030213] border-2 border-red-500 text-white shadow-2xl shadow-red-500/30 flex items-center gap-3 animate-in slide-in-from-top-4">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-xs font-bold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 text-gray-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Top Bar: Title, Super Admin Badge, Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              UP Daily Expense
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/30 uppercase tracking-widest">
                Super Admin Only
              </span>
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Petty Cash Ledger, Vouchers, Reconciliation &amp; Factory Spending Audit
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPresentationModalOpen(true)}
            className="py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition border border-white/10 text-xs font-bold flex items-center gap-1.5 min-h-[44px]"
            title="Executive Presentation View"
          >
            <Sparkles className="w-4 h-4 text-[#B5F823]" />
            <span className="hidden sm:inline">Executive Review</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition border border-white/10 text-xs font-bold flex items-center gap-1.5 min-h-[44px]"
            title="Export Excel Ledger"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          <button
            onClick={() => {
              setExpenseToEdit(null);
              setIsAddEditModalOpen(true);
            }}
            className="py-2.5 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-black text-xs transition shadow-lg shadow-[#7FB706]/20 flex items-center gap-1.5 min-h-[44px] active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Today Spend */}
        <div className="bg-[#030213] border border-white/10 rounded-2xl p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Today's Total</span>
            <Coins className="w-4 h-4 text-[#7FB706]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-2">
            ₹{formatInr(dashboardData?.kpis?.todayTotal || 0)}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">Live Daily Spend</span>
        </div>

        {/* Card 2: Filter Range Total */}
        <div className="bg-[#030213] border border-white/10 rounded-2xl p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Period Total</span>
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-2">
            ₹{formatInr(pagination.totalAmount || dashboardData?.kpis?.rangeTotal || 0)}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            {pagination.total} Transactions recorded
          </span>
        </div>

        {/* Card 3: Pending Verification */}
        <div className="bg-[#030213] border border-amber-500/20 rounded-2xl p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-2">
            ₹{formatInr(dashboardData?.kpis?.unverifiedTotal || 0)}
          </div>
          <span className="text-[10px] text-amber-300/70 mt-1 block">Awaiting Super Admin Sign</span>
        </div>

        {/* Card 4: Petty Cash Status */}
        <div
          onClick={() => setIsReconcileModalOpen(true)}
          className="bg-[#030213] border border-white/10 hover:border-[#7FB706]/40 rounded-2xl p-4 cursor-pointer transition relative overflow-hidden group"
        >
          <div className="flex items-center justify-between text-gray-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Petty Cash Float</span>
            <Wallet className="w-4 h-4 text-[#B5F823]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono mt-2">
            ₹{formatInr(cashToday?.expectedClosingBalance ?? cashToday?.openingBalance ?? 0)}
          </div>
          <span className="text-[10px] text-[#7FB706] font-semibold mt-1 flex items-center gap-1">
            Tap to Reconcile Cash &rarr;
          </span>
        </div>
      </div>

      {/* Segmented Mobile / Desktop Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2">
          {(
            [
              { key: "ledger", label: "Ledger", icon: Receipt },
              { key: "analytics", label: "Analytics & Trends", icon: BarChart3 },
              { key: "cash", label: "Daily Cash Float", icon: Wallet },
              { key: "categories", label: "Categories", icon: FolderTree },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition whitespace-nowrap min-h-[44px] ${
                  active
                    ? "bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === "categories" && (
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition border border-white/10 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Master</span>
          </button>
        )}
      </div>

      {/* ─── TAB 1: LEDGER ──────────────────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {/* Filter Bar: Presets & Live Search */}
          <div className="bg-[#030213] border border-white/10 rounded-2xl p-4 space-y-3">
            {/* 1-Tap Date Preset Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {(
                [
                  { key: "all", label: "All Records" },
                  { key: "today", label: "Today" },
                  { key: "yesterday", label: "Yesterday" },
                  { key: "this_week", label: "This Week" },
                  { key: "this_month", label: "This Month" },
                  { key: "last_month", label: "Last Month" },
                  { key: "custom", label: "Custom Dates" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => {
                    setDatePreset(preset.key);
                    if (preset.key !== "custom") {
                      const d = computePresetDates(preset.key);
                      setStartDate(d.start);
                      setEndDate(d.end);
                    }
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap min-h-[38px] ${
                    datePreset === preset.key
                      ? "bg-[#7FB706] text-black shadow-md"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers (if Custom Selected) */}
            {datePreset === "custom" && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white"
                />
                <button
                  onClick={() => fetchExpenses(1)}
                  className="py-1.5 px-3 rounded-xl bg-[#7FB706]/20 text-[#B5F823] font-bold text-xs"
                >
                  Apply
                </button>
              </div>
            )}

            {/* Search Input & Secondary Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
              {/* Search input */}
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vendor, note, recipient..."
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/15 focus:border-[#7FB706] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none transition min-h-[42px]"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-[#07061d] border border-white/15 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none transition min-h-[42px]"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Verified Filter */}
              <select
                value={selectedVerified}
                onChange={(e) => setSelectedVerified(e.target.value)}
                className="px-3 py-2 bg-[#07061d] border border-white/15 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none transition min-h-[42px]"
              >
                <option value="all">All Verification</option>
                <option value="true">Verified Only</option>
                <option value="false">Pending Only</option>
              </select>
            </div>
          </div>

          {/* Bulk Selection Bar (Shows when records selected) */}
          {selectedExpenseIds.length > 0 && (
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-[#7FB706]/40 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
              <span className="font-bold text-white">
                {selectedExpenseIds.length} expense(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkVerify(true)}
                  disabled={isBulkVerifying}
                  className="py-1.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40"
                >
                  Verify Selected
                </button>
                <button
                  onClick={() => handleBulkVerify(false)}
                  disabled={isBulkVerifying}
                  className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40"
                >
                  Mark Pending
                </button>
                <button
                  onClick={() => setSelectedExpenseIds([])}
                  className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* List Content: Responsive Table on Desktop, Cards on Mobile */}
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400 animate-pulse font-medium">
                Loading UP daily expenses...
              </p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-[#030213] border border-white/10 space-y-3">
              <Coins className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Expense Records Found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No expense entries match your selected date range or category filters.
              </p>
              <button
                onClick={() => {
                  setDatePreset("all");
                  setSelectedCategory("");
                  setSelectedVerified("all");
                  setSearchQuery("");
                }}
                className="py-2 px-4 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              {/* MOBILE CARDS VIEW (< md) */}
              <div className="md:hidden space-y-3">
                {expenses.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#030213] border border-white/10 space-y-3 shadow-lg active:border-[#7FB706]/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                            {item.categoryName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {item.expenseDate}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white mt-1">{item.paidTo}</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-[#B5F823] font-mono">
                          ₹{formatInr(item.amount)}
                        </div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block mt-0.5">
                          {item.paymentMode || "Cash"}
                        </span>
                      </div>
                    </div>

                    {item.note && (
                      <p className="text-xs text-gray-300 line-clamp-2 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                        {item.note}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                      {/* Verify toggle badge */}
                      <button
                        onClick={() => handleToggleVerify(item.id, item.verified)}
                        className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition ${
                          item.verified
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{item.verified ? "Verified" : "Pending"}</span>
                      </button>

                      {/* Card actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedExpense(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 min-h-[38px] min-w-[38px] flex items-center justify-center"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setExpenseToEdit(item);
                            setIsAddEditModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 min-h-[38px] min-w-[38px] flex items-center justify-center"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(item.id)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 min-h-[38px] min-w-[38px] flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (>= md) */}
              <div className="hidden md:block overflow-hidden rounded-2xl bg-[#030213] border border-white/10 shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            expenses.length > 0 &&
                            selectedExpenseIds.length === expenses.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExpenseIds(expenses.map((i) => i.id));
                            } else {
                              setSelectedExpenseIds([]);
                            }
                          }}
                          className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                        />
                      </th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Paid To / Vendor</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5 text-right">Amount (₹)</th>
                      <th className="p-3.5">Mode</th>
                      <th className="p-3.5">Note</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {expenses.map((item) => {
                      const isSelected = selectedExpenseIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-white/[0.02] transition ${
                            isSelected ? "bg-[#7FB706]/5" : ""
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedExpenseIds((prev) => [...prev, item.id]);
                                } else {
                                  setSelectedExpenseIds((prev) =>
                                    prev.filter((id) => id !== item.id)
                                  );
                                }
                              }}
                              className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3.5 text-gray-300 font-mono whitespace-nowrap">
                            {item.expenseDate}
                          </td>
                          <td className="p-3.5 font-bold text-white max-w-[180px] truncate">
                            {item.paidTo}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300 text-[10px] font-semibold whitespace-nowrap">
                              {item.categoryName}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-black text-white font-mono text-sm whitespace-nowrap">
                            ₹{formatInr(item.amount)}
                          </td>
                          <td className="p-3.5 uppercase text-gray-400 font-semibold text-[11px]">
                            {item.paymentMode || "Cash"}
                          </td>
                          <td className="p-3.5 text-gray-400 max-w-[200px] truncate" title={item.note || undefined}>
                            {item.note || "—"}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleToggleVerify(item.id, item.verified)}
                              className={`py-1 px-2.5 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 transition ${
                                item.verified
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>{item.verified ? "Verified" : "Pending"}</span>
                            </button>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedExpense(item);
                                  setIsDetailModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                                title="View details & audit"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setExpenseToEdit(item);
                                  setIsAddEditModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(item.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#030213] border border-white/10 text-xs">
                  <span className="text-gray-400">
                    Page <strong className="text-white">{pagination.page}</strong> of{" "}
                    <strong className="text-white">{pagination.totalPages}</strong> ({pagination.total} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={pagination.page <= 1}
                      onClick={() => fetchExpenses(pagination.page - 1)}
                      className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white font-bold transition flex items-center gap-1 min-h-[38px]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev</span>
                    </button>
                    <button
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchExpenses(pagination.page + 1)}
                      className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white font-bold transition flex items-center gap-1 min-h-[38px]"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: ANALYTICS & TRENDS ──────────────────────────────────────────── */}
      {activeTab === "analytics" && dashboardData && (
        <div className="space-y-6">
          {/* Trend Chart */}
          <div className="bg-[#030213] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#7FB706]" />
                  Spending Velocity Timeline
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Daily expenditure cadence for active range
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#B5F823]">
                Daily Avg: ₹{formatInr(dashboardData.kpis.averageDailyExpense)}
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.trend}>
                  <defs>
                    <linearGradient id="areaGradientPg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7FB706" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7FB706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v}`} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#030213", borderColor: "#7FB706", borderRadius: 12 }}
                    formatter={(val: any) => [`₹${formatInr(val)}`, "Expense"]}
                  />
                  <Area type="monotone" dataKey="total" stroke="#7FB706" strokeWidth={2.5} fill="url(#areaGradientPg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2-Columns: Category Distribution & Top Expenditures */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-[#030213] border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#B5F823]" />
                Category Distribution ({dashboardData.categoryBreakdown.length})
              </h3>
              <div className="space-y-3">
                {dashboardData.categoryBreakdown.map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-200">{cat.name}</span>
                      <span className="font-bold text-white font-mono">
                        ₹{formatInr(cat.total)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#7FB706] to-[#B5F823] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Expenditures */}
            <div className="bg-[#030213] border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
                Top Expenditure Records
              </h3>
              <div className="space-y-2">
                {dashboardData.topExpenses.map((exp, idx) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-gray-500 w-5">#{idx + 1}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{exp.paidTo}</div>
                        <div className="text-[10px] text-gray-400">
                          {exp.categoryName} &bull; {exp.expenseDate}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-white font-mono">₹{formatInr(exp.amount)}</div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          exp.verified ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {exp.verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: DAILY CASH RECONCILIATION ────────────────────────────────────── */}
      {activeTab === "cash" && (
        <div className="space-y-5">
          {/* Hero Cash Day Reconcile Trigger */}
          <div className="bg-[#030213] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-400" />
                  Today's Petty Cash Float
                </h3>
                {cashToday?.closed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Locked &amp; Closed
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Opening Balance + Received - Cash Expenses = Expected Cash in Hand
              </p>
            </div>

            <button
              onClick={() => setIsReconcileModalOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-black text-xs transition shadow-lg shadow-[#7FB706]/20 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Reconcile Today's Cash</span>
            </button>
          </div>

          {/* Past 30 Days Cash Float Ledger */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Daily Cash Settlement History</h3>
            <div className="overflow-hidden rounded-2xl bg-[#030213] border border-white/10 shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-3.5">Cash Date</th>
                    <th className="p-3.5 text-right">Opening</th>
                    <th className="p-3.5 text-right">Cash Spent</th>
                    <th className="p-3.5 text-right">Expected Closing</th>
                    <th className="p-3.5 text-right">Actual Count</th>
                    <th className="p-3.5 text-right">Difference</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {cashDays.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500 italic">
                        No previous cash days closed yet
                      </td>
                    </tr>
                  ) : (
                    cashDays.map((cd) => (
                      <tr key={cd.id || cd.cashDate} className="hover:bg-white/[0.02] transition">
                        <td className="p-3.5 text-gray-300 font-bold">{cd.cashDate}</td>
                        <td className="p-3.5 text-right text-gray-300">₹{formatInr(cd.openingBalance)}</td>
                        <td className="p-3.5 text-right text-red-400">-₹{formatInr(cd.cashExpenses)}</td>
                        <td className="p-3.5 text-right text-white font-bold">₹{formatInr(cd.expectedClosingBalance)}</td>
                        <td className="p-3.5 text-right text-emerald-400 font-bold">
                          {cd.actualClosing !== null ? `₹${formatInr(cd.actualClosing)}` : "—"}
                        </td>
                        <td className="p-3.5 text-right">
                          {cd.difference !== null ? (
                            <span
                              className={`font-bold ${
                                Math.abs(cd.difference) < 0.01
                                  ? "text-emerald-400"
                                  : cd.difference > 0
                                  ? "text-blue-400"
                                  : "text-red-400"
                              }`}
                            >
                              {cd.difference > 0 ? "+" : ""}₹{formatInr(cd.difference)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cd.closed
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {cd.closed ? "Locked" : "Open"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: CATEGORIES ─────────────────────────────────────────────────── */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Configured Expense Categories</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Categories define spending classifications for factory and logistics
              </p>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-black text-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add / Manage</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-[#030213] border border-white/10 flex items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823]">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{c.name}</h4>
                    <span className="text-[10px] text-gray-400 block font-mono">
                      Sort: {c.sortOrder || 0} &bull; {c.expenseCount ?? 0} Transactions
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    c.active
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                  }`}
                >
                  {c.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) on Mobile Screens (< lg) */}
      <button
        onClick={() => {
          setExpenseToEdit(null);
          setIsAddEditModalOpen(true);
        }}
        className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] text-black shadow-2xl shadow-[#7FB706]/50 flex items-center justify-center active:scale-95 transition-transform border border-white/20"
        title="Record Expense"
        aria-label="Record Expense"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>

      {/* ─── MODALS ────────────────────────────────────────────────────────────── */}
      {/* 1. Add / Edit Expense Modal */}
      <AddEditExpenseModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSubmit={handleCreateOrUpdate}
        categories={categories.filter((c) => c.active)}
        expenseToEdit={expenseToEdit}
      />

      {/* 2. Expense Detail & Audit History Modal */}
      <ExpenseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense}
        onEdit={(exp) => {
          setExpenseToEdit(exp);
          setIsAddEditModalOpen(true);
        }}
        onDelete={handleDeleteExpense}
        onToggleVerify={handleToggleVerify}
      />

      {/* 3. Reconcile Cash Modal */}
      <ReconcileCashModal
        isOpen={isReconcileModalOpen}
        onClose={() => setIsReconcileModalOpen(false)}
        onSuccess={() => {
          setSuccessMessage("Cash reconciliation updated successfully");
          fetchCashData();
        }}
        selectedDate={new Date().toISOString().split("T")[0]}
      />

      {/* 4. Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onRefresh={fetchCategories}
      />

      {/* 5. Executive Presentation Modal */}
      <UPPresentationModal
        isOpen={isPresentationModalOpen}
        onClose={() => setIsPresentationModalOpen(false)}
        dashboardData={dashboardData}
        periodLabel={datePreset.replace(/_/g, " ").toUpperCase()}
        adminName={user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "Super Admin"}
        onExportExcel={handleExportExcel}
      />
    </div>
  );
}
