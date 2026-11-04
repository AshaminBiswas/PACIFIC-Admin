import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Fuel,
  Car,
  Package,
  Navigation,
  Briefcase,
  Building2,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Search,
  Plus,
  RefreshCw,
  Receipt,
  Check,
  X,
  Trash2,
  ExternalLink,
  Eye,
  User,
  Filter,
} from 'lucide-react';
import { employeeService } from '../../api/employeeService';
import type {
  Employee,
  EmployeeConveyanceExpense,
  ConveyanceCategory,
  ConveyancePurpose,
  ConveyancePaymentMode,
  ConveyanceStatus,
  CreateConveyancePayload,
} from '../../types/employee';

// ─── Category & Status Config ─────────────────────────────────────────────────

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
  SITE_INSPECTION: 'Site Inspection / Survey',
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

interface EmployeeConveyanceHubProps {
  employees: Employee[];
  isSuperAdmin: boolean;
  onOpenEmployeeDetail: (employeeId: string) => void;
  showFeedback: (type: 'success' | 'error', message: string) => void;
}

export function EmployeeConveyanceHub({
  employees,
  isSuperAdmin,
  onOpenEmployeeDetail,
  showFeedback,
}: EmployeeConveyanceHubProps) {
  // ─── Data State ─────────────────────────────────────────────────────────────
  const [conveyances, setConveyances] = useState<EmployeeConveyanceExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState({
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

  // ─── Filter States ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // ─── Modal States ───────────────────────────────────────────────────────────
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [selectedReceiptTitle, setSelectedReceiptTitle] = useState('');

  const [settleExpense, setSettleExpense] = useState<EmployeeConveyanceExpense | null>(null);
  const [settlePaymentRef, setSettlePaymentRef] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [isSettling, setIsSettling] = useState(false);

  const [rejectExpense, setRejectExpense] = useState<EmployeeConveyanceExpense | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // ─── Record Expense Form States ─────────────────────────────────────────────
  const [formEmployeeId, setFormEmployeeId] = useState(employees[0]?.id || '');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSiteName, setFormSiteName] = useState('');
  const [formSiteAddress, setFormSiteAddress] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formProjectName, setFormProjectName] = useState('');
  const [formPurpose, setFormPurpose] = useState<ConveyancePurpose>('SITE_MEASUREMENT');
  const [formCategory, setFormCategory] = useState<ConveyanceCategory>('PETROL');
  const [formPaymentMode, setFormPaymentMode] = useState<ConveyancePaymentMode>('PAID_BY_EMPLOYEE');
  const [formAmount, setFormAmount] = useState('');
  // Travel fields
  const [formStartLocation, setFormStartLocation] = useState('');
  const [formEndLocation, setFormEndLocation] = useState('');
  const [formTransportMode, setFormTransportMode] = useState('Bike / Two Wheeler');
  const [formDistanceKm, setFormDistanceKm] = useState('');
  const [formRatePerKm, setFormRatePerKm] = useState('3.50');
  // Material shifting
  const [formShiftingType, setFormShiftingType] = useState('Partition Sample Panels');
  const [formMaterialDetails, setFormMaterialDetails] = useState('');
  // Proof & notes
  const [formReceiptUrl, setFormReceiptUrl] = useState('');
  const [formReceiptNumber, setFormReceiptNumber] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default employee ID if changed
  useEffect(() => {
    if (!formEmployeeId && employees.length > 0) {
      setFormEmployeeId(employees[0].id);
    }
  }, [employees, formEmployeeId]);

  // Auto calculate petrol amount
  useEffect(() => {
    if (formCategory === 'PETROL' && formDistanceKm && formRatePerKm) {
      const dist = parseFloat(formDistanceKm);
      const rate = parseFloat(formRatePerKm);
      if (!isNaN(dist) && !isNaN(rate) && dist > 0 && rate > 0) {
        setFormAmount((dist * rate).toFixed(2));
      }
    }
  }, [formCategory, formDistanceKm, formRatePerKm]);

  // ─── Fetch Conveyances ──────────────────────────────────────────────────────
  const fetchConveyances = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await employeeService.listConveyanceExpenses({
        employeeId: selectedEmployeeId !== 'ALL' ? selectedEmployeeId : undefined,
        category: selectedCategory !== 'ALL' ? (selectedCategory as ConveyanceCategory) : undefined,
        status: selectedStatus !== 'ALL' ? (selectedStatus as ConveyanceStatus) : undefined,
        search: searchQuery || undefined,
        limit: 100,
      });
      setConveyances(res.items);
      setSummary(res.summary);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to load convenience expenses');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmployeeId, selectedCategory, selectedStatus, searchQuery, showFeedback]);

  useEffect(() => {
    fetchConveyances();
  }, [fetchConveyances]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId || !formSiteName.trim() || !formAmount || parseFloat(formAmount) <= 0) {
      showFeedback('error', 'Please select an employee and enter site name and amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateConveyancePayload = {
        employeeId: formEmployeeId,
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
      showFeedback('success', 'Site visit expense recorded successfully!');
      setIsRecordModalOpen(false);
      // Reset
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
      fetchConveyances();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await employeeService.approveConveyanceExpense(id);
      showFeedback('success', 'Expense approved successfully');
      fetchConveyances();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to approve expense');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectExpense || !rejectReason.trim()) {
      showFeedback('error', 'Please provide a rejection reason');
      return;
    }
    setIsRejecting(true);
    try {
      await employeeService.rejectConveyanceExpense(rejectExpense.id, rejectReason.trim());
      showFeedback('success', 'Expense claim rejected');
      setRejectExpense(null);
      fetchConveyances();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to reject expense');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleConfirmSettle = async () => {
    if (!settleExpense || !settlePaymentRef.trim()) {
      showFeedback('error', 'Please provide a payment reference / voucher note');
      return;
    }
    setIsSettling(true);
    try {
      await employeeService.settleConveyanceExpense(settleExpense.id, {
        paymentRef: settlePaymentRef.trim(),
        reimbursedAmount: settleAmount ? parseFloat(settleAmount) : undefined,
      });
      showFeedback('success', 'Expense reimbursed and settled successfully');
      setSettleExpense(null);
      fetchConveyances();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to settle expense');
    } finally {
      setIsSettling(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await employeeService.deleteConveyanceExpense(id);
      showFeedback('success', 'Expense record deleted');
      fetchConveyances();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to delete expense');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header / Banner ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a091e] p-4 rounded-2xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 flex items-center gap-1.5">
              <Fuel size={13} />
              <span>Site Visits & Conveyance Hub</span>
            </span>
            <span className="text-xs text-gray-500">• {summary.totalCount} Total Claims</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
            Site Visit Expense Tracking & Reimbursements
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Record and audit convenience expenses: petrol / bike mileage, garivara fares, material shifting, and transit allowances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6ea105] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition"
          >
            <Plus size={16} /> Record Site Visit Expense
          </button>
        </div>
      </div>

      {/* ── Top KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs uppercase tracking-wider">Total Claims</span>
            <Fuel size={18} className="text-[#7FB706]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{formatINR(summary.totalClaimedAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">{summary.totalCount} vouchers recorded</div>
        </div>

        <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs uppercase tracking-wider">Approved</span>
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{formatINR(summary.totalApprovedAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">Authorized for settlement</div>
        </div>

        <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs uppercase tracking-wider">Pending Review</span>
            <Clock size={18} className="text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400">{formatINR(summary.totalPendingAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">Awaiting approval</div>
        </div>

        <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs uppercase tracking-wider">Reimbursed</span>
            <Banknote size={18} className="text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-teal-400">{formatINR(summary.totalReimbursedAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">Paid to staff</div>
        </div>
      </div>

      {/* ── Category Breakdown Pills ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#030213] border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Fuel size={20} />
          </div>
          <div>
            <span className="text-[11px] text-gray-400 uppercase tracking-wider block">Petrol / Fuel</span>
            <span className="text-base sm:text-lg font-bold text-amber-400">{formatINR(summary.petrolAmount)}</span>
          </div>
        </div>

        <div className="bg-[#030213] border border-cyan-500/20 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Car size={20} />
          </div>
          <div>
            <span className="text-[11px] text-gray-400 uppercase tracking-wider block">Garivara / Fares</span>
            <span className="text-base sm:text-lg font-bold text-cyan-400">{formatINR(summary.garivaraAmount)}</span>
          </div>
        </div>

        <div className="bg-[#030213] border border-purple-500/20 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Package size={20} />
          </div>
          <div>
            <span className="text-[11px] text-gray-400 uppercase tracking-wider block">Material Shifting</span>
            <span className="text-base sm:text-lg font-bold text-purple-400">{formatINR(summary.materialShiftingAmount)}</span>
          </div>
        </div>

        <div className="bg-[#030213] border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Navigation size={20} />
          </div>
          <div>
            <span className="text-[11px] text-gray-400 uppercase tracking-wider block">Tolls & Other</span>
            <span className="text-base sm:text-lg font-bold text-blue-400">{formatINR(summary.otherAmount)}</span>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a091e] p-3 rounded-2xl border border-white/10">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search site, client, voucher, material, employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="bg-[#030213] border border-white/10 text-xs sm:text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#7FB706]"
          >
            <option value="ALL">All Staff Members ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeId})
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#030213] border border-white/10 text-xs sm:text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#7FB706]"
          >
            <option value="ALL">All Categories</option>
            <option value="PETROL">Petrol / Fuel</option>
            <option value="GARIVARA">Garivara / Fares</option>
            <option value="MATERIAL_SHIFTING">Material Shifting</option>
            <option value="TOLL_PARKING">Toll & Parking</option>
            <option value="FOOD_ALLOWANCE">Food Allowance</option>
            <option value="HOTEL_STAY">Hotel Stay</option>
            <option value="OTHER">Other Expenses</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
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
          onClick={fetchConveyances}
          className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition"
          title="Refresh List"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── Table View (Desktop) ─────────────────────────────────────────── */}
      <div className="bg-[#0a091e] border border-white/10 rounded-2xl overflow-hidden shadow-xl hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#030213] text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="px-4 py-3.5">Voucher & Date</th>
                <th className="px-4 py-3.5">Staff Member</th>
                <th className="px-4 py-3.5">Site & Client Details</th>
                <th className="px-4 py-3.5">Category & Purpose</th>
                <th className="px-4 py-3.5">Travel / Load Details</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Receipt</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                    Loading expenses...
                  </td>
                </tr>
              ) : conveyances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    No site visit expenses found matching the criteria. Click &quot;Record Site Visit Expense&quot; to add a new claim.
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
                        <div
                          onClick={() => onOpenEmployeeDetail(c.employeeId)}
                          className="font-medium text-white hover:text-[#7FB706] transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{c.employee?.name || 'Staff Member'}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {c.employee?.employeeId} • {c.employee?.designation}
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
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${catConf.bg} ${catConf.color} ${catConf.border} font-medium`}
                        >
                          {catConf.icon} {catConf.label}
                        </span>
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
                          <div className="text-[10px] text-rose-400 mt-1 max-w-[130px] truncate" title={c.rejectionReason}>
                            {c.rejectionReason}
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
                        <button
                          onClick={() => onOpenEmployeeDetail(c.employeeId)}
                          className="p-1.5 text-gray-400 hover:text-[#7FB706] transition"
                          title="View Employee Profile"
                        >
                          <Eye size={15} />
                        </button>

                        {c.status === 'PENDING' && isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleApprove(c.id)}
                              className="p-1.5 text-gray-400 hover:text-emerald-400 transition"
                              title="Approve Claim"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setRejectExpense(c);
                                setRejectReason('');
                              }}
                              className="p-1.5 text-gray-400 hover:text-rose-400 transition"
                              title="Reject Claim"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}

                        {c.status === 'APPROVED' && !c.isReimbursed && isSuperAdmin && (
                          <button
                            onClick={() => {
                              setSettleExpense(c);
                              setSettleAmount(String(c.amount));
                              setSettlePaymentRef('');
                            }}
                            className="px-2.5 py-1 text-xs bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg transition"
                          >
                            Reimburse
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-400 transition"
                          title="Delete Claim"
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

      {/* ── Mobile Cards View ────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">
            <RefreshCw className="animate-spin inline-block mr-2" size={18} />
            Loading expenses...
          </div>
        ) : conveyances.length === 0 ? (
          <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-6 text-center text-gray-500 text-sm">
            No site visit expenses found.
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
                    <div
                      onClick={() => onOpenEmployeeDetail(c.employeeId)}
                      className="font-bold text-white text-base hover:text-[#7FB706] cursor-pointer mt-0.5"
                    >
                      {c.employee?.name || 'Staff Member'}
                    </div>
                    <div className="text-xs text-gray-400">{c.siteName}</div>
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
                    })}
                  </span>
                </div>

                {/* Details snippet */}
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

                {/* Actions row */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    onClick={() => onOpenEmployeeDetail(c.employeeId)}
                    className="flex items-center gap-1 text-xs text-[#7FB706] hover:underline"
                  >
                    <Eye size={13} /> View Profile
                  </button>

                  <div className="flex items-center gap-2">
                    {c.receiptUrl && (
                      <button
                        onClick={() => {
                          setSelectedReceiptUrl(c.receiptUrl!);
                          setSelectedReceiptTitle(`${c.voucherNumber} — ${c.siteName}`);
                          setIsReceiptModalOpen(true);
                        }}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        Receipt
                      </button>
                    )}

                    {c.status === 'PENDING' && isSuperAdmin && (
                      <>
                        <button
                          onClick={() => handleApprove(c.id)}
                          className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectExpense(c);
                            setRejectReason('');
                          }}
                          className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {c.status === 'APPROVED' && !c.isReimbursed && isSuperAdmin && (
                      <button
                        onClick={() => {
                          setSettleExpense(c);
                          setSettleAmount(String(c.amount));
                          setSettlePaymentRef('');
                        }}
                        className="px-2.5 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-lg text-xs font-medium"
                      >
                        Reimburse
                      </button>
                    )}

                    <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-500 hover:text-rose-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal: Record Expense ─────────────────────────────────────────── */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0a091e] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Fuel size={20} className="text-[#7FB706]" /> Record Site Visit / Convenience Expense
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Record petrol allowance, garivara transit fares, or material shifting.
                </p>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Select Staff Member *</label>
                  <select
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId}) • {emp.designation}
                      </option>
                    ))}
                  </select>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Site Name / Destination *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DLF CyberCity Tower B, Sector 62 Noida"
                    value={formSiteName}
                    onChange={(e) => setFormSiteName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Client / Project</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Commercial Restroom"
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>

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
                  <label className="block text-xs font-medium text-gray-400 mb-1">Category *</label>
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
                    <option value="TOLL_PARKING">🅿️ Toll & Parking</option>
                    <option value="FOOD_ALLOWANCE">🍲 Food Allowance</option>
                    <option value="HOTEL_STAY">🏨 Hotel Stay</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Conditional Petrol */}
              {formCategory === 'PETROL' && (
                <div className="bg-[#030213] border border-amber-500/20 rounded-xl p-3.5 space-y-3">
                  <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Fuel size={14} /> Mileage & Petrol Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Vehicle</label>
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
                        placeholder="e.g. 25"
                        value={formDistanceKm}
                        onChange={(e) => setFormDistanceKm(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
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
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Garivara */}
              {formCategory === 'GARIVARA' && (
                <div className="bg-[#030213] border border-cyan-500/20 rounded-xl p-3.5 space-y-3">
                  <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Car size={14} /> Journey & Garivara Fares
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Transit Mode</label>
                      <select
                        value={formTransportMode}
                        onChange={(e) => setFormTransportMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      >
                        <option value="Auto / Rickshaw">Auto / Rickshaw</option>
                        <option value="Cab / Taxi / Uber">Cab / Taxi / Uber</option>
                        <option value="Metro Train">Metro Train</option>
                        <option value="Bus / Public Transit">Bus / Public Transit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">From</label>
                      <input
                        type="text"
                        placeholder="e.g. Factory, Okhla"
                        value={formStartLocation}
                        onChange={(e) => setFormStartLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">To</label>
                      <input
                        type="text"
                        placeholder="e.g. Client Site, Gurugram"
                        value={formEndLocation}
                        onChange={(e) => setFormEndLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Material Shifting */}
              {formCategory === 'MATERIAL_SHIFTING' && (
                <div className="bg-[#030213] border border-purple-500/20 rounded-xl p-3.5 space-y-3">
                  <div className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                    <Package size={14} /> Material Shifting Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Shifting Type</label>
                      <select
                        value={formShiftingType}
                        onChange={(e) => setFormShiftingType(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      >
                        <option value="Partition Sample Panels">Partition Sample Panels</option>
                        <option value="Hardware Fitting Box">Hardware Fitting Box</option>
                        <option value="Tools & Tripod / Laser Level">Tools & Tripod / Laser Level</option>
                        <option value="Glass / Replacement Panel">Glass / Replacement Panel</option>
                        <option value="Chhota Hathi / Tata Ace Tempo">Chhota Hathi / Tata Ace Tempo</option>
                        <option value="Porter / Manual Labor Handling">Porter / Manual Handling</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Transport Vehicle / Porter</label>
                      <input
                        type="text"
                        placeholder="e.g. Porter App, Local Tempo"
                        value={formTransportMode}
                        onChange={(e) => setFormTransportMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Material Details</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. 4 cubicle partition sample panels shifted for architect inspection"
                      value={formMaterialDetails}
                      onChange={(e) => setFormMaterialDetails(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#0a091e] border border-white/10 rounded-lg text-xs text-white resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Amount & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Total Amount (\u20B9) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 350.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-bold text-[#7FB706]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Payment Mode *</label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value as ConveyancePaymentMode)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white"
                  >
                    <option value="PAID_BY_EMPLOYEE">Paid by Employee (Needs Reimbursement)</option>
                    <option value="COMPANY_CASH">Company Cash Given</option>
                    <option value="COMPANY_UPI">Company UPI Direct Payment</option>
                    <option value="COMPANY_CARD">Company Fuel / Fleet Card</option>
                  </select>
                </div>
              </div>

              {/* Proof / Bill & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Receipt URL (optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formReceiptUrl}
                    onChange={(e) => setFormReceiptUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Receipt / Bill Number</label>
                  <input
                    type="text"
                    placeholder="e.g. HPCL-8921"
                    value={formReceiptNumber}
                    onChange={(e) => setFormReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Measurements verified and approved by site manager"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-[#7FB706] hover:bg-[#6ea105] text-white rounded-xl text-xs sm:text-sm font-medium shadow-lg shadow-[#7FB706]/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
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

      {/* ── Modal: Settle Claim ───────────────────────────────────────────── */}
      {settleExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a091e] border border-white/15 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Banknote size={18} className="text-teal-400" /> Settle / Reimburse Claim
              </h3>
              <button onClick={() => setSettleExpense(null)} className="p-1 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3 bg-[#030213] rounded-xl border border-white/10 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Employee</span>
                  <span className="text-white font-medium">{settleExpense.employee?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Voucher</span>
                  <span className="font-mono text-amber-300 font-bold">{settleExpense.voucherNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Site</span>
                  <span className="text-white">{settleExpense.siteName}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-gray-400">Claim Amount</span>
                  <span className="font-bold text-white text-base">{formatINR(settleExpense.amount)}</span>
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
                  Payment Reference / Cash Voucher Note *
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
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSettleExpense(null)}
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

      {/* ── Modal: Reject Claim ───────────────────────────────────────────── */}
      {rejectExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a091e] border border-white/15 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle size={18} className="text-rose-400" /> Reject Expense Claim
              </h3>
              <button onClick={() => setRejectExpense(null)} className="p-1 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Rejecting voucher{' '}
              <span className="font-mono text-amber-300 font-bold">{rejectExpense.voucherNumber}</span> (
              {formatINR(rejectExpense.amount)}) for {rejectExpense.employee?.name}.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Rejection Reason *</label>
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
                onClick={() => setRejectExpense(null)}
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

      {/* ── Modal: Receipt Viewer ─────────────────────────────────────────── */}
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
    </div>
  );
}

export default EmployeeConveyanceHub;
