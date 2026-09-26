import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Package } from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type { BusinessParty, ExportCountry, ExportIncoterm } from '../../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_export_order_v1';

interface ExportOrderFormData {
  partyId: string;
  countryId: string;
  incotermId: string;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  freightCost: number;
  insuranceCost: number;
  fobValue: number;
  commercialInvoiceNumber: string;
  buyerPoNumber: string;
  notes: string;
}

const INITIAL_FORM_DATA: ExportOrderFormData = {
  partyId: '',
  countryId: '',
  incotermId: '',
  currency: 'USD',
  exchangeRate: 85.0,
  subtotal: 0,
  freightCost: 0,
  insuranceCost: 0,
  fobValue: 0,
  commercialInvoiceNumber: '',
  buyerPoNumber: '',
  notes: '',
};

export default function CreateExportOrderPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [buyers, setBuyers] = useState<BusinessParty[]>([]);
  const [countries, setCountries] = useState<ExportCountry[]>([]);
  const [incoterms, setIncoterms] = useState<ExportIncoterm[]>([]);

  const [formData, setFormData] = useState<ExportOrderFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM_DATA, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM_DATA;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
  }, [formData]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [cRes, cntRes, incRes] = await Promise.all([
          exportApi.listCustomers({ limit: 100 }),
          exportApi.listCountries(),
          exportApi.listIncoterms(),
        ]);
        if (cRes.data.success && cRes.data.data) setBuyers(cRes.data.data.items);
        if (cntRes.data.success && cntRes.data.data) setCountries(cntRes.data.data);
        if (incRes.data.success && incRes.data.data) setIncoterms(incRes.data.data);
      } catch (err) {
        console.error('Failed lookups', err);
      }
    };
    loadLookups();
  }, []);

  const handleReset = () => {
    if (window.confirm('Reset this draft? All inputs will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const total = Number(formData.subtotal) + Number(formData.freightCost) + Number(formData.insuranceCost);
      const payload = {
        ...formData,
        totalOrderValue: total,
        fobValue: Number(formData.fobValue) || Number(formData.subtotal),
      };
      await exportApi.createOrder(payload);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert(`Created successfully!`);
      navigate('/admin/dashboard/export/orders');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/export/orders" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-[#7FB706]" />
              Create New Export Order
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Multi-Currency Trade Orders, Milestones & Logistics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <form onSubmit={handleSubmit} className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Trade Partner Details</h3>
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Select Foreign Buyer</label>
            <select
              required
              value={formData.partyId}
              onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            >
              <option value="">-- Choose Overseas Customer --</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.legalName} ({b.tradeName || b.email || 'Global'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Destination Country</label>
              <select
                required
                value={formData.countryId}
                onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">-- Select Country --</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.countryCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Incoterm</label>
              <select
                required
                value={formData.incotermId}
                onChange={(e) => setFormData({ ...formData, incotermId: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">-- Select Incoterm --</option>
                {incoterms.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.code} — {inc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4 mt-6">Financials & Logistics</h3>
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">FOB Subtotal ($)</label>
              <input
                type="number"
                required
                value={formData.subtotal || ''}
                onChange={(e) => setFormData({ ...formData, subtotal: Number(e.target.value) })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Ocean Freight ($)</label>
              <input
                type="number"
                value={formData.freightCost || ''}
                onChange={(e) => setFormData({ ...formData, freightCost: Number(e.target.value) })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Insurance ($)</label>
              <input
                type="number"
                value={formData.insuranceCost || ''}
                onChange={(e) => setFormData({ ...formData, insuranceCost: Number(e.target.value) })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Buyer PO Ref</label>
              <input
                type="text"
                value={formData.buyerPoNumber}
                onChange={(e) => setFormData({ ...formData, buyerPoNumber: e.target.value })}
                placeholder="PO-2026-DXB-98"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Commercial Inv #</label>
              <input
                type="text"
                value={formData.commercialInvoiceNumber}
                onChange={(e) => setFormData({ ...formData, commercialInvoiceNumber: e.target.value })}
                placeholder="EXP/INV/26-27/001"
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/export/orders" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Export Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
