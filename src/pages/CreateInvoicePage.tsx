import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { invoicesApi } from '../api/services';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';

const LOCAL_STORAGE_KEY = 'pacific_create_invoice_v1';

interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
  gstRate: number;
}

interface InvoiceFormData {
  customerId: string;
  orderId: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  items: InvoiceItem[];
  notes: string;
}

const INITIAL_FORM_DATA: InvoiceFormData = {
  customerId: '',
  orderId: '',
  invoiceDate: '',
  dueDate: '',
  paymentTerms: '',
  items: [{ description: '', qty: 1, rate: 0, gstRate: 0 }],
  notes: ''
};

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<InvoiceFormData>(() => {
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

  const handleReset = () => {
    if (window.confirm('Reset this draft? All inputs will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await invoicesApi.create(formData);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert(`Created successfully!`);
      navigate('/admin/dashboard/invoices');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', qty: 1, rate: 0, gstRate: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/invoices" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">New Invoice</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Create a new invoice</p>
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

      {/* ── Document Flow Timeline (Stage 04) ───────────────────── */}
      <DocumentFlowTimeline currentStage={4} />

      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Customer ID</label>
            <input type="text" name="customerId" value={formData.customerId} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Order ID</label>
            <input type="text" name="orderId" value={formData.orderId} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Invoice Date</label>
            <input type="date" name="invoiceDate" value={formData.invoiceDate} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Due Date</label>
            <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Payment Terms</label>
            <input type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Invoice Items</h3>
          {formData.items.map((item, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Description</label>
                <input type="text" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
              </div>
              <div className="w-full sm:w-24">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Qty</label>
                <input type="number" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Rate</label>
                <input type="number" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
              </div>
              <div className="w-full sm:w-24">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">GST Rate (%)</label>
                <input type="number" value={item.gstRate} onChange={(e) => handleItemChange(index, 'gstRate', Number(e.target.value))} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
              </div>
              <button type="button" onClick={() => removeItem(index)} className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addItem} className="text-sm text-[#7FB706] hover:text-[#6fa005] font-semibold flex items-center gap-1 mt-2">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notes</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full h-24" />
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/invoices" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
