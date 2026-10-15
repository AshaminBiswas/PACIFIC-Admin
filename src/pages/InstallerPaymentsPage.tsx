import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Receipt,
  Download,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Send,
  Calendar,
  MapPin,
  DollarSign,
  ShieldCheck,
  FileSpreadsheet,
  Trash2,
  Edit2,
  X,
  CreditCard,
  Building2,
  ArrowUpDown,
  FileText,
  User,
  Users,
  Phone,
  ChevronRight,
  Coins,
  Printer,
  Sparkles,
  Layers,
  HelpCircle,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { installerPaymentsService } from '../api/installerPaymentsService';
import { isNcrPinCode } from '../utils/ncrPincodes';
import type {
  InstallerBill,
  CubicleModel,
  CubicleInstaller,
  InstallerPaymentKpis,
  CreateInstallerBillPayload,
  RecordPaymentPayload,
  CreateCubicleModelPayload,
  UpdateCubicleModelPayload,
  InstallerLedgerResponse,
  UpdateInstallerBillPayload,
  BillAuditLogEntry,
} from '../types/installerPayment';

export interface InstallerPaymentsPageProps {
  onNewBill?: () => void;
}

export function InstallerPaymentsPage({ onNewBill }: InstallerPaymentsPageProps = {}) {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const rawRole = adminUser?.role as any;
  const roleSlug =
    typeof rawRole === 'object' && rawRole !== null
      ? rawRole.slug ?? rawRole.name ?? 'admin'
      : rawRole ?? 'admin';
  const isSuperAdmin = (roleSlug || '').toLowerCase().includes('super');

  // Navigation tabs: 'bills' | 'advances' | 'ledger' | 'installers' | 'models' | 'export'
  const [activeTab, setActiveTab] = useState<'bills' | 'advances' | 'ledger' | 'installers' | 'models' | 'export'>('bills');

  // Data states
  const [bills, setBills] = useState<InstallerBill[]>([]);
  const [kpis, setKpis] = useState<InstallerPaymentKpis>({
    totalBills: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalDue: 0,
    clearedCount: 0,
    partialCount: 0,
    totalAdvancePaid: 0,
  });
  const [models, setModels] = useState<CubicleModel[]>([]);
  const [activeModels, setActiveModels] = useState<CubicleModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters state (Tab 1: Bills)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [installerFilter, setInstallerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PARTIAL' | 'CLEARED'>('ALL');
  const [ncrFilter, setNcrFilter] = useState<'all' | 'true' | 'false'>('all');
  const [advanceFilter, setAdvanceFilter] = useState<'ALL' | 'WITH_ADVANCE' | 'NO_ADVANCE'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modals & Drawers state
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<InstallerBill | null>(null);
  const [billForPayment, setBillForPayment] = useState<InstallerBill | null>(null);
  const [billForAdvance, setBillForAdvance] = useState<InstallerBill | null>(null);
  const [billForEdit, setBillForEdit] = useState<InstallerBill | null>(null);
  const [showModelModal, setShowModelModal] = useState<boolean>(false);
  const [editingModel, setEditingModel] = useState<CubicleModel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modelCategoryFilter, setModelCategoryFilter] = useState<'ALL' | 'CUBICLE' | 'UMP' | 'LOCKER'>('ALL');

  // Installers Master State
  const [installers, setInstallers] = useState<CubicleInstaller[]>([]);
  const [showInstallerModal, setShowInstallerModal] = useState<boolean>(false);
  const [editingInstaller, setEditingInstaller] = useState<CubicleInstaller | null>(null);
  const [installerFormData, setInstallerFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    isActive: boolean;
  }>({ name: '', email: '', phone: '', isActive: true });

  // Installer-Wise Ledger & Payment Statement State
  const [selectedLedgerInstallerId, setSelectedLedgerInstallerId] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<InstallerLedgerResponse | null>(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState<boolean>(false);
  const [isExportingLedger, setIsExportingLedger] = useState<boolean>(false);

  // Payment Recording State
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [paymentRefNote, setPaymentRefNote] = useState<string>('');

  // Advance Recording State
  const [advanceAmountInput, setAdvanceAmountInput] = useState<string>('');
  const [advanceDateInput, setAdvanceDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [advanceModeInput, setAdvanceModeInput] = useState<string>('BANK_TRANSFER');
  const [advanceNoteInput, setAdvanceNoteInput] = useState<string>('');

  // Export filters
  const [exportMonth, setExportMonth] = useState<number | ''>('');
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportStatus, setExportStatus] = useState<'ALL' | 'PARTIAL' | 'CLEARED'>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Super Admin Delete Bill State
  const [billToDelete, setBillToDelete] = useState<InstallerBill | null>(null);
  const [isDeletingBill, setIsDeletingBill] = useState<boolean>(false);

  // Email Modal State
  const [billForEmail, setBillForEmail] = useState<InstallerBill | null>(null);
  const [emailRecipientInput, setEmailRecipientInput] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // ─── Formatters ─────────────────────────────────────────────────────────────
  const formatINR = (val: number | string | null | undefined): string => {
    const num = Number(val ?? 0);
    return isNaN(num)
      ? '₹0.00'
      : `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Auto-dismiss notices after 5 seconds
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  // Load Models
  const loadModels = async () => {
    try {
      const all = await installerPaymentsService.listModels(false);
      const safe = Array.isArray(all) ? all : [];
      setModels(safe);
      setActiveModels(safe.filter((m) => m && m.isActive));
    } catch (err: any) {
      console.error('Failed to load cubicle models:', err);
      setModels([]);
      setActiveModels([]);
    }
  };

  // Load Installers
  const loadInstallers = async () => {
    try {
      const res = await installerPaymentsService.listInstallers(true);
      const safe = Array.isArray(res) ? res : [];
      setInstallers(safe);
    } catch (err: any) {
      console.error('Failed to load installers:', err);
      setInstallers([]);
    }
  };

  // Load Bills
  const loadBills = async (page = currentPage) => {
    try {
      setIsLoading(true);
      const res = await installerPaymentsService.listBills({
        page,
        limit: 20,
        search: searchQuery,
        installerId: installerFilter !== 'all' ? installerFilter : undefined,
        status: statusFilter,
        isNcr: ncrFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      const loadedBills = Array.isArray(res?.bills) ? res.bills : [];
      setBills(loadedBills);
      setCurrentPage(res?.page || 1);
      setTotalPages(res?.totalPages || 1);

      if (res?.kpis) {
        // Calculate total advance paid from bills if not explicitly returned
        const calcAdvance = loadedBills.reduce((acc, b) => acc + (Number(b.advancePaid) || 0), 0);
        setKpis({
          ...res.kpis,
          totalAdvancePaid: res.kpis.totalAdvancePaid ?? calcAdvance,
        });
      }
    } catch (err: any) {
      console.error('Failed to load installer bills:', err);
      setActionNotice({ type: 'error', message: err?.message || 'Failed to fetch installer bills' });
      setBills([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    loadModels();
    loadInstallers();
    loadBills(1);
  }, []);

  // Filter effect for debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadBills(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, installerFilter, statusFilter, ncrFilter, startDate, endDate]);

  // Load Ledger
  const loadInstallerLedger = async (installerId: string) => {
    if (!installerId) return;
    try {
      setIsLoadingLedger(true);
      const res = await installerPaymentsService.getInstallerLedger(installerId);
      setLedgerData(res);
    } catch (err: any) {
      console.error('Failed to load installer ledger:', err);
      setActionNotice({ type: 'error', message: err?.message || 'Failed to load installer ledger statement' });
      setLedgerData(null);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  useEffect(() => {
    if ((activeTab === 'ledger' || activeTab === 'advances') && installers.length > 0) {
      if (!selectedLedgerInstallerId) {
        setSelectedLedgerInstallerId(installers[0].id);
      } else {
        loadInstallerLedger(selectedLedgerInstallerId);
      }
    }
  }, [activeTab, selectedLedgerInstallerId, installers]);

  // Filtered bills by Advance status
  const displayedBills = useMemo(() => {
    if (advanceFilter === 'WITH_ADVANCE') {
      return bills.filter((b) => Number(b.advancePaid || 0) > 0);
    }
    if (advanceFilter === 'NO_ADVANCE') {
      return bills.filter((b) => !b.advancePaid || Number(b.advancePaid) === 0);
    }
    return bills;
  }, [bills, advanceFilter]);

  // Handle Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadModels();
    loadInstallers();
    loadBills(currentPage);
    if (selectedLedgerInstallerId) {
      loadInstallerLedger(selectedLedgerInstallerId);
    }
  };

  // ─── PDF Download Handler ──────────────────────────────────────────────────
  const handleDownloadPdf = async (bill: InstallerBill) => {
    try {
      setActionNotice({ type: 'success', message: `Generating PDF advice for ${bill.billNo}...` });
      await installerPaymentsService.downloadBillPdf(bill.id, bill.billNo);
      setActionNotice({ type: 'success', message: `Payment Advice ${bill.billNo} downloaded successfully.` });
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to download PDF payment advice' });
    }
  };

  // ─── Email Modal & Send Handler ───────────────────────────────────────────
  const handleOpenSendEmailModal = (bill: InstallerBill) => {
    setBillForEmail(bill);
    setEmailRecipientInput(bill.installerEmail || '');
  };

  const handleSendBillEmail = async () => {
    if (!billForEmail) return;
    const targetEmail = (emailRecipientInput || billForEmail.installerEmail || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setActionNotice({ type: 'error', message: 'Please enter a valid installer email address.' });
      return;
    }

    try {
      setIsSendingEmail(true);
      setActionNotice({ type: 'success', message: `Dispatching payment voucher to ${targetEmail}...` });
      await installerPaymentsService.resendClearanceEmail(billForEmail.id, targetEmail);
      setActionNotice({ type: 'success', message: `Payment voucher successfully dispatched to ${targetEmail}!` });
      setBillForEmail(null);
      loadBills(currentPage);
      if (selectedBillForDetails?.id === billForEmail.id) {
        const updated = await installerPaymentsService.getBill(billForEmail.id);
        setSelectedBillForDetails(updated);
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to dispatch email' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // ─── Super Admin Delete Bill Handler ───────────────────────────────────────
  const handleDeleteBill = async () => {
    if (!billToDelete) return;
    try {
      setIsDeletingBill(true);
      await installerPaymentsService.deleteBill(billToDelete.id);
      setActionNotice({
        type: 'success',
        message: `Bill #${billToDelete.billNo} has been deleted successfully.`,
      });
      if (selectedBillForDetails?.id === billToDelete.id) {
        setSelectedBillForDetails(null);
      }
      setBillToDelete(null);
      await loadBills(currentPage);
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Failed to delete installer bill' });
    } finally {
      setIsDeletingBill(false);
    }
  };

  // ─── Settlement Payment Handler ───────────────────────────────────────────
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForPayment) return;
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionNotice({ type: 'error', message: 'Please enter a valid payment settlement amount.' });
      return;
    }
    if (amountNum > Number(billForPayment.balanceDue)) {
      setActionNotice({
        type: 'error',
        message: `Amount cannot exceed remaining balance due of ${formatINR(billForPayment.balanceDue)}.`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await installerPaymentsService.recordPayment(billForPayment.id, {
        amount: amountNum,
        paymentDate,
        paymentMode,
        referenceNote: paymentRefNote.trim() || undefined,
        isAdvance: false,
      });

      setActionNotice({
        type: 'success',
        message: `Payment of ${formatINR(amountNum)} recorded on ${updated.billNo}. Status: ${updated.paymentStatus}`,
      });

      setBillForPayment(null);
      setPaymentAmount('');
      setPaymentRefNote('');
      loadBills(currentPage);
      if (selectedBillForDetails?.id === billForPayment.id) {
        setSelectedBillForDetails(updated);
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Failed to record payment settlement' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Advance Payment Handler (USER REQUESTED) ──────────────────────────────
  const handleRecordAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForAdvance) return;
    const amountNum = parseFloat(advanceAmountInput);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionNotice({ type: 'error', message: 'Please enter a valid advance disbursement amount.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await installerPaymentsService.recordPayment(billForAdvance.id, {
        amount: amountNum,
        paymentDate: advanceDateInput,
        paymentMode: advanceModeInput,
        referenceNote: advanceNoteInput.trim() ? `[Advance] ${advanceNoteInput.trim()}` : '[Advance Disbursement]',
        isAdvance: true,
      });

      setActionNotice({
        type: 'success',
        message: `Advance payment of ${formatINR(amountNum)} disbursed on ${updated.billNo}! Total Advance: ${formatINR(updated.advancePaid)}.`,
      });

      setBillForAdvance(null);
      setAdvanceAmountInput('');
      setAdvanceNoteInput('');
      loadBills(currentPage);
      if (selectedBillForDetails?.id === billForAdvance.id) {
        setSelectedBillForDetails(updated);
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Failed to record advance payment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Export Handler ────────────────────────────────────────────────────────
  const handleTriggerExport = async () => {
    try {
      setIsExporting(true);
      await installerPaymentsService.exportExcel({
        month: exportMonth ? Number(exportMonth) : undefined,
        year: exportYear,
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
        status: exportStatus,
      });
      setActionNotice({ type: 'success', message: 'Payment history exported to Excel successfully.' });
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Excel export failed' });
    } finally {
      setIsExporting(false);
    }
  };

  // ─── Print Statement Handler ───────────────────────────────────────────────
  const handlePrintLedger = () => {
    if (!ledgerData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print statement');
      return;
    }

    const { installer, kpis: lKpis, bills: lBills } = ledgerData;
    const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const rows = lBills
      .map(
        (b, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #000; padding: 4px;">${idx + 1}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px; white-space: nowrap;">${new Date(b.installDate).toLocaleDateString('en-IN')}</td>
        <td style="border: 1px solid #000; padding: 4px; font-weight: bold; font-family: monospace;">${b.billNo}</td>
        <td style="border: 1px solid #000; padding: 4px;">${b.siteAddress || 'N/A'}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px;">${b.items?.length || 0}</td>
        <td style="text-align: right; border: 1px solid #000; padding: 4px; font-family: monospace;">₹ ${Number(b.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; border: 1px solid #000; padding: 4px; font-family: monospace; color: #b45309;">₹ ${Number(b.advancePaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; border: 1px solid #000; padding: 4px; font-family: monospace; color: #15803d;">₹ ${Number(b.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; border: 1px solid #000; padding: 4px; font-family: monospace; font-weight: bold; color: ${Number(b.balanceDue || 0) > 0 ? '#b91c1c' : '#15803d'};">₹ ${Number(b.balanceDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Installer Statement — ${installer.name}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 10px; background: #fff; }
    h1 { font-size: 16px; margin: 0 0 4px 0; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5px; }
    th { background: #f4f4f5; border: 1px solid #000; padding: 5px; text-align: left; }
    td { border: 1px solid #000; padding: 4px; }
    .kpi-table td { padding: 6px; font-size: 10px; }
  </style>
</head>
<body>
  <h1>Pacific Products & Solutions — Installer Payment Statement</h1>
  <div><strong>Installer Name:</strong> ${installer.name} | <strong>Email:</strong> ${installer.email} | <strong>Phone:</strong> ${installer.phone || 'N/A'}</div>
  <div><strong>Generated Date:</strong> ${formattedDate}</div>

  <table class="kpi-table" style="margin-top: 12px; background: #fafafa;">
    <tr>
      <td><strong>Total Jobs Billed:</strong> ${lKpis.totalBills}</td>
      <td><strong>Total Gross Billed:</strong> ₹ ${lKpis.grossSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><strong>Total Advances:</strong> ₹ ${(lKpis.totalAdvances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><strong>Total Settled:</strong> ₹ ${lKpis.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><strong>Outstanding Due:</strong> ₹ ${lKpis.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  </table>

  <h3 style="margin: 16px 0 6px 0; font-size: 12px;">Itemized Job History & Disbursements</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 4%;">#</th>
        <th style="width: 10%;">Date</th>
        <th style="width: 16%;">Bill No</th>
        <th style="width: 26%;">Site Location</th>
        <th style="width: 6%; text-align: center;">Items</th>
        <th style="width: 11%; text-align: right;">Gross Billed</th>
        <th style="width: 9%; text-align: right;">Advance</th>
        <th style="width: 9%; text-align: right;">Paid</th>
        <th style="width: 9%; text-align: right;">Balance</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleOpenNewBill = () => {
    if (onNewBill) {
      onNewBill();
    } else {
      navigate('/admin/dashboard/installer-payments/new');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Context Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0a091e] p-5 rounded-2xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#B5F823]">
              <Wrench size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Cubicle Installer Payment Hub
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 font-medium">
                  Enterprise Disbursements
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Manage installer job bills, upfront advances, multi-mode settlements, and automated PDF payment vouchers
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-[#7FB706]' : ''} />
          </button>

          <button
            onClick={() => setActiveTab('advances')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Coins size={16} className="text-amber-400" />
            <span>Advance Center</span>
          </button>

          <button
            onClick={handleOpenNewBill}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>New Installer Bill</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="p-1 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* EXECUTIVE TOTAL PAYMENT MANAGEMENT SYSTEM (DOCK) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <Receipt size={14} className="text-gray-500" /> Total Billed
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-white mt-1">
            {formatINR(kpis.totalAmount)}
          </div>
          <span className="text-[10px] text-gray-500">{kpis.totalBills} Job vouchers issued</span>
        </div>

        <div className="bg-[#0a091e] border border-amber-500/20 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-amber-300 flex items-center gap-1.5">
            <Coins size={14} className="text-amber-400" /> Advances Disbursed
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-1">
            {formatINR(kpis.totalAdvancePaid || 0)}
          </div>
          <span className="text-[10px] text-amber-500/80">Upfront site disbursements</span>
        </div>

        <div className="bg-[#0a091e] border border-[#7FB706]/20 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-[#B5F823] flex items-center gap-1.5">
            <CreditCard size={14} className="text-[#7FB706]" /> Total Settled
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-[#B5F823] mt-1">
            {formatINR(kpis.totalPaid)}
          </div>
          <span className="text-[10px] text-[#7FB706]/80">Confirmed in installer accounts</span>
        </div>

        <div className="bg-[#0a091e] border border-rose-500/20 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-rose-300 flex items-center gap-1.5">
            <Clock size={14} className="text-rose-400" /> Net Outstanding Dues
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-400 mt-1">
            {formatINR(kpis.totalDue)}
          </div>
          <span className="text-[10px] text-rose-400/80">Pending settlement payout</span>
        </div>

        <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" /> Cleared Ratio
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">
            {kpis.totalBills > 0 ? `${Math.round((kpis.clearedCount / kpis.totalBills) * 100)}%` : '0%'}
          </div>
          <span className="text-[10px] text-gray-500">{kpis.clearedCount} Cleared / {kpis.partialCount} Partial</span>
        </div>

        <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <Users size={14} className="text-blue-400" /> Active Installers
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-blue-400 mt-1">
            {installers.filter((i) => i.isActive).length}
          </div>
          <span className="text-[10px] text-gray-500">Registered contractors</span>
        </div>
      </div>

      {/* Hub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'bills'
              ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Receipt size={16} />
          <span>Bills & Vouchers</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono">
            {kpis.totalBills}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'advances'
              ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Coins size={16} />
          <span>Payment Advances</span>
          {Number(kpis.totalAdvancePaid || 0) > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono">
              {formatINR(kpis.totalAdvancePaid)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CreditCard size={16} />
          <span>Installer Statement & Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('installers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'installers'
              ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users size={16} />
          <span>Installers Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'models'
              ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers size={16} />
          <span>Cubicle Models Master</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'export'
              ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>Master Excel Export</span>
        </button>
      </div>

      {/* ─── TAB 1: BILLS & DISBURSEMENTS ───────────────────────────────────── */}
      {activeTab === 'bills' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#0a091e] p-4 rounded-2xl border border-white/10 shadow-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bill #, installer, site..."
                  className="w-full pl-9 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-hidden focus:border-[#7FB706]"
                />
              </div>

              {/* Installer Filter */}
              <div>
                <select
                  value={installerFilter}
                  onChange={(e) => setInstallerFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                >
                  <option value="all">All Installers</option>
                  {installers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                >
                  <option value="ALL">All Payment Statuses</option>
                  <option value="PARTIAL">PARTIAL (Pending Dues)</option>
                  <option value="CLEARED">CLEARED (Fully Settled)</option>
                </select>
              </div>

              {/* Advance Filter (USER REQUESTED) */}
              <div>
                <select
                  value={advanceFilter}
                  onChange={(e) => setAdvanceFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                >
                  <option value="ALL">All Advance Statuses</option>
                  <option value="WITH_ADVANCE">⚡ With Advance Disbursed</option>
                  <option value="NO_ADVANCE">No Advance</option>
                </select>
              </div>

              {/* NCR Filter */}
              <div>
                <select
                  value={ncrFilter}
                  onChange={(e) => setNcrFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                >
                  <option value="all">All Locations (NCR & Outstation)</option>
                  <option value="true">Inside NCR (Travel ₹0)</option>
                  <option value="false">Outstation (Travel Reimbursed)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bills List / Table */}
          {isLoading ? (
            <div className="p-12 text-center text-gray-400 bg-[#0a091e] rounded-2xl border border-white/10">
              <div className="animate-spin w-8 h-8 border-3 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm font-medium">Loading installer bills and payments...</p>
            </div>
          ) : displayedBills.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-[#0a091e] rounded-2xl border border-white/10 space-y-3">
              <Receipt className="w-12 h-12 mx-auto text-gray-600" />
              <p className="text-base font-semibold text-white">No installer bills found</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No records matched your search filters. Click below to generate a new installer bill.
              </p>
              <button
                onClick={handleOpenNewBill}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Plus size={16} /> New Installer Bill
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Table View */}
              <div className="hidden md:block bg-[#0a091e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Bill No / Date</th>
                      <th className="py-3 px-4">Installer</th>
                      <th className="py-3 px-4">Site Location</th>
                      <th className="py-3 px-4 text-right">Gross Total</th>
                      <th className="py-3 px-4 text-right">Advance Paid</th>
                      <th className="py-3 px-4 text-right">Settled Paid</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {displayedBills.map((bill) => {
                      const hasAdvanceDisbursed = Number(bill.advancePaid || 0) > 0;
                      return (
                        <tr
                          key={bill.id}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                          onClick={() => setSelectedBillForDetails(bill)}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold font-mono text-white flex items-center gap-1.5">
                              {bill.billNo}
                              {bill.emailSent && (
                                <span title="PDF Voucher Emailed to installer">
                                  <Send size={12} className="text-[#7FB706]" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              {formatDate(bill.installDate)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{bill.installerName}</div>
                            <div className="text-[11px] text-gray-400">{bill.installerEmail}</div>
                          </td>

                          <td className="py-3 px-4 max-w-[200px]">
                            <div className="truncate text-gray-200" title={bill.siteAddress}>
                              {bill.siteAddress}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] font-mono text-gray-400">PIN: {bill.sitePin}</span>
                              {bill.isNcr ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30">
                                  NCR
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                  Outstation
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {formatINR(bill.total)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {hasAdvanceDisbursed ? (
                              <div>
                                <span className="font-mono font-bold text-amber-400">
                                  {formatINR(bill.advancePaid)}
                                </span>
                                <div className="text-[9px] text-amber-500/80">
                                  {bill.advanceDate ? formatDate(bill.advanceDate) : 'Disbursed'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500 font-mono">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                            {formatINR(bill.amountPaid)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span
                              className={`font-mono font-bold ${
                                Number(bill.balanceDue) > 0 ? 'text-rose-400' : 'text-[#B5F823]'
                              }`}
                            >
                              {formatINR(bill.balanceDue)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                bill.paymentStatus === 'CLEARED'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {bill.paymentStatus === 'CLEARED' ? (
                                <>
                                  <CheckCircle2 size={11} /> CLEARED
                                </>
                              ) : (
                                <>
                                  <Clock size={11} /> PARTIAL
                                </>
                              )}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {Number(bill.balanceDue) > 0 && (
                                <>
                                  <button
                                    onClick={() => {
                                      setBillForAdvance(bill);
                                      setAdvanceAmountInput(String(Math.min(2000, Number(bill.balanceDue))));
                                    }}
                                    className="p-1.5 text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors cursor-pointer"
                                    title="Disburse Advance"
                                  >
                                    <Coins size={14} />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setBillForPayment(bill);
                                      setPaymentAmount(String(bill.balanceDue));
                                    }}
                                    className="p-1.5 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                                    title="Settle Payment"
                                  >
                                    <CreditCard size={14} />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleDownloadPdf(bill)}
                                className="p-1.5 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                title="Download PDF Voucher"
                              >
                                <Download size={14} />
                              </button>

                              <button
                                onClick={() => handleOpenSendEmailModal(bill)}
                                className="p-1.5 text-gray-300 hover:text-[#7FB706] bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                title="Resend Voucher Email"
                              >
                                <Mail size={14} />
                              </button>

                              <button
                                onClick={() => setSelectedBillForDetails(bill)}
                                className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Transformation View */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {displayedBills.map((bill) => {
                  const hasAdvanceDisbursed = Number(bill.advancePaid || 0) > 0;
                  return (
                    <div
                      key={bill.id}
                      onClick={() => setSelectedBillForDetails(bill)}
                      className="bg-[#0a091e] p-4 rounded-2xl border border-white/10 shadow-lg space-y-3 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold font-mono text-white text-sm flex items-center gap-1.5">
                            {bill.billNo}
                            {bill.emailSent && <Send size={12} className="text-[#7FB706]" />}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">{formatDate(bill.installDate)}</div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.paymentStatus === 'CLEARED'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {bill.paymentStatus}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="font-semibold text-white">{bill.installerName}</div>
                        <div className="text-gray-400 truncate">{bill.siteAddress}</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#121226] rounded-xl border border-white/5 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-gray-500 block">Gross Total</span>
                          <span className="font-bold text-white">{formatINR(bill.total)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block">Advance</span>
                          <span className="font-bold text-amber-400">
                            {hasAdvanceDisbursed ? formatINR(bill.advancePaid) : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block">Balance Due</span>
                          <span
                            className={`font-bold ${
                              Number(bill.balanceDue) > 0 ? 'text-rose-400' : 'text-[#B5F823]'
                            }`}
                          >
                            {formatINR(bill.balanceDue)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        {Number(bill.balanceDue) > 0 && (
                          <>
                            <button
                              onClick={() => {
                                setBillForAdvance(bill);
                                setAdvanceAmountInput(String(Math.min(2000, Number(bill.balanceDue))));
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-lg cursor-pointer"
                            >
                              + Advance
                            </button>
                            <button
                              onClick={() => {
                                setBillForPayment(bill);
                                setPaymentAmount(String(bill.balanceDue));
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-lg cursor-pointer"
                            >
                              Settle
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDownloadPdf(bill)}
                          className="p-1.5 text-gray-300 bg-white/5 rounded-lg cursor-pointer"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadBills(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-gray-300 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => loadBills(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-gray-300 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: PAYMENT ADVANCE MANAGEMENT (USER REQUESTED) ─────────────── */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          <div className="bg-[#0a091e] p-5 rounded-2xl border border-white/10 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Coins className="text-[#7FB706]" size={18} />
                  Payment Advance Management System
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Track, disburse, and reconcile all upfront advances issued to installers prior to job completion.
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs text-gray-400">Total Advances Disbursed:</span>
                <span className="text-base font-bold text-amber-400">
                  {formatINR(kpis.totalAdvancePaid || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* List of Bills with Advances Disbursed */}
          <div className="bg-[#0a091e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Active Job Advances & Reconciliations
              </h3>
              <span className="text-xs text-gray-400">
                {bills.filter((b) => Number(b.advancePaid || 0) > 0).length} Advance Record(s) Found
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {bills.filter((b) => Number(b.advancePaid || 0) > 0).length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  No active advances found across current bills. You can record an advance directly from any bill row.
                </div>
              ) : (
                bills
                  .filter((b) => Number(b.advancePaid || 0) > 0)
                  .map((bill) => (
                    <div
                      key={bill.id}
                      className="p-4 hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">{bill.billNo}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs font-semibold text-[#B5F823]">{bill.installerName}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              bill.paymentStatus === 'CLEARED'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {bill.paymentStatus}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">{bill.siteAddress}</div>
                        {bill.advanceNote && (
                          <div className="text-[11px] text-amber-400/90 italic">
                            Advance Note: "{bill.advanceNote}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-gray-500 block">Gross Job</span>
                          <span className="font-semibold text-white">{formatINR(bill.total)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-400 block">Advance Disbursed</span>
                          <span className="font-bold text-amber-400">{formatINR(bill.advancePaid)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block">Remaining Due</span>
                          <span className="font-bold text-rose-400">{formatINR(bill.balanceDue)}</span>
                        </div>

                        <button
                          onClick={() => {
                            setBillForPayment(bill);
                            setPaymentAmount(String(bill.balanceDue));
                          }}
                          className="px-3 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Settle Net Due
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: INSTALLER STATEMENT & LEDGER ─────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-[#0a091e] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="text-[#7FB706]" size={18} />
                  Installer-Wise Statement of Account & Ledger
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Complete chronological job ledger with advance tracking, debits, credits, and vector PDF statements.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintLedger}
                  disabled={!ledgerData || isLoadingLedger}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:text-white cursor-pointer disabled:opacity-40"
                >
                  <Printer size={15} /> Print Statement
                </button>

                <button
                  onClick={() => {
                    if (ledgerData?.installer) {
                      handleTriggerExport();
                    }
                  }}
                  disabled={!ledgerData || isLoadingLedger}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7FB706]/20 cursor-pointer disabled:opacity-40"
                >
                  <Download size={15} /> Export Excel
                </button>
              </div>
            </div>

            {/* Select Installer */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Select Installer
              </label>
              <select
                value={selectedLedgerInstallerId}
                onChange={(e) => setSelectedLedgerInstallerId(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
              >
                {installers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingLedger ? (
            <div className="p-12 text-center text-gray-400 bg-[#0a091e] rounded-2xl border border-white/10">
              <div className="animate-spin w-8 h-8 border-3 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm font-medium">Generating installer ledger statement...</p>
            </div>
          ) : ledgerData ? (
            <div className="space-y-4">
              {/* Ledger KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4">
                  <span className="text-xs text-gray-400">Total Jobs</span>
                  <div className="text-lg font-bold font-mono text-white mt-1">
                    {ledgerData.kpis.totalBills}
                  </div>
                  <span className="text-[10px] text-gray-500">{ledgerData.kpis.totalUnits} Units installed</span>
                </div>

                <div className="bg-[#0a091e] border border-white/10 rounded-2xl p-4">
                  <span className="text-xs text-gray-400">Gross Billed</span>
                  <div className="text-lg font-bold font-mono text-white mt-1">
                    {formatINR(ledgerData.kpis.grossSubtotal)}
                  </div>
                  <span className="text-[10px] text-gray-500">Travel: {formatINR(ledgerData.kpis.totalTravel)}</span>
                </div>

                <div className="bg-[#0a091e] border border-amber-500/20 rounded-2xl p-4">
                  <span className="text-xs text-amber-300">Total Advances</span>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                    {formatINR(ledgerData.kpis.totalAdvances || 0)}
                  </div>
                  <span className="text-[10px] text-amber-500/80">Upfront site funds</span>
                </div>

                <div className="bg-[#0a091e] border border-[#7FB706]/20 rounded-2xl p-4">
                  <span className="text-xs text-[#B5F823]">Total Paid</span>
                  <div className="text-lg font-bold font-mono text-[#B5F823] mt-1">
                    {formatINR(ledgerData.kpis.totalPaid)}
                  </div>
                  <span className="text-[10px] text-[#7FB706]/80">{ledgerData.kpis.clearedCount} Cleared jobs</span>
                </div>

                <div className="bg-[#0a091e] border border-rose-500/20 rounded-2xl p-4">
                  <span className="text-xs text-rose-300">Balance Payable</span>
                  <div className="text-lg font-bold font-mono text-rose-400 mt-1">
                    {formatINR(ledgerData.kpis.balanceDue)}
                  </div>
                  <span className="text-[10px] text-rose-400/80">Net liability</span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="bg-[#0a091e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Bill No</th>
                      <th className="py-3 px-4">Site Location</th>
                      <th className="py-3 px-4 text-right">Gross Total</th>
                      <th className="py-3 px-4 text-right">Advance</th>
                      <th className="py-3 px-4 text-right">Settled</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300 font-mono">
                    {ledgerData.bills.map((b) => (
                      <tr key={b.id} className="hover:bg-white/5">
                        <td className="py-3 px-4 text-gray-400">{formatDate(b.installDate)}</td>
                        <td className="py-3 px-4 font-bold text-white">{b.billNo}</td>
                        <td className="py-3 px-4 font-sans text-gray-300 truncate max-w-[200px]">
                          {b.siteAddress}
                        </td>
                        <td className="py-3 px-4 text-right text-white font-bold">{formatINR(b.total)}</td>
                        <td className="py-3 px-4 text-right text-amber-400">
                          {Number(b.advancePaid || 0) > 0 ? formatINR(b.advancePaid) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400">{formatINR(b.amountPaid)}</td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            Number(b.balanceDue) > 0 ? 'text-rose-400' : 'text-[#B5F823]'
                          }`}
                        >
                          {formatINR(b.balanceDue)}
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              b.paymentStatus === 'CLEARED'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {b.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ─── TAB 4: INSTALLERS DIRECTORY ────────────────────────────────────── */}
      {activeTab === 'installers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0a091e] p-5 rounded-2xl border border-white/10 shadow-xl">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="text-[#7FB706]" size={18} />
                Registered Installers Master
              </h2>
              <p className="text-xs text-gray-400">
                Directory of verified contractors for job auto-population and ledger tracking.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingInstaller(null);
                setInstallerFormData({ name: '', email: '', phone: '', isActive: true });
                setShowInstallerModal(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 cursor-pointer"
            >
              <Plus size={16} /> Add Installer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {installers.map((inst) => (
              <div
                key={inst.id}
                className="bg-[#0a091e] p-5 rounded-2xl border border-white/10 shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#B5F823] flex items-center justify-center font-bold">
                      {inst.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{inst.name}</h3>
                      <span className="text-xs text-gray-400 block">{inst.email}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      inst.isActive
                        ? 'bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30'
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {inst.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {inst.phone && (
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 font-mono">
                    <Phone size={13} className="text-gray-500" />
                    <span>{inst.phone}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-mono">
                    {inst._count?.bills ?? 0} jobs recorded
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedLedgerInstallerId(inst.id);
                        setActiveTab('ledger');
                      }}
                      className="px-2.5 py-1 text-xs text-[#B5F823] bg-[#7FB706]/10 hover:bg-[#7FB706]/20 rounded-lg cursor-pointer"
                    >
                      Ledger
                    </button>
                    <button
                      onClick={() => {
                        setEditingInstaller(inst);
                        setInstallerFormData({
                          name: inst.name,
                          email: inst.email,
                          phone: inst.phone || '',
                          isActive: inst.isActive,
                        });
                        setShowInstallerModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 5: CUBICLE MODELS MASTER ───────────────────────────────────── */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a091e] p-5 rounded-2xl border border-white/10 shadow-xl">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="text-[#7FB706]" size={18} />
                Cubicle Models Master & Installation Rates
              </h2>
              <p className="text-xs text-gray-400">
                Configure standard unit labor installation rates for Cubicle, UMP, and Locker models.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingModel(null);
                setShowModelModal(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 cursor-pointer"
            >
              <Plus size={16} /> Add Model SKU
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((m) => (
              <div
                key={m.id}
                className="bg-[#0a091e] p-5 rounded-2xl border border-white/10 shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                      {m.category || 'CUBICLE'}
                    </span>
                    <h3 className="font-bold text-white text-sm mt-1">{m.modelName}</h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      m.isActive
                        ? 'bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30'
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {m.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="p-3 bg-[#121226] rounded-xl border border-white/5 flex items-baseline justify-between font-mono">
                  <span className="text-xs text-gray-400 font-sans">Installation Labor:</span>
                  <span className="text-base font-extrabold text-[#B5F823]">
                    ₹{Number(m.installationPrice).toLocaleString('en-IN')}{' '}
                    <span className="text-[10px] font-normal text-gray-400">/ unit</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-500 font-mono">
                    {m._count?.billItems ?? 0} jobs linked
                  </span>

                  <button
                    onClick={() => {
                      setEditingModel(m);
                      setShowModelModal(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 6: MASTER EXCEL EXPORT ─────────────────────────────────────── */}
      {activeTab === 'export' && (
        <div className="bg-[#0a091e] p-6 rounded-2xl border border-white/10 shadow-xl space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="text-[#7FB706]" size={18} />
              Export Installer Payment Register (.xlsx)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Download comprehensive Excel spreadsheet containing all installation jobs, site locations, advance disbursements, travel claims, and settlement payment logs.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Filter by Month</label>
                <select
                  value={exportMonth}
                  onChange={(e) => setExportMonth(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Filter by Year</label>
                <input
                  type="number"
                  value={exportYear}
                  onChange={(e) => setExportYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-hidden focus:border-[#7FB706]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Status Filter</label>
              <select
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PARTIAL">PARTIAL (Pending Dues)</option>
                <option value="CLEARED">CLEARED (Fully Settled)</option>
              </select>
            </div>

            <button
              onClick={handleTriggerExport}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating Excel Report...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download Excel Payment Register (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: DISBURSE ADVANCE (USER REQUESTED) ────────────────────────── */}
      {billForAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0a091e] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="text-amber-400" size={20} />
                <h3 className="font-bold text-white text-base">Record Advance Disbursement</h3>
              </div>
              <button
                onClick={() => setBillForAdvance(null)}
                className="p-1 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs bg-[#121226] p-3 rounded-xl border border-white/5 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Bill Number:</span>
                <span className="font-mono font-bold text-white">{billForAdvance.billNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Installer:</span>
                <span className="text-white font-semibold">{billForAdvance.installerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Remaining Balance:</span>
                <span className="font-mono font-bold text-rose-400">
                  {formatINR(billForAdvance.balanceDue)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordAdvance} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Advance Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={advanceAmountInput}
                  onChange={(e) => setAdvanceAmountInput(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-mono font-bold text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Disbursement Date</label>
                <input
                  type="date"
                  required
                  value={advanceDateInput}
                  onChange={(e) => setAdvanceDateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Disbursement Mode</label>
                <select
                  value={advanceModeInput}
                  onChange={(e) => setAdvanceModeInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-400"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="CASH">Cash Advance</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Advance Note / Reference
                </label>
                <input
                  type="text"
                  value={advanceNoteInput}
                  onChange={(e) => setAdvanceNoteInput(e.target.value)}
                  placeholder="e.g. UPI transfer on site arrival for lodging & transit"
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBillForAdvance(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Disburse Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: SETTLE PAYMENT ─────────────────────────────────────────── */}
      {billForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0a091e] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="text-[#7FB706]" size={20} />
                <h3 className="font-bold text-white text-base">Record Payment Settlement</h3>
              </div>
              <button
                onClick={() => setBillForPayment(null)}
                className="p-1 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs bg-[#121226] p-3 rounded-xl border border-white/5 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Bill Number:</span>
                <span className="font-mono font-bold text-white">{billForPayment.billNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Installer:</span>
                <span className="text-white font-semibold">{billForPayment.installerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Remaining Due:</span>
                <span className="font-mono font-bold text-rose-400">
                  {formatINR(billForPayment.balanceDue)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Settlement Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={Number(billForPayment.balanceDue)}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-mono font-bold text-white focus:outline-hidden focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Reference Note / Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentRefNote}
                  onChange={(e) => setPaymentRefNote(e.target.value)}
                  placeholder="e.g. UTR / Bank ref #12345678"
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBillForPayment(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl text-xs shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: BILL DETAILS DRAWER ─────────────────────────────────────── */}
      {selectedBillForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0a091e] border-l border-white/10 w-full max-w-xl h-full p-6 shadow-2xl overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#B5F823] px-2 py-0.5 rounded-full bg-[#7FB706]/15 border border-[#7FB706]/30">
                  Payment Voucher Details
                </span>
                <h2 className="text-xl font-bold font-mono text-white mt-1">
                  {selectedBillForDetails.billNo}
                </h2>
              </div>
              <button
                onClick={() => setSelectedBillForDetails(null)}
                className="p-1.5 text-gray-400 hover:text-white bg-white/5 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Bill Overview Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#121226] rounded-xl border border-white/5">
                <span className="text-gray-400 block">Installer</span>
                <span className="font-semibold text-white text-sm">{selectedBillForDetails.installerName}</span>
                <span className="text-gray-500 block truncate">{selectedBillForDetails.installerEmail}</span>
              </div>

              <div className="p-3 bg-[#121226] rounded-xl border border-white/5">
                <span className="text-gray-400 block">Install Date</span>
                <span className="font-semibold font-mono text-white text-sm">
                  {formatDate(selectedBillForDetails.installDate)}
                </span>
                <span className="text-gray-500 block">
                  {selectedBillForDetails.isNcr ? 'Delhi-NCR Site' : 'Outstation Site'}
                </span>
              </div>
            </div>

            {/* Site Address */}
            <div className="p-3 bg-[#121226] rounded-xl border border-white/5 text-xs space-y-1">
              <span className="text-gray-400 block font-semibold">Installation Site Address:</span>
              <p className="text-white">{selectedBillForDetails.siteAddress}</p>
              <div className="text-gray-500 font-mono">PIN Code: {selectedBillForDetails.sitePin}</div>
            </div>

            {/* Financial Math Breakdown */}
            <div className="p-4 bg-[#121226] rounded-xl border border-white/5 space-y-2 text-xs font-mono">
              <h4 className="font-sans font-bold text-gray-300 border-b border-white/5 pb-1">
                Disbursement Accounting Breakdown
              </h4>
              <div className="flex justify-between text-gray-400">
                <span>Subtotal:</span>
                <span className="text-white font-semibold">{formatINR(selectedBillForDetails.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Travel Expenses:</span>
                <span className="text-white font-semibold">{formatINR(selectedBillForDetails.travelExpenses)}</span>
              </div>
              {Number(selectedBillForDetails.deductionAmount || 0) > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Deduction ({selectedBillForDetails.deductionReason || 'Penalty'}):</span>
                  <span>-{formatINR(selectedBillForDetails.deductionAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold border-t border-white/10 pt-1">
                <span>Gross Total Billed:</span>
                <span>{formatINR(selectedBillForDetails.total)}</span>
              </div>
              {Number(selectedBillForDetails.advancePaid || 0) > 0 && (
                <div className="flex justify-between text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                  <span>Advance Disbursed:</span>
                  <span>-{formatINR(selectedBillForDetails.advancePaid)}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-400">
                <span>Total Settled Paid:</span>
                <span>{formatINR(selectedBillForDetails.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold border-t border-white/10 pt-1">
                <span className="font-sans">Balance Remaining:</span>
                <span
                  className={Number(selectedBillForDetails.balanceDue) > 0 ? 'text-rose-400' : 'text-[#B5F823]'}
                >
                  {formatINR(selectedBillForDetails.balanceDue)}
                </span>
              </div>
            </div>

            {/* Scope Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Installed Models Scope ({selectedBillForDetails.items?.length || 0})
              </h4>
              <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-[#121226]">
                {(selectedBillForDetails.items || []).map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-sans font-semibold text-white block">{item.modelName}</span>
                      <span className="text-[11px] text-gray-400">
                        {item.quantity} units @ ₹{item.installationPrice}
                      </span>
                    </div>
                    <span className="font-bold text-[#B5F823]">{formatINR(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Internal Audit Notes */}
            {selectedBillForDetails.notes && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs space-y-1">
                <span className="text-gray-400 font-semibold block">Internal Audit Remarks:</span>
                <p className="text-gray-200">{selectedBillForDetails.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-2">
              <button
                onClick={() => handleDownloadPdf(selectedBillForDetails)}
                className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Download PDF
              </button>

              <button
                onClick={() => handleOpenSendEmailModal(selectedBillForDetails)}
                className="flex-1 py-2.5 px-3 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mail size={14} /> Email Voucher
              </button>

              {Number(selectedBillForDetails.balanceDue) > 0 && (
                <button
                  onClick={() => {
                    setBillForPayment(selectedBillForDetails);
                    setPaymentAmount(String(selectedBillForDetails.balanceDue));
                  }}
                  className="w-full py-2.5 px-3 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#7FB706]/20"
                >
                  <CreditCard size={14} /> Settle Remaining Balance ({formatINR(selectedBillForDetails.balanceDue)})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESEND EMAIL ────────────────────────────────────────────── */}
      {billForEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0a091e] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="text-[#7FB706]" size={18} />
                <h3 className="font-bold text-white text-base">Dispatch Voucher Email</h3>
              </div>
              <button
                onClick={() => setBillForEmail(null)}
                className="p-1 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              The official PDF payment advice voucher for bill <strong className="text-white font-mono">{billForEmail.billNo}</strong> will be generated and dispatched to:
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Recipient Email</label>
              <input
                type="email"
                value={emailRecipientInput}
                onChange={(e) => setEmailRecipientInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBillForEmail(null)}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendBillEmail}
                disabled={isSendingEmail}
                className="px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl text-xs shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingEmail ? 'Dispatching...' : 'Send Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT INSTALLER ─────────────────────────────────── */}
      {showInstallerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0a091e] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="text-[#7FB706]" size={18} />
                <h3 className="font-bold text-white text-base">
                  {editingInstaller ? 'Edit Installer Details' : 'Register New Installer'}
                </h3>
              </div>
              <button
                onClick={() => setShowInstallerModal(false)}
                className="p-1 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setIsSubmitting(true);
                  if (editingInstaller) {
                    await installerPaymentsService.updateInstaller(editingInstaller.id, {
                      name: installerFormData.name.trim(),
                      email: installerFormData.email.trim().toLowerCase(),
                      phone: installerFormData.phone.trim() || undefined,
                      isActive: installerFormData.isActive,
                    });
                    setActionNotice({ type: 'success', message: 'Installer updated.' });
                  } else {
                    await installerPaymentsService.createInstaller({
                      name: installerFormData.name.trim(),
                      email: installerFormData.email.trim().toLowerCase(),
                      phone: installerFormData.phone.trim() || undefined,
                      isActive: installerFormData.isActive,
                    });
                    setActionNotice({ type: 'success', message: 'Installer registered.' });
                  }
                  setShowInstallerModal(false);
                  loadInstallers();
                } catch (err: any) {
                  setActionNotice({ type: 'error', message: err?.message || 'Failed to save installer' });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={installerFormData.name}
                  onChange={(e) => setInstallerFormData({ ...installerFormData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={installerFormData.email}
                  onChange={(e) => setInstallerFormData({ ...installerFormData, email: e.target.value })}
                  placeholder="e.g. ramesh@example.com"
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={installerFormData.phone}
                  onChange={(e) => setInstallerFormData({ ...installerFormData, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-hidden focus:border-[#7FB706]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInstallerModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl text-xs shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Installer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT MODEL ─────────────────────────────────────── */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0a091e] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="text-[#7FB706]" size={18} />
                <h3 className="font-bold text-white text-base">
                  {editingModel ? 'Edit Model Installation Rate' : 'Add Model SKU'}
                </h3>
              </div>
              <button
                onClick={() => setShowModelModal(false)}
                className="p-1 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const modelName = (form.elements.namedItem('modelName') as HTMLInputElement).value;
                const price = parseFloat(
                  (form.elements.namedItem('installationPrice') as HTMLInputElement).value
                );
                const category = (form.elements.namedItem('category') as HTMLSelectElement).value as any;

                try {
                  setIsSubmitting(true);
                  if (editingModel) {
                    await installerPaymentsService.updateModel(editingModel.id, {
                      modelName,
                      installationPrice: price,
                      category,
                    });
                    setActionNotice({ type: 'success', message: 'Model rate updated.' });
                  } else {
                    await installerPaymentsService.createModel({
                      modelName,
                      installationPrice: price,
                      category,
                    });
                    setActionNotice({ type: 'success', message: 'Model SKU created.' });
                  }
                  setShowModelModal(false);
                  loadModels();
                } catch (err: any) {
                  setActionNotice({ type: 'error', message: err?.message || 'Failed to save model' });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Category</label>
                <select
                  name="category"
                  defaultValue={editingModel?.category || 'CUBICLE'}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                >
                  <option value="CUBICLE">Restroom Cubicle</option>
                  <option value="UMP">Urinal Modesty Panel (UMP)</option>
                  <option value="LOCKER">Locker System</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Model Name</label>
                <input
                  name="modelName"
                  type="text"
                  required
                  defaultValue={editingModel?.modelName || ''}
                  placeholder="e.g. Model A (Standard Leg)"
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Installation Labor Price (₹ / unit)
                </label>
                <input
                  name="installationPrice"
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={editingModel?.installationPrice || 0}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-hidden focus:border-[#7FB706]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModelModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl text-xs shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstallerPaymentsPage;
