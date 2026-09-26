import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { packingListsApi, salesOrdersApi, crmApi } from '../api/services';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import type { SalesOrder, BusinessParty } from '../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_packing_list_v1';

interface PackingListItem {
  serialNumber: number;
  description: string;
  size: string;
  designNo: string;
  quantity: number;
  noOfPackets: number;
  natureOfPacket: string;
}

interface PackingListFormData {
  orderId: string;
  customerId: string;
  companyProfileId: string;
  isStandalone: boolean;
  autoExplodeBom: boolean;
  consignorName: string;
  consignorAddress: string;
  shipToName: string;
  shipToAddress: string;
  siteContactName: string;
  siteContactPhone: string;
  checkedByName: string;
  authorisedSignatoryName: string;
  items: PackingListItem[];
}

const INITIAL_FORM_DATA: PackingListFormData = {
  orderId: '',
  customerId: '',
  companyProfileId: '',
  isStandalone: false,
  autoExplodeBom: true,
  consignorName: 'M/s. Pacific Products & Solutions',
  consignorAddress: 'H-3, JR Complex, Mela Ram Farm, Mandoli, New Delhi-110093',
  shipToName: '',
  shipToAddress: '',
  siteContactName: '',
  siteContactPhone: '',
  checkedByName: 'Warehouse Dispatch Team',
  authorisedSignatoryName: 'Pacific Authorised Signatory',
  items: [
    {
      serialNumber: 1,
      description: 'Door Panel',
      size: '600x1785mm',
      designNo: '1120 SD',
      quantity: 5,
      noOfPackets: 3,
      natureOfPacket: 'Board',
    },
    {
      serialNumber: 2,
      description: 'Divider Panel',
      size: '1500x1800mm',
      designNo: '1120 SD',
      quantity: 5,
      noOfPackets: 3,
      natureOfPacket: 'Board',
    },
  ],
};

