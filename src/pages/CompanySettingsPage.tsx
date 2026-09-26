import React, { useState, useEffect, useRef } from 'react';
import { companiesApi, auditApi } from '../api/services';
import type {
  CompanyProfile,
  CompanyAddress,
  CompanyBankAccount,
  CompanySignatory,
  CompanyTerm,
  AuditLog,
} from '../types/admin';
import {
  Building2,
  Landmark,
  FileSignature,
  FileText,
  ShieldAlert,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Hash,
  Globe,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  History,
  Check,
  ChevronRight,
  Sparkles,
  Upload,
  Trash2,
  X,
  Image as ImageIcon,
} from 'lucide-react';

export default function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState<'profiles' | 'banking' | 'signatories' | 'sequences' | 'audit'>('profiles');
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active Company Form State
  const [formData, setFormData] = useState<Partial<CompanyProfile>>({
    companyName: '',
    legalName: '',
    entityCode: '',
    country: 'IN',
    currency: 'INR',
    taxRegime: 'GST',
    gstin: '',
    pan: '',
    vatNumber: '',
    state: 'Maharashtra',
    stateCode: '27',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    signatureUrl: '',
  });

  // Sub-entity Modals & Forms
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    swiftCode: '',
    branch: '',
    iban: '',
    isDefault: true,
  });

  const [showSignatoryModal, setShowSignatoryModal] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [signatoryForm, setSignatoryForm] = useState({
    name: '',
    designation: '',
    signatureUrl: '',
    isDefault: true,
  });

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState({
    type: 'BILLING',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Maharashtra',
    stateCode: '27',
    postalCode: '',
    phone: '',
    gstin: '',
    pan: '',
    isDefault: true,
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Load Companies
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const res = await companiesApi.list();
      const list = res.data?.data || res.data || [];
      setCompanies(Array.isArray(list) ? list : []);
      if (Array.isArray(list) && list.length > 0) {
        const activeComp = list[0];
        setSelectedCompanyId(activeComp.id);
        populateForm(activeComp);
      }
    } catch (err: any) {
      showToast('error', 'Failed to load company profiles.');
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (comp: CompanyProfile) => {
    setFormData({
      companyName: comp.companyName || '',
      legalName: comp.legalName || '',
      entityCode: comp.entityCode || '',
      country: comp.country || 'IN',
      currency: comp.currency || 'INR',
      taxRegime: comp.taxRegime || 'GST',
      gstin: comp.gstin || '',
      pan: comp.pan || '',
      vatNumber: comp.vatNumber || '',
      state: comp.state || '',
      stateCode: comp.stateCode || '',
      phone: comp.phone || '',
      email: comp.email || '',
      website: comp.website || '',
      logoUrl: comp.logoUrl || '',
      signatureUrl: comp.signatureUrl || '',
    });
  };

  const handleSelectCompany = (comp: CompanyProfile) => {
    setSelectedCompanyId(comp.id);
    populateForm(comp);
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await auditApi.list({ limit: 50 });
      const logs = res.data?.data || res.data || [];
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      // Create new
      try {
        setSaving(true);
        const res = await companiesApi.create(formData);
        showToast('success', 'Company profile created successfully.');
        await loadCompanies();
      } catch (err: any) {
        showToast('error', err.response?.data?.message || 'Failed to create profile.');
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      setSaving(true);
      await companiesApi.update(selectedCompanyId, formData);
      showToast('success', 'Company profile updated successfully.');
      await loadCompanies();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update company.');
    } finally {
      setSaving(false);
    }
  };

  // Add Bank Account
  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;
    try {
      await companiesApi.addBankAccount(selectedCompanyId, bankForm);
      showToast('success', 'Bank account added successfully.');
      setShowBankModal(false);
      setBankForm({
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        swiftCode: '',
        branch: '',
        iban: '',
        isDefault: false,
      });
      await loadCompanies();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to add bank account.');
    }
  };

  // Signature File Upload Handler
  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please upload an image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Signature file must be smaller than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSignatoryForm((prev) => ({ ...prev, signatureUrl: result }));
      showToast('success', 'Signature image uploaded successfully.');
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be re-uploaded if needed
    e.target.value = '';
  };

  // Add Signatory
  const handleAddSignatory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;
    try {
      await companiesApi.addSignatory(selectedCompanyId, signatoryForm);
      showToast('success', 'Authorized signatory added successfully.');
      setShowSignatoryModal(false);
      setShowUrlInput(false);
      setSignatoryForm({ name: '', designation: '', signatureUrl: '', isDefault: false });
      await loadCompanies();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to add signatory.');
    }
  };

  // Add Address
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;
    try {
      await companiesApi.addAddress(selectedCompanyId, addressForm);
      showToast('success', 'Address registered successfully.');
      setShowAddressModal(false);
      setAddressForm({
        type: 'BILLING',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: 'Maharashtra',
        stateCode: '27',
        postalCode: '',
        phone: '',
        gstin: '',
        pan: '',
        isDefault: false,
      });
      await loadCompanies();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to add address.');
    }
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold ${
            toast.type === 'success' ? 'bg-[#7FB706] text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7FB706]/10 text-[#7FB706] text-xs font-semibold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Enterprise Multi-Entity Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Company & Entity Settings
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage legal entities (India GST & UAE VAT), banking coordinates, document numbering sequences, and audit trails.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center bg-white/5 p-1 rounded-xl border border-white/10">
          {[
            { id: 'profiles', label: 'Company Profile', icon: Building2 },
            { id: 'banking', label: 'Bank Accounts', icon: Landmark },
            { id: 'signatories', label: 'Signatories', icon: FileSignature },
            { id: 'sequences', label: 'Numbering Rules', icon: Hash },
            { id: 'audit', label: 'System Audit', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
                  activeTab === tab.id
                    ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Entity Selector Pill Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
          Active Entity:
        </span>
        {companies.map((c) => (
          <button
            key={c.id}
            onClick={() => handleSelectCompany(c)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all min-h-[44px] whitespace-nowrap ${
              selectedCompanyId === c.id
                ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#7FB706]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <span>{c.country === 'AE' ? '🇦🇪' : '🇮🇳'}</span>
            <span>{c.companyName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">
              {c.currency} · {c.taxRegime}
            </span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: COMPANY PROFILES ────────────────────────────────────────── */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Entity Profile Form */}
          <form onSubmit={handleSaveCompany} className="lg:col-span-8 space-y-6">
            <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2 pb-4 border-b border-white/10">
                <Building2 className="w-4 h-4 text-[#7FB706]" />
                Entity Identification & Tax Regime
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Company Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                    placeholder="Pacific Restroom Cubicle"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Legal Registered Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                    placeholder="Pacific Products & Solutions Pvt Ltd"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Entity Code (e.g. PRC, PPS, PRC-UAE) *</label>
                  <input
                    type="text"
                    required
                    value={formData.entityCode}
                    onChange={(e) => setFormData({ ...formData, entityCode: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white uppercase font-mono focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                    placeholder="PRC"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Country Jurisdiction *</label>
                  <select
                    value={formData.country}
                    onChange={(e) => {
                      const c = e.target.value;
                      setFormData({
                        ...formData,
                        country: c,
                        currency: c === 'AE' ? 'AED' : 'INR',
                        taxRegime: c === 'AE' ? 'VAT' : 'GST',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[44px]"
                  >
                    <option value="IN">India (IN) — GST Regime</option>
                    <option value="AE">United Arab Emirates (AE) — VAT Regime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Base Currency *</label>
                  <input
                    type="text"
                    required
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono min-h-[44px]"
                    placeholder="INR"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Tax Regime *</label>
                  <select
                    value={formData.taxRegime}
                    onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                  >
                    <option value="GST">GST (Goods and Services Tax - India)</option>
                    <option value="VAT">VAT (Value Added Tax - UAE)</option>
                  </select>
                </div>

                {formData.taxRegime === 'GST' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">GSTIN Number (15 Digits)</label>
                      <input
                        type="text"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono min-h-[44px]"
                        placeholder="27ABCDE1234F1Z5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={formData.pan}
                        onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono min-h-[44px]"
                        placeholder="ABCDE1234F"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">VAT / TRN Registration Number</label>
                    <input
                      type="text"
                      value={formData.vatNumber}
                      onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono min-h-[44px]"
                      placeholder="100XXXXXXXXX00003"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Official Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Official Accounts Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                    placeholder="accounts@pacificcubicles.com"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#7FB706]/20 min-h-[44px]"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Entity Profile
                </button>
              </div>
            </div>
          </form>

          {/* Registered Locations Sidecard */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#7FB706]" />
                  Registered Addresses
                </h3>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#7FB706] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Add Address"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 mt-4">
                {selectedCompany?.addresses && selectedCompany.addresses.length > 0 ? (
                  selectedCompany.addresses.map((addr) => {
                    const isBilling = addr.type === 'BILLING' || addr.type === 'BILLING_ADDRESS';
                    const isDelivery = addr.type === 'DELIVERY' || addr.type === 'DELIVERY_ADDRESS';
                    return (
                      <div key={addr.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                              isBilling
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : isDelivery
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}
                          >
                            {isBilling
                              ? 'Billing Address'
                              : isDelivery
                              ? 'Delivery Address'
                              : addr.type.replace(/_/g, ' ')}
                          </span>
                          {addr.isDefault && (
                            <span className="px-1.5 py-0.5 rounded bg-[#7FB706]/20 text-[#7FB706] text-[10px] font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 font-medium">{addr.addressLine1}</p>
                        {addr.addressLine2 && <p className="text-gray-400">{addr.addressLine2}</p>}
                        <p className="text-gray-400">
                          {addr.city}, {addr.state} - {addr.postalCode}
                        </p>
                        {addr.gstin && (
                          <p className="text-[11px] font-mono text-[#7FB706]">
                            <span className="text-gray-400 font-sans font-semibold">GSTIN: </span>
                            {addr.gstin}
                          </p>
                        )}
                        {addr.pan && (
                          <p className="text-[11px] font-mono text-cyan-300">
                            <span className="text-gray-400 font-sans font-semibold">PAN: </span>
                            {addr.pan}
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500 py-4 text-center">No registered addresses added yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: BANK ACCOUNTS ────────────────────────────────────────────── */}
      {activeTab === 'banking' && (
        <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#7FB706]" />
                Entity Bank Accounts & Remittance Info
              </h3>
              <p className="text-xs text-gray-400">
                Accounts printed on Proforma Invoices for customer wire transfers, RTGS/NEFT, and IBAN remittances.
              </p>
            </div>
            <button
              onClick={() => setShowBankModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold transition-all min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Add Bank Account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedCompany?.bankAccounts && selectedCompany.bankAccounts.length > 0 ? (
              selectedCompany.bankAccounts.map((bank) => (
                <div
                  key={bank.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    bank.isDefault
                      ? 'bg-gradient-to-br from-[#7FB706]/10 to-transparent border-[#7FB706]/40'
                      : 'bg-white/[0.02] border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-[#7FB706]">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{bank.bankName}</h4>
                        <p className="text-[11px] text-gray-400">{bank.branch || 'Main Branch'}</p>
                      </div>
                    </div>
                    {bank.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#7FB706] text-[10px] font-bold uppercase tracking-wider">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account No:</span>
                      <span className="font-bold text-white">{bank.accountNumber}</span>
                    </div>
                    {bank.ifscCode && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">IFSC Code:</span>
                        <span className="text-[#7FB706]">{bank.ifscCode}</span>
                      </div>
                    )}
                    {bank.iban && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">IBAN:</span>
                        <span className="text-[#7FB706] truncate max-w-[160px]">{bank.iban}</span>
                      </div>
                    )}
                    {bank.swiftCode && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">SWIFT / BIC:</span>
                        <span>{bank.swiftCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                <Landmark className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p className="text-xs">No bank accounts added for this entity yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: AUTHORIZED SIGNATORIES ──────────────────────────────────── */}
      {activeTab === 'signatories' && (
        <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-[#7FB706]" />
                Authorized Signatories & Digital Signatures
              </h3>
              <p className="text-xs text-gray-400">
                Official signature stamps and authority titles printed on purchase orders and proforma invoices.
              </p>
            </div>
            <button
              onClick={() => setShowSignatoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-semibold transition-all min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Add Signatory
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedCompany?.signatories && selectedCompany.signatories.length > 0 ? (
              selectedCompany.signatories.map((sig) => (
                <div key={sig.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{sig.name}</h4>
                      <p className="text-xs text-[#7FB706]">{sig.designation}</p>
                    </div>
                    {sig.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#7FB706] text-[10px] font-bold uppercase">
                        Primary
                      </span>
                    )}
                  </div>

                  {sig.signatureUrl ? (
                    <div className="h-20 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center p-2">
                      <img src={sig.signatureUrl} alt={sig.name} className="h-full object-contain filter invert" />
                    </div>
                  ) : (
                    <div className="h-20 bg-white/5 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-gray-500 text-xs">
                      No signature image uploaded
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                <FileSignature className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p className="text-xs">No authorized signatories configured yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: NUMBERING RULES ─────────────────────────────────────────── */}
      {activeTab === 'sequences' && (
        <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-[#7FB706]" />
              Document Numbering Sequences (PostgreSQL Atomic Engine)
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Sequence formats are automatically concurrency-locked, continuous, non-reusable, and reset per Financial Year (e.g. April 1 - March 31).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-blue-500/15 text-blue-400 font-bold text-xs uppercase">
                  Purchase Order (PO)
                </span>
                <span className="text-xs text-gray-400">Procurement Module</span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Current Standard Format:</p>
                <p className="text-lg font-mono font-bold text-white mt-1">PRC/FY2026-27/000001</p>
              </div>
              <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-white/5">
                <p>• Prefix: <span className="font-mono text-gray-300">PRC/FY</span></p>
                <p>• Zero Padding: <span className="font-mono text-gray-300">6 Digits</span></p>
                <p>• Concurrency Control: <span className="text-[#7FB706]">SELECT FOR UPDATE Row Lock</span></p>
              </div>
            </div>

            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-[#7FB706]/15 text-[#7FB706] font-bold text-xs uppercase">
                  Proforma Invoice (PI)
                </span>
                <span className="text-xs text-gray-400">Sales & CRM Module</span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Current Standard Format:</p>
                <p className="text-lg font-mono font-bold text-[#7FB706] mt-1">PPS/PI/2026-27/0815</p>
              </div>
              <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-white/5">
                <p>• Prefix: <span className="font-mono text-gray-300">PPS/PI/</span></p>
                <p>• Zero Padding: <span className="font-mono text-gray-300">4 Digits</span></p>
                <p>• Concurrency Control: <span className="text-[#7FB706]">SELECT FOR UPDATE Row Lock</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: AUDIT LOGS ──────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#7FB706]" />
                System Mutation Audit Trail
              </h3>
              <p className="text-xs text-gray-400">
                Immutable record of administrative actions, data edits, approvals, and financial status changes.
              </p>
            </div>
            <button
              onClick={loadAuditLogs}
              disabled={auditLoading}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {auditLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#7FB706]/20 border-t-[#7FB706] rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">Loading audit trail...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              <History className="w-8 h-8 mx-auto opacity-30 mb-2" />
              <p className="text-xs">No audit logs recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="pb-3 font-semibold">Timestamp</th>
                    <th className="pb-3 font-semibold">Action</th>
                    <th className="pb-3 font-semibold">Module</th>
                    <th className="pb-3 font-semibold">Entity</th>
                    <th className="pb-3 font-semibold">Entity ID</th>
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 text-gray-300 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 font-bold text-white">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            log.action === 'CREATE'
                              ? 'bg-[#7FB706]/20 text-[#7FB706]'
                              : log.action === 'UPDATE'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-gray-300 uppercase tracking-wider text-[11px]">{log.module}</td>
                      <td className="py-3 text-gray-400">{log.entityType}</td>
                      <td className="py-3 font-mono text-gray-400 truncate max-w-[120px]">{log.entityId}</td>
                      <td className="py-3 text-gray-300">
                        {log.user ? `${log.user.firstName} (${log.user.email})` : 'System Admin'}
                      </td>
                      <td className="py-3 font-mono text-gray-400">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: ADD BANK ACCOUNT ───────────────────────────────────────── */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add Entity Bank Account</h3>
            <form onSubmit={handleAddBank} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank, Emirates NBD"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Account Number *</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="50200012345678"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono min-h-[44px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">IFSC Code (India)</label>
                  <input
                    type="text"
                    value={bankForm.ifscCode}
                    onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                    placeholder="HDFC0001234"
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">SWIFT / BIC</label>
                  <input
                    type="text"
                    value={bankForm.swiftCode}
                    onChange={(e) => setBankForm({ ...bankForm, swiftCode: e.target.value.toUpperCase() })}
                    placeholder="HDFCINBB"
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono min-h-[44px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">IBAN (UAE / International)</label>
                <input
                  type="text"
                  value={bankForm.iban}
                  onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value.toUpperCase() })}
                  placeholder="AE290330006001123456701"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={bankForm.branch}
                  onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                  placeholder="Andheri West, Mumbai"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="defaultBank"
                  checked={bankForm.isDefault}
                  onChange={(e) => setBankForm({ ...bankForm, isDefault: e.target.checked })}
                  className="rounded text-[#7FB706] focus:ring-[#7FB706]"
                />
                <label htmlFor="defaultBank" className="text-xs text-gray-300">
                  Set as default remittance account
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-gray-300 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-bold min-h-[44px]"
                >
                  Add Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD SIGNATORY ─────────────────────────────────────────── */}
      {showSignatoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-[#7FB706]" />
                Add Authorized Signatory
              </h3>
              <button
                type="button"
                onClick={() => setShowSignatoryModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSignatory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={signatoryForm.name}
                  onChange={(e) => setSignatoryForm({ ...signatoryForm, name: e.target.value })}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Designation / Title *</label>
                <input
                  type="text"
                  required
                  value={signatoryForm.designation}
                  onChange={(e) => setSignatoryForm({ ...signatoryForm, designation: e.target.value })}
                  placeholder="e.g. Managing Director / Authorized Signatory"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                />
              </div>

              {/* Digital Signature Upload Section */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Signature Image
                </label>
                
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={signatureInputRef}
                  onChange={handleSignatureFileChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  className="hidden"
                />

                {signatoryForm.signatureUrl ? (
                  <div className="space-y-2">
                    <div className="h-28 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center p-3 relative bg-gradient-to-b from-white/10 to-white/5">
                      <img
                        src={signatoryForm.signatureUrl}
                        alt="Signature Preview"
                        className="max-h-full max-w-full object-contain filter brightness-110"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => signatureInputRef.current?.click()}
                        className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-xs text-white rounded-xl flex items-center justify-center gap-1.5 min-h-[40px] border border-white/10 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#7FB706]" /> Change Signature
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatoryForm({ ...signatoryForm, signatureUrl: '' })}
                        className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 rounded-xl flex items-center justify-center gap-1.5 min-h-[40px] border border-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => signatureInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-[#7FB706] rounded-xl p-5 text-center cursor-pointer transition-colors bg-white/[0.02] hover:bg-[#7FB706]/5 group min-h-[110px] flex flex-col items-center justify-center"
                  >
                    <Upload className="w-7 h-7 mx-auto mb-2 text-gray-400 group-hover:text-[#7FB706] transition-colors" />
                    <p className="text-xs font-semibold text-gray-200">
                      Click to upload signature
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      PNG, JPG, SVG or WebP (transparent PNG recommended, max 5MB)
                    </p>
                  </div>
                )}

                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    {showUrlInput ? 'Hide image URL option' : 'Or enter image URL manually'}
                  </button>
                  {showUrlInput && (
                    <input
                      type="text"
                      value={signatoryForm.signatureUrl}
                      onChange={(e) => setSignatoryForm({ ...signatoryForm, signatureUrl: e.target.value })}
                      placeholder="https://.../signature.png"
                      className="mt-1.5 w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[40px]"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="defaultSig"
                  checked={signatoryForm.isDefault}
                  onChange={(e) => setSignatoryForm({ ...signatoryForm, isDefault: e.target.checked })}
                  className="rounded text-[#7FB706] focus:ring-[#7FB706]"
                />
                <label htmlFor="defaultSig" className="text-xs text-gray-300 cursor-pointer">
                  Set as primary authorized signatory
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSignatoryModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-gray-300 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-bold min-h-[44px]"
                >
                  Add Signatory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD ADDRESS ───────────────────────────────────────────── */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0e0e24] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#7FB706]" />
                Add Entity Registered Address
              </h3>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAddress} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Address Type *</label>
                <select
                  value={addressForm.type}
                  onChange={(e) => setAddressForm({ ...addressForm, type: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#12122b] border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                >
                  <option value="BILLING">Billing Address</option>
                  <option value="DELIVERY">Delivery Address</option>
                  <option value="REGISTERED_OFFICE">Registered Corporate Office</option>
                  <option value="FACTORY">Manufacturing & Fabrication Plant</option>
                  <option value="WAREHOUSE">Central Hardware & Board Warehouse</option>
                </select>
              </div>

              {/* Conditional GST and PAN Fields for Billing Address */}
              {(addressForm.type === 'BILLING' || addressForm.type === 'BILLING_ADDRESS') && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2.5">
                  <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    Billing Tax Identification
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        GST Number (GSTIN)
                      </label>
                      <input
                        type="text"
                        value={addressForm.gstin || ''}
                        onChange={(e) => setAddressForm({ ...addressForm, gstin: e.target.value.toUpperCase() })}
                        placeholder="27AAAAA0000A1Z5"
                        maxLength={15}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono uppercase min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        value={addressForm.pan || ''}
                        onChange={(e) => setAddressForm({ ...addressForm, pan: e.target.value.toUpperCase() })}
                        placeholder="AAAAA0000A"
                        maxLength={10}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono uppercase min-h-[40px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={addressForm.addressLine1}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                  placeholder="Plot No. 42, Industrial Area"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={addressForm.addressLine2 || ''}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                  placeholder="Building No., Floor, Suite"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  placeholder="Mumbai"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">State / Province</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    placeholder="Maharashtra"
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                    placeholder="400001"
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-gray-300 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-xs font-bold min-h-[44px]"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
