import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const LOCAL_STORAGE_KEY = 'pacific_create_contact_query_v1';

export default function CreateContactQueryPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const INITIAL_FORM_DATA = { name: "", email: "", phone: "", company: "", requirement: "", message: "", status: "new" };
  const [formData, setFormData] = useState<typeof INITIAL_FORM_DATA>(() => { try { const cached = localStorage.getItem(LOCAL_STORAGE_KEY); if (cached) return { ...INITIAL_FORM_DATA, ...JSON.parse(cached) }; } catch {} return INITIAL_FORM_DATA; });

  useEffect(() => { try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData)); setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })); } catch {} }, [formData]);

  const handleReset = () => { if (window.confirm('Reset this draft?')) { localStorage.removeItem(LOCAL_STORAGE_KEY); setFormData(INITIAL_FORM_DATA); } };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.from("contact_queries").insert(formData);
      if (error) throw error;
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert('Created successfully!');
      navigate('/admin/dashboard/contact-queries');
    } catch (err: any) { alert(err.message || 'Failed'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/contact-queries" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-xl sm:text-2xl font-bold text-white">Create Contact Query</h1></div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleReset} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition"><RotateCcw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Reset Draft</span></button>
        </div>
      </div>
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <div><label className="block text-xs font-semibold text-gray-300 mb-1.5">Name</label><input value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white w-full" /></div>
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/contact-queries" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50"><CheckCircle2 className="w-5 h-5" />{isSubmitting ? 'Saving...' : 'Save Query'}</button>
        </div>
      </div>
    </div>
  );
}