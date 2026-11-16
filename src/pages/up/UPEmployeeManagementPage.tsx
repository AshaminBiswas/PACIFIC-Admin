import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { upEmployeeService } from '../../api/upEmployeeService';
import type {
  UpEmployee,
  UpEmployeeAttendance,
  UpEmployeeAdvance,
  UpEmployeeDeduction,
  UpEmployeePayrollRun,
  UpWorkforceStats,
  UpAttendanceStatus,
  UpWorkerType,
  UpPaymentMode,
  UpGovernmentIdType,
} from '../../types/upEmployee';
import {
  Users,
  HardHat,
  Calendar,
  DollarSign,
  ShieldAlert,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Printer,
  X,
  CreditCard,
  Banknote,
  Coins,
  ArrowRight,
  TrendingUp,
  UserX,
  UserCheck,
  ChevronRight,
  Edit2,
  Trash2,
  Download,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

const DEPARTMENTS = [
  'All Departments',
  'Production & Fabrication',
  'CNC & Cutting',
  'Assembly & Hardware',
  'Maintenance & Electrical',
  'Store & Raw Materials',
  'Quality Control (QC)',
  'Plant Security & Housekeeping',
  'Factory Administration',
];

const COMMON_DESIGNATIONS = [
  'Master Fabricator',
  'Machine Operator',
  'Edge Bander Operator',
  'Panel Saw Operator',
  'Welder',
  'Assembler',
  'Production Helper',
  'Maintenance Electrician',
  'Quality Inspector',
  'Plant Supervisor',
  'Foreman',
  'Store Keeper',
  'Loader / Unloader',
  'Security Guard',
  'Factory Manager',
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const ATTENDANCE_BADGES: Record<UpAttendanceStatus, { label: string; bg: string; text: string; border: string }> = {
  PRESENT: { label: 'Present (1x)', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  DOUBLE_DUTY: { label: 'Double Duty (2x)', bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  HALF_DAY: { label: 'Half Day (0.5x)', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  CL: { label: 'CL (Casual)', bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  EL: { label: 'EL (Earned)', bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  HOLIDAY: { label: 'Holiday (Paid)', bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  UL: { label: 'UL (Unpaid)', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  LEAVE: { label: 'Absent / Leave', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
};

function formatINR(val: number | string | null | undefined): string {
  const n = Number(val || 0);
  return `\u20B9${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function UPEmployeeManagementPage() {
  const { user } = useAdminAuth();

  // ─── Super Admin Access Verification ─────────────────────────────────────────
  const isSuperAdmin = useMemo(() => {
    const roleClean = (user?.role || '').toUpperCase().replace(/[-_]/g, '');
    return roleClean === 'SUPERADMIN';
  }, [user?.role]);

  // Active Tab
  type TabType = 'workers' | 'attendance' | 'advances' | 'deductions' | 'payroll' | 'leaves';
  const [activeTab, setActiveTab] = useState<TabType>('workers');

  // Global State
  const [stats, setStats] = useState<UpWorkforceStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Month/Year Filter (shared across attendance, advances, payroll)
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  // ─── Workers Tab State ───────────────────────────────────────────────────────
  const [workers, setWorkers] = useState<UpEmployee[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [workerTypeFilter, setWorkerTypeFilter] = useState<'ALL' | 'MONTHLY' | 'DAILY_WAGE'>('ALL');

  // Modals
  const [isAddEditWorkerModalOpen, setIsAddEditWorkerModalOpen] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<UpEmployee | null>(null);
  const [isIssueAdvanceModalOpen, setIsIssueAdvanceModalOpen] = useState(false);
  const [isPartialDeductModalOpen, setIsPartialDeductModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<UpEmployeeAdvance | null>(null);
  const [isAddDeductionModalOpen, setIsAddDeductionModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<UpEmployeePayrollRun | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  // ─── Attendance Tab State ────────────────────────────────────────────────────
  const [attendanceDate, setAttendanceDate] = useState<string>(today.toISOString().split('T')[0]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<UpEmployeeAttendance[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceSubView, setAttendanceSubView] = useState<'daily' | 'monthly_matrix'>('daily');

  // ─── Advances Tab State ──────────────────────────────────────────────────────
  const [advances, setAdvances] = useState<UpEmployeeAdvance[]>([]);
  const [isLoadingAdvances, setIsLoadingAdvances] = useState(false);
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState<'PENDING' | 'RECOVERED' | 'ALL'>('PENDING');

  // ─── Deductions Tab State ────────────────────────────────────────────────────
  const [deductions, setDeductions] = useState<UpEmployeeDeduction[]>([]);
  const [isLoadingDeductions, setIsLoadingDeductions] = useState(false);

  // ─── Payroll Tab State ───────────────────────────────────────────────────────
  const [payrollRuns, setPayrollRuns] = useState<UpEmployeePayrollRun[]>([]);
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);
  const [payrollSummary, setPayrollSummary] = useState<any>(null);

  // ─── Leaves Tab State ────────────────────────────────────────────────────────
  const [leaveWorkers, setLeaveWorkers] = useState<UpEmployee[]>([]);
  const [selectedLeaveWorker, setSelectedLeaveWorker] = useState<string>('');
  const [leaveLedger, setLeaveLedger] = useState<any[]>([]);
  const [isAdjustLeaveModalOpen, setIsAdjustLeaveModalOpen] = useState(false);

  // Clear messages after 5s
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // ─── Fetch Stats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setIsLoadingStats(true);
      const res = await upEmployeeService.getWorkforceStats();
      setStats(res);
    } catch (err: any) {
      console.warn('Failed to fetch UP workforce stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [isSuperAdmin]);

  // ─── Fetch Workers ───────────────────────────────────────────────────────────
  const fetchWorkers = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setIsLoadingWorkers(true);
      const res = await upEmployeeService.listEmployees({
        search: searchQuery || undefined,
        department: selectedDepartment !== 'All Departments' ? selectedDepartment : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        workerType: workerTypeFilter !== 'ALL' ? workerTypeFilter : undefined,
        limit: 100,
      });
      setWorkers(res.items || []);
      setLeaveWorkers(res.items || []);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to load UP Factory employees');
    } finally {
      setIsLoadingWorkers(false);
    }
  }, [isSuperAdmin, searchQuery, selectedDepartment, statusFilter, workerTypeFilter]);

  // ─── Fetch Attendance ────────────────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setIsLoadingAttendance(true);
      const res = await upEmployeeService.listAttendance({
        month: selectedMonth,
        year: selectedYear,
      });
      setMonthlyAttendance(res.items || []);
    } catch (err: any) {
      console.warn('Failed to load attendance:', err);
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [isSuperAdmin, selectedMonth, selectedYear]);

  // ─── Fetch Advances ──────────────────────────────────────────────────────────
  const fetchAdvances = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setIsLoadingAdvances(true);
      const res = await upEmployeeService.listAdvances({
        status: advanceStatusFilter,
      });
      setAdvances(res || []);
    } catch (err: any) {
      console.warn('Failed to load advances:', err);
    } finally {
      setIsLoadingAdvances(false);
    }
  }, [isSuperAdmin, advanceStatusFilter]);

  // ─── Fetch Deductions ────────────────────────────────────────────────────────
  const fetchDeductions = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setIsLoadingDeductions(true);
      const res = await upEmployeeService.listDeductions({
        applyMonth: selectedMonth,
        applyYear: selectedYear,
      });
      setDeductions(res || []);
    } catch (err: any) {
      console.warn('Failed to load deductions:', err);
    } finally {
      setIsLoadingDeductions(false);
    }
  }, [isSuperAdmin, selectedMonth, selectedYear]);

  // ─── Fetch Payroll ───────────────────────────────────────────────────────────
  const fetchPayroll = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setIsLoadingPayroll(true);
      const res = await upEmployeeService.listPayroll({
        month: selectedMonth,
        year: selectedYear,
      });
      setPayrollRuns(res.items || []);
      setPayrollSummary(res.summary || null);
    } catch (err: any) {
      console.warn('Failed to load payroll runs:', err);
    } finally {
      setIsLoadingPayroll(false);
    }
  }, [isSuperAdmin, selectedMonth, selectedYear]);

  // Initial Load
  useEffect(() => {
    if (isSuperAdmin) {
      fetchStats();
      fetchWorkers();
      fetchAttendance();
      fetchAdvances();
      fetchDeductions();
      fetchPayroll();
    }
  }, [isSuperAdmin, fetchStats, fetchWorkers, fetchAttendance, fetchAdvances, fetchDeductions, fetchPayroll]);

  // Tab switch refresher
  useEffect(() => {
    if (activeTab === 'workers') fetchWorkers();
    if (activeTab === 'attendance') fetchAttendance();
    if (activeTab === 'advances') fetchAdvances();
    if (activeTab === 'deductions') fetchDeductions();
    if (activeTab === 'payroll') fetchPayroll();
  }, [activeTab, fetchWorkers, fetchAttendance, fetchAdvances, fetchDeductions, fetchPayroll]);

  // Filter daily attendance records for selected day
  const dailyAttendanceMap = useMemo(() => {
    const map = new Map<string, UpEmployeeAttendance>();
    monthlyAttendance.forEach((att) => {
      const dStr = typeof att.date === 'string' ? att.date.split('T')[0] : '';
      if (dStr === attendanceDate) {
        map.set(att.employeeId, att);
      }
    });
    return map;
  }, [monthlyAttendance, attendanceDate]);

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleRefreshAll = async () => {
    await Promise.all([
      fetchStats(),
      fetchWorkers(),
      fetchAttendance(),
      fetchAdvances(),
      fetchDeductions(),
      fetchPayroll(),
    ]);
    setSuccessMessage('Refreshed latest UP Factory employee records & wage ledger');
  };

  // Quick single attendance logger
  const handleQuickLogAttendance = async (
    employeeId: string,
    status: UpAttendanceStatus,
    overtimeHours: number = 0,
    isSundayOverride: boolean = false
  ) => {
    try {
      await upEmployeeService.recordAttendance({
        employeeId,
        date: attendanceDate,
        status,
        overtimeHours,
        isSundayOverride,
      });
      await fetchAttendance();
      await fetchStats();
      setSuccessMessage('Attendance recorded');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to record attendance');
    }
  };

  // Batch mark all active as present for attendanceDate
  const handleBatchMarkAllPresent = async () => {
    const activeWorkers = workers.filter((w) => w.status === 'ACTIVE');
    if (activeWorkers.length === 0) {
      setErrorMessage('No active workers available to mark');
      return;
    }
    try {
      await upEmployeeService.batchRecordAttendance({
        date: attendanceDate,
        records: activeWorkers.map((w) => ({
          employeeId: w.id,
          status: 'PRESENT',
          overtimeHours: 0,
          shift: 'GENERAL',
        })),
      });
      await fetchAttendance();
      await fetchStats();
      setSuccessMessage(`Marked ${activeWorkers.length} workers present for ${attendanceDate}`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to batch record attendance');
    }
  };

  // Calculate monthly payroll
  const handleCalculatePayroll = async () => {
    try {
      setIsLoadingPayroll(true);
      const res = await upEmployeeService.calculatePayroll({
        month: selectedMonth,
        year: selectedYear,
      });
      await fetchPayroll();
      await fetchStats();
      setSuccessMessage(`Calculated wage payroll for ${res.count} UP Factory workers`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to calculate payroll');
    } finally {
      setIsLoadingPayroll(false);
    }
  };

  // Finalize payroll run
  const handleFinalizePayroll = async (id: string) => {
    try {
      await upEmployeeService.finalizePayroll(id);
      await fetchPayroll();
      setSuccessMessage('Payroll run finalized and locked');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to finalize');
    }
  };

  // Revert payroll run to draft
  const handleRevertDraft = async (id: string) => {
    try {
      await upEmployeeService.revertPayrollToDraft(id);
      await fetchPayroll();
      setSuccessMessage('Payroll run reverted to draft for recalculation');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to revert');
    }
  };

  // Full recovery of advance
  const handleRecoverAdvanceFull = async (id: string) => {
    if (!confirm('Mark this factory advance as fully recovered?')) return;
    try {
      await upEmployeeService.recoverAdvance(id);
      await fetchAdvances();
      await fetchStats();
      setSuccessMessage('Advance marked as fully recovered');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to recover advance');
    }
  };

  // Accrue monthly leaves
  const handleAccrueMonthlyLeaves = async () => {
    if (!confirm(`Accrue monthly CL (+1.0) and EL (+1.25) for active UP Factory workers for ${selectedMonth}/${selectedYear}?`)) return;
    try {
      const res = await upEmployeeService.accrueMonthlyLeave({
        month: selectedMonth,
        year: selectedYear,
      });
      await fetchWorkers();
      setSuccessMessage(`Accrued monthly leaves for ${res.count} active employees`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to accrue leaves');
    }
  };

  // Deactivate worker
  const handleDeactivateWorker = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to terminate / deactivate worker ${name}?`)) return;
    try {
      await upEmployeeService.deleteEmployee(id);
      await fetchWorkers();
      await fetchStats();
      setSuccessMessage(`Worker ${name} deactivated`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to deactivate');
    }
  };

  // ─── Super Admin Access Guard ────────────────────────────────────────────────
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-[#030213] rounded-2xl border border-white/10 m-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">403 — Super Admin Only</h2>
        <p className="text-gray-400 text-sm max-w-md mt-2">
          The Uttar Pradesh (UP) Factory Employee &amp; Wage Management System is strictly classified and restricted to Super Admin privilege.
        </p>
        <div className="mt-6">
          <a
            href="/admin/dashboard"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition border border-white/10"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-[#030213] min-h-screen text-gray-100">
      {/* Toast Feedback */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-2xl backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="text-xs font-bold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-2 text-gray-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 shadow-2xl backdrop-blur-md animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span className="text-xs font-bold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 text-gray-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* ─── Top Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/10 border border-[#7FB706]/30 flex items-center justify-center text-[#B5F823]">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  UP Factory Employees &amp; Wages
                </h1>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40 uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Super Admin Only
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Workforce Directory, Daily Shift Attendance, Wage Overtime, Factory Cash Advances &amp; Payroll Ledger
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh */}
          <button
            onClick={handleRefreshAll}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition border border-white/10 min-h-[42px] min-w-[42px] flex items-center justify-center"
            title="Refresh All UP Factory Records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Issue Advance Modal Trigger */}
          <button
            onClick={() => setIsIssueAdvanceModalOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition border border-white/10 text-xs font-bold flex items-center gap-1.5 min-h-[42px]"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Disburse Advance</span>
          </button>

          {/* Quick Attendance */}
          <button
            onClick={handleBatchMarkAllPresent}
            className="py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition border border-white/10 text-xs font-bold flex items-center gap-1.5 min-h-[42px]"
            title={`Batch Mark Active Workers Present on ${attendanceDate}`}
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Mark All Present</span>
          </button>

          {/* Add Worker */}
          <button
            onClick={() => {
              setWorkerToEdit(null);
              setIsAddEditWorkerModalOpen(true);
            }}
            className="py-2 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-black text-xs transition shadow-lg shadow-[#7FB706]/20 flex items-center gap-1.5 min-h-[42px] active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Factory Worker</span>
          </button>
        </div>
      </div>

      {/* ─── Top 4 Workforce KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Factory Staff */}
        <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-4 relative overflow-hidden group hover:border-[#7FB706]/40 transition">
          <div className="flex items-center justify-between text-gray-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Total Factory Staff</span>
            <Users className="w-4 h-4 text-[#7FB706]" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {stats ? stats.totalStaff : workers.length}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
            <span className="text-[#B5F823] font-bold">
              {stats ? stats.activeStaff : workers.filter((w) => w.status === 'ACTIVE').length} Active
            </span>
            <span>•</span>
            <span>{stats?.dailyWageWorkers ?? 0} Daily Wage</span>
          </div>
        </div>

        {/* Card 2: Today's Attendance Snapshot */}
        <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-gray-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Today's Present</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {stats?.today?.present ?? 0}
            <span className="text-xs font-medium text-gray-400 ml-1.5">
              / {stats ? stats.activeStaff : workers.length} workers
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
            <span className="text-cyan-300 font-semibold">{stats?.today?.doubleDuty ?? 0} Double Duty</span>
            <span>•</span>
            <span className="text-amber-300 font-semibold">+{stats?.today?.totalOtHours ?? 0}h OT</span>
          </div>
        </div>

        {/* Card 3: Outstanding Cash Advances */}
        <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-4 relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-gray-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Pending Cash Advances</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300">
            {formatINR(stats?.advances?.totalPendingAmount ?? 0)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
            <span className="text-amber-400 font-bold">{stats?.advances?.count ?? 0} Active Loans</span>
            <span>•</span>
            <span>Recoverable via Payroll</span>
          </div>
        </div>

        {/* Card 4: Monthly Payroll Status */}
        <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-4 relative overflow-hidden group hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between text-gray-400 text-[11px] font-bold uppercase tracking-wider">
            <span>{MONTHS.find((m) => m.value === selectedMonth)?.label} Wage Payroll</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {formatINR(payrollSummary?.totalAmount ?? stats?.payroll?.totalAmount ?? 0)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
            <span className="text-emerald-400 font-bold">
              {payrollSummary?.paidCount ?? 0} Paid
            </span>
            <span>•</span>
            <span className="text-gray-400">
              {payrollSummary?.draftCount ?? 0} Draft
            </span>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 overflow-x-auto no-scrollbar gap-2 pb-px">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: 'workers', label: 'Factory Workers', icon: HardHat, count: workers.length },
            { id: 'attendance', label: 'Shift Attendance', icon: Calendar },
            { id: 'advances', label: 'Worker Advances', icon: Coins, count: advances.filter((a) => !a.isRecovered).length },
            { id: 'deductions', label: 'Penalties & Scrap', icon: AlertTriangle, count: deductions.length },
            { id: 'payroll', label: 'Wage Payroll Engine', icon: Banknote, count: payrollRuns.length },
            { id: 'leaves', label: 'Leave Ledger', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl transition border-b-2 ${
                  isActive
                    ? 'border-[#7FB706] text-[#B5F823] bg-white/[0.04]'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#B5F823]' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-[#7FB706]/30 text-[#B5F823]' : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Month / Year Selector */}
        <div className="flex items-center gap-2 min-w-max pb-1">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-[#0a0a1a] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-200 focus:outline-none focus:border-[#7FB706]"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-[#0a0a1a] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-200 focus:outline-none focus:border-[#7FB706]"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── TAB 1: WORKERS DIRECTORY ────────────────────────────────────────── */}
      {activeTab === 'workers' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0a0a1a] p-3 rounded-2xl border border-white/10">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search worker by name, ID (UPFE...), phone, Aadhaar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[#7FB706]"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Worker Type Filter */}
            <select
              value={workerTypeFilter}
              onChange={(e) => setWorkerTypeFilter(e.target.value as any)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[#7FB706]"
            >
              <option value="ALL">All Wage Types</option>
              <option value="MONTHLY">Monthly CTC</option>
              <option value="DAILY_WAGE">Daily Wage</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[#7FB706]"
            >
              <option value="ACTIVE">Active Staff</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ALL">All Status</option>
            </select>
          </div>

          {/* Workers Table */}
          <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Worker ID &amp; Name</th>
                    <th className="py-3 px-4">Designation &amp; Dept</th>
                    <th className="py-3 px-4">Wage / CTC</th>
                    <th className="py-3 px-4">OT Rate</th>
                    <th className="py-3 px-4">Pay Mode</th>
                    <th className="py-3 px-4">Advances Pending</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoadingWorkers ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7FB706]" />
                        Loading UP Factory workforce directory...
                      </td>
                    </tr>
                  ) : workers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <HardHat className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        No UP Factory employees found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    workers.map((worker) => (
                      <tr key={worker.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#7FB706]/10 border border-[#7FB706]/20 flex items-center justify-center font-bold text-xs text-[#B5F823]">
                              {worker.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                {worker.name}
                                <span className="text-[10px] text-gray-400 font-mono">
                                  ({worker.employeeId})
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                                <span>Ph: {worker.phone}</span>
                                <span>•</span>
                                <span>Aadhaar: {worker.governmentIdNumber}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-200">{worker.designation}</div>
                          <div className="text-[11px] text-gray-400">{worker.department}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-emerald-400">
                            {formatINR(worker.monthlyCtc)}
                            <span className="text-[10px] text-gray-400 font-normal"> /mo</span>
                          </div>
                          {worker.dailyWage && (
                            <div className="text-[10px] text-gray-400">
                              Daily: {formatINR(worker.dailyWage)}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-gray-300 font-medium">
                            {formatINR(worker.overtimeHourlyRate)} /hr
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-gray-300">
                            {worker.paymentMode === 'CASH' ? '💵 Cash' : '🏦 Bank'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {Number(worker.pendingAdvancesTotal || 0) > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                              {formatINR(worker.pendingAdvancesTotal)}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-[11px]">Nil</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              worker.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}
                          >
                            {worker.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setWorkerToEdit(worker);
                                setIsAddEditWorkerModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
                              title="Edit Worker Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {worker.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleDeactivateWorker(worker.id, worker.name)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
                                title="Terminate / Deactivate"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* ─── TAB 2: SHIFT ATTENDANCE ─────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Top Bar for Attendance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0a1a] p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 font-bold">Select Date:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
              <span className="text-xs text-gray-400">
                ({new Date(attendanceDate).toLocaleDateString('en-IN', { weekday: 'long' })})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchMarkAllPresent}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark All Present Today</span>
              </button>
            </div>
          </div>

          {/* Daily Shift Table */}
          <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Worker Details</th>
                    <th className="py-3 px-4">Shift &amp; Duty Status</th>
                    <th className="py-3 px-4">Overtime (Hours)</th>
                    <th className="py-3 px-4">Sunday Shift Override</th>
                    <th className="py-3 px-4 text-right">Quick Mark Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {workers
                    .filter((w) => w.status === 'ACTIVE')
                    .map((worker) => {
                      const record = dailyAttendanceMap.get(worker.id);
                      const currentStatus = record?.status || null;
                      const otHours = Number(record?.overtimeHours || 0);

                      return (
                        <tr key={worker.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{worker.name}</div>
                            <div className="text-[11px] text-gray-400">
                              {worker.employeeId} • {worker.designation} ({worker.department})
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {currentStatus ? (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${ATTENDANCE_BADGES[currentStatus]?.bg} ${ATTENDANCE_BADGES[currentStatus]?.text} ${ATTENDANCE_BADGES[currentStatus]?.border}`}
                              >
                                {ATTENDANCE_BADGES[currentStatus]?.label}
                              </span>
                            ) : (
                              <span className="text-gray-500 italic text-[11px]">Not marked yet</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={16}
                                step={0.5}
                                value={otHours}
                                onChange={(e) =>
                                  handleQuickLogAttendance(
                                    worker.id,
                                    currentStatus || 'PRESENT',
                                    Number(e.target.value),
                                    record?.isSundayOverride || false
                                  )
                                }
                                className="w-16 px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-white text-center focus:outline-none focus:border-[#7FB706]"
                              />
                              <span className="text-gray-400 text-[11px]">hrs</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={record?.isSundayOverride || false}
                                onChange={(e) =>
                                  handleQuickLogAttendance(
                                    worker.id,
                                    currentStatus || 'PRESENT',
                                    otHours,
                                    e.target.checked
                                  )
                                }
                                className="rounded bg-black/40 border-white/20 text-[#7FB706] focus:ring-0"
                              />
                              <span className="text-[11px] text-gray-400">Approved Shift</span>
                            </label>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleQuickLogAttendance(worker.id, 'PRESENT', otHours)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                  currentStatus === 'PRESENT'
                                    ? 'bg-emerald-500 text-black border-emerald-400'
                                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                                }`}
                              >
                                Present
                              </button>

                              <button
                                onClick={() => handleQuickLogAttendance(worker.id, 'DOUBLE_DUTY', otHours)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                  currentStatus === 'DOUBLE_DUTY'
                                    ? 'bg-cyan-500 text-black border-cyan-400'
                                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20'
                                }`}
                                title="2x Daily Wage Duty"
                              >
                                Double (2x)
                              </button>

                              <button
                                onClick={() => handleQuickLogAttendance(worker.id, 'HALF_DAY', otHours)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                  currentStatus === 'HALF_DAY'
                                    ? 'bg-amber-500 text-black border-amber-400'
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                                }`}
                              >
                                Half Day
                              </button>

                              <button
                                onClick={() => handleQuickLogAttendance(worker.id, 'LEAVE', otHours)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                  currentStatus === 'LEAVE' || currentStatus === 'UL'
                                    ? 'bg-rose-500 text-white border-rose-400'
                                    : 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: FACTORY WORKER ADVANCES ───────────────────────────────────── */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0a1a] p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold">Filter Status:</span>
              <div className="flex items-center gap-1">
                {(['PENDING', 'RECOVERED', 'ALL'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setAdvanceStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      advanceStatusFilter === st
                        ? 'bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {st === 'PENDING' ? 'Active / Unrecovered' : st === 'RECOVERED' ? 'Fully Recovered' : 'All Loans'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsIssueAdvanceModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-[#7FB706]/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Issue New Advance</span>
            </button>
          </div>

          {/* Advances Table */}
          <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Worker</th>
                    <th className="py-3 px-4">Disbursed Date</th>
                    <th className="py-3 px-4">Original Loan</th>
                    <th className="py-3 px-4">Current Pending</th>
                    <th className="py-3 px-4">Recovery Scheduled</th>
                    <th className="py-3 px-4">Disbursed Via</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoadingAdvances ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                        Loading factory advance ledgers...
                      </td>
                    </tr>
                  ) : advances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        <Coins className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        No advance records found for selected filter.
                      </td>
                    </tr>
                  ) : (
                    advances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-bold text-white">
                          {adv.employee?.name || 'Worker'}
                          <span className="block text-[10px] text-gray-400 font-normal">
                            {adv.employee?.employeeId}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-gray-300">
                          {adv.advanceDate ? new Date(adv.advanceDate).toLocaleDateString('en-IN') : 'N/A'}
                        </td>

                        <td className="py-3 px-4 font-bold text-gray-300">
                          {formatINR(adv.originalAmount || adv.amount)}
                        </td>

                        <td className="py-3 px-4 font-black text-amber-300">
                          {formatINR(adv.amount)}
                        </td>

                        <td className="py-3 px-4 text-gray-300">
                          {MONTHS.find((m) => m.value === adv.recoveryMonth)?.label} {adv.recoveryYear}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-gray-300">
                            {adv.disbursedVia}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-gray-400 max-w-xs truncate" title={adv.reason}>
                          {adv.reason}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              adv.isRecovered
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {adv.isRecovered ? 'Recovered' : 'Pending'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {!adv.isRecovered && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedAdvance(adv);
                                  setIsPartialDeductModalOpen(true);
                                }}
                                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-300 border border-white/10"
                                title="Partial Deduction / Recovery"
                              >
                                Partial Deduct
                              </button>
                              <button
                                onClick={() => handleRecoverAdvanceFull(adv.id)}
                                className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-[10px] font-bold text-emerald-300 border border-emerald-500/30"
                                title="Mark Fully Recovered"
                              >
                                Full Recover
                              </button>
                            </div>
                          )}
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

      {/* ─── TAB 4: FACTORY DEDUCTIONS & PENALTIES ────────────────────────────── */}
      {activeTab === 'deductions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0a0a1a] p-3 rounded-2xl border border-white/10">
            <span className="text-xs text-gray-400">
              Factory Penalties, Scrap / Board Damage Deductions, &amp; Tool Losses for{' '}
              <strong className="text-white">
                {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
              </strong>
            </span>
            <button
              onClick={() => setIsAddDeductionModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Deduction</span>
            </button>
          </div>

          <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Worker</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Reason / Violation</th>
                    <th className="py-3 px-4">Scheduled Month</th>
                    <th className="py-3 px-4">Applied to Payroll</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoadingDeductions ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-400" />
                        Loading deductions...
                      </td>
                    </tr>
                  ) : deductions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        No penalty or scrap deductions logged for this month.
                      </td>
                    </tr>
                  ) : (
                    deductions.map((ded) => (
                      <tr key={ded.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-bold text-white">
                          {ded.employee?.name}
                          <span className="block text-[10px] text-gray-400 font-normal">
                            {ded.employee?.employeeId}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-rose-400">{formatINR(ded.amount)}</td>
                        <td className="py-3 px-4 text-gray-300">{ded.reason}</td>
                        <td className="py-3 px-4 text-gray-400">
                          {MONTHS.find((m) => m.value === ded.applyMonth)?.label} {ded.applyYear}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ded.isApplied
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            }`}
                          >
                            {ded.isApplied ? 'Applied' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!ded.isApplied && (
                            <button
                              onClick={async () => {
                                if (confirm('Delete this deduction record?')) {
                                  await upEmployeeService.deleteDeduction(ded.id);
                                  await fetchDeductions();
                                  setSuccessMessage('Deduction deleted');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                              title="Delete Deduction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* ─── TAB 5: WAGE PAYROLL ENGINE ───────────────────────────────────────── */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0a1a] p-3 rounded-2xl border border-white/10">
            <div>
              <span className="text-xs text-gray-300 font-bold block">
                {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear} Factory Wage
                Disbursements
              </span>
              <span className="text-[11px] text-gray-400">
                Calculates calendar days, double duty (2x), overtime pay, advance recoveries &amp; net cash wage
              </span>
            </div>

            <button
              onClick={handleCalculatePayroll}
              disabled={isLoadingPayroll}
              className="py-2 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-black text-xs transition flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 min-h-[40px] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPayroll ? 'animate-spin' : ''}`} />
              <span>Run Wage Calculation</span>
            </button>
          </div>

          {/* Payroll Runs Table */}
          <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Worker</th>
                    <th className="py-3 px-4">Base CTC / Rate</th>
                    <th className="py-3 px-4">Payable Days</th>
                    <th className="py-3 px-4">Overtime Pay</th>
                    <th className="py-3 px-4">Gross Wage</th>
                    <th className="py-3 px-4">Advance Recovery</th>
                    <th className="py-3 px-4">Deductions</th>
                    <th className="py-3 px-4">Net Wage</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoadingPayroll ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7FB706]" />
                        Running payroll calculation algorithms...
                      </td>
                    </tr>
                  ) : payrollRuns.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-gray-400">
                        <Banknote className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        No payroll runs generated for {MONTHS.find((m) => m.value === selectedMonth)?.label}{' '}
                        {selectedYear}. Click "Run Wage Calculation" above to compute.
                      </td>
                    </tr>
                  ) : (
                    payrollRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{run.employee?.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {run.employee?.employeeId} • {run.employee?.designation}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-gray-300">
                          {formatINR(run.monthlyCtc)}
                          <span className="block text-[10px] text-gray-500">
                            {formatINR(run.perDayRate)} /day
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-white">{Number(run.payableDays)} d</span>
                          <span className="block text-[10px] text-gray-400">
                            Pres: {Number(run.presentDays)} | 2x: {Number(run.doubleDutyDays)} | H: {Number(run.halfDays)}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-medium text-cyan-300">
                            {formatINR(run.overtimePay)}
                          </span>
                          <span className="block text-[10px] text-gray-500">
                            ({Number(run.overtimeHours)}h @ {formatINR(run.overtimeRate)})
                          </span>
                        </td>

                        <td className="py-3 px-4 font-bold text-gray-200">
                          {formatINR(run.grossSalary)}
                        </td>

                        <td className="py-3 px-4">
                          {Number(run.advanceDeduction) > 0 ? (
                            <span className="font-bold text-amber-300">
                              -{formatINR(run.advanceDeduction)}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {Number(run.otherDeductions) > 0 ? (
                            <span className="font-bold text-rose-400">
                              -{formatINR(run.otherDeductions)}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-black text-emerald-400 text-sm">
                          {formatINR(run.netSalary)}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              run.status === 'PAID'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : run.status === 'FINALIZED'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {run.status === 'DRAFT' && (
                              <button
                                onClick={() => handleFinalizePayroll(run.id)}
                                className="px-2 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 text-[10px] font-bold text-blue-300 border border-blue-500/30"
                              >
                                Finalize
                              </button>
                            )}

                            {run.status === 'FINALIZED' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedPayrollRun(run);
                                    setIsDisburseModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-[10px] font-black text-black transition"
                                >
                                  Disburse
                                </button>
                                <button
                                  onClick={() => handleRevertDraft(run.id)}
                                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400"
                                >
                                  Revert
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => {
                                setSelectedPayrollRun(run);
                                setIsPayslipModalOpen(true);
                              }}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300"
                              title="View / Print Worker Payslip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* ─── TAB 6: LEAVE & BALANCE LEDGER ────────────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0a1a] p-3 rounded-2xl border border-white/10">
            <div>
              <span className="text-xs text-gray-300 font-bold block">
                UP Factory Worker Leave Balances &amp; History
              </span>
              <span className="text-[11px] text-gray-400">
                Casual Leave (CL) &amp; Earned Leave (EL) balances with monthly accrual engine
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAccrueMonthlyLeaves}
                className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Accrue Monthly Leaves</span>
              </button>
            </div>
          </div>

          <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Worker ID &amp; Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">CL Balance</th>
                    <th className="py-3 px-4">EL Balance</th>
                    <th className="py-3 px-4">Total Leave Bank</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {workers
                    .filter((w) => w.status === 'ACTIVE')
                    .map((worker) => (
                      <tr key={worker.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-bold text-white">
                          {worker.name}
                          <span className="block text-[10px] text-gray-400 font-normal">
                            {worker.employeeId}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{worker.department}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/15 border border-blue-500/30 text-blue-300">
                            {Number(worker.clBalance)} CL
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
                            {Number(worker.elBalance)} EL
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-200">
                          {Number(worker.clBalance) + Number(worker.elBalance)} Days
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedLeaveWorker(worker.id);
                              setIsAdjustLeaveModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-300 border border-white/10"
                          >
                            Adjust Balance
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: ADD / EDIT WORKER ───────────────────────────────────────── */}
      {isAddEditWorkerModalOpen && (
        <AddEditWorkerModal
          worker={workerToEdit}
          onClose={() => setIsAddEditWorkerModalOpen(false)}
          onSuccess={() => {
            setIsAddEditWorkerModalOpen(false);
            fetchWorkers();
            fetchStats();
            setSuccessMessage(workerToEdit ? 'Worker updated successfully' : 'Worker registered successfully');
          }}
        />
      )}

      {/* ─── MODAL 2: ISSUE ADVANCE ───────────────────────────────────────────── */}
      {isIssueAdvanceModalOpen && (
        <IssueAdvanceModal
          workers={workers.filter((w) => w.status === 'ACTIVE')}
          defaultMonth={selectedMonth}
          defaultYear={selectedYear}
          onClose={() => setIsIssueAdvanceModalOpen(false)}
          onSuccess={() => {
            setIsIssueAdvanceModalOpen(false);
            fetchAdvances();
            fetchWorkers();
            fetchStats();
            setSuccessMessage('Advance disbursed and logged in ledger');
          }}
        />
      )}

      {/* ─── MODAL 3: PARTIAL DEDUCT ADVANCE ──────────────────────────────────── */}
      {isPartialDeductModalOpen && selectedAdvance && (
        <PartialDeductAdvanceModal
          advance={selectedAdvance}
          onClose={() => {
            setIsPartialDeductModalOpen(false);
            setSelectedAdvance(null);
          }}
          onSuccess={() => {
            setIsPartialDeductModalOpen(false);
            setSelectedAdvance(null);
            fetchAdvances();
            fetchStats();
            setSuccessMessage('Partial advance recovery logged');
          }}
        />
      )}

      {/* ─── MODAL 4: RECORD DEDUCTION ────────────────────────────────────────── */}
      {isAddDeductionModalOpen && (
        <AddDeductionModal
          workers={workers.filter((w) => w.status === 'ACTIVE')}
          defaultMonth={selectedMonth}
          defaultYear={selectedYear}
          onClose={() => setIsAddDeductionModalOpen(false)}
          onSuccess={() => {
            setIsAddDeductionModalOpen(false);
            fetchDeductions();
            setSuccessMessage('Deduction logged');
          }}
        />
      )}

      {/* ─── MODAL 5: DISBURSE WAGE ───────────────────────────────────────────── */}
      {isDisburseModalOpen && selectedPayrollRun && (
        <DisburseWageModal
          run={selectedPayrollRun}
          onClose={() => {
            setIsDisburseModalOpen(false);
            setSelectedPayrollRun(null);
          }}
          onSuccess={() => {
            setIsDisburseModalOpen(false);
            setSelectedPayrollRun(null);
            fetchPayroll();
            fetchAdvances();
            fetchStats();
            setSuccessMessage('Wage disbursement logged and advances marked recovered');
          }}
        />
      )}

      {/* ─── MODAL 6: WORKER PAYSLIP PRINT ────────────────────────────────────── */}
      {isPayslipModalOpen && selectedPayrollRun && (
        <WorkerPayslipModal
          run={selectedPayrollRun}
          month={selectedMonth}
          year={selectedYear}
          onClose={() => {
            setIsPayslipModalOpen(false);
            setSelectedPayrollRun(null);
          }}
        />
      )}

      {/* ─── MODAL 7: ADJUST LEAVE BALANCE ────────────────────────────────────── */}
      {isAdjustLeaveModalOpen && selectedLeaveWorker && (
        <AdjustLeaveModal
          workerId={selectedLeaveWorker}
          worker={workers.find((w) => w.id === selectedLeaveWorker)}
          month={selectedMonth}
          year={selectedYear}
          onClose={() => {
            setIsAdjustLeaveModalOpen(false);
            setSelectedLeaveWorker('');
          }}
          onSuccess={() => {
            setIsAdjustLeaveModalOpen(false);
            setSelectedLeaveWorker('');
            fetchWorkers();
            setSuccessMessage('Leave balance updated');
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS & MODALS
// ═══════════════════════════════════════════════════════════════════════════════

function AddEditWorkerModal({
  worker,
  onClose,
  onSuccess,
}: {
  worker: UpEmployee | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: worker?.name || '',
    phone: worker?.phone || '',
    address: worker?.address || 'UP Factory Premises, Uttar Pradesh',
    governmentIdType: worker?.governmentIdType || 'AADHAAR',
    governmentIdNumber: worker?.governmentIdNumber || '',
    bankAccountNumber: worker?.bankAccountNumber || '',
    bankIfsc: worker?.bankIfsc || '',
    bankName: worker?.bankName || '',
    bankAccountHolder: worker?.bankAccountHolder || '',
    paymentMode: worker?.paymentMode || 'CASH',
    designation: worker?.designation || 'Machine Operator',
    department: worker?.department || 'Production & Fabrication',
    workerType: worker?.workerType || 'MONTHLY',
    dailyWage: worker?.dailyWage ? Number(worker.dailyWage) : '',
    monthlyCtc: worker?.monthlyCtc ? Number(worker.monthlyCtc) : '',
    overtimeHourlyRate: worker?.overtimeHourlyRate ? Number(worker.overtimeHourlyRate) : '',
    joiningDate: worker?.joiningDate ? worker.joiningDate.split('T')[0] : new Date().toISOString().split('T')[0],
    status: worker?.status || 'ACTIVE',
    notes: worker?.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!formData.name.trim() || !formData.phone.trim() || !formData.governmentIdNumber.trim()) {
      setErr('Name, Phone, and Govt ID number are mandatory');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        ...formData,
        monthlyCtc: Number(formData.monthlyCtc || 0),
        dailyWage: formData.dailyWage !== '' ? Number(formData.dailyWage) : null,
        overtimeHourlyRate: formData.overtimeHourlyRate !== '' ? Number(formData.overtimeHourlyRate) : 0,
      };

      if (worker) {
        await upEmployeeService.updateEmployee(worker.id, payload);
      } else {
        await upEmployeeService.createEmployee(payload);
      }
      onSuccess();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to save worker profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-[#B5F823]" />
            <h3 className="text-base font-bold text-white">
              {worker ? 'Edit UP Factory Worker' : 'Register New UP Factory Worker'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Worker Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706]"
                placeholder="e.g. Ramesh Kumar"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Mobile Phone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706]"
                placeholder="10-digit mobile number"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Govt ID Type &amp; Number *</label>
              <div className="flex gap-2 mt-1">
                <select
                  value={formData.governmentIdType}
                  onChange={(e) => setFormData({ ...formData, governmentIdType: e.target.value as any })}
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-gray-200"
                >
                  <option value="AADHAAR">Aadhaar</option>
                  <option value="PAN">PAN</option>
                  <option value="VOTER_ID">Voter ID</option>
                </select>
                <input
                  type="text"
                  required
                  value={formData.governmentIdNumber}
                  onChange={(e) => setFormData({ ...formData, governmentIdNumber: e.target.value })}
                  className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706]"
                  placeholder="ID Number"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-[#7FB706]"
              >
                {DEPARTMENTS.filter((d) => d !== 'All Departments').map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Designation</label>
              <select
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-[#7FB706]"
              >
                {COMMON_DESIGNATIONS.map((desig) => (
                  <option key={desig} value={desig}>
                    {desig}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Wage Type &amp; Payment Mode</label>
              <div className="flex gap-2 mt-1">
                <select
                  value={formData.workerType}
                  onChange={(e) => setFormData({ ...formData, workerType: e.target.value as any })}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-gray-200"
                >
                  <option value="MONTHLY">Monthly CTC</option>
                  <option value="DAILY_WAGE">Daily Wage</option>
                </select>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-gray-200"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Monthly Base CTC (₹) *</label>
              <input
                type="number"
                required
                value={formData.monthlyCtc}
                onChange={(e) => setFormData({ ...formData, monthlyCtc: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706]"
                placeholder="e.g. 18000"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Daily Wage Rate (₹) [Optional]</label>
              <input
                type="number"
                value={formData.dailyWage}
                onChange={(e) => setFormData({ ...formData, dailyWage: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706]"
                placeholder="e.g. 650 / day"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Overtime Hourly Rate (₹)</label>
              <input
                type="number"
                value={formData.overtimeHourlyRate}
                onChange={(e) => setFormData({ ...formData, overtimeHourlyRate: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706]"
                placeholder="Auto-calculated if 0"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Residential Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black text-xs font-black transition shadow-lg shadow-[#7FB706]/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : worker ? 'Update Worker' : 'Register Worker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IssueAdvanceModal({
  workers,
  defaultMonth,
  defaultYear,
  onClose,
  onSuccess,
}: {
  workers: UpEmployee[];
  defaultMonth: number;
  defaultYear: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(workers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Festival Advance');
  const [recoveryMonth, setRecoveryMonth] = useState(defaultMonth);
  const [recoveryYear, setRecoveryYear] = useState(defaultYear);
  const [disbursedVia, setDisbursedVia] = useState('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !amount || Number(amount) <= 0) {
      setErr('Please select worker and enter a valid advance amount');
      return;
    }
    try {
      setIsSubmitting(true);
      await upEmployeeService.createAdvance({
        employeeId,
        amount: Number(amount),
        reason,
        recoveryMonth,
        recoveryYear,
        disbursedVia,
      });
      onSuccess();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to issue advance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Disburse Factory Cash Advance</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Select Worker *</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200"
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.employeeId} - {w.designation})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Advance Amount (₹) *</label>
            <input
              type="number"
              required
              min={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. 3000"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Reason / Purpose</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Festival advance, Medical emergency, Travel"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Recovery Month</label>
              <select
                value={recoveryMonth}
                onChange={(e) => setRecoveryMonth(Number(e.target.value))}
                className="w-full mt-1 px-2.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase">Recovery Year</label>
              <select
                value={recoveryYear}
                onChange={(e) => setRecoveryYear(Number(e.target.value))}
                className="w-full mt-1 px-2.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Disbursement Source</label>
            <select
              value={disbursedVia}
              onChange={(e) => setDisbursedVia(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200"
            >
              <option value="CASH">UP Factory Petty Cash Float</option>
              <option value="UPI">Company UPI</option>
              <option value="BANK">Bank Transfer</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-black text-xs font-black transition disabled:opacity-50"
            >
              {isSubmitting ? 'Disbursing...' : 'Disburse Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PartialDeductAdvanceModal({
  advance,
  onClose,
  onSuccess,
}: {
  advance: UpEmployeeAdvance;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [deductionAmount, setDeductionAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionAmount || Number(deductionAmount) <= 0) {
      setErr('Enter valid recovery amount');
      return;
    }
    try {
      setIsSubmitting(true);
      await upEmployeeService.partialDeductAdvance(advance.id, {
        deductionAmount: Number(deductionAmount),
        notes,
      });
      onSuccess();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to deduct');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-bold text-white">Partial Advance Recovery</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-xs text-gray-300">
            Worker: <strong>{advance.employee?.name}</strong>
            <span className="block text-amber-300 mt-1">
              Current Outstanding: <strong>{formatINR(advance.amount)}</strong>
            </span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Deduct / Recover Amount (₹) *</label>
            <input
              type="number"
              required
              max={Number(advance.amount)}
              value={deductionAmount}
              onChange={(e) => setDeductionAmount(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder={`Max ${advance.amount}`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black text-xs font-black transition disabled:opacity-50"
            >
              {isSubmitting ? 'Deducting...' : 'Confirm Deduction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddDeductionModal({
  workers,
  defaultMonth,
  defaultYear,
  onClose,
  onSuccess,
}: {
  workers: UpEmployee[];
  defaultMonth: number;
  defaultYear: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(workers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Scrap / Laminate Damage Fine');
  const [applyMonth, setApplyMonth] = useState(defaultMonth);
  const [applyYear, setApplyYear] = useState(defaultYear);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !amount || Number(amount) <= 0) {
      setErr('Please select worker and enter amount');
      return;
    }
    try {
      setIsSubmitting(true);
      await upEmployeeService.createDeduction({
        employeeId,
        amount: Number(amount),
        reason,
        applyMonth,
        applyYear,
      });
      onSuccess();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to add deduction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Record Penalty / Scrap Deduction</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Worker *</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200"
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Deduction Amount (₹) *</label>
            <input
              type="number"
              required
              min={10}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. 500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Violation / Damage Reason *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Board cutting scrap penalty, safety PPE violation"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Record Deduction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DisburseWageModal({
  run,
  onClose,
  onSuccess,
}: {
  run: UpEmployeePayrollRun;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [paymentMode, setPaymentMode] = useState(run.paymentMode || 'CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('Disbursed from UP Factory Cash Box');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await upEmployeeService.markPayrollPaid(run.id, {
        paymentMode,
        paymentReference,
        paymentNotes,
      });
      onSuccess();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to record wage disbursement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Disburse Factory Wage</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-1">
            <div className="text-xs text-gray-300">
              Worker: <strong>{run.employee?.name}</strong> ({run.employee?.employeeId})
            </div>
            <div className="text-sm font-black text-emerald-400">
              Net Payable: {formatINR(run.netSalary)}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Payment Method</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200"
            >
              <option value="CASH">Cash (From UP Factory Cash Drawer)</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
              <option value="UPI">UPI</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Reference / Voucher No.</label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. CASH-UP-NOV-01 or UTR 423874"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black transition disabled:opacity-50"
            >
              {isSubmitting ? 'Disbursing...' : 'Confirm Paid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkerPayslipModal({
  run,
  month,
  year,
  onClose,
}: {
  run: UpEmployeePayrollRun;
  month: number;
  year: number;
  onClose: () => void;
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white text-gray-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 print:p-0 print:m-0 print:shadow-none">
        {/* Actions (Hidden on print) */}
        <div className="flex items-center justify-between border-b pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#7FB706]" />
            <h3 className="text-base font-bold text-gray-900">UP Factory Worker Wage Slip</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="space-y-4 text-xs font-sans p-2">
          {/* Header */}
          <div className="text-center border-b pb-3">
            <h2 className="text-lg font-black tracking-wider uppercase text-gray-900">
              PACIFIC PRODUCTS AND SOLUTIONS
            </h2>
            <p className="text-[11px] text-gray-600 font-bold uppercase tracking-widest">
              UTTAR PRADESH FACTORY UNIT — WORKER SALARY SLIP
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Pay Period: {MONTHS.find((m) => m.value === month)?.label} {year}
            </p>
          </div>

          {/* Worker Details Grid */}
          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border text-gray-700">
            <div>
              <span className="text-gray-500 font-bold">Worker Name:</span>{' '}
              <strong className="text-gray-900">{run.employee?.name}</strong>
            </div>
            <div>
              <span className="text-gray-500 font-bold">Employee ID:</span>{' '}
              <strong className="text-gray-900">{run.employee?.employeeId}</strong>
            </div>
            <div>
              <span className="text-gray-500 font-bold">Department:</span> {run.employee?.department}
            </div>
            <div>
              <span className="text-gray-500 font-bold">Designation:</span> {run.employee?.designation}
            </div>
            <div>
              <span className="text-gray-500 font-bold">Total Calendar Days:</span> {run.totalCalendarDays}
            </div>
            <div>
              <span className="text-gray-500 font-bold">Payable Days:</span>{' '}
              <strong className="text-emerald-700">{Number(run.payableDays)} Days</strong>
            </div>
          </div>

          {/* Earnings vs Deductions Table */}
          <div className="grid grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-3 py-1.5 font-bold uppercase text-[10px] tracking-wider text-gray-700">
                Earnings (₹)
              </div>
              <div className="p-2 space-y-1.5">
                <div className="flex justify-between">
                  <span>Base Duty Pay:</span>
                  <span className="font-bold">
                    {formatINR(Number(run.payableDays) * Number(run.perDayRate))}
                  </span>
                </div>
                <div className="flex justify-between text-cyan-800">
                  <span>Overtime Pay ({Number(run.overtimeHours)}h):</span>
                  <span className="font-bold">+{formatINR(run.overtimePay)}</span>
                </div>
                {Number(run.additionalAllowances) > 0 && (
                  <div className="flex justify-between">
                    <span>Allowances:</span>
                    <span>+{formatINR(run.additionalAllowances)}</span>
                  </div>
                )}
                <div className="border-t pt-1 flex justify-between font-black text-gray-900">
                  <span>Gross Pay:</span>
                  <span>{formatINR(run.grossSalary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-3 py-1.5 font-bold uppercase text-[10px] tracking-wider text-gray-700">
                Deductions &amp; Recoveries (₹)
              </div>
              <div className="p-2 space-y-1.5">
                <div className="flex justify-between text-amber-800">
                  <span>Advance Recovery:</span>
                  <span className="font-bold">-{formatINR(run.advanceDeduction)}</span>
                </div>
                <div className="flex justify-between text-rose-800">
                  <span>Penalties / Scrap:</span>
                  <span className="font-bold">-{formatINR(run.otherDeductions)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-black text-gray-900">
                  <span>Total Deductions:</span>
                  <span>
                    -{formatINR(Number(run.advanceDeduction) + Number(run.otherDeductions))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Wage Box */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Net Disbursable Wage
              </span>
              <span className="text-xl font-black text-emerald-900">
                {formatINR(run.netSalary)}
              </span>
            </div>
            <div className="text-right text-[11px] text-emerald-800 font-bold">
              Payment Mode: {run.paymentMode || 'CASH'}
              <span className="block text-[10px] font-normal text-gray-500">
                Status: {run.status}
              </span>
            </div>
          </div>

          {/* Signature Sign-offs */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px] text-gray-600">
            <div className="border-t pt-2">
              <p className="font-bold">UP Factory Plant Supervisor</p>
            </div>
            <div className="border-t pt-2">
              <p className="font-bold">Worker Acknowledgment / Sign</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdjustLeaveModal({
  workerId,
  worker,
  month,
  year,
  onClose,
  onSuccess,
}: {
  workerId: string;
  worker?: UpEmployee;
  month: number;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [leaveType, setLeaveType] = useState<'CL' | 'EL'>('CL');
  const [amount, setAmount] = useState('1');
  const [reason, setReason] = useState('Manual balance adjustment');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await upEmployeeService.adjustLeave(workerId, {
        leaveType,
        amount: Number(amount),
        reason,
        month,
        year,
      });
      onSuccess();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Failed to adjust leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a1a] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-bold text-white">Adjust Worker Leave Balance</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-xs text-gray-300">
            Worker: <strong>{worker?.name}</strong>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as any)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200"
            >
              <option value="CL">Casual Leave (CL)</option>
              <option value="EL">Earned Leave (EL)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Adjustment (± Days) *</label>
            <input
              type="number"
              step={0.5}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="+1 or -1"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase">Reason / Justification</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black text-xs font-black transition disabled:opacity-50"
            >
              {isSubmitting ? 'Adjusting...' : 'Update Balance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UPEmployeeManagementPage;