export default function CreatePackingListPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<BusinessParty[]>([]);

  const [formData, setFormData] = useState<PackingListFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM_DATA, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM_DATA;
  });

  const loadLookups = useCallback(async () => {
    try {
      const [ordRes, custRes] = await Promise.all([
        salesOrdersApi.list({ limit: 100 }),
        crmApi.listCustomers({ limit: 100 }),
      ]);
      if (ordRes.data?.data?.items) setOrders(ordRes.data.data.items);
      if (custRes.data?.data?.items) setCustomers(custRes.data.data.items);
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
  }, [formData]);

  const handleOrderSelect = (ordId: string) => {
    const ord = orders.find((o) => o.id === ordId);
    if (ord) {
      setFormData((prev) => ({
        ...prev,
        orderId: ord.id,
        customerId: ord.customerId,
        companyProfileId: ord.companyProfileId,
        shipToName: ord.customer?.legalName || '',
        shipToAddress: ord.siteAddress || ord.customer?.addresses?.[0]?.addressLine1 || '',
        siteContactName: ord.customer?.contacts?.[0]?.name || '',
        siteContactPhone: ord.customer?.contacts?.[0]?.phone || '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, orderId: ordId }));
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset this draft? All inputs will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const handleItemChange = (idx: number, field: keyof PackingListItem, val: any) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, items: updated };
    });
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          serialNumber: prev.items.length + 1,
          description: 'Accessory / Hardware Kit',
          size: 'Standard',
          designNo: 'Black',
          quantity: 1,
          noOfPackets: 1,
          natureOfPacket: 'Corrugated Box',
        },
      ],
    }));
  };

  const removeItemRow = (idx: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx).map((it, n) => ({ ...it, serialNumber: n + 1 })),
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.orderId && !formData.isStandalone) {
        alert('Please select a linked Sales Order. If this is a standalone dispatch (sample/replacement), please check "Standalone Dispatch".');
        return;
      }
      if (!formData.customerId) {
        alert('Please select a customer.');
        return;
      }

      setIsSubmitting(true);
      await packingListsApi.create(formData);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      navigate('/admin/dashboard/packing-lists');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to generate packing list');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/packing-lists" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Generate Packing List</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Component BOM explosion & packet nature classification</p>
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

      {/* ── Document Flow Timeline (Stage 05 / 06) ──────────────── */}
      <DocumentFlowTimeline currentStage={5} />

      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="p-4 rounded-xl bg-[#0a0a1a] border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2">Order Selection</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Linked Sales Order *</label>
              <select
                value={formData.orderId}
                disabled={formData.isStandalone}
                onChange={(e) => handleOrderSelect(e.target.value)}
                className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] disabled:opacity-40 w-full min-h-[44px]"
              >
                <option value="">-- Select Sales Order --</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} - {o.customer?.legalName} ({o.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Recipient Customer *</label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.legalName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isStandalone}
                onChange={(e) => setFormData({ ...formData, isStandalone: e.target.checked })}
                className="rounded border-white/20 text-[#7FB706]"
              />
              <span>Standalone Dispatch (Sample / Replacement without PO)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoExplodeBom}
                onChange={(e) => setFormData({ ...formData, autoExplodeBom: e.target.checked })}
                className="rounded border-white/20 text-[#7FB706]"
              />
              <span>Auto-explode Standard Cubicle BOM</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Ship-To Name / Consignee</label>
            <input
              type="text"
              value={formData.shipToName}
              onChange={(e) => setFormData({ ...formData, shipToName: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Ship-To Delivery Address</label>
            <input
              type="text"
              value={formData.shipToAddress}
              onChange={(e) => setFormData({ ...formData, shipToAddress: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Site Contact Person</label>
            <input
              type="text"
              value={formData.siteContactName}
              onChange={(e) => setFormData({ ...formData, siteContactName: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Site Contact Mobile</label>
            <input
              type="text"
              value={formData.siteContactPhone}
              onChange={(e) => setFormData({ ...formData, siteContactPhone: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
            <h3 className="text-sm font-bold text-white">Dispatched Components & Packet Types</h3>
            <span className="text-[11px] text-gray-500">
              Total: {formData.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} pcs
            </span>
          </div>

          {formData.items.map((it, idx) => (
            <div key={idx} className="p-4 bg-[#0a0a1a] border border-white/10 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#7FB706]">Item #{it.serialNumber}</span>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="text-xs text-red-400 p-1 flex items-center gap-1 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={it.description}
                  onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                  placeholder="Description (e.g. Door Panel)"
                  className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                />
                <input
                  type="text"
                  value={it.size}
                  onChange={(e) => handleItemChange(idx, 'size', e.target.value)}
                  placeholder="Size (e.g. 600x1785mm)"
                  className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                />
                <input
                  type="text"
                  value={it.designNo}
                  onChange={(e) => handleItemChange(idx, 'designNo', e.target.value)}
                  placeholder="Design No / Color (e.g. 1120 SD)"
                  className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">No. of Packets</label>
                  <input
                    type="number"
                    min="1"
                    value={it.noOfPackets || ''}
                    onChange={(e) => handleItemChange(idx, 'noOfPackets', Number(e.target.value))}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Packet Nature</label>
                  <select
                    value={it.natureOfPacket}
                    onChange={(e) => handleItemChange(idx, 'natureOfPacket', e.target.value)}
                    className="bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
                  >
                    <option value="Board">Board</option>
                    <option value="Channel">Channel</option>
                    <option value="Corrugated Box">Corrugated Box</option>
                    <option value="Bundle">Bundle</option>
                    <option value="Wooden Crate">Wooden Crate</option>
                    <option value="Loose Packet">Loose Packet</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addItemRow}
            className="w-full py-3 border-2 border-dashed border-white/10 hover:border-[#7FB706]/40 text-gray-400 hover:text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px] transition"
          >
            <Plus className="w-4 h-4" /> Add Component Line Item
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Dispatch Checked By *</label>
            <input
              type="text"
              value={formData.checkedByName}
              onChange={(e) => setFormData({ ...formData, checkedByName: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Authorised Signatory *</label>
            <input
              type="text"
              value={formData.authorisedSignatoryName}
              onChange={(e) => setFormData({ ...formData, authorisedSignatoryName: e.target.value })}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] w-full min-h-[44px]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link to="/admin/dashboard/packing-lists" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Packing List'}
          </button>
        </div>
      </div>
    </div>
  );
}
