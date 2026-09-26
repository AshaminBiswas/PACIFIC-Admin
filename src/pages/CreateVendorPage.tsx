import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Truck, Building } from 'lucide-react';
import { vendorsApi } from '../api/services';

const LOCAL_STORAGE_KEY = 'pacific_create_vendor_v1';

interface VendorFormData {
  legalName: string;
  tradeName: string;
  vendorType: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  paymentTermsDays: string;
  contactName: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
}

const INITIAL_FORM_DATA: VendorFormData = {
  legalName: '',
  tradeName: '',
  vendorType: 'HPL_BOARDS',
  gstin: '',
  pan: '',
  email: '',
  phone: '',
  paymentTermsDays: '30',
  contactName: '',
  contactPhone: '',
  address: '',
  city: 'Delhi',
  state: 'Delhi',
};

export default function CreateVendorPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<VendorFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM_DATA, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM_DATA;
  });

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

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await vendorsApi.createVendor({
        legalName: formData.legalName,
        tradeName: formData.tradeName || formData.legalName,
        vendorType: formData.vendorType,
        gstin: formData.gstin,
        pan: formData.pan,
        email: formData.email,
        phone: formData.phone,
        paymentTermsDays: Number(formData.paymentTermsDays),
        contacts: formData.contactName
          ? [{ name: formData.contactName, phone: formData.contactPhone, isPrimary: true }]
          : [],
        addresses: formData.address
          ? [{ addressType: 'REGISTERED', addressLine1: formData.address, city: formData.city, state: formData.state }]
          : [],
      });
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert('Supplier created successfully!');
      navigate('/admin/dashboard/vendors');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to create vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/vendors" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-[#7FB706]" />
              New Supplier / Vendor
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Register a new procurement supplier</p>
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

      {/* Form */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Supplier Legal Name *</label>
            <input
              required
              type="text"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              placeholder="e.g. Pacific Laminates & Boards Ltd."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Trade Name (Optional)</label>
            <input
              type="text"
              value={formData.tradeName}
              onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              placeholder="e.g. Pacific"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Supply Category *</label>
            <select
              value={formData.vendorType}
              onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            >
              <option value="HPL_BOARDS">HPL Boards</option>
              <option value="HDF_BOARDS">HDF Boards</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">GSTIN (15 Characters)</label>
            <input
              type="text"
              maxLength={15}
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-[#7FB706]"
              placeholder="e.g. 07AAAAG1234A1Z5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">PAN Number</label>
            <input
              type="text"
              maxLength={10}
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-[#7FB706]"
              placeholder="e.g. AAAAG1234A"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              placeholder="sales@supplier.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Mobile / Phone</label>
            <input
              type="tel"
              inputMode="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              placeholder="9818000000"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Payment Terms (Days)</label>
            <input
              type="number"
              value={formData.paymentTermsDays}
              onChange={(e) => setFormData({ ...formData, paymentTermsDays: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Primary Contact Name</label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Registered Address Line 1</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/vendors" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}
