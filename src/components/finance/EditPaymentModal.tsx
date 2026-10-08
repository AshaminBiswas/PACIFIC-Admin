import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Calendar, Hash, FileText, X, AlertTriangle, CheckCircle, Edit } from 'lucide-react';
import { financeApi } from '../../api/services';
import type { Payment, PaymentMethod, PaymentType } from '../../types/admin';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onSuccess?: () => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  onSuccess,
}) => {
  const [paymentDate, setPaymentDate] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('NEFT_RTGS');
  const [paymentType, setPaymentType] = useState<PaymentType>('CUSTOMER_PAYMENT');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payment) {
      setAmount(String(payment.amount || ''));
      setPaymentDate(
        payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      );
      setPaymentMethod((payment.paymentMethod as PaymentMethod) || 'NEFT_RTGS');
      setPaymentType((payment.paymentType as PaymentType) || 'CUSTOMER_PAYMENT');
      setReferenceNumber(payment.referenceNumber || '');
      setNotes(payment.notes || '');
      setError(null);
    }
  }, [payment]);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please specify a valid payment amount greater than zero.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await financeApi.updatePayment(payment.id, {
        amount: numAmount,
        paymentDate,
        paymentMethod,
        paymentType,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to update payment:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to update payment record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0e0e1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#09071a]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Payment Record</h3>
              <p className="text-xs text-gray-400">
                {payment.party?.legalName ? `Party: ${payment.party.legalName}` : 'Update payment & recalculate allocations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Amount Received (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:border-[#7FB706] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Payment Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#7FB706] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-[#121226] border border-white/10 rounded-xl text-white text-sm focus:border-[#7FB706] focus:outline-none"
              >
                <option value="NEFT_RTGS">NEFT / RTGS Bank Transfer</option>
                <option value="IMPS">IMPS Instant Transfer</option>
                <option value="UPI">UPI / QR Code Scan</option>
                <option value="CHEQUE">Bank Cheque / DD</option>
                <option value="CASH">Cash Deposit / Receipt</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Payment Classification
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className="w-full px-3 py-2 bg-[#121226] border border-white/10 rounded-xl text-white text-sm focus:border-[#7FB706] focus:outline-none"
              >
                <option value="ADVANCE">Advance Payment</option>
                <option value="CUSTOMER_PAYMENT">Customer Bill Clearance</option>
                <option value="VENDOR_PAYMENT">Vendor Payment</option>
                <option value="REFUND">Refund</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Reference / UTR / Cheque Number
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR2938491829 or CHQ-928192"
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:border-[#7FB706] focus:outline-none uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Advance remittance received against Proforma Invoice"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#7FB706] focus:outline-none resize-none"
            />
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7FB706] hover:bg-[#8ecb08] text-black transition flex items-center gap-2 shadow-lg shadow-[#7FB706]/20 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
