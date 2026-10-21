import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Edit2,
  Trash2,
  Share2,
  Copy,
  Check,
  ZoomIn,
  ShieldCheck,
  History,
} from "lucide-react";
import { upApi } from "../../../api/upApi";
import type { UPExpense, UPAuditRecord } from "../../../types/admin";

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: UPExpense | null;
  onEdit: (expense: UPExpense) => void;
  onDelete: (id: string) => void;
  onToggleVerify: (id: string, currentStatus: boolean) => void;
}

const formatInr = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return "0";
  return Number(val).toLocaleString("en-IN");
};

export function ExpenseDetailModal({
  isOpen,
  onClose,
  expense,
  onEdit,
  onDelete,
  onToggleVerify,
}: ExpenseDetailModalProps) {
  const [audits, setAudits] = useState<UPAuditRecord[]>([]);
  const [isLoadingAudits, setIsLoadingAudits] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (isOpen && expense?.id) {
      setIsLoadingAudits(true);
      upApi
        .getExpenseAudit(expense.id)
        .then((res) => setAudits(res.data || []))
        .catch(() => setAudits([]))
        .finally(() => setIsLoadingAudits(false));
    } else {
      setAudits([]);
    }
  }, [isOpen, expense?.id]);

  if (!isOpen || !expense) return null;

  const handleCopySummary = () => {
    const text = `UP Daily Expense #${expense.id.slice(0, 8)}
Date: ${expense.expenseDate}
Paid To: ${expense.paidTo}
Category: ${expense.categoryName}
Amount: ₹${formatInr(expense.amount)}
Mode: ${(expense.paymentMode || "cash").toUpperCase()}
Status: ${expense.verified ? "VERIFIED" : "PENDING"}
Note: ${expense.note || "N/A"}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-[#030213] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-gray-400">
                Expense #{expense.id.slice(0, 8)}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  expense.verified
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
              >
                {expense.verified ? "Verified" : "Pending Verification"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopySummary}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
                title="Copy details"
              >
                {copied ? <Check className="w-4 h-4 text-[#7FB706]" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-5 text-white">
            {/* Amount Hero Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-white/[0.04] to-white/[0.01] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Total Amount
                </span>
                <div className="text-3xl font-black text-white font-mono mt-0.5">
                  ₹{formatInr(expense.amount)}
                </div>
                <span className="text-xs text-[#7FB706] font-semibold mt-1 block">
                  {expense.categoryName} &bull; {(expense.paymentMode || "cash").toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => onToggleVerify(expense.id, expense.verified)}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                  expense.verified
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{expense.verified ? "Mark Unverified" : "Verify (1-Tap)"}</span>
              </button>
            </div>

            {/* Grid of Key Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                  Paid To / Vendor
                </span>
                <span className="font-bold text-white text-sm">{expense.paidTo}</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                  Expense Date
                </span>
                <span className="font-bold text-white text-sm">{expense.expenseDate}</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                  Payment Method
                </span>
                <span className="font-bold text-white uppercase">{expense.paymentMode || "Cash"}</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                  Recorded By
                </span>
                <span className="font-bold text-white">{expense.createdByName || "Super Admin"}</span>
              </div>
            </div>

            {/* Note */}
            {expense.note && (
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                  Note / Remarks
                </span>
                <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{expense.note}</p>
              </div>
            )}

            {/* Receipt Preview if attached */}
            {expense.receiptPath && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Attached Receipt
                </span>
                <div
                  onClick={() => setLightboxOpen(true)}
                  className="relative rounded-xl overflow-hidden border border-white/15 max-h-48 bg-black/40 flex items-center justify-center cursor-pointer group"
                >
                  <img
                    src={expense.receiptPath}
                    alt="Expense receipt"
                    className="object-contain max-h-48 w-full group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 text-xs font-bold text-white">
                    <ZoomIn className="w-4 h-4" />
                    <span>Tap to view full image</span>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Metadata */}
            {expense.verified && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <div>
                  <span>Verified by </span>
                  <strong className="text-white">{expense.verifiedByName || "Super Admin"}</strong>
                  {expense.verifiedAt && (
                    <span className="text-[10px] text-emerald-300/70 block">
                      on {new Date(expense.verifiedAt).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Audit History Timeline */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="text-xs font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-[#7FB706]" />
                Audit Trail ({audits.length})
              </h4>
              {isLoadingAudits ? (
                <div className="text-xs text-gray-500 py-2">Loading audit history...</div>
              ) : audits.length === 0 ? (
                <div className="text-xs text-gray-500 italic">No modifications recorded</div>
              ) : (
                <div className="space-y-2">
                  {audits.map((a) => (
                    <div key={a.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-[11px]">
                      <div className="flex items-center justify-between text-gray-400">
                        <span className="font-bold text-white">{a.action}</span>
                        <span>{new Date(a.createdAt).toLocaleString("en-IN")}</span>
                      </div>
                      <span className="text-gray-400 text-[10px] block mt-0.5">
                        By: <strong className="text-gray-300">{a.changedByName || "Super Admin"}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Bar (Edit / Delete) */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02] flex gap-3">
            <button
              onClick={() => {
                onDelete(expense.id);
                onClose();
              }}
              className="py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 transition min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
            <button
              onClick={() => {
                onEdit(expense);
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-black text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-[#7FB706]/20 min-h-[44px]"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox for full receipt */}
      {lightboxOpen && expense.receiptPath && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={expense.receiptPath}
            alt="Full receipt"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
