import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Plus, QrCode, Tag, Layers, RefreshCw, X, Eye
} from 'lucide-react';
import { productsMasterApi } from '../api/services';
import type { Product, ProductCategory, ProductMaterial, ProductFinish, ProductUnit } from '../types/admin';

export default function ProductsMasterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Filter & Form catalogs
  const [materials, setMaterials] = useState<ProductMaterial[]>([]);
  const [finishes, setFinishes] = useState<ProductFinish[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProductQr, setSelectedProductQr] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    hsnSac: '9403',
    categoryId: '',
    materialId: '',
    finishId: '',
    unitId: '',
    thickness: '12mm',
    cuttingSize: '1830 x 1220 mm',
    basePrice: '',
    costPrice: '',
    gstRate: '18',
    description: '',
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsMasterApi.list({ page, limit: 15, search });
      if (res.data?.data) {
        setProducts(res.data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch products master:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
    Promise.all([
      productsMasterApi.getMaterials(),
      productsMasterApi.getFinishes(),
      productsMasterApi.getUnits(),
    ]).then(([mRes, fRes, uRes]) => {
      if (mRes.data?.data) setMaterials(mRes.data.data);
      if (fRes.data?.data) setFinishes(fRes.data.data);
      if (uRes.data?.data) setUnits(uRes.data.data);
    });
  }, [fetchProducts]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await productsMasterApi.create({
        name: formData.name,
        sku: formData.sku || `SKU-${Date.now().toString().slice(-6)}`,
        barcode: formData.barcode,
        hsnSac: formData.hsnSac,
        categoryId: formData.categoryId || 'default-category',
        materialId: formData.materialId || undefined,
        finishId: formData.finishId || undefined,
        unitId: formData.unitId || undefined,
        thickness: formData.thickness,
        cuttingSize: formData.cuttingSize,
        basePrice: formData.basePrice ? Number(formData.basePrice) : undefined,
        costPrice: formData.costPrice ? Number(formData.costPrice) : undefined,
        gstRate: Number(formData.gstRate),
        description: formData.description,
      });
      setShowCreateModal(false);
      fetchProducts();
    } catch (err) {
      console.error('Failed to create product:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-[#7FB706]" />
            Products & Materials Master
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            HPL compact boards, cubicle hardware, aluminium extrusions, finishes, cutting specs, and QR codes
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Product / Material
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by SKU, Product Name, Barcode, HSN/SAC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>
        <button
          onClick={() => fetchProducts()}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-xl border border-white/5 flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
            Loading products master...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-white">No products registered</p>
            <p className="text-xs text-gray-500 mt-1">Add items to the centralized product master for PO and PI reuse.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0e0e1e] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Item Name & SKU</th>
                    <th className="py-3 px-4">HSN/SAC</th>
                    <th className="py-3 px-4">Material & Finish</th>
                    <th className="py-3 px-4">Cutting Size</th>
                    <th className="py-3 px-4">Base Price</th>
                    <th className="py-3 px-4">GST Rate</th>
                    <th className="py-3 px-4 text-right">QR Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-xs font-mono text-[#7FB706]">{p.sku || 'NO-SKU'}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">{p.hsnSac || '9403'}</td>
                      <td className="py-3 px-4 text-xs">
                        <div>{p.material?.name || p.thickness || '-'}</div>
                        <div className="text-gray-500">{p.finish?.name || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">{p.cuttingSize || '-'}</td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {p.basePrice ? `₹ ${Number(p.basePrice).toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-xs">{p.gstRate || 18}%</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedProductQr(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-lg border border-white/5 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-[#7FB706]" /> View QR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden p-4 space-y-3">
              {products.map((p) => (
                <div key={p.id} className="bg-[#0d0d1e] border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.name}</h4>
                      <span className="text-xs font-mono text-[#7FB706]">{p.sku}</span>
                    </div>
                    <button
                      onClick={() => setSelectedProductQr(p)}
                      className="p-1.5 bg-white/5 rounded-lg text-gray-300"
                    >
                      <QrCode className="w-4 h-4 text-[#7FB706]" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 pt-1 border-t border-white/5">
                    <div>HSN: {p.hsnSac || '9403'}</div>
                    <div>GST: {p.gstRate || 18}%</div>
                    <div>Size: {p.cuttingSize || '-'}</div>
                    <div className="font-bold text-white">₹ {Number(p.basePrice || 0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* QR Code Modal */}
      {selectedProductQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl p-6 text-center space-y-4 max-w-sm w-full">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#7FB706] uppercase">Product QR Identifier</span>
              <button onClick={() => setSelectedProductQr(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-base font-bold text-white">{selectedProductQr.name}</h3>
            <p className="text-xs font-mono text-gray-400">SKU: {selectedProductQr.sku}</p>

            <div className="bg-white p-4 rounded-xl inline-block shadow-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `http://localhost:5176/admin/dashboard/products?id=${selectedProductQr.id}`
                )}`}
                alt="Product QR"
                className="w-44 h-44 mx-auto"
              />
            </div>
            <p className="text-[10px] text-gray-500">Scan using the Admin QR Scanner to immediately view specs and inventory.</p>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#7FB706]" /> New Product / Material
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Product / Item Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    placeholder="e.g. 12mm Compact Laminate HPL Sheet"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                    placeholder="PRC-HPL-12MM-01"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">HSN / SAC Code</label>
                  <input
                    type="text"
                    value={formData.hsnSac}
                    onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                    placeholder="9403"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Thickness</label>
                  <input
                    type="text"
                    value={formData.thickness}
                    onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    placeholder="e.g. 12mm, 18mm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Cutting Size</label>
                  <input
                    type="text"
                    value={formData.cuttingSize}
                    onChange={(e) => setFormData({ ...formData, cuttingSize: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                    placeholder="e.g. 1830 x 1220 mm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs text-gray-400">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold text-xs rounded-xl">
                  Save Product Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
