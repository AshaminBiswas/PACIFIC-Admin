import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  CheckCircle2,
  Truck,
  Building,
  CreditCard,
  MapPin,
  FileText,
  Phone,
  Mail,
  Users,
  ShieldCheck,
  Landmark,
} from 'lucide-react';
import { vendorsApi } from '../api/services';
import { boardInventoryApi } from '../api/boardInventoryApi';

const LOCAL_STORAGE_KEY = 'pacific_create_vendor_v2';

const GST_STATE_MAP: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

interface VendorFormState {
  // Identity
  legalName: string;
  tradeName: string;
  vendorType: string;
  status: string;

  // Statutory & Tax
  gstin: string;
  pan: string;
  stateCode: string;
  msmeNumber: string;

  // Contact
  email: string;
  phone: string;

  // Registered / Billing Address
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingStateCode: string;

  // Factory / Dispatch Warehouse Address
  sameAsBilling: boolean;
  factoryAddressLine1: string;
  factoryAddressLine2: string;
  factoryCity: string;
  factoryState: string;
  factoryPostalCode: string;

  // Bank Remittance
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;

  // Commercial Terms
  paymentTermsDays: string;
  creditLimit: string;
  generalNotes: string;

  // Contacts
  contactName: string;
  contactDesignation: string;
  contactPhone: string;
  contactEmail: string;

  secondaryContactName: string;
  secondaryContactDesignation: string;
  secondaryContactPhone: string;
  secondaryContactEmail: string;
}

const INITIAL_FORM: VendorFormState = {
  legalName: '',
  tradeName: '',
  vendorType: 'HPL_BOARDS',
  status: 'ACTIVE',

  gstin: '',
  pan: '',
  stateCode: '07',
  msmeNumber: '',

  email: '',
  phone: '',

  billingAddressLine1: '',
  billingAddressLine2: '',
  billingCity: 'Delhi',
  billingState: 'Delhi',
  billingPostalCode: '',
  billingStateCode: '07',

  sameAsBilling: true,
  factoryAddressLine1: '',
  factoryAddressLine2: '',
  factoryCity: '',
  factoryState: '',
  factoryPostalCode: '',

  bankName: '',
  accountNumber: '',
  ifscCode: '',
  branchName: '',
  upiId: '',

  paymentTermsDays: '30',
  creditLimit: '',
  generalNotes: '',

  contactName: '',
  contactDesignation: 'Sales Head',
  contactPhone: '',
  contactEmail: '',

  secondaryContactName: '',
  secondaryContactDesignation: 'Dispatch / Accounts',
  secondaryContactPhone: '',
  secondaryContactEmail: '',
};

