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
} from 'lucide-react';
import { vendorsApi } from '../api/services';

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
    gstin: '',
    pan: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    vendorType: 'HPL_BOARDS',
    paymentTermsDays: '30',
    contactName: '',
    contactDesignation: '',
    contactPhone: '',
    contactEmail: '',
    addressLine1: '',
    addressLine2: '',
    city: 'Kolkata',
    state: 'West Bengal',
    stateCode: '19',
    postalCode: '',
    notes: '',
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
        const billingAddr = v.addresses?.find((a) => a.isDefaultBilling) || v.addresses?.[0];

        setFormData({
          legalName: v.legalName || '',
          tradeName: v.tradeName || '',
          gstin: v.gstin || '',
          pan: v.pan || '',
          email: v.email || '',
          phone: v.phone || '',
          status: v.status || 'ACTIVE',
          vendorType: v.vendorProfile?.vendorType || 'HPL_BOARDS',
          paymentTermsDays: String(v.vendorProfile?.paymentTermsDays || 30),
          contactName: primaryContact?.name || '',
          contactDesignation: primaryContact?.designation || '',
          contactPhone: primaryContact?.phone || '',
          contactEmail: primaryContact?.email || '',
          addressLine1: billingAddr?.addressLine1 || '',
          addressLine2: billingAddr?.addressLine2 || '',
          city: billingAddr?.city || 'Kolkata',
          state: billingAddr?.state || 'West Bengal',
          stateCode: billingAddr?.stateCode || '19',
          postalCode: billingAddr?.postalCode || '',
          notes: v.notes || '',
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

      const payload = {
        legalName: formData.legalName.trim(),
        tradeName: formData.tradeName.trim() || formData.legalName.trim(),
        gstin: formData.gstin ? formData.gstin.toUpperCase().trim() : null,
        pan: formData.pan ? formData.pan.toUpperCase().trim() : null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        status: formData.status,
        notes: formData.notes.trim() || null,
        vendorType: formData.vendorType,
        paymentTermsDays: Number(formData.paymentTermsDays) || 30,
        contacts: formData.contactName.trim()
          ? [
              {
                name: formData.contactName.trim(),
                designation: formData.contactDesignation.trim() || null,
                phone: formData.contactPhone.trim() || null,
                email: formData.contactEmail.trim() || null,
                isPrimary: true,
              },
            ]
          : [],
        addresses: formData.addressLine1.trim()
          ? [
              {
                addressType: 'OFFICE',
                addressLine1: formData.addressLine1.trim(),
                addressLine2: formData.addressLine2.trim() || null,
                city: formData.city.trim() || 'Kolkata',
                state: formData.state.trim() || 'West Bengal',
                stateCode: formData.stateCode.trim() || '19',
                postalCode: formData.postalCode.trim() || null,
                gstin: formData.gstin ? formData.gstin.toUpperCase().trim() : null,
                isDefaultBilling: true,
              },
            ]
          : [],
      };

      await vendorsApi.updateVendor(id, payload);
      alert('Supplier profile updated successfully!');
      navigate(`/admin/dashboard/vendors/${id}`);
    } catch (err: any) {
      console.error('Failed to update supplier:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading supplier editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#09071a] border border-white/10 p-4 sm:p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            to={id ? `/admin/dashboard/vendors/${id}` : '/admin/dashboard/vendors'}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"
            title="Back to Supplier"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-[#7FB706]" />
              Edit Supplier Profile
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Update vendor classification, tax IDs, credit terms & factory coordinates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => navigate(id ? `/admin/dashboard/vendors/${id}` : '/admin/dashboard/vendors')}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-extrabold text-xs shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Company Registration & Tax Identifiers */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Building className="w-4 h-4 text-[#7FB706]" />
            1. Supplier Registration & Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">
                Legal Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                placeholder="e.g. Royal Crown Laminates Pvt Ltd"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Trade / Brand Name</label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                placeholder="e.g. Royal Crown / Stylam / Merino / Balaji"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">GSTIN Number</label>
              <input
                type="text"
                maxLength={15}
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="e.g. 19AAAAA0000A1Z5"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">PAN Number</label>
              <input
                type="text"
                maxLength={10}
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                placeholder="e.g. AAAAA0000A"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Official Procurement Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="sales@royalcrown.com"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Official Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98300 12345"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              >
                <option value="ACTIVE">ACTIVE (Active Supplier)</option>
                <option value="INACTIVE">INACTIVE (Dormant)</option>
                <option value="ON_HOLD">ON_HOLD (Supply Hold)</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Supplier Classification & Commercial Terms */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <CreditCard className="w-4 h-4 text-purple-400" />
            2. Category & Commercial Credit Terms
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Supplier Category</label>
              <select
                value={formData.vendorType}
                onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              >
                <option value="HPL_BOARDS">HPL Compact Boards (Restroom Cubicles)</option>
                <option value="HDF_BOARDS">HDF Compact Boards</option>
                <option value="HARDWARE">SS &amp; Nylon Hardware Accessories</option>
                <option value="ALUMINIUM">Aluminium Extrusions &amp; Channels</option>
                <option value="SS">Stainless Steel (SS 304 / 316)</option>
                <option value="NYLON">High-Impact Polyamide Nylon</option>
                <option value="RAW_MATERIALS">General Raw Materials &amp; Consumables</option>
                <option value="FINISHED_GOODS">Finished Goods / Lockers</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Credit / Payment Terms (Days Net)</label>
              <select
                value={formData.paymentTermsDays}
                onChange={(e) => setFormData({ ...formData, paymentTermsDays: e.target.value })}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              >
                <option value="0">100% Advance Prior to Dispatch</option>
                <option value="15">15 Days Net</option>
                <option value="30">30 Days Net</option>
                <option value="45">45 Days Net</option>
                <option value="60">60 Days Net</option>
                <option value="90">90 Days Net</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Primary Contact Person */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Users className="w-4 h-4 text-sky-400" />
            3. Primary Representative / Contact Person
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Representative Name</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="e.g. Amit Sharma"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Designation</label>
              <input
                type="text"
                value={formData.contactDesignation}
                onChange={(e) => setFormData({ ...formData, contactDesignation: e.target.value })}
                placeholder="e.g. Regional Sales Head / Factory Manager"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Direct Phone</label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+91 98311 55667"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Direct Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="amit@royalcrown.com"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Primary Address / Warehouse */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <MapPin className="w-4 h-4 text-emerald-400" />
            4. Registered Address / Depot Location
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-300 font-medium block mb-1">Street Address Line 1</label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                placeholder="Plot No. 12, Industrial Area, Sector 5"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-gray-300 font-medium block mb-1">Street Address Line 2</label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                placeholder="Near Transport Nagar"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">State Code</label>
              <input
                type="text"
                maxLength={2}
                value={formData.stateCode}
                onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Postal Code (PIN)</label>
              <input
                type="text"
                maxLength={6}
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="700001"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Procurement Notes & Specs */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            Internal Supplier Notes &amp; Material Lead Times
          </h2>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Material grades, stock locations (Kolkata/Delhi depot), standard lead time for indenting..."
            className="w-full bg-[#121029] border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(id ? `/admin/dashboard/vendors/${id}` : '/admin/dashboard/vendors')}
            className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-extrabold text-xs shadow-lg shadow-[#7FB706]/20 transition flex items-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Updating...' : 'Save Supplier Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
