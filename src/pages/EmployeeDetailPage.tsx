import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Building2,
  Award,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Fuel,
  Navigation,
  Package,
  Receipt,
  Download,
  Eye,
  Trash2,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Car,
  Briefcase,
  Layers,
  Banknote,
  Send,
} from 'lucide-react';
import { employeeService } from '../api/employeeService';
import { useAdminAuth } from '../context/AdminAuthContext';
import type {
  Employee,
  EmployeeConveyanceExpense,
  ConveyanceCategory,
  ConveyancePurpose,
  ConveyancePaymentMode,
  ConveyanceStatus,
  CreateConveyancePayload,
  EmployeeAttendance,
  EmployeePayrollRun,
  EmployeeAdvance,
  EmployeeDeduction,
  EmployeeLeaveLedger,
} from '../types/employee';

// ─── Constants & Category Config ──────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  ConveyanceCategory,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  PETROL: {
    label: 'Petrol / Fuel',
    icon: <Fuel size={14} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  GARIVARA: {
    label: 'Garivara / Fare',
    icon: <Car size={14} />,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  MATERIAL_SHIFTING: {
    label: 'Material Shifting',
    icon: <Package size={14} />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  TOLL_PARKING: {
    label: 'Toll & Parking',
    icon: <Navigation size={14} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  FOOD_ALLOWANCE: {
    label: 'Food Allowance',
    icon: <Briefcase size={14} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  HOTEL_STAY: {
    label: 'Hotel / Stay',
    icon: <Building2 size={14} />,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  OTHER: {
    label: 'Other',
    icon: <Layers size={14} />,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
  },
};

const PURPOSE_LABELS: Record<ConveyancePurpose, string> = {
  SITE_MEASUREMENT: 'Site Measurement',
  SITE_INSPECTION: 'Site Inspection',
  MATERIAL_SHIFTING: 'Material Shifting',
  INSTALLATION_SUPPORT: 'Installation Support',
  CLIENT_MEETING: 'Client Meeting',
  SAMPLE_SUBMISSION: 'Sample Submission',
  MAINTENANCE_SERVICE: 'Maintenance / Service',
  OTHER: 'Other Purpose',
};

const STATUS_CONFIG: Record<
  ConveyanceStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: 'Pending Review',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: <Clock size={12} />,
  },
  APPROVED: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: <CheckCircle2 size={12} />,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    icon: <XCircle size={12} />,
  },
  REIMBURSED: {
    label: 'Reimbursed / Settled',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    icon: <Banknote size={12} />,
  },
};

function formatINR(val: number | string | null | undefined): string {
  const n = Number(val || 0);
  return `\u20B9${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const roleUpper = String(adminUser?.role || '').toUpperCase();
  const isSuperAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN' || adminUser?.role === 'super_admin';

  // ─── Core State ─────────────────────────────────────────────────────────────
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaves' | 'conveyance' | 'attendance' | 'payroll' | 'advances' | 'profile'>('conveyance');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─── Leave Ledger & Balances State ──────────────────────────────────────────
  const [leaveHistory, setLeaveHistory] = useState<EmployeeLeaveLedger[]>([]);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const [isLeaveAdjustModalOpen, setIsLeaveAdjustModalOpen] = useState(false);
  const [leaveAdjustType, setLeaveAdjustType] = useState<'CL' | 'EL'>('CL');
  const [leaveAdjustAction, setLeaveAdjustAction] = useState<'USAGE' | 'ACCRUAL' | 'ADJUSTMENT'>('USAGE');
  const [leaveAdjustAmount, setLeaveAdjustAmount] = useState('1');
  const [leaveAdjustReason, setLeaveAdjustReason] = useState('');
  const [isSubmittingLeaveAdjust, setIsSubmittingLeaveAdjust] = useState(false);

  // ─── Conveyance List & Filters ──────────────────────────────────────────────
  const [conveyances, setConveyances] = useState<EmployeeConveyanceExpense[]>([]);
  const [isLoadingConveyances, setIsLoadingConveyances] = useState(false);
  const [conveyanceSummary, setConveyanceSummary] = useState({
    totalCount: 0,
    totalClaimedAmount: 0,
    totalApprovedAmount: 0,
    totalPendingAmount: 0,
    totalReimbursedAmount: 0,
    petrolAmount: 0,
    garivaraAmount: 0,
    materialShiftingAmount: 0,
    otherAmount: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // ─── Modal States ───────────────────────────────────────────────────────────
  const [isRecordExpenseOpen, setIsRecordExpenseOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [selectedReceiptTitle, setSelectedReceiptTitle] = useState('');

  const [settleModalExpense, setSettleModalExpense] = useState<EmployeeConveyanceExpense | null>(null);
  const [settlePaymentRef, setSettlePaymentRef] = useState('');
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [isSettling, setIsSettling] = useState(false);

  const [rejectModalExpense, setRejectModalExpense] = useState<EmployeeConveyanceExpense | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // ─── Record Expense Form State ──────────────────────────────────────────────
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSiteName, setFormSiteName] = useState('');
  const [formSiteAddress, setFormSiteAddress] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formProjectName, setFormProjectName] = useState('');
  const [formPurpose, setFormPurpose] = useState<ConveyancePurpose>('SITE_MEASUREMENT');
  const [formCategory, setFormCategory] = useState<ConveyanceCategory>('PETROL');
  const [formPaymentMode, setFormPaymentMode] = useState<ConveyancePaymentMode>('PAID_BY_EMPLOYEE');
  const [formAmount, setFormAmount] = useState<string>('');
  // Travel fields
  const [formStartLocation, setFormStartLocation] = useState('');
  const [formEndLocation, setFormEndLocation] = useState('');
  const [formTransportMode, setFormTransportMode] = useState('Bike / Two Wheeler');
  const [formDistanceKm, setFormDistanceKm] = useState<string>('');
  const [formRatePerKm, setFormRatePerKm] = useState<string>('3.50');
  // Material shifting fields
  const [formShiftingType, setFormShiftingType] = useState('Partition Sample Panels');
  const [formMaterialDetails, setFormMaterialDetails] = useState('');
  // Proof fields
  const [formReceiptUrl, setFormReceiptUrl] = useState('');
  const [formReceiptNumber, setFormReceiptNumber] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Auto calculate petrol amount if distance and rate are provided
  useEffect(() => {
    if (formCategory === 'PETROL' && formDistanceKm && formRatePerKm) {
      const dist = parseFloat(formDistanceKm);
      const rate = parseFloat(formRatePerKm);
      if (!isNaN(dist) && !isNaN(rate) && dist > 0 && rate > 0) {
        setFormAmount((dist * rate).toFixed(2));
      }
    }
  }, [formCategory, formDistanceKm, formRatePerKm]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ─── Load Employee Data ─────────────────────────────────────────────────────
  const loadEmployee = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const emp = await employeeService.getEmployee(id);
      setEmployee(emp);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to load employee details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // ─── Load Conveyance Expenses ───────────────────────────────────────────────
  const loadConveyances = useCallback(async () => {
    if (!id) return;
    setIsLoadingConveyances(true);
    try {
      const res = await employeeService.listConveyanceExpenses({
        employeeId: id,
        category: categoryFilter !== 'ALL' ? (categoryFilter as ConveyanceCategory) : undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as ConveyanceStatus) : undefined,
        search: searchQuery || undefined,
        limit: 100,
      });
      setConveyances(res.items);
      setConveyanceSummary(res.summary);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to load site visit expenses');
    } finally {
      setIsLoadingConveyances(false);
    }
  }, [id, categoryFilter, statusFilter, searchQuery]);

  // ─── Load Leave History ─────────────────────────────────────────────────────
  const loadLeaveLedger = useCallback(async () => {
    if (!id) return;
    setIsLoadingLeaves(true);
    try {
      const res = await employeeService.getLeaveLedger(id);
      setLeaveHistory(res.history || []);
      if (res.employee) {
        setEmployee((prev) =>
          prev
            ? { ...prev, clBalance: res.employee.clBalance, elBalance: res.employee.elBalance }
            : prev
        );
      }
    } catch (err: any) {
      console.warn('Failed to load leave ledger:', err);
    } finally {
      setIsLoadingLeaves(false);
    }
  }, [id]);

  useEffect(() => {
    loadEmployee();
    loadConveyances();
    loadLeaveLedger();
  }, [loadEmployee, loadConveyances, loadLeaveLedger]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleAdjustLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const amt = parseFloat(leaveAdjustAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('error', 'Please enter a valid leave amount');
      return;
    }
    if (!leaveAdjustReason.trim()) {
      showToast('error', 'Please provide a reason for the leave transaction');
      return;
    }

    setIsSubmittingLeaveAdjust(true);
    try {
      const res = await employeeService.adjustLeave(id, {
        leaveType: leaveAdjustType,
        transactionType: leaveAdjustAction,
        amount: amt,
        reason: leaveAdjustReason.trim(),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      });
      showToast('success', `Leave adjusted successfully. New ${leaveAdjustType} balance: ${res.currentBalance}`);
      setIsLeaveAdjustModalOpen(false);
      setLeaveAdjustReason('');
      setLeaveAdjustAmount('1');
      await loadEmployee();
      await loadLeaveLedger();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to adjust leave');
    } finally {
      setIsSubmittingLeaveAdjust(false);
    }
  };
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !formSiteName.trim() || !formAmount || parseFloat(formAmount) <= 0) {
      showToast('error', 'Please provide a valid site name and amount');
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const payload: CreateConveyancePayload = {
        employeeId: id,
        visitDate: formDate,
        siteName: formSiteName.trim(),
        siteAddress: formSiteAddress.trim() || undefined,
        clientName: formClientName.trim() || undefined,
        projectName: formProjectName.trim() || undefined,
        purpose: formPurpose,
        category: formCategory,
        paymentMode: formPaymentMode,
        amount: parseFloat(formAmount),
        startLocation: formStartLocation.trim() || undefined,
        endLocation: formEndLocation.trim() || undefined,
        transportMode: formTransportMode.trim() || undefined,
        distanceKm: formDistanceKm ? parseFloat(formDistanceKm) : undefined,
        ratePerKm: formRatePerKm ? parseFloat(formRatePerKm) : undefined,
        shiftingType: formCategory === 'MATERIAL_SHIFTING' ? formShiftingType.trim() : undefined,
        materialDetails: formMaterialDetails.trim() || undefined,
        receiptUrl: formReceiptUrl.trim() || undefined,
        receiptNumber: formReceiptNumber.trim() || undefined,
        remarks: formRemarks.trim() || undefined,
      };

      await employeeService.createConveyanceExpense(payload);
      showToast('success', 'Site visit expense recorded successfully!');
      setIsRecordExpenseOpen(false);
      // Reset form
      setFormSiteName('');
      setFormSiteAddress('');
      setFormClientName('');
      setFormProjectName('');
      setFormAmount('');
      setFormDistanceKm('');
      setFormMaterialDetails('');
      setFormReceiptUrl('');
      setFormReceiptNumber('');
      setFormRemarks('');
      loadConveyances();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to record expense');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    try {
      await employeeService.approveConveyanceExpense(expenseId);
      showToast('success', 'Expense claim approved successfully');
      loadConveyances();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to approve expense');
    }
  };

  const handleOpenRejectModal = (expense: EmployeeConveyanceExpense) => {
    setRejectModalExpense(expense);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalExpense || !rejectReason.trim()) {
      showToast('error', 'Please enter a rejection reason');
      return;
    }
    setIsRejecting(true);
    try {
      await employeeService.rejectConveyanceExpense(rejectModalExpense.id, rejectReason.trim());
      showToast('success', 'Expense claim rejected');
      setRejectModalExpense(null);
      loadConveyances();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to reject expense');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleOpenSettleModal = (expense: EmployeeConveyanceExpense) => {
    setSettleModalExpense(expense);
    setSettleAmount(String(expense.amount));
    setSettlePaymentRef('');
  };

  const handleConfirmSettle = async () => {
    if (!settleModalExpense || !settlePaymentRef.trim()) {
      showToast('error', 'Please enter payment reference / transaction details');
      return;
    }
    setIsSettling(true);
    try {
      await employeeService.settleConveyanceExpense(settleModalExpense.id, {
        paymentRef: settlePaymentRef.trim(),
        reimbursedAmount: settleAmount ? parseFloat(settleAmount) : undefined,
      });
      showToast('success', 'Expense reimbursed and settled successfully');
      setSettleModalExpense(null);
      loadConveyances();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to settle expense');
    } finally {
      setIsSettling(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await employeeService.deleteConveyanceExpense(expenseId);
      showToast('success', 'Expense record deleted');
      loadConveyances();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete expense');
    }
  };

  // ─── Render Loading / Not Found ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030213] text-white flex flex-col items-center justify-center p-6">
        <RefreshCw className="animate-spin text-[#7FB706] mb-3" size={32} />
        <p className="text-gray-400 text-sm">Loading employee profile & convenience records...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-[#030213] text-white p-6 flex flex-col items-center justify-center">
        <AlertCircle className="text-rose-400 mb-3" size={40} />
        <h2 className="text-xl font-bold mb-2">Employee Not Found</h2>
        <p className="text-gray-400 text-sm mb-6">The employee record requested does not exist or was removed.</p>
        <Link
          to="/admin/dashboard/employees"
          className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] text-white rounded-xl text-sm font-medium hover:bg-[#6ea105] transition"
        >
          <ArrowLeft size={16} /> Return to Employee Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030213] text-white p-3 sm:p-6 space-y-6">
      {/* ── Toast Feedback ───────────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm shadow-2xl backdrop-blur-md transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── Top Navigation / Back Bar ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/admin/dashboard/employees')}
          className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10"
        >
          <ArrowLeft size={16} /> Back to Directory
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRecordExpenseOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#7FB706] hover:bg-[#6ea105] text-white text-xs sm:text-sm font-medium rounded-xl shadow-lg shadow-[#7FB706]/20 transition"
          >
            <Plus size={16} /> Record Site Visit Expense
          </button>
        </div>
      </div>

      {/* ── Employee Hero Profile Card ───────────────────────────────────── */}
      <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7FB706]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#7FB706]/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-xl sm:text-2xl font-bold text-[#7FB706] shrink-0 shadow-inner">
              {employee.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">{employee.name}</h1>
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {employee.employeeId}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border ${
                    employee.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {employee.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-400">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <Briefcase size={14} className="text-[#7FB706]" />
                  <span>{employee.designation}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-blue-400" />
                  <span>{employee.department}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-purple-400" />
                  <span>Joined {new Date(employee.joiningDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 pt-1">
                <a
                  href={`tel:${employee.phone}`}
                  className="flex items-center gap-1 text-gray-300 hover:text-[#7FB706] transition"
                >
                  <Phone size={13} className="text-[#7FB706]" /> {employee.phone}
                </a>
                <a
                  href={`mailto:${employee.email}`}
                  className="flex items-center gap-1 text-gray-300 hover:text-blue-400 transition"
                >
                  <Mail size={13} className="text-blue-400" /> {employee.email}
                </a>
                <div className="flex items-center gap-1 text-gray-400">
                  <MapPin size={13} className="text-amber-400" /> {employee.address || 'Delhi / NCR'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats on Right */}
          <div className="flex flex-wrap md:flex-col items-end gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
            <div className="bg-[#030213] border border-white/10 rounded-xl px-4 py-2 text-right">
              <span className="text-[11px] text-gray-500 uppercase tracking-wider block">Monthly CTC</span>
              <span className="text-lg font-bold text-white">{formatINR(employee.monthlyCtc)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('leaves')}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 transition cursor-pointer"
                title="View Leave Balances & History"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400/80">CL:</span>
                <span className="text-sm font-extrabold text-blue-300 font-mono">
                  {Number(employee.clBalance || 0).toFixed(1)}
                </span>
                <span className="text-[10px] text-blue-400/70">days</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('leaves')}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/25 transition cursor-pointer"
                title="View Leave Balances & History"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400/80">EL:</span>
                <span className="text-sm font-extrabold text-purple-300 font-mono">
                  {Number(employee.elBalance || 0).toFixed(1)}
                </span>
                <span className="text-[10px] text-purple-400/70">days</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-2 no-scrollbar">
        {[
          {
            id: 'leaves',
            label: 'Leave Balances & History',
            icon: <Award size={16} />,
            badge: leaveHistory.length,
          },
          {
            id: 'conveyance',
            label: 'Site Visits & Convenience Expenses',
            icon: <Fuel size={16} />,
            badge: conveyances.length,
          },
          {
            id: 'profile',
            label: 'Personal & Banking Profile',
            icon: <User size={16} />,
          },
          {
            id: 'attendance',
            label: 'Attendance History',
            icon: <Calendar size={16} />,
          },
          {
            id: 'payroll',
            label: 'Payroll & Payslips',
            icon: <FileText size={16} />,
            badge: employee.payrollRuns?.length,
          },
          {
            id: 'advances',
            label: 'Advances & Deductions',
            icon: <DollarSign size={16} />,
            badge: (employee.advances?.length || 0) + (employee.deductions?.length || 0),
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 0: LEAVE BALANCES & TRANSACTION LEDGER
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          {/* Leave Balances Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CL Card */}
            <div className="bg-[#0a091e] border border-blue-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
                    Casual Leave (CL)
                  </span>
                  <div className="text-3xl font-extrabold text-white mt-2 font-mono">
                    {Number(employee.clBalance || 0).toFixed(1)}
                    <span className="text-sm font-normal text-gray-400 ml-1.5">days</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Award size={22} />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span>Monthly Auto-Accrual:</span>
                <span className="text-emerald-400 font-semibold font-mono">+1.00 Day / Month</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Added automatically every month. Deducts 1 day on CL attendance.
              </div>
            </div>

            {/* EL Card */}
            <div className="bg-[#0a091e] border border-purple-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider block">
                    Earned Leave (EL)
                  </span>
                  <div className="text-3xl font-extrabold text-white mt-2 font-mono">
                    {Number(employee.elBalance || 0).toFixed(1)}
                    <span className="text-sm font-normal text-gray-400 ml-1.5">days</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                  <Calendar size={22} />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span>Monthly Auto-Accrual:</span>
                <span className="text-emerald-400 font-semibold font-mono">+1.00 Day / Month</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Added automatically every month. Deducts 1 day on EL attendance.
              </div>
            </div>

            {/* Policy & Quick Action Card */}
            <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Automated Leave System
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Clean Slate Active
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-2.5 leading-relaxed">
                  Starting this current month, all active employees automatically receive <strong>1.00 CL</strong> and <strong>1.00 EL</strong> every month. Using leaves in attendance auto-deducts balance in real time.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLeaveAdjustType('CL');
                    setLeaveAdjustAction('USAGE');
                    setLeaveAdjustAmount('1');
                    setLeaveAdjustReason('');
                    setIsLeaveAdjustModalOpen(true);
                  }}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Adjust / Apply Leave
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loadEmployee();
                    loadLeaveLedger();
                  }}
                  disabled={isLoadingLeaves}
                  className="p-2 bg-[#030213] hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition cursor-pointer"
                  title="Refresh leave balance and history"
                >
                  <RefreshCw size={14} className={isLoadingLeaves ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Leave Movement History Table */}
          <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award size={18} className="text-blue-400" /> Leave Ledger & Movement History
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Complete audit log of automatic monthly accruals, attendance usage deductions, and administrative adjustments.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/10 font-mono">
                  {leaveHistory.length} Transactions
                </span>
              </div>
            </div>

            {isLoadingLeaves ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-xs gap-2">
                <RefreshCw size={16} className="animate-spin text-blue-400" /> Loading leave history...
              </div>
            ) : leaveHistory.length === 0 ? (
              <div className="text-center py-12 bg-[#030213] rounded-xl border border-white/5 space-y-2">
                <Award size={28} className="mx-auto text-gray-600" />
                <p className="text-xs text-gray-400">No leave movements recorded yet for this employee.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#030213] text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                      <th className="py-2.5 px-3 font-semibold">Leave Type</th>
                      <th className="py-2.5 px-3 font-semibold">Action Type</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Days</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Balance After</th>
                      <th className="py-2.5 px-4 font-semibold">Reason / Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leaveHistory.map((item) => {
                      const amt = Number(item.amount || 0);
                      const isCredit = amt > 0;
                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-3 text-gray-300 font-mono whitespace-nowrap">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : `Month ${item.month}/${item.year}`}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${
                                item.leaveType === 'CL'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              }`}
                            >
                              {item.leaveType}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                item.transactionType === 'ACCRUAL'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : item.transactionType === 'USAGE'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {item.transactionType === 'ACCRUAL'
                                ? 'Monthly Accrual'
                                : item.transactionType === 'USAGE'
                                ? 'Leave Consumed'
                                : 'Adjustment'}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                              isCredit ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isCredit ? `+${amt.toFixed(2)}` : amt.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-white font-semibold whitespace-nowrap">
                            {Number(item.balanceAfter || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-gray-300 max-w-md">
                            {item.reason || 'Leave transaction'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 1: SITE VISITS & CONVENIENCE EXPENSES (PRIMARY USER REQUIREMENT)
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'conveyance' && (
        <div className="space-y-6">
          {/* Top KPI Metrics for Convenience Expenses */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="text-xs uppercase tracking-wider">Total Claims</span>
                <Fuel size={18} className="text-[#7FB706]" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {formatINR(conveyanceSummary.totalClaimedAmount)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{conveyanceSummary.totalCount} site visit vouchers</div>
            </div>

            <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="text-xs uppercase tracking-wider">Approved</span>
                <CheckCircle2 size={18} className="text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                {formatINR(conveyanceSummary.totalApprovedAmount)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Ready for payout / reimbursed</div>
            </div>

            <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="text-xs uppercase tracking-wider">Pending Review</span>
                <Clock size={18} className="text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-400">
                {formatINR(conveyanceSummary.totalPendingAmount)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Awaiting manager approval</div>
            </div>

            <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="text-xs uppercase tracking-wider">Reimbursed / Settled</span>
                <Banknote size={18} className="text-teal-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-teal-400">
                {formatINR(conveyanceSummary.totalReimbursedAmount)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Paid to employee</div>
            </div>
          </div>

          {/* Category Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#030213] border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Fuel size={20} />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider block">Petrol / Fuel</span>
                <span className="text-base sm:text-lg font-bold text-amber-400">
                  {formatINR(conveyanceSummary.petrolAmount)}
                </span>
              </div>
            </div>

            <div className="bg-[#030213] border border-cyan-500/20 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Car size={20} />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider block">Garivara / Fares</span>
                <span className="text-base sm:text-lg font-bold text-cyan-400">
                  {formatINR(conveyanceSummary.garivaraAmount)}
                </span>
              </div>
            </div>

            <div className="bg-[#030213] border border-purple-500/20 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Package size={20} />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider block">Material Shifting</span>
                <span className="text-base sm:text-lg font-bold text-purple-400">
                  {formatINR(conveyanceSummary.materialShiftingAmount)}
                </span>
              </div>
            </div>

            <div className="bg-[#030213] border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Navigation size={20} />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider block">Tolls & Other</span>
                <span className="text-base sm:text-lg font-bold text-blue-400">
                  {formatINR(conveyanceSummary.otherAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Filters & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a091e] p-3 rounded-2xl border border-white/10">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search site, client, voucher, material..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#030213] border border-white/10 text-xs sm:text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#7FB706]"
              >
                <option value="ALL">All Categories</option>
                <option value="PETROL">Petrol / Fuel</option>
                <option value="GARIVARA">Garivara / Transit</option>
                <option value="MATERIAL_SHIFTING">Material Shifting</option>
                <option value="TOLL_PARKING">Toll & Parking</option>
                <option value="FOOD_ALLOWANCE">Food Allowance</option>
                <option value="HOTEL_STAY">Hotel Stay</option>
                <option value="OTHER">Other Expenses</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#030213] border border-white/10 text-xs sm:text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#7FB706]"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REIMBURSED">Reimbursed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <button
              onClick={() => setIsRecordExpenseOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#7FB706] hover:bg-[#6ea105] text-white text-xs sm:text-sm font-medium rounded-xl transition"
            >
              <Plus size={16} /> New Visit Claim
            </button>
          </div>

          {/* Expenses Table (Desktop) */}
          <div className="bg-[#0a091e] border border-white/10 rounded-2xl overflow-hidden shadow-xl hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#030213] text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3.5">Voucher & Date</th>
                    <th className="px-4 py-3.5">Site & Client Details</th>
                    <th className="px-4 py-3.5">Category & Purpose</th>
                    <th className="px-4 py-3.5">Travel / Shifting Details</th>
                    <th className="px-4 py-3.5">Payment Mode</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Receipt</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {isLoadingConveyances ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                        <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                        Loading convenience records...
                      </td>
                    </tr>
                  ) : conveyances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                        No site visit expenses recorded for this employee yet. Click &quot;New Visit Claim&quot; to record expenses.
                      </td>
                    </tr>
                  ) : (
                    conveyances.map((c) => {
                      const catConf = CATEGORY_CONFIG[c.category] || CATEGORY_CONFIG.OTHER;
                      const statConf = STATUS_CONFIG[c.status] || STATUS_CONFIG.PENDING;

                      return (
                        <tr key={c.id} className="hover:bg-white/5 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-mono text-xs font-semibold text-amber-300">
                              {c.voucherNumber}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(c.visitDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-medium text-white">{c.siteName}</div>
                            {c.clientName && (
                              <div className="text-xs text-gray-400">Client: {c.clientName}</div>
                            )}
                            {c.siteAddress && (
                              <div className="text-[11px] text-gray-500 truncate max-w-xs">{c.siteAddress}</div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${catConf.bg} ${catConf.color} ${catConf.border} font-medium`}
                              >
                                {catConf.icon} {catConf.label}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {PURPOSE_LABELS[c.purpose] || c.purpose}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-xs text-gray-300">
                            {c.category === 'PETROL' && (
                              <div>
                                <span className="text-amber-400 font-medium">
                                  {c.distanceKm ? `${c.distanceKm} km` : 'Fuel claim'}
                                </span>{' '}
                                {c.ratePerKm ? `@ \u20B9${c.ratePerKm}/km` : ''}
                                {c.transportMode && (
                                  <div className="text-[11px] text-gray-500">{c.transportMode}</div>
                                )}
                              </div>
                            )}

                            {c.category === 'GARIVARA' && (
                              <div>
                                <div className="text-cyan-300">
                                  {c.startLocation && c.endLocation
                                    ? `${c.startLocation} \u2192 ${c.endLocation}`
                                    : c.transportMode || 'Transit fare'}
                                </div>
                                {c.transportMode && (
                                  <div className="text-[11px] text-gray-500">{c.transportMode}</div>
                                )}
                              </div>
                            )}

                            {c.category === 'MATERIAL_SHIFTING' && (
                              <div>
                                <div className="text-purple-300 font-medium">{c.shiftingType || 'Sample / Hardware'}</div>
                                {c.materialDetails && (
                                  <div className="text-[11px] text-gray-400 truncate max-w-xs">
                                    {c.materialDetails}
                                  </div>
                                )}
                              </div>
                            )}

                            {c.category !== 'PETROL' &&
                              c.category !== 'GARIVARA' &&
                              c.category !== 'MATERIAL_SHIFTING' && (
                                <div className="text-gray-400">{c.remarks || '—'}</div>
                              )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded border font-mono ${
                                c.paymentMode === 'PAID_BY_EMPLOYEE'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}
                            >
                              {c.paymentMode === 'PAID_BY_EMPLOYEE' ? 'Paid by Employee' : c.paymentMode}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-bold text-white text-base">
                            {formatINR(c.amount)}
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border ${statConf.bg} ${statConf.color} ${statConf.border} font-medium`}
                            >
                              {statConf.icon} {statConf.label}
                            </span>
                            {c.rejectionReason && (
                              <div className="text-[10px] text-rose-400 mt-1 max-w-[140px] truncate" title={c.rejectionReason}>
                                Reason: {c.rejectionReason}
                              </div>
                            )}
                            {c.reimbursedRef && (
                              <div className="text-[10px] text-teal-400 mt-1 font-mono">
                                Ref: {c.reimbursedRef}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {c.receiptUrl ? (
                              <button
                                onClick={() => {
                                  setSelectedReceiptUrl(c.receiptUrl!);
                                  setSelectedReceiptTitle(`${c.voucherNumber} — ${c.siteName}`);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-blue-400 text-xs transition"
                              >
                                <Receipt size={13} /> View
                              </button>
                            ) : c.receiptNumber ? (
                              <span className="text-[11px] font-mono text-gray-500">#{c.receiptNumber}</span>
                            ) : (
                              <span className="text-[11px] text-gray-600 italic">No bill</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {c.status === 'PENDING' && isSuperAdmin && (
                              <>
                                <button
                                  onClick={() => handleApproveExpense(c.id)}
                                  className="p-1.5 text-gray-400 hover:text-emerald-400 transition"
                                  title="Approve Claim"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => handleOpenRejectModal(c)}
                                  className="p-1.5 text-gray-400 hover:text-rose-400 transition"
                                  title="Reject Claim"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}

                            {c.status === 'APPROVED' && !c.isReimbursed && isSuperAdmin && (
                              <button
                                onClick={() => handleOpenSettleModal(c)}
                                className="px-2.5 py-1 text-xs bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg transition"
                                title="Reimburse / Settle Payment"
                              >
                                Reimburse
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteExpense(c.id)}
                              className="p-1.5 text-gray-500 hover:text-rose-400 transition"
                              title="Delete Record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View (Responsive) */}
          <div className="md:hidden space-y-3">
            {isLoadingConveyances ? (
              <div className="py-12 text-center text-gray-500">
                <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                Loading expenses...
              </div>
            ) : conveyances.length === 0 ? (
              <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-6 text-center text-gray-500 text-sm">
                No site visit expenses recorded yet. Tap &quot;New Visit Claim&quot; to add.
              </div>
            ) : (
              conveyances.map((c) => {
                const catConf = CATEGORY_CONFIG[c.category] || CATEGORY_CONFIG.OTHER;
                const statConf = STATUS_CONFIG[c.status] || STATUS_CONFIG.PENDING;

                return (
                  <div
                    key={c.id}
                    className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-xs font-semibold text-amber-300">
                          {c.voucherNumber}
                        </div>
                        <div className="text-base font-bold text-white mt-0.5">{c.siteName}</div>
                        {c.clientName && (
                          <div className="text-xs text-gray-400">Client: {c.clientName}</div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{formatINR(c.amount)}</div>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${statConf.bg} ${statConf.color} ${statConf.border} font-medium mt-1`}
                        >
                          {statConf.icon} {statConf.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${catConf.bg} ${catConf.color} ${catConf.border} font-medium`}
                      >
                        {catConf.icon} {catConf.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                        {PURPOSE_LABELS[c.purpose] || c.purpose}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                        {new Date(c.visitDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Category details snippet */}
                    {c.category === 'PETROL' && (
                      <div className="text-xs bg-[#030213] p-2 rounded-xl text-gray-300">
                        <span className="text-amber-400 font-medium">{c.distanceKm} km</span>{' '}
                        {c.ratePerKm && `@ \u20B9${c.ratePerKm}/km`} • {c.transportMode || 'Two Wheeler'}
                      </div>
                    )}
                    {c.category === 'GARIVARA' && (
                      <div className="text-xs bg-[#030213] p-2 rounded-xl text-cyan-300">
                        {c.startLocation && c.endLocation ? `${c.startLocation} \u2192 ${c.endLocation}` : c.transportMode || 'Transit fare'}
                      </div>
                    )}
                    {c.category === 'MATERIAL_SHIFTING' && (
                      <div className="text-xs bg-[#030213] p-2 rounded-xl text-purple-300">
                        <div className="font-medium">{c.shiftingType}</div>
                        {c.materialDetails && <div className="text-gray-400 text-[11px]">{c.materialDetails}</div>}
                      </div>
                    )}

                    {/* Rejection / Reimbursement notes */}
                    {c.rejectionReason && (
                      <div className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2 rounded-xl">
                        Rejection Reason: {c.rejectionReason}
                      </div>
                    )}
                    {c.reimbursedRef && (
                      <div className="text-xs bg-teal-500/10 border border-teal-500/20 text-teal-300 p-2 rounded-xl font-mono">
                        Settled Ref: {c.reimbursedRef}
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div>
                        {c.receiptUrl ? (
                          <button
                            onClick={() => {
                              setSelectedReceiptUrl(c.receiptUrl!);
                              setSelectedReceiptTitle(`${c.voucherNumber} — ${c.siteName}`);
                              setIsReceiptModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                          >
                            <Receipt size={13} /> View Receipt
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-500">No Receipt</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {c.status === 'PENDING' && isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleApproveExpense(c.id)}
                              className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(c)}
                              className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {c.status === 'APPROVED' && !c.isReimbursed && isSuperAdmin && (
                          <button
                            onClick={() => handleOpenSettleModal(c)}
                            className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-lg text-xs font-medium"
                          >
                            Reimburse
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteExpense(c.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 2: PERSONAL & BANKING PROFILE
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <User size={18} className="text-[#7FB706]" /> Personal & Identification Details
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-500 block">Full Name</span>
                <span className="font-medium text-white">{employee.name}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Employee Code</span>
                <span className="font-mono font-bold text-amber-300">{employee.employeeId}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Phone</span>
                <span className="text-white">{employee.phone}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Email</span>
                <span className="text-white">{employee.email}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Govt ID Type</span>
                <span className="text-white">{employee.governmentIdType}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Govt ID Number</span>
                <span className="font-mono text-white">{employee.governmentIdNumber}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 block">Residential Address</span>
                <span className="text-white">{employee.address || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 block">Job Responsibilities</span>
                <span className="text-white">{employee.responsibilities || 'Standard duties'}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <CreditCard size={18} className="text-blue-400" /> Salary Disbursement Account
            </h3>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-500 block">Bank Name</span>
                <span className="font-medium text-white text-base">
                  {employee.bankName || 'Not Provided / Manual Disbursement'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Account Number</span>
                <span className="font-mono text-white text-base">
                  {employee.bankAccountNumber || '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">IFSC Code</span>
                <span className="font-mono text-white">{employee.bankIfsc || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Account Holder Name</span>
                <span className="text-white">{employee.bankAccountHolder || employee.name}</span>
              </div>
              <div className="pt-2 border-t border-white/10">
                <span className="text-gray-500 block">Designated Monthly CTC</span>
                <span className="text-xl font-bold text-[#7FB706]">{formatINR(employee.monthlyCtc)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 3: ATTENDANCE HISTORY
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-purple-400" /> Attendance Logs & Leave Balances
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('leaves')}
                className="text-xs px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-mono transition cursor-pointer"
                title="View full CL ledger history"
              >
                Casual Leave (CL): {Number(employee.clBalance || 0).toFixed(1)}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('leaves')}
                className="text-xs px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 font-mono transition cursor-pointer"
                title="View full EL ledger history"
              >
                Earned Leave (EL): {Number(employee.elBalance || 0).toFixed(1)}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            Attendance records for {employee.name} are synchronized daily in the main Attendance Matrix.
            Marking CL or EL automatically debits the respective leave balance in real time.
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              to="/admin/dashboard/employees"
              className="inline-flex items-center gap-2 text-xs text-[#7FB706] hover:underline"
            >
              Open Company Attendance Matrix <ChevronRight size={14} />
            </Link>
            <button
              type="button"
              onClick={() => setActiveTab('leaves')}
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline cursor-pointer"
            >
              <Award size={14} /> View Leave Balances & History
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 4: PAYROLL & PAYSLIPS
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'payroll' && (
        <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <FileText size={18} className="text-emerald-400" /> Payroll History & Payslips
          </h3>

          {(!employee.payrollRuns || employee.payrollRuns.length === 0) ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              No payroll runs recorded for this employee yet. Run monthly payroll to generate payslips.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#030213] text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">Month / Year</th>
                    <th className="px-4 py-3">Gross Salary</th>
                    <th className="px-4 py-3">Deductions</th>
                    <th className="px-4 py-3">Net Payable</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {employee.payrollRuns.map((run: any) => (
                    <tr key={run.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 font-medium text-white">
                        {new Date(run.year, run.month - 1).toLocaleDateString('en-IN', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-white">{formatINR(run.grossSalary)}</td>
                      <td className="px-4 py-3 text-rose-400">{formatINR(run.totalDeductions)}</td>
                      <td className="px-4 py-3 font-bold text-[#7FB706]">{formatINR(run.netSalary)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            run.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => employeeService.downloadPayslipPdf(run.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs transition"
                        >
                          <Download size={13} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 5: ADVANCES & DEDUCTIONS
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'advances' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <DollarSign size={18} className="text-amber-400" /> Salary Advances
            </h3>
            {(!employee.advances || employee.advances.length === 0) ? (
              <div className="py-8 text-center text-gray-500 text-sm">No advances on record</div>
            ) : (
              <div className="space-y-2">
                {employee.advances.map((adv: any) => (
                  <div
                    key={adv.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#030213] border border-white/10"
                  >
                    <div>
                      <div className="font-bold text-white">{formatINR(adv.amount)}</div>
                      <div className="text-xs text-gray-400">{adv.reason}</div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        adv.isRecovered
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {adv.isRecovered ? 'Recovered' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <CreditCard size={18} className="text-rose-400" /> Deductions History
            </h3>
            {(!employee.deductions || employee.deductions.length === 0) ? (
              <div className="py-8 text-center text-gray-500 text-sm">No deductions on record</div>
            ) : (
              <div className="space-y-2">
                {employee.deductions.map((ded: any) => (
                  <div
                    key={ded.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#030213] border border-white/10"
                  >
                    <div>
                      <div className="font-bold text-rose-400">-{formatINR(ded.amount)}</div>
                      <div className="text-xs text-gray-400">{ded.reason}</div>
                    </div>
                    <span className="text-xs text-gray-500">
                      Month {ded.applyMonth}/{ded.applyYear}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: RECORD SITE VISIT & CONVENIENCE EXPENSE
      ════════════════════════════════════════════════════════════════════════ */}
      {isRecordExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0a091e] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Fuel size={20} className="text-[#7FB706]" /> Record Site Visit / Convenience Expense
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Claim convenience expenses for site measurements, material shifting, petrol, and fares.
                </p>
              </div>
              <button
                onClick={() => setIsRecordExpenseOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              {/* Employee & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Employee</label>
                  <input
                    type="text"
                    disabled
                    value={`${employee.name} (${employee.employeeId})`}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-gray-300 opacity-80 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Date of Visit *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>

              {/* Site & Client Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Site Name / Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DLF CyberCity Tower B, Okhla Phase 3"
                    value={formSiteName}
                    onChange={(e) => setFormSiteName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Client / Project</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp Restroom Project"
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>

              {/* Purpose & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Visit Purpose *</label>
                  <select
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value as ConveyancePurpose)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="SITE_MEASUREMENT">Site Measurement</option>
                    <option value="SITE_INSPECTION">Site Inspection / Survey</option>
                    <option value="MATERIAL_SHIFTING">Material Shifting</option>
                    <option value="INSTALLATION_SUPPORT">Installation Support</option>
                    <option value="CLIENT_MEETING">Client Meeting</option>
                    <option value="SAMPLE_SUBMISSION">Sample Submission</option>
                    <option value="MAINTENANCE_SERVICE">Maintenance / Service</option>
                    <option value="OTHER">Other Purpose</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const cat = e.target.value as ConveyanceCategory;
                      setFormCategory(cat);
                      if (cat === 'PETROL') {
                        setFormTransportMode('Bike / Two Wheeler');
                        setFormRatePerKm('3.50');
                      } else if (cat === 'GARIVARA') {
                        setFormTransportMode('Auto / Taxi / Metro');
                      } else if (cat === 'MATERIAL_SHIFTING') {
                        setFormTransportMode('Tata Ace / Tempo');
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="PETROL">⛽ Petrol / Fuel Allowance</option>
                    <option value="GARIVARA">🛺 Garivara / Fares (Auto, Cab, Metro)</option>
                    <option value="MATERIAL_SHIFTING">📦 Material Shifting (Tempo, Samples)</option>
                    <option value="TOLL_PARKING">🅿️ Toll & Parking Charges</option>
                    <option value="FOOD_ALLOWANCE">🍲 Food / Meal Allowance</option>
                    <option value="HOTEL_STAY">🏨 Hotel / Stay</option>
                    <option value="OTHER">Other Expense</option>
                  </select>
                </div>
              </div>

              {/* ── Category Specific Conditional Fields ───────────────── */}

              {/* 1. Petrol / Fuel Calculation */}
              {formCategory === 'PETROL' && (
                <div className="bg-[#030213] border border-amber-500/20 rounded-xl p-3.5 space-y-3">
                  <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Fuel size={14} /> Mileage & Petrol Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Transport Vehicle</label>
                      <select
                        value={formTransportMode}
                        onChange={(e) => setFormTransportMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      >
                        <option value="Bike / Two Wheeler">Bike / Two Wheeler</option>
                        <option value="Scooter">Scooter</option>
                        <option value="Car / Four Wheeler">Car / Four Wheeler</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Distance (km)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 24.5"
                        value={formDistanceKm}
                        onChange={(e) => setFormDistanceKm(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Rate / km (\u20B9)</label>
                      <input
                        type="number"
                        step="0.25"
                        placeholder="3.50"
                        value={formRatePerKm}
                        onChange={(e) => setFormRatePerKm(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <input
                      type="text"
                      placeholder="Start point (e.g. Factory, Noida)"
                      value={formStartLocation}
                      onChange={(e) => setFormStartLocation(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Destination (e.g. Site, Gurugram)"
                      value={formEndLocation}
                      onChange={(e) => setFormEndLocation(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* 2. Garivara / Transit Fares */}
              {formCategory === 'GARIVARA' && (
                <div className="bg-[#030213] border border-cyan-500/20 rounded-xl p-3.5 space-y-3">
                  <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Car size={14} /> Journey & Garivara Fares
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Transport Mode</label>
                      <select
                        value={formTransportMode}
                        onChange={(e) => setFormTransportMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      >
                        <option value="Auto / Rickshaw">Auto / Rickshaw</option>
                        <option value="Cab / Taxi / Uber">Cab / Taxi / Uber</option>
                        <option value="Metro Train">Metro Train</option>
                        <option value="Bus / Public Transit">Bus / Public Transit</option>
                        <option value="Rapido / Bike Taxi">Rapido / Bike Taxi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">From (Origin)</label>
                      <input
                        type="text"
                        placeholder="e.g. Anand Vihar ISBT"
                        value={formStartLocation}
                        onChange={(e) => setFormStartLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">To (Destination)</label>
                      <input
                        type="text"
                        placeholder="e.g. Site Office, Noida Sec 62"
                        value={formEndLocation}
                        onChange={(e) => setFormEndLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Material Shifting */}
              {formCategory === 'MATERIAL_SHIFTING' && (
                <div className="bg-[#030213] border border-purple-500/20 rounded-xl p-3.5 space-y-3">
                  <div className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                    <Package size={14} /> Material Shifting & Freight Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Shifting Type / Items</label>
                      <select
                        value={formShiftingType}
                        onChange={(e) => setFormShiftingType(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      >
                        <option value="Partition Sample Panels">Partition Sample Panels</option>
                        <option value="Hardware Fitting Box">Hardware Fitting Box</option>
                        <option value="Tools & Tripod / Laser Level">Tools & Tripod / Laser Level</option>
                        <option value="Glass / Compact Laminate Replacement Panel">Glass / Replacement Panel</option>
                        <option value="Porter / Labor Manual Handling">Porter / Manual Shifting</option>
                        <option value="Chhota Hathi / Tata Ace Tempo">Chhota Hathi / Tata Ace Tempo</option>
                        <option value="Other Material Freight">Other Material Freight</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Transport Vehicle / Helper</label>
                      <input
                        type="text"
                        placeholder="e.g. Porter App, Local Tempo DL1LA-1234"
                        value={formTransportMode}
                        onChange={(e) => setFormTransportMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Material / Load Details</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. 4 cubicle compact laminate sample panels shifted from plant to site for architect inspection"
                      value={formMaterialDetails}
                      onChange={(e) => setFormMaterialDetails(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Amount & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Total Amount (\u20B9) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 350.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-bold text-[#7FB706] focus:outline-none focus:border-[#7FB706]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Payment Mode *</label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value as ConveyancePaymentMode)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="PAID_BY_EMPLOYEE">Paid by Employee (Needs Reimbursement)</option>
                    <option value="COMPANY_CASH">Company Cash Given in Advance</option>
                    <option value="COMPANY_UPI">Company UPI Direct Payment</option>
                    <option value="COMPANY_CARD">Company Fuel / Fleet Card</option>
                  </select>
                </div>
              </div>

              {/* Proof / Bill & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Receipt / Fuel Bill URL (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://... receipt image"
                    value={formReceiptUrl}
                    onChange={(e) => setFormReceiptUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Bill / Voucher Slip Number (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HPCL-9821, UBER-TX-392"
                    value={formReceiptNumber}
                    onChange={(e) => setFormReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Site measurement completed and measurements handed over to CAD drafting team"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsRecordExpenseOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="flex items-center gap-2 px-5 py-2 bg-[#7FB706] hover:bg-[#6ea105] text-white rounded-xl text-xs sm:text-sm font-medium shadow-lg shadow-[#7FB706]/20 transition disabled:opacity-50"
                >
                  {isSubmittingExpense ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} /> Recording...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Record Expense Claim
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: SETTLE / REIMBURSE EXPENSE
      ════════════════════════════════════════════════════════════════════════ */}
      {settleModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a091e] border border-white/15 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Banknote size={18} className="text-teal-400" /> Reimburse / Settle Claim
              </h3>
              <button
                onClick={() => setSettleModalExpense(null)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3 bg-[#030213] rounded-xl border border-white/10 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Voucher</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {settleModalExpense.voucherNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Site</span>
                  <span className="text-white font-medium">{settleModalExpense.siteName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Category</span>
                  <span className="text-cyan-300">{settleModalExpense.category}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-gray-400 font-medium">Claimed Amount</span>
                  <span className="font-bold text-white text-base">
                    {formatINR(settleModalExpense.amount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Reimbursed Amount (\u20B9)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-bold text-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Payment Reference / Cash Note *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UPI Ref 38291038102, Cash Voucher 42"
                  value={settlePaymentRef}
                  onChange={(e) => setSettlePaymentRef(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white"
                />
              </div>

              {employee.bankAccountNumber && (
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                  Employee Bank: {employee.bankName || 'A/C'} • {employee.bankAccountNumber} ({employee.bankIfsc})
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSettleModalExpense(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSettle}
                disabled={isSettling || !settlePaymentRef.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-medium transition disabled:opacity-50"
              >
                {isSettling ? 'Settling...' : 'Confirm Reimbursement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: REJECT EXPENSE
      ════════════════════════════════════════════════════════════════════════ */}
      {rejectModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a091e] border border-white/15 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle size={18} className="text-rose-400" /> Reject Expense Claim
              </h3>
              <button
                onClick={() => setRejectModalExpense(null)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Rejecting voucher{' '}
              <span className="font-mono text-amber-300 font-bold">{rejectModalExpense.voucherNumber}</span> (
              {formatINR(rejectModalExpense.amount)}). Please provide a reason:
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Rejection Reason *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Mileage exceeds authorized visit distance; duplicate bill submission"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRejectModalExpense(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-medium transition disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: RECEIPT VIEWER
      ════════════════════════════════════════════════════════════════════════ */}
      {isReceiptModalOpen && selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0a091e] border border-white/15 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt size={16} className="text-blue-400" /> {selectedReceiptTitle || 'Receipt Proof'}
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={selectedReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5"
                  title="Open in new window"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-[#030213]">
              <img
                src={selectedReceiptUrl}
                alt="Receipt proof"
                className="max-h-[60vh] max-w-full object-contain rounded-xl border border-white/10 shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: APPLY / ADJUST LEAVE
      ════════════════════════════════════════════════════════════════════════ */}
      {isLeaveAdjustModalOpen && employee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0a091e] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-blue-400" /> Apply / Adjust Leave
              </h3>
              <button
                type="button"
                onClick={() => setIsLeaveAdjustModalOpen(false)}
                className="text-gray-400 hover:text-white transition p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustLeave} className="space-y-4">
              <div className="bg-[#030213] p-3 rounded-xl border border-white/5 space-y-1">
                <div className="text-xs text-gray-400">Employee:</div>
                <div className="text-sm font-bold text-white">
                  {employee.name} ({employee.employeeId})
                </div>
                <div className="flex items-center gap-3 pt-1 text-xs font-mono">
                  <span className="text-blue-400">Current CL: {Number(employee.clBalance || 0).toFixed(1)}</span>
                  <span className="text-purple-400">Current EL: {Number(employee.elBalance || 0).toFixed(1)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Leave Type</label>
                  <select
                    value={leaveAdjustType}
                    onChange={(e) => setLeaveAdjustType(e.target.value as 'CL' | 'EL')}
                    className="w-full bg-[#030213] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="CL">Casual Leave (CL)</option>
                    <option value="EL">Earned Leave (EL)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Action</label>
                  <select
                    value={leaveAdjustAction}
                    onChange={(e) => setLeaveAdjustAction(e.target.value as any)}
                    className="w-full bg-[#030213] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="USAGE">Deduct / Consume Leave (-)</option>
                    <option value="ACCRUAL">Credit / Add Leave (+)</option>
                    <option value="ADJUSTMENT">Correct Balance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Days / Amount</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="30"
                  value={leaveAdjustAmount}
                  onChange={(e) => setLeaveAdjustAmount(e.target.value)}
                  className="w-full bg-[#030213] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="e.g. 1"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Reason / Notes</label>
                <textarea
                  value={leaveAdjustReason}
                  onChange={(e) => setLeaveAdjustReason(e.target.value)}
                  className="w-full bg-[#030213] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 h-20 resize-none"
                  placeholder="e.g. Emergency family leave approved by manager"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsLeaveAdjustModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeaveAdjust}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingLeaveAdjust ? 'Saving...' : 'Apply Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeDetailPage;
