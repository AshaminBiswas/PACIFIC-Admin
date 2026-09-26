import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Users, ShieldAlert, Plus, MapPin, Truck } from 'lucide-react';
import { crmApi } from '../api/services';
import type { BusinessParty } from '../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_customer_v1';

interface CustomerFormData {
  legalName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  customerType: string;
  creditLimit: string;
  paymentTermsDays: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  billingAddress: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingStateCode: string;
  billingPostalCode: string;
  sameAsBilling: boolean;
  deliveryAddress: string;
  deliveryAddress2: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryStateCode: string;
  deliveryPostalCode: string;
}

const INITIAL_FORM_DATA: CustomerFormData = {
  legalName: '',
  tradeName: '',
  gstin: '',
  pan: '',
  email: '',
  phone: '',
  customerType: 'CONTRACTOR',
  creditLimit: '',
  paymentTermsDays: '30',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  billingAddress: '',
  billingAddress2: '',
  billingCity: 'Delhi',
  billingState: 'Delhi',
  billingStateCode: '07',
  billingPostalCode: '',
  sameAsBilling: true,
  deliveryAddress: '',
  deliveryAddress2: '',
  deliveryCity: 'Delhi',
  deliveryState: 'Delhi',
  deliveryStateCode: '07',
  deliveryPostalCode: '',
};

