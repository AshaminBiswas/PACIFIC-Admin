import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { hardwareIssueApi, crmApi, salesOrdersApi, companiesApi } from '../api/services';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import BranchSelector from '../components/common/BranchSelector';
import type { BusinessParty, SalesOrder, CompanyProfile } from '../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_hardware_issue_v1';

interface IssueItem {
  serialNumber: number;
  hardwareCatalogItemId: string;
  description: string;
  category: string;
  color: string;
  size: string;
  quantity: number;
  remarks: string;
  isCustomItem: boolean;
  promoteToCatalog: boolean;
}

interface HardwareIssueFormData {
  companyProfileId: string;
  customerId: string;
  orderId: string;
  buyerName: string;
  buyerAddress: string;
  projectName: string;
  storeKeeperName: string;
  items: IssueItem[];
}

const INITIAL_FORM_DATA: HardwareIssueFormData = {
  companyProfileId: '',
  customerId: '',
  orderId: '',
  buyerName: '',
  buyerAddress: '',
  projectName: 'Commercial Cubicle Installation',
  storeKeeperName: 'Store Keeper',
  items: [
    {
      serialNumber: 1,
      hardwareCatalogItemId: '',
      description: 'Gravity Hinges (Grade A Nylon)',
      category: 'Cubicle Hardware',
      color: 'Black',
      size: 'Standard',
      quantity: 10,
      remarks: 'Left & Right pairs',
      isCustomItem: false,
      promoteToCatalog: false,
    },
    {
      serialNumber: 2,
      hardwareCatalogItemId: '',
      description: 'Privacy Indicator Bolt Lock',
      category: 'Cubicle Hardware',
      color: 'Black',
      size: 'Standard',
      quantity: 5,
      remarks: 'Red/Green occupancy dial',
      isCustomItem: false,
      promoteToCatalog: false,
    },
    {
      serialNumber: 3,
      hardwareCatalogItemId: '',
      description: 'Coat Hook with Rubber Buffer',
      category: 'Cubicle Hardware',
      color: 'Black',
      size: 'Standard',
      quantity: 5,
      remarks: '',
      isCustomItem: false,
      promoteToCatalog: false,
    },
  ],
};

