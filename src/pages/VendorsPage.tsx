import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, Search, Plus, Phone, Mail, Building, RefreshCw, X, Eye, Package, Trash2, Edit2
} from 'lucide-react';
import { vendorsApi } from '../api/services';
import type { BusinessParty } from '../types/admin';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<BusinessParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vendorType, setVendorType] = useState('');
  const [page, setPage] = useState(1);

  const handleDeleteVendor = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete supplier ${name}? This action cannot be undone.`)) return;
    try {
      await vendorsApi.deleteVendor(id);
      fetchVendors();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete supplier');
    }
  };
  
  
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

        <Link to="/admin/dashboard/vendors/new" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer">
          <Plus className="w-4 h-4" />
          Add Supplier
        </Link>
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
          <option value="HPL_BOARDS">HPL Boards</option>
          <option value="HDF_BOARDS">HDF Boards</option>
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
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Payment Terms</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {vendors.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-center font-mono text-gray-400 text-xs">
                        {(page - 1) * 15 + idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/admin/dashboard/vendors/${v.id}`}
                          className="font-semibold text-white hover:text-[#7FB706] transition-colors"
                        >
                          {v.legalName}
                        </Link>
                        {v.tradeName && <div className="text-xs text-gray-500">{v.tradeName}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
                          {v.vendorProfile?.vendorType === 'HDF_BOARDS' ? 'HDF Boards' : 'HPL Boards'}
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
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/dashboard/vendors/${v.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] text-xs font-semibold rounded-lg border border-[#7FB706]/30 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Link>
                          <Link
                            to={`/admin/dashboard/vendors/${v.id}/edit`}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 cursor-pointer transition-colors"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteVendor(v.id, v.legalName)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer transition-colors"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden p-4 space-y-3">
              {vendors.map((v, idx) => (
                <div key={v.id} className="bg-[#0d0d1e] border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">#{(page - 1) * 15 + idx + 1}</span>
                        <Link
                          to={`/admin/dashboard/vendors/${v.id}`}
                          className="font-bold text-white text-base hover:text-[#7FB706] transition-colors"
                        >
                          {v.legalName}
                        </Link>
                      </div>
                      <p className="text-xs text-gray-400">GSTIN: {v.gstin || 'N/A'}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#7FB706]/15 text-[#7FB706]">
                      {v.vendorProfile?.vendorType === 'HDF_BOARDS' ? 'HDF Boards' : 'HPL Boards'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 pt-1 border-t border-white/5 flex items-center justify-between">
                    <span>Terms: {v.vendorProfile?.paymentTermsDays || 30} Days</span>
                    <span>{v.phone || '-'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                    <Link
                      to={`/admin/dashboard/vendors/${v.id}`}
                      className="col-span-2 min-h-[44px] py-2 bg-[#7FB706]/10 text-[#7FB706] text-xs font-semibold rounded-xl border border-[#7FB706]/30 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                    <Link
                      to={`/admin/dashboard/vendors/${v.id}/edit`}
                      className="col-span-1 min-h-[44px] py-2 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-xl border border-blue-500/20 flex items-center justify-center gap-1 cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteVendor(v.id, v.legalName)}
                      className="col-span-1 min-h-[44px] py-2 bg-red-500/10 text-red-400 text-xs font-semibold rounded-xl border border-red-500/20 flex items-center justify-center gap-1 cursor-pointer"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      
    </div>
  );
}
