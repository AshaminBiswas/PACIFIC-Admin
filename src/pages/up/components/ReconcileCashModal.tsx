import React, { useState, useEffect } from "react";
import {
  X,
  Wallet,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Coins,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import { upApi } from "../../../api/upApi";
import type { UPCashDay, ReconcileCashInput } from "../../../types/admin";

interface ReconcileCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate: string;
}

const formatInr = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return "0";
  return Number(val).toLocaleString("en-IN");
};

export function ReconcileCashModal({
  isOpen,
  onClose,
  onSuccess,
  selectedDate,
}: ReconcileCashModalProps) {
  const [cashStatus, setCashStatus] = useState<UPCashDay | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openingBalance, setOpeningBalance] = useState<string>("0");
  const [actualClosing, setActualClosing] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isClosingDay, setIsClosingDay] = useState(false);

  useEffect(() => {
    if (isOpen && selectedDate) {
      setIsLoading(true);
      setError(null);
      upApi
        .getCashStatus(selectedDate)
        .then((res) => {
          const d = res.data;
          setCashStatus(d);
          setOpeningBalance(String(d.openingBalance || 0));
          setActualClosing(d.actualClosing !== null ? String(d.actualClosing) : "");
          setNotes(d.notes || "");
          setIsClosingDay(Boolean(d.closed));
        })
        .catch((err) => {
          setError(err?.message || "Failed to load daily cash status");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const opening = parseFloat(openingBalance) || 0;
  const cashExpenses = cashStatus?.cashExpenses || 0;
  const expectedClosing = opening - cashExpenses;
  const actual = actualClosing !== "" ? parseFloat(actualClosing) : null;
  const difference = actual !== null ? actual - expectedClosing : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);
      const payload: ReconcileCashInput = {
        cashDate: selectedDate,
        openingBalance: opening,
        actualClosing: actual,
        notes: notes.trim() || null,
        closed: isClosingDay,
      };
      await upApi.reconcileCash(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to reconcile cash");
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Daily Cash Reconciliation</h3>
              <p className="text-[11px] text-gray-400 font-mono">Date: {selectedDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Loading cash ledger...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            {cashStatus?.closed && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>This cash day is locked &amp; closed by Super Admin.</span>
              </div>
            )}

            {/* Calculations Breakdown Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-semibold">Opening Petty Cash</span>
                <span className="font-bold text-white font-mono">₹{formatInr(opening)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-semibold flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  Today's Cash Expenses
                </span>
                <span className="font-bold text-red-400 font-mono">- ₹{formatInr(cashExpenses)}</span>
              </div>

              <div className="h-px bg-white/10 my-1" />

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-bold uppercase tracking-wider">
                  Expected Closing Cash
                </span>
                <span className="font-black text-white font-mono text-sm">
                  ₹{formatInr(expectedClosing)}
                </span>
              </div>
            </div>

            {/* Input: Opening Balance */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="any"
                disabled={Boolean(cashStatus?.closed)}
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/15 focus:border-[#7FB706] rounded-xl text-sm font-bold text-white focus:outline-none transition min-h-[44px]"
              />
            </div>

            {/* Input: Actual Physical Cash Counted */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Actual Physical Cash Counted (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-[#7FB706]">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  disabled={Boolean(cashStatus?.closed)}
                  value={actualClosing}
                  onChange={(e) => setActualClosing(e.target.value)}
                  placeholder="Enter physical cash in hand"
                  className="w-full pl-9 pr-4 py-3 bg-white/5 border border-white/15 focus:border-[#7FB706] rounded-xl text-xl font-black text-white placeholder-gray-600 focus:outline-none transition min-h-[48px]"
                />
              </div>
            </div>

            {/* Live Difference / Variance Badge */}
            {difference !== null && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  Math.abs(difference) < 0.01
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : difference > 0
                    ? "bg-[#7FB706]/15 border-[#7FB706]/40 text-[#B5F823]"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {Math.abs(difference) < 0.01 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  )}
                  <div>
                    <span className="text-xs font-bold block">
                      {Math.abs(difference) < 0.01
                        ? "Exact Match (Zero Discrepancy)"
                        : difference > 0
                        ? "Surplus Cash Detected"
                        : "Deficit / Shortage Detected"}
                    </span>
                    <span className="text-[10px] opacity-80">
                      Actual vs Expected Variance
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono font-black text-base">
                  {difference > 0 ? "+" : ""}₹{formatInr(difference)}
                </div>
              </div>
            )}

            {/* Reconciliation Notes */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Reconciliation Notes / Explanation
              </label>
              <textarea
                rows={2}
                disabled={Boolean(cashStatus?.closed)}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks about discrepancies, pending vouchers, cash handovers..."
                className="w-full px-4 py-2 bg-white/5 border border-white/15 focus:border-[#7FB706] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none transition resize-none"
              />
            </div>

            {/* Close Day Toggle */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isClosingDay ? (
                  <Lock className="w-4 h-4 text-amber-400" />
                ) : (
                  <Unlock className="w-4 h-4 text-gray-400" />
                )}
                <div>
                  <span className="text-xs font-bold text-white block">Close &amp; Lock Cash Day</span>
                  <span className="text-[10px] text-gray-400">
                    Locks the day from further modifications
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isClosingDay}
                onChange={(e) => setIsClosingDay(e.target.checked)}
                className="w-5 h-5 accent-[#7FB706] rounded cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-sm transition min-h-[48px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Boolean(cashStatus?.closed)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-black font-black text-sm transition shadow-lg shadow-[#7FB706]/20 flex items-center justify-center gap-2 min-h-[48px]"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Save Reconciliation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
