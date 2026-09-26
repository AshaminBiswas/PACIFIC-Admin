import React, { useState } from 'react';
import { DollarSign, CreditCard, Building2, Calendar, Hash, FileText, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { financeApi } from '../../api/services';
import type { PaymentMethod } from '../../types/admin';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  defaultAmount?: number;
  onSuccess?: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  defaultAmount,
  onSuccess,
}) => {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('NEFT_RTGS');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please specify a valid payment amount greater than zero.');
      return;
    }
    if (!referenceNumber.trim()) {
      setError('Please provide a transaction UTR or reference number.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await financeApi.recordPayment({
        partyId: customerId,
        paymentType: 'CUSTOMER_PAYMENT',
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        paymentDate,
        amount: numAmount,
        currency: 'INR',
        notes: notes.trim() || `Customer remittance received for ${customerName}`,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Record Customer Payment</h3>
              <p className="text-xs text-gray-400">Real-time ledger update for <span className="text-white font-medium">{customerName}</span></p>
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

        {/* Corporate Beneficiary Remittance Reference */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Deposited into Entity Bank Account
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Central Bank Of India</span>
          </div>
          <div className="text-xs text-gray-300 flex justify-between">
            <span>A/C: <span className="font-mono text-white">3466708013</span></span>
            <span>IFSC: <span className="font-mono text-white">CBIN0283809</span></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Payment Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" /> Amount (₹ INR) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
              {Number(amount) > 0 && (
                <p className="text-[10px] text-emerald-400/90 mt-1 font-mono">
                  = ₹ {Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" /> Payment Mode <span className="text-red-400">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-[#1a1a36] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="NEFT_RTGS">NEFT / RTGS / Bank Transfer</option>
                <option value="IMPS">IMPS Instant Transfer</option>
                <option value="UPI">UPI / QR Code Transfer</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
                <option value="CASH">Cash Deposit</option>
                <option value="CARD">Credit / Debit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-gray-400" /> UTR / Cheque / Bank Ref <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. UTR-20260925-01992"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" /> Narration / Allocation Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Received 50% advance for Sales Order PPS/SO/2026-27/0014"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
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
              className="px-5 py-2 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {saving ? (
                <>Recording Payment...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Post to Ledger
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
