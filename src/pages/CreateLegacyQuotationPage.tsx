import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { quotesApi } from '../api/services';

const LOCAL_STORAGE_KEY = 'pacific_create_legacy_quotation_v1';

interface QuotationFormData {
  customerId: string;
  subject: string;
  totalAmount: number;
  validityDate: string;
  paymentTerms: string;
  deliveryTerms: string;
  notes: string;
}

const INITIAL_FORM_DATA: QuotationFormData = {
  customerId: '',
  subject: '',
  totalAmount: 0,
  validityDate: '',
  paymentTerms: '',
  deliveryTerms: '',
  notes: ''
};

export default function CreateLegacyQuotationPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<QuotationFormData>(() => {
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
      await quotesApi.create(formData);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert(`Created successfully!`);
      navigate('/admin/dashboard/quotations');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'totalAmount' ? Number(value) : value }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/quotations" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">New Quotation</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Create a legacy quotation</p>
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
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Customer ID</label>
            <input type="text" name="customerId" value={formData.customerId} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Subject</label>
            <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Total Amount</label>
            <input type="number" name="totalAmount" value={formData.totalAmount} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Validity Date</label>
            <input type="date" name="validityDate" value={formData.validityDate} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Payment Terms</label>
            <input type="text" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Delivery Terms</label>
            <input type="text" name="deliveryTerms" value={formData.deliveryTerms} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full h-24" />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/quotations" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Quotation'}
          </button>
        </div>
      </div>
    </div>
  );
}
