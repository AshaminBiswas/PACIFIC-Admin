import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { projectsApi } from '../api/services';
import type { ProjectStatus } from '../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_project_v1';

interface ProjectFormData {
  customerId: string;
  name: string;
  projectType: string;
  siteAddress: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  description: string;
  notes: string;
}

const INITIAL_FORM_DATA: ProjectFormData = {
  customerId: '',
  name: '',
  projectType: '',
  siteAddress: '',
  startDate: '',
  endDate: '',
  status: 'INQUIRY',
  description: '',
  notes: ''
};

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<ProjectFormData>(() => {
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
      await projectsApi.create(formData);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert(`Created successfully!`);
      navigate('/admin/dashboard/projects');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/projects" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">New Project</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Create a new project</p>
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
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Project Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Project Type</label>
            <input type="text" name="projectType" value={formData.projectType} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Site Address</label>
            <input type="text" name="siteAddress" value={formData.siteAddress} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Start Date</label>
            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">End Date</label>
            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full">
              <option value="">Select Status...</option>
              <option value="INQUIRY">INQUIRY</option>
              <option value="DESIGN">DESIGN</option>
              <option value="PROPOSAL">PROPOSAL</option>
              <option value="APPROVED">APPROVED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="INSTALLATION">INSTALLATION</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ON_HOLD">ON_HOLD</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full h-24" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full h-24" />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/projects" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
