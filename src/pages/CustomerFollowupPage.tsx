import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  DollarSign,
  Send,
  Printer,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building,
  CreditCard,
  ChevronRight,
  FileText,
  AlertTriangle,
  MapPin,
  History,
  Copy,
  Check,
} from 'lucide-react';
import { crmApi, financeApi, followupsApi } from '../api/services';
import type { CustomerLedgerStatement, BusinessParty, SendLedgerEmailInput, FollowupTouchpointInput } from '../types/admin';
import { RecordPaymentModal } from '../components/finance/RecordPaymentModal';
import { ManualLedgerEntryModal } from '../components/finance/ManualLedgerEntryModal';

const QUICK_DISCUSSION_CHIPS = [
  'Spoke with accounts manager, payment committed by this Friday.',
  'Invoices under internal review with finance head.',
  'Requested updated Statement of Account & RTGS bank coordinates.',
  'Client requested 7-day grace period due to client billing cycle.',
  'No response on call; dispatched WhatsApp statement and email alert.',
  'Critical: 3rd overdue notice served; dispatch hold communicated.',
];

export default function CustomerFollowupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<BusinessParty | null>(null);
  const [ledger, setLedger] = useState<CustomerLedgerStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'log' | 'ledger' | 'email' | 'history'>('log');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // ── Touchpoint Form State ──────────────────────────────────────────────────
  const [channel, setChannel] = useState<'PHONE' | 'WHATSAPP' | 'VISIT' | 'EMAIL'>('PHONE');
  const [notes, setNotes] = useState('');
  const [customerResponse, setCustomerResponse] = useState('');
  const [promisedPaymentDate, setPromisedPaymentDate] = useState('');
  const [promisedAmount, setPromisedAmount] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [followupStatus, setFollowupStatus] = useState('PROMISED_TO_PAY');
  const [submittingTouchpoint, setSubmittingTouchpoint] = useState(false);

  // ── Email Form State ───────────────────────────────────────────────────────
  const [emailStage, setEmailStage] = useState<'STATEMENT' | 'REMINDER_1' | 'REMINDER_2' | 'REMINDER_3' | 'FINAL_NOTICE'>('STATEMENT');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailNotes, setEmailNotes] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [custRes, ledgerRes] = await Promise.all([
        crmApi.getCustomer(id),
        financeApi.getCustomerLedger(id),
      ]);

      const custData = custRes.data?.data ?? (custRes.data as any);
      setCustomer(custData);

      const ledgerData = ledgerRes.data?.data ?? (ledgerRes.data as any);
      setLedger(ledgerData);

      // Pre-fill email coordinates
      const email = custData?.email || custData?.contacts?.[0]?.email || '';
      setRecipientEmail(email);

      // Pre-fill stage from cadence
      const currentCadenceStage = ledgerData?.cadence?.currentStage || 'STATEMENT';
      if (['REMINDER_1', 'REMINDER_2', 'REMINDER_3', 'FINAL_NOTICE'].includes(currentCadenceStage)) {
        setEmailStage(currentCadenceStage as any);
      } else {
        setEmailStage(ledgerData?.summary?.overdueAmount > 0 ? 'REMINDER_1' : 'STATEMENT');
      }

      if (ledgerData?.summary?.closingBalance > 0) {
        setPromisedAmount(String(ledgerData.summary.closingBalance));
      }
    } catch (err: any) {
      console.error('Failed to load customer followup data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load customer follow-up data.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamic email subject & note when emailStage or ledger changes
  useEffect(() => {
    if (!customer) return;
    const balance = ledger?.summary?.closingBalance || 0;
    const overdue = ledger?.summary?.overdueAmount || 0;
    const terms = customer.customerProfile?.paymentTermsDays || 30;

    switch (emailStage) {
      case 'REMINDER_1':
        setEmailSubject(`[Payment Reminder] Outstanding Account Statement — ${customer.legalName}`);
        setEmailNotes(`Dear Valued Client, this is a friendly reminder that invoices totaling ₹ ${overdue.toLocaleString('en-IN')} have matured under your agreed ${terms}-day payment terms. Kindly review the attached statement and arrange payment.`);
        break;
      case 'REMINDER_2':
        setEmailSubject(`[2nd Follow-up] Urgent: Pending Payment Statement — ${customer.legalName}`);
        setEmailNotes(`Dear Client, following up on our previous notice, invoices totaling ₹ ${overdue.toLocaleString('en-IN')} remain overdue. We request you to kindly arrange remittance or share the transaction UTR reference.`);
        break;
      case 'REMINDER_3':
        setEmailSubject(`[3rd Notice] Critical: Overdue Account Follow-up — ${customer.legalName}`);
        setEmailNotes(`Dear Client, this is a 3rd notice regarding your overdue account balance of ₹ ${overdue.toLocaleString('en-IN')}. Please settle this balance promptly to prevent production holds or delays in project dispatches.`);
        break;
      case 'FINAL_NOTICE':
        setEmailSubject(`[FINAL DEMAND NOTICE] Immediate Settlement Required — ${customer.legalName}`);
        setEmailNotes(`FINAL NOTICE: Your overdue balance of ₹ ${overdue.toLocaleString('en-IN')} requires immediate settlement within 24 hours to avoid suspension of credit facilities and administrative escalation.`);
        break;
      default:
        setEmailSubject(`Statement of Account / Payment Ledger — ${customer.legalName} [Pacific Products & Solutions]`);
        setEmailNotes(`Dear Client, please find attached your updated Statement of Account reflecting all transaction debits, payments, and running balance to date.`);
        break;
    }
  }, [emailStage, customer, ledger]);

  const handleLogTouchpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !notes.trim()) {
      setFeedback({ type: 'error', message: 'Please enter discussion notes or call summary.' });
      return;
    }

    try {
      setSubmittingTouchpoint(true);
      const payload: FollowupTouchpointInput = {
        channel,
        notes,
        customerResponse: customerResponse.trim() || undefined,
        promisedPaymentDate: promisedPaymentDate || undefined,
        promisedAmount: promisedAmount ? Number(promisedAmount) : undefined,
        nextFollowupDate: nextFollowupDate || undefined,
        followupStatus,
      };

      await followupsApi.logCustomerTouchpoint(id, payload);
      setFeedback({ type: 'success', message: 'Follow-up interaction recorded successfully!' });
      setNotes('');
      setCustomerResponse('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to record touchpoint.' });
    } finally {
      setSubmittingTouchpoint(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !recipientEmail.trim()) {
      setFeedback({ type: 'error', message: 'Please enter at least one recipient email address.' });
      return;
    }

    try {
      setSendingEmail(true);
      const payload: SendLedgerEmailInput = {
        to: recipientEmail.split(',').map((s) => s.trim()).filter(Boolean),
        subject: emailSubject,
        notes: emailNotes,
        stage: emailStage,
      };

      await financeApi.sendCustomerLedgerEmail(id, payload);
      setFeedback({ type: 'success', message: `Statement of Account dispatched to ${recipientEmail} with audit logging!` });
      loadData();
      setActiveTab('history');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to send ledger statement email.' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrintStatement = () => {
    if (!ledger || !customer) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the statement.');
      return;
    }

    const { summary, entries, company } = ledger;
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
            <div style="margin-top: 2px;">Payment Terms: <strong>${customer.customerProfile?.paymentTermsDays || 30} Days Net</strong></div>
            <div>Approved Credit Limit: <strong>${customer.customerProfile?.creditLimit ? `₹ ${Number(customer.customerProfile.creditLimit).toLocaleString('en-IN')}` : 'Standard / Open'}</strong></div>
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
    if (!ledger || !customer) return;
    const { summary, entries } = ledger;
    let csv = `Statement of Account — ${customer.legalName}\n`;
    csv += `Payment Terms,${customer.customerProfile?.paymentTermsDays || 30} Days Net\n`;
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading Customer Payment Follow-up Hub...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 bg-[#0a0a1a] border border-red-500/20 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Error Loading Customer</h2>
        <p className="text-sm text-gray-400">{error || 'Customer profile not found.'}</p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/admin/dashboard/customers"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
          >
            ← Back to Customers
          </Link>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-xl bg-[#7FB706] text-white text-xs font-bold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const termsDays = customer.customerProfile?.paymentTermsDays || 30;
  const closingBal = ledger?.summary?.closingBalance || 0;
  const overdueAmt = ledger?.summary?.overdueAmount || 0;
  const daysOverdue = ledger?.summary?.daysOverdue || 0;
  const cadenceStage = ledger?.cadence?.currentStage || 'CURRENT';

  return (
    <div className="space-y-6 pb-20">
      {/* ── 1. Header Bar ────────────────────────────────────────────────────── */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate(`/admin/dashboard/customers/${customer.id}`)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0"
              title="Back to Customer 360"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {customer.legalName}
                </h1>
                {customer.tradeName && (
                  <span className="text-xs text-gray-400">({customer.tradeName})</span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Payment Follow-Up
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    cadenceStage === 'FINAL_NOTICE'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : cadenceStage === 'MANUAL_FOLLOWUP'
                      ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                      : 'bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/20'
                  }`}
                >
                  Stage: {cadenceStage.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1.5">
                <span>Terms: <strong className="text-white">{termsDays} Days Net</strong></span>
                {customer.gstin && <span>GSTIN: <strong className="text-white font-mono">{customer.gstin}</strong></span>}
                {customer.pan && <span>PAN: <strong className="text-white font-mono">{customer.pan}</strong></span>}
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:text-[#7FB706]">
                    <Phone className="w-3 h-3 text-gray-500" /> {customer.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowRecordPaymentModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition min-h-[44px] cursor-pointer shadow-sm shadow-emerald-500/10"
              title="Record Direct Customer Payment"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Record Payment
            </button>
            <button
              onClick={() => setShowManualEntryModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition min-h-[44px] cursor-pointer shadow-sm shadow-purple-500/10"
              title="Record Legacy Transactions & Opening Balances"
            >
              <History className="w-4 h-4 text-purple-400" />
              Historical Entry
            </button>
            <Link
              to={`/admin/dashboard/customers/${customer.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold border border-white/10 transition min-h-[44px]"
            >
              <Users className="w-4 h-4 text-sky-400" />
              Customer 360
            </Link>
            <button
              onClick={handlePrintStatement}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold border border-white/10 transition min-h-[44px] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Statement
            </button>
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            feedback.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ── 2. KPI Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <span className="text-xs text-gray-400 block">Total Invoiced</span>
          <div className="mt-1.5 text-lg sm:text-xl font-bold text-white font-mono">
            ₹{ledger?.summary?.periodDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <span className="text-[11px] text-gray-500">All PIs & Orders</span>
        </div>

        <div className="p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <span className="text-xs text-gray-400 block">Total Payments Received</span>
          <div className="mt-1.5 text-lg sm:text-xl font-bold text-emerald-400 font-mono">
            ₹{ledger?.summary?.periodCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <span className="text-[11px] text-emerald-500/80">Confirmed in Bank</span>
        </div>

        <div className={`p-4 bg-[#09071a] border rounded-2xl relative overflow-hidden ${closingBal < 0 ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/10'}`}>
          <span className="text-xs text-gray-400 block">
            {closingBal < 0 ? 'Advance in Hand / Credit' : 'Outstanding Balance'}
          </span>
          <div className={`mt-1.5 text-lg sm:text-xl font-bold font-mono ${closingBal < 0 ? 'text-emerald-400' : closingBal > 0 ? 'text-amber-400' : 'text-gray-300'}`}>
            {closingBal < 0
              ? `(Cr) ₹${Math.abs(closingBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : `₹${closingBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </div>
          <span className="text-[11px] text-gray-500">
            {closingBal < 0 ? 'Surplus advance balance' : 'Current dues'}
          </span>
        </div>

        <div className="p-4 bg-[#09071a] border border-white/10 rounded-2xl relative overflow-hidden">
          <span className="text-xs text-gray-400 block">Overdue Amount</span>
          <div className="mt-1.5 text-lg sm:text-xl font-bold text-rose-400 font-mono">
            ₹{overdueAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-rose-400/80">
            {daysOverdue > 0 ? `${daysOverdue} Days Past Terms` : 'In Good Standing'}
          </span>
        </div>
      </div>

      {/* ── 3. 4-Tier Automated Cadence Progress Stepper ──────────────────────── */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Automated 3-Day Overdue Escalation Cadence
          </span>
          <span className="text-[11px] text-gray-400">
            Cadence Interval: <strong>Every 3 Consecutive Days</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { key: 'REMINDER_1', label: '1. Day 1 Overdue', desc: 'Auto-Reminder 1' },
            { key: 'REMINDER_2', label: '2. +3 Days', desc: 'Auto-Reminder 2' },
            { key: 'REMINDER_3', label: '3. +3 Days', desc: 'Auto-Reminder 3' },
            { key: 'FINAL_NOTICE', label: '4. +3 Days', desc: 'Final Demand Notice' },
            { key: 'MANUAL_FOLLOWUP', label: '5. Escalated', desc: 'Executive Call / Visit' },
          ].map((step, idx) => {
            const stages = ['REMINDER_1', 'REMINDER_2', 'REMINDER_3', 'FINAL_NOTICE', 'MANUAL_FOLLOWUP'];
            const activeIndex = stages.indexOf(cadenceStage);
            const isReached = closingBal > 0 && overdueAmt > 0 && activeIndex >= idx;
            const isCurrent = stages[activeIndex] === step.key;

            return (
              <div
                key={step.key}
                className={`p-2.5 rounded-xl border text-xs transition ${
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

      {/* ── 4. Sub-Navigation Tabs ───────────────────────────────────────────── */}
      <div className="bg-[#09071a] border border-white/10 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'log', label: 'Log Interaction / Call' },
          { id: 'ledger', label: `Statement of Account (${ledger?.entries.length || 0})` },
          { id: 'email', label: 'Dispatch Notice Email' },
          { id: 'history', label: `Touchpoint History (${ledger?.logs?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition cursor-pointer whitespace-nowrap min-h-[40px] ${
              activeTab === tab.id
                ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 5. Tab Contents ─────────────────────────────────────────────────── */}

      {/* TAB 1: LOG INTERACTION */}
      {activeTab === 'log' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Clock className="w-4 h-4 text-amber-400" />
              Record Communication Touchpoint
            </h3>

            <form onSubmit={handleLogTouchpoint} className="space-y-4">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Communication Channel</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'PHONE', label: 'Phone Call', icon: Phone },
                    { key: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
                    { key: 'VISIT', label: 'Site Visit', icon: MapPin },
                    { key: 'EMAIL', label: 'Email', icon: Mail },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = channel === item.key;
                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => setChannel(item.key as any)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#7FB706]/20 border-[#7FB706] text-white shadow-sm'
                            : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Discussion Chips */}
              <div>
                <span className="text-[11px] text-gray-400 block mb-1.5 font-medium">Quick Discussion Templates:</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_DISCUSSION_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNotes((prev) => (prev ? `${prev} ${chip}` : chip))}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 transition"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discussion Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Discussion Notes / Summary *
                </label>
                <textarea
                  required
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Spoke with accounts in-charge regarding pending invoices..."
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#7FB706] resize-none"
                />
              </div>

              {/* Customer Response */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Customer Commitment / Response
                </label>
                <input
                  type="text"
                  value={customerResponse}
                  onChange={(e) => setCustomerResponse(e.target.value)}
                  placeholder="e.g. Promised RTGS transfer of ₹ 1,50,000 by Wednesday"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* Promise to Pay Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white/[0.02] border border-white/5 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-blue-300 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Promised Payment Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={promisedAmount}
                    onChange={(e) => setPromisedAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Promised Payment Date
                  </label>
                  <input
                    type="date"
                    value={promisedPaymentDate}
                    onChange={(e) => setPromisedPaymentDate(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>

              {/* Next Followup Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Next Follow-up Scheduled
                  </label>
                  <input
                    type="date"
                    value={nextFollowupDate}
                    onChange={(e) => setNextFollowupDate(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Follow-up Outcome Status</label>
                  <select
                    value={followupStatus}
                    onChange={(e) => setFollowupStatus(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="PROMISED_TO_PAY">Promised to Pay</option>
                    <option value="CONTACTED">Contacted / Discussion Ongoing</option>
                    <option value="PENDING">Pending Action</option>
                    <option value="DISPUTED">Invoice Disputed</option>
                    <option value="RESOLVED">Cleared / Resolved</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingTouchpoint}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-[#7FB706]/20 transition cursor-pointer min-h-[44px]"
                >
                  {submittingTouchpoint ? 'Saving...' : 'Record Interaction'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Summary Column */}
          <div className="space-y-4">
            <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Primary Contact Persons
              </h3>
              {customer.contacts && customer.contacts.length > 0 ? (
                <div className="space-y-2">
                  {customer.contacts.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                      <div className="font-semibold text-white">{c.name}</div>
                      {c.designation && <div className="text-[11px] text-gray-400">{c.designation}</div>}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-gray-300 hover:text-[#7FB706]">
                          <Phone className="w-3 h-3 text-gray-500" /> {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-gray-300 hover:text-[#7FB706]">
                          <Mail className="w-3 h-3 text-gray-500" /> {c.email}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No contacts registered.</p>
              )}
            </div>

            <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Quick Action Shortcuts
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('email')}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#7FB706]" /> Dispatch Statement Email
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => setActiveTab('ledger')}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-400" /> View Chronological Ledger
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={handlePrintStatement}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-purple-400" /> Vector Printable A4
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATEMENT OF ACCOUNT (LEDGER) */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-[#09071a] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Full Statement of Account / Running Ledger</h3>
              <p className="text-xs text-gray-400">Chronological list of all Proforma Invoices, Sales Orders, and Payments</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowRecordPaymentModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-emerald-500/10"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Record Payment
              </button>
              <button
                onClick={() => setShowManualEntryModal(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-purple-500/10"
              >
                <History className="w-3.5 h-3.5 text-purple-400" /> Historical Entry
              </button>
              <button
                onClick={handlePrintStatement}
                className="px-3.5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-[#7FB706]/20"
              >
                <Printer className="w-3.5 h-3.5" /> Print Statement
              </button>
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> CSV Export
              </button>
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
                  <p className="text-[11px] text-gray-400">Designated corporate account for client RTGS / NEFT remittances</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const bankName = ledger?.company?.bankAccount?.bankName || 'Central Bank Of India';
                  const accNo = ledger?.company?.bankAccount?.accountNumber || '3466708013';
                  const ifsc = ledger?.company?.bankAccount?.ifscCode || 'CBIN0283809';
                  const branch = ledger?.company?.bankAccount?.branch || 'B-20, Ganga Vihar, Gokalpuri, Delhi - 110094';
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
                <p className="text-white font-semibold mt-0.5">{ledger?.company?.bankAccount?.bankName || 'Central Bank Of India'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Account Number</span>
                <p className="text-emerald-400 font-mono font-bold mt-0.5">{ledger?.company?.bankAccount?.accountNumber || '3466708013'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">IFSC Code</span>
                <p className="text-sky-400 font-mono font-bold mt-0.5">{ledger?.company?.bankAccount?.ifscCode || 'CBIN0283809'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Branch & Remittance</span>
                <p className="text-gray-300 text-[11px] mt-0.5 truncate">{ledger?.company?.bankAccount?.branch || 'Delhi - 110094'}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#09071a] border border-white/10 rounded-2xl overflow-hidden">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ledger?.entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500 text-xs">
                        No transactions found for this customer.
                      </td>
                    </tr>
                  ) : (
                    ledger?.entries.map((row) => (
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISPATCH NOTICE EMAIL */}
      {activeTab === 'email' && (
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4 max-w-3xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Mail className="w-5 h-5 text-[#7FB706]" />
            Dispatch Formal Overdue Notice &amp; Ledger
          </h3>

          <form onSubmit={handleSendEmail} className="space-y-4">
            {/* Stage Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Reminder Notice Stage</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { key: 'STATEMENT', label: 'General Statement' },
                  { key: 'REMINDER_1', label: '1st Reminder' },
                  { key: 'REMINDER_2', label: '2nd Follow-up' },
                  { key: 'REMINDER_3', label: '3rd Notice' },
                  { key: 'FINAL_NOTICE', label: 'Final Demand' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => setEmailStage(item.key as any)}
                    className={`p-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                      emailStage === item.key
                        ? 'bg-[#7FB706]/20 border-[#7FB706] text-white shadow-sm'
                        : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Recipient Email(s) <span className="text-gray-500">(comma-separated)</span> *
              </label>
              <input
                type="text"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="accounts@customer.com, billing@customer.com"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Subject Line *</label>
              <input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Message Body / Notice</label>
              <textarea
                rows={4}
                value={emailNotes}
                onChange={(e) => setEmailNotes(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#7FB706] resize-none"
              />
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between text-xs">
              <span className="text-gray-400">Attached Statement Balance:</span>
              <span className="font-bold text-amber-400 font-mono">
                ₹ {closingBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={sendingEmail}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-[#7FB706]/20 transition cursor-pointer min-h-[44px]"
              >
                {sendingEmail ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching via Resend...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Notice Statement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: TOUCHPOINT AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Complete Omnichannel Touchpoint Audit History
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              {ledger?.logs?.length || 0} Total Records
            </span>
          </div>

          {ledger?.logs && ledger.logs.length > 0 ? (
            <div className="space-y-3">
              {ledger.logs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Automated Background Bot'}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(log.createdAt).toLocaleString('en-GB')}
                    </span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{log.notes}</p>
                  {log.response && (
                    <div className="text-[11px] text-emerald-400 font-medium">
                      Status / Response: {log.response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic py-8 text-center">
              No follow-up touchpoints recorded yet. Use the "Log Interaction" tab to record your first touchpoint.
            </p>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPaymentModal && customer && (
        <RecordPaymentModal
          isOpen={showRecordPaymentModal}
          onClose={() => setShowRecordPaymentModal(false)}
          customerId={customer.id}
          customerName={customer.legalName}
          defaultAmount={ledger?.summary?.closingBalance && ledger.summary.closingBalance > 0 ? ledger.summary.closingBalance : undefined}
          onSuccess={loadData}
        />
      )}

      {/* Manual / Historical Ledger Entry Modal */}
      {showManualEntryModal && customer && (
        <ManualLedgerEntryModal
          isOpen={showManualEntryModal}
          onClose={() => setShowManualEntryModal(false)}
          customerId={customer.id}
          customerName={customer.legalName}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
