import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Wallet,
  Receipt,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Calendar,
  Building2,
  Filter,
  Download,
  FileSpreadsheet,
  Lock,
  Clock,
  Search,
  Trash2,
  Edit3,
  Camera,
  UploadCloud,
  Check,
  X,
  User,
  Tag,
  ShieldCheck,
  WifiOff,
  Wifi,
  PieChart as PieIcon,
  BarChart3,
  Coins,
  FileText,
  AlertCircle,
  Info,
  BookOpen,
  ExternalLink,
  ArrowRight,
  IndianRupee,
  Printer,
  Upload,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  expensesApi,
  getOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
  getCachedBranches,
  getCachedCategories,
  OfflineQueuedExpense,
} from '../../api/expensesApi';
import type {
  ExpenseEntry,
  ExpenseCategory,
  ExpenseDailyLedger,
  ExpenseFloatTopUp,
  BranchCashBalanceInfo,
  MultiBranchSummaryInfo,
  ExpenseRollupAnalytics,
} from '../../types/admin';

// ─── Formatters & Constants ──────────────────────────────────────────────────

function formatRupee(paise: number = 0): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr?: string, monthFormat: 'short' | 'long' = 'short'): string {
  if (!dateStr) return '-';
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: monthFormat, year: 'numeric' });
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime())
    ? '-'
    : fallback.toLocaleDateString('en-IN', { day: '2-digit', month: monthFormat, year: 'numeric' });
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];
const QUICK_NOTES = [
  'Tea & Refreshments',
  'Local Auto / Taxi Fare',
  'Office Stationery / Printing',
  'Courier / Parcel Dispatch',
  'Hardware Consumables',
  'Site Minor Repairs',
  'Cleaning & Sanitation',
];

