import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  DollarSign,
  Tag,
  Upload,
  CheckCircle2,
  Trash2,
  Camera,
  Coins,
} from "lucide-react";
import type { UPExpense, UPCategory, CreateUpExpenseInput, UpdateUpExpenseInput } from "../../../types/admin";

interface AddEditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUpExpenseInput) => Promise<void>;
  categories: UPCategory[];
  expenseToEdit?: UPExpense | null;
  defaultDate?: string;
}

export function AddEditExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  expenseToEdit,
  defaultDate,
}: AddEditExpenseModalProps) {
  const [expenseDate, setExpenseDate] = useState(() => {
    return defaultDate || new Date().toISOString().split("T")[0];
  });
  const [amount, setAmount] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("cash");
  const [paidTo, setPaidTo] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [receiptPath, setReceiptPath] = useState<string>("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset when opened or expenseToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setExpenseDate(
          expenseToEdit.expenseDate ? expenseToEdit.expenseDate.slice(0, 10) : new Date().toISOString().split("T")[0]
        );
        setAmount(String(expenseToEdit.amount || ""));
        setCategoryId(expenseToEdit.categoryId || "");
        setPaymentMode(expenseToEdit.paymentMode?.toLowerCase() || "cash");
        setPaidTo(expenseToEdit.paidTo || "");
        setNote(expenseToEdit.note || "");
        setReceiptPath(expenseToEdit.receiptPath || "");
        setReceiptPreview(expenseToEdit.receiptPath || null);
      } else {
        setExpenseDate(defaultDate || new Date().toISOString().split("T")[0]);
        setAmount("");
        setCategoryId(categories.length > 0 ? categories[0].id : "");
        setPaymentMode("cash");
        setPaidTo("");
        setNote("");
        setReceiptPath("");
        setReceiptPreview(null);
      }
      setError(null);
    }
  }, [isOpen, expenseToEdit, defaultDate, categories]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Receipt image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setReceiptPreview(b64);
      setReceiptPath(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (!categoryId) {
      setError("Please select an expense category");
      return;
    }
    if (!paidTo.trim()) {
      setError("Please enter who the money was paid to / vendor");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        expenseDate,
        amount: numAmount,
        categoryId,
        paymentMode,
        paidTo: paidTo.trim(),
        note: note.trim() || null,
        receiptPath: receiptPath || null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#030213] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823]">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {expenseToEdit ? "Edit Daily Expense" : "Record Daily Expense"}
              </h3>
              <p className="text-[11px] text-gray-400">UP Restroom Cubicle Factory Ledger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Amount (Big Touch Keypad Friendly) */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Expense Amount (₹) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-[#7FB706]">
                ₹
              </span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/15 focus:border-[#7FB706] rounded-xl text-2xl font-black text-white placeholder-gray-600 focus:outline-none transition min-h-[48px]"
                required
              />
            </div>
          </div>

          {/* Date & Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/15 focus:border-[#7FB706] rounded-xl text-sm font-semibold text-white focus:outline-none transition min-h-[44px]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                {(["cash", "upi", "bank_transfer"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition text-center min-h-[36px] uppercase ${
                      paymentMode === mode
                        ? "bg-[#7FB706] text-black shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {mode === "bank_transfer" ? "Bank" : mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Chips & Select */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#07061d] border border-white/15 focus:border-[#7FB706] rounded-xl text-sm font-semibold text-white focus:outline-none transition min-h-[44px]"
              required
            >
              <option value="" disabled>
                Select category...
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Quick chips (Top 5) */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categories.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                    categoryId === c.id
                      ? "bg-[#7FB706]/20 text-[#B5F823] border-[#7FB706]/40"
                      : "bg-white/5 text-gray-400 border-transparent hover:text-white"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Paid To / Vendor Name */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              Paid To / Vendor / Person <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="e.g. Grinder Rod, Hand Gloves, Transport, Ammi"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/15 focus:border-[#7FB706] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition min-h-[44px]"
              required
            />
          </div>

          {/* Note / Purpose */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              Short Note / Purpose (Optional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add details, bill reference, invoice no, or remarks..."
              className="w-full px-4 py-2 bg-white/5 border border-white/15 focus:border-[#7FB706] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition resize-none"
            />
          </div>

          {/* Receipt Attachment / Camera */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-gray-400" />
              Receipt Photo / Attachment (Optional)
            </label>

            {receiptPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-white/15 max-h-40 bg-black/40 flex items-center justify-center group">
                <img src={receiptPreview} alt="Receipt preview" className="object-contain max-h-40 w-full" />
                <button
                  type="button"
                  onClick={() => {
                    setReceiptPreview(null);
                    setReceiptPath("");
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-500 transition shadow-lg"
                  title="Remove receipt"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/15 hover:border-[#7FB706]/40 rounded-xl cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition">
                <Camera className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs font-semibold text-gray-300">Tap to Take Photo or Upload Receipt</span>
                <span className="text-[10px] text-gray-500 mt-0.5">JPG, PNG, WebP up to 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Footer Submit Action (Sticky on mobile bottom) */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-sm transition min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-black text-sm transition shadow-lg shadow-[#7FB706]/20 flex items-center justify-center gap-2 min-h-[48px] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{expenseToEdit ? "Update Expense" : "Save Expense"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
