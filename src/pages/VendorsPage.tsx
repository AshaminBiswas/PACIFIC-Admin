import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Search, Plus, Phone, Mail, Building, RefreshCw, X, Eye, Package
} from 'lucide-react';
import { vendorsApi } from '../api/services';
import type { BusinessParty } from '../types/admin';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<BusinessParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vendorType, setVendorType] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
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
  });

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorsApi.listVendors({ page, limit: 15, search, vendorType: vendorType || undefined });
      if (res.data?.data) {
        setVendors(res.data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, vendorType]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
      setShowCreateModal(false);
      fetchVendors();
    } catch (err) {
      console.error('Failed to create vendor:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#7FB706]" />
            Vendor & Supplier Master
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Suppliers of HPL compact boards, stainless steel hardware, aluminium profiles, and nylon components
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search suppliers by name, GSTIN, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>
        <select
          value={vendorType}
          onChange={(e) => setVendorType(e.target.value)}
          className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
        >
          <option value="">All Categories</option>
          <option value="HPL_BOARDS">HPL / Compact Boards</option>
          <option value="HARDWARE">Cubicle Hardware (SS/Nylon)</option>
          <option value="ALUMINIUM">Aluminium Extrusions</option>
          <option value="RAW_MATERIALS">Raw Materials</option>
        </select>
        <button
          onClick={() => fetchVendors()}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl border border-white/5 flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Vendors Table / Cards */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
            Loading suppliers...
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Truck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-white">No suppliers registered</p>
            <p className="text-xs text-gray-500 mt-1">Add your procurement suppliers to issue Purchase Orders.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0e0e1e] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Payment Terms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{v.legalName}</div>
                        {v.tradeName && <div className="text-xs text-gray-500">{v.tradeName}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {v.vendorProfile?.vendorType || 'RAW_MATERIALS'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">{v.gstin || 'N/A'}</td>
                      <td className="py-3 px-4 text-xs">
                        <div>{v.phone || v.contacts?.[0]?.phone || '-'}</div>
                        <div className="text-gray-500">{v.email || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {v.vendorProfile?.paymentTermsDays || 30} Days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden p-4 space-y-3">
              {vendors.map((v) => (
                <div key={v.id} className="bg-[#0d0d1e] border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base">{v.legalName}</h4>
                      <p className="text-xs text-gray-400">GSTIN: {v.gstin || 'N/A'}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/15 text-blue-400">
                      {v.vendorProfile?.vendorType || 'SUPPLIER'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 pt-1 border-t border-white/5 flex items-center justify-between">
                    <span>Terms: {v.vendorProfile?.paymentTermsDays || 30} Days</span>
                    <span>{v.phone || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#7FB706]" /> New Supplier / Vendor
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Supplier Legal Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    placeholder="e.g. Pacific Laminates & Boards Ltd."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Supply Category</label>
                  <select
                    value={formData.vendorType}
                    onChange={(e) => setFormData({ ...formData, vendorType: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="HPL_BOARDS">HPL / Compact Boards</option>
                    <option value="HARDWARE">Cubicle Hardware (SS304/Nylon)</option>
                    <option value="ALUMINIUM">Aluminium Extrusions</option>
                    <option value="RAW_MATERIALS">Raw Materials</option>
                    <option value="FINISHED_GOODS">Finished Goods</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-[#7FB706]"
                    placeholder="07AAAAA0000A1Z5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    placeholder="9818592113"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    placeholder="supplier@pacific.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Factory / Office Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                    placeholder="Plot 12, Industrial Area"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-gray-400">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold text-sm rounded-xl">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