export default function CreateVendorPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<VendorFormState>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM;
  });

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(form));
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
  }, [form]);

  // GSTIN Auto-populate PAN & State Code
  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase().trim();
    let updatedPan = form.pan;
    let updatedStateCode = form.billingStateCode;
    let updatedState = form.billingState;

    if (upper.length >= 2) {
      const sc = upper.substring(0, 2);
      if (GST_STATE_MAP[sc]) {
        updatedStateCode = sc;
        updatedState = GST_STATE_MAP[sc];
      }
    }

    if (upper.length >= 12) {
      // Characters 3-12 of 15-digit GSTIN is PAN
      const extractedPan = upper.substring(2, 12);
      if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(extractedPan)) {
        updatedPan = extractedPan;
      }
    }

    setForm((prev) => ({
      ...prev,
      gstin: upper,
      pan: updatedPan,
      stateCode: updatedStateCode,
      billingStateCode: updatedStateCode,
      billingState: updatedState,
    }));
  };

  const handleReset = () => {
    if (window.confirm('Reset this supplier draft? All inputs will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setForm(INITIAL_FORM);
      setFieldErrors({});
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.legalName.trim()) errors.legalName = 'Supplier Legal Name is required';
    if (!form.billingAddressLine1.trim()) errors.billingAddressLine1 = 'Registered Address Line 1 is required';
    if (!form.billingCity.trim()) errors.billingCity = 'City is required';
    if (!form.billingState.trim()) errors.billingState = 'State is required';
    if (!form.billingPostalCode.trim()) errors.billingPostalCode = 'Postal Pincode is required';
    if (form.billingPostalCode.trim() && !/^\d{6}$/.test(form.billingPostalCode.trim())) {
      errors.billingPostalCode = 'Pincode must be 6 digits';
    }
    if (form.gstin.trim() && form.gstin.trim().length !== 15) {
      errors.gstin = 'GSTIN must be exactly 15 characters';
    }
    if (form.pan.trim() && form.pan.trim().length !== 10) {
      errors.pan = 'PAN must be exactly 10 characters';
    }
    if (form.ifscCode.trim() && form.ifscCode.trim().length !== 11) {
      errors.ifscCode = 'IFSC code must be 11 characters (e.g. HDFC0001234)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert('Please correct the highlighted fields before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);

      const addresses = [
        {
          addressType: 'BILLING',
          addressLine1: form.billingAddressLine1.trim(),
          addressLine2: form.billingAddressLine2.trim() || undefined,
          city: form.billingCity.trim(),
          state: form.billingState.trim(),
          stateCode: form.billingStateCode.trim() || undefined,
          postalCode: form.billingPostalCode.trim(),
          gstin: form.gstin.trim() || undefined,
          country: 'India',
          isDefaultBilling: true,
          isDefaultShipping: form.sameAsBilling,
        },
      ];

      if (!form.sameAsBilling && form.factoryAddressLine1.trim()) {
        addresses.push({
          addressType: 'FACTORY',
          addressLine1: form.factoryAddressLine1.trim(),
          addressLine2: form.factoryAddressLine2.trim() || undefined,
          city: form.factoryCity.trim() || form.billingCity.trim(),
          state: form.factoryState.trim() || form.billingState.trim(),
          stateCode: form.billingStateCode.trim() || undefined,
          postalCode: form.factoryPostalCode.trim() || form.billingPostalCode.trim(),
          gstin: form.gstin.trim() || undefined,
          country: 'India',
          isDefaultBilling: false,
          isDefaultShipping: true,
        });
      }

      const contacts = [];
      if (form.contactName.trim()) {
        contacts.push({
          name: form.contactName.trim(),
          designation: form.contactDesignation.trim() || undefined,
          phone: form.contactPhone.trim() || undefined,
          email: form.contactEmail.trim() || undefined,
          isPrimary: true,
        });
      }
      if (form.secondaryContactName.trim()) {
        contacts.push({
          name: form.secondaryContactName.trim(),
          designation: form.secondaryContactDesignation.trim() || undefined,
          phone: form.secondaryContactPhone.trim() || undefined,
          email: form.secondaryContactEmail.trim() || undefined,
          isPrimary: false,
        });
      }

      const structuredNotes = {
        msmeNumber: form.msmeNumber.trim() || undefined,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
        bankDetails: {
          bankName: form.bankName.trim() || undefined,
          accountNumber: form.accountNumber.trim() || undefined,
          ifscCode: form.ifscCode.trim().toUpperCase() || undefined,
          branchName: form.branchName.trim() || undefined,
          upiId: form.upiId.trim() || undefined,
        },
        generalNotes: form.generalNotes.trim() || undefined,
      };

      await vendorsApi.createVendor({
        legalName: form.legalName.trim(),
        tradeName: form.tradeName.trim() || form.legalName.trim(),
        vendorType: form.vendorType,
        status: form.status,
        gstin: form.gstin.trim() || undefined,
        pan: form.pan.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        paymentTermsDays: Number(form.paymentTermsDays) || 30,
        contacts,
        addresses,
        notes: structuredNotes,
      });

      localStorage.removeItem(LOCAL_STORAGE_KEY);
      boardInventoryApi.clearSupplierCache();
      alert(`Supplier "${form.legalName}" registered successfully!`);
      navigate('/admin/dashboard/vendors');
    } catch (err: any) {
      console.error('Failed to create vendor:', err);
      alert(err.response?.data?.message || err.message || 'Failed to create vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    'w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition-colors min-h-[44px]';
  const labelCls = 'block text-xs font-semibold text-gray-300 mb-1.5';
  const sectionCardCls = 'bg-[#121226] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-4';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-28">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard/vendors"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"
            title="Back to Vendors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-[#7FB706]" />
              New Supplier / Vendor Master
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Register a verified procurement vendor with complete statutory, banking &amp; logistics profile
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto-saved</span>
            {lastSavedTime && <span className="text-[11px] opacity-80">({lastSavedTime})</span>}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* 2. Basic Identity Card */}
      <div className={sectionCardCls}>
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Building className="w-4 h-4 text-[#7FB706]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">1. Business Identity &amp; Classification</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Supplier Legal Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.legalName}
              onChange={(e) => setForm({ ...form, legalName: e.target.value })}
              className={`${inputCls} ${fieldErrors.legalName ? 'border-red-500' : ''}`}
              placeholder="e.g. Greenlam Industries Ltd. / Pacific Hardware Solutions"
            />
            {fieldErrors.legalName && <p className="text-xs text-red-400 mt-1">{fieldErrors.legalName}</p>}
          </div>

          <div>
            <label className={labelCls}>Trade / Brand Name</label>
            <input
              type="text"
              value={form.tradeName}
              onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
              className={inputCls}
              placeholder="e.g. Greenlam / Pacific"
            />
          </div>

          <div>
            <label className={labelCls}>
              Supply Category <span className="text-red-400">*</span>
            </label>
            <select
              value={form.vendorType}
              onChange={(e) => setForm({ ...form, vendorType: e.target.value })}
              className={inputCls}
            >
              <option value="HPL_BOARDS">HPL Compact Laminate Boards (12mm / 18mm)</option>
              <option value="HDF_BOARDS">High-Density Fiber (HDF) Panels</option>
              <option value="SS">SS Grade 304 / 316 Hardware Fittings</option>
              <option value="ALUMINIUM">Aluminium Extrusions &amp; Headrails</option>
              <option value="NYLON">Virgin Nylon Hardware &amp; Accessories</option>
              <option value="RAW_MATERIALS">Raw Materials &amp; Fasteners / Adhesives</option>
              <option value="FINISHED_GOODS">Finished Goods / Modular Cubicles</option>
              <option value="TOOLS_EQUIPMENT">Factory Tools, Machinery &amp; Consumables</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputCls}
            >
              <option value="ACTIVE">ACTIVE — Approved Supplier</option>
              <option value="ON_HOLD">ON_HOLD — Under Inspection / Quality Check</option>
              <option value="INACTIVE">INACTIVE — Discontinued</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>MSME / UDYAM Number (Optional)</label>
            <input
              type="text"
              value={form.msmeNumber}
              onChange={(e) => setForm({ ...form, msmeNumber: e.target.value.toUpperCase() })}
              className={`${inputCls} font-mono`}
              placeholder="e.g. UDYAM-DL-01-0012345"
            />
          </div>
        </div>
      </div>

      {/* 3. Statutory & Tax Coordinates */}
      <div className={sectionCardCls}>
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <ShieldCheck className="w-4 h-4 text-[#7FB706]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">2. Statutory &amp; Tax Coordinates</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>GSTIN (15 Characters)</label>
            <input
              type="text"
              maxLength={15}
              value={form.gstin}
              onChange={(e) => handleGstinChange(e.target.value)}
              className={`${inputCls} font-mono uppercase ${fieldErrors.gstin ? 'border-red-500' : ''}`}
              placeholder="e.g. 07AAAAG1234A1Z5"
            />
            {fieldErrors.gstin && <p className="text-xs text-red-400 mt-1">{fieldErrors.gstin}</p>}
            <p className="text-[11px] text-gray-400 mt-1">Auto-detects State Code &amp; PAN from GSTIN</p>
          </div>

          <div>
            <label className={labelCls}>PAN (10 Characters)</label>
            <input
              type="text"
              maxLength={10}
              value={form.pan}
              onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
              className={`${inputCls} font-mono uppercase ${fieldErrors.pan ? 'border-red-500' : ''}`}
              placeholder="e.g. AAAAG1234A"
            />
            {fieldErrors.pan && <p className="text-xs text-red-400 mt-1">{fieldErrors.pan}</p>}
          </div>

          <div>
            <label className={labelCls}>2-Digit GST State Code</label>
            <input
              type="text"
              maxLength={2}
              value={form.billingStateCode}
              onChange={(e) => {
                const sc = e.target.value;
                const stateName = GST_STATE_MAP[sc] || form.billingState;
                setForm({ ...form, billingStateCode: sc, stateCode: sc, billingState: stateName });
              }}
              className={`${inputCls} font-mono`}
              placeholder="07 (Delhi)"
            />
            {form.billingStateCode && GST_STATE_MAP[form.billingStateCode] && (
              <p className="text-[11px] text-[#7FB706] mt-1 font-medium">State: {GST_STATE_MAP[form.billingStateCode]}</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Registered Billing Address */}
      <div className={sectionCardCls}>
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <MapPin className="w-4 h-4 text-[#7FB706]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">3. Registered Billing Address</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>
              Address Line 1 (Plot, Building, Street) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.billingAddressLine1}
              onChange={(e) => setForm({ ...form, billingAddressLine1: e.target.value })}
              className={`${inputCls} ${fieldErrors.billingAddressLine1 ? 'border-red-500' : ''}`}
              placeholder="e.g. Plot No. 42, Okhla Industrial Area Phase-II"
            />
            {fieldErrors.billingAddressLine1 && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.billingAddressLine1}</p>
            )}
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>Address Line 2 (Industrial Estate, Landmark)</label>
            <input
              type="text"
              value={form.billingAddressLine2}
              onChange={(e) => setForm({ ...form, billingAddressLine2: e.target.value })}
              className={inputCls}
              placeholder="e.g. Near Crowne Plaza Hotel"
            />
          </div>

          <div>
            <label className={labelCls}>
              City <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.billingCity}
              onChange={(e) => setForm({ ...form, billingCity: e.target.value })}
              className={`${inputCls} ${fieldErrors.billingCity ? 'border-red-500' : ''}`}
              placeholder="e.g. New Delhi"
            />
            {fieldErrors.billingCity && <p className="text-xs text-red-400 mt-1">{fieldErrors.billingCity}</p>}
          </div>

          <div>
            <label className={labelCls}>
              State <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.billingState}
              onChange={(e) => setForm({ ...form, billingState: e.target.value })}
              className={`${inputCls} ${fieldErrors.billingState ? 'border-red-500' : ''}`}
              placeholder="e.g. Delhi"
            />
            {fieldErrors.billingState && <p className="text-xs text-red-400 mt-1">{fieldErrors.billingState}</p>}
          </div>

          <div>
            <label className={labelCls}>
              Postal Pincode <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              maxLength={6}
              inputMode="numeric"
              required
              value={form.billingPostalCode}
              onChange={(e) => setForm({ ...form, billingPostalCode: e.target.value.replace(/\D/g, '') })}
              className={`${inputCls} font-mono ${fieldErrors.billingPostalCode ? 'border-red-500' : ''}`}
              placeholder="e.g. 110020"
            />
            {fieldErrors.billingPostalCode && (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.billingPostalCode}</p>
            )}
          </div>
        </div>

        {/* Factory / Dispatch Address Toggle */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.sameAsBilling}
              onChange={(e) => setForm({ ...form, sameAsBilling: e.target.checked })}
              className="w-4 h-4 rounded bg-[#0a0a1a] border-white/20 text-[#7FB706] focus:ring-[#7FB706]"
            />
            <span>Factory &amp; Dispatch Warehouse address is identical to Registered Billing Address</span>
          </label>

          {!form.sameAsBilling && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Factory / Warehouse Dispatch Address (For pickup &amp; delivery chalan)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2 lg:col-span-3">
                  <input
                    type="text"
                    value={form.factoryAddressLine1}
                    onChange={(e) => setForm({ ...form, factoryAddressLine1: e.target.value })}
                    className={inputCls}
                    placeholder="Factory Line 1: Khasra / Shed No., Industrial Area"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={form.factoryCity}
                    onChange={(e) => setForm({ ...form, factoryCity: e.target.value })}
                    className={inputCls}
                    placeholder="Factory City"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={form.factoryState}
                    onChange={(e) => setForm({ ...form, factoryState: e.target.value })}
                    className={inputCls}
                    placeholder="Factory State"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    value={form.factoryPostalCode}
                    onChange={(e) => setForm({ ...form, factoryPostalCode: e.target.value.replace(/\D/g, '') })}
                    className={`${inputCls} font-mono`}
                    placeholder="Factory Pincode"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bank & Remittance Coordinates */}
      <div className={sectionCardCls}>
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Landmark className="w-4 h-4 text-[#7FB706]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">4. Bank &amp; Remittance Coordinates</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Bank Name</label>
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              className={inputCls}
              placeholder="e.g. HDFC Bank Ltd. / State Bank of India"
            />
          </div>

          <div>
            <label className={labelCls}>Account Number</label>
            <input
              type="text"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              className={`${inputCls} font-mono`}
              placeholder="e.g. 50200012345678"
            />
          </div>

          <div>
            <label className={labelCls}>IFSC Code (11 Digits)</label>
            <input
              type="text"
              maxLength={11}
              value={form.ifscCode}
              onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
              className={`${inputCls} font-mono uppercase ${fieldErrors.ifscCode ? 'border-red-500' : ''}`}
              placeholder="e.g. HDFC0001234"
            />
            {fieldErrors.ifscCode && <p className="text-xs text-red-400 mt-1">{fieldErrors.ifscCode}</p>}
          </div>

          <div>
            <label className={labelCls}>Branch Name / City</label>
            <input
              type="text"
              value={form.branchName}
              onChange={(e) => setForm({ ...form, branchName: e.target.value })}
              className={inputCls}
              placeholder="e.g. Mandoli / Mayur Vihar Branch"
            />
          </div>

          <div>
            <label className={labelCls}>UPI ID / VPA</label>
            <input
              type="text"
              value={form.upiId}
              onChange={(e) => setForm({ ...form, upiId: e.target.value })}
              className={inputCls}
              placeholder="e.g. vendor@hdfcbank"
            />
          </div>

          <div>
            <label className={labelCls}>Agreed Payment Terms (Days)</label>
            <input
              type="number"
              min="0"
              value={form.paymentTermsDays}
              onChange={(e) => setForm({ ...form, paymentTermsDays: e.target.value })}
              className={inputCls}
              placeholder="30 (0 = 100% Advance)"
            />
          </div>
        </div>
      </div>

      {/* 6. Primary & Secondary Contact Representatives */}
      <div className={sectionCardCls}>
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Users className="w-4 h-4 text-[#7FB706]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">5. Key Contact Persons &amp; Communication</h2>
        </div>

        {/* Primary Contact */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase text-[#7FB706] tracking-wider">Primary Representative</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Name</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className={inputCls}
                placeholder="e.g. Rajesh Sharma"
              />
            </div>
            <div>
              <label className={labelCls}>Designation</label>
              <input
                type="text"
                value={form.contactDesignation}
                onChange={(e) => setForm({ ...form, contactDesignation: e.target.value })}
                className={inputCls}
                placeholder="e.g. Regional Sales Head"
              />
            </div>
            <div>
              <label className={labelCls}>Mobile / Phone</label>
              <input
                type="tel"
                inputMode="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className={inputCls}
                placeholder="e.g. 9811001100"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className={inputCls}
                placeholder="e.g. sales@vendor.com"
              />
            </div>
          </div>
        </div>

        {/* Secondary Contact */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Secondary Contact (Dispatch / Accounts)</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <input
                type="text"
                value={form.secondaryContactName}
                onChange={(e) => setForm({ ...form, secondaryContactName: e.target.value })}
                className={inputCls}
                placeholder="Secondary Contact Name"
              />
            </div>
            <div>
              <input
                type="text"
                value={form.secondaryContactDesignation}
                onChange={(e) => setForm({ ...form, secondaryContactDesignation: e.target.value })}
                className={inputCls}
                placeholder="Designation / Dept"
              />
            </div>
            <div>
              <input
                type="tel"
                inputMode="tel"
                value={form.secondaryContactPhone}
                onChange={(e) => setForm({ ...form, secondaryContactPhone: e.target.value })}
                className={inputCls}
                placeholder="Mobile / WhatsApp"
              />
            </div>
            <div>
              <input
                type="email"
                value={form.secondaryContactEmail}
                onChange={(e) => setForm({ ...form, secondaryContactEmail: e.target.value })}
                className={inputCls}
                placeholder="Email Address"
              />
            </div>
          </div>
        </div>

        {/* General Notes & Procurement Instructions */}
        <div className="pt-3 border-t border-white/5">
          <label className={labelCls}>Special Procurement Instructions &amp; Notes</label>
          <textarea
            rows={2}
            value={form.generalNotes}
            onChange={(e) => setForm({ ...form, generalNotes: e.target.value })}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
            placeholder="e.g. Minimum order quantity 10 sheets; requires 48hr advance dispatch notice; delivery gate 2."
          />
        </div>
      </div>

      {/* 7. Action Bar */}
      <div className="sticky bottom-4 z-20 bg-[#121226]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-gray-400 hidden sm:block">
          All changes are auto-cached locally. Submitting will register this supplier in the central ERP master.
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/admin/dashboard/vendors"
            className="flex-1 sm:flex-none px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition text-sm cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-7 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition text-sm cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Registering Supplier...' : 'Save & Register Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}
