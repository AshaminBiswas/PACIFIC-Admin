import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Truck,
  Building,
  CreditCard,
  MapPin,
  AlertCircle,
  Phone,
  Mail,
  Users,
  ShieldCheck,
  Landmark,
} from 'lucide-react';
import { vendorsApi } from '../api/services';

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

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
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
    secondaryContactDesignation: '',
    secondaryContactPhone: '',
    secondaryContactEmail: '',
  });

  const loadVendor = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await vendorsApi.getVendorById(id);
      const v = res.data?.data;
      if (v) {
        const primaryContact = v.contacts?.find((ct) => ct.isPrimary) || v.contacts?.[0];
        const secondaryContact = v.contacts?.find((ct) => !ct.isPrimary) || v.contacts?.[1];

        const billingAddr = v.addresses?.find((a) => a.addressType === 'BILLING' || a.isDefaultBilling) || v.addresses?.[0];
        const factoryAddr = v.addresses?.find((a) => a.addressType === 'FACTORY' || (!a.isDefaultBilling && a.isDefaultShipping));

        // Parse structured notes
        let parsedNotes: any = {
          msmeNumber: '',
          creditLimit: '',
          bankDetails: {},
          generalNotes: '',
        };

        if (v.notes) {
          try {
            const parsed = JSON.parse(v.notes);
            if (typeof parsed === 'object' && parsed !== null) {
              parsedNotes = { ...parsedNotes, ...parsed };
            } else {
              parsedNotes.generalNotes = String(v.notes);
            }
          } catch {
            parsedNotes.generalNotes = String(v.notes);
          }
        }

        const bank = parsedNotes.bankDetails || {};

        setFormData({
          legalName: v.legalName || '',
          tradeName: v.tradeName || '',
          vendorType: v.vendorProfile?.vendorType || 'HPL_BOARDS',
          status: v.status || 'ACTIVE',

          gstin: v.gstin || '',
          pan: v.pan || '',
          stateCode: billingAddr?.stateCode || '07',
          msmeNumber: parsedNotes.msmeNumber || '',

          email: v.email || '',
          phone: v.phone || '',

          billingAddressLine1: billingAddr?.addressLine1 || '',
          billingAddressLine2: billingAddr?.addressLine2 || '',
          billingCity: billingAddr?.city || 'Delhi',
          billingState: billingAddr?.state || 'Delhi',
          billingPostalCode: billingAddr?.postalCode || '',
          billingStateCode: billingAddr?.stateCode || '07',

          sameAsBilling: !factoryAddr,
          factoryAddressLine1: factoryAddr?.addressLine1 || '',
          factoryAddressLine2: factoryAddr?.addressLine2 || '',
          factoryCity: factoryAddr?.city || '',
          factoryState: factoryAddr?.state || '',
          factoryPostalCode: factoryAddr?.postalCode || '',

          bankName: bank.bankName || '',
          accountNumber: bank.accountNumber || '',
          ifscCode: bank.ifscCode || '',
          branchName: bank.branchName || '',
          upiId: bank.upiId || '',

          paymentTermsDays: String(v.vendorProfile?.paymentTermsDays || 30),
          creditLimit: parsedNotes.creditLimit ? String(parsedNotes.creditLimit) : '',
          generalNotes: parsedNotes.generalNotes || '',

          contactName: primaryContact?.name || '',
          contactDesignation: primaryContact?.designation || 'Sales Head',
          contactPhone: primaryContact?.phone || '',
          contactEmail: primaryContact?.email || '',

          secondaryContactName: secondaryContact?.name || '',
          secondaryContactDesignation: secondaryContact?.designation || '',
          secondaryContactPhone: secondaryContact?.phone || '',
          secondaryContactEmail: secondaryContact?.email || '',
        });
      } else {
        setError('Supplier not found');
      }
    } catch (err: any) {
      console.error('Failed to load supplier for editing:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load supplier details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVendor();
  }, [loadVendor]);

  // GSTIN Auto-populate PAN & State Code
  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase().trim();
    let updatedPan = formData.pan;
    let updatedStateCode = formData.billingStateCode;
    let updatedState = formData.billingState;

    if (upper.length >= 2) {
      const sc = upper.substring(0, 2);
      if (GST_STATE_MAP[sc]) {
        updatedStateCode = sc;
        updatedState = GST_STATE_MAP[sc];
      }
    }

    if (upper.length >= 12) {
      const extractedPan = upper.substring(2, 12);
      if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(extractedPan)) {
        updatedPan = extractedPan;
      }
    }

    setFormData((prev) => ({
      ...prev,
      gstin: upper,
      pan: updatedPan,
      stateCode: updatedStateCode,
      billingStateCode: updatedStateCode,
      billingState: updatedState,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!formData.legalName.trim()) {
      alert('Supplier Legal Name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const addresses = [
        {
          addressType: 'BILLING',
          addressLine1: formData.billingAddressLine1.trim(),
          addressLine2: formData.billingAddressLine2.trim() || undefined,
          city: formData.billingCity.trim(),
          state: formData.billingState.trim(),
          stateCode: formData.billingStateCode.trim() || undefined,
          postalCode: formData.billingPostalCode.trim() || undefined,
          gstin: formData.gstin.trim() || undefined,
          country: 'India',
          isDefaultBilling: true,
          isDefaultShipping: formData.sameAsBilling,
        },
      ];

      if (!formData.sameAsBilling && formData.factoryAddressLine1.trim()) {
        addresses.push({
          addressType: 'FACTORY',
          addressLine1: formData.factoryAddressLine1.trim(),
          addressLine2: formData.factoryAddressLine2.trim() || undefined,
          city: formData.factoryCity.trim() || formData.billingCity.trim(),
          state: formData.factoryState.trim() || formData.billingState.trim(),
          stateCode: formData.billingStateCode.trim() || undefined,
          postalCode: formData.factoryPostalCode.trim() || formData.billingPostalCode.trim(),
          gstin: formData.gstin.trim() || undefined,
          country: 'India',
          isDefaultBilling: false,
          isDefaultShipping: true,
        });
      }

      const contacts = [];
      if (formData.contactName.trim()) {
        contacts.push({
          name: formData.contactName.trim(),
          designation: formData.contactDesignation.trim() || undefined,
          phone: formData.contactPhone.trim() || undefined,
          email: formData.contactEmail.trim() || undefined,
          isPrimary: true,
        });
      }
      if (formData.secondaryContactName.trim()) {
        contacts.push({
          name: formData.secondaryContactName.trim(),
          designation: formData.secondaryContactDesignation.trim() || undefined,
          phone: formData.secondaryContactPhone.trim() || undefined,
          email: formData.secondaryContactEmail.trim() || undefined,
          isPrimary: false,
        });
      }

      const structuredNotes = {
        msmeNumber: formData.msmeNumber.trim() || undefined,
        creditLimit: formData.creditLimit ? Number(formData.creditLimit) : undefined,
        bankDetails: {
          bankName: formData.bankName.trim() || undefined,
          accountNumber: formData.accountNumber.trim() || undefined,
          ifscCode: formData.ifscCode.trim().toUpperCase() || undefined,
          branchName: formData.branchName.trim() || undefined,
          upiId: formData.upiId.trim() || undefined,
        },
        generalNotes: formData.generalNotes.trim() || undefined,
      };

      await vendorsApi.updateVendor(id, {
        legalName: formData.legalName.trim(),
        tradeName: formData.tradeName.trim() || formData.legalName.trim(),
        vendorType: formData.vendorType,
        status: formData.status,
        gstin: formData.gstin.trim() || null,
        pan: formData.pan.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        paymentTermsDays: Number(formData.paymentTermsDays) || 30,
        contacts,
        addresses,
        notes: structuredNotes,
      });

      alert('Supplier profile updated successfully!');
      navigate(`/admin/dashboard/vendors/${id}`);
    } catch (err: any) {
      console.error('Failed to update supplier:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    'w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition-colors min-h-[44px]';
  const labelCls = 'block text-xs font-semibold text-gray-300 mb-1.5';
  const sectionCardCls = 'bg-[#121226] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-4';

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading supplier editor...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-28">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link
            to={id ? `/admin/dashboard/vendors/${id}` : '/admin/dashboard/vendors'}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"
            title="Back to Supplier"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-[#7FB706]" />
              Edit Supplier: {formData.legalName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Update procurement supplier details, statutory coordinates &amp; payment records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={id ? `/admin/dashboard/vendors/${id}` : '/admin/dashboard/vendors'}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl min-h-[40px] flex items-center justify-center transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[44px] flex items-center justify-center gap-2 transition text-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Business Identity */}
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
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Trade / Brand Name</label>
            <input
              type="text"
              value={formData.tradeName}
              onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Supply Category *</label>
            <select
              value={formData.vendorType}
              onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}
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
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className={inputCls}
            >
              <option value="ACTIVE">ACTIVE — Approved Supplier</option>
              <option value="ON_HOLD">ON_HOLD — Under Inspection / Quality Check</option>
              <option value="INACTIVE">INACTIVE — Discontinued</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>MSME / UDYAM Number</label>
            <input
              type="text"
              value={formData.msmeNumber}
              onChange={(e) => setFormData({ ...formData, msmeNumber: e.target.value.toUpperCase() })}
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
              value={formData.gstin}
              onChange={(e) => handleGstinChange(e.target.value)}
              className={`${inputCls} font-mono uppercase`}
            />
          </div>

          <div>
            <label className={labelCls}>PAN (10 Characters)</label>
            <input
              type="text"
              maxLength={10}
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
              className={`${inputCls} font-mono uppercase`}
            />
          </div>

          <div>
            <label className={labelCls}>2-Digit GST State Code</label>
            <input
              type="text"
              maxLength={2}
              value={formData.billingStateCode}
              onChange={(e) => {
                const sc = e.target.value;
                const stateName = GST_STATE_MAP[sc] || formData.billingState;
                setFormData({ ...formData, billingStateCode: sc, stateCode: sc, billingState: stateName });
              }}
              className={`${inputCls} font-mono`}
            />
            {formData.billingStateCode && GST_STATE_MAP[formData.billingStateCode] && (
              <p className="text-[11px] text-[#7FB706] mt-1 font-medium">State: {GST_STATE_MAP[formData.billingStateCode]}</p>
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
              Address Line 1 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.billingAddressLine1}
              onChange={(e) => setFormData({ ...formData, billingAddressLine1: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>Address Line 2</label>
            <input
              type="text"
              value={formData.billingAddressLine2}
              onChange={(e) => setFormData({ ...formData, billingAddressLine2: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>City *</label>
            <input
              type="text"
              required
              value={formData.billingCity}
              onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>State *</label>
            <input
              type="text"
              required
              value={formData.billingState}
              onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Postal Pincode *</label>
            <input
              type="text"
              maxLength={6}
              inputMode="numeric"
              required
              value={formData.billingPostalCode}
              onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value.replace(/\D/g, '') })}
              className={`${inputCls} font-mono`}
            />
          </div>
        </div>

        {/* Factory / Dispatch Address Toggle */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input
              type="checkbox"
              checked={formData.sameAsBilling}
              onChange={(e) => setFormData({ ...formData, sameAsBilling: e.target.checked })}
              className="w-4 h-4 rounded bg-[#0a0a1a] border-white/20 text-[#7FB706] focus:ring-[#7FB706]"
            />
            <span>Factory &amp; Dispatch Warehouse address is identical to Registered Billing Address</span>
          </label>

          {!formData.sameAsBilling && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Factory / Warehouse Dispatch Address (For pickup &amp; delivery chalan)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2 lg:col-span-3">
                  <input
                    type="text"
                    value={formData.factoryAddressLine1}
                    onChange={(e) => setFormData({ ...formData, factoryAddressLine1: e.target.value })}
                    className={inputCls}
                    placeholder="Factory Line 1: Khasra / Shed No., Industrial Area"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.factoryCity}
                    onChange={(e) => setFormData({ ...formData, factoryCity: e.target.value })}
                    className={inputCls}
                    placeholder="Factory City"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.factoryState}
                    onChange={(e) => setFormData({ ...formData, factoryState: e.target.value })}
                    className={inputCls}
                    placeholder="Factory State"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    value={formData.factoryPostalCode}
                    onChange={(e) => setFormData({ ...formData, factoryPostalCode: e.target.value.replace(/\D/g, '') })}
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
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              className={inputCls}
              placeholder="e.g. HDFC Bank Ltd."
            />
          </div>

          <div>
            <label className={labelCls}>Account Number</label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className={labelCls}>IFSC Code (11 Digits)</label>
            <input
              type="text"
              maxLength={11}
              value={formData.ifscCode}
              onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
              className={`${inputCls} font-mono uppercase`}
            />
          </div>

          <div>
            <label className={labelCls}>Branch Name / City</label>
            <input
              type="text"
              value={formData.branchName}
              onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>UPI ID / VPA</label>
            <input
              type="text"
              value={formData.upiId}
              onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Payment Terms (Days)</label>
            <input
              type="number"
              min="0"
              value={formData.paymentTermsDays}
              onChange={(e) => setFormData({ ...formData, paymentTermsDays: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* 6. Contacts & Communication */}
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
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Designation</label>
              <input
                type="text"
                value={formData.contactDesignation}
                onChange={(e) => setFormData({ ...formData, contactDesignation: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Mobile / Phone</label>
              <input
                type="tel"
                inputMode="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Secondary Contact */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Secondary Contact</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <input
                type="text"
                value={formData.secondaryContactName}
                onChange={(e) => setFormData({ ...formData, secondaryContactName: e.target.value })}
                className={inputCls}
                placeholder="Secondary Contact Name"
              />
            </div>
            <div>
              <input
                type="text"
                value={formData.secondaryContactDesignation}
                onChange={(e) => setFormData({ ...formData, secondaryContactDesignation: e.target.value })}
                className={inputCls}
                placeholder="Designation / Dept"
              />
            </div>
            <div>
              <input
                type="tel"
                inputMode="tel"
                value={formData.secondaryContactPhone}
                onChange={(e) => setFormData({ ...formData, secondaryContactPhone: e.target.value })}
                className={inputCls}
                placeholder="Mobile / WhatsApp"
              />
            </div>
            <div>
              <input
                type="email"
                value={formData.secondaryContactEmail}
                onChange={(e) => setFormData({ ...formData, secondaryContactEmail: e.target.value })}
                className={inputCls}
                placeholder="Email Address"
              />
            </div>
          </div>
        </div>

        {/* General Notes */}
        <div className="pt-3 border-t border-white/5">
          <label className={labelCls}>Special Procurement Notes</label>
          <textarea
            rows={2}
            value={formData.generalNotes}
            onChange={(e) => setFormData({ ...formData, generalNotes: e.target.value })}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>
      </div>

      {/* 7. Action Bar */}
      <div className="sticky bottom-4 z-20 bg-[#121226]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-gray-400 hidden sm:block">
          Updating this supplier will sync their records across Purchase Orders, Material Inwards &amp; Payments.
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to={id ? `/admin/dashboard/vendors/${id}` : '/admin/dashboard/vendors'}
            className="flex-1 sm:flex-none px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition text-sm cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-7 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition text-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Saving Changes...' : 'Save & Update Supplier'}
          </button>
        </div>
      </div>
    </form>
  );
}
