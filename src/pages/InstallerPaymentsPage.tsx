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
  InstallerAdvanceRecord,
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
  const [ledgerViewMode, setLedgerViewMode] = useState<'statement' | 'advances' | 'settlements' | 'bills'>('statement');

  // Payment Recording State
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [paymentRefNote, setPaymentRefNote] = useState<string>('');

  // Advance Recording State
  const [showAdvanceModal, setShowAdvanceModal] = useState<boolean>(false);
  const [advanceInstallerId, setAdvanceInstallerId] = useState<string>('');
  const [advanceBillId, setAdvanceBillId] = useState<string>('');
  const [advanceAmountInput, setAdvanceAmountInput] = useState<string>('');
  const [advanceDateInput, setAdvanceDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [advanceModeInput, setAdvanceModeInput] = useState<string>('BANK_TRANSFER');
  const [advanceNoteInput, setAdvanceNoteInput] = useState<string>('');
  const [advancesList, setAdvancesList] = useState<InstallerAdvanceRecord[]>([]);
  const [isLoadingAdvances, setIsLoadingAdvances] = useState<boolean>(false);
  const [advancesInstallerFilter, setAdvancesInstallerFilter] = useState<string>('all');

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

  // Load Advances
  const loadAdvances = async (installerId?: string) => {
    try {
      setIsLoadingAdvances(true);
      const res = await installerPaymentsService.listAdvances(
        installerId && installerId !== 'all' ? installerId : undefined
      );
      setAdvancesList(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error('Failed to load advances:', err);
      setAdvancesList([]);
    } finally {
      setIsLoadingAdvances(false);
    }
  };

  // Open Advance Modal Helper
  const openAdvanceModal = (installerId?: string, bill?: InstallerBill | null) => {
    setBillForAdvance(bill || null);
    const resolvedInstId = installerId || bill?.installerId || (installers.length > 0 ? installers[0].id : '');
    setAdvanceInstallerId(resolvedInstId);
    setAdvanceBillId(bill?.id || '');
    setAdvanceAmountInput(bill && Number(bill.balanceDue) > 0 ? String(Math.min(2000, Number(bill.balanceDue))) : '');
    setAdvanceDateInput(new Date().toISOString().split('T')[0]);
    setAdvanceModeInput('BANK_TRANSFER');
    setAdvanceNoteInput('');
    setShowAdvanceModal(true);
  };

  // Initial Data Fetch
  useEffect(() => {
    loadModels();
    loadInstallers();
    loadBills(1);
    loadAdvances();
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

  useEffect(() => {
    if (activeTab === 'advances') {
      loadAdvances(advancesInstallerFilter);
    }
  }, [activeTab, advancesInstallerFilter]);

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
    loadAdvances(advancesInstallerFilter);
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
    const amountNum = parseFloat(advanceAmountInput);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionNotice({ type: 'error', message: 'Please enter a valid advance disbursement amount.' });
      return;
    }

    const installerId = advanceInstallerId || billForAdvance?.installerId;
    if (!installerId && !billForAdvance) {
      setActionNotice({ type: 'error', message: 'Please select an installer for this advance disbursement.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const targetBillId = advanceBillId || billForAdvance?.id || undefined;

      const res = await installerPaymentsService.recordAdvance({
        installerId: installerId!,
        billId: targetBillId || null,
        amount: amountNum,
        paymentDate: advanceDateInput,
        paymentMode: advanceModeInput,
        referenceNote: advanceNoteInput.trim() || undefined,
      });

      const installerName = res?.installerName || billForAdvance?.installerName || 'Installer';
      const billNoStr = res?.billNo || billForAdvance?.billNo;

      setActionNotice({
        type: 'success',
        message: `Advance payment of ${formatINR(amountNum)} disbursed to ${installerName}${billNoStr ? ` on Job ${billNoStr}` : ''} successfully!`,
      });

      setShowAdvanceModal(false);
      setBillForAdvance(null);
      setAdvanceInstallerId('');
      setAdvanceBillId('');
      setAdvanceAmountInput('');
      setAdvanceNoteInput('');

      loadBills(currentPage);
      loadAdvances(advancesInstallerFilter);
      loadInstallers();
      if (selectedLedgerInstallerId) {
        loadInstallerLedger(selectedLedgerInstallerId);
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

    const {
      installer,
      kpis: lKpis,
      advances: lAdvances = [],
      payments: lSettlements = [],
      statementTransactions: lTxns = [],
    } = ledgerData;
    const formattedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const totalAdvancesVal =
      lKpis.totalAdvances ?? lAdvances.reduce((acc, a) => acc + (a.amount || 0), 0);
    const totalSettlementsVal =
      lKpis.totalSettlements ?? lSettlements.reduce((acc, s) => acc + (s.amount || 0), 0);
    const balanceDueVal = lKpis.balanceDue;

    const statementRows = (lTxns.length > 0 ? lTxns : []).map((tx, idx) => {
      const typeBadge =
        tx.type === 'BILL'
          ? '<span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8.5px;">JOB BILL</span>'
          : tx.type === 'ADVANCE'
          ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8.5px;">ADVANCE</span>'
          : '<span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8.5px;">SETTLEMENT</span>';

      const balanceColor = tx.balance > 0 ? '#b91c1c' : tx.balance < 0 ? '#b45309' : '#15803d';

      return `
        <tr>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 5px;">${idx + 1}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 5px; white-space: nowrap;">${new Date(tx.date).toLocaleDateString('en-IN')}</td>
          <td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; font-family: monospace;">${tx.reference}</td>
          <td style="border: 1px solid #cbd5e1; padding: 5px;">${tx.description || tx.siteAddress || 'N/A'}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 5px;">${typeBadge}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 5px; font-size: 8.5px;">${tx.paymentMode || '-'}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 5px; font-family: monospace;">${tx.debit > 0 ? '₹ ' + tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 5px; font-family: monospace; color: #047857;">${tx.credit > 0 ? '₹ ' + tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 5px; font-family: monospace; font-weight: bold; color: ${balanceColor};">₹ ${tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    const advanceRows = lAdvances.map((adv, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 4px;">${idx + 1}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 4px; white-space: nowrap;">${new Date(adv.paymentDate).toLocaleDateString('en-IN')}</td>
        <td style="text-align: right; border: 1px solid #cbd5e1; padding: 4px; font-family: monospace; font-weight: bold; color: #b45309;">₹ ${Number(adv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #cbd5e1; padding: 4px;">${adv.paymentMode || 'BANK_TRANSFER'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 4px;">${adv.bill?.billNo ? `${adv.bill.billNo} (${adv.bill.siteAddress || ''})` : 'General Upfront Advance'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 4px;">${adv.referenceNote || '-'}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Installer Statement of Account — ${installer.name}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; padding: 8px; background: #fff; line-height: 1.35; }
    .header-box { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
    .company-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 3px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .company-sub { font-size: 9px; color: #475569; margin: 0; }
    .doc-badge { background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-align: right; }
    .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
    .info-label { font-size: 8.5px; color: #64748b; text-transform: uppercase; font-weight: bold; }
    .info-val { font-size: 10px; font-weight: bold; color: #0f172a; }
    .kpi-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi-card { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; text-align: center; }
    .kpi-card.adv { background: #fffbeb; border-color: #fde68a; }
    .kpi-card.settled { background: #f0fdf4; border-color: #bbf7d0; }
    .kpi-card.balance { background: #fef2f2; border-color: #fecaca; }
    .kpi-card .k-num { font-size: 12px; font-weight: 800; font-family: monospace; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9px; }
    th { background: #e2e8f0; border: 1px solid #cbd5e1; padding: 5px; text-align: left; font-size: 8.5px; text-transform: uppercase; color: #334155; }
    td { border: 1px solid #cbd5e1; padding: 4px; }
    .section-title { font-size: 11px; font-weight: 800; margin: 14px 0 4px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px; display: flex; align-items: center; justify-content: space-between; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 30px; padding-top: 10px; }
    .sig-block { border-top: 1px solid #94a3b8; padding-top: 5px; text-align: center; font-size: 9px; color: #475569; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div class="company-title">PACIFIC PRODUCTS & SOLUTIONS</div>
      <div class="company-sub">Commercial Restroom Cubicle Systems & Architectural Hardware Master Contractor</div>
      <div class="company-sub">Plot No. 44, Sector 7, IMT Manesar, Gurugram, Haryana - 122050 | info@pacificproduct.in</div>
    </div>
    <div style="text-align: right;">
      <div class="doc-badge">STATEMENT OF ACCOUNT</div>
      <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Statement Date: <strong>${formattedDate}</strong></div>
    </div>
  </div>

  <div class="grid-info">
    <div>
      <div class="info-label">Installer / Contractor</div>
      <div class="info-val">${installer.name}</div>
      <div style="font-size: 9px; color: #475569;">Email: ${installer.email} | Phone: ${installer.phone || 'N/A'}</div>
    </div>
    <div style="text-align: right;">
      <div class="info-label">Account Status</div>
      <div class="info-val" style="color: ${balanceDueVal > 0 ? '#b91c1c' : balanceDueVal < 0 ? '#b45309' : '#15803d'};">
        ${balanceDueVal > 0 ? 'NET PAYABLE OUTSTANDING' : balanceDueVal < 0 ? 'EXCESS ADVANCE HELD' : 'ACCOUNT FULLY SETTLED'}
      </div>
      <div style="font-size: 9px; color: #475569;">Total Recorded Jobs: ${lKpis.totalBills} (${lKpis.totalUnits} Units)</div>
    </div>
  </div>

  <div class="kpi-strip">
    <div class="kpi-card">
      <div class="info-label">Gross Billed</div>
      <div class="k-num" style="color: #0f172a;">₹ ${lKpis.grossSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="kpi-card">
      <div class="info-label">Net Payable Due</div>
      <div class="k-num" style="color: #1e293b;">₹ ${lKpis.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="kpi-card adv">
      <div class="info-label" style="color: #92400e;">Total Advances</div>
      <div class="k-num" style="color: #b45309;">₹ ${totalAdvancesVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="kpi-card settled">
      <div class="info-label" style="color: #166534;">Settlements Paid</div>
      <div class="k-num" style="color: #15803d;">₹ ${totalSettlementsVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="kpi-card balance">
      <div class="info-label" style="color: #991b1b;">Net Balance</div>
      <div class="k-num" style="color: ${balanceDueVal > 0 ? '#b91c1c' : balanceDueVal < 0 ? '#b45309' : '#15803d'};">
        ₹ ${Math.abs(balanceDueVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
    </div>
  </div>

  <div class="section-title">
    <span>Chronological Statement of Account (Running Balance)</span>
    <span style="font-size: 9px; color: #64748b; font-weight: normal;">${lTxns.length} Transactions</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 3%; text-align: center;">#</th>
        <th style="width: 9%; text-align: center;">Date</th>
        <th style="width: 14%;">Doc / Ref #</th>
        <th style="width: 26%;">Description / Site Particulars</th>
        <th style="width: 10%; text-align: center;">Type</th>
        <th style="width: 8%; text-align: center;">Mode</th>
        <th style="width: 10%; text-align: right;">Billed (+)</th>
        <th style="width: 10%; text-align: right;">Disbursed (-)</th>
        <th style="width: 10%; text-align: right;">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${statementRows || '<tr><td colspan="9" style="text-align: center; padding: 12px; color: #94a3b8;">No statement transactions recorded.</td></tr>'}
    </tbody>
  </table>

  ${lAdvances.length > 0 ? `
  <div class="section-title" style="margin-top: 18px;">
    <span>Advance Disbursements Breakdown</span>
    <span style="font-size: 9px; color: #92400e; font-weight: normal;">Total: ₹ ${totalAdvancesVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 4%; text-align: center;">#</th>
        <th style="width: 12%; text-align: center;">Disbursed Date</th>
        <th style="width: 14%; text-align: right;">Amount (₹)</th>
        <th style="width: 15%;">Payment Mode</th>
        <th style="width: 25%;">Linked Job / Site</th>
        <th style="width: 30%;">Disbursement Notes / Purpose</th>
      </tr>
    </thead>
    <tbody>${advanceRows}</tbody>
  </table>` : ''}

  <div class="signatures">
    <div class="sig-block">
      <strong>Prepared By</strong><br/>
      Finance & Accounts Executive<br/>
      Pacific Products & Solutions
    </div>
    <div class="sig-block">
      <strong>Authorized Signatory</strong><br/>
      Pacific Commercial Systems<br/>
      (Seal & Stamp)
    </div>
    <div class="sig-block">
      <strong>Installer Acknowledgement</strong><br/>
      ${installer.name}<br/>
      Signature & Date
    </div>
  </div>

  <div style="margin-top: 20px; font-size: 8px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
    This is an officially verified Statement of Account generated by the Pacific Restroom Cubicle Enterprise ERP System. For reconciliation discrepancies, please email finance@pacificproduct.in.
  </div>

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
            onClick={() => openAdvanceModal()}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Coins size={16} />
            <span>Disburse Advance</span>
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
                                    onClick={() => openAdvanceModal(bill.installerId || undefined, bill)}
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
                              onClick={() => openAdvanceModal(bill.installerId || undefined, bill)}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Coins className="text-[#7FB706]" size={20} />
                  Payment Advance Management System
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Track, disburse, and reconcile all upfront advances issued to installers prior to job completion.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="px-3.5 py-2 bg-[#121226] border border-amber-500/30 rounded-xl flex items-center gap-2 font-mono">
                  <span className="text-xs text-gray-400">Total Advances:</span>
                  <span className="text-base font-bold text-amber-400">
                    {formatINR(kpis.totalAdvancePaid || 0)}
                  </span>
                </div>

                <button
                  onClick={() => openAdvanceModal(advancesInstallerFilter !== 'all' ? advancesInstallerFilter : undefined)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Coins size={16} /> Record Advance
                </button>
              </div>
            </div>

            {/* Filter by Installer */}
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                <span className="text-gray-400">Filter by Installer:</span>
                <select
                  value={advancesInstallerFilter}
                  onChange={(e) => setAdvancesInstallerFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[#030213] border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-400"
                >
                  <option value="all">All Certified Installers</option>
                  {installers.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.email})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-gray-400 font-mono">
                {advancesList.length} Voucher(s) • {bills.filter((b) => Number(b.advancePaid || 0) > 0).length} Job Link(s)
              </span>
            </div>
          </div>

          {/* Section A: Individual Advance Disbursements Register */}
          {advancesList.length > 0 && (
            <div className="bg-[#0a091e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Advance Payment Disbursements Register
                  </h3>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {advancesList.length} Transaction(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Installer</th>
                      <th className="py-3 px-4">Target Job / Bill Link</th>
                      <th className="py-3 px-4 text-right">Advance Amount</th>
                      <th className="py-3 px-4 text-center">Payment Mode</th>
                      <th className="py-3 px-4">Note / Purpose</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300 font-mono">
                    {advancesList.map((adv) => (
                      <tr key={adv.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-gray-400">{formatDate(adv.paymentDate)}</td>
                        <td className="py-3 px-4 font-sans">
                          <span className="font-semibold text-white block">
                            {adv.installer?.name || adv.bill?.installerName || 'Certified Contractor'}
                          </span>
                          <span className="text-[11px] text-gray-500 font-mono">
                            {adv.installer?.phone || adv.installer?.email || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {adv.bill ? (
                            <div>
                              <span className="font-mono font-bold text-[#B5F823]">
                                {adv.bill.billNo}
                              </span>
                              <span className="text-[11px] text-gray-500 block truncate max-w-[180px]">
                                {adv.bill.siteAddress}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-gray-400 border border-white/10 font-sans">
                              Upfront General Advance
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-400 text-sm">
                          {formatINR(adv.amount)}
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-gray-300">
                            {adv.paymentMode ? adv.paymentMode.replace('_', ' ') : 'BANK TRANSFER'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-gray-400 max-w-[220px] truncate">
                          {adv.referenceNote || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {adv.bill && Number(adv.bill.balanceDue) > 0 ? (
                            <button
                              onClick={() => {
                                const found = bills.find((b) => b.id === adv.billId);
                                if (found) {
                                  setBillForPayment(found);
                                  setPaymentAmount(String(found.balanceDue));
                                }
                              }}
                              className="px-2.5 py-1 bg-[#7FB706]/15 hover:bg-[#7FB706]/25 border border-[#7FB706]/30 text-[#B5F823] text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              Settle Due
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-sans">Reconciled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section B: List of Bills with Advances Disbursed */}
          <div className="bg-[#0a091e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers size={16} className="text-[#7FB706]" />
                Active Job Advances & Reconciliations
              </h3>
              <span className="text-xs text-gray-400">
                {bills.filter((b) => Number(b.advancePaid || 0) > 0).length} Job(s) with Advance
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {bills.filter((b) => Number(b.advancePaid || 0) > 0).length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs space-y-3">
                  <Coins className="mx-auto text-amber-400/60" size={32} />
                  <p className="text-sm font-medium text-white">No active job advances currently outstanding.</p>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    You can disburse an upfront advance to any certified installer before site completion.
                  </p>
                  <button
                    onClick={() => openAdvanceModal()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                  >
                    <Plus size={16} /> Disburse First Advance
                  </button>
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
                  Complete chronological statement of account with advance history, settlements, debits, credits, and vector PDF statements.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => openAdvanceModal(selectedLedgerInstallerId)}
                  disabled={!selectedLedgerInstallerId}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40 transition-all shadow-xs"
                >
                  <Coins size={15} className="text-amber-400" /> Disburse Advance
                </button>

                <button
                  onClick={handlePrintLedger}
                  disabled={!ledgerData || isLoadingLedger}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:text-white cursor-pointer disabled:opacity-40 transition-all"
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
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#7FB706]/20 cursor-pointer disabled:opacity-40 transition-all"
                >
                  <Download size={15} /> Export Excel
                </button>

                <button
                  onClick={() => {
                    if (selectedLedgerInstallerId) {
                      loadInstallerLedger(selectedLedgerInstallerId);
                    }
                  }}
                  disabled={!selectedLedgerInstallerId || isLoadingLedger}
                  className="inline-flex items-center gap-1.5 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-400 hover:text-white cursor-pointer disabled:opacity-40 transition-all"
                  title="Refresh Ledger"
                >
                  <RefreshCw size={15} className={isLoadingLedger ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Select Installer & Quick Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/5">
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

              {ledgerData?.installer && (
                <div className="text-xs text-gray-400 flex flex-wrap items-center gap-4 bg-[#121226] px-4 py-2.5 rounded-xl border border-white/5">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Contractor</span>
                    <span className="font-semibold text-white">{ledgerData.installer.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Email</span>
                    <span className="font-mono text-gray-300">{ledgerData.installer.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Phone</span>
                    <span className="font-mono text-gray-300">{ledgerData.installer.phone || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isLoadingLedger ? (
            <div className="p-12 text-center text-gray-400 bg-[#0a091e] rounded-2xl border border-white/10">
              <div className="animate-spin w-8 h-8 border-3 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm font-medium">Generating installer ledger statement & tracking history...</p>
            </div>
          ) : ledgerData ? (
            <div className="space-y-4">
              {/* Ledger KPIs (5 Key Financial Metrics) */}
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
                  <span className="text-[10px] text-gray-500">Net Due: {formatINR(ledgerData.kpis.netPayable)}</span>
                </div>

                <div className="bg-[#0a091e] border border-amber-500/20 rounded-2xl p-4">
                  <span className="text-xs text-amber-300">Total Advances</span>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                    {formatINR(ledgerData.kpis.totalAdvances || 0)}
                  </div>
                  <span className="text-[10px] text-amber-500/80">
                    {(ledgerData.advances?.length || 0)} advance disbursements
                  </span>
                </div>

                <div className="bg-[#0a091e] border border-emerald-500/20 rounded-2xl p-4">
                  <span className="text-xs text-emerald-300">Total Settlements</span>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                    {formatINR(
                      ledgerData.kpis.totalSettlements ??
                        Math.max(0, (ledgerData.kpis.totalPaid || 0) - (ledgerData.kpis.totalAdvances || 0))
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-500/80">
                    {(ledgerData.payments?.length || 0)} payments settled
                  </span>
                </div>

                <div
                  className={`bg-[#0a091e] border rounded-2xl p-4 ${
                    ledgerData.kpis.balanceDue > 0
                      ? 'border-rose-500/30'
                      : ledgerData.kpis.balanceDue < 0
                      ? 'border-amber-500/30'
                      : 'border-emerald-500/30'
                  }`}
                >
                  <span
                    className={`text-xs ${
                      ledgerData.kpis.balanceDue > 0
                        ? 'text-rose-300'
                        : ledgerData.kpis.balanceDue < 0
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                    }`}
                  >
                    {ledgerData.kpis.balanceDue > 0
                      ? 'Balance Payable'
                      : ledgerData.kpis.balanceDue < 0
                      ? 'Excess Advance Held'
                      : 'Account Cleared'}
                  </span>
                  <div
                    className={`text-lg font-bold font-mono mt-1 ${
                      ledgerData.kpis.balanceDue > 0
                        ? 'text-rose-400'
                        : ledgerData.kpis.balanceDue < 0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {formatINR(Math.abs(ledgerData.kpis.balanceDue))}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {ledgerData.kpis.balanceDue > 0
                      ? 'Company owes installer'
                      : ledgerData.kpis.balanceDue < 0
                      ? 'Installer holds advance balance'
                      : 'Zero liability'}
                  </span>
                </div>
              </div>

              {/* View Mode Navigation Pills */}
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => setLedgerViewMode('statement')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    ledgerViewMode === 'statement'
                      ? 'bg-[#7FB706] text-black shadow-lg shadow-[#7FB706]/20'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <FileText size={14} />
                  <span>Statement of Account (Running Balance)</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      ledgerViewMode === 'statement' ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {ledgerData.statementTransactions?.length ??
                      ledgerData.bills.length + (ledgerData.advances?.length || 0) + (ledgerData.payments?.length || 0)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerViewMode('advances')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    ledgerViewMode === 'advances'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-bold'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Coins size={14} />
                  <span>Advance History</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      ledgerViewMode === 'advances' ? 'bg-black/20 text-black font-bold' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {ledgerData.advances?.length ?? 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerViewMode('settlements')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    ledgerViewMode === 'settlements'
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-bold'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <CreditCard size={14} />
                  <span>Payment Settlements</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      ledgerViewMode === 'settlements'
                        ? 'bg-black/20 text-black font-bold'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {ledgerData.payments?.length ?? 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerViewMode('bills')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    ledgerViewMode === 'bills'
                      ? 'bg-[#B5F823] text-black shadow-lg font-bold'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Receipt size={14} />
                  <span>Job Bills</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      ledgerViewMode === 'bills' ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {ledgerData.bills.length}
                  </span>
                </button>
              </div>

              {/* ─── VIEW 1: STATEMENT OF ACCOUNT (RUNNING BALANCE) ─── */}
              {ledgerViewMode === 'statement' && (
                <div className="bg-[#0a091e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">Chronological Statement of Account</h3>
                      <p className="text-xs text-gray-400">
                        Running balance ledger showing all job charges (Debits) and disbursements (Credits).
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4 text-center">Type</th>
                          <th className="py-3 px-4">Doc / Ref #</th>
                          <th className="py-3 px-4">Particulars / Site Location</th>
                          <th className="py-3 px-4 text-center">Mode</th>
                          <th className="py-3 px-4 text-right">Debit (+ Work)</th>
                          <th className="py-3 px-4 text-right">Credit (- Paid)</th>
                          <th className="py-3 px-4 text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300 font-mono">
                        {(ledgerData.statementTransactions || []).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-gray-500 font-sans">
                              No statement transactions recorded for this installer yet.
                            </td>
                          </tr>
                        ) : (
                          (ledgerData.statementTransactions || []).map((tx) => (
                            <tr key={tx.id} className="hover:bg-white/5">
                              <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                                {formatDate(tx.date)}
                              </td>
                              <td className="py-3 px-4 text-center font-sans whitespace-nowrap">
                                {tx.type === 'BILL' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                    JOB BILL
                                  </span>
                                ) : tx.type === 'ADVANCE' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    ADVANCE
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    SETTLEMENT
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                                {tx.reference}
                              </td>
                              <td className="py-3 px-4 font-sans text-gray-300 max-w-[280px] truncate" title={tx.description}>
                                {tx.description}
                              </td>
                              <td className="py-3 px-4 text-center text-gray-400 font-sans text-[11px] whitespace-nowrap">
                                {tx.paymentMode || '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-white font-bold whitespace-nowrap">
                                {tx.debit > 0 ? formatINR(tx.debit) : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-400 font-bold whitespace-nowrap">
                                {tx.credit > 0 ? formatINR(tx.credit) : '-'}
                              </td>
                              <td
                                className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                                  tx.balance > 0
                                    ? 'text-rose-400'
                                    : tx.balance < 0
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {tx.balance < 0 ? `-${formatINR(Math.abs(tx.balance))}` : formatINR(tx.balance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── VIEW 2: ADVANCE HISTORY TABLE ─── */}
              {ledgerViewMode === 'advances' && (
                <div className="bg-[#0a091e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Coins className="text-amber-400" size={16} />
                        Advance Disbursements History
                      </h3>
                      <p className="text-xs text-gray-400">
                        Upfront mobilization and site arrival advances disbursed to {ledgerData.installer.name}.
                      </p>
                    </div>

                    <button
                      onClick={() => openAdvanceModal(selectedLedgerInstallerId)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      + Disburse Advance
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4 text-right">Advance Amount</th>
                          <th className="py-3 px-4 text-center">Payment Mode</th>
                          <th className="py-3 px-4">Target Job / Bill Link</th>
                          <th className="py-3 px-4">Disbursement Notes / Purpose</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300 font-mono">
                        {(ledgerData.advances || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-gray-500 font-sans">
                              <Coins size={32} className="mx-auto text-amber-500/40 mb-2" />
                              <p className="font-medium text-gray-400">No advance disbursements found for this installer.</p>
                              <button
                                onClick={() => openAdvanceModal(selectedLedgerInstallerId)}
                                className="mt-3 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold cursor-pointer"
                              >
                                + Disburse First Advance
                              </button>
                            </td>
                          </tr>
                        ) : (
                          (ledgerData.advances || []).map((adv) => (
                            <tr key={adv.id} className="hover:bg-white/5">
                              <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                                {formatDate(adv.paymentDate)}
                              </td>
                              <td className="py-3 px-4 text-right text-amber-400 font-bold text-sm whitespace-nowrap">
                                {formatINR(adv.amount)}
                              </td>
                              <td className="py-3 px-4 text-center font-sans text-xs">
                                <span className="px-2 py-0.5 rounded-lg bg-white/5 text-gray-300 border border-white/5">
                                  {adv.paymentMode || 'BANK_TRANSFER'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-sans text-white">
                                {adv.bill ? (
                                  <div>
                                    <span className="font-mono font-bold text-white">{adv.bill.billNo}</span>
                                    {adv.bill.siteAddress && (
                                      <span className="text-gray-400 text-[11px] block truncate max-w-[220px]">
                                        {adv.bill.siteAddress}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-amber-400/90 text-xs italic">
                                    General Upfront Advance (Unallocated)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-sans text-gray-300 max-w-[260px] truncate">
                                {adv.referenceNote || 'Advance disbursement for site transit and mobilization'}
                              </td>
                              <td className="py-3 px-4 text-center font-sans">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  DISBURSED
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── VIEW 3: PAYMENT SETTLEMENTS TABLE ─── */}
              {ledgerViewMode === 'settlements' && (
                <div className="bg-[#0a091e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <CreditCard className="text-emerald-400" size={16} />
                        Job Bill Payment Settlements
                      </h3>
                      <p className="text-xs text-gray-400">
                        Settlements and clearance installments paid against specific installation bills.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Payment Date</th>
                          <th className="py-3 px-4">Bill No</th>
                          <th className="py-3 px-4">Site Location</th>
                          <th className="py-3 px-4 text-right">Settled Amount</th>
                          <th className="py-3 px-4 text-center">Payment Mode</th>
                          <th className="py-3 px-4">Reference / Remarks</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300 font-mono">
                        {(ledgerData.payments || []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-gray-500 font-sans">
                              <CreditCard size={32} className="mx-auto text-emerald-500/40 mb-2" />
                              <p className="font-medium text-gray-400">No payment settlements recorded yet.</p>
                            </td>
                          </tr>
                        ) : (
                          (ledgerData.payments || []).map((pmt) => (
                            <tr key={pmt.id} className="hover:bg-white/5">
                              <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                                {formatDate(pmt.paymentDate)}
                              </td>
                              <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                                {pmt.bill?.billNo || 'DIRECT'}
                              </td>
                              <td className="py-3 px-4 font-sans text-gray-300 max-w-[200px] truncate">
                                {pmt.bill?.siteAddress || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-400 font-bold text-sm whitespace-nowrap">
                                {formatINR(pmt.amount)}
                              </td>
                              <td className="py-3 px-4 text-center font-sans text-xs">
                                <span className="px-2 py-0.5 rounded-lg bg-white/5 text-gray-300 border border-white/5">
                                  {pmt.paymentMode || 'BANK_TRANSFER'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-sans text-gray-300 max-w-[260px] truncate">
                                {pmt.referenceNote || 'Bill clearance settlement payment'}
                              </td>
                              <td className="py-3 px-4 text-center font-sans">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  SETTLED
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─── VIEW 4: JOB BILLS TABLE ─── */}
              {ledgerViewMode === 'bills' && (
                <div className="bg-[#0a091e] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Receipt className="text-[#B5F823]" size={16} />
                        Itemized Installation Job Bills
                      </h3>
                      <p className="text-xs text-gray-400">
                        All verified installation bills submitted by {ledgerData.installer.name}.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
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
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300 font-mono">
                        {ledgerData.bills.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-gray-500 font-sans">
                              No installation bills recorded for this installer.
                            </td>
                          </tr>
                        ) : (
                          ledgerData.bills.map((b) => (
                            <tr key={b.id} className="hover:bg-white/5">
                              <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                                {formatDate(b.installDate)}
                              </td>
                              <td className="py-3 px-4 font-bold text-white whitespace-nowrap">{b.billNo}</td>
                              <td className="py-3 px-4 font-sans text-gray-300 truncate max-w-[200px]">
                                {b.siteAddress}
                              </td>
                              <td className="py-3 px-4 text-right text-white font-bold whitespace-nowrap">
                                {formatINR(b.total)}
                              </td>
                              <td className="py-3 px-4 text-right text-amber-400 whitespace-nowrap">
                                {Number(b.advancePaid || 0) > 0 ? formatINR(b.advancePaid) : '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-400 whitespace-nowrap">
                                {formatINR(b.amountPaid)}
                              </td>
                              <td
                                className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                                  Number(b.balanceDue) > 0 ? 'text-rose-400' : 'text-[#B5F823]'
                                }`}
                              >
                                {formatINR(b.balanceDue)}
                              </td>
                              <td className="py-3 px-4 text-center font-sans whitespace-nowrap">
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
                              <td className="py-3 px-4 text-center font-sans whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedBillForDetails(b)}
                                  className="px-2.5 py-1 text-xs text-[#B5F823] bg-[#7FB706]/10 hover:bg-[#7FB706]/20 rounded-lg cursor-pointer transition-all"
                                >
                                  View Bill
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                      onClick={() => openAdvanceModal(inst.id)}
                      className="px-2 py-1 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg cursor-pointer"
                      title="Disburse Advance to Installer"
                    >
                      + Advance
                    </button>
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
      {/* ─── MODAL: DISBURSE ADVANCE (USER REQUESTED) ────────────────────────── */}
      {(showAdvanceModal || billForAdvance) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0a091e] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="text-amber-400" size={20} />
                <h3 className="font-bold text-white text-base">Record Advance Disbursement</h3>
              </div>
              <button
                onClick={() => {
                  setShowAdvanceModal(false);
                  setBillForAdvance(null);
                }}
                className="p-1 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Installer & Target Job Selection */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Certified Installer <span className="text-rose-400">*</span>
                </label>
                {billForAdvance ? (
                  <div className="px-3 py-2 bg-[#121226] border border-white/10 rounded-xl text-sm font-semibold text-white flex items-center justify-between">
                    <span>{billForAdvance.installerName}</span>
                    <span className="text-xs font-mono text-gray-400">{billForAdvance.billNo}</span>
                  </div>
                ) : (
                  <select
                    value={advanceInstallerId}
                    onChange={(e) => {
                      setAdvanceInstallerId(e.target.value);
                      setAdvanceBillId('');
                    }}
                    required
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value="">-- Select Installer --</option>
                    {installers.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Target Bill Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Target Job / Bill Link (Optional)
                </label>
                {billForAdvance ? (
                  <div className="text-xs bg-[#121226] p-3 rounded-xl border border-white/5 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bill Number:</span>
                      <span className="font-mono font-bold text-white">{billForAdvance.billNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Job Total:</span>
                      <span className="font-mono font-bold text-white">{formatINR(billForAdvance.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Remaining Balance:</span>
                      <span className="font-mono font-bold text-rose-400">
                        {formatINR(billForAdvance.balanceDue)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <select
                    value={advanceBillId}
                    onChange={(e) => {
                      setAdvanceBillId(e.target.value);
                      const selected = bills.find((b) => b.id === e.target.value);
                      if (selected && Number(selected.balanceDue) > 0) {
                        setAdvanceAmountInput(String(Math.min(2000, Number(selected.balanceDue))));
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value="">General Upfront Advance (Unallocated Site Fund)</option>
                    {bills
                      .filter((b) => !advanceInstallerId || b.installerId === advanceInstallerId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.billNo} — {b.installerName} (Due: {formatINR(b.balanceDue)})
                        </option>
                      ))}
                  </select>
                )}
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
                  Advance Note / Reference / Purpose
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
                  onClick={() => {
                    setShowAdvanceModal(false);
                    setBillForAdvance(null);
                  }}
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
