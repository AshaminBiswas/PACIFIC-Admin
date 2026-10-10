import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Truck,
  Hash,
} from 'lucide-react';
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
      setStatus(item.status);
      setNotes(item.notes || '');
      setError(null);
    }
  }, [isOpen, item]);

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
