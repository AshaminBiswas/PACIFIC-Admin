import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Coins, RefreshCw, Sparkles, Sliders } from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import { currencyApi, POPULAR_EXPORT_CURRENCIES, getCurrencyMeta } from '../../api/currencyApi';
import { RealtimeCurrencyConverter } from '../../components/export/RealtimeCurrencyConverter';
import type { ExportOrder, ConvertedCurrencyResult } from '../../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_export_realization_v1';

interface RealizationFormData {
  exportOrderId: string;
  realizedAmount: number;
  currency: string;
  realizedAmountInr: number;
  realizationDate: string;
  adBankCode: string;
  adBankName: string;
  bankRefNumber: string;
  status: string;
  notes: string;
}

const INITIAL_FORM_DATA: RealizationFormData = {
  exportOrderId: '',
  realizedAmount: 0,
  currency: 'USD',
  realizedAmountInr: 0,
  realizationDate: new Date().toISOString().split('T')[0],
  adBankCode: 'HDFC0000060',
  adBankName: 'HDFC Bank Ltd - Forex & Trade Branch',
  bankRefNumber: '',
  status: 'COMPLETED',
  notes: 'Realized via SWIFT wire transfer under EDPMS norms',
};

export default function CreateExportRealizationPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [showLiveConverter, setShowLiveConverter] = useState(false);

  const [formData, setFormData] = useState<RealizationFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM_DATA, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM_DATA;
  });

  const fetchLiveRate = async (curr = formData.currency, force = false) => {
    try {
      setLoadingRate(true);
      const rate = await currencyApi.getPairRate(curr, 'INR', force);
      setLiveRate(rate);
      return rate;
    } catch (err) {
      console.warn('Failed to fetch live forex rate:', err);
      return null;
    } finally {
      setLoadingRate(false);
    }
  };

  useEffect(() => {
    fetchLiveRate(formData.currency);
  }, [formData.currency]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await exportApi.listOrders({ limit: 100 });
        if (res.data.success && res.data.data) setOrders(res.data.data.items);
      } catch (err) {
        console.error('Failed to load orders', err);
      }
    };
    loadOrders();
  }, []);

  // When order changes, auto-fill currency and amount
  const handleOrderChange = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      const curr = order.currency || 'USD';
      const amt = Number(order.totalOrderValue) || 0;
      const rate = await fetchLiveRate(curr);
      const inrAmt = rate ? Number((amt * rate).toFixed(2)) : amt * 85.0;
      setFormData({
        ...formData,
        exportOrderId: orderId,
        currency: curr,
        realizedAmount: amt,
        realizedAmountInr: inrAmt,
      });
    } else {
      setFormData({ ...formData, exportOrderId: orderId });
    }
  };

  const handleApplyLiveRate = (customRate?: number) => {
    const rateToUse = customRate || liveRate;
    if (rateToUse && formData.realizedAmount) {
      setFormData({
        ...formData,
        realizedAmountInr: Number((formData.realizedAmount * rateToUse).toFixed(2)),
      });
    }
  };

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
  }, [formData]);

  const handleReset = () => {
    if (window.confirm('Reset this draft? All inputs will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.exportOrderId) {
      alert('Please select an export order');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await exportApi.createRealization(formData);
      if (res.data.success) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        alert('Created successfully!');
        navigate('/admin/dashboard/export/realization');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record realization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/export/realization" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Coins className="w-6 h-6 text-[#7FB706]" />
              Record Forex Bank Realization
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Record inward remittance against an export order</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLiveConverter(!showLiveConverter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition border ${
              showLiveConverter
                ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#7FB706]'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{showLiveConverter ? 'Hide Currency Desk' : 'Live Currency Desk'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved in Local Storage</span>
            {lastSavedTime && <span className="text-[11px] opacity-80">({lastSavedTime})</span>}
          </div>
          <button type="button" onClick={handleReset} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Draft</span>
          </button>
        </div>
      </div>

      {/* Live Currency Desk / Realtime Converter */}
      {showLiveConverter && (
        <RealtimeCurrencyConverter
          initialFrom={formData.currency}
          initialTo="INR"
          initialAmount={formData.realizedAmount || 1000}
          showApplyButton={true}
          onRateApplied={(res: ConvertedCurrencyResult) => {
            setFormData({
              ...formData,
              currency: res.from,
              realizedAmount: res.amount,
              realizedAmountInr: res.result,
            });
            setLiveRate(res.rate);
            setShowLiveConverter(false);
          }}
        />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Realization Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Export Order *</label>
            <select
              required
              value={formData.exportOrderId}
              onChange={(e) => handleOrderChange(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            >
              <option value="">Select Export Order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.exportOrderNumber} - {o.party?.legalName} ({o.currency} {o.totalOrderValue})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300">Realized Forex Amount *</label>
                {liveRate && (
                  <span className="text-[11px] font-mono text-gray-400">
                    1 {formData.currency} = ₹{liveRate.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] min-w-[110px]"
                >
                  {POPULAR_EXPORT_CURRENCIES.map((code) => {
                    const meta = getCurrencyMeta(code);
                    return (
                      <option key={code} value={code}>
                        {meta.flag} {code}
                      </option>
                    );
                  })}
                </select>
                <input
                  required
                  type="number"
                  step="any"
                  value={formData.realizedAmount}
                  onChange={(e) => {
                    const rz = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      realizedAmount: rz,
                      realizedAmountInr: liveRate ? Number((rz * liveRate).toFixed(2)) : rz * 85.0,
                    });
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300">Settled INR Amount *</label>
                {liveRate && (
                  <button
                    type="button"
                    onClick={() => handleApplyLiveRate()}
                    className="text-[11px] font-mono text-[#7FB706] hover:underline flex items-center gap-1"
                    title="Click to recalculate with live rate"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Apply Live Rate (₹{liveRate.toFixed(2)})</span>
                  </button>
                )}
              </div>
              <input
                required
                type="number"
                step="0.01"
                value={formData.realizedAmountInr}
                onChange={(e) => setFormData({ ...formData, realizedAmountInr: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Authorised Dealer (AD) Bank</label>
              <input
                type="text"
                value={formData.adBankName}
                onChange={(e) => setFormData({ ...formData, adBankName: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Bank FIRC / Ref Number</label>
              <input
                type="text"
                placeholder="e.g. FIRC/2026/0912"
                value={formData.bankRefNumber}
                onChange={(e) => setFormData({ ...formData, bankRefNumber: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3 mt-6">
          <Link to="/admin/dashboard/export/realization" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Confirm Realization'}
          </button>
        </div>
      </form>
    </div>
  );
}
