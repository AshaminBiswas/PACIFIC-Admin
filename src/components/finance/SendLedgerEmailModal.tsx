import React, { useState, useEffect } from 'react';
import { Mail, X, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { financeApi } from '../../api/services';
import type { SendLedgerEmailInput } from '../../types/admin';

interface SendLedgerEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  defaultEmail?: string;
  outstandingAmount?: number;
  defaultStage?: 'REMINDER_1' | 'REMINDER_2' | 'REMINDER_3' | 'FINAL_NOTICE' | 'MANUAL_EMAIL' | 'STATEMENT';
  onSuccess?: () => void;
}

export const SendLedgerEmailModal: React.FC<SendLedgerEmailModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  defaultEmail = '',
  outstandingAmount = 0,
  defaultStage = 'STATEMENT',
  onSuccess,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail);
  const [stage, setStage] = useState<'STATEMENT' | 'REMINDER_1' | 'REMINDER_2' | 'REMINDER_3' | 'FINAL_NOTICE'>('STATEMENT');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRecipientEmail(defaultEmail || '');
      setStage(defaultStage as any || 'STATEMENT');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, defaultEmail, defaultStage]);

  useEffect(() => {
    // Dynamic default subject and note depending on stage
    switch (stage) {
      case 'REMINDER_1':
        setSubject(`[Payment Reminder] Outstanding Account Statement — ${customerName}`);
        setNotes(`Dear Valued Client, this is a friendly reminder that mature invoices totaling ₹ ${outstandingAmount.toLocaleString('en-IN')} are pending as per agreed terms. Please find attached the updated statement for prompt processing.`);
        break;
      case 'REMINDER_2':
        setSubject(`[2nd Follow-up] Urgent: Pending Account Statement — ${customerName}`);
        setNotes(`Dear Client, following up on our previous notice, invoices totaling ₹ ${outstandingAmount.toLocaleString('en-IN')} remain overdue. Kindly arrange payment or share the expected remittance date.`);
        break;
      case 'REMINDER_3':
        setSubject(`[3rd Notice] Critical: Overdue Account Follow-up — ${customerName}`);
        setNotes(`Dear Client, this is a 3rd notice regarding overdue balance of ₹ ${outstandingAmount.toLocaleString('en-IN')}. Please settle this balance promptly to prevent holds on pending deliveries.`);
        break;
      case 'FINAL_NOTICE':
        setSubject(`[FINAL DEMAND NOTICE] Immediate Settlement Required — ${customerName}`);
        setNotes(`FINAL NOTICE: Your overdue balance of ₹ ${outstandingAmount.toLocaleString('en-IN')} requires immediate settlement within 24 hours to avoid suspension of credit and administrative escalation.`);
        break;
      default:
        setSubject(`Statement of Account / Ledger — ${customerName} [Pacific Products & Solutions]`);
        setNotes(`Dear Client, please find attached your updated Statement of Account with all credit, debit, and running balance records.`);
        break;
    }
  }, [stage, customerName, outstandingAmount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      setError('Please enter at least one recipient email address.');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const payload: SendLedgerEmailInput = {
        to: recipientEmail.split(',').map((s) => s.trim()).filter(Boolean),
        subject,
        notes,
        stage,
      };

      await financeApi.sendCustomerLedgerEmail(customerId, payload);
      setSuccessMsg('Statement of Account dispatched successfully with audit logging!');

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to send ledger email:', err);
      setError(err.response?.data?.message || err.message || 'Failed to dispatch email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-xl p-5 sm:p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Email Statement of Account</h3>
              <p className="text-xs text-gray-400">Send official ledger with live debit/credit calculations to {customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition"
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

        {successMsg && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-xs text-green-400">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Stage Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Reminder Notice Stage</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { key: 'STATEMENT', label: 'Statement', color: 'border-white/10' },
                { key: 'REMINDER_1', label: '1st Reminder', color: 'border-blue-500/30 text-blue-400' },
                { key: 'REMINDER_2', label: '2nd Follow-up', color: 'border-amber-500/30 text-amber-400' },
                { key: 'REMINDER_3', label: '3rd Notice', color: 'border-orange-500/30 text-orange-400' },
                { key: 'FINAL_NOTICE', label: 'Final Demand', color: 'border-red-500/30 text-red-400' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setStage(item.key as any)}
                  className={`px-2 py-2 rounded-xl text-[11px] font-semibold transition border cursor-pointer ${
                    stage === item.key
                      ? 'bg-[#7FB706]/20 border-[#7FB706] text-white shadow-sm'
                      : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Emails */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Recipient Email(s) <span className="text-gray-500">(comma-separated)</span> *
            </label>
            <input
              type="text"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="accounts@customer.com, purchase@customer.com"
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Email Subject *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          {/* Custom Message / Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Notice Message / Remarks</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] resize-none"
            />
          </div>

          {/* Balance Preview Card */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400 block text-[11px]">Current Outstanding Balance</span>
              <span className={`font-bold ${outstandingAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                ₹ {outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 block text-[11px]">Delivery Mechanism</span>
              <span className="font-semibold text-gray-200">HTML Vector Ledger & Bank Remittance</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-[#7FB706]/20 transition cursor-pointer"
            >
              {sending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Statement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
