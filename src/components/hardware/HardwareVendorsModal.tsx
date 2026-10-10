import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building2,
  CheckCircle2,
  AlertCircle,
  Package,
  Trash2,
} from 'lucide-react';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import type { HardwareVendor, CreateHardwareVendorInput } from '../../types/admin';

interface HardwareVendorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorsUpdated: () => void;
}

export default function HardwareVendorsModal({
  isOpen,
  onClose,
  onVendorsUpdated,
}: HardwareVendorsModalProps) {
  const [vendors, setVendors] = useState<HardwareVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMaterial, setFilterMaterial] = useState<string>('ALL');

  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(['STAINLESS_STEEL']);

  const loadVendors = async () => {
    setLoading(true);
    try {
      // Eradicate any legacy or cached demo dummy vendors automatically
      await hardwareInventoryApi.purgeDummyData();
      const res = await hardwareInventoryApi.listVendors();
      if (res.data?.data) {
        setVendors(res.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = async (id: string, vendorName: string) => {
    if (!window.confirm(`Are you sure you want to delete vendor "${vendorName}"?`)) {
      return;
    }
    try {
      await hardwareInventoryApi.deleteVendor(id);
      setSuccessMsg(`Vendor "${vendorName}" deleted successfully.`);
      await loadVendors();
      onVendorsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to delete vendor');
    }
  };

  const handleClearAllVendors = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete ALL hardware vendors? This will leave a completely clean slate.'
      )
    ) {
      return;
    }
    try {
      await hardwareInventoryApi.clearAllVendors();
      setSuccessMsg('All hardware vendors removed successfully.');
      await loadVendors();
      onVendorsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to clear vendors');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVendors();
      setError(null);
      setSuccessMsg(null);
      setShowAddForm(false);
    }
  }, [isOpen]);

  const handleToggleMaterial = (mat: string) => {
    if (selectedMaterials.includes(mat)) {
      if (selectedMaterials.length > 1) {
        setSelectedMaterials(selectedMaterials.filter((m) => m !== mat));
      }
    } else {
      setSelectedMaterials([...selectedMaterials, mat]);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError('Vendor business name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Primary phone number is required.');
      return;
    }
    if (selectedMaterials.length === 0) {
      setError('Please select at least one material supplied.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateHardwareVendorInput = {
        name: name.trim(),
        legalName: legalName.trim() || name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstin: gstin.trim().toUpperCase(),
        city: city.trim(),
        address: address.trim(),
        materialCategories: selectedMaterials,
      };

      await hardwareInventoryApi.createVendor(payload);
      setSuccessMsg(`Vendor "${payload.name}" successfully registered!`);

      // Reset form
      setName('');
      setLegalName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setGstin('');
      setCity('');
      setAddress('');
      setSelectedMaterials(['STAINLESS_STEEL']);
      setShowAddForm(false);

      await loadVendors();
      onVendorsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to create vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.gstin && v.gstin.toLowerCase().includes(search.toLowerCase())) ||
      (v.city && v.city.toLowerCase().includes(search.toLowerCase())) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(search.toLowerCase()));

    const matchMaterial =
      filterMaterial === 'ALL' || (v.materialCategories && v.materialCategories.includes(filterMaterial));

    return matchSearch && matchMaterial;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d0b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#7FB706]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Hardware Vendors & Suppliers
              </h2>
              <p className="text-xs text-gray-400">
                Approved vendors supplying SS, Aluminium, and Nylon cubicle fittings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-[#7FB706]/10 border border-[#7FB706]/30 rounded-xl text-[#B5F823] text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search vendor name, GSTIN, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0d0b21] border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <select
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
                className="px-3 py-2 bg-[#0d0b21] border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none"
              >
                <option value="ALL">All Materials</option>
                <option value="STAINLESS_STEEL">Stainless Steel (SS)</option>
                <option value="ALUMINIUM">Aluminium</option>
                <option value="NYLON">Nylon</option>
              </select>
            </div>

            {!showAddForm && (
              <div className="flex items-center gap-2">
                {vendors.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllVendors}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap"
                    title="Delete all vendors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#7FB706]/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add Hardware Vendor
                </button>
              </div>
            )}
          </div>

          {/* Add Vendor Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateVendor}
              className="p-4 sm:p-5 bg-[#0d0b21] border border-[#7FB706]/30 rounded-xl space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-sm font-semibold text-[#B5F823] flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Register New Hardware Vendor
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Vendor Business Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Precision Hardware Ltd"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Trade / Legal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Precision Pvt Ltd"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunil Kumar"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Phone / Mobile <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="vendor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="22AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Delhi, Gurugram, Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Industrial area, road, pincode"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Materials Supplied <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'STAINLESS_STEEL', label: 'Stainless Steel (SS)' },
                      { id: 'ALUMINIUM', label: 'Aluminium' },
                      { id: 'NYLON', label: 'Nylon' },
                      { id: 'FASTENERS', label: 'Screws & Fasteners' },
                    ].map((mat) => {
                      const isSelected = selectedMaterials.includes(mat.id);
                      return (
                        <button
                          key={mat.id}
                          type="button"
                          onClick={() => handleToggleMaterial(mat.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {mat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-[#7FB706]/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : 'Register Vendor'}
                </button>
              </div>
            </form>
          )}

          {/* Vendors List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading vendors...</div>
            ) : filteredVendors.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm border border-dashed border-white/10 rounded-xl space-y-2">
                <Truck className="w-8 h-8 mx-auto text-gray-500 opacity-60" />
                <p className="text-gray-300 font-medium">No hardware vendors registered yet.</p>
                <p className="text-xs text-gray-500">
                  Click &quot;Add Hardware Vendor&quot; above to register your approved suppliers.
                </p>
              </div>
            ) : (
              filteredVendors.map((v) => (
                <div
                  key={v.id}
                  className="p-4 bg-[#0d0b21] border border-white/10 hover:border-[#7FB706]/40 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-white">{v.name}</h4>
                      {v.gstin && (
                        <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-[10px] font-mono rounded">
                          GST: {v.gstin}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      {v.contactPerson && (
                        <span>Contact: <strong className="text-gray-200">{v.contactPerson}</strong></span>
                      )}
                      {v.phone && (
                        <a
                          href={`tel:${v.phone}`}
                          className="flex items-center gap-1 text-[#B5F823] hover:underline"
                        >
                          <Phone className="w-3 h-3" />
                          {v.phone}
                        </a>
                      )}
                      {v.email && (
                        <a
                          href={`mailto:${v.email}`}
                          className="flex items-center gap-1 text-gray-300 hover:text-white"
                        >
                          <Mail className="w-3 h-3" />
                          {v.email}
                        </a>
                      )}
                      {v.city && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <MapPin className="w-3 h-3 text-[#7FB706]" />
                          {v.city}
                        </span>
                      )}
                    </div>

                    {/* Materials badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {v.materialCategories?.map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-0.5 bg-[#7FB706]/10 border border-[#7FB706]/20 text-[#B5F823] text-[10px] font-medium rounded-full"
                        >
                          {cat === 'STAINLESS_STEEL'
                            ? 'SS'
                            : cat === 'ALUMINIUM'
                            ? 'Aluminium'
                            : cat === 'NYLON'
                            ? 'Nylon'
                            : cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-white/5 px-2 py-1 rounded-md">
                        <Package className="w-3 h-3 text-[#7FB706]" />
                        {v.totalSkus || 0} SKUs
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteVendor(v.id, v.name)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title={`Delete ${v.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium">✓ Active Supplier</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0d0b21] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
