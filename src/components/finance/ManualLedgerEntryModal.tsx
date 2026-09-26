import React, { useState } from 'react';
import { History, PlusCircle, ArrowUpRight, ArrowDownLeft, Calendar, Hash, FileText, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { financeApi } from '../../api/services';
import type { ManualLedgerEntryInput } from '../../types/admin';

interface ManualLedgerEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onSuccess?: () => void;
}

export const ManualLedgerEntryModal: React.FC<ManualLedgerEntryModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSuccess,
}) => {
  const [entryType, setEntryType] = useState<'DEBIT' | 'CREDIT'>('CREDIT');
  const [nature, setNature] = useState<'OPENING_BALANCE' | 'PAST_INVOICE' | 'PAST_PAYMENT' | 'ADJUSTMENT'>('PAST_PAYMENT');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [docRef, setDocRef] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('NEFT_RTGS');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please specify a valid amount greater than zero.');
      return;
    }
    if (!docRef.trim()) {
      setError('Please provide a document reference number (e.g., UTR, Old Invoice No, Opening Ref).');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: ManualLedgerEntryInput = {
        entryType,
        nature,
        date,
        docRef: docRef.trim(),
        description: description.trim() || `${nature.replace('_', ' ')} manual ledger posting`,
        amount: numAmount,
        paymentMethod: entryType === 'CREDIT' ? paymentMethod : undefined,
      };

      await financeApi.recordManualLedgerEntry(customerId, payload);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to post manual ledger entry:', err);
      setError(err.response?.data?.message || err.message || 'Failed to record entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Manual / Historical Ledger Entry</h3>
              <p className="text-xs text-gray-400">Add pre-ERP transactions & opening balances for <span className="text-white font-medium">{customerName}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entry Type Selector: DEBIT vs CREDIT */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Entry Type & Accounting Impact <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEntryType('CREDIT');
                  if (nature === 'PAST_INVOICE') setNature('PAST_PAYMENT');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  entryType === 'CREDIT'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span>Credit (Money Received / Advance)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryType('DEBIT');
                  if (nature === 'PAST_PAYMENT') setNature('PAST_INVOICE');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  entryType === 'DEBIT'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
                <span>Debit (Past Bill / Balance Due)</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {entryType === 'CREDIT'
                ? '🟢 Credit increases customer advance or reduces outstanding receivables.'
                : '🟡 Debit records money customer owes for historical deliveries or opening balance.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Transaction Nature <span className="text-red-400">*</span>
              </label>
              <select
                value={nature}
                onChange={(e: any) => setNature(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1a36] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
              >
                {entryType === 'CREDIT' ? (
                  <>
                    <option value="PAST_PAYMENT">Past Bank Remittance / Payment</option>
                    <option value="OPENING_BALANCE">Opening Advance Balance</option>
                    <option value="ADJUSTMENT">Credit Adjustment / Discount</option>
                  </>
                ) : (
                  <>
                    <option value="PAST_INVOICE">Past Invoice / Delivered Goods</option>
                    <option value="OPENING_BALANCE">Opening Due Balance</option>
                    <option value="ADJUSTMENT">Debit Adjustment / Surcharge</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Transaction Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-gray-400" /> Doc / Ref / UTR No. <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={entryType === 'CREDIT' ? 'e.g. UTR-2025112001 or CHQ-0991' : 'e.g. INV-2025-042 or OB-2025'}
                value={docRef}
                onChange={(e) => setDocRef(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono uppercase focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Amount (₹ INR) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 100000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
              />
              {Number(amount) > 0 && (
                <p className="text-[10px] text-purple-400/90 mt-1 font-mono">
                  = ₹ {Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>

          {entryType === 'CREDIT' && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1a36] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="NEFT_RTGS">NEFT / RTGS Bank Transfer</option>
                <option value="IMPS">IMPS Immediate Payment</option>
                <option value="UPI">UPI / QR Code Transfer</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
                <option value="CASH">Cash Deposit</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" /> Description / Narration
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Historical transaction prior to ERP rollout; reconciled with Tally / Bank statement"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              {saving ? (
                <>Posting...</>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  Save Historical Entry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
