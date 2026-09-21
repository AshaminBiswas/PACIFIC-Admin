import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Plus, Search, CheckCircle, AlertTriangle,
  Clock, DollarSign, ArrowUpRight, ArrowDownLeft, RefreshCw, X
} from 'lucide-react';
import { financeApi, followupsApi, crmApi } from '../api/services';
import type {
  Payment, ReceivableEntry, PayableEntry, LedgerSummary,
  RecoveryDashboardStats, BusinessParty, PaymentFollowup
} from '../types/admin';

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'receivables' | 'recovery'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receivables, setReceivables] = useState<ReceivableEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [recoveryStats, setRecoveryStats] = useState<RecoveryDashboardStats | null>(null);
  const [followups, setFollowups] = useState<PaymentFollowup[]>([]);
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [loading, setLoading] = useState(true);

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('NEFT_RTGS');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentType, setPaymentType] = useState('CUSTOMER_PAYMENT');
  const [notes, setNotes] = useState('');

  // Add Follow-up Modal
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupCustomerId, setFollowupCustomerId] = useState('');
  const [followupAmount, setFollowupAmount] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, recRes, sumRes, recovRes, folRes] = await Promise.all([
        financeApi.listPayments({ limit: 20 }),
        financeApi.getReceivables(),
        financeApi.getSummary(),
        followupsApi.getDashboard(),
        followupsApi.list({ limit: 20 }),
      ]);

      if (payRes.data?.data) setPayments(payRes.data.data.items || []);
      if (recRes.data?.data) setReceivables(recRes.data.data || []);
      if (sumRes.data?.data) setSummary(sumRes.data.data);
      if (recovRes.data?.data) setRecoveryStats(recovRes.data.data);
      if (folRes.data?.data) setFollowups(folRes.data.data.items || []);
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    crmApi.listCustomers({ limit: 50 }).then((res) => {
      if (res.data?.data) setCustomers(res.data.data.items || []);
    });
  }, [fetchData]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.recordPayment({
        partyId: selectedPartyId,
        amount: Number(paymentAmount),
        paymentMethod,
        paymentType,
        referenceNumber,
        notes,
      });
      setShowPaymentModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#7FB706]" />
            Finance & Dues Recovery
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Payment allocations, receivables ledger, and automated payment follow-up reminders
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
          <button
            onClick={() => setShowFollowupModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl border border-white/5 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-400" /> New Follow-up
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <span className="text-xs text-gray-400">Total Receivables</span>
          <div className="text-lg sm:text-xl font-bold text-white mt-1">
            ₹ {(summary?.receivables?.total || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-gray-500">From all issued PIs</span>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <span className="text-xs text-gray-400">Outstanding Dues</span>
          <div className="text-lg sm:text-xl font-bold text-amber-400 mt-1">
            ₹ {(summary?.receivables?.outstanding || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-500/80">Pending recovery</span>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <span className="text-xs text-gray-400">Collected Amount</span>
          <div className="text-lg sm:text-xl font-bold text-[#7FB706] mt-1">
            ₹ {(summary?.receivables?.collected || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-[#7FB706]/80">Confirmed in bank</span>
        </div>

        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <span className="text-xs text-gray-400">Promise-to-Pay Dues</span>
          <div className="text-lg sm:text-xl font-bold text-blue-400 mt-1">
            ₹ {(recoveryStats?.promiseToPayAmount || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-blue-400/80">{recoveryStats?.promiseToPayCount || 0} Clients committed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'payments' ? 'border-[#7FB706] text-[#7FB706]' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Payment Transactions
        </button>
        <button
          onClick={() => setActiveTab('receivables')}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'receivables' ? 'border-[#7FB706] text-[#7FB706]' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Receivables Ledger
        </button>
        <button
          onClick={() => setActiveTab('recovery')}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'recovery' ? 'border-[#7FB706] text-[#7FB706]' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Recovery & Follow-ups
        </button>
      </div>

      {/* Tab 1: Payments List */}
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
                      <td className="py-3 px-4 font-bold text-[#7FB706]">₹ {Number(p.amount).toLocaleString()}</td>
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

      {/* Tab 2: Receivables Ledger */}
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
                      <td className="py-3 px-4 text-xs">₹ {Number(r.totalAmount).toLocaleString()}</td>
                      <td className="py-3 px-4 text-xs text-[#7FB706]">₹ {Number(r.paidAmount).toLocaleString()}</td>
                      <td className="py-3 px-4 font-bold text-amber-400">₹ {Number(r.balanceAmount).toLocaleString()}</td>
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

      {/* Tab 3: Recovery & Follow-ups */}
      {activeTab === 'recovery' && (
        <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {followups.map((f) => (
              <div key={f.id} className="bg-[#0a0a1a] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{f.customer?.legalName || 'Customer'}</h4>
                    <span className="text-xs text-amber-400 font-bold">Due: ₹ {Number(f.outstandingAmount).toLocaleString()}</span>
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

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#7FB706]" /> Record Payment Receipt
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Select Customer / Party *</label>
                <select
                  required
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="">-- Choose Party --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.legalName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Payment Type</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="CUSTOMER_PAYMENT">Customer Payment</option>
                    <option value="ADVANCE">Advance Payment</option>
                    <option value="REFUND">Refund</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="NEFT_RTGS">NEFT / RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  inputMode="numeric"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  placeholder="e.g. 150000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Reference / UTR Number</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  placeholder="e.g. UTR0928172635"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-xs text-gray-400">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold text-xs rounded-xl">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Followup Modal */}
      {showFollowupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> New Dues Follow-up
              </h3>
              <button onClick={() => setShowFollowupModal(false)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white">
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
                  placeholder="Spoke with procurement head, promised cheque dispatch by Friday."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setShowFollowupModal(false)} className="px-4 py-2 text-xs text-gray-400">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold text-xs rounded-xl">
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
