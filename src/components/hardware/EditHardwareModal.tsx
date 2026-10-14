import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Truck,
  Hash,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { uploadImageToImageKit } from '../../lib/imagekit';
import {
  hardwareInventoryApi,
  getAllowedColorsForMaterial,
} from '../../api/hardwareInventoryApi';
import type {
  HardwareInventoryItem,
  HardwareBranch,
  HardwareVendor,
  UpdateHardwareItemInput,
} from '../../types/admin';

interface EditHardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: HardwareInventoryItem | null;
  branches: HardwareBranch[];
  vendors: HardwareVendor[];
}

export default function EditHardwareModal({
  isOpen,
  onClose,
  onSuccess,
  item,
  branches,
  vendors,
}: EditHardwareModalProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [unit, setUnit] = useState("No's");
  const [hsnCode, setHsnCode] = useState('8302');
  const [warehouse, setWarehouse] = useState('DELHI');
  const [vendorId, setVendorId] = useState('');
  const [reorderLevel, setReorderLevel] = useState<string | number>(20);
  const [unitCost, setUnitCost] = useState<string | number>('');
  const [locationRack, setLocationRack] = useState('');
  const [dia, setDia] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [status, setStatus] = useState<HardwareInventoryItem['status']>('ACTIVE');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setSku(item.sku);
      setName(item.name);
      setMaterial(item.material);
      setColor(item.color);
      setUnit(item.unit);
      setHsnCode(item.hsnCode || '8302');
      setWarehouse(item.warehouse);
      setVendorId(item.vendorId || '');
      setReorderLevel(item.reorderLevel);
      setUnitCost(item.unitCost || '');
      setLocationRack(item.locationRack || '');
      setDia(item.dia || '');
      setLength(item.length || '');
      setWidth(item.width || '');
      setImageUrl(item.imageUrl || '');
      setStatus(item.status);
      setNotes(item.notes || '');
      setError(null);
    }
  }, [isOpen, item]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      setError(null);
      const url = await uploadImageToImageKit(file, 'hardware-inventory');
      if (url) {
        setImageUrl(url);
      } else {
        setError('Failed to upload image to ImageKit.');
      }
    } catch (err: any) {
      setError(err.message || 'ImageKit upload failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!isOpen || !item) return null;

  const allowedColors = getAllowedColorsForMaterial(material);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sku.trim()) {
      setError('SKU cannot be empty.');
      return;
    }
    if (!name.trim()) {
      setError('Item name cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedVendor = vendors.find((v) => v.id === vendorId);

      const payload: UpdateHardwareItemInput = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        color: color.trim(),
        unit: unit.trim(),
        hsnCode: hsnCode.trim(),
        warehouse,
        vendorId: vendorId || undefined,
        vendorName: selectedVendor ? selectedVendor.name : undefined,
        reorderLevel: Number(reorderLevel) || 10,
        unitCost: unitCost ? Number(unitCost) : undefined,
        locationRack: locationRack.trim(),
        dia: dia.trim() || undefined,
        length: length.trim() || undefined,
        width: width.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        status,
        notes: notes.trim(),
      };

      await hardwareInventoryApi.update(item.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update hardware item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d0b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#7FB706]">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Edit Hardware Master SKU</h2>
              <p className="text-xs text-gray-400 font-mono">[{item.sku}] {item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                SKU / Part Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Item Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Colour / Finish
              </label>
              <div className="flex flex-wrap gap-2">
                {allowedColors.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColor(col)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      color === col
                        ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                        : 'bg-[#030213] border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                HSN Code
              </label>
              <input
                type="text"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Branch / Warehouse
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Vendor / Supplier
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="">-- No Vendor Selected --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Unit of Measurement
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="No's">No's</option>
                <option value="Meters">Meters</option>
                <option value="Set's">Set's</option>
                <option value="Pairs">Pairs</option>
                <option value="Pcs">Pcs</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE (In Stock)</option>
                <option value="LOW_STOCK">LOW STOCK</option>
                <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                <option value="DISCONTINUED">DISCONTINUED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Unit Cost (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Bin / Rack No.</label>
              <input
                type="text"
                value={locationRack}
                onChange={(e) => setLocationRack(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Diameter (Dia) <span className="text-gray-500 font-normal text-[10px]">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 25mm, 32mm"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Length <span className="text-gray-500 font-normal text-[10px]">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 100mm, 150mm, 2.4m"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Width <span className="text-gray-500 font-normal text-[10px]">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 50mm, 100mm"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs font-mono focus:outline-none"
              />
            </div>

            {/* Product Image / Photo via ImageKit */}
            <div className="sm:col-span-2 p-3 bg-[#030213] border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#7FB706]" />
                  Product Photo <span className="text-gray-500 font-normal text-[10px]">(ImageKit CDN)</span>
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-[10px] text-red-400 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-[#7FB706]/40"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-4 h-4 opacity-40" />
                  </div>
                )}
                <div className="flex-1 space-y-1.5">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs rounded-lg transition-colors">
                    <Upload className="w-3 h-3 text-[#B5F823]" />
                    <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    placeholder="Or paste image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-2.5 py-1 bg-black/40 border border-white/10 focus:border-[#7FB706] rounded text-white text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 mb-1">Notes / Specifications</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-xl text-white text-xs focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Update Hardware SKU'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
