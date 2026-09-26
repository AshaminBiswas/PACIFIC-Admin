import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Users,
  Building,
  CreditCard,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { crmApi } from '../api/services';
import type { BusinessParty } from '../types/admin';

export default function EditCustomerPage() {
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
    customerType: 'CONTRACTOR',
    creditLimit: '',
    paymentTermsDays: '30',
    contactName: '',
    contactDesignation: '',
    contactPhone: '',
    contactEmail: '',
    // Billing Address
    billingAddress: '',
    billingAddress2: '',
    billingCity: 'Delhi',
    billingState: 'Delhi',
    billingStateCode: '07',
    billingPostalCode: '',
    // Delivery / Site Address
    sameAsBilling: true,
    deliveryAddress: '',
    deliveryAddress2: '',
    deliveryCity: 'Delhi',
    deliveryState: 'Delhi',
    deliveryStateCode: '07',
    deliveryPostalCode: '',
    notes: '',
  });

  // Load existing customer data
  const loadCustomer = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await crmApi.getCustomerById(id);
      const c = res.data?.data;
      if (c) {
        const primaryContact = c.contacts?.find((ct) => ct.isPrimary) || c.contacts?.[0];
        const billingAddr = c.addresses?.find((a) => a.addressType === 'BILLING' || a.isDefaultBilling) || c.addresses?.[0];
        const shippingAddr = c.addresses?.find((a) => a.addressType === 'SHIPPING' || a.isDefaultShipping);

        const isSame = Boolean(
          !shippingAddr || (
            billingAddr &&
            shippingAddr.addressLine1 === billingAddr.addressLine1 &&
            shippingAddr.city === billingAddr.city &&
            shippingAddr.postalCode === billingAddr.postalCode
          )
        );

        setFormData({
          legalName: c.legalName || '',
          tradeName: c.tradeName || '',
          gstin: c.gstin || '',
          pan: c.pan || '',
          email: c.email || '',
          phone: c.phone || '',
          status: c.status || 'ACTIVE',
          customerType: c.customerProfile?.customerType || 'CONTRACTOR',
          creditLimit: c.customerProfile?.creditLimit != null ? String(c.customerProfile.creditLimit) : '',
          paymentTermsDays: String(c.customerProfile?.paymentTermsDays || 30),
          contactName: primaryContact?.name || '',
          contactDesignation: primaryContact?.designation || '',
          contactPhone: primaryContact?.phone || '',
          contactEmail: primaryContact?.email || '',
          billingAddress: billingAddr?.addressLine1 || '',
          billingAddress2: billingAddr?.addressLine2 || '',
          billingCity: billingAddr?.city || 'Delhi',
          billingState: billingAddr?.state || 'Delhi',
          billingStateCode: billingAddr?.stateCode || '07',
          billingPostalCode: billingAddr?.postalCode || '',
          sameAsBilling: isSame,
          deliveryAddress: shippingAddr?.addressLine1 || billingAddr?.addressLine1 || '',
          deliveryAddress2: shippingAddr?.addressLine2 || billingAddr?.addressLine2 || '',
          deliveryCity: shippingAddr?.city || billingAddr?.city || 'Delhi',
          deliveryState: shippingAddr?.state || billingAddr?.state || 'Delhi',
          deliveryStateCode: shippingAddr?.stateCode || billingAddr?.stateCode || '07',
          deliveryPostalCode: shippingAddr?.postalCode || billingAddr?.postalCode || '',
          notes: c.notes || '',
        });
      } else {
        setError('Customer not found');
      }
    } catch (err: any) {
      console.error('Failed to load customer for editing:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!formData.legalName.trim()) {
      alert('Company Legal Name is required');
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
        customerType: formData.customerType,
        creditLimit: formData.creditLimit ? Number(formData.creditLimit) : null,
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
        addresses: (() => {
          const list = [];
          if (formData.billingAddress.trim()) {
            list.push({
              addressType: 'BILLING',
              addressLine1: formData.billingAddress.trim(),
              addressLine2: formData.billingAddress2.trim() || null,
              city: formData.billingCity.trim() || 'Delhi',
              state: formData.billingState.trim() || 'Delhi',
              stateCode: formData.billingStateCode.trim() || '07',
              postalCode: formData.billingPostalCode.trim() || null,
              gstin: formData.gstin ? formData.gstin.toUpperCase().trim() : null,
              isDefaultBilling: true,
              isDefaultShipping: false,
            });
          }
          const shipLine1 = formData.sameAsBilling
            ? formData.billingAddress.trim()
            : formData.deliveryAddress.trim();
          if (shipLine1) {
            list.push({
              addressType: 'SHIPPING',
              addressLine1: shipLine1,
              addressLine2: formData.sameAsBilling
                ? formData.billingAddress2.trim() || null
                : formData.deliveryAddress2.trim() || null,
              city: formData.sameAsBilling
                ? formData.billingCity.trim() || 'Delhi'
                : formData.deliveryCity.trim() || 'Delhi',
              state: formData.sameAsBilling
                ? formData.billingState.trim() || 'Delhi'
                : formData.deliveryState.trim() || 'Delhi',
              stateCode: formData.sameAsBilling
                ? formData.billingStateCode.trim() || '07'
                : formData.deliveryStateCode.trim() || '07',
              postalCode: formData.sameAsBilling
                ? formData.billingPostalCode.trim() || null
                : formData.deliveryPostalCode.trim() || null,
              gstin: formData.gstin ? formData.gstin.toUpperCase().trim() : null,
              isDefaultBilling: false,
              isDefaultShipping: true,
            });
          }
          return list;
        })(),
      };

      await crmApi.updateCustomer(id, payload);
      alert('Customer profile updated successfully!');
      navigate(`/admin/dashboard/customers/${id}`);
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading customer profile editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#09071a] border border-white/10 p-4 sm:p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            to={id ? `/admin/dashboard/customers/${id}` : '/admin/dashboard/customers'}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"
            title="Back to Customer 360"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-[#7FB706]" />
              Edit Customer Profile
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Update commercial registration, tax IDs, credit limits & address details
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => navigate(id ? `/admin/dashboard/customers/${id}` : '/admin/dashboard/customers')}
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
        {/* Section 1: Company Identification */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Building className="w-4 h-4 text-[#7FB706]" />
            1. Company Registration & Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">
                Legal Registered Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                placeholder="e.g. Acme Infra & Builders Pvt Ltd"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Trade / Brand Name</label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                placeholder="e.g. Acme Infra"
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
                placeholder="e.g. 07AAAAA0000A1Z5"
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
              <label className="text-xs text-gray-300 font-medium block mb-1">Official Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="billing@acme.com"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Official Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
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
                <option value="ACTIVE">ACTIVE (Healthy / Transacting)</option>
                <option value="INACTIVE">INACTIVE (Dormant)</option>
                <option value="ON_HOLD">ON_HOLD (Credit Hold)</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Commercial Terms & Credit Control */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <CreditCard className="w-4 h-4 text-purple-400" />
            2. Commercial Terms & Credit Control
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Customer Classification</label>
              <select
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              >
                <option value="CONTRACTOR">Main Contractor</option>
                <option value="ARCHITECT">Architect / Specifier</option>
                <option value="CORPORATE">Corporate End-User</option>
                <option value="INSTITUTIONAL">Institutional / PSU</option>
                <option value="DEALER">Dealer / Stockist</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Payment Terms (Days Net)</label>
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

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Credit Limit (₹ INR)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                placeholder="Leave blank for unlimited"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Primary Contact Person */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Users className="w-4 h-4 text-sky-400" />
            3. Primary Contact Person
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Designation</label>
              <input
                type="text"
                value={formData.contactDesignation}
                onChange={(e) => setFormData({ ...formData, contactDesignation: e.target.value })}
                placeholder="e.g. Project Manager / Purchase Head"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Mobile / Direct Phone</label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+91 98111 22334"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Direct Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="rajesh@acme.com"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Billing Address */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <MapPin className="w-4 h-4 text-emerald-400" />
            4. Primary Billing Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-300 font-medium block mb-1">Street Address Line 1</label>
              <input
                type="text"
                value={formData.billingAddress}
                onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                placeholder="Plot No. 45, Sector 18, Okhla Industrial Area"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs text-gray-300 font-medium block mb-1">Street Address Line 2</label>
              <input
                type="text"
                value={formData.billingAddress2}
                onChange={(e) => setFormData({ ...formData, billingAddress2: e.target.value })}
                placeholder="Phase III, Near Metro Station"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">City</label>
              <input
                type="text"
                value={formData.billingCity}
                onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">State</label>
              <input
                type="text"
                value={formData.billingState}
                onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">State Code</label>
              <input
                type="text"
                maxLength={2}
                value={formData.billingStateCode}
                onChange={(e) => setFormData({ ...formData, billingStateCode: e.target.value })}
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 font-medium block mb-1">Postal Code (PIN)</label>
              <input
                type="text"
                maxLength={6}
                value={formData.billingPostalCode}
                onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value })}
                placeholder="110020"
                className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#7FB706] min-h-[42px]"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Delivery / Site Shipping Address */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3 gap-2">
            <h2 className="text-sm font-bold text-[#7FB706] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#7FB706]" />
              5. Delivery / Site Shipping Address
            </h2>
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.sameAsBilling}
                onChange={(e) => setFormData({ ...formData, sameAsBilling: e.target.checked })}
                className="w-4 h-4 accent-[#7FB706] rounded cursor-pointer"
              />
              <span className="font-semibold text-white">Delivery address is same as billing address</span>
            </label>
          </div>

          {formData.sameAsBilling ? (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 space-y-1">
              <p className="font-medium text-white">Delivery &amp; Site Dispatch will be routed to the Primary Billing Address:</p>
              <p className="text-gray-300">
                {formData.billingAddress || 'No billing address specified yet'} {formData.billingAddress2 ? `, ${formData.billingAddress2}` : ''}
              </p>
              <p className="text-gray-400">
                {formData.billingCity || 'Delhi'}, {formData.billingState || 'Delhi'} - {formData.billingPostalCode || 'PIN'} (State Code: {formData.billingStateCode || '07'})
              </p>
              <p className="text-[11px] text-gray-500 pt-1">
                Uncheck the box above if the goods/cubicles need to be delivered to a separate project site or depot warehouse.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-300 font-medium block mb-1">Site / Delivery Address Line 1 *</label>
                <input
                  type="text"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  placeholder="e.g. Project Site Gate 3, DLF Cyber City"
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-gray-300 font-medium block mb-1">Delivery Address Line 2 / Landmark</label>
                <input
                  type="text"
                  value={formData.deliveryAddress2}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress2: e.target.value })}
                  placeholder="e.g. Near Basement Unloading Bay"
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] min-h-[42px]"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Delivery City</label>
                <input
                  type="text"
                  value={formData.deliveryCity}
                  onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                  placeholder="Delhi"
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[42px]"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Delivery State</label>
                <input
                  type="text"
                  value={formData.deliveryState}
                  onChange={(e) => setFormData({ ...formData, deliveryState: e.target.value })}
                  placeholder="Delhi"
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706] min-h-[42px]"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">State Code (GST)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.deliveryStateCode}
                  onChange={(e) => setFormData({ ...formData, deliveryStateCode: e.target.value })}
                  placeholder="07"
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#7FB706] min-h-[42px]"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1">Delivery Postal Code (PIN)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.deliveryPostalCode}
                  onChange={(e) => setFormData({ ...formData, deliveryPostalCode: e.target.value })}
                  placeholder="110020"
                  className="w-full bg-[#121029] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#7FB706] min-h-[42px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 6: Notes & Remarks */}
        <div className="bg-[#09071a] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            6. Internal Account Notes
          </h2>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Key client preferences, fabrication requirements, project site restrictions..."
            className="w-full bg-[#121029] border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(id ? `/admin/dashboard/customers/${id}` : '/admin/dashboard/customers')}
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
            {isSubmitting ? 'Updating...' : 'Save Customer Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
