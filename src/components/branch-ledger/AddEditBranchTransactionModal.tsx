import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Building2,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  User,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  BranchItem,
  BranchTransactionItem,
  CreateBranchTransactionPayload,
} from '../../types/admin';
import { branchLedgerApi } from '../../api/branchLedgerApi';

interface AddEditBranchTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branches: BranchItem[];
  defaultBranchId?: string;
  initialType?: 'CREDIT' | 'DEBIT';
  transactionToEdit?: BranchTransactionItem | null;
}

const CREDIT_CATEGORIES = [
  'Sales Collection',
  'HO Fund Transfer',
  'Customer Advance',
  'Scrap / Asset Sale',
  'Bank Interest',
  'Inter-Branch Transfer',
  'Refund Received',
  'Other Inflow',
];

const DEBIT_CATEGORIES = [
  'Local Material Purchase',
  'Transporter & Freight',
  'Site Installation Expense',
  'Branch Rent & Utilities',
  'Petty Cash Expense',
  'Labor & Fabrication Wage',
  'Office Stationary & Tea',
  'Staff Travel & Conveyance',
  'Bank Charges & Fees',
  'Customer Refund',
  'Other Outflow',
];

const PAYMENT_MODES = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / IMPS' },
  { value: 'UPI', label: 'UPI / QR Payment' },
  { value: 'CASH', label: 'Branch Cash / Petty Cash' },
  { value: 'CHEQUE', label: 'Bank Cheque' },
  { value: 'NEFT_RTGS', label: 'NEFT / RTGS' },
];

export const AddEditBranchTransactionModal: React.FC<AddEditBranchTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branches,
  defaultBranchId,
  initialType = 'CREDIT',
  transactionToEdit,
}) => {
  const isEditing = !!transactionToEdit;

  const [type, setType] = useState<'CREDIT' | 'DEBIT'>(initialType);
  const [branchId, setBranchId] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [partyName, setPartyName] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [paymentStatus, setPaymentStatus] = useState<string>('CLEARED');
  const [description, setDescription] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setBranchId(transactionToEdit.branchId);
      setEntryDate(transactionToEdit.entryDate);
      setAmount(String(transactionToEdit.amount || ''));
      setCategory(transactionToEdit.category || '');
      setPartyName(transactionToEdit.partyName || '');
      setReferenceNo(transactionToEdit.referenceNo || '');
      setPaymentMode(transactionToEdit.paymentMode || 'BANK_TRANSFER');
      setPaymentStatus(transactionToEdit.paymentStatus || 'CLEARED');
      setDescription(transactionToEdit.description || '');
    } else {
      setType(initialType);
      const selected = defaultBranchId && defaultBranchId !== 'ALL'
        ? defaultBranchId
        : branches[0]?.id || '';
      setBranchId(selected);
      setEntryDate(new Date().toISOString().slice(0, 10));
      setAmount('');
      setCategory(initialType === 'CREDIT' ? CREDIT_CATEGORIES[0] : DEBIT_CATEGORIES[0]);
      setPartyName('');
      setReferenceNo('');
      setPaymentMode('BANK_TRANSFER');
      setPaymentStatus('CLEARED');
      setDescription('');
    }
    setError(null);
  }, [transactionToEdit, isOpen, defaultBranchId, initialType, branches]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: 'CREDIT' | 'DEBIT') => {
    setType(newType);
    if (!isEditing) {
      setCategory(newType === 'CREDIT' ? CREDIT_CATEGORIES[0] : DEBIT_CATEGORIES[0]);
    }
  };

  const setDatePreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setEntryDate(d.toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      setError('Please select a branch.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!partyName.trim()) {
      setError('Party / Payee name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateBranchTransactionPayload = {
      branchId,
      entryDate,
      type,
      amount: numAmount,
      category: category.trim(),
      partyName: partyName.trim(),
      referenceNo: referenceNo.trim() || undefined,
      paymentMode,
      paymentStatus,
      description: description.trim() || undefined,
    };

    try {
      if (isEditing && transactionToEdit) {
        await branchLedgerApi.updateTransaction(transactionToEdit.id, payload);
      } else {
        await branchLedgerApi.createTransaction(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save transaction:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to record transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategories = type === 'CREDIT' ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`p-2 rounded-xl border ${
                type === 'CREDIT'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {type === 'CREDIT' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isEditing ? 'Edit Transaction' : type === 'CREDIT' ? 'Record Credit (+ Inflow)' : 'Record Debit (- Outflow)'}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    type === 'CREDIT'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {type === 'CREDIT' ? 'Receipt / Inflow' : 'Payment / Outflow'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic book accounting ledger entry for regional branch balance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Toggle Type Buttons */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleTypeChange('CREDIT')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'CREDIT'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-300" />
                <span>Credit (+ Inflow)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('DEBIT')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'DEBIT'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-300" />
                <span>Debit (- Outflow)</span>
              </button>
            </div>
          )}

          {/* Branch & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Select Branch <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Entry Date <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDatePreset(0)}
                    className="text-lime-400 hover:underline"
                  >
                    Today
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setDatePreset(1)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Yesterday
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          {/* Amount & Party Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Amount (₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-lime-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {type === 'CREDIT' ? 'Received From (Payer)' : 'Paid To (Payee)'}{' '}
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder={type === 'CREDIT' ? 'e.g. Apex Builders / Head Office' : 'e.g. Quick Freight / Landlord'}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Transaction Category <span className="text-rose-400">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {activeCategories.slice(0, 5).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    category === cat
                      ? type === 'CREDIT'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500"
            >
              {activeCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode & Reference # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Voucher / Bill / UTR Ref #</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. UTR-982144 / VCH-0042"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          {/* Particulars / Narration */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Particulars / Narration</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Advance payment received for Pune IT Park installation stage 1"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                type === 'CREDIT'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : type === 'CREDIT' ? 'Record Credit' : 'Record Debit'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