export default function CreateHardwareIssuePage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);

  const [formData, setFormData] = useState<HardwareIssueFormData>(() => {
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
    crmApi.listCustomers({ limit: 100 }).then(res => {
      if (res.data?.data?.items) setCustomers(res.data.data.items);
    }).catch(console.error);

    salesOrdersApi.list({ limit: 100 }).then(res => {
      if (res.data?.data?.items) setOrders(res.data.data.items);
    }).catch(console.error);

    companiesApi.list().then(res => {
      const compList = (res.data as any)?.data || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(compList) && compList.length > 0) {
        setCompanies(compList);
        setFormData(prev => {
          if (!prev.companyProfileId) {
            const active = compList.find((c: any) => c.status === 'ACTIVE') || compList[0];
            return { ...prev, companyProfileId: active.id };
          }
          return prev;
        });
      }
    }).catch(console.error);
  }, []);

  const handleReset = () => {
    if (window.confirm('Reset this draft? All inputs will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const updateForm = (field: keyof HardwareIssueFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomerSelect = (custId: string) => {
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setFormData((prev) => ({
        ...prev,
        customerId: cust.id,
        buyerName: cust.legalName,
        buyerAddress: cust.addresses?.[0]?.addressLine1 || '',
        projectName: `${cust.legalName} Restroom Installation`,
      }));
    } else {
      updateForm('customerId', custId);
    }
  };

  const handleOrderSelect = (ordId: string) => {
    const ord = orders.find((o) => o.id === ordId);
    if (ord) {
      setFormData((prev) => ({
        ...prev,
        orderId: ord.id,
        customerId: ord.customerId,
        companyProfileId: ord.companyProfileId || prev.companyProfileId,
        buyerName: ord.customer?.legalName || '',
        buyerAddress: ord.siteAddress || ord.customer?.addresses?.[0]?.addressLine1 || '',
        projectName: ord.siteName || `${ord.customer?.legalName} Installation`,
      }));
    } else {
      updateForm('orderId', ordId);
    }
  };

  const handleIssueItemChange = (idx: number, field: string, val: any) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, items: updated };
    });
  };

  const addIssueItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          serialNumber: prev.items.length + 1,
          hardwareCatalogItemId: '',
          description: 'Adjustable Supporting Leg / Shoebox',
          category: 'Cubicle Hardware',
          color: 'Black',
          size: '100-150mm',
          quantity: 2,
          remarks: '',
          isCustomItem: false,
          promoteToCatalog: false,
        },
      ],
    }));
  };

  const removeIssueItemRow = (idx: number) => {
    setFormData((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== idx).map((it, n) => ({ ...it, serialNumber: n + 1 })),
      };
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.customerId) {
        alert('Please select a customer');
        return;
      }
      setIsSubmitting(true);
      const payload = {
        ...formData,
        companyProfileId: formData.companyProfileId || companies[0]?.id || undefined,
      };
      await hardwareIssueApi.createIssue(payload);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert(`Created successfully!`);
      navigate('/admin/dashboard/issue-lists');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/issue-lists" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Create Hardware Issue</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Issue Hardware Package</p>
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

      {/* ── Document Flow Timeline (Stage 07) ───────────────────── */}
      <DocumentFlowTimeline currentStage={7} />

      {/* ── Dynamic Issuing Branch & Entity Selection ───────── */}
      <BranchSelector
        companies={companies}
        selectedCompanyId={formData.companyProfileId}
        onSelectCompany={(compId) => updateForm('companyProfileId', compId)}
        label="Issuing Branch & Warehouse / Depot"
        sublabel="Select the branch warehouse or factory depot issuing hardware materials to site."
      />

      {/* Form */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Customer & Project Details</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Customer *</label>
            <select
              value={formData.customerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.legalName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Linked Order (Optional)</label>
            <select
              value={formData.orderId}
              onChange={(e) => handleOrderSelect(e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            >
              <option value="">-- Standalone Issue (No Order) --</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>{o.orderNumber} - {o.siteName || o.customer?.legalName}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Project Name *</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => updateForm('projectName', e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Store Keeper Name</label>
            <input
              type="text"
              value={formData.storeKeeperName}
              onChange={(e) => updateForm('storeKeeperName', e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>
          
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Buyer Address</label>
            <textarea
              rows={2}
              value={formData.buyerAddress}
              onChange={(e) => updateForm('buyerAddress', e.target.value)}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-white/10 pb-2 mt-8 mb-4">
          <h3 className="text-sm font-bold text-white">Hardware Items</h3>
          <button
            type="button"
            onClick={addIssueItemRow}
            className="text-xs font-semibold text-[#7FB706] hover:underline"
          >
            + Add Row
          </button>
        </div>

        <div className="space-y-4">
          {formData.items.map((it, idx) => (
            <div key={idx} className="bg-[#0a0a1a] border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-400 text-sm">#{it.serialNumber}</span>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIssueItemRow(idx)}
                    className="text-red-400 text-xs font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Item Description *</label>
                <input
                  type="text"
                  value={it.description}
                  onChange={(e) => handleIssueItemChange(idx, 'description', e.target.value)}
                  className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Category</label>
                  <input
                    type="text"
                    value={it.category}
                    onChange={(e) => handleIssueItemChange(idx, 'category', e.target.value)}
                    className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Size</label>
                  <input
                    type="text"
                    value={it.size}
                    onChange={(e) => handleIssueItemChange(idx, 'size', e.target.value)}
                    className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Color</label>
                  <input
                    type="text"
                    value={it.color}
                    onChange={(e) => handleIssueItemChange(idx, 'color', e.target.value)}
                    className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={it.quantity}
                    onChange={(e) => handleIssueItemChange(idx, 'quantity', Number(e.target.value))}
                    className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Remarks</label>
                <input
                  type="text"
                  value={it.remarks}
                  onChange={(e) => handleIssueItemChange(idx, 'remarks', e.target.value)}
                  className="w-full bg-[#121226] border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-[#7FB706]"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3 mt-6">
          <Link to="/admin/dashboard/issue-lists" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Hardware Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}