export default function CreateCustomerPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [duplicateMatches, setDuplicateMatches] = useState<BusinessParty[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const [formData, setFormData] = useState<CustomerFormData>(() => {
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

  // Real-time Duplicate Check
  useEffect(() => {
    const timer = setTimeout(async () => {
      const hasMinLength =
        (formData.legalName?.trim().length || 0) >= 4 ||
        (formData.phone?.trim().length || 0) >= 6 ||
        (formData.gstin?.trim().length || 0) >= 5;
      if (!hasMinLength) {
        setDuplicateMatches([]);
        return;
      }
      setCheckingDuplicates(true);
      try {
        const res = await crmApi.checkDuplicates({
          legalName: formData.legalName,
          phone: formData.phone,
          gstin: formData.gstin,
        });
        if (res.data?.data) {
          setDuplicateMatches(res.data.data);
        }
      } catch (err) {
        console.error('Failed to check duplicates:', err);
      } finally {
        setCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.legalName, formData.phone, formData.gstin]);

  const handleReset = () => {
    if (window.confirm('Reset this draft? All inputs will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await crmApi.createCustomer({
        legalName: formData.legalName,
        tradeName: formData.tradeName || formData.legalName,
        gstin: formData.gstin,
        pan: formData.pan,
        email: formData.email,
        phone: formData.phone,
        customerType: formData.customerType,
        creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
        paymentTermsDays: Number(formData.paymentTermsDays),
        contacts: formData.contactName
          ? [{ name: formData.contactName, phone: formData.contactPhone, email: formData.contactEmail, isPrimary: true }]
          : [],
        addresses: (() => {
          const list: any[] = [];
          const bLine = formData.billingAddress.trim();
          if (bLine) {
            list.push({
              addressType: 'BILLING',
              addressLine1: bLine,
              addressLine2: formData.billingAddress2.trim() || undefined,
              city: formData.billingCity.trim() || 'Delhi',
              state: formData.billingState.trim() || 'Delhi',
              stateCode: formData.billingStateCode.trim() || '07',
              postalCode: formData.billingPostalCode.trim() || undefined,
              isDefaultBilling: true,
              isDefaultShipping: false,
            });
          }

          const dLine = (formData.sameAsBilling ? bLine : formData.deliveryAddress.trim()) || bLine;
          if (dLine) {
            list.push({
              addressType: 'SHIPPING',
              addressLine1: dLine,
              addressLine2: (formData.sameAsBilling ? formData.billingAddress2.trim() : formData.deliveryAddress2.trim()) || undefined,
              city: (formData.sameAsBilling ? formData.billingCity.trim() : formData.deliveryCity.trim()) || 'Delhi',
              state: (formData.sameAsBilling ? formData.billingState.trim() : formData.deliveryState.trim()) || 'Delhi',
              stateCode: (formData.sameAsBilling ? formData.billingStateCode.trim() : formData.deliveryStateCode.trim()) || '07',
              postalCode: (formData.sameAsBilling ? formData.billingPostalCode.trim() : formData.deliveryPostalCode.trim()) || undefined,
              isDefaultBilling: false,
              isDefaultShipping: true,
            });
          }
          return list;
        })(),
      });
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert(`Customer created successfully!`);
      navigate('/admin/dashboard/customers');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/customers" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-[#7FB706]" />
              New B2B Customer
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Create a new customer profile</p>
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

      {/* Real-time Deduplication Alert Banner */}
      {duplicateMatches.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <ShieldAlert className="w-5 h-5" /> Potential Duplicate Customer(s) Detected ({duplicateMatches.length})
          </div>
          <p className="text-amber-200/90 text-xs">
            Existing records match the legal name, phone, or GSTIN entered. Please check if you should use an existing record instead.
          </p>
          <div className="space-y-2">
            {duplicateMatches.map((d) => (
              <div key={d.id} className="p-3 rounded-xl bg-[#0a0a1a] border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-sm">{d.legalName}</div>
                  <div className="text-gray-400 font-mono text-[11px]">
                    GSTIN: {d.gstin || 'None'} | Phone: {d.phone || 'None'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Company Legal Name *</label>
            <input
              required
              type="text"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              placeholder="e.g. Gencon Infrastructure Pvt. Ltd."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Trade Name (Optional)</label>
            <input
              type="text"
              value={formData.tradeName}
              onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              placeholder="e.g. Gencon"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Customer Category</label>
            <select
              value={formData.customerType}
              onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            >
              <option value="CONTRACTOR">General Contractor</option>
              <option value="ARCHITECT">Architect / Consultant</option>
              <option value="CORPORATE">Corporate Client</option>
              <option value="INSTITUTIONAL">Institutional / Hospital</option>
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
              placeholder="procurement@gencon.com"
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
              placeholder="9818592113"
            />
          </div>

          {/* Primary Billing Address */}
          <div className="sm:col-span-2 pt-3 border-t border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Primary Billing Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Billing Address Line 1 *</label>
                <input
                  type="text"
                  value={formData.billingAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      billingAddress: val,
                      deliveryAddress: prev.sameAsBilling ? val : prev.deliveryAddress,
                    }));
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  placeholder="Floor 4, Tower B, Business Park"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Billing Address Line 2</label>
                <input
                  type="text"
                  value={formData.billingAddress2}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      billingAddress2: val,
                      deliveryAddress2: prev.sameAsBilling ? val : prev.deliveryAddress2,
                    }));
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  placeholder="Sector 62, Near Metro Station"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">City</label>
                <input
                  type="text"
                  value={formData.billingCity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      billingCity: val,
                      deliveryCity: prev.sameAsBilling ? val : prev.deliveryCity,
                    }));
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  placeholder="Delhi"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">State</label>
                <input
                  type="text"
                  value={formData.billingState}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      billingState: val,
                      deliveryState: prev.sameAsBilling ? val : prev.deliveryState,
                    }));
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  placeholder="Delhi"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">State Code (e.g. 07 for Delhi)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.billingStateCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      billingStateCode: val,
                      deliveryStateCode: prev.sameAsBilling ? val : prev.deliveryStateCode,
                    }));
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#7FB706]"
                  placeholder="07"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Postal Code (PIN)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.billingPostalCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      billingPostalCode: val,
                      deliveryPostalCode: prev.sameAsBilling ? val : prev.deliveryPostalCode,
                    }));
                  }}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#7FB706]"
                  placeholder="110094"
                />
              </div>
            </div>
          </div>

          {/* Delivery / Site Installation Address */}
          <div className="sm:col-span-2 pt-4 border-t border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                Delivery / Site Installation Address *
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-sky-400 hover:text-sky-300 font-medium">
                <input
                  type="checkbox"
                  checked={formData.sameAsBilling}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData(prev => ({
                      ...prev,
                      sameAsBilling: checked,
                      ...(checked
                        ? {
                            deliveryAddress: prev.billingAddress,
                            deliveryAddress2: prev.billingAddress2,
                            deliveryCity: prev.billingCity,
                            deliveryState: prev.billingState,
                            deliveryStateCode: prev.billingStateCode,
                            deliveryPostalCode: prev.billingPostalCode,
                          }
                        : {}),
                    }));
                  }}
                  className="rounded border-white/20 text-[#7FB706] focus:ring-0 focus:ring-offset-0 bg-[#0a0a1a]"
                />
                <span>Delivery address is same as billing address</span>
              </label>
            </div>

            {formData.sameAsBilling ? (
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-400" />
                <span>Delivery / Site Installation address is currently synchronized with the Billing Address.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Delivery Address Line 1 *</label>
                  <input
                    type="text"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400"
                    placeholder="Project Site, Plot No. 88, Industrial Area"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Delivery Address Line 2</label>
                  <input
                    type="text"
                    value={formData.deliveryAddress2}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress2: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400"
                    placeholder="Gate No. 2, Receiving Bay"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Delivery City</label>
                  <input
                    type="text"
                    value={formData.deliveryCity}
                    onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400"
                    placeholder="Delhi"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Delivery State</label>
                  <input
                    type="text"
                    value={formData.deliveryState}
                    onChange={(e) => setFormData({ ...formData, deliveryState: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400"
                    placeholder="Delhi"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Delivery State Code (e.g. 07)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.deliveryStateCode}
                    onChange={(e) => setFormData({ ...formData, deliveryStateCode: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400"
                    placeholder="07"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Delivery Postal Code (PIN)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.deliveryPostalCode}
                    onChange={(e) => setFormData({ ...formData, deliveryPostalCode: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400"
                    placeholder="110094"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/customers" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
