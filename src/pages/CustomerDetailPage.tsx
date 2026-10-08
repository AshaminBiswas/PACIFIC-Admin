import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  Edit2,
  Trash2,
  GitMerge,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  ShoppingBag,
  Package,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus,
  RefreshCw,
  Printer,
  Download,
  Sparkles,
  DollarSign,
  History,
  Copy,
  Check,
} from 'lucide-react';
import { crmApi, financeApi } from '../api/services';
import type { Customer360Data, BusinessParty, CustomerLedgerStatement, Payment } from '../types/admin';
import { SendLedgerEmailModal } from '../components/finance/SendLedgerEmailModal';
import { LogFollowupModal } from '../components/finance/LogFollowupModal';
import { RecordPaymentModal } from '../components/finance/RecordPaymentModal';
import { ManualLedgerEntryModal } from '../components/finance/ManualLedgerEntryModal';
import { EditPaymentModal } from '../components/finance/EditPaymentModal';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer360, setCustomer360] = useState<Customer360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TIMELINE' | 'TRANSACTIONS' | 'CONTACTS' | 'LEDGER_FOLLOWUP'>('OVERVIEW');

  // Customer Ledger & Follow-up state
  const [customerLedger, setCustomerLedger] = useState<CustomerLedgerStatement | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLogFollowupModal, setShowLogFollowupModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // Edit & Delete Payment state
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Merge modal state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<BusinessParty[]>([]);
  const [selectedMergeId, setSelectedMergeId] = useState('');
  const [mergeReason, setMergeReason] = useState('Duplicate customer consolidation');
  const [merging, setMerging] = useState(false);

  const fetchCustomer360 = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await crmApi.getCustomer360(id);
      if (res.data?.data) {
        setCustomer360(res.data.data);
      } else {
        setError('Customer data not found.');
      }
    } catch (err: any) {
      console.error('Failed to fetch Customer 360:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCustomerLedger = useCallback(async () => {
    if (!id) return;
    try {
      setLedgerLoading(true);
      const res = await financeApi.getCustomerLedger(id);
      if (res.data?.data) {
        setCustomerLedger(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch customer ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer360();
    fetchCustomerLedger();
  }, [fetchCustomer360, fetchCustomerLedger]);

  const handleEditPayment = (p: Payment) => {
    setEditingPayment(p);
    setShowEditPaymentModal(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (
      !confirm(
        'Are you sure you want to permanently delete this payment record? This will remove it from the customer ledger and recalculate all advance balances.'
      )
    ) {
      return;
    }
    try {
      setDeletingPaymentId(paymentId);
      await financeApi.deletePayment(paymentId);
      await Promise.all([fetchCustomer360(), fetchCustomerLedger()]);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete payment record');
    } finally {
      setDeletingPaymentId(null);
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
            ${
              customer.billingAddress
                ? `
              <div style="font-size: 8.5px; margin-top: 2px;">
                ${customer.billingAddress.addressLine1 || ''}${customer.billingAddress.addressLine2 ? ', ' + customer.billingAddress.addressLine2 : ''}, 
                ${customer.billingAddress.city || ''} ${customer.billingAddress.state || ''} ${customer.billingAddress.postalCode ? '- ' + customer.billingAddress.postalCode : ''}
              </div>
            `
                : ''
            }
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

  const handleDelete = async () => {
    if (!customer360?.customer) return;
    const name = customer360.customer.legalName;
    if (!confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) return;

    try {
      await crmApi.deleteCustomer(customer360.customer.id);
      alert(`Customer "${name}" was deleted successfully.`);
      navigate('/admin/dashboard/customers');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete customer');
    }
  };

  const handleMergeSubmit = async () => {
    if (!id || !selectedMergeId) {
      alert('Please select a customer record to merge.');
      return;
    }
    if (!confirm('Are you sure you want to merge this customer? All transactions will be re-assigned to this profile.')) {
      return;
    }
    try {
      setMerging(true);
      await crmApi.mergeCustomers(id, selectedMergeId, mergeReason);
      alert('Customers merged successfully!');
      setShowMergeModal(false);
      fetchCustomer360();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to merge customers');
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading Customer 360 intelligence...</p>
      </div>
    );
  }

  if (error || !customer360) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 bg-[#0a0a1a] border border-red-500/20 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Error Loading Customer</h2>
        <p className="text-sm text-gray-400">{error || 'Customer profile could not be found.'}</p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/admin/dashboard/customers"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition"
          >
            ← Back to Customers
          </Link>
          <button
            onClick={fetchCustomer360}
            className="px-4 py-2 rounded-xl bg-[#7FB706] text-white text-xs font-bold transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    customer,
    kpis,
    timeline = [],
    recentProformaInvoices = [],
    recentQuotations = [],
    recentOrders = [],
    recentPayments = [],
  } = customer360;

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Bar */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Link
              to="/admin/dashboard/customers"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"
              title="Back to Customers List"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
                  {customer.customerProfile?.customerType || 'B2B CUSTOMER'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    customer.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {customer.status || 'ACTIVE'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                {customer.legalName}
              </h1>

              {customer.tradeName && customer.tradeName !== customer.legalName && (
                <p className="text-xs text-gray-400 font-medium">{customer.tradeName}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 pt-1">
                {customer.gstin && (
                  <span className="font-mono">
                    <strong className="text-gray-500 font-normal">GSTIN:</strong> {customer.gstin}
                  </span>
                )}
                {customer.pan && (
                  <span className="font-mono">
                    <strong className="text-gray-500 font-normal">PAN:</strong> {customer.pan}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-500" /> {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-500" /> {customer.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Record Payment -> Direct Ledger Update */}
            <button
              onClick={() => setShowRecordPaymentModal(true)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition flex items-center gap-1.5 min-h-[44px] cursor-pointer"
              title="Record Direct Customer Payment / Bank Transfer"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Record Payment
            </button>

            {/* Historical Entry -> Pre-ERP transactions & opening balances */}
            <button
              onClick={() => setShowManualEntryModal(true)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold text-xs transition flex items-center gap-1.5 min-h-[44px] cursor-pointer"
              title="Record Historical Invoices, Payments or Opening Balances"
            >
              <History className="w-4 h-4 text-purple-400" />
              Historical Entry
            </button>

            {/* Follow-up Hub -> Dedicated full-page follow-up */}
            <Link
              to={`/admin/dashboard/customers/${customer.id}/follow-up`}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 font-bold text-xs transition flex items-center gap-1.5 min-h-[44px]"
              title="Open Payment & Customer Follow-up Hub"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              Follow-up Hub
            </Link>

            {/* Edit Button -> Navigates to dedicated Edit page */}
            <button
              onClick={() => navigate(`/admin/dashboard/customers/${customer.id}/edit`)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-extrabold text-xs shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-1.5 min-h-[44px] cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              Edit Customer
            </button>

            {/* Merge Action */}
            <button
              onClick={() => {
                setShowMergeModal(true);
                crmApi.listCustomers({ limit: 50 }).then((res) => {
                  if (res.data?.data?.items) {
                    setDuplicateMatches(res.data.data.items.filter((item) => item.id !== customer.id));
                  }
                });
              }}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 min-h-[44px] cursor-pointer"
              title="Consolidate duplicate records"
            >
              <GitMerge className="w-4 h-4 text-amber-400" />
              Merge
            </button>

            {/* Quick Action: New Quote */}
            <button
              onClick={() => navigate(`/admin/dashboard/sales-quotations/new?customerId=${customer.id}`)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 min-h-[44px] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#7FB706]" />
              New Quote
            </button>

            {/* Delete Customer */}
            <button
              onClick={handleDelete}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Delete Customer Profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Customer 360 KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Quoted */}
        <div className="p-3.5 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total Quoted</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-amber-400 font-mono">
            ₹{Number(kpis.totalQuotedValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">{customer._count?.salesQuotations ?? recentQuotations.length} Quotation(s)</div>
        </div>

        {/* Total Ordered */}
        <div className="p-3.5 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total Ordered</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-white font-mono">
            ₹{Number(kpis.totalOrderedValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-purple-400 font-medium">
            {customer._count?.salesOrders ?? recentOrders.length} Confirmed Order(s)
          </div>
        </div>

        {/* Total Invoiced */}
        <div className="p-3.5 sm:p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total Invoiced</span>
            <CreditCard className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-sky-400 font-mono">
            ₹{Number(kpis.totalInvoiced || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">{kpis.openInvoicesCount || 0} Open Invoices</div>
        </div>

        {/* Outstanding Due / Advance Balance */}
        {(() => {
          const inv = Number(kpis.totalInvoiced || 0);
          const paid = Number(kpis.totalPaid || 0);
          const due = Number(kpis.outstandingBalance || 0);
          const isAdvance = paid > inv && due <= 0;
          const advanceAmount = paid - inv;

          return (
            <div className={`p-3.5 sm:p-4 bg-[#09071a] border rounded-2xl relative overflow-hidden ${isAdvance ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-white/10'}`}>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className={isAdvance ? 'text-emerald-400 font-semibold' : ''}>
                  {isAdvance ? 'Advance in Hand' : 'Outstanding Due'}
                </span>
                {isAdvance ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div
                className={`mt-2 text-lg sm:text-xl font-bold font-mono ${
                  isAdvance ? 'text-emerald-400' : due > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                ₹{isAdvance ? advanceAmount.toLocaleString('en-IN') : due.toLocaleString('en-IN')}
              </div>
              <div className="mt-1 text-[11px] text-gray-500 flex items-center justify-between">
                <span>Total Paid: ₹{paid.toLocaleString('en-IN')}</span>
                {isAdvance && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                    Credit Balance
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: 'Overview & Profile' },
          { id: 'LEDGER_FOLLOWUP', label: 'Ledger & Follow-up' },
          { id: 'TIMELINE', label: `Unified Timeline (${timeline?.length || 0})` },
          { id: 'TRANSACTIONS', label: `Orders & Quotes (${recentOrders.length + recentQuotations.length})` },
          { id: 'CONTACTS', label: `Contacts & Addresses (${(customer.contacts?.length || 0) + (customer.addresses?.length || 0)})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer whitespace-nowrap min-h-[40px] ${
              activeTab === tab.id
                ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Commercial & Credit Profile */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <CreditCard className="w-4 h-4 text-[#7FB706]" />
              Commercial & Credit Terms
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Customer Segment</span>
                <span className="font-semibold text-white">
                  {customer.customerProfile?.customerType || 'CONTRACTOR'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Payment Terms</span>
                <span className="font-semibold text-white">
                  {customer.customerProfile?.paymentTermsDays || 30} Days Net
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Credit Limit</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  {customer.customerProfile?.creditLimit
                    ? `₹ ${Number(customer.customerProfile.creditLimit).toLocaleString('en-IN')}`
                    : 'Unlimited / Standard'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Conversion Rate</span>
                <span className="font-semibold text-[#7FB706]">
                  {kpis.conversionRatePercent != null ? `${kpis.conversionRatePercent}%` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Account Status</span>
                <span className="font-semibold text-white">{customer.status}</span>
              </div>
            </div>

            {customer.notes && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <span className="text-[11px] text-gray-500 font-semibold uppercase">Internal Notes</span>
                <p className="text-xs text-gray-300 mt-1 italic">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Primary Billing Address */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <MapPin className="w-4 h-4 text-sky-400" />
              Registered Addresses
            </h3>
            {customer.addresses && customer.addresses.length > 0 ? (
              <div className="space-y-3">
                {customer.addresses.map((addr, idx) => (
                  <div key={addr.id || idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold uppercase text-[10px] tracking-wider ${addr.addressType === 'SHIPPING' ? 'text-[#7FB706]' : 'text-sky-400'}`}>
                        {addr.addressType === 'SHIPPING' ? 'DELIVERY / SITE' : addr.addressType} ADDRESS
                      </span>
                      <div className="flex items-center gap-1.5">
                        {addr.isDefaultBilling && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-500/10 text-sky-300 border border-sky-500/20">
                            Default Billing
                          </span>
                        )}
                        {(addr.isDefaultShipping || addr.addressType === 'SHIPPING') && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-lime-500/10 text-[#7FB706] border border-lime-500/20">
                            Default Delivery
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300">{addr.addressLine1}</p>
                    {addr.addressLine2 && <p className="text-gray-400">{addr.addressLine2}</p>}
                    <p className="text-gray-400">
                      {addr.city}, {addr.state} {addr.postalCode ? `- ${addr.postalCode}` : ''}
                    </p>
                    {addr.gstin && (
                      <p className="text-gray-400 font-mono text-[11px]">GSTIN: {addr.gstin}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-4 text-center">No addresses registered yet.</p>
            )}
          </div>

          {/* Key Contacts */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Users className="w-4 h-4 text-purple-400" />
              Contact Directory
            </h3>
            {customer.contacts && customer.contacts.length > 0 ? (
              <div className="space-y-3">
                {customer.contacts.map((c, idx) => (
                  <div key={c.id || idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{c.name}</span>
                      {c.isPrimary && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          Primary
                        </span>
                      )}
                    </div>
                    {c.designation && <p className="text-[11px] text-gray-400">{c.designation}</p>}
                    {c.phone && (
                      <p className="text-gray-300 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-500" /> {c.phone}
                      </p>
                    )}
                    {c.email && (
                      <p className="text-gray-300 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-gray-500" /> {c.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-4 text-center">No contact persons registered yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: UNIFIED TIMELINE */}
      {activeTab === 'TIMELINE' && (
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#7FB706]" />
            Unified Chronological Transaction Flow
          </h3>

          {!timeline || timeline.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              No historical commercial documents found for this customer.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {timeline.map((item, idx) => {
                let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                let Icon = FileText;

                if (item.type === 'QUOTATION') {
                  badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  Icon = FileText;
                } else if (item.type === 'ORDER') {
                  badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                  Icon = ShoppingBag;
                } else if (item.type === 'PI') {
                  badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                  Icon = FileText;
                } else if (item.type === 'PACKING_LIST') {
                  badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  Icon = Package;
                } else if (item.type === 'HARDWARE_ISSUE') {
                  badgeColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                  Icon = Wrench;
                } else if (item.type === 'PAYMENT') {
                  badgeColor = 'bg-[#7FB706]/10 text-[#7FB706] border-[#7FB706]/20';
                  Icon = CreditCard;
                }

                return (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-[#09071a] border-2 border-[#7FB706] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7FB706]" />
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor} flex items-center gap-1`}>
                          <Icon className="w-3 h-3" /> {item.type}
                        </span>
                        <span className="text-gray-400 font-mono text-[11px]">
                          {new Date(item.date).toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
                        <div>
                          <span className="font-mono font-bold text-white text-xs">{item.referenceNumber}</span>
                          <span className="text-xs text-gray-300 ml-2">{item.title}</span>
                        </div>
                        {item.amount != null && (
                          <span className="font-bold text-xs text-[#7FB706] font-mono">
                            ₹ {Number(item.amount).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-500 flex items-center gap-2 pt-0.5">
                        <span>Status: <strong className="text-gray-300 font-normal">{item.status}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ORDERS & QUOTES */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-6">
          {/* Sales Orders Table */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                Sales Orders ({recentOrders?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e0e1e] text-gray-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {!recentOrders || recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No Sales Orders found.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((so: any) => (
                      <tr key={so.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-mono font-bold text-white">{so.orderNumber}</td>
                        <td className="py-3 px-4 text-gray-400">{new Date(so.orderDate).toLocaleDateString('en-GB')}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#7FB706]">
                          ₹{Number(so.grandTotal).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {so.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/admin/dashboard/sales-orders/${so.id}`}
                            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Quotations Table */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Sales Quotations ({recentQuotations?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e0e1e] text-gray-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Quote Ref</th>
                    <th className="py-3 px-4">Project Name</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {!recentQuotations || recentQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No Sales Quotations found.
                      </td>
                    </tr>
                  ) : (
                    recentQuotations.map((sq: any) => (
                      <tr key={sq.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-mono font-bold text-white">{sq.referenceNumber}</td>
                        <td className="py-3 px-4 text-gray-300">{sq.projectName}</td>
                        <td className="py-3 px-4 text-gray-400">{new Date(sq.date).toLocaleDateString('en-GB')}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                          ₹{Number(sq.grandTotal).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {sq.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/admin/dashboard/sales-quotations/${sq.id}`}
                            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Proforma Invoices Table */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                Proforma Invoices ({recentProformaInvoices?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e0e1e] text-gray-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">PI Number</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Advance Received</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {!recentProformaInvoices || recentProformaInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No Proforma Invoices found.
                      </td>
                    </tr>
                  ) : (
                    recentProformaInvoices.map((pi: any) => (
                      <tr key={pi.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-mono font-bold text-white">{pi.piNumber}</td>
                        <td className="py-3 px-4 text-gray-400">{new Date(pi.piDate).toLocaleDateString('en-GB')}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#7FB706]">
                          ₹{Number(pi.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          ₹{Number(pi.advanceReceivedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            pi.status === 'ISSUED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {pi.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/admin/dashboard/proforma-invoices/${pi.id}`}
                            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recorded Payments & Advance Receipts Table */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Recorded Payments &amp; Advance Receipts ({recentPayments?.length || 0})
              </h3>
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Record Payment
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e0e1e] text-gray-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Method &amp; Ref</th>
                    <th className="py-3 px-4">Particulars / Linked Document</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {!recentPayments || recentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        No payments or advance receipts recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentPayments.map((p: any, idx: number) => {
                      const linkedPi = p.allocations?.find((a: any) => a.proformaInvoice)?.proformaInvoice;
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-4 font-mono text-gray-500">{idx + 1}</td>
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                            {new Date(p.paymentDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.paymentType === 'ADVANCE'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            }`}>
                              {p.paymentType}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{p.paymentMethod}</div>
                            {p.referenceNumber && (
                              <div className="font-mono text-gray-400 text-[11px]">Ref: {p.referenceNumber}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-300 max-w-xs">
                            <div>{p.notes || '-'}</div>
                            {linkedPi && (
                              <Link
                                to={`/admin/dashboard/proforma-invoices/${linkedPi.id}`}
                                className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-mono mt-0.5"
                              >
                                Linked PI: {linkedPi.piNumber} <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {p.status || 'CONFIRMED'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditPayment(p)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 hover:text-white transition cursor-pointer"
                                title="Edit Payment Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={deletingPaymentId === p.id}
                                onClick={() => handleDeletePayment(p.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer disabled:opacity-50"
                                title="Delete Payment Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONTACTS & ADDRESSES */}
      {activeTab === 'CONTACTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contacts Directory */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Contact Persons
              </h3>
              <button
                onClick={() => navigate(`/admin/dashboard/customers/${customer.id}/edit`)}
                className="text-xs text-[#7FB706] hover:underline font-semibold"
              >
                + Manage Contacts
              </button>
            </div>
            {customer.contacts && customer.contacts.length > 0 ? (
              <div className="space-y-3">
                {customer.contacts.map((c, idx) => (
                  <div key={c.id || idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{c.name}</span>
                      {c.isPrimary && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          Primary Contact
                        </span>
                      )}
                    </div>
                    {c.designation && <p className="text-gray-400 font-medium">{c.designation}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/5">
                      {c.phone && (
                        <span className="text-gray-300 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-gray-500" /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="text-gray-300 flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-gray-500" /> {c.email}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-8 text-center">No contacts listed.</p>
            )}
          </div>

          {/* Addresses */}
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-400" />
                Shipping & Billing Sites
              </h3>
              <button
                onClick={() => navigate(`/admin/dashboard/customers/${customer.id}/edit`)}
                className="text-xs text-[#7FB706] hover:underline font-semibold"
              >
                + Manage Addresses
              </button>
            </div>
            {customer.addresses && customer.addresses.length > 0 ? (
              <div className="space-y-3">
                {customer.addresses.map((a, idx) => (
                  <div key={a.id || idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold uppercase text-[10px] tracking-wider ${a.addressType === 'SHIPPING' ? 'text-[#7FB706]' : 'text-sky-400'}`}>
                        {a.addressType === 'SHIPPING' ? 'DELIVERY / SITE' : a.addressType} ADDRESS
                      </span>
                      <div className="flex items-center gap-1.5">
                        {a.isDefaultBilling && (
                          <span className="px-2 py-0.5 rounded text-[9px] bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            Default Billing
                          </span>
                        )}
                        {(a.isDefaultShipping || a.addressType === 'SHIPPING') && (
                          <span className="px-2 py-0.5 rounded text-[9px] bg-lime-500/15 text-[#7FB706] border border-lime-500/30">
                            Default Delivery
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-white font-medium">{a.addressLine1}</p>
                    {a.addressLine2 && <p className="text-gray-400">{a.addressLine2}</p>}
                    <p className="text-gray-300">
                      {a.city}, {a.state} {a.postalCode ? `- ${a.postalCode}` : ''}
                    </p>
                    {a.gstin && (
                      <p className="text-gray-400 font-mono text-[11px] pt-1 border-t border-white/5">
                        GSTIN: {a.gstin}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-8 text-center">No addresses registered.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: LEDGER & FOLLOW-UP */}
      {activeTab === 'LEDGER_FOLLOWUP' && (
        <div className="space-y-5">
          {ledgerLoading ? (
            <div className="p-12 text-center bg-[#09071a] border border-white/10 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Loading chronological customer ledger and follow-up history...</p>
            </div>
          ) : !customerLedger ? (
            <div className="p-12 text-center bg-[#09071a] border border-white/10 rounded-2xl text-gray-400 text-xs">
              Unable to load customer ledger. Please refresh or try again.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cadence Stepper & Action Controls */}
              <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Automated 3-Day Overdue Escalation Cadence
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Terms: <strong className="text-white">{customerLedger.customer.paymentTermsDays} Days Net</strong> • Current Status:{' '}
                      <strong className="text-purple-300 uppercase">{customerLedger.cadence.currentStage.replace(/_/g, ' ')}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowRecordPaymentModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/30 transition cursor-pointer shadow-sm shadow-emerald-500/10"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Record Payment
                    </button>
                    <button
                      onClick={() => setShowManualEntryModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold rounded-xl border border-purple-500/30 transition cursor-pointer shadow-sm shadow-purple-500/10"
                    >
                      <History className="w-3.5 h-3.5 text-purple-400" /> Historical Entry
                    </button>
                    <Link
                      to={`/admin/dashboard/customers/${customer.id}/follow-up`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 transition cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Full Follow-up Hub &rarr;
                    </Link>
                    <button
                      onClick={() => setShowEmailModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email Statement
                    </button>
                    <button
                      onClick={() => setShowLogFollowupModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/20 transition cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Log Touchpoint
                    </button>
                    <button
                      onClick={handlePrintStatement}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-xl border border-white/10 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print / PDF
                    </button>
                    <button
                      onClick={handleExportCsv}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-xl border border-white/10 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                  </div>
                </div>

                {/* 5-Stage Visual Stepper */}
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
                        className={`p-2.5 rounded-xl border text-[11px] transition ${
                          isCurrent
                            ? 'bg-purple-500/20 border-purple-500 text-white font-bold ring-1 ring-purple-500/50'
                            : isReached
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-white/[0.02] border-white/5 text-gray-500'
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold tracking-wider">{step.label}</div>
                        <div className="text-[11px] truncate mt-0.5">{step.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Corporate Bank Remittance Card (Synced with /company-settings) */}
              <div className="bg-[#09071a] border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
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
                      <p className="text-[11px] text-gray-400">Official corporate bank coordinates for customer NEFT / RTGS settlement</p>
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

              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#09071a] border border-white/10 rounded-2xl p-4">
                  <span className="text-xs text-gray-400">Total Invoiced (Debits)</span>
                  <div className="text-lg font-bold text-white mt-1 font-mono">
                    ₹ {customerLedger.summary.periodDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-gray-500">All PIs & Direct Orders</span>
                </div>

                <div className="bg-[#09071a] border border-white/10 rounded-2xl p-4">
                  <span className="text-xs text-gray-400">Total Paid (Credits)</span>
                  <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
                    ₹ {customerLedger.summary.periodCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-emerald-500/80">Confirmed bank payments</span>
                </div>

                <div className="bg-[#09071a] border border-white/10 rounded-2xl p-4">
                  <span className="text-xs text-gray-400">
                    {customerLedger.summary.closingBalance < 0 ? 'Net Position (Advance)' : 'Closing Balance'}
                  </span>
                  <div className={`text-lg font-bold mt-1 font-mono ${customerLedger.summary.closingBalance < 0 ? 'text-emerald-400' : customerLedger.summary.closingBalance > 0 ? 'text-amber-400' : 'text-gray-300'}`}>
                    {customerLedger.summary.closingBalance < 0
                      ? `(Cr) ₹ ${Math.abs(customerLedger.summary.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : `₹ ${customerLedger.summary.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {customerLedger.summary.closingBalance < 0 ? 'Surplus credit / advance' : 'Net outstanding balance'}
                  </span>
                </div>

                <div className="bg-[#09071a] border border-white/10 rounded-2xl p-4">
                  <span className="text-xs text-gray-400">Overdue Dues</span>
                  <div className="text-lg font-bold text-rose-400 mt-1 font-mono">
                    ₹ {customerLedger.summary.overdueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-rose-400/80">
                    {customerLedger.summary.daysOverdue > 0 ? `${customerLedger.summary.daysOverdue} days past terms` : 'No overdue invoices'}
                  </span>
                </div>
              </div>

              {/* Itemized Chronological Ledger Table */}
              <div className="bg-[#09071a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Chronological Account Ledger ({customerLedger.entries.length} Entries)
                  </h4>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Balance: ₹ {customerLedger.summary.closingBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-white/[0.02] uppercase tracking-wider text-gray-400 border-b border-white/5 text-[10px]">
                      <tr>
                        <th className="py-3 px-3 text-center">#</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Document Ref</th>
                        <th className="py-3 px-3">Particulars / Description</th>
                        <th className="py-3 px-3 text-right">Debit (₹)</th>
                        <th className="py-3 px-3 text-right">Credit (₹)</th>
                        <th className="py-3 px-3 text-right">Balance (₹)</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {customerLedger.entries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-gray-500 text-xs">
                            No ledger transactions recorded for this customer profile yet.
                          </td>
                        </tr>
                      ) : (
                        customerLedger.entries.map((row) => (
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
                            <td className="py-3 px-3 text-gray-300 max-w-sm truncate">{row.description}</td>
                            <td className="py-3 px-3 text-right font-semibold text-rose-400 font-mono">
                              {row.debit > 0 ? `₹ ${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-emerald-400 font-mono">
                              {row.credit > 0 ? `₹ ${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td
                              className={`py-3 px-3 text-right font-bold font-mono ${
                                row.runningBalance > 0 ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              ₹ {row.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {row.docType === 'PAYMENT' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fullPay = recentPayments.find((p: any) => p.id === row.id);
                                      const payToEdit: Payment = fullPay || ({
                                        id: row.id,
                                        companyProfileId: '',
                                        partyId: customer.id,
                                        party: customer,
                                        paymentType: 'CUSTOMER_PAYMENT',
                                        paymentMethod: 'NEFT_RTGS',
                                        referenceNumber: row.docRef.startsWith('PAY-') ? undefined : row.docRef,
                                        paymentDate: new Date(row.date).toISOString(),
                                        amount: row.credit,
                                        unallocatedAmount: 0,
                                        currency: 'INR',
                                        notes: row.description,
                                        status: 'CONFIRMED',
                                        createdAt: new Date(row.date).toISOString(),
                                      } as any);
                                      handleEditPayment(payToEdit);
                                    }}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 hover:text-white transition cursor-pointer"
                                    title="Edit Payment Record"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingPaymentId === row.id}
                                    onClick={() => handleDeletePayment(row.id)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition cursor-pointer disabled:opacity-50"
                                    title="Delete Payment Record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : row.docType === 'PI' ? (
                                <Link
                                  to={`/admin/dashboard/proforma-invoices/${row.id}`}
                                  className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </Link>
                              ) : (
                                <Link
                                  to={`/admin/dashboard/sales-orders/${row.id}`}
                                  className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold"
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </Link>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Follow-up Touchpoint History */}
              <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Touchpoint Logs & Reminder History
                  </h4>
                  <button
                    onClick={() => setShowLogFollowupModal(true)}
                    className="text-xs text-[#7FB706] hover:underline font-semibold cursor-pointer"
                  >
                    + Record Call / Note
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
                    No reminder dispatches or follow-up interactions logged yet.
                  </p>
                )}
              </div>
            </div>
          )}
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
            fetchCustomerLedger();
            fetchCustomer360();
          }}
        />
      )}

      {/* Log Follow-up Touchpoint Modal */}
      {customerLedger && (
        <LogFollowupModal
          isOpen={showLogFollowupModal}
          onClose={() => setShowLogFollowupModal(false)}
          customerId={customerLedger.customer.id}
          customerName={customerLedger.customer.legalName}
          onSuccess={() => {
            fetchCustomerLedger();
            fetchCustomer360();
          }}
        />
      )}

      {/* Record Payment Modal */}
      {showRecordPaymentModal && customer && (
        <RecordPaymentModal
          isOpen={showRecordPaymentModal}
          onClose={() => setShowRecordPaymentModal(false)}
          customerId={customer.id}
          customerName={customer.legalName}
          defaultAmount={
            customerLedger?.summary?.closingBalance && customerLedger.summary.closingBalance > 0
              ? customerLedger.summary.closingBalance
              : undefined
          }
          onSuccess={() => {
            fetchCustomerLedger();
            fetchCustomer360();
          }}
        />
      )}

      {/* Manual / Historical Ledger Entry Modal */}
      {showManualEntryModal && customer && (
        <ManualLedgerEntryModal
          isOpen={showManualEntryModal}
          onClose={() => setShowManualEntryModal(false)}
          customerId={customer.id}
          customerName={customer.legalName}
          onSuccess={() => {
            fetchCustomerLedger();
            fetchCustomer360();
          }}
        />
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-amber-400" />
              Consolidate / Merge Customer
            </h3>
            <p className="text-xs text-gray-400">
              Select a duplicate customer to merge into <strong>{customer.legalName}</strong>. All quotations,
              orders, and invoices from the duplicate will be reassigned here.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">
                  Select Duplicate Record to Absorb:
                </label>
                <select
                  value={selectedMergeId}
                  onChange={(e) => setSelectedMergeId(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="">-- Choose Customer --</option>
                  {duplicateMatches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.legalName} {m.gstin ? `(${m.gstin})` : ''} - {m.phone || m.email || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Merge Reason:</label>
                <input
                  type="text"
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!selectedMergeId || merging}
                onClick={handleMergeSubmit}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition disabled:opacity-40"
              >
                {merging ? 'Merging...' : 'Confirm Merge'}
              </button>
              </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      <EditPaymentModal
        isOpen={showEditPaymentModal}
        onClose={() => {
          setShowEditPaymentModal(false);
          setEditingPayment(null);
        }}
        payment={editingPayment}
        onSuccess={() => {
          fetchCustomer360();
          fetchCustomerLedger();
        }}
      />
    </div>
  );
}
