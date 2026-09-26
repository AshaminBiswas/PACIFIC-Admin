import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Users } from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type { ExportCountry, ExportIncoterm, ExportPort } from '../../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_export_customer_v1';

interface ExportCustomerFormData {
  legalName: string;
  tradeName: string;
  partyType: string;
  primaryEmail: string;
  primaryPhone: string;
  countryId: string;
  foreignTaxId: string;
  vatTrn: string;
  creditLimitUsd: number;
  creditTermsDays: number;
  defaultCurrency: string;
  defaultIncotermId: string;
  defaultDestinationPortId: string;
  riskRating: string;
  complianceStatus: string;
  notes: string;
}

const INITIAL_FORM_DATA: ExportCustomerFormData = {
  legalName: '',
  tradeName: '',
  partyType: 'CUSTOMER',
  primaryEmail: '',
  primaryPhone: '',
  countryId: '',
  foreignTaxId: '',
  vatTrn: '',
  creditLimitUsd: 50000,
  creditTermsDays: 30,
  defaultCurrency: 'USD',
  defaultIncotermId: '',
  defaultDestinationPortId: '',
  riskRating: 'LOW',
  complianceStatus: 'VERIFIED',
  notes: '',
};

export default function CreateExportCustomerPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [countries, setCountries] = useState<ExportCountry[]>([]);
  const [incoterms, setIncoterms] = useState<ExportIncoterm[]>([]);
  const [ports, setPorts] = useState<ExportPort[]>([]);

  const [formData, setFormData] = useState<ExportCustomerFormData>(() => {
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
        const [cRes, iRes, pRes] = await Promise.all([
          exportApi.listCountries(),
          exportApi.listIncoterms(),
          exportApi.listPorts(),
        ]);
        if (cRes.data.success && cRes.data.data) setCountries(cRes.data.data);
        if (iRes.data.success && iRes.data.data) setIncoterms(iRes.data.data);
        if (pRes.data.success && pRes.data.data) setPorts(pRes.data.data);
      } catch (err) {
        console.error('Failed to load lookups', err);
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
      // Register directly in International CRM (Foreign Buyer)
      await exportApi.createCustomer({
        legalName: formData.legalName.trim(),
        tradeName: formData.tradeName.trim() || formData.legalName.trim(),
        primaryEmail: formData.primaryEmail.trim() || undefined,
        primaryPhone: formData.primaryPhone.trim() || undefined,
        status: 'ACTIVE',
        notes: formData.notes.trim() || undefined,
        countryId: formData.countryId || null,
        foreignTaxId: formData.foreignTaxId || null,
        vatTrn: formData.vatTrn || null,
        creditLimitUsd: Number(formData.creditLimitUsd) || 0,
        creditTermsDays: Number(formData.creditTermsDays) || 30,
        defaultCurrency: formData.defaultCurrency || 'USD',
        defaultIncotermId: formData.defaultIncotermId || null,
        defaultDestinationPortId: formData.defaultDestinationPortId || null,
        riskRating: formData.riskRating || 'LOW',
        complianceStatus: formData.complianceStatus || 'VERIFIED',
      });

      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert(`Registered foreign buyer "${formData.legalName}" successfully!`);
      navigate('/admin/dashboard/export/customers');
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to register foreign customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/export/customers" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-[#7FB706]" />
              Register Foreign Buyer
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Setup multi-currency export profiles and credit limits</p>
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
        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Corporate Identity</h3>
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Legal Company Name *</label>
              <input
                type="text"
                required
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Trade Name (DBA)</label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Primary Contact Email</label>
              <input
                type="email"
                required
                value={formData.primaryEmail}
                onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Primary Phone</label>
              <input
                type="text"
                value={formData.primaryPhone}
                onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">HQ Country / Jurisdiction</label>
              <select
                required
                value={formData.countryId}
                onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">Select Country</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.countryCode})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4 mt-6">Compliance & Tax</h3>
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Foreign Tax ID / EIN</label>
              <input
                type="text"
                value={formData.foreignTaxId}
                onChange={(e) => setFormData({ ...formData, foreignTaxId: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">VAT TRN (UAE/GCC)</label>
              <input
                type="text"
                value={formData.vatTrn}
                onChange={(e) => setFormData({ ...formData, vatTrn: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>
        </div>

        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4 mt-6">Credit & Trade Terms</h3>
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Credit Limit (USD)</label>
              <input
                type="number"
                value={formData.creditLimitUsd}
                onChange={(e) => setFormData({ ...formData, creditLimitUsd: Number(e.target.value) })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Credit Terms (Days)</label>
              <input
                type="number"
                value={formData.creditTermsDays}
                onChange={(e) => setFormData({ ...formData, creditTermsDays: Number(e.target.value) })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Default Currency</label>
              <select
                value={formData.defaultCurrency}
                onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="AED">AED - UAE Dirham</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Default Incoterm</label>
              <select
                value={formData.defaultIncotermId}
                onChange={(e) => setFormData({ ...formData, defaultIncotermId: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">Select Default Incoterm</option>
                {incoterms.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.code} - {inc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Default Destination Port</label>
              <select
                value={formData.defaultDestinationPortId}
                onChange={(e) => setFormData({ ...formData, defaultDestinationPortId: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">Select Default Port</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.portCode})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/export/customers" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Register Buyer'}
          </button>
        </div>
      </form>
    </div>
  );
}
