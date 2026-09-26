import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Ship } from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type { ExportOrder, ExportPort } from '../../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_export_shipment_v1';

interface ExportShipmentFormData {
  exportOrderId: string;
  shippingLine: string;
  bookingNumber: string;
  vesselName: string;
  voyageNumber: string;
  blAwbNumber: string;
  blType: string;
  blDate: string;
  etd: string;
  eta: string;
  portOfLoadingId: string;
  portOfDestinationId: string;
  freightTerm: string;
  status: string;
  notes: string;
}

const INITIAL_FORM_DATA: ExportShipmentFormData = {
  exportOrderId: '',
  shippingLine: '',
  bookingNumber: '',
  vesselName: '',
  voyageNumber: '',
  blAwbNumber: '',
  blType: 'OCEAN_BL',
  blDate: '',
  etd: '',
  eta: '',
  portOfLoadingId: '',
  portOfDestinationId: '',
  freightTerm: 'PREPAID',
  status: 'PLANNED',
  notes: '',
};

export default function CreateExportShipmentPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [ports, setPorts] = useState<ExportPort[]>([]);

  const [formData, setFormData] = useState<ExportShipmentFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM_DATA, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM_DATA;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
  }, [formData]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [ordRes, portRes] = await Promise.all([
          exportApi.listOrders({ limit: 100 }),
          exportApi.listPorts(),
        ]);
        if (ordRes.data.success && ordRes.data.data) setOrders(ordRes.data.data.items);
        if (portRes.data.success && portRes.data.data) setPorts(portRes.data.data);
      } catch (err) {
        console.error('Failed to load shipment lookups', err);
      }
    };
    loadLookups();
  }, []);

  const handleReset = () => {
    if (window.confirm('Reset this draft? All inputs will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.exportOrderId) {
      alert('Please select an export order');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await exportApi.createShipment(formData);
      if (res.data.success) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        alert(`Created successfully!`);
        navigate('/admin/dashboard/export/shipments');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to create shipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/export/shipments" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Ship className="w-6 h-6 text-[#7FB706]" />
              Plan New Export Shipment
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Vessel details, loading ports, and scheduling</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved in Local Storage</span>
            {lastSavedTime && <span className="text-[11px] opacity-80">({lastSavedTime})</span>}
          </div>
          <button type="button" onClick={handleReset} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Draft</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Core Reference</h3>
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Export Order *</label>
            <select
              required
              value={formData.exportOrderId}
              onChange={(e) => setFormData({ ...formData, exportOrderId: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            >
              <option value="">Select Export Order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.exportOrderNumber} - {o.party?.legalName} ({o.currency} {o.totalOrderValue})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Shipping Line / Carrier</label>
              <input
                type="text"
                placeholder="e.g. Maersk / MSC / CMA CGM"
                value={formData.shippingLine}
                onChange={(e) => setFormData({ ...formData, shippingLine: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Booking Number</label>
              <input
                type="text"
                placeholder="Carrier Booking Ref"
                value={formData.bookingNumber}
                onChange={(e) => setFormData({ ...formData, bookingNumber: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>
        </div>

        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4 mt-6">Vessel & Routing</h3>
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Vessel Name</label>
              <input
                type="text"
                placeholder="e.g. MSC KATRINA"
                value={formData.vesselName}
                onChange={(e) => setFormData({ ...formData, vesselName: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Voyage Number</label>
              <input
                type="text"
                placeholder="e.g. 2408W"
                value={formData.voyageNumber}
                onChange={(e) => setFormData({ ...formData, voyageNumber: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Port of Loading (POL)</label>
              <select
                value={formData.portOfLoadingId}
                onChange={(e) => setFormData({ ...formData, portOfLoadingId: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">Select Origin Port</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.portCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Port of Destination (POD)</label>
              <select
                value={formData.portOfDestinationId}
                onChange={(e) => setFormData({ ...formData, portOfDestinationId: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">Select Destination Port</option>
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.portCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estimated Departure (ETD)</label>
              <input
                type="date"
                value={formData.etd}
                onChange={(e) => setFormData({ ...formData, etd: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Estimated Arrival (ETA)</label>
              <input
                type="date"
                value={formData.eta}
                onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>
        </div>

        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4 mt-6">Bill of Lading</h3>
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Bill of Lading / AWB #</label>
              <input
                type="text"
                placeholder="Master BL Number"
                value={formData.blAwbNumber}
                onChange={(e) => setFormData({ ...formData, blAwbNumber: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Freight Terms</label>
              <select
                value={formData.freightTerm}
                onChange={(e) => setFormData({ ...formData, freightTerm: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="PREPAID">Prepaid</option>
                <option value="COLLECT">Collect</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/export/shipments" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Plan Shipment'}
          </button>
        </div>
      </form>
    </div>
  );
}
