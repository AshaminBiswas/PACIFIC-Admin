import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard, Plus, Search, CheckCircle, AlertTriangle,
  Clock, DollarSign, ArrowUpRight, ArrowDownLeft, RefreshCw, X,
  Mail, Printer, Download, Filter, FileText, ChevronRight, Calendar, User, ExternalLink, Sparkles,
  History, Building, Copy, Check
} from 'lucide-react';
import { financeApi, followupsApi, crmApi } from '../api/services';
import type {
  Payment, ReceivableEntry, PayableEntry, LedgerSummary,
  RecoveryDashboardStats, BusinessParty, PaymentFollowup,
  CustomerLedgerStatement, CustomerLedgerEntry
} from '../types/admin';
import { SendLedgerEmailModal } from '../components/finance/SendLedgerEmailModal';
import { LogFollowupModal } from '../components/finance/LogFollowupModal';
import { RecordPaymentModal } from '../components/finance/RecordPaymentModal';
import { ManualLedgerEntryModal } from '../components/finance/ManualLedgerEntryModal';

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'receivables' | 'recovery' | 'ledger'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receivables, setReceivables] = useState<ReceivableEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [recoveryStats, setRecoveryStats] = useState<RecoveryDashboardStats | null>(null);
  const [followups, setFollowups] = useState<PaymentFollowup[]>([]);
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [loading, setLoading] = useState(true);

  // Follow-up quick modal (general)
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupCustomerId, setFollowupCustomerId] = useState('');
  const [followupAmount, setFollowupAmount] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');

  // ── Customer Ledger State ──────────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerLedger, setCustomerLedger] = useState<CustomerLedgerStatement | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'MONTH' | '30DAYS' | 'FY' | 'CUSTOM'>('ALL');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Modals for Ledger Tab
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [cadenceRunning, setCadenceRunning] = useState(false);
  const [cadenceFeedback, setCadenceFeedback] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, recRes, sumRes, recovRes, folRes, custRes] = await Promise.all([
        financeApi.listPayments({ limit: 50 }),
        financeApi.getReceivables(),
        financeApi.getSummary(),
        followupsApi.getDashboard(),
        followupsApi.list({ limit: 50 }),
        crmApi.listCustomers({ limit: 100 }),
      ]);

      if (payRes.data?.data) setPayments(payRes.data.data.items || []);
      if (recRes.data?.data) setReceivables(recRes.data.data || []);
      if (sumRes.data?.data) setSummary(sumRes.data.data);
      if (recovRes.data?.data) setRecoveryStats(recovRes.data.data);
      if (folRes.data?.data) setFollowups(folRes.data.data.items || []);
      if (custRes.data?.data) {
        const custList = custRes.data.data.items || [];
        setCustomers(custList);
        if (!selectedCustomerId && custList.length > 0) {
          setSelectedCustomerId(custList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch Customer Ledger when customer or date range changes
  const fetchCustomerLedger = useCallback(async (customerId: string, from?: string, to?: string) => {
    if (!customerId) return;
    setLedgerLoading(true);
    try {
      const res = await financeApi.getCustomerLedger(customerId, { fromDate: from, toDate: to });
      if (res.data?.data) {
        setCustomerLedger(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load customer ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ledger' && selectedCustomerId) {
      let fromDate: string | undefined;
      let toDate: string | undefined;

      const now = new Date();
      if (dateFilter === 'MONTH') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else if (dateFilter === '30DAYS') {
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateFilter === 'FY') {
        const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        fromDate = new Date(currentYear, 3, 1).toISOString();
      } else if (dateFilter === 'CUSTOM') {
        fromDate = customFromDate || undefined;
        toDate = customToDate || undefined;
      }

      fetchCustomerLedger(selectedCustomerId, fromDate, toDate);
    }
  }, [activeTab, selectedCustomerId, dateFilter, customFromDate, customToDate, fetchCustomerLedger]);

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await followupsApi.create({
        customerId: followupCustomerId,
        outstandingAmount: Number(followupAmount),
        nextFollowupDate: nextFollowupDate || undefined,
        notes: followupNotes,
      });
      setShowFollowupModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create follow-up:', err);
    }
  };

  const handleRunCadenceCheck = async () => {
    try {
      setCadenceRunning(true);
      setCadenceFeedback(null);
      const res = await followupsApi.runCadence();
      const count = res.data?.data?.remindersSent ?? 0;
      const escalated = res.data?.data?.escalatedCount ?? 0;
      setCadenceFeedback(`Cadence check finished: ${count} reminder emails dispatched, ${escalated} accounts escalated to manual follow-up.`);
      fetchData();
      if (selectedCustomerId) {
        fetchCustomerLedger(selectedCustomerId);
      }
    } catch (err: any) {
      setCadenceFeedback(err.response?.data?.message || err.message || 'Cadence run failed.');
    } finally {
      setCadenceRunning(false);
    }
  };

  const handlePrintStatement = () => {
    if (!customerLedger) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the statement.');
      return;
    }

    const { customer, summary, entries, company } = customerLedger;
    const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const bankAccount = company?.bankAccount || {
      bankName: 'Central Bank Of India',
      accountNumber: '3466708013',
      ifscCode: 'CBIN0283809',
      swiftCode: 'CBININBBCFD',
      branch: 'B-20, Ganga Vihar, Gokalpuri, Delhi - 110094',
    };

    const signatory = company?.signatory || {
      name: 'Ejajul Shaikh',
      designation: 'Company Head',
      signatureUrl: null,
    };

    const companyLegalName = company?.legalName || 'Pacific Products & Solutions';
    const companyAddress = company?.address || 'B-20, Ganga Vihar, Gokalpuri, Delhi - 110094';
    const companyPhone = company?.phone || '011 4118 3600';
    const companyGstin = company?.gstin || '19AAHFP8823J1Z8';
    const companyPan = company?.pan || 'AAHFP8823J';

    const rows = entries
      .map(
        (e) => `
      <tr>
        <td style="text-align: center; border: 1px solid #000000; padding: 4px 6px;">${e.serialNo}</td>
        <td style="text-align: center; border: 1px solid #000000; padding: 4px 6px; white-space: nowrap;">${new Date(e.date).toLocaleDateString('en-IN')}</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold; font-family: monospace;">${e.docRef}</td>
        <td style="border: 1px solid #000000; padding: 4px 6px;">${e.description}</td>
        <td style="text-align: center; border: 1px solid #000000; padding: 4px 6px; font-size: 8.5px;">${e.dueDate ? new Date(e.dueDate).toLocaleDateString('en-IN') : '-'}</td>
        <td style="text-align: right; border: 1px solid #000000; padding: 4px 6px; font-family: monospace;">${e.debit > 0 ? e.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
        <td style="text-align: right; border: 1px solid #000000; padding: 4px 6px; font-family: monospace;">${e.credit > 0 ? e.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
        <td style="text-align: right; border: 1px solid #000000; padding: 4px 6px; font-weight: bold; font-family: monospace;">₹ ${e.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Statement of Account — ${customer.legalName}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #000000;
      margin: 0;
      padding: 10px;
      font-size: 9.5px;
      line-height: 1.35;
      background: #ffffff;
    }
    .container {
      border: 1px solid #000000;
      padding: 14px;
      box-sizing: border-box;
      min-height: 275mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border-bottom: 1px solid #000000; padding-bottom: 8px; }
    .header-table td { vertical-align: top; }
    .title-badge { font-size: 15px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; color: #000000; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000000; }
    .info-table td { padding: 6px 8px; vertical-align: top; font-size: 9px; }
    .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000000; }
    .kpi-table th { background: #f4f4f5; color: #000000; font-size: 8px; text-transform: uppercase; padding: 5px 6px; border: 1px solid #000000; font-weight: bold; }
    .kpi-table td { padding: 5px 6px; font-size: 10px; font-weight: bold; text-align: center; border: 1px solid #000000; font-family: monospace; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000000; }
    .items-table th {
      background: #f4f4f5;
      color: #000000;
      font-size: 8.5px;
      text-transform: uppercase;
      padding: 5px 6px;
      border: 1px solid #000000;
      font-weight: bold;
    }
    .items-table td { font-size: 9px; }
    .summary-card { width: 100%; border-collapse: collapse; border: 1px solid #000000; margin-bottom: 8px; }
    .summary-card td { padding: 6px 8px; vertical-align: top; font-size: 9px; }
    @media print {
      body { padding: 0; }
      .container { border: none; padding: 0; min-height: auto; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div>
      <!-- Header -->
      <table class="header-table">
        <tr>
          <td style="width: 58%;">
            <div style="font-size: 16px; font-weight: 900; letter-spacing: 0.5px; color: #000000;">
              ${companyLegalName}
            </div>
            <div style="font-size: 8.5px; color: #444444; margin-top: 2px;">
              ${companyAddress}
            </div>
            <div style="font-size: 8.5px; color: #444444; margin-top: 1px;">
              Phone: ${companyPhone} | GSTIN: ${companyGstin} | PAN: ${companyPan}
            </div>
          </td>
          <td style="width: 42%; text-align: right;">
            <div class="title-badge">STATEMENT OF ACCOUNT</div>
            <div style="font-size: 8.5px; color: #555555; margin-top: 2px;">
              Document Date: <strong>${formattedDate}</strong>
            </div>
            <div style="font-size: 8.5px; color: #555555;">
              Account Currency: <strong>INR (₹)</strong>
            </div>
            ${
              summary.overdueAmount > 0
                ? `<div style="display: inline-block; margin-top: 4px; padding: 2px 8px; border: 1px solid #000000; font-size: 9px; font-weight: bold; background: #fee2e2;">OVERDUE: ₹ ${summary.overdueAmount.toLocaleString('en-IN')}</div>`
                : summary.closingBalance < 0
                ? `<div style="display: inline-block; margin-top: 4px; padding: 2px 8px; border: 1px solid #000000; font-size: 9px; font-weight: bold; background: #ecfdf5; color: #065f46;">ADVANCE IN HAND: ₹ ${Math.abs(summary.closingBalance).toLocaleString('en-IN')}</div>`
                : `<div style="display: inline-block; margin-top: 4px; padding: 2px 8px; border: 1px solid #000000; font-size: 9px; font-weight: bold; background: #f0fdf4;">ACCOUNT IN GOOD STANDING</div>`
            }
          </td>
        </tr>
      </table>

      <!-- Statement Recipient -->
      <table class="info-table">
        <tr>
          <td style="width: 55%; border-right: 1px solid #000000;">
            <div style="font-size: 8px; text-transform: uppercase; color: #555555; font-weight: bold;">Statement Issued To:</div>
            <div style="font-size: 12px; font-weight: bold; margin: 1px 0;">${customer.legalName}</div>
            ${customer.tradeName ? `<div style="font-size: 9px; color: #333333;">(${customer.tradeName})</div>` : ''}
            <div style="font-size: 8.5px; margin-top: 2px;">
              ${customer.gstin ? `<strong>GSTIN:</strong> ${customer.gstin} | ` : ''}
              ${customer.pan ? `<strong>PAN:</strong> ${customer.pan}` : ''}
            </div>
          </td>
          <td style="width: 45%;">
            <div style="font-size: 8px; text-transform: uppercase; color: #555555; font-weight: bold;">Account Summary Details:</div>
            <div style="margin-top: 2px;">Payment Terms: <strong>${customer.paymentTermsDays} Days Net</strong></div>
            <div>Approved Credit Limit: <strong>${customer.creditLimit ? `₹ ${customer.creditLimit.toLocaleString('en-IN')}` : 'Standard / Open'}</strong></div>
            <div>Total Transactions: <strong>${summary.totalTransactions} Records</strong></div>
            ${summary.daysOverdue > 0 ? `<div style="color: #b91c1c; font-weight: bold; margin-top: 2px;">Oldest Overdue: ${summary.daysOverdue} Days Matured</div>` : ''}
          </td>
        </tr>
      </table>

      <!-- Financial Snapshot KPI Matrix -->
      <table class="kpi-table">
        <thead>
          <tr>
            <th>Opening Balance</th>
            <th>Total Invoiced / Debits</th>
            <th>Total Payments / Credits</th>
            <th>Net Position</th>
            <th>Overdue Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>₹ ${summary.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>₹ ${summary.periodDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="color: #15803d;">₹ ${summary.periodCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="color: ${summary.closingBalance > 0 ? '#b91c1c' : '#15803d'};">
              ${summary.closingBalance < 0 ? `(Cr) ₹ ${Math.abs(summary.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `₹ ${summary.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            </td>
            <td style="color: ${summary.overdueAmount > 0 ? '#b91c1c' : '#15803d'};">
              ₹ ${summary.overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Itemized Ledger Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 4%;">#</th>
            <th style="width: 11%;">Date</th>
            <th style="width: 19%;">Document Ref</th>
            <th style="width: 28%;">Nature / Description</th>
            <th style="width: 10%;">Due Date</th>
            <th style="width: 10%; text-align: right;">Debit (₹)</th>
            <th style="width: 10%; text-align: right;">Credit (₹)</th>
            <th style="width: 11%; text-align: right;">Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr style="background: #f4f4f5; font-weight: bold;">
            <td colspan="5" style="border: 1px solid #000000; padding: 5px 6px; text-align: right; font-size: 8.5px; text-transform: uppercase;">Period Totals:</td>
            <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right; font-family: monospace;">₹ ${summary.periodDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right; font-family: monospace; color: #15803d;">₹ ${summary.periodCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right; font-family: monospace; color: ${summary.closingBalance > 0 ? '#b91c1c' : '#15803d'};">
              ₹ ${summary.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Bottom Section: Bank Remittance & Official Sign-off -->
    <div>
      <table class="summary-card">
        <tr>
          <td style="width: 60%; border-right: 1px solid #000000;">
            <div style="font-size: 8px; text-transform: uppercase; font-weight: bold; color: #555555;">Entity Bank Accounts & Remittance Info (From Company Settings):</div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 3px; font-size: 8.5px;">
              <tr><td style="width: 28%; font-weight: bold; padding: 1px 0;">Bank Name:</td><td>${bankAccount.bankName}</td></tr>
              <tr><td style="font-weight: bold; padding: 1px 0;">Account No:</td><td style="font-family: monospace; font-weight: bold;">${bankAccount.accountNumber}</td></tr>
              <tr><td style="font-weight: bold; padding: 1px 0;">IFSC Code:</td><td style="font-family: monospace; font-weight: bold;">${bankAccount.ifscCode}</td></tr>
              <tr><td style="font-weight: bold; padding: 1px 0;">Branch:</td><td>${bankAccount.branch}</td></tr>
              <tr><td style="font-weight: bold; padding: 1px 0;">Beneficiary:</td><td style="font-weight: bold;">${companyLegalName}</td></tr>
            </table>
          </td>
          <td style="width: 40%; text-align: right;">
            <div style="font-size: 8px; text-transform: uppercase; color: #555555; font-weight: bold;">Authorized Signatory:</div>
            <div style="font-size: 9px; font-weight: bold; margin-top: 2px;">For ${companyLegalName}</div>
            <div style="height: 38px;"></div>
            <div style="font-size: 9.5px; font-weight: bold; border-top: 1px solid #000000; display: inline-block; padding-top: 2px;">
              ${signatory?.name || 'Ejajul Shaikh'}
            </div>
            <div style="font-size: 8px; color: #444444;">${signatory?.designation || 'Company Head / Authorized Signatory'}</div>
          </td>
        </tr>
      </table>
    </div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportCsv = () => {
    if (!customerLedger) return;
    const { customer, summary, entries } = customerLedger;
    let csv = `Statement of Account — ${customer.legalName}\n`;
    csv += `Payment Terms,${customer.paymentTermsDays} Days Net\n`;
    csv += `Closing Balance,₹ ${summary.closingBalance}\n\n`;
    csv += `#Date,Reference,Type,Description,Debit,Credit,Running Balance\n`;

    entries.forEach((e) => {
      csv += `"${new Date(e.date).toLocaleDateString('en-GB')}","${e.docRef}","${e.docType}","${e.description.replace(/"/g, '""')}",${e.debit},${e.credit},${e.runningBalance}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ledger_${customer.legalName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLedgerEntries = customerLedger?.entries.filter((e) => {
    if (!ledgerSearch.trim()) return true;
    const q = ledgerSearch.toLowerCase();
    return (
      e.docRef.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.docType.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#7FB706]" />
            Finance, Ledger & Dues Recovery
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Real-time party ledger calculations, date-sorted debits & credits, 3-day automated escalation cadence, and manual email dispatches
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunCadenceCheck}
            disabled={cadenceRunning}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-xl border border-purple-500/20 cursor-pointer transition disabled:opacity-50"
            title="Evaluate 3-day overdue cadence across all accounts"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            {cadenceRunning ? 'Evaluating...' : 'Run Auto-Cadence Check'}
          </button>
          <Link to="/admin/dashboard/payments/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 cursor-pointer">
            <Plus className="w-4 h-4" /> Record Payment
          </Link>
          <button
            onClick={() => setShowFollowupModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs sm:text-sm font-medium rounded-xl border border-white/5 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-400" /> New Follow-up
          </button>
        </div>
      </div>

      {cadenceFeedback && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between text-xs text-purple-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{cadenceFeedback}</span>
          </div>
          <button onClick={() => setCadenceFeedback(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <span className="text-xs text-gray-400">Total Receivables</span>
          <div className="text-lg sm:text-xl font-bold text-white mt-1">
            ₹ {(summary?.receivables?.total || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-gray-500">From all issued PIs & Orders</span>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <span className="text-xs text-gray-400">Outstanding Dues</span>
          <div className="text-lg sm:text-xl font-bold text-amber-400 mt-1">
            ₹ {(summary?.receivables?.outstanding || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-amber-500/80">Pending recovery</span>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <span className="text-xs text-gray-400">Collected Amount</span>
          <div className="text-lg sm:text-xl font-bold text-[#7FB706] mt-1">
            ₹ {(summary?.receivables?.collected || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#7FB706]/80">Confirmed in bank</span>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <span className="text-xs text-gray-400">Promise-to-Pay Dues</span>
          <div className="text-lg sm:text-xl font-bold text-blue-400 mt-1">
            ₹ {(recoveryStats?.promiseToPayAmount || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-blue-400/80">{recoveryStats?.promiseToPayCount || 0} Clients committed</span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'payments' ? 'border-[#7FB706] text-[#7FB706]' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Payment Transactions
        </button>
        <button
          onClick={() => setActiveTab('receivables')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'receivables' ? 'border-[#7FB706] text-[#7FB706]' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Receivables Ledger
        </button>
        <button
          onClick={() => setActiveTab('recovery')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'recovery' ? 'border-[#7FB706] text-[#7FB706]' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Recovery & Follow-ups
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ledger' ? 'border-[#7FB706] text-[#7FB706]' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Customer Ledger & Statement
        </button>
      </div>

      {/* ── Tab 1: Payments List ────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#0e0e1e] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Party</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Method & Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 text-xs">No payment records yet</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-semibold text-white">{p.party?.legalName || 'Party'}</td>
                      <td className="py-3 px-4 text-xs font-mono text-gray-400">{p.paymentType}</td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold text-gray-200">{p.paymentMethod}</div>
                        {p.referenceNumber && <div className="text-gray-500">Ref: {p.referenceNumber}</div>}
                      </td>
                      <td className="py-3 px-4 text-xs">{new Date(p.paymentDate).toLocaleDateString('en-GB')}</td>
                      <td className="py-3 px-4 font-bold text-[#7FB706]">₹ {Number(p.amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                          {p.status}
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

      {/* ── Tab 2: Receivables Ledger ───────────────────────────────────────── */}
      {activeTab === 'receivables' && (
        <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#0e0e1e] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">PI Ref</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {receivables.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 text-xs">No open receivables</td>
                  </tr>
                ) : (
                  receivables.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-semibold text-white">{r.customer?.party?.legalName || 'Customer'}</td>
                      <td className="py-3 px-4 text-xs font-mono text-gray-300">{r.proformaInvoice?.piNumber || '-'}</td>
                      <td className="py-3 px-4 text-xs">₹ {Number(r.totalAmount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-xs text-[#7FB706]">₹ {Number(r.paidAmount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 font-bold text-amber-400">₹ {Number(r.balanceAmount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400">
                          {r.status}
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

      {/* ── Tab 3: Recovery & Follow-ups ────────────────────────────────────── */}
      {activeTab === 'recovery' && (
        <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {followups.map((f) => (
              <div key={f.id} className="bg-[#0a0a1a] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{f.customer?.legalName || 'Customer'}</h4>
                    <span className="text-xs text-amber-400 font-bold">Due: ₹ {Number(f.outstandingAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-400">
                    {f.followupStatus}
                  </span>
                </div>
                {f.notes && <p className="text-xs text-gray-400">{f.notes}</p>}
                {f.nextFollowupDate && (
                  <div className="text-[11px] text-gray-500 pt-1 border-t border-white/5">
                    Next Follow-up: {new Date(f.nextFollowupDate).toLocaleDateString('en-GB')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 4: Customer Ledger & Statement ─────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div className="space-y-5">
          {/* Customer & Filter Dock */}
          <div className="bg-[#121226] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#7FB706]" /> Select Customer Account
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.legalName} {c.tradeName ? `(${c.tradeName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Period:</span>
                {[
                  { key: 'ALL', label: 'All Time' },
                  { key: '30DAYS', label: 'Last 30 Days' },
                  { key: 'MONTH', label: 'This Month' },
                  { key: 'FY', label: 'Current FY' },
                  { key: 'CUSTOM', label: 'Custom' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setDateFilter(f.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      dateFilter === f.key
                        ? 'bg-[#7FB706]/20 border-[#7FB706] text-white'
                        : 'bg-white/[0.02] border-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {dateFilter === 'CUSTOM' && (
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/5">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">From Date</label>
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">To Date</label>
                  <input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>
            )}
          </div>

          {ledgerLoading ? (
            <div className="p-12 text-center bg-[#121226] border border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Computing chronological party ledger with running balance...</p>
            </div>
          ) : !customerLedger ? (
            <div className="p-12 text-center bg-[#121226] border border-white/5 rounded-2xl text-gray-400 text-xs">
              Select a customer above to view their statement of account.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Customer Profile & Escalation Cadence Banner */}
              <div className="bg-[#121226] border border-white/10 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{customerLedger.customer.legalName}</h2>
                      {customerLedger.customer.tradeName && (
                        <span className="text-xs text-gray-400">({customerLedger.customer.tradeName})</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
                      <span>Terms: <strong className="text-white">{customerLedger.customer.paymentTermsDays} Days Net</strong></span>
                      {customerLedger.customer.gstin && <span>GSTIN: <strong className="text-white font-mono">{customerLedger.customer.gstin}</strong></span>}
                      {customerLedger.customer.creditLimit && <span>Credit Limit: <strong className="text-emerald-400 font-mono">₹ {customerLedger.customer.creditLimit.toLocaleString('en-IN')}</strong></span>}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowRecordPaymentModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/30 transition cursor-pointer shadow-sm shadow-emerald-500/10"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Record Payment
                    </button>
                    <button
                      onClick={() => setShowManualEntryModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold rounded-xl border border-purple-500/30 transition cursor-pointer shadow-sm shadow-purple-500/10"
                    >
                      <History className="w-3.5 h-3.5 text-purple-400" /> Historical Entry
                    </button>
                    <button
                      onClick={() => setShowEmailModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email Statement
                    </button>
                    <button
                      onClick={handlePrintStatement}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-xl border border-white/10 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print / Vector PDF
                    </button>
                    <button
                      onClick={handleExportCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-xl border border-white/10 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV Export
                    </button>
                    <button
                      onClick={() => setShowLogModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/20 transition cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Log Touchpoint
                    </button>
                  </div>
                </div>

                {/* 4-Tier Automated Cadence Visual Stepper */}
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Automated 3-Day Overdue Escalation Cadence
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Current Stage: <strong className="text-white uppercase">{customerLedger.cadence.currentStage.replace(/_/g, ' ')}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {[
                      { key: 'REMINDER_1', label: '1. Day 1 Overdue', desc: 'Auto-Reminder 1' },
                      { key: 'REMINDER_2', label: '2. +3 Days', desc: 'Auto-Reminder 2' },
                      { key: 'REMINDER_3', label: '3. +3 Days', desc: 'Auto-Reminder 3' },
                      { key: 'FINAL_NOTICE', label: '4. +3 Days', desc: 'Final Demand' },
                      { key: 'MANUAL_FOLLOWUP', label: '5. Escalated', desc: 'Executive Call / Visit' },
                    ].map((step, idx) => {
                      const stages = ['REMINDER_1', 'REMINDER_2', 'REMINDER_3', 'FINAL_NOTICE', 'MANUAL_FOLLOWUP'];
                      const activeIndex = stages.indexOf(customerLedger.cadence.currentStage);
                      const isReached = customerLedger.summary.closingBalance > 0 && customerLedger.summary.overdueAmount > 0 && activeIndex >= idx;
                      const isCurrent = stages[activeIndex] === step.key;

                      return (
                        <div
                          key={step.key}
                          className={`p-2 rounded-xl border text-[11px] transition ${
                            isCurrent
                              ? 'bg-purple-500/20 border-purple-500 text-white font-bold ring-1 ring-purple-500/50'
                              : isReached
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-white/[0.02] border-white/5 text-gray-500'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-bold tracking-wider">{step.label}</div>
                          <div className="text-[11px] truncate">{step.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Corporate Bank Remittance Card (Synced with /company-settings) */}
              <div className="bg-[#121226] border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        Entity Bank Accounts & Remittance Info
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                          Synced with /company-settings
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-400">Designated corporate account for client RTGS / NEFT remittances</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const bankName = customerLedger.company?.bankAccount?.bankName || 'Central Bank Of India';
                      const accNo = customerLedger.company?.bankAccount?.accountNumber || '3466708013';
                      const ifsc = customerLedger.company?.bankAccount?.ifscCode || 'CBIN0283809';
                      const branch = customerLedger.company?.bankAccount?.branch || 'B-20, Ganga Vihar, Gokalpuri, Delhi - 110094';
                      navigator.clipboard.writeText(`Bank: ${bankName}\nAccount No: ${accNo}\nIFSC: ${ifsc}\nBranch: ${branch}\nBeneficiary: Pacific Products & Solutions`);
                      setCopiedBank(true);
                      setTimeout(() => setCopiedBank(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium border border-white/10 transition cursor-pointer self-start sm:self-auto"
                  >
                    {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedBank ? 'Copied Coordinates!' : 'Copy Bank Info'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Bank Name</span>
                    <p className="text-white font-semibold mt-0.5">{customerLedger.company?.bankAccount?.bankName || 'Central Bank Of India'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Account Number</span>
                    <p className="text-emerald-400 font-mono font-bold mt-0.5">{customerLedger.company?.bankAccount?.accountNumber || '3466708013'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">IFSC Code</span>
                    <p className="text-sky-400 font-mono font-bold mt-0.5">{customerLedger.company?.bankAccount?.ifscCode || 'CBIN0283809'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Branch & Remittance</span>
                    <p className="text-gray-300 text-[11px] mt-0.5 truncate">{customerLedger.company?.bankAccount?.branch || 'Delhi - 110094'}</p>
                  </div>
                </div>
              </div>

              {/* Ledger Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
                  <span className="text-xs text-gray-400">Period Debits (Invoiced)</span>
                  <div className="text-lg font-bold text-white mt-1">
                    ₹ {customerLedger.summary.periodDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-gray-500">PIs & Direct Orders</span>
                </div>

                <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
                  <span className="text-xs text-gray-400">Period Credits (Paid)</span>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    ₹ {customerLedger.summary.periodCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-emerald-500/80">Confirmed payments</span>
                </div>

                <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
                  <span className="text-xs text-gray-400">
                    {customerLedger.summary.closingBalance < 0 ? 'Net Position (Advance)' : 'Net Outstanding Balance'}
                  </span>
                  <div className={`text-lg font-bold mt-1 ${customerLedger.summary.closingBalance < 0 ? 'text-emerald-400' : customerLedger.summary.closingBalance > 0 ? 'text-amber-400' : 'text-gray-300'}`}>
                    {customerLedger.summary.closingBalance < 0
                      ? `(Cr) ₹ ${Math.abs(customerLedger.summary.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : `₹ ${customerLedger.summary.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {customerLedger.summary.closingBalance < 0 ? 'Surplus credit / advance' : 'Cumulative running closing'}
                  </span>
                </div>

                <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
                  <span className="text-xs text-gray-400">Overdue Dues</span>
                  <div className="text-lg font-bold text-red-400 mt-1">
                    ₹ {customerLedger.summary.overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-red-400/80">
                    {customerLedger.summary.daysOverdue > 0 ? `${customerLedger.summary.daysOverdue} days overdue` : 'Within agreed terms'}
                  </span>
                </div>
              </div>

              {/* Chronological Table of Entries */}
              <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search statement entries by ref #, description..."
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      className="bg-transparent text-xs text-white focus:outline-none placeholder-gray-500 w-64"
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {filteredLedgerEntries.length} Records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#0e0e1e] uppercase tracking-wider text-gray-400 border-b border-white/5 text-[10px]">
                      <tr>
                        <th className="py-3 px-3 text-center">#</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Doc Ref</th>
                        <th className="py-3 px-3">Description</th>
                        <th className="py-3 px-3 text-right">Debit (₹)</th>
                        <th className="py-3 px-3 text-right">Credit (₹)</th>
                        <th className="py-3 px-3 text-right">Running Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredLedgerEntries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-500 text-xs">
                            No ledger transactions recorded in this period.
                          </td>
                        </tr>
                      ) : (
                        filteredLedgerEntries.map((row) => (
                          <tr key={row.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-3 text-center font-mono text-gray-500">{row.serialNo}</td>
                            <td className="py-3 px-3 whitespace-nowrap text-gray-300">
                              {new Date(row.date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  row.docType === 'PI'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : row.docType === 'SALES_ORDER'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {row.docType}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-white font-mono">{row.docRef}</td>
                            <td className="py-3 px-3 text-gray-300 max-w-xs truncate">{row.description}</td>
                            <td className="py-3 px-3 text-right font-semibold text-red-400">
                              {row.debit > 0 ? `₹ ${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-emerald-400">
                              {row.credit > 0 ? `₹ ${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td
                              className={`py-3 px-3 text-right font-bold font-mono ${
                                row.runningBalance > 0 ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              ₹ {row.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Follow-up & Audit Trail Panel */}
              <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Customer Follow-up & Reminder Audit History
                  </h3>
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="text-xs text-[#7FB706] hover:underline font-semibold cursor-pointer"
                  >
                    + Log New Interaction
                  </button>
                </div>

                {customerLedger.logs && customerLedger.logs.length > 0 ? (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {customerLedger.logs.map((log) => (
                      <div key={log.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-200">
                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System Automated Bot'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(log.createdAt).toLocaleString('en-GB')}
                          </span>
                        </div>
                        <p className="text-gray-300">{log.notes}</p>
                        {log.response && (
                          <div className="text-[11px] text-emerald-400/90 font-medium">
                            Response: {log.response}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic py-3 text-center">
                    No follow-up touchpoints or automated reminders logged for this customer yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Send Ledger Email Modal */}
          {customerLedger && (
            <SendLedgerEmailModal
              isOpen={showEmailModal}
              onClose={() => setShowEmailModal(false)}
              customerId={customerLedger.customer.id}
              customerName={customerLedger.customer.legalName}
              defaultEmail={customerLedger.customer.email || ''}
              outstandingAmount={customerLedger.summary.closingBalance}
              defaultStage={customerLedger.cadence.currentStage as any}
              onSuccess={() => {
                fetchCustomerLedger(customerLedger.customer.id);
                fetchData();
              }}
            />
          )}

          {/* Log Touchpoint Modal */}
          {customerLedger && (
            <LogFollowupModal
              isOpen={showLogModal}
              onClose={() => setShowLogModal(false)}
              customerId={customerLedger.customer.id}
              customerName={customerLedger.customer.legalName}
              onSuccess={() => {
                fetchCustomerLedger(customerLedger.customer.id);
                fetchData();
              }}
            />
          )}

          {/* Record Payment Modal */}
          {customerLedger && (
            <RecordPaymentModal
              isOpen={showRecordPaymentModal}
              onClose={() => setShowRecordPaymentModal(false)}
              customerId={customerLedger.customer.id}
              customerName={customerLedger.customer.legalName}
              defaultAmount={customerLedger.summary.closingBalance > 0 ? customerLedger.summary.closingBalance : undefined}
              onSuccess={() => {
                fetchCustomerLedger(customerLedger.customer.id);
                fetchData();
              }}
            />
          )}

          {/* Manual Historical Entry Modal */}
          {customerLedger && (
            <ManualLedgerEntryModal
              isOpen={showManualEntryModal}
              onClose={() => setShowManualEntryModal(false)}
              customerId={customerLedger.customer.id}
              customerName={customerLedger.customer.legalName}
              onSuccess={() => {
                fetchCustomerLedger(customerLedger.customer.id);
                fetchData();
              }}
            />
          )}
        </div>
      )}

      {/* General Followup Modal */}
      {showFollowupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> New Dues Follow-up
              </h3>
              <button onClick={() => setShowFollowupModal(false)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Customer *</label>
                <select
                  required
                  value={followupCustomerId}
                  onChange={(e) => setFollowupCustomerId(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.legalName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Outstanding Amount (₹) *</label>
                <input
                  required
                  type="number"
                  value={followupAmount}
                  onChange={(e) => setFollowupAmount(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Next Follow-up Date</label>
                <input
                  type="date"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notes / Call Summary</label>
                <textarea
                  rows={2}
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  placeholder="Spoke with procurement head, promised payment dispatch by Friday."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setShowFollowupModal(false)} className="px-4 py-2 text-xs text-gray-400 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold text-xs rounded-xl cursor-pointer">
                  Schedule Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
