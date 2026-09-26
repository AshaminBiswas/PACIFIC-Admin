import React, { useState } from 'react';
import { Clock, Phone, MessageSquare, MapPin, X, Calendar, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { followupsApi } from '../../api/services';
import type { FollowupTouchpointInput } from '../../types/admin';

interface LogFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onSuccess?: () => void;
}

export const LogFollowupModal: React.FC<LogFollowupModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSuccess,
}) => {
  const [channel, setChannel] = useState<'PHONE' | 'WHATSAPP' | 'VISIT' | 'EMAIL'>('PHONE');
  const [notes, setNotes] = useState('');
  const [customerResponse, setCustomerResponse] = useState('');
  const [promisedPaymentDate, setPromisedPaymentDate] = useState('');
  const [promisedAmount, setPromisedAmount] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please provide call summary or notes.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: FollowupTouchpointInput = {
        channel,
        notes,
        customerResponse: customerResponse.trim() || undefined,
        promisedPaymentDate: promisedPaymentDate || undefined,
        promisedAmount: promisedAmount ? Number(promisedAmount) : undefined,
        nextFollowupDate: nextFollowupDate || undefined,
      };

      await followupsApi.logCustomerTouchpoint(customerId, payload);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to log followup:', err);
      setError(err.response?.data?.message || err.message || 'Failed to record touchpoint.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Log Follow-up Touchpoint</h3>
              <p className="text-xs text-gray-400">Record customer interaction for {customerName}</p>
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Communication Channel</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'PHONE', label: 'Phone Call', icon: Phone },
                { key: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
                { key: 'VISIT', label: 'Site Visit', icon: MapPin },
                { key: 'EMAIL', label: 'Email', icon: MessageSquare },
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

          {/* Discussion Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Discussion / Call Notes *</label>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Spoke with accounts manager. Reviewing pending invoices..."
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] resize-none"
            />
          </div>

          {/* Customer Response */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Customer Reaction / Commitment</label>
            <input
              type="text"
              value={customerResponse}
              onChange={(e) => setCustomerResponse(e.target.value)}
              placeholder="e.g. Committed to clear 50% by next Tuesday"
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          {/* Promise to Pay Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
            <div>
              <label className="block text-[11px] font-semibold text-blue-300 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> Promised Amount (₹)
              </label>
              <input
                type="number"
                value={promisedAmount}
                onChange={(e) => setPromisedAmount(e.target.value)}
                placeholder="Optional"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-blue-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Promised Date
              </label>
              <input
                type="date"
                value={promisedPaymentDate}
                onChange={(e) => setPromisedPaymentDate(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          {/* Next Follow-up Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Next Follow-up Scheduled
            </label>
            <input
              type="date"
              value={nextFollowupDate}
              onChange={(e) => setNextFollowupDate(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-[#7FB706]/20 transition cursor-pointer"
            >
              {saving ? 'Saving...' : 'Record Touchpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
