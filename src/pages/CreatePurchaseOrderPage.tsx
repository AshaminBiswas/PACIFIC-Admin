import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { poApi, vendorsApi } from '../api/services';
import type { BusinessParty } from '../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_purchase_order_v1';

interface PurchaseOrderItem {
  description: string;
  finish: string;
  thickness: string;
  cuttingSize: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
}

interface PurchaseOrderFormData {
  vendorId: string;
  subject: string;
  paymentTerms: string;
  deliveryTerms: string;
  items: PurchaseOrderItem[];
}

const INITIAL_FORM_DATA: PurchaseOrderFormData = {
  vendorId: '',
  subject: 'Purchase Order for Restroom Cubicle Materials',
  paymentTerms: '50% Advance and 50% before dispatch.',
  deliveryTerms: '5 days from date of PO.',
  items: [
    {
      description: '12mm Compact Laminate HPL Board (Suede Finish)',
      finish: 'Suede Finish',
      thickness: '12mm',
      cuttingSize: '1830 x 1220 mm',
      quantity: 10,
      unit: 'NOS',
      rate: 4500,
      gstRate: 18,
    },
    {
      description: 'SS 304 Cubicle Hardware Set (Gravity Hinge, Lock, Legs)',
      finish: 'Brushed Matt',
      thickness: 'Standard',
      cuttingSize: '-',
      quantity: 5,
      unit: 'SET',
      rate: 3200,
      gstRate: 18,
    },
  ],
};

export default function CreatePurchaseOrderPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [vendors, setVendors] = useState<BusinessParty[]>([]);

  const [formData, setFormData] = useState<PurchaseOrderFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM_DATA, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM_DATA;
  });

  useEffect(() => {
    vendorsApi.listVendors({ limit: 50 }).then((res) => {
      if (res.data?.data) setVendors(res.data.data.items || []);
    });
  }, []);

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

  const handleItemChange = (idx: number, field: keyof PurchaseOrderItem, val: any) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, items: updated };
    });
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: 'New Material / Hardware Item',
          finish: 'Matt',
          thickness: '12mm',
          cuttingSize: '-',
          quantity: 1,
          unit: 'NOS',
          rate: 1000,
          gstRate: 18,
        },
      ],
    }));
  };

  const removeItemRow = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.vendorId) {
        alert('Please select a supplier');
        return;
      }
      setIsSubmitting(true);
      await poApi.create(formData);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      navigate('/admin/dashboard/purchase-orders');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to create PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/purchase-orders" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Create Purchase Order</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Generate a new PO for suppliers</p>
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

      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Select Supplier *</label>
            <select
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            >
              <option value="">-- Choose Vendor / Supplier --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.legalName} ({v.vendorProfile?.vendorType || 'Supplier'})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Line Items (Materials & Hardware)</h3>
          {formData.items.map((it, idx) => (
            <div key={idx} className="p-4 bg-[#0a0a1a] border border-white/10 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-[#7FB706]">Item #{idx + 1}</span>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="text-xs text-red-400 p-1 flex items-center gap-1 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Finish (e.g. Suede)"
                    value={it.finish}
                    onChange={(e) => handleItemChange(idx, 'finish', e.target.value)}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Thickness (e.g. 12mm)"
                    value={it.thickness}
                    onChange={(e) => handleItemChange(idx, 'thickness', e.target.value)}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Cutting Size"
                    value={it.cuttingSize}
                    onChange={(e) => handleItemChange(idx, 'cuttingSize', e.target.value)}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={it.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Unit</label>
                  <input
                    type="text"
                    value={it.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    value={it.rate}
                    onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addItemRow}
            className="w-full py-3 border-2 border-dashed border-white/10 hover:border-[#7FB706]/40 text-gray-400 hover:text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px] transition"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Payment Terms (Editable)</label>
            <input
              type="text"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Delivery Terms (Editable)</label>
            <input
              type="text"
              value={formData.deliveryTerms}
              onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/purchase-orders" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Purchase Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