const PIE_COLORS = ['#7FB706', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316'];

export function ExpensesPage() {
  const { adminUser } = useAdminAuth();
  const rawRole = adminUser?.role as any;
  const roleSlug = String(
    (adminUser as any)?.roleSlug ||
    (typeof rawRole === 'object' && rawRole !== null ? rawRole.slug ?? rawRole.name ?? '' : rawRole ?? '')
  ).toLowerCase();
  const isSuperAdmin = roleSlug.includes('super') || (adminUser as any)?.isSuperAdmin === true;
  const canApprove = isSuperAdmin || roleSlug === 'admin' || roleSlug === 'manager' || roleSlug === 'accountant';

  // ─── Core State ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'entry' | 'ledger' | 'float' | 'approvals' | 'reconciliation' | 'categories' | 'reports'>('entry');
  const [lastLoggedExpense, setLastLoggedExpense] = useState<ExpenseEntry | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>(() => {
    return getCachedBranches();
  });
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    const saved = localStorage.getItem('prc_last_expense_branch_id');
    const cached = getCachedBranches();
    if (saved && cached.some((b) => b.id === saved)) return saved;
    const kol = cached.find((b) => b.id === 'branch-kolkata' || b.code?.toUpperCase().includes('KOL')) || cached[0];
    return kol?.id || 'branch-kolkata';
  });
  const [isAllBranches, setIsAllBranches] = useState<boolean>(() => {
    return localStorage.getItem('prc_last_expense_is_all') === 'true';
  });

  // Custom Branch Creation Modal State
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [newBranchData, setNewBranchData] = useState({
    name: '',
    code: '',
    city: '',
    state: '',
    address: '',
    phone: '',
    contactPerson: '',
    openingBalance: 0,
  });
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [branchSaveError, setBranchSaveError] = useState<string | null>(null);

  // Live balance & summary
  const [liveBalance, setLiveBalance] = useState<BranchCashBalanceInfo | null>(() => {
    try {
      const raw = localStorage.getItem('prc_cached_live_balance');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [multiSummary, setMultiSummary] = useState<MultiBranchSummaryInfo | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Categories master
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => {
    return getCachedCategories();
  });
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Today entries stream (for Tab 1)
  const [todayEntries, setTodayEntries] = useState<ExpenseEntry[]>(() => {
    try {
      const raw = localStorage.getItem('prc_cached_today_entries');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingToday, setIsLoadingToday] = useState(false);

  // Approval queue (for Tab 3)
  const [pendingEntries, setPendingEntries] = useState<ExpenseEntry[]>([]);
  const [approvalsBranchFilter, setApprovalsBranchFilter] = useState<string>('ALL');
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [selectedRejectEntry, setSelectedRejectEntry] = useState<ExpenseEntry | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Daily Reconciliation (for Tab 3)
  const [reconcileDate, setReconcileDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reconcileLedger, setReconcileLedger] = useState<ExpenseDailyLedger | null>(null);
  const [physicalCashInput, setPhysicalCashInput] = useState<string>('');
  const [reconcileNotes, setReconcileNotes] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [todayTopUps, setTodayTopUps] = useState<ExpenseFloatTopUp[]>([]);

  // Float Top-Up Modal & State
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpTargetBranchId, setTopUpTargetBranchId] = useState<string>('');
  const [topUpDate, setTopUpDate] = useState<string>(getTodayDateString);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpSource, setTopUpSource] = useState('Cash from Bank');
  const [topUpRef, setTopUpRef] = useState('');
  const [topUpNotes, setTopUpNotes] = useState('');
  const [topUpReceiptUrl, setTopUpReceiptUrl] = useState<string | null>(null);
  const [topUpSlipName, setTopUpSlipName] = useState<string | null>(null);
  const [isUploadingTopUpSlip, setIsUploadingTopUpSlip] = useState(false);
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

  // Float History & Dedicated Float Tab Filtering
  const [floatHistory, setFloatHistory] = useState<any[]>([]);
  const [isLoadingFloatHistory, setIsLoadingFloatHistory] = useState(false);
  const [deleteFloatEntry, setDeleteFloatEntry] = useState<any | null>(null);
  const [isDeletingFloat, setIsDeletingFloat] = useState(false);
  const [floatFilterBranch, setFloatFilterBranch] = useState<string>('ALL');
  const [floatSearchQuery, setFloatSearchQuery] = useState<string>('');

  // Reports & Analytics (for Tab 5)
  const [analytics, setAnalytics] = useState<ExpenseRollupAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportStartDate, setReportStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportBranchId, setReportBranchId] = useState<string>('branch-kolkata');
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  // Ledger Filter Tab in Reports
  const [ledgerEntries, setLedgerEntries] = useState<ExpenseEntry[]>([]);
  const [ledgerCursor, setLedgerCursor] = useState<string | null>(null);
  const [ledgerHasMore, setLedgerHasMore] = useState(false);
  const [ledgerFilterBranch, setLedgerFilterBranch] = useState<string>('ALL');
  const [ledgerFilterCategory, setLedgerFilterCategory] = useState('');
  const [ledgerFilterStatus, setLedgerFilterStatus] = useState('ALL');
  const [ledgerFilterSearch, setLedgerFilterSearch] = useState('');
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Receipt Preview Modal (Image, PDF & Official Voucher)
  const [previewReceipt, setPreviewReceipt] = useState<{
    isOpen: boolean;
    url: string;
    entry?: ExpenseEntry | null;
    floatRecord?: ExpenseFloatTopUp | null;
  }>({ isOpen: false, url: '', entry: null, floatRecord: null });

  // Offline queue
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueuedExpense[]>([]);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  // Category Modal (Tab 4)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catBudget, setCatBudget] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Fast Entry Form State (Tab 1)
  const [entryDate, setEntryDate] = useState<string>(getTodayDateString);
  const [entryBranchId, setEntryBranchId] = useState<string>('');
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryCategory, setEntryCategory] = useState<string>(() => {
    return localStorage.getItem('prc_last_expense_category') || '';
  });
  const [entryPaymentMode, setEntryPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [entryDescription, setEntryDescription] = useState<string>('');
  const [entryPaidTo, setEntryPaidTo] = useState<string>('');
  const [entryPaidBy, setEntryPaidBy] = useState<string>('');
  const [entryReceiptUrl, setEntryReceiptUrl] = useState<string>('');
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [uploadedSlipName, setUploadedSlipName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [entrySuccessMsg, setEntrySuccessMsg] = useState<string | null>(null);
  const [entryWarningMsg, setEntryWarningMsg] = useState<string | null>(null);

  // Edit Expense Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);
  const [editDate, setEditDate] = useState<string>(getTodayDateString);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [editDescription, setEditDescription] = useState('');
  const [editPaidTo, setEditPaidTo] = useState('');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editReceiptUrl, setEditReceiptUrl] = useState('');
  const [editSlipName, setEditSlipName] = useState<string | null>(null);
  const [isUploadingEditSlip, setIsUploadingEditSlip] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editChangeReason, setEditChangeReason] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Expense Modal State (Super Admin Only)
  const [deleteModalEntry, setDeleteModalEntry] = useState<ExpenseEntry | null>(null);
  const [deleteReasonText, setDeleteReasonText] = useState('');
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);

  // Void confirmation modal
  const [voidModalEntry, setVoidModalEntry] = useState<ExpenseEntry | null>(null);
  const [voidReasonText, setVoidReasonText] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Approve/Reject in-flight tracking (shows loading state per entry button)
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // ─── Network & Offline Event Listeners ───────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshOfflineQueue();
      const currentQueue = getOfflineQueue();
      if (currentQueue.length > 0) {
        expensesApi.syncOfflineQueue().then((res) => {
          if (res.syncedCount > 0) {
            refreshOfflineQueue();
            fetchBalance();
            fetchTodayEntries();
            if (activeTab === 'ledger') fetchLedgerEntries(true);
          }
        }).catch((e) => console.warn('[Auto-sync] Reconnect sync deferred:', e));
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshOfflineQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshOfflineQueue = () => {
    setOfflineQueue(getOfflineQueue());
  };

  // ─── Initial Load: Branches & Categories in Parallel ───────────────────────
  useEffect(() => {
    async function loadInit() {
      try {
        const [rawBranches, rawCats] = await Promise.all([
          expensesApi.getBranches().catch(() => []),
          expensesApi.getCategories().catch(() => []),
        ]);

        const bList = Array.isArray(rawBranches) ? rawBranches : [];
        if (bList.length > 0) {
          setBranches(bList);
          const savedBranchId = localStorage.getItem('prc_last_expense_branch_id');
          const matchedBranch = savedBranchId && bList.find((b) => b.id === savedBranchId);
          const kol = matchedBranch || bList.find((b) => b.id === 'branch-kolkata' || b.code?.toUpperCase().includes('KOL')) || bList[0];
          setSelectedBranchId((prev) => prev || kol?.id || 'branch-kolkata');
          setEntryBranchId((prev) => prev || kol?.id || 'branch-kolkata');
        }

        const cList = Array.isArray(rawCats) ? rawCats : [];
        if (cList.length > 0) {
          setCategories(cList);
          if (!entryCategory) {
            setEntryCategory(cList[0].id);
          }
        }
      } catch (err) {
        console.warn('[Expenses] Error loading init metadata:', err);
      }

      try {
        // Proactively auto-sync offline queue if entries exist in localStorage
        const currentQueue = getOfflineQueue();
        if (currentQueue.length > 0 && typeof navigator !== 'undefined' && navigator.onLine) {
          expensesApi.syncOfflineQueue().then((res) => {
            if (res.syncedCount > 0) {
              console.info(`[Auto-Sync] Synchronized ${res.syncedCount} queued expenses to server.`);
              refreshOfflineQueue();
              fetchBalance();
              fetchTodayEntries();
              if (activeTab === 'ledger') fetchLedgerEntries(true);
            }
          }).catch((e) => console.warn('[Auto-sync] Boot sync deferred:', e));
        }
      } catch (err) {
        console.warn('[Expenses] Offline queue check:', err);
      }
    }

    loadInit();
  }, []);

  // Persist branch selection to localStorage for instant subsequent loads
  useEffect(() => {
    if (selectedBranchId) {
      localStorage.setItem('prc_last_expense_branch_id', selectedBranchId);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    localStorage.setItem('prc_last_expense_is_all', String(isAllBranches));
  }, [isAllBranches]);

  // Ensure default branch selection when branches state updates
  useEffect(() => {
    if (branches.length > 0) {
      if (!selectedBranchId || !branches.some((b) => b.id === selectedBranchId)) {
        const kol = branches.find((b) => b.id === 'branch-kolkata' || b.code?.toUpperCase().includes('KOL')) || branches[0];
        if (kol) {
          setSelectedBranchId(kol.id);
          setEntryBranchId(kol.id);
        }
      }
    }
  }, [branches, selectedBranchId]);

  // ─── Load Balance & Summaries when Branch changes ───────────────────────────
  const handleCreateCustomBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchData.name.trim() || !newBranchData.code.trim()) {
      setBranchSaveError('Branch name and unique code are required.');
      return;
    }
    setIsSavingBranch(true);
    setBranchSaveError(null);
    try {
      const created = await expensesApi.createBranch(newBranchData);
      setBranches((prev) => {
        const filtered = prev.filter((b) => b.id !== created.id);
        return [...filtered, created];
      });
      setSelectedBranchId(created.id);
      setEntryBranchId(created.id);
      setIsAllBranches(false);
      setIsAddBranchModalOpen(false);
      setNewBranchData({
        name: '',
        code: '',
        city: '',
        state: '',
        address: '',
        phone: '',
        contactPerson: '',
        openingBalance: 0,
      });
      setTimeout(() => {
        fetchBalance();
      }, 300);
    } catch (err: any) {
      setBranchSaveError(err.message || 'Failed to create branch');
    } finally {
      setIsSavingBranch(false);
    }
  };

  const fetchBalance = useCallback(async () => {
    if (!selectedBranchId && !isAllBranches) return;
    setIsLoadingBalance(true);
    try {
      if (isAllBranches) {
        const sum = await expensesApi.getMultiBranchSummary();
        setMultiSummary(sum);
        const consolidatedBalance: BranchCashBalanceInfo = {
          branchId: 'ALL',
          currentBalance: sum.consolidated.totalCashInHand,
          currentBalanceRupees: sum.consolidated.totalCashInHandRupees,
          todayOpening: 0,
          todayReceived: sum.consolidated.todayTotalReceived,
          todayExpenses: sum.consolidated.todayTotalExpenses,
          todayClosing: sum.consolidated.totalCashInHand,
          physicalCashCounted: null,
          variance: null,
          isReconciled: false,
          reconciledAt: null,
          pendingApprovalsCount: sum.consolidated.totalPendingApprovals,
          lastEntryAt: null,
        };
        setLiveBalance(consolidatedBalance);
        try {
          localStorage.setItem('prc_cached_live_balance', JSON.stringify(consolidatedBalance));
        } catch {}
      } else {
        const bal = await expensesApi.getLiveBalance(selectedBranchId);
        setLiveBalance(bal);
        try {
          localStorage.setItem('prc_cached_live_balance', JSON.stringify(bal));
        } catch {}
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [selectedBranchId, isAllBranches]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // ─── Load Today's Entries (Tab 1) ──────────────────────────────────────────
  const fetchTodayEntries = useCallback(async () => {
    if (!selectedBranchId && !isAllBranches) return;
    setIsLoadingToday(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await expensesApi.getExpenses({
        branchId: isAllBranches ? undefined : selectedBranchId,
        date: todayStr,
        limit: 50,
      });
      const entries = Array.isArray(res?.entries)
        ? res.entries
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];
      setTodayEntries(entries);
      try {
        localStorage.setItem('prc_cached_today_entries', JSON.stringify(entries));
      } catch {}
    } catch (err) {
      console.error('Failed to load today entries:', err);
    } finally {
      setIsLoadingToday(false);
    }
  }, [selectedBranchId, isAllBranches]);

  useEffect(() => {
    if (activeTab === 'entry' || activeTab === 'float') {
      fetchFloatHistory();
    }
    if (activeTab === 'entry') {
      fetchTodayEntries();
    }
  }, [activeTab, fetchTodayEntries]);

  // ─── Load Approval Queue (Tab 3) ───────────────────────────────────────────
  const fetchApprovals = useCallback(async () => {
    setIsLoadingPending(true);
    try {
      const res = await expensesApi.getExpenses({
        branchId: approvalsBranchFilter === 'ALL' ? undefined : approvalsBranchFilter,
        status: 'PENDING',
        limit: 100,
      });
      const entries = Array.isArray(res?.entries)
        ? res.entries
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];
      setPendingEntries(entries);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setIsLoadingPending(false);
    }
  }, [approvalsBranchFilter]);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchApprovals();
    }
  }, [activeTab, fetchApprovals]);

  // ─── Load Categories with Monthly Spend (Tab 4) ────────────────────────────
  const fetchCategoriesWithSpend = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const now = new Date();
      const list = await expensesApi.getCategories({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        branchId: isAllBranches ? undefined : selectedBranchId,
      });
      setCategories(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [selectedBranchId, isAllBranches]);

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategoriesWithSpend();
    }
  }, [activeTab, fetchCategoriesWithSpend]);

  // ─── Load Ledger Entries (Tab 2: All Entries) ──────────────────────────────
  const fetchLedgerEntries = useCallback(async (reset = false) => {
    setIsLoadingLedger(true);
    try {
      const branchParam =
        ledgerFilterBranch === 'ALL'
          ? undefined
          : ledgerFilterBranch
          ? ledgerFilterBranch
          : isAllBranches
          ? undefined
          : selectedBranchId;

      const res = await expensesApi.getExpenses({
        branchId: branchParam,
        categoryId: ledgerFilterCategory || undefined,
        status: ledgerFilterStatus === 'ALL' ? undefined : ledgerFilterStatus,
        search: ledgerFilterSearch.trim() || undefined,
        cursor: reset ? undefined : ledgerCursor || undefined,
        limit: 50,
      });

      const entries = Array.isArray(res?.entries)
        ? res.entries
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];

      if (reset) {
        setLedgerEntries(entries);
      } else {
        setLedgerEntries((prev) => [...prev, ...entries]);
      }
      setLedgerCursor(res?.nextCursor || null);
      setLedgerHasMore(Boolean(res?.hasMore));
    } catch (err) {
      console.error('Failed to load ledger entries:', err);
    } finally {
      setIsLoadingLedger(false);
    }
  }, [ledgerFilterBranch, selectedBranchId, isAllBranches, ledgerFilterCategory, ledgerFilterStatus, ledgerFilterSearch, ledgerCursor]);

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchLedgerEntries(true);
    }
  }, [activeTab, ledgerFilterBranch, selectedBranchId, isAllBranches, ledgerFilterCategory, ledgerFilterStatus]);

  // ─── Load Analytics (Tab 5) ────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const data = await expensesApi.getAnalytics({
        branchId: isAllBranches ? undefined : selectedBranchId,
        year: reportYear,
        month: reportMonth,
        period: 'month',
      });
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [selectedBranchId, isAllBranches, reportYear, reportMonth]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  // ─── Fast Entry Submission Handler (<10s) ──────────────────────────────────
  const handleFastEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(entryAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Please enter a valid expense amount greater than ₹0');
      return;
    }
    if (!entryCategory) {
      alert('Please select a category');
      return;
    }
    if (!entryDescription.trim()) {
      alert('Please enter a short note or description');
      return;
    }
    if (!entryPaidTo.trim()) {
      alert('Please specify who was paid');
      return;
    }
    const branchToUse = entryBranchId || (isAllBranches ? branches[0]?.id : selectedBranchId);
    if (!branchToUse) {
      alert('Please select a branch location');
      return;
    }

    setIsSubmittingEntry(true);
    setEntrySuccessMsg(null);
    setEntryWarningMsg(null);

    // Save selected category to localStorage for smart intelligent defaults
    localStorage.setItem('prc_last_expense_category', entryCategory);

    // ── Optimistic Balance Update ─────────────────────────────────────────────
    const amountPaise = Math.round(amountVal * 100);
    const prevBalance = liveBalance?.currentBalance ?? 0;
    setLiveBalance((prev) =>
      prev
        ? {
            ...prev,
            currentBalance: prev.currentBalance - amountPaise,
            currentBalanceRupees: (prev.currentBalance - amountPaise) / 100,
            todayExpenses: prev.todayExpenses + amountPaise,
          }
        : null
    );

    try {
      const res = await expensesApi.createExpense({
        amount: amountVal,
        categoryId: entryCategory,
        paymentMode: entryPaymentMode,
        description: entryDescription.trim(),
        paidTo: entryPaidTo.trim(),
        paidBy: entryPaidBy.trim() || undefined,
        receiptAttachment: entryReceiptUrl || null,
        branchId: branchToUse,
        date: entryDate || undefined,
      });

      if (res.isOffline) {
        setEntrySuccessMsg(`Saved to Offline Queue (will auto-sync when online)`);
        refreshOfflineQueue();
      } else {
        const isCustomDate = entryDate && entryDate !== getTodayDateString();
        setEntrySuccessMsg(
          isCustomDate
            ? `Expense ${res.expense.entryNumber} logged for ${entryDate}!`
            : `Expense ${res.expense.entryNumber} logged successfully!`
        );
        setLastLoggedExpense(res.expense);
        if (res.budgetWarning) {
          setEntryWarningMsg(res.budgetWarning);
        }
      }

      // Prepend to today's list if logged for today, and to ledger
      if (!entryDate || entryDate === getTodayDateString()) {
        setTodayEntries((prev) => [res.expense, ...(prev || [])]);
      }
      setLedgerEntries((prev) => [res.expense, ...(prev || [])]);

      // Reset form fields
      setEntryAmount('');
      setEntryDescription('');
      setEntryPaidTo('');
      setEntryPaidBy('');
      setEntryReceiptUrl('');
      setUploadedSlipName(null);
      setEntryDate(getTodayDateString());

      // Refresh live balance from server
      fetchBalance();
    } catch (err: any) {
      // Rollback optimistic balance on error
      setLiveBalance((prev) =>
        prev
          ? {
              ...prev,
              currentBalance: prevBalance,
              currentBalanceRupees: prevBalance / 100,
            }
          : null
      );
      alert(err.message || 'Failed to submit expense entry');
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  // ─── Trigger Offline Sync ──────────────────────────────────────────────────
  const handleSyncOffline = async () => {
    if (offlineQueue.length === 0) return;
    setIsSyncingOffline(true);
    try {
      const res = await expensesApi.syncOfflineQueue();
      refreshOfflineQueue();
      fetchBalance();
      fetchTodayEntries();
      if (activeTab === 'ledger') fetchLedgerEntries(true);
      alert(`Synchronized ${res.syncedCount} offline entries successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to sync offline queue');
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // ─── Approve Entry (Instant Optimistic Update) ─────────────────────────────
  const handleApproveEntry = async (entry: ExpenseEntry) => {
    if (approvingId === entry.id) return; // prevent double-tap
    setApprovingId(entry.id);

    // 1. Snapshot previous state for rollback on error
    const prevPending = pendingEntries;
    const prevToday = todayEntries;
    const prevLedger = ledgerEntries;
    const prevLastLogged = lastLoggedExpense;
    const prevBalance = liveBalance;

    // 2. Optimistic Instant Update (0ms UI feedback)
    const optimisticApproved: ExpenseEntry = {
      ...entry,
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy: adminUser
        ? {
            id: adminUser.id,
            firstName: (adminUser as any).firstName || (adminUser as any).name || 'Admin',
            lastName: (adminUser as any).lastName || '',
            email: adminUser.email || '',
          }
        : entry.approvedBy,
    };

    // Immediately remove from pending approvals queue
    setPendingEntries((prev) => (prev || []).filter((e) => e.id !== entry.id));
    // Immediately mark as APPROVED in today entries and ledger
    setTodayEntries((prev) =>
      (prev || []).map((e) => (e.id === entry.id ? optimisticApproved : e))
    );
    setLedgerEntries((prev) =>
      (prev || []).map((e) => (e.id === entry.id ? optimisticApproved : e))
    );
    if (lastLoggedExpense && lastLoggedExpense.id === entry.id) {
      setLastLoggedExpense(optimisticApproved);
    }
    // Immediately update live balance and pending count
    setLiveBalance((prev) => {
      if (!prev) return null;
      const newExpenses = prev.todayExpenses + entry.amount;
      const newBal = prev.currentBalance - entry.amount;
      return {
        ...prev,
        pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1),
        todayExpenses: newExpenses,
        currentBalance: newBal,
        currentBalanceRupees: newBal / 100,
        todayClosing: prev.todayOpening + prev.todayReceived - newExpenses,
      };
    });

    try {
      const serverUpdated = await expensesApi.approveExpense(entry.id);
      if (serverUpdated) {
        setTodayEntries((prev) =>
          (prev || []).map((e) => (e.id === entry.id ? serverUpdated : e))
        );
        setLedgerEntries((prev) =>
          (prev || []).map((e) => (e.id === entry.id ? serverUpdated : e))
        );
        if (lastLoggedExpense && lastLoggedExpense.id === entry.id) {
          setLastLoggedExpense(serverUpdated);
        }
      }
      fetchBalance();
    } catch (err: any) {
      // Rollback optimistic state
      setPendingEntries(prevPending);
      setTodayEntries(prevToday);
      setLedgerEntries(prevLedger);
      setLastLoggedExpense(prevLastLogged);
      setLiveBalance(prevBalance);

      const msg = err.message || 'Failed to approve expense';
      alert(`⚠️ Could not approve expense voucher ${entry.entryNumber}: ${msg}`);
    } finally {
      setApprovingId(null);
    }
  };

  // ─── Reject Entry (Instant Optimistic Update) ──────────────────────────────
  const handleConfirmReject = async () => {
    if (!selectedRejectEntry || !rejectionReason.trim()) return;
    const entryToReject = selectedRejectEntry;
    const reason = rejectionReason.trim();

    setRejectingId(entryToReject.id);
    setSelectedRejectEntry(null);
    setRejectionReason('');

    // Snapshot previous state for rollback
    const prevPending = pendingEntries;
    const prevToday = todayEntries;
    const prevLedger = ledgerEntries;
    const prevLastLogged = lastLoggedExpense;
    const prevBalance = liveBalance;

    // Optimistic instant update
    const optimisticRejected: ExpenseEntry = {
      ...entryToReject,
      status: 'REJECTED',
      rejectionReason: reason,
    };

    setPendingEntries((prev) => (prev || []).filter((e) => e.id !== entryToReject.id));
    setTodayEntries((prev) =>
      (prev || []).map((e) => (e.id === entryToReject.id ? optimisticRejected : e))
    );
    setLedgerEntries((prev) =>
      (prev || []).map((e) => (e.id === entryToReject.id ? optimisticRejected : e))
    );
    if (lastLoggedExpense && lastLoggedExpense.id === entryToReject.id) {
      setLastLoggedExpense(optimisticRejected);
    }
    setLiveBalance((prev) =>
      prev ? { ...prev, pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1) } : null
    );

    try {
      const serverUpdated = await expensesApi.rejectExpense(entryToReject.id, reason);
      if (serverUpdated) {
        setTodayEntries((prev) =>
          (prev || []).map((e) => (e.id === entryToReject.id ? serverUpdated : e))
        );
        setLedgerEntries((prev) =>
          (prev || []).map((e) => (e.id === entryToReject.id ? serverUpdated : e))
        );
      }
      fetchBalance();
    } catch (err: any) {
      // Rollback
      setPendingEntries(prevPending);
      setTodayEntries(prevToday);
      setLedgerEntries(prevLedger);
      setLastLoggedExpense(prevLastLogged);
      setLiveBalance(prevBalance);

      alert(`⚠️ Failed to reject expense: ${err.message || 'Server error'}`);
    } finally {
      setRejectingId(null);
    }
  };

  // ─── Void Entry (Super Admin Only) ─────────────────────────────────────────
  const handleConfirmVoid = async () => {
    if (!voidModalEntry || !voidReasonText.trim()) return;
    setIsVoiding(true);
    try {
      await expensesApi.voidExpense(voidModalEntry.id, voidReasonText.trim());
      setTodayEntries((prev) => (prev || []).filter((e) => e.id !== voidModalEntry.id));
      setLedgerEntries((prev) =>
        (prev || []).map((e) => (e.id === voidModalEntry.id ? { ...e, status: 'VOIDED', isVoid: true } : e))
      );
      setVoidModalEntry(null);
      setVoidReasonText('');
      fetchBalance();
      alert('Expense voided and financial reversal applied.');
    } catch (err: any) {
      alert(err.message || 'Failed to void expense');
    } finally {
      setIsVoiding(false);
    }
  };

  // ─── Slip File Upload (Fast Entry & Edit Modal) ───────────────────────────
  const handleSlipFileUpload = async (file: File, isEdit: boolean = false) => {
    if (!file) return;
    if (isEdit) {
      setIsUploadingEditSlip(true);
    } else {
      setIsUploadingSlip(true);
    }
    try {
      const res = await expensesApi.uploadReceipt(file);
      if (isEdit) {
        setEditReceiptUrl(res.url);
        setEditSlipName(res.fileName || file.name);
      } else {
        setEntryReceiptUrl(res.url);
        setUploadedSlipName(res.fileName || file.name);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload receipt slip');
    } finally {
      if (isEdit) {
        setIsUploadingEditSlip(false);
      } else {
        setIsUploadingSlip(false);
      }
    }
  };

  // ─── Open Edit Modal ────────────────────────────────────────────────────────
  const handleOpenEditModal = (expense: ExpenseEntry) => {
    setEditingExpense(expense);
    setEditDate(expense.date ? String(expense.date).split('T')[0] : getTodayDateString());
    setEditAmount(String(expense.amount / 100));
    setEditCategory(expense.categoryId);
    setEditPaymentMode(expense.paymentMode);
    setEditDescription(expense.description);
    setEditPaidTo(expense.paidTo);
    setEditPaidBy(expense.paidBy || '');
    setEditReceiptUrl(expense.receiptAttachment || '');
    setEditSlipName(expense.receiptAttachment ? 'Existing receipt attached' : null);
    setEditChangeReason('');
    setIsEditModalOpen(true);
  };

  // ─── Save Edited Expense ───────────────────────────────────────────────────
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const amountVal = parseFloat(editAmount);
    if (!amountVal || amountVal <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updated = await expensesApi.updateExpense(editingExpense.id, {
        amount: amountVal,
        amountInPaise: false,
        categoryId: editCategory,
        paymentMode: editPaymentMode,
        description: editDescription.trim(),
        paidTo: editPaidTo.trim(),
        paidBy: editPaidBy.trim() || null,
        receiptAttachment: editReceiptUrl || null,
        date: editDate || undefined,
        changeReason: editChangeReason.trim() || 'Updated expense details',
      });

      // Update local state arrays
      setTodayEntries((prev) => (prev || []).map((item) => (item.id === updated.id ? updated : item)));
      setLedgerEntries((prev) => (prev || []).map((item) => (item.id === updated.id ? updated : item)));
      setPendingEntries((prev) => (prev || []).map((item) => (item.id === updated.id ? updated : item)));
      if (lastLoggedExpense && lastLoggedExpense.id === updated.id) {
        setLastLoggedExpense(updated);
      }

      fetchBalance();
      setIsEditModalOpen(false);
      setEditingExpense(null);
      alert('Expense updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update expense entry');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ─── Confirm Delete Expense (Super Admin Only) ─────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteModalEntry || !isSuperAdmin) return;
    setIsDeletingEntry(true);
    try {
      await expensesApi.deleteExpense(deleteModalEntry.id, deleteReasonText.trim());

      // Remove from all local arrays
      setTodayEntries((prev) => (prev || []).filter((e) => e.id !== deleteModalEntry.id));
      setLedgerEntries((prev) => (prev || []).filter((e) => e.id !== deleteModalEntry.id));
      setPendingEntries((prev) => (prev || []).filter((e) => e.id !== deleteModalEntry.id));
      if (lastLoggedExpense && lastLoggedExpense.id === deleteModalEntry.id) {
        setLastLoggedExpense(null);
      }

      fetchBalance();
      setDeleteModalEntry(null);
      setDeleteReasonText('');
      alert('Expense entry permanently deleted.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense entry');
    } finally {
      setIsDeletingEntry(false);
    }
  };

  // ─── Reconciliation Submit ─────────────────────────────────────────────────
  const handleReconcileSubmit = async () => {
    const physicalVal = parseFloat(physicalCashInput);
    if (isNaN(physicalVal) || physicalVal < 0) {
      alert('Please enter a valid counted physical cash amount');
      return;
    }
    if (!selectedBranchId && !isAllBranches) {
      alert('Please select a branch location');
      return;
    }
    const branchToUse = isAllBranches ? branches[0]?.id : selectedBranchId;
    if (!branchToUse) return;

    setIsReconciling(true);
    try {
      const res = await expensesApi.reconcileDaily({
        branchId: branchToUse,
        date: reconcileDate,
        physicalCashCounted: physicalVal,
        reconciliationNotes: reconcileNotes.trim() || null,
      });
      setReconcileLedger(res);
      fetchBalance();
      alert('Daily closing reconciliation successfully locked!');
    } catch (err: any) {
      alert(err.message || 'Reconciliation failed');
    } finally {
      setIsReconciling(false);
    }
  };

  // ─── Cash Float Metrics (Strictly Kolkata Branch) ──────────────────────────
  const floatMetrics = useMemo(() => {
    const currentYearMonth = getTodayDateString().slice(0, 7);
    let totalAllFloat = 0;
    let totalKolkataFloat = 0;
    let thisMonthFloat = 0;
    let kolkataCount = 0;
    let latestTopUp: any = null;

    floatHistory.forEach((f) => {
      const amt = Number(f.amount || 0); // in paise
      totalAllFloat += amt;

      const fBranchId = String(f.branchId || f.branch?.id || '').toLowerCase();
      const fCode = String(f.branch?.code || '').toUpperCase();
      const fName = String(f.branch?.name || '').toLowerCase();

      const isKolkata = fBranchId === 'branch-kolkata' || fCode.includes('KOL') || fName.includes('kolkata') || true;

      if (isKolkata) {
        totalKolkataFloat += amt;
        kolkataCount++;
      }

      const recMonth = String(f.date || '').slice(0, 7);
      if (recMonth === currentYearMonth) {
        thisMonthFloat += amt;
      }
      if (!latestTopUp) {
        latestTopUp = f;
      }
    });

    return {
      totalAllFloat,
      totalKolkataFloat,
      kolkataCount,
      thisMonthFloat,
      latestTopUp,
    };
  }, [floatHistory]);

  const filteredFloatHistory = useMemo(() => {
    return floatHistory.filter((f) => {

      // 2. Search query filter
      if (floatSearchQuery.trim()) {
        const q = floatSearchQuery.toLowerCase();
        const source = String(f.source || '').toLowerCase();
        const notes = String(f.notes || '').toLowerCase();
        const refNo = String(f.referenceNo || '').toLowerCase();
        const branchName = String(f.branch?.name || '').toLowerCase();
        const addedBy = `${f.addedBy?.firstName || ''} ${f.addedBy?.lastName || ''} ${f.addedBy?.email || ''}`.toLowerCase();
        return (
          source.includes(q) ||
          notes.includes(q) ||
          refNo.includes(q) ||
          branchName.includes(q) ||
          addedBy.includes(q)
        );
      }

      return true;
    });
  }, [floatHistory, floatFilterBranch, floatSearchQuery]);

  const openGeneralTopUpModal = () => {
    setTopUpTargetBranchId('branch-kolkata');
    setTopUpSource('Cash from Bank');
    setTopUpNotes('');
    setTopUpAmount('');
    setTopUpDate(getTodayDateString());
    setTopUpRef('');
    setTopUpReceiptUrl(null);
    setTopUpSlipName(null);
    setIsTopUpModalOpen(true);
  };

  // ─── Float Top-Up Submit ───────────────────────────────────────────────────
  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a positive float top-up amount');
      return;
    }
    const branchToUse = topUpTargetBranchId || (isAllBranches ? branches[0]?.id : selectedBranchId);
    if (!branchToUse) return;

    setIsSubmittingTopUp(true);
    try {
      await expensesApi.addFloatTopUp({
        branchId: branchToUse,
        amount: amt,
        date: topUpDate || undefined,
        source: topUpSource,
        referenceNo: topUpRef || null,
        notes: topUpNotes || null,
        receiptAttachment: topUpReceiptUrl || null,
      });
      setIsTopUpModalOpen(false);
      setTopUpAmount('');
      setTopUpDate(getTodayDateString());
      setTopUpRef('');
      setTopUpNotes('');
      setTopUpReceiptUrl(null);
      setTopUpSlipName(null);
      fetchBalance();
      fetchFloatHistory();
      alert('Cash float top-up recorded and added to live balance!');
    } catch (err: any) {
      alert(err.message || 'Failed to record float top-up');
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  // ─── Float History Loader ──────────────────────────────────────────────────
  const fetchFloatHistory = async () => {
    setIsLoadingFloatHistory(true);
    try {
      const res = await expensesApi.getFloatTopUps({ limit: 150 });
      setFloatHistory(Array.isArray(res) ? res : (res as any)?.records || []);
    } catch (err) {
      console.error('Failed to load float history:', err);
    } finally {
      setIsLoadingFloatHistory(false);
    }
  };

  // ─── Float Top-Up Delete (Super Admin Only) ────────────────────────────────
  const handleDeleteFloat = async () => {
    if (!deleteFloatEntry || !isSuperAdmin) return;
    setIsDeletingFloat(true);
    try {
      await expensesApi.deleteFloatTopUp(deleteFloatEntry.id);
      setDeleteFloatEntry(null);
      fetchBalance();
      fetchFloatHistory();
    } catch (err: any) {
      alert(err.message || 'Failed to delete float top-up');
    } finally {
      setIsDeletingFloat(false);
    }
  };

  // ─── Category Master Submit ────────────────────────────────────────────────
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert('Category name is required');
      return;
    }
    setIsSubmittingCat(true);
    try {
      const budgetVal = catBudget ? parseFloat(catBudget) : null;
      if (editingCategory) {
        await expensesApi.updateCategory(editingCategory.id, {
          name: catName.trim(),
          description: catDesc || null,
          monthlyBudgetLimit: budgetVal,
        });
      } else {
        await expensesApi.createCategory({
          name: catName.trim(),
          description: catDesc || null,
          monthlyBudgetLimit: budgetVal,
        });
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCatName('');
      setCatDesc('');
      setCatBudget('');
      fetchCategoriesWithSpend();
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  // ─── Excel Download Handler ────────────────────────────────────────────────
  const handleDownloadExcel = async (overridePeriod?: 'day' | 'week' | 'month' | 'year') => {
    const periodToUse = overridePeriod || reportPeriod;
    setIsDownloadingExcel(true);
    try {
      await expensesApi.downloadExcelReport({
        period: periodToUse,
        branchId: reportBranchId === 'ALL' ? undefined : reportBranchId,
        date: reportDate,
        startDate: reportStartDate,
        month: reportMonth,
        year: reportYear,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to download report');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // ─── Reconciliation Variance Calculation ───────────────────────────────────
  const calculatedClosing = useMemo(() => {
    if (!liveBalance) return 0;
    return liveBalance.todayClosing;
  }, [liveBalance]);

  const liveVariance = useMemo(() => {
    if (!physicalCashInput) return null;
    const physical = parseFloat(physicalCashInput);
    if (isNaN(physical)) return null;
    const physicalPaise = Math.round(physical * 100);
    return calculatedClosing - physicalPaise;
  }, [calculatedClosing, physicalCashInput]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-24 sm:pb-8 text-white">
      {/* ─── Top Header & Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Daily Cash Expense Tracker
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Multi-branch cash-in-hand reconciliation, fast voucher logging & audit ledger
              </p>
            </div>
          </div>
        </div>

        {/* Branch Selector & Fast Float Action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Offline indicator */}
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold animate-pulse">
              <WifiOff size={14} />
              <span>Offline Mode ({offlineQueue.length} queued)</span>
            </div>
          )}

          {offlineQueue.length > 0 && isOnline && (
            <button
              onClick={handleSyncOffline}
              disabled={isSyncingOffline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition shadow-sm"
            >
              <RefreshCw size={14} className={isSyncingOffline ? 'animate-spin' : ''} />
              <span>Sync {offlineQueue.length} Queued</span>
            </button>
          )}

          {/* Facility Switcher with Multi-Branch Support */}
          <div className="flex items-center gap-1.5 bg-[#030213] py-1 px-2.5 rounded-xl border border-white/15 shadow-xs">
            <Building2 size={15} className="text-[#7FB706] shrink-0" />
            <select
              value={isAllBranches ? 'ALL' : selectedBranchId}
              onChange={(e) => {
                if (e.target.value === 'ALL') {
                  setIsAllBranches(true);
                } else {
                  setIsAllBranches(false);
                  setSelectedBranchId(e.target.value);
                }
              }}
              className="bg-transparent text-xs sm:text-sm font-bold text-white py-1 pr-1 focus:outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-[#121226] text-white">
                  {b.name} ({b.code})
                </option>
              ))}
              {branches.length > 1 && (
                <option value="ALL" className="bg-[#121226] text-white">
                  All Branches (Consolidated)
                </option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddBranchModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border border-white/15 text-xs sm:text-sm font-semibold transition cursor-pointer shadow-xs"
              title="Add New Custom Branch"
            >
              <Plus size={15} className="text-[#7FB706]" />
              <span>Add Branch</span>
            </button>

            <button
              type="button"
              onClick={openGeneralTopUpModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Cash Float</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Hero Running Balance & Today KPI Cards ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Running Cash-in-Hand */}
        <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#7FB706]/20 via-[#121226] to-[#030213] border border-[#7FB706]/30 dark:border-[#7FB706]/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7FB706]">Live Cash In Hand</span>
            <div className="p-1.5 rounded-lg bg-[#7FB706]/20 text-[#7FB706]">
              <Wallet size={16} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {liveBalance ? formatRupee(liveBalance.currentBalance) : '₹0.00'}
            </div>
            <div className="flex items-center gap-2">
              {liveBalance && liveBalance.currentBalance < 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle size={11} /> Overdrawn / Top-Up Needed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                  <CheckCircle size={11} /> Ready for disbursements
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Today Opening & Received */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121226] border border-white/10 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-gray-400">Today's Float In</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">
            {liveBalance ? formatRupee(liveBalance.todayOpening + liveBalance.todayReceived) : '₹0.00'}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Opening: {liveBalance ? formatRupee(liveBalance.todayOpening) : '₹0.00'} + Top-Ups:{' '}
            {liveBalance ? formatRupee(liveBalance.todayReceived) : '₹0.00'}
          </p>
        </div>

        {/* Card 3: Today's Approved Expenses */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121226] border border-white/10 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-gray-400">Today's Cash Spent</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">
            {liveBalance ? formatRupee(liveBalance.todayExpenses) : '₹0.00'}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            From {(todayEntries || []).filter((e) => e?.status === 'APPROVED').length} approved vouchers
          </p>
        </div>

        {/* Card 4: Approvals & Reconciliation Status */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121226] border border-white/10 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-gray-400">Status & Pending</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold text-amber-500">
              {liveBalance ? liveBalance.pendingApprovalsCount : 0}
            </span>
            <span className="text-xs font-semibold text-gray-400">Pending Review</span>
          </div>
          <div className="mt-1">
            {liveBalance?.isReconciled ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <ShieldCheck size={12} /> Today Reconciled
              </span>
            ) : (
              <span className="text-[11px] text-gray-400">Closing pending at day-end</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Tab Navigation Bar ─────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('entry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'entry' ? 'bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 shadow-sm font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent font-medium'
          }`}
        >
          <Receipt size={16} />
          <span>Cashier Fast Entry</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'ledger' ? 'bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 shadow-sm font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent font-medium'
          }`}
        >
          <BookOpen size={16} />
          <span>Expense Ledger (All)</span>
        </button>

        <button
          onClick={() => setActiveTab('float')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'float' ? 'bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 shadow-sm font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent font-medium'
          }`}
        >
          <IndianRupee size={16} />
          <span>Cash Float Top-Ups</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap relative ${
            activeTab === 'approvals' ? 'bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 shadow-sm font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent font-medium'
          }`}
        >
          <Clock size={16} />
          <span>Approval Queue</span>
          {(pendingEntries.length > 0 || (liveBalance && liveBalance.pendingApprovalsCount > 0)) && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black shadow-xs">
              {pendingEntries.length > 0 ? pendingEntries.length : liveBalance?.pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'reconciliation' ? 'bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 shadow-sm font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent font-medium'
          }`}
        >
          <Lock size={16} />
          <span>Daily Closing & Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'categories' ? 'bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 shadow-sm font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent font-medium'
          }`}
        >
          <Tag size={16} />
          <span>Category Master & Budgets</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'reports' ? 'bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 shadow-sm font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent font-medium'
          }`}
        >
          <BarChart3 size={16} />
          <span>Reports & Excel Exports</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CASHIER FAST ENTRY & LIVE BALANCE                               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'entry' && (
        <div className="space-y-4">
          {offlineQueue.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-300 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold">
                    {offlineQueue.length} Expense Voucher(s) Waiting in Browser Local Storage
                  </p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                    These entries were saved locally while the server was waking up or offline. Click sync to save them permanently to the central database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncOffline}
                disabled={isSyncingOffline}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
              >
                <RefreshCw size={14} className={isSyncingOffline ? 'animate-spin' : ''} />
                <span>{isSyncingOffline ? 'Syncing...' : `Sync ${offlineQueue.length} Entries to Server Now`}</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Left Column: Fast Mobile Entry Form (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#121226] border border-white/10 shadow-xs space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-[#7FB706] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-white">
                      Fast Expense Entry
                    </h2>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Auto-approves &le; ₹2k
                  </span>
                </div>

                {entrySuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle size={15} className="shrink-0" />
                    <span className="font-medium">{entrySuccessMsg}</span>
                  </div>
                )}

                {entryWarningMsg && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span className="font-medium">{entryWarningMsg}</span>
                  </div>
                )}

                {/* Recently Logged Voucher Alert */}
                {lastLoggedExpense && (
                  <div className="p-2.5 sm:p-3 rounded-lg bg-[#7FB706]/15/80 border border-[#7FB706]/30 dark:border-[#7FB706]/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] text-[#7FB706]">
                          {lastLoggedExpense.entryNumber}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            lastLoggedExpense.status === 'APPROVED'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : lastLoggedExpense.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {lastLoggedExpense.status === 'APPROVED'
                            ? '✓ Approved'
                            : lastLoggedExpense.status === 'PENDING'
                            ? '⏳ Pending Review'
                            : lastLoggedExpense.status}
                        </span>
                        {lastLoggedExpense.date && (
                          <span className="text-[10px] text-gray-400">
                            • {String(lastLoggedExpense.date).split('T')[0]}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLastLoggedExpense(null);
                          setEntrySuccessMsg(null);
                        }}
                        className="text-gray-400 hover:text-gray-400 dark:hover:text-white"
                        title="Dismiss"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <div className="flex items-baseline justify-between pt-0.5">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-gray-200 truncate">
                          {lastLoggedExpense.description}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          Paid to <strong className="text-gray-300">{lastLoggedExpense.paidTo}</strong>
                          {lastLoggedExpense.paidBy ? ` (by ${lastLoggedExpense.paidBy})` : ''} • {lastLoggedExpense.category?.name || 'Expense'}
                        </p>
                      </div>
                      <span className="text-sm font-extrabold text-white shrink-0">
                        {formatRupee(lastLoggedExpense.amount)}
                      </span>
                    </div>

                    {canApprove && lastLoggedExpense.status === 'PENDING' && (
                      <div className="pt-1.5 border-t border-[#7FB706]/20 dark:border-[#7FB706]/20 flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Admin Action:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedRejectEntry(lastLoggedExpense)}
                            className="px-2 py-0.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold transition"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveEntry(lastLoggedExpense)}
                            disabled={!!approvingId}
                            className="px-2.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[10px] font-bold transition flex items-center gap-1 shadow-xs"
                          >
                            <Check size={11} />
                            {approvingId === lastLoggedExpense.id ? 'Approving…' : 'Approve Now'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400">
                      <span>Logged to feed</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('ledger')}
                        className="text-[#7FB706] font-semibold hover:underline flex items-center gap-0.5"
                      >
                        <span>View in Ledger</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleFastEntrySubmit} className="space-y-2.5 sm:space-y-3">
                  {/* Row 1: Date & Branch Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    {/* Expense Date Picker (Defaults to Current Date) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                          <Calendar size={12} className="text-[#7FB706]" />
                          <span>Expense Date</span>
                        </label>
                        {entryDate !== getTodayDateString() && (
                          <button
                            type="button"
                            onClick={() => setEntryDate(getTodayDateString())}
                            className="text-[10px] text-[#7FB706] hover:underline font-medium"
                          >
                            Set Today
                          </button>
                        )}
                      </div>
                      <input
                        type="date"
                        required
                        value={entryDate}
                        max={getTodayDateString()}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none"
                      />
                    </div>

                    {/* Branch Location with Add Option */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                          <Building2 size={12} className="text-[#7FB706]" />
                          <span>Branch Location</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsAddBranchModalOpen(true)}
                          className="text-[10px] text-[#7FB706] hover:underline font-bold cursor-pointer"
                        >
                          + New Branch
                        </button>
                      </div>
                      <select
                        value={entryBranchId}
                        onChange={(e) => setEntryBranchId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none cursor-pointer"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id} className="bg-[#121226] text-white">
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Amount Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-gray-300">
                        Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-1">
                        {QUICK_AMOUNTS.slice(0, 5).map((amt) => (
                          <button
                            type="button"
                            key={amt}
                            onClick={() => setEntryAmount(String(amt))}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 dark:hover:bg-[#3F3F46] text-[10px] font-semibold text-gray-300 transition cursor-pointer"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        placeholder="0.00"
                        value={entryAmount}
                        onChange={(e) => setEntryAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-[#030213] border border-white/15 text-sm font-bold text-white placeholder:text-gray-400 focus:border-[#7FB706] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: Category & Payment Mode Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Category Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                        <Tag size={12} className="text-[#7FB706]" />
                        <span>Category <span className="text-rose-500">*</span></span>
                      </label>
                      <select
                        required
                        value={entryCategory}
                        onChange={(e) => {
                          setEntryCategory(e.target.value);
                          localStorage.setItem('prc_last_expense_category', e.target.value);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none cursor-pointer"
                      >
                        <option value="" className="bg-[#121226]">Select Category</option>
                        {(categories || []).map((cat) => (
                          <option key={cat.id} value={cat.id} className="bg-[#121226]">
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Mode Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                        <Wallet size={12} className="text-[#7FB706]" />
                        <span>Payment Mode <span className="text-rose-500">*</span></span>
                      </label>
                      <select
                        value={entryPaymentMode}
                        onChange={(e) => setEntryPaymentMode(e.target.value as 'CASH' | 'UPI' | 'BANK_TRANSFER')}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none cursor-pointer"
                      >
                        <option value="CASH" className="bg-[#121226]">Cash (Petty Cash)</option>
                        <option value="UPI" className="bg-[#121226]">UPI / Digital QR</option>
                        <option value="BANK_TRANSFER" className="bg-[#121226]">Bank Transfer / IMPS</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Description / Note */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-gray-300">
                        Description / Note <span className="text-rose-500">*</span>
                      </label>
                      <div className="hidden sm:flex gap-1">
                        {QUICK_NOTES.slice(0, 4).map((note) => (
                          <button
                            type="button"
                            key={note}
                            onClick={() => setEntryDescription(note)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 hover:text-[#7FB706] transition"
                          >
                            {note}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Courier charges, Tea for visitors, Hardware repair"
                      value={entryDescription}
                      onChange={(e) => setEntryDescription(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#030213] border border-white/15 text-xs text-white placeholder:text-gray-400 focus:border-[#7FB706] focus:outline-none"
                    />
                  </div>

                  {/* Row 5: Who Paid & Paid To (2-column compact grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    {/* Who Paid (Payer Name) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-300">
                        Who Paid (Name)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul / Cashier"
                        value={entryPaidBy}
                        onChange={(e) => setEntryPaidBy(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#030213] border border-white/15 text-xs text-white placeholder:text-gray-400 focus:border-[#7FB706] focus:outline-none"
                      />
                    </div>

                    {/* Paid To */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-300">
                        Paid To (Vendor) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. BlueDart / Shop / Vendor"
                        value={entryPaidTo}
                        onChange={(e) => setEntryPaidTo(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#030213] border border-white/15 text-xs text-white placeholder:text-gray-400 focus:border-[#7FB706] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 6: Receipt Slip Attachment (Compact) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                        <Camera size={12} className="text-[#7FB706]" />
                        <span>Receipt Slip (Optional)</span>
                      </label>
                      {entryReceiptUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setEntryReceiptUrl('');
                            setUploadedSlipName(null);
                          }}
                          className="text-[10px] text-rose-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSlipFileUpload(file, false);
                      }}
                    />

                    {entryReceiptUrl ? (
                      <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-hidden text-xs">
                          <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                          <span className="truncate text-emerald-700 dark:text-emerald-300 font-medium text-[11px]">
                            {uploadedSlipName || 'Slip Attached'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                          <a
                            href={entryReceiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-[#7FB706] hover:underline flex items-center gap-0.5"
                          >
                            <ExternalLink size={10} /> View
                          </a>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-gray-400 hover:text-gray-200 dark:hover:text-white text-[10px]"
                          >
                            Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingSlip}
                          className="flex-1 py-1.5 px-2.5 rounded-lg border border-dashed border-white/15 dark:border-white/20 hover:border-[#7FB706] hover:bg-[#7FB706]/5 transition flex items-center justify-center gap-1.5 text-xs text-gray-400 cursor-pointer"
                        >
                          {isUploadingSlip ? (
                            <>
                              <RefreshCw size={12} className="animate-spin text-[#7FB706]" />
                              <span className="text-[11px]">Uploading Slip...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud size={13} className="text-[#7FB706]" />
                              <span className="text-[11px]">Attach Slip / Photo</span>
                            </>
                          )}
                        </button>
                        <input
                          type="text"
                          placeholder="or paste URL"
                          value={entryReceiptUrl}
                          onChange={(e) => setEntryReceiptUrl(e.target.value)}
                          className="w-28 px-2 py-1 rounded-lg bg-[#030213] border border-white/10 text-[11px] text-gray-200 placeholder:text-gray-400 focus:border-[#7FB706] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingEntry}
                    className="w-full py-2.5 rounded-lg bg-[#7FB706] hover:bg-[#6fa005] active:scale-[0.99] text-white font-bold text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Check size={16} />
                    <span>{isSubmittingEntry ? 'Recording...' : 'Log Cash Expense Entry'}</span>
                  </button>
                </form>
            </div>
          </div>

          {/* Right Column: Today's Entries Feed (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#121226] border border-white/10 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    Today's Cash Entries
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Live stream for {new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={fetchTodayEntries}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 transition"
                  title="Refresh Today's Feed"
                >
                  <RefreshCw size={14} className={isLoadingToday ? 'animate-spin' : ''} />
                </button>
              </div>

              {(todayEntries || []).length === 0 ? (
                isLoadingToday ? (
                  <div className="py-12 text-center text-gray-400 text-sm animate-pulse space-y-2">
                    <RefreshCw size={24} className="mx-auto animate-spin opacity-50 text-[#7FB706]" />
                    <p>Loading today's cash expenses...</p>
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                    No cash expenses logged today yet.
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {/* Mobile stacked cards */}
                  <div className="block sm:hidden space-y-2.5">
                    {(todayEntries || []).map((e) => (
                      <div
                        key={e.id}
                        className="p-3.5 rounded-xl bg-[#030213] border border-white/10 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-mono font-bold text-[#7FB706]">
                              {e.entryNumber}
                            </span>
                            <h4 className="text-sm font-semibold text-white mt-0.5">
                              {e.description}
                            </h4>
                          </div>
                          <span className="text-base font-extrabold text-white">
                            {formatRupee(e.amount)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-white/5 font-medium">
                            {e.category?.name || 'Category'}
                          </span>
                          <span>•</span>
                          <span>{e.paidTo}{e.paidBy ? ` (by ${e.paidBy})` : ''}</span>
                          <span>•</span>
                          <span>{e.time}</span>
                          <span>•</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              e.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : e.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            {e.status}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {e.status === 'PENDING' && canApprove && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveEntry(e)}
                                  disabled={!!approvingId}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                >
                                  <Check size={12} /> {approvingId === e.id ? 'Approving…' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRejectEntry(e)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {!e.isVoid && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(e)}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 dark:hover:bg-[#3F3F46] text-gray-300 text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <Edit3 size={12} /> Edit
                              </button>
                            )}
                            {e.receiptAttachment ? (
                              <button
                                type="button"
                                onClick={() => setPreviewReceipt({ isOpen: true, url: e.receiptAttachment!, entry: e })}
                                className="px-2.5 py-1 rounded-lg bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] text-xs font-semibold flex items-center gap-1 transition border border-[#7FB706]/20"
                                title="View receipt slip"
                              >
                                <Camera size={12} /> Slip
                              </button>
                            ) : isSuperAdmin ? (
                              <button
                                type="button"
                                onClick={() => setPreviewReceipt({ isOpen: true, url: '', entry: e })}
                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold flex items-center gap-1 transition"
                                title="View Official Cash Payment Voucher"
                              >
                                <Receipt size={12} /> Voucher
                              </button>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isSuperAdmin && e.status !== 'VOIDED' && (
                              <button
                                type="button"
                                onClick={() => setVoidModalEntry(e)}
                                className="text-xs text-amber-600 hover:text-amber-700 font-semibold px-1"
                              >
                                Void
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteModalEntry(e)}
                                className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-700 transition"
                                title="Delete expense voucher (Super Admin only)"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#030213] text-gray-400 uppercase font-semibold border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3">Voucher No</th>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Paid To / By</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Receipt</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                        {(todayEntries || []).map((e) => (
                          <tr key={e.id} className="hover:bg-white/5 transition">
                            <td className="py-2.5 px-3 font-mono font-semibold text-[#7FB706]">
                              {e.entryNumber}
                            </td>
                            <td className="py-2.5 px-3 text-gray-400">{e.time}</td>
                            <td className="py-2.5 px-3 font-medium text-gray-200">
                              {e.category?.name || '-'}
                            </td>
                            <td className="py-2.5 px-3 max-w-[200px] truncate text-gray-300">
                              {e.description}
                            </td>
                            <td className="py-2.5 px-3 text-gray-400">
                              <div className="font-medium text-gray-200">{e.paidTo}</div>
                              {e.paidBy && (
                                <div className="text-[10px] text-gray-400">
                                  By: <span className="text-gray-400">{e.paidBy}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-white">
                              {formatRupee(e.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  e.status === 'APPROVED'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : e.status === 'PENDING'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-rose-500/10 text-rose-500'
                                }`}
                              >
                                {e.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {e.receiptAttachment ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewReceipt({ isOpen: true, url: e.receiptAttachment!, entry: e })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] font-bold text-[11px] transition border border-[#7FB706]/20 shadow-xs cursor-pointer"
                                  title="View uploaded receipt slip"
                                >
                                  <Camera size={12} />
                                  <span>View</span>
                                </button>
                              ) : isSuperAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewReceipt({ isOpen: true, url: '', entry: e })}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 text-[11px] font-medium transition cursor-pointer"
                                  title="View Official Cash Payment Voucher"
                                >
                                  <Receipt size={12} />
                                  <span>Voucher</span>
                                </button>
                              ) : (
                                <span className="text-slate-300 dark:text-gray-600 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {e.status === 'PENDING' && canApprove && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveEntry(e)}
                                      disabled={!!approvingId}
                                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[11px] font-bold transition flex items-center gap-0.5 shadow-sm"
                                      title="Approve expense entry"
                                    >
                                      <Check size={11} /> {approvingId === e.id ? 'Approving…' : 'Approve'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedRejectEntry(e)}
                                      className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition"
                                      title="Reject expense entry"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {!e.isVoid && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(e)}
                                    className="p-1 rounded-lg hover:bg-white/10 hover:bg-white/10 text-gray-400 hover:text-gray-200 dark:hover:text-white transition"
                                    title="Edit expense entry"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                )}
                                {isSuperAdmin && e.status !== 'VOIDED' && (
                                  <button
                                    type="button"
                                    onClick={() => setVoidModalEntry(e)}
                                    className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold px-1 py-0.5"
                                    title="Void expense entry"
                                  >
                                    Void
                                  </button>
                                )}
                                {isSuperAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteModalEntry(e)}
                                    className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-700 transition"
                                    title="Delete expense voucher (Super Admin only)"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* FLOAT SHORTCUT BANNER (inline in Tab 1)                                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'entry' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#7FB706]/15 via-[#121226] to-[#030213] border border-[#7FB706]/20 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#7FB706] text-white shadow-xs">
              <IndianRupee size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Cash Float Management</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Total Float Inflow: <strong className="text-[#7FB706]">{formatRupee(floatMetrics.totalAllFloat)}</strong> • Total Additions: <strong className="text-white">{floatHistory.length}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={openGeneralTopUpModal}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>+ Add Cash Float</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('float')}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>View Float Register</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB: CASH FLOAT & MONEY GIVEN TO UP WORKSPACE                          */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'float' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#7FB706] text-white shadow-xs">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Cash Float Register</span>
                    </h2>
                    <p className="text-xs text-gray-400">
                      Audit, allocate, and track all petty cash float additions across branch facilities
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={openGeneralTopUpModal}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>+ Add Cash Float</span>
                </button>
                <button
                  type="button"
                  onClick={fetchFloatHistory}
                  className="p-2.5 rounded-xl text-gray-400 hover:bg-white/10 transition border border-white/10 cursor-pointer"
                  title="Refresh float history"
                >
                  <RefreshCw size={16} className={isLoadingFloatHistory ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* 3 Financial Metric Cards (Strictly Kolkata Branch) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-5">
              {/* Card 1: Total Float Inflows */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#7FB706]/15 via-[#121226] to-[#030213] border border-[#7FB706]/30 dark:border-[#7FB706]/20 shadow-md">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706]">
                    Total Float Inflows
                  </span>
                  <div className="p-1.5 rounded-lg bg-[#7FB706]/20 text-[#7FB706]">
                    <Coins size={16} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {formatRupee(floatMetrics.totalKolkataFloat || floatMetrics.totalAllFloat)}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#7FB706] font-semibold">
                  <CheckCircle size={12} />
                  <span>{floatMetrics.kolkataCount || floatHistory.length} total float injections</span>
                </div>
              </div>

              {/* Card 2: This Month's Float */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#121226] border border-white/10 shadow-sm">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    This Month's Float
                  </span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {formatRupee(floatMetrics.thisMonthFloat)}
                </div>
                <div className="mt-1 text-[11px] text-gray-400">
                  Current calendar month additions
                </div>
              </div>

              {/* Card 3: Kolkata Branch Float */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#121226] border border-white/10 shadow-sm">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Kolkata Regional Hub
                  </span>
                  <div className="p-1.5 rounded-lg bg-[#7FB706]/15 text-[#7FB706]">
                    <Building2 size={16} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {formatRupee(floatMetrics.totalKolkataFloat || floatMetrics.totalAllFloat)}
                </div>
                <div className="mt-1 text-[11px] text-[#7FB706] font-medium">
                  {floatMetrics.kolkataCount || floatHistory.length} float additions verified
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-[#121226] border border-white/10 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Facility Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setFloatFilterBranch('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                    floatFilterBranch === 'ALL'
                      ? 'bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40 font-bold'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  All Branches ({floatHistory.length})
                </button>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setFloatFilterBranch(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                      floatFilterBranch === b.id
                        ? 'bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40 font-bold'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#7FB706] hover:bg-[#7FB706]/10 border border-dashed border-[#7FB706]/40 transition whitespace-nowrap cursor-pointer"
                >
                  + Add Branch
                </button>
              </div>

              {/* Instant Search Bar */}
              <div className="relative w-full md:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Ref #, vendor, source, notes..."
                  value={floatSearchQuery}
                  onChange={(e) => setFloatSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#030213] border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#7FB706]"
                />
                {floatSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFloatSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-400 dark:hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Float Records Table & Mobile Cards */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Float History Records</span>
                <span className="text-xs text-gray-400 font-normal">
                  Showing {filteredFloatHistory.length} of {floatHistory.length} transactions
                </span>
              </h3>
            </div>

            {isLoadingFloatHistory ? (
              <div className="py-12 text-center text-gray-400 text-sm animate-pulse">
                Loading cash float records…
              </div>
            ) : filteredFloatHistory.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-gray-400">
                  <IndianRupee size={22} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-300">
                    No cash float entries match the filter
                  </p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Add a new cash float top-up for Kolkata Branch or adjust your search filter.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop High-Density Matrix */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#030213] text-gray-400 uppercase font-semibold border-b border-white/10">
                      <tr>
                        <th className="py-3 px-3.5">Date</th>
                        <th className="py-3 px-3.5">Destination Facility</th>
                        <th className="py-3 px-3.5 text-right">Float Amount</th>
                        <th className="py-3 px-3.5">Source / Mode</th>
                        <th className="py-3 px-3.5">Reference #</th>
                        <th className="py-3 px-3.5">Notes / Purpose</th>
                        <th className="py-3 px-3.5">Recorded By</th>
                        <th className="py-3 px-3.5 text-center">Receipt Slip</th>
                        {isSuperAdmin && <th className="py-3 px-3.5 text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {filteredFloatHistory.map((f) => {
                        const bName = f.branch?.name || 'Kolkata Regional Hub & Warehouse';
                        return (
                          <tr key={f.id} className="hover:bg-white/5 transition">
                            <td className="py-3 px-3.5 text-gray-300 whitespace-nowrap font-medium">
                              {formatDisplayDate(f.date)}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#7FB706]/10 text-[#7FB706] font-bold border border-[#7FB706]/20">
                                <Building2 size={12} className="text-[#7FB706]" />
                                <span>{bName}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                              +{formatRupee(f.amount)}
                            </td>
                            <td className="py-3 px-3.5 font-semibold text-gray-200 whitespace-nowrap">
                              {f.source}
                            </td>
                            <td className="py-3 px-3.5 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                              {f.referenceNo || '—'}
                            </td>
                            <td className="py-3 px-3.5 text-gray-400 max-w-[200px] truncate" title={f.notes || ''}>
                              {f.notes || '—'}
                            </td>
                            <td className="py-3 px-3.5 text-gray-400 whitespace-nowrap">
                              {f.addedBy
                                ? `${f.addedBy.firstName || ''} ${f.addedBy.lastName || ''}`.trim() || f.addedBy.email
                                : '—'}
                            </td>
                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              {f.receiptAttachment ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewReceipt({
                                      isOpen: true,
                                      url: f.receiptAttachment,
                                      entry: null,
                                      floatRecord: f,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] font-bold text-xs transition border border-[#7FB706]/20 cursor-pointer shadow-xs"
                                  title="View Payment Receipt Slip"
                                >
                                  <Camera size={13} />
                                  <span>View Receipt</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewReceipt({
                                      isOpen: true,
                                      url: '',
                                      entry: null,
                                      floatRecord: f,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold transition cursor-pointer"
                                  title="View Official Cash Float Disbursal Voucher"
                                >
                                  <Receipt size={13} />
                                  <span>Voucher</span>
                                </button>
                              )}
                            </td>
                            {isSuperAdmin && (
                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setDeleteFloatEntry(f)}
                                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-700 transition cursor-pointer"
                                  title="Delete float top-up (reverses live balance)"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards */}
                <div className="sm:hidden space-y-3">
                  {filteredFloatHistory.map((f) => {
                    const bName = f.branch?.name || 'Kolkata Regional Hub & Warehouse';
                    return (
                      <div
                        key={f.id}
                        className="p-4 rounded-xl border space-y-3 bg-[#030213] border-white/10"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-medium">
                            {formatDisplayDate(f.date)}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7FB706]/10 text-[#7FB706] text-[11px] font-bold border border-[#7FB706]/20">
                            <Building2 size={11} /> {bName}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            +{formatRupee(f.amount)}
                          </span>
                          <span className="text-xs font-semibold text-gray-300">
                            {f.source}
                          </span>
                        </div>

                        {f.referenceNo && (
                          <div className="text-[11px] text-gray-400 font-mono">
                            Ref: {f.referenceNo}
                          </div>
                        )}

                        {f.notes && (
                          <p className="text-xs text-gray-300">
                            {f.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <span className="text-[10px] text-gray-400">
                            By: {f.addedBy?.firstName || f.addedBy?.email || 'Admin'}
                          </span>
                          <div className="flex items-center gap-2">
                            {f.receiptAttachment ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewReceipt({
                                    isOpen: true,
                                    url: f.receiptAttachment,
                                    entry: null,
                                    floatRecord: f,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-[#7FB706]/10 text-[#7FB706] text-xs font-bold"
                              >
                                Receipt
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewReceipt({
                                    isOpen: true,
                                    url: '',
                                    entry: null,
                                    floatRecord: f,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/5 text-gray-300 text-xs font-semibold"
                              >
                                Voucher
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteFloatEntry(f)}
                                className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: Delete Float Top-Up Confirmation ──────────────────────── */}
      {deleteFloatEntry && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121226] rounded-2xl shadow-2xl border border-white/10 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Float Top-Up?</h3>
                <p className="text-xs text-gray-400">This action cannot be undone.</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1 text-sm">
              <p className="text-rose-700 dark:text-rose-400 font-semibold">
                ₹{((deleteFloatEntry.amount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} will be deducted from live cash balance
              </p>
              <p className="text-gray-400 text-xs">Source: <span className="font-medium">{deleteFloatEntry.source}</span></p>
              {deleteFloatEntry.notes && (
                <p className="text-gray-400 text-xs">Notes: {deleteFloatEntry.notes}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteFloatEntry(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFloat}
                disabled={isDeletingFloat}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 size={13} />
                {isDeletingFloat ? 'Deleting...' : 'Delete & Reverse Balance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}

      {/* TAB 2: EXPENSE LEDGER (ALL HISTORICAL ENTRIES)                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-sm space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
                <BookOpen size={22} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Organization Expense Ledger (All Entries)
                </h2>
                <p className="text-xs text-gray-400">
                  Search, filter, and audit all expense vouchers across dates and locations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchLedgerEntries(true)}
                className="p-2 rounded-xl text-gray-400 hover:bg-white/10 transition"
                title="Refresh Ledger"
              >
                <RefreshCw size={16} className={isLoadingLedger ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search voucher #, description, payee..."
                value={ledgerFilterSearch}
                onChange={(e) => setLedgerFilterSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchLedgerEntries(true);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-medium text-white placeholder:text-gray-400 focus:border-[#7FB706] focus:outline-none"
              />
            </div>

            {/* Branch Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#030213] px-3 py-2 rounded-xl border border-white/15">
              <Building2 size={15} className="text-[#7FB706] shrink-0" />
              <select
                value={ledgerFilterBranch}
                onChange={(e) => setLedgerFilterBranch(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#121226] text-white">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#121226] text-white">
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <select
              value={ledgerFilterCategory}
              onChange={(e) => setLedgerFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-medium text-gray-200 focus:border-[#7FB706] focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={ledgerFilterStatus}
              onChange={(e) => setLedgerFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-medium text-gray-200 focus:border-[#7FB706] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved Only</option>
              <option value="PENDING">Pending Approval</option>
              <option value="REJECTED">Rejected</option>
              <option value="VOIDED">Voided</option>
            </select>

            {/* Filter Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fetchLedgerEntries(true)}
                className="px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Search
              </button>

              {(ledgerFilterSearch || ledgerFilterCategory || ledgerFilterBranch !== 'ALL' || ledgerFilterStatus !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setLedgerFilterSearch('');
                    setLedgerFilterCategory('');
                    setLedgerFilterBranch('ALL');
                    setLedgerFilterStatus('ALL');
                  }}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 dark:hover:bg-[#3F3F46] text-gray-400 text-xs font-semibold transition cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Offline Queue Banner in Tab 2 */}
          {offlineQueue.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-300 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold">
                    {offlineQueue.length} Expense Voucher(s) Waiting in Browser Local Storage
                  </p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                    These entries were saved locally while the server was asleep or offline. Click sync to save them permanently to the central database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncOffline}
                disabled={isSyncingOffline}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
              >
                <RefreshCw size={14} className={isSyncingOffline ? 'animate-spin' : ''} />
                <span>{isSyncingOffline ? 'Syncing...' : `Sync ${offlineQueue.length} Entries to Server Now`}</span>
              </button>
            </div>
          )}

          {/* Ledger Table */}
          {(ledgerEntries || []).length === 0 && !isLoadingLedger ? (
            <div className="py-16 text-center text-gray-400 text-sm space-y-3">
              <BookOpen size={36} className="mx-auto opacity-40" />
              <p className="font-semibold text-gray-300">
                No expense entries found matching current filters.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                {ledgerFilterBranch !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setLedgerFilterBranch('ALL')}
                    className="px-3.5 py-1.5 rounded-xl bg-[#7FB706]/15 text-[#7FB706] text-xs font-semibold hover:bg-[#7FB706]/20 transition border border-[#7FB706]/30 dark:border-[#7FB706]/20 cursor-pointer"
                  >
                    View All Branches (Consolidated)
                  </button>
                )}
                {(ledgerFilterSearch || ledgerFilterCategory || ledgerFilterStatus !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerFilterSearch('');
                      setLedgerFilterCategory('');
                      setLedgerFilterStatus('ALL');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 text-gray-300 text-xs font-semibold hover:bg-white/10 transition cursor-pointer"
                  >
                    Clear Search & Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#030213] text-gray-400 uppercase font-semibold border-b border-white/10">
                    <tr>
                      <th className="py-3 px-3.5">Voucher No</th>
                      <th className="py-3 px-3.5">Date & Time</th>
                      {(ledgerFilterBranch === 'ALL' || branches.length > 1) && (
                        <th className="py-3 px-3.5">Branch</th>
                      )}
                      <th className="py-3 px-3.5">Category</th>
                      <th className="py-3 px-3.5">Description</th>
                      <th className="py-3 px-3.5">Paid To / By</th>
                      <th className="py-3 px-3.5">Mode</th>
                      <th className="py-3 px-3.5 text-right">Amount</th>
                      <th className="py-3 px-3.5 text-center">Status</th>
                      <th className="py-3 px-3.5">Logged By</th>
                      <th className="py-3 px-3.5 text-center">Receipt</th>
                      <th className="py-3 px-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                    {(ledgerEntries || []).map((e) => (
                      <tr
                        key={e.id}
                        className={`hover:bg-white/5 transition ${
                          e.isVoid || e.status === 'VOIDED' ? 'opacity-60 bg-[#030213]/30' : ''
                        }`}
                      >
                        {/* Voucher No */}
                        <td className="py-3 px-3.5 font-mono font-bold text-[#7FB706] whitespace-nowrap">
                          {e.entryNumber}
                        </td>

                        {/* Date & Time */}
                        <td className="py-3 px-3.5 text-gray-400 whitespace-nowrap">
                          <div>{formatDate(e.date)}</div>
                          <div className="text-[10px] text-gray-400">{e.time}</div>
                        </td>

                        {/* Branch */}
                        {(ledgerFilterBranch === 'ALL' || branches.length > 1) && (
                          <td className="py-3 px-3.5 text-gray-300 whitespace-nowrap">
                            <span className="font-semibold">{e.branch?.name || '-'}</span>
                            {e.branch?.code && <span className="ml-1 text-[10px] text-gray-400">({e.branch.code})</span>}
                          </td>
                        )}

                        {/* Category */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 font-medium">
                            {e.category?.name || '-'}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-3 px-3.5 max-w-[220px] truncate text-gray-200" title={e.description}>
                          {e.description}
                          {e.isVoid && e.voidReason && (
                            <span className="block text-[10px] text-rose-500 italic">Voided: {e.voidReason}</span>
                          )}
                          {e.status === 'REJECTED' && e.rejectionReason && (
                            <span className="block text-[10px] text-rose-500 italic">Rejected: {e.rejectionReason}</span>
                          )}
                        </td>

                        {/* Paid To & Who Paid */}
                        <td className="py-3 px-3.5 text-gray-300 whitespace-nowrap">
                          <div className="font-semibold text-gray-200">{e.paidTo}</div>
                          {e.paidBy && (
                            <div className="text-[10px] text-gray-400">
                              Paid by: <span className="font-medium text-gray-400">{e.paidBy}</span>
                            </div>
                          )}
                        </td>

                        {/* Payment Mode */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-gray-400">
                            {e.paymentMode}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3.5 text-right font-extrabold text-white whitespace-nowrap">
                          <span className={e.isVoid || e.status === 'VOIDED' ? 'line-through text-gray-400' : ''}>
                            {formatRupee(e.amount)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              e.isVoid || e.status === 'VOIDED'
                                ? 'bg-slate-200 dark:bg-slate-800 text-gray-400'
                                : e.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : e.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            {e.isVoid || e.status === 'VOIDED' ? 'VOIDED' : e.status}
                          </span>
                        </td>

                        {/* Logged By */}
                        <td className="py-3 px-3.5 text-gray-400 whitespace-nowrap">
                          {e.addedBy?.firstName ? `${e.addedBy.firstName} ${e.addedBy.lastName || ''}`.trim() : e.addedBy?.email || '-'}
                        </td>

                        {/* Receipt */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {e.receiptAttachment ? (
                            <button
                              type="button"
                              onClick={() => setPreviewReceipt({ isOpen: true, url: e.receiptAttachment!, entry: e })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] font-bold text-xs transition border border-[#7FB706]/20 shadow-xs cursor-pointer"
                              title="View Receipt Slip / Voucher"
                            >
                              <Camera size={13} />
                              <span>View Slip</span>
                            </button>
                          ) : isSuperAdmin ? (
                            <button
                              type="button"
                              onClick={() => setPreviewReceipt({ isOpen: true, url: '', entry: e })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 dark:hover:bg-[#3F3F46] text-gray-400 text-xs font-semibold transition cursor-pointer"
                              title="View Official Payment Receipt Voucher"
                            >
                              <Receipt size={13} />
                              <span>Voucher</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-gray-600 text-xs">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {e.status === 'PENDING' && canApprove && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveEntry(e)}
                                  disabled={!!approvingId}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                                  title="Approve expense entry"
                                >
                                   <Check size={11} /> {approvingId === e.id ? 'Approving…' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRejectEntry(e)}
                                  className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition"
                                  title="Reject expense entry"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {!e.isVoid && e.status !== 'VOIDED' && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(e)}
                                className="p-1 rounded-lg hover:bg-white/10 hover:bg-white/10 text-gray-400 hover:text-gray-200 dark:hover:text-white transition"
                                title="Edit expense entry"
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
                            {isSuperAdmin && !e.isVoid && e.status !== 'VOIDED' && (
                              <button
                                type="button"
                                onClick={() => setVoidModalEntry(e)}
                                className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold px-1 py-0.5"
                                title="Void expense entry"
                              >
                                Void
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteModalEntry(e)}
                                className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-700 transition"
                                title="Delete expense voucher (Super Admin only)"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Load More Pagination Button */}
              {ledgerHasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => fetchLedgerEntries(false)}
                    disabled={isLoadingLedger}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 dark:hover:bg-[#3F3F46] text-xs font-bold text-gray-300 transition flex items-center gap-2"
                  >
                    {isLoadingLedger ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Loading Next Entries...</span>
                      </>
                    ) : (
                      <span>Load Next 50 Entries</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: APPROVAL QUEUE                                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'approvals' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Pending Expense Approvals</span>
                {pendingEntries.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold font-mono">
                    {pendingEntries.length} PENDING
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400">
                Entries exceeding the auto-approval threshold requiring management sign-off
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchApprovals}
                className="p-2 rounded-xl text-gray-400 hover:bg-white/10 transition"
                title="Refresh Approvals Queue"
              >
                <RefreshCw size={16} className={isLoadingPending ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Facility Filter Pills for Approvals Queue */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 mr-1">
              <Building2 size={13} />
              <span>Facility:</span>
            </span>
            <button
              type="button"
              onClick={() => setApprovalsBranchFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                approvalsBranchFilter === 'ALL'
                  ? 'bg-[#7FB706] text-white shadow-sm'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 dark:hover:bg-[#3F3F46]'
              }`}
            >
              <span>All Branches</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${approvalsBranchFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#3F3F46] text-gray-300'}`}>
                {pendingEntries.length}
              </span>
            </button>
            {branches.map((b) => {
              const bCount = pendingEntries.filter((e) => e.branchId === b.id).length;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setApprovalsBranchFilter(b.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    approvalsBranchFilter === b.id
                      ? 'bg-[#7FB706] text-white shadow-sm'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 dark:hover:bg-[#3F3F46]'
                  }`}
                >
                  <span>{b.name}</span>
                  {bCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${approvalsBranchFilter === b.id ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-500'}`}>
                      {bCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {(pendingEntries || []).length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <CheckCircle size={36} className="mx-auto mb-2 text-emerald-500/50" />
              All caught up! Zero pending approvals in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {(pendingEntries || [])
                .filter((e) => approvalsBranchFilter === 'ALL' || e.branchId === approvalsBranchFilter)
                .map((e) => (
                <div
                  key={e.id}
                  className="p-4 rounded-xl bg-[#030213] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-[#7FB706] text-sm">
                        {e.entryNumber}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                        PENDING APPROVAL
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 border border-blue-500/20">
                        <Building2 size={12} />
                        {e.branch?.name || 'Facility'}
                      </span>
                      <span className="text-xs text-gray-400">({formatDate(e.date)} {e.time})</span>
                    </div>
                    <h3 className="text-base font-bold text-white">{e.description}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span>Category: <strong className="text-gray-300 dark:text-gray-200">{e.category?.name}</strong></span>
                      <span>•</span>
                      <span>Paid To: <strong className="text-gray-300 dark:text-gray-200">{e.paidTo}</strong></span>
                      {e.paidBy && (
                        <>
                          <span>•</span>
                          <span>Who Paid: <strong className="text-gray-300 dark:text-gray-200">{e.paidBy}</strong></span>
                        </>
                      )}
                      <span>•</span>
                      <span>Mode: <strong className="text-gray-300 dark:text-gray-200">{e.paymentMode}</strong></span>
                      <span>•</span>
                      <span>Logged By: <strong className="text-gray-300 dark:text-gray-200">{e.addedBy?.firstName || e.addedBy?.email}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-gray-400">Voucher Amount</span>
                      <div className="text-xl font-extrabold text-white">
                        {formatRupee(e.amount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {e.receiptAttachment ? (
                        <button
                          type="button"
                          onClick={() => setPreviewReceipt({ isOpen: true, url: e.receiptAttachment!, entry: e })}
                          className="px-3 py-2 rounded-xl bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] text-xs font-bold transition flex items-center gap-1.5 border border-[#7FB706]/20 cursor-pointer shadow-xs"
                          title="Inspect receipt slip before approving"
                        >
                          <Camera size={14} />
                          <span>View Slip</span>
                        </button>
                      ) : isSuperAdmin ? (
                        <button
                          type="button"
                          onClick={() => setPreviewReceipt({ isOpen: true, url: '', entry: e })}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                          title="View Official Cash Payment Voucher"
                        >
                          <Receipt size={14} />
                          <span>View Voucher</span>
                        </button>
                      ) : null}
                      <button
                        onClick={() => setSelectedRejectEntry(e)}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveEntry(e)}
                        disabled={!!approvingId}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        {approvingId === e.id ? 'Approving…' : 'Approve'}
                      </button>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeleteModalEntry(e)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition cursor-pointer"
                          title="Delete expense voucher (Super Admin only)"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: DAILY CLOSING & RECONCILIATION                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Daily Closing & Physical Cash Reconciliation
                </h2>
                <p className="text-xs text-gray-400">
                  Verify actual physical cash in drawer against calculated system closing balance
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={reconcileDate}
                  onChange={(e) => setReconcileDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-gray-200"
                />
              </div>
            </div>

            {/* Reconciliation Balance Flow (4-Step Breakdown) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#030213] border border-white/10">
                <span className="text-xs text-gray-400">1. Opening Balance</span>
                <div className="text-lg font-bold text-white mt-0.5">
                  {liveBalance ? formatRupee(liveBalance.todayOpening) : '₹0.00'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#030213] border border-white/10">
                <span className="text-xs text-emerald-500 font-semibold">+ 2. Cash Received / Float</span>
                <div className="text-lg font-bold text-emerald-500 mt-0.5">
                  {liveBalance ? formatRupee(liveBalance.todayReceived) : '₹0.00'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#030213] border border-white/10">
                <span className="text-xs text-rose-500 font-semibold">- 3. Approved Cash Expenses</span>
                <div className="text-lg font-bold text-rose-500 mt-0.5">
                  {liveBalance ? formatRupee(liveBalance.todayExpenses) : '₹0.00'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#7FB706]/10 border border-[#7FB706]/20">
                <span className="text-xs text-[#7FB706] font-bold">= 4. System Closing Balance</span>
                <div className="text-lg font-extrabold text-[#7FB706] dark:text-[#7FB706] mt-0.5">
                  {formatRupee(calculatedClosing)}
                </div>
              </div>
            </div>

            {/* Reconciliation Form */}
            <div className="p-5 rounded-2xl bg-[#030213] border border-white/10 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
                Physical Cash Count Input
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">
                    Physical Cash Counted (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Enter physical cash in drawer"
                    value={physicalCashInput}
                    onChange={(e) => setPhysicalCashInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#121226] border border-white/15 text-lg font-bold text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">
                    Calculated Variance (System - Physical)
                  </label>
                  <div className="w-full px-4 py-3 rounded-xl bg-[#121226] border border-white/15 text-lg font-bold flex items-center justify-between">
                    <span>{liveVariance != null ? formatRupee(liveVariance) : '-'}</span>
                    {liveVariance === 0 ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                        PERFECT MATCH
                      </span>
                    ) : liveVariance != null ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-500">
                        MISMATCH FLAGGED
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">
                  Reconciliation Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Physical count verified with branch accountant"
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121226] border border-white/15 text-xs text-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleReconcileSubmit}
                  disabled={isReconciling || !physicalCashInput}
                  className="px-6 py-3 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold text-sm transition shadow-sm disabled:opacity-50"
                >
                  {isReconciling ? 'Reconciling...' : 'Lock Daily Closing & Reconcile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: CATEGORY MASTER & BUDGETS                                       */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Expense Categories & Budgets
              </h2>
              <p className="text-xs text-gray-400">
                Configure expense categories and monthly budget limits with live spend alerts
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setCatName('');
                setCatDesc('');
                setCatBudget('');
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-semibold transition"
            >
              <Plus size={16} />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => {
              const budgetPaise = c.monthlyBudgetLimit || 0;
              const spendPaise = c.currentMonthSpendPaise || 0;
              const percent = budgetPaise > 0 ? Math.min(100, Math.round((spendPaise / budgetPaise) * 100)) : 0;
              const isOver = budgetPaise > 0 && spendPaise > budgetPaise;

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-[#121226] border border-white/10 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{c.name}</h3>
                      <p className="text-xs text-gray-400">{c.description || 'No description'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(c);
                          setCatName(c.name);
                          setCatDesc(c.description || '');
                          setCatBudget(c.monthlyBudgetLimit ? String(c.monthlyBudgetLimit / 100) : '');
                          setIsCategoryModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#7FB706] hover:bg-white/10 transition"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete category "${c.name}"?`)) {
                            await expensesApi.deleteCategory(c.id);
                            fetchCategoriesWithSpend();
                          }
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-white/10 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Budget & Spend Progress */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Monthly Budget</span>
                      <span className="font-bold text-white">
                        {budgetPaise > 0 ? formatRupee(budgetPaise) : 'Unlimited'}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-[#7FB706]'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">
                        Spent: {formatRupee(spendPaise)}
                      </span>
                      {isOver ? (
                        <span className="font-bold text-rose-500">Over Budget ({percent}%)</span>
                      ) : (
                        <span className="text-gray-400">{percent}% used</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: REPORTS & EXCEL EXPORT GENERATION                               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* 4 One-Click Excel Generator Cards */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Multi-Sheet Excel Report Generator (.xlsx)
                </h2>
                <p className="text-xs text-gray-400">
                  Server-side generated multi-sheet workbooks with currency formatting, category pivots & auto-filters
                </p>
              </div>

              {/* Location Filter for Reports */}
              <div className="flex items-center gap-2 bg-[#030213] px-3 py-1.5 rounded-xl border border-white/15">
                <Building2 size={15} className="text-[#7FB706] shrink-0" />
                <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">Location:</span>
                <select
                  value={reportBranchId}
                  onChange={(e) => setReportBranchId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-[#121226] text-white">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#121226] text-white">
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Day-Wise Export Card */}
              <div className="p-4 rounded-xl bg-[#030213] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#7FB706]">1. Day-Wise Report</span>
                  <FileSpreadsheet size={18} className="text-[#7FB706]" />
                </div>
                <p className="text-xs text-gray-400">
                  Itemized vouchers, opening float, closing balance & reconciliation
                </p>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#121226] border border-white/15 text-xs font-semibold text-gray-200"
                />
                <button
                  onClick={() => {
                    setReportPeriod('day');
                    handleDownloadExcel('day');
                  }}
                  disabled={isDownloadingExcel}
                  className="w-full py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Download Day .xlsx</span>
                </button>
              </div>

              {/* Week-Wise Export Card */}
              <div className="p-4 rounded-xl bg-[#030213] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">2. Week-Wise Report</span>
                  <FileSpreadsheet size={18} className="text-emerald-500" />
                </div>
                <p className="text-xs text-gray-400">
                  Mon–Sun daily rollup with category pivot columns & week total
                </p>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#121226] border border-white/15 text-xs font-semibold text-gray-200"
                />
                <button
                  onClick={() => {
                    setReportPeriod('week');
                    handleDownloadExcel('week');
                  }}
                  disabled={isDownloadingExcel}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Download Week .xlsx</span>
                </button>
              </div>

              {/* Month-Wise Export Card */}
              <div className="p-4 rounded-xl bg-[#030213] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-500">3. Month-Wise Report</span>
                  <FileSpreadsheet size={18} className="text-blue-500" />
                </div>
                <p className="text-xs text-gray-400">
                  Daily sub-totals, category pivot columns, and variance log
                </p>
                <div className="flex gap-2">
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(Number(e.target.value))}
                    className="w-1/2 px-2 py-1.5 rounded-lg bg-[#121226] border border-white/15 text-xs font-semibold text-gray-200"
                  >
                    {[
                      'Jan',
                      'Feb',
                      'Mar',
                      'Apr',
                      'May',
                      'Jun',
                      'Jul',
                      'Aug',
                      'Sep',
                      'Oct',
                      'Nov',
                      'Dec',
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                    className="w-1/2 px-2 py-1.5 rounded-lg bg-[#121226] border border-white/15 text-xs font-semibold text-gray-200"
                  />
                </div>
                <button
                  onClick={() => {
                    setReportPeriod('month');
                    handleDownloadExcel('month');
                  }}
                  disabled={isDownloadingExcel}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Download Month .xlsx</span>
                </button>
              </div>

              {/* Year-Wise Export Card */}
              <div className="p-4 rounded-xl bg-[#030213] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-500">4. Year-Wise Report</span>
                  <FileSpreadsheet size={18} className="text-amber-500" />
                </div>
                <p className="text-xs text-gray-400">
                  Annual category trends, monthly financial rollups & grand totals
                </p>
                <input
                  type="number"
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#121226] border border-white/15 text-xs font-semibold text-gray-200"
                />
                <button
                  onClick={() => {
                    setReportPeriod('year');
                    handleDownloadExcel('year');
                  }}
                  disabled={isDownloadingExcel}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Download Year .xlsx</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Chart: Category Spend Breakdown */}
            <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
                Category Spend Distribution
              </h3>

              {analytics?.categoryDistribution && analytics.categoryDistribution.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categoryDistribution || []}
                        dataKey="amountRupees"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {(analytics.categoryDistribution || []).map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Spent']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-gray-400">
                  No expense distribution data available
                </div>
              )}
            </div>

            {/* Bar Chart: Monthly Spend Trend */}
            <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
                Monthly Spend Trend ({reportYear})
              </h3>

              {analytics && Array.isArray(analytics.trendData) && analytics.trendData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.trendData || []}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                      <YAxis stroke="#888888" fontSize={11} />
                      <RechartsTooltip formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Spent']} />
                      <Bar dataKey="amountRupees" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-gray-400">
                  No monthly trend data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Cash Float Top-Up ────────────────────────────────────────── */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Add Cash Float Top-Up</h3>
              <button
                onClick={() => setIsTopUpModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="space-y-3.5">
              {/* Destination Facility Selector */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                    <Building2 size={13} className="text-[#7FB706]" />
                    <span>Destination Facility</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTopUpModalOpen(false);
                      setIsAddBranchModalOpen(true);
                    }}
                    className="text-[10px] text-[#7FB706] hover:underline font-bold cursor-pointer"
                  >
                    + Add New Branch
                  </button>
                </div>
                <select
                  value={topUpTargetBranchId}
                  onChange={(e) => setTopUpTargetBranchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#121226] text-white">
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Top-Up Date Picker */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                    <Calendar size={13} className="text-[#7FB706]" />
                    <span>Top-Up Date</span>
                  </label>
                  {topUpDate !== getTodayDateString() && (
                    <button
                      type="button"
                      onClick={() => setTopUpDate(getTodayDateString())}
                      className="text-[10px] text-[#7FB706] hover:underline font-medium cursor-pointer"
                    >
                      Set Today
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  required
                  value={topUpDate}
                  max={getTodayDateString()}
                  onChange={(e) => setTopUpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">
                  Top-Up Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="e.g. 10000"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#030213] border border-white/15 text-lg font-bold text-white"
                />
                {/* Quick Amount Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[5000, 10000, 25000, 50000, 100000].map((quickAmt) => (
                    <button
                      key={quickAmt}
                      type="button"
                      onClick={() => setTopUpAmount(String(quickAmt))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        topUpAmount === String(quickAmt)
                          ? 'bg-[#7FB706] text-white shadow-xs'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:bg-white/10'
                      }`}
                    >
                      +₹{quickAmt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">
                  Source of Cash Float
                </label>
                <select
                  value={topUpSource}
                  onChange={(e) => setTopUpSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-medium text-gray-200 cursor-pointer"
                >
                  <option value="HQ Cash Float">HQ Cash Float Transfer (to Factory/Branch)</option>
                  <option value="Cash from Bank">Cash from Bank (ATM / Cheque Withdrawal)</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                  <option value="Director Advance">Director / Partner Capital Infusion</option>
                  <option value="Customer Cash Inflow">Customer Cash Inflow</option>
                  <option value="Other">Other Top-Up</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">
                  Reference / Cheque No
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-889102"
                  value={topUpRef}
                  onChange={(e) => setTopUpRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Notes / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly petty cash replenish"
                  value={topUpNotes}
                  onChange={(e) => setTopUpNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white"
                />
              </div>

              {/* Payment Receipt / Bank Slip Upload */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">
                  Payment Receipt / Bank Slip (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/15 hover:border-[#7FB706]/50 bg-[#030213] bg-[#030213]/50 cursor-pointer text-xs transition">
                    <Upload size={14} className="text-[#7FB706]" />
                    <span className="text-gray-400 font-medium truncate">
                      {isUploadingTopUpSlip
                        ? 'Uploading receipt...'
                        : topUpSlipName || 'Attach Bank Slip / Cash Receipt (JPG, PNG, PDF)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      disabled={isUploadingTopUpSlip}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingTopUpSlip(true);
                        try {
                          const res = await expensesApi.uploadReceipt(file);
                          setTopUpReceiptUrl(res.url);
                          setTopUpSlipName(file.name);
                        } catch (err: any) {
                          alert(err.message || 'Failed to upload receipt slip');
                        } finally {
                          setIsUploadingTopUpSlip(false);
                        }
                      }}
                    />
                  </label>
                  {topUpReceiptUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setTopUpReceiptUrl(null);
                        setTopUpSlipName(null);
                      }}
                      className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500 transition"
                      title="Remove attached receipt"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTopUp}
                  className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold transition shadow-sm"
                >
                  {isSubmittingTopUp ? 'Adding...' : 'Add Float to Live Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Add/Edit Category ────────────────────────────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transport & Travel"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#030213] border border-white/15 text-sm font-semibold text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Description</label>
                <input
                  type="text"
                  placeholder="Short description of items in this category"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">
                  Monthly Budget Limit (₹) (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 50000 for ₹50,000/month"
                  value={catBudget}
                  onChange={(e) => setCatBudget(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCat}
                  className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold transition shadow-sm"
                >
                  {isSubmittingCat ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Rejection Prompt ─────────────────────────────────────────── */}
      {selectedRejectEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Reject Expense Entry</h3>
            <p className="text-xs text-gray-400">
              Voucher #{selectedRejectEntry.entryNumber} for {formatRupee(selectedRejectEntry.amount)}
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Rejection Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Reason for rejecting this expense (e.g. missing receipt, unapproved quote)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedRejectEntry(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Void Confirmation ────────────────────────────────────────── */}
      {voidModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white text-rose-500 flex items-center gap-1.5">
              <AlertTriangle size={18} />
              <span>Void Expense Entry</span>
            </h3>
            <p className="text-xs text-gray-400">
              This will reverse the financial movement for voucher #{voidModalEntry.entryNumber} (
              {formatRupee(voidModalEntry.amount)}) and record an immutable audit log.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Mandatory Void Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Explain why this entry is being voided..."
                value={voidReasonText}
                onChange={(e) => setVoidReasonText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setVoidModalEntry(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoid}
                disabled={isVoiding || !voidReasonText.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isVoiding ? 'Voiding...' : 'Confirm Void & Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Edit Expense Entry ────────────────────────────────────────── */}
      {isEditModalOpen && editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 size={18} className="text-[#7FB706]" />
                  <span>Edit Expense Entry</span>
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Voucher #{editingExpense.entryNumber} • {editingExpense.branch?.name || 'Branch Expense'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingExpense(null);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-400 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {editingExpense.status === 'APPROVED' && !editingExpense.isVoid && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                <span>
                  <strong>Approved Voucher Notice:</strong> Changing the amount will automatically adjust the branch cash balance and reconcile daily ledger totals.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Date, Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                    <Calendar size={13} className="text-[#7FB706]" />
                    <span>Expense Date <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-bold text-white focus:border-[#7FB706] focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white focus:border-[#7FB706] focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {(categories || []).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Mode */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                  <Wallet size={12} className="text-[#7FB706]" />
                  <span>Payment Mode <span className="text-rose-500">*</span></span>
                </label>
                <select
                  value={editPaymentMode}
                  onChange={(e) => setEditPaymentMode(e.target.value as 'CASH' | 'UPI' | 'BANK_TRANSFER')}
                  className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none cursor-pointer"
                >
                  <option value="CASH" className="bg-[#121226]">Cash (Petty Cash)</option>
                  <option value="UPI" className="bg-[#121226]">UPI / Digital QR</option>
                  <option value="BANK_TRANSFER" className="bg-[#121226]">Bank Transfer / IMPS</option>
                </select>
              </div>

              {/* Who Paid & Paid To (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">
                    Who Paid (Name)
                  </label>
                  <input
                    type="text"
                    value={editPaidBy}
                    onChange={(e) => setEditPaidBy(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white focus:border-[#7FB706] focus:outline-none"
                    placeholder="e.g. Cashier, Rahul"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">
                    Paid To / Vendor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editPaidTo}
                    onChange={(e) => setEditPaidTo(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white focus:border-[#7FB706] focus:outline-none"
                    placeholder="e.g. Swiggy, Cleaner, Supplier"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">
                  Description / Purpose <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white focus:border-[#7FB706] focus:outline-none"
                  placeholder="Detailed purpose of the expense..."
                />
              </div>

              {/* Slip File Upload / Attachment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Camera size={14} className="text-[#7FB706]" />
                    <span>Receipt Slip / Voucher (Image / PDF)</span>
                  </label>
                  {editReceiptUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditReceiptUrl('');
                        setEditSlipName(null);
                      }}
                      className="text-[11px] text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={editFileInputRef}
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSlipFileUpload(file, true);
                  }}
                />

                {editReceiptUrl ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                      <span className="text-xs text-emerald-700 dark:text-emerald-300 truncate font-medium">
                        {editSlipName || 'Receipt Slip Attached'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={editReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-[#7FB706] hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink size={11} /> View
                      </a>
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="text-[11px] font-semibold text-gray-400 hover:text-white dark:hover:text-white"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={isUploadingEditSlip}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-white/15 dark:border-white/20 hover:border-[#7FB706] hover:bg-[#7FB706]/5 transition flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 cursor-pointer"
                    >
                      {isUploadingEditSlip ? (
                        <>
                          <RefreshCw size={14} className="animate-spin text-[#7FB706]" />
                          <span>Uploading Slip to Cloud...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={15} className="text-[#7FB706]" />
                          <span>Upload Slip / Photo (Image or PDF)</span>
                        </>
                      )}
                    </button>
                    <input
                      type="text"
                      placeholder="Or paste receipt URL directly"
                      value={editReceiptUrl}
                      onChange={(e) => setEditReceiptUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#030213] border border-white/10 text-[11px] text-white placeholder:text-gray-400 focus:border-[#7FB706] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Edit Reason */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">
                  Change Reason <span className="text-gray-400 font-normal">(for audit trail)</span>
                </label>
                <input
                  type="text"
                  value={editChangeReason}
                  onChange={(e) => setEditChangeReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white focus:border-[#7FB706] focus:outline-none"
                  placeholder="e.g. Corrected amount according to bill, updated vendor name"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit || isUploadingEditSlip}
                  className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Delete Expense (Super Admin Only) ────────────────────────── */}
      {deleteModalEntry && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#121226] border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Expense Voucher</h3>
                <p className="text-xs text-gray-400 font-mono">
                  #{deleteModalEntry.entryNumber} • {formatRupee(deleteModalEntry.amount)}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Are you sure you want to permanently delete voucher <strong className="font-mono text-white">#{deleteModalEntry.entryNumber}</strong>?
            </p>

            {deleteModalEntry.status === 'APPROVED' && !deleteModalEntry.isVoid ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span>Automatic Balance Refund</span>
                </div>
                <p>
                  Because this voucher was approved, deleting it will automatically refund{' '}
                  <strong>{formatRupee(deleteModalEntry.amount)}</strong> back to{' '}
                  <strong>{deleteModalEntry.branch?.name || 'the branch'}</strong>'s cash balance and subtract it from today's expenses.
                </p>
              </div>
            ) : deleteModalEntry.isVoid ? (
              <div className="p-2.5 rounded-xl bg-white/5 text-xs text-gray-400">
                This voucher was previously VOIDED. The record and its audit history will be permanently deleted.
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-white/5 text-xs text-gray-400">
                This voucher is in {deleteModalEntry.status} status and has not impacted cash balances.
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">
                Deletion Reason <span className="text-gray-400 font-normal">(Optional, for audit log)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Reason for deletion..."
                value={deleteReasonText}
                onChange={(e) => setDeleteReasonText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalEntry(null);
                  setDeleteReasonText('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingEntry}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isDeletingEntry ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Deleting Voucher...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Receipt Slip / Voucher Preview Modal ───────────────────────── */}
      {previewReceipt.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#030213]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
                  <Camera size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {previewReceipt.floatRecord ? 'Cash Float Payment Receipt' : 'Expense Payment Receipt & Voucher'}
                    </h3>
                    {previewReceipt.floatRecord ? (
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                        FLT-{previewReceipt.floatRecord.id.slice(0, 8).toUpperCase()}
                      </span>
                    ) : previewReceipt.entry?.entryNumber ? (
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-[#7FB706]/20 bg-[#121226] text-[#7FB706] border border-[#7FB706]/30 dark:border-[#7FB706]/30">
                        #{previewReceipt.entry.entryNumber}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-400">
                    {previewReceipt.floatRecord
                      ? 'Official cash float disbursal record for daily vendor and petty cash expenses'
                      : 'Official financial document and authorization record'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewReceipt({ isOpen: false, url: '', entry: null, floatRecord: null })}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-300 dark:hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Metadata Strip */}
            {previewReceipt.floatRecord ? (
              <div className="px-5 py-2.5 bg-white/5 bg-[#030213] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-gray-300">
                  <span>Branch: <strong className="text-white">{previewReceipt.floatRecord.branch?.name || '-'}</strong></span>
                  <span>•</span>
                  <span>
                    Date:{' '}
                    <strong className="text-white">
                      {previewReceipt.floatRecord.date
                        ? new Date(previewReceipt.floatRecord.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>Source / Payee: <strong className="text-white">{previewReceipt.floatRecord.source}</strong></span>
                  <span>•</span>
                  <span>Ref: <strong className="text-white font-mono">{previewReceipt.floatRecord.referenceNo || '—'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Top-Up Amount:</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    +{formatRupee(previewReceipt.floatRecord.amount)}
                  </span>
                </div>
              </div>
            ) : previewReceipt.entry ? (
              <div className="px-5 py-2.5 bg-white/5 bg-[#030213] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-gray-300">
                  <span>Branch: <strong className="text-white">{previewReceipt.entry.branch?.name || '-'}</strong></span>
                  <span>•</span>
                  <span>Date: <strong className="text-white">{formatDate(previewReceipt.entry.date)} {previewReceipt.entry.time}</strong></span>
                  <span>•</span>
                  <span>Paid To: <strong className="text-white">{previewReceipt.entry.paidTo}</strong></span>
                  <span>•</span>
                  <span>Category: <strong className="text-white">{previewReceipt.entry.category?.name || '-'}</strong></span>
                  <span>•</span>
                  <span>Mode: <strong className="text-white font-mono">{previewReceipt.entry.paymentMode}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Voucher Amount:</span>
                  <span className="text-sm font-extrabold text-[#7FB706]">
                    {formatRupee(previewReceipt.entry.amount)}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Media Content Body */}
            <div className="p-4 sm:p-6 flex-1 overflow-auto flex items-center justify-center bg-[#030213] min-h-[350px]">
              {previewReceipt.url ? (
                previewReceipt.url.toLowerCase().includes('.pdf') || previewReceipt.url.startsWith('data:application/pdf') ? (
                  <div className="w-full h-full min-h-[500px] flex flex-col rounded-xl overflow-hidden border border-white/10">
                    <iframe
                      src={previewReceipt.url}
                      title="Payment Receipt PDF Document"
                      className="w-full flex-1 min-h-[480px] bg-white rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="max-w-full max-h-[65vh] flex items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-black/20 p-2">
                    <img
                      src={previewReceipt.url}
                      alt="Payment Receipt Slip"
                      className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                    />
                  </div>
                )
              ) : previewReceipt.floatRecord ? (
                /* Generated Digital Cash Float Payment Voucher */
                <div className="w-full max-w-2xl bg-[#121226] rounded-2xl border border-white/10 p-6 shadow-sm space-y-5 text-gray-200">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h4 className="text-base font-extrabold text-white uppercase tracking-wider">
                        PACIFIC RESTROOM CUBICLE & LOCKER SOLUTIONS
                      </h4>
                      <p className="text-xs text-gray-400">
                        Official Cash Float Disbursal & Receipt Voucher
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      FLT-{previewReceipt.floatRecord.id.slice(0, 8).toUpperCase()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block">Date of Disbursal</span>
                      <strong className="text-white font-semibold">
                        {formatDisplayDate(previewReceipt.floatRecord.date, 'long')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Branch Location</span>
                      <strong className="text-white font-semibold">
                        {previewReceipt.floatRecord.branch?.name || 'Kolkata Regional Hub'}
                        {previewReceipt.floatRecord.branch?.code ? ` (${previewReceipt.floatRecord.branch.code})` : ''}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Disbursed / Source</span>
                      <strong className="text-white font-semibold">
                        {previewReceipt.floatRecord.source}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Reference / Cheque No</span>
                      <strong className="text-white font-semibold">
                        {previewReceipt.floatRecord.referenceNo || '—'}
                      </strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-gray-400 block">Total Float Amount Disbursed</span>
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        +{formatRupee(previewReceipt.floatRecord.amount)}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Added to Cash-in-Hand
                    </span>
                  </div>

                  {previewReceipt.floatRecord.notes && (
                    <div className="text-xs bg-[#030213] p-3 rounded-xl border border-white/10">
                      <span className="text-gray-400 block mb-0.5 font-medium">Remarks / Purpose:</span>
                      <p className="text-gray-300">{previewReceipt.floatRecord.notes}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                    <div>
                      <span>Disbursed By: </span>
                      <strong className="text-gray-300">
                        {previewReceipt.floatRecord.addedBy
                          ? `${previewReceipt.floatRecord.addedBy.firstName || ''} ${previewReceipt.floatRecord.addedBy.lastName || ''}`.trim() || previewReceipt.floatRecord.addedBy.email
                          : 'Finance Desk'}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="block text-emerald-600 dark:text-emerald-400 font-semibold">✓ Super Admin Verified</span>
                      <span>Pacific Restroom Financial Registry</span>
                    </div>
                  </div>
                </div>
              ) : previewReceipt.entry ? (
                /* Generated Digital Expense Payment Voucher */
                <div className="w-full max-w-2xl bg-[#121226] rounded-2xl border border-white/10 p-6 shadow-sm space-y-5 text-gray-200">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h4 className="text-base font-extrabold text-white uppercase tracking-wider">
                        PACIFIC RESTROOM CUBICLE & LOCKER SOLUTIONS
                      </h4>
                      <p className="text-xs text-gray-400">
                        Official Cash Outflow Payment Voucher
                      </p>
                    </div>
                    <div className="text-right font-mono text-sm text-[#7FB706] font-bold">
                      #{previewReceipt.entry.entryNumber}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block">Date & Time</span>
                      <strong className="text-white font-semibold">
                        {formatDate(previewReceipt.entry.date)} {previewReceipt.entry.time}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Branch Location</span>
                      <strong className="text-white font-semibold">
                        {previewReceipt.entry.branch?.name || '-'}
                        {previewReceipt.entry.branch?.code ? ` (${previewReceipt.entry.branch.code})` : ''}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Paid To (Payee / Vendor)</span>
                      <strong className="text-white font-semibold">
                        {previewReceipt.entry.paidTo}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Payment Mode</span>
                      <strong className="text-white font-semibold font-mono">
                        {previewReceipt.entry.paymentMode}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Expense Category</span>
                      <strong className="text-white font-semibold">
                        {previewReceipt.entry.category?.name || '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Voucher Status</span>
                      <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded-full ${
                        previewReceipt.entry.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : previewReceipt.entry.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {previewReceipt.entry.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs bg-[#030213] p-3 rounded-xl border border-white/10">
                    <span className="text-gray-400 block mb-0.5 font-medium">Description / Particulars:</span>
                    <p className="text-gray-200 font-medium">{previewReceipt.entry.description}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#7FB706]/10 border border-[#7FB706]/20 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-gray-400 block">Payment Voucher Amount</span>
                      <div className="text-2xl font-black text-[#7FB706]">
                        {formatRupee(previewReceipt.entry.amount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Logged By:</span>
                      <span className="text-xs font-semibold text-gray-300">
                        {previewReceipt.entry.addedBy?.firstName || previewReceipt.entry.addedBy?.email || 'Cashier'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                    <div>
                      {previewReceipt.entry.approvedBy && (
                        <span>Approved by: <strong className="text-gray-300">{previewReceipt.entry.approvedBy.firstName || previewReceipt.entry.approvedBy.email}</strong></span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="block text-[#7FB706] font-semibold">Pacific Daily Expense Record</span>
                      <span>Pacific Restroom Financial Registry</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-[#030213]">
              <div className="flex items-center gap-2">
                {previewReceipt.url && (
                  <>
                    <a
                      href={previewReceipt.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 dark:hover:bg-[#3F3F46] text-gray-300 dark:text-gray-200 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} />
                      <span>Open in New Tab</span>
                    </a>
                    <a
                      href={previewReceipt.url}
                      download={`receipt-${previewReceipt.entry?.entryNumber || previewReceipt.floatRecord?.id || 'slip'}`}
                      className="px-3.5 py-2 rounded-xl bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Download Slip</span>
                    </a>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 dark:hover:bg-[#3F3F46] text-gray-300 dark:text-gray-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  title="Print Payment Receipt Voucher"
                >
                  <Printer size={14} />
                  <span>Print Receipt</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewReceipt({ isOpen: false, url: '', entry: null, floatRecord: null })}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white/10 dark:hover:bg-white/20 dark:text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD CUSTOM BRANCH MODAL ────────────────────────────────────── */}
      {isAddBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Custom Branch</h3>
                  <p className="text-xs text-gray-400">Create a regional branch or operating facility</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBranchModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-400 dark:hover:text-white hover:bg-white/10 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomBranch} className="p-5 space-y-4">
              {branchSaveError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {branchSaveError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBranchData.name}
                    onChange={(e) => setNewBranchData({ ...newBranchData, name: e.target.value })}
                    placeholder="e.g. Mumbai Regional Hub & Warehouse"
                    className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Branch Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBranchData.code}
                    onChange={(e) => setNewBranchData({ ...newBranchData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. MUMBAI"
                    className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBranchData.city}
                    onChange={(e) => setNewBranchData({ ...newBranchData, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBranchData.state}
                    onChange={(e) => setNewBranchData({ ...newBranchData, state: e.target.value })}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Opening Cash Float (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newBranchData.openingBalance || ''}
                    onChange={(e) => setNewBranchData({ ...newBranchData, openingBalance: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newBranchData.address}
                    onChange={(e) => setNewBranchData({ ...newBranchData, address: e.target.value })}
                    placeholder="Industrial area / plot details"
                    className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={newBranchData.contactPerson}
                    onChange={(e) => setNewBranchData({ ...newBranchData, contactPerson: e.target.value })}
                    placeholder="e.g. Store Incharge"
                    className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newBranchData.phone}
                    onChange={(e) => setNewBranchData({ ...newBranchData, phone: e.target.value })}
                    placeholder="+91 ..."
                    className="w-full px-3 py-2 rounded-xl bg-[#030213] border border-white/15 text-xs font-semibold text-white focus:border-[#7FB706] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 dark:hover:bg-[#3F3F46] text-gray-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBranch}
                  className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingBranch ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Create Branch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default ExpensesPage;
