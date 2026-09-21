import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Search, Plus, Filter, Printer, CheckCircle2,
  Clock, ShieldCheck, Eye, ChevronRight, X, UserCheck,
  FileText, RefreshCw, Layers, Edit3, CheckSquare, Sparkles
} from 'lucide-react';
import { hardwareIssueApi, crmApi, salesOrdersApi } from '../api/services';
import type {
  HardwareIssueList, HardwareCatalogItem, BusinessParty, SalesOrder
} from '../types/admin';

export default function HardwareIssuePage() {
  const [activeTab, setActiveTab] = useState<'ISSUES' | 'CATALOG'>('ISSUES');

  // Issues State
  const [issues, setIssues] = useState<HardwareIssueList[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [issuesSearch, setIssuesSearch] = useState('');
  const [issuesPage, setIssuesPage] = useState(1);
  const [issuesTotalPages, setIssuesTotalPages] = useState(1);

  // Catalog State
  const [catalogItems, setCatalogItems] = useState<HardwareCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('ALL');

  // Lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  // Modals
  const [showCreateIssueModal, setShowCreateIssueModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [previewIssue, setPreviewIssue] = useState<HardwareIssueList | null>(null);
  const [signModalIssue, setSignModalIssue] = useState<HardwareIssueList | null>(null);
  const [signRole, setSignRole] = useState<'storeKeeper' | 'packedBy' | 'checkedBy' | 'incharge'>('checkedBy');
  const [signName, setSignName] = useState('');

  // Catalog Item Form
  const [catalogForm, setCatalogForm] = useState({
    id: '',
    name: '',
    category: 'Cubicle Hardware',
    defaultSize: 'Standard',
    defaultColor: 'Black',
    sortOrder: 0,
  });

  // Issue Creation Form
  const [issueForm, setIssueForm] = useState({
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
  });

  const fetchIssues = useCallback(async () => {
    setLoadingIssues(true);
    try {
      const res = await hardwareIssueApi.listIssues({
        page: issuesPage,
        limit: 15,
        search: issuesSearch,
      });
      if (res.data?.data) {
        setIssues(res.data.data.items || []);
        setIssuesTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load issue lists:', err);
    } finally {
      setLoadingIssues(false);
    }
  }, [issuesPage, issuesSearch]);

  const fetchCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const category = catalogCategory !== 'ALL' ? catalogCategory : undefined;
      const res = await hardwareIssueApi.listCatalog(category);
      if (res.data?.data) {
        setCatalogItems(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load hardware catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, [catalogCategory]);

  const loadLookups = useCallback(async () => {
    try {
      const [custRes, ordRes] = await Promise.all([
        crmApi.listCustomers({ limit: 100 }),
        salesOrdersApi.list({ limit: 100 }),
      ]);
      if (custRes.data?.data?.items) setCustomers(custRes.data.data.items);
      if (ordRes.data?.data?.items) setOrders(ordRes.data.data.items);
    } catch (err) {
      console.error('Failed to load lookups:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ISSUES') fetchIssues();
    else fetchCatalog();
  }, [activeTab, fetchIssues, fetchCatalog]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Customer selection auto-fill
  const handleCustomerSelect = (custId: string) => {
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setIssueForm((prev) => ({
        ...prev,
        customerId: cust.id,
        buyerName: cust.legalName,
        buyerAddress: cust.addresses?.[0]?.addressLine1 || '',
        projectName: `${cust.legalName} Restroom Installation`,
      }));
    } else {
      setIssueForm((prev) => ({ ...prev, customerId: custId }));
    }
  };

  // Order selection auto-fill
  const handleOrderSelect = (ordId: string) => {
    const ord = orders.find((o) => o.id === ordId);
    if (ord) {
      setIssueForm((prev) => ({
        ...prev,
        orderId: ord.id,
        customerId: ord.customerId,
        buyerName: ord.customer?.legalName || '',
        buyerAddress: ord.siteAddress || ord.customer?.addresses?.[0]?.addressLine1 || '',
        projectName: ord.siteName || `${ord.customer?.legalName} Installation`,
      }));
    } else {
      setIssueForm((prev) => ({ ...prev, orderId: ordId }));
    }
  };

  // Sign step
  const handleSignStep = async () => {
    if (!signModalIssue || !signName.trim()) {
      alert('Please enter signatory name');
      return;
    }
    try {
      await hardwareIssueApi.signStep(signModalIssue.id, signRole, signName.trim());
      setSignModalIssue(null);
      setSignName('');
      fetchIssues();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Signing failed');
    }
  };

  // Create Catalog Item
  const handleSaveCatalogItem = async () => {
    if (!catalogForm.name.trim()) {
      alert('Item name is required');
      return;
    }
    try {
      if (catalogForm.id) {
        await hardwareIssueApi.updateCatalogItem(catalogForm.id, catalogForm);
      } else {
        await hardwareIssueApi.createCatalogItem(catalogForm);
      }
      setShowCatalogModal(false);
      setCatalogForm({ id: '', name: '', category: 'Cubicle Hardware', defaultSize: 'Standard', defaultColor: 'Black', sortOrder: 0 });
      fetchCatalog();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to save catalog item');
    }
  };

  // Add Item to Issue
  const addIssueItemRow = () => {
    setIssueForm((prev) => ({
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
    if (issueForm.items.length <= 1) return;
    setIssueForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx).map((it, n) => ({ ...it, serialNumber: n + 1 })),
    }));
  };

  const handleIssueItemChange = (idx: number, field: string, val: any) => {
    setIssueForm((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, items: updated };
    });
  };

  const handleCreateIssue = async () => {
    try {
      if (!issueForm.customerId) {
        alert('Please select a customer');
        return;
      }
      await hardwareIssueApi.createIssue(issueForm);
      setShowCreateIssueModal(false);
      fetchIssues();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to create issue list');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Hardware Store Issue Lists</h1>
              <p className="text-xs sm:text-sm text-gray-400">
                44-item hardware catalog, store keeper issuance, and sequential 4-role sign-off
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'ISSUES' ? (
            <button
              onClick={() => setShowCreateIssueModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Issue Hardware Set
            </button>
          ) : (
            <button
              onClick={() => {
                setCatalogForm({ id: '', name: '', category: 'Cubicle Hardware', defaultSize: 'Standard', defaultColor: 'Black', sortOrder: 0 });
                setShowCatalogModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Add Catalog Item
            </button>
          )}
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('ISSUES')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'ISSUES'
              ? 'bg-[#7FB706] text-white shadow-md'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <FileText className="w-4 h-4" />
          Store Issue Lists ({issues.length})
        </button>

        <button
          onClick={() => setActiveTab('CATALOG')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer min-h-[44px] ${
            activeTab === 'CATALOG'
              ? 'bg-[#7FB706] text-white shadow-md'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Master Hardware Catalog ({catalogItems.length} items)
        </button>
      </div>

      {/* TAB 1: Hardware Issue Lists */}
      {activeTab === 'ISSUES' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search issue ref (PPS/HIL/...), buyer name, or project..."
                value={issuesSearch}
                onChange={(e) => {
                  setIssuesSearch(e.target.value);
                  setIssuesPage(1);
                }}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <button
              onClick={() => fetchIssues()}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {/* Issues List Table / Cards */}
          <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
            {loadingIssues ? (
              <div className="p-12 text-center text-gray-400">Loading hardware issue lists...</div>
            ) : issues.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-2">
                <Wrench className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm">No hardware issue lists recorded</p>
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-[#0a0a1a] text-xs uppercase text-gray-500 border-b border-white/5">
                      <tr>
                        <th className="py-3 px-4">Issue Ref</th>
                        <th className="py-3 px-4">Buyer & Project</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Hardware Pieces</th>
                        <th className="py-3 px-4">4-Role Sign-off</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {issues.map((hi) => {
                        const totalPieces = hi.items.reduce((s, it) => s + Number(it.quantity), 0);
                        return (
                          <tr key={hi.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-mono font-semibold text-white">{hi.issueNumber}</div>
                              {hi.order && (
                                <div className="text-xs text-gray-500 font-mono">Order: {hi.order.orderNumber}</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-white">{hi.buyerName}</div>
                              <div className="text-xs text-gray-400">{hi.projectName || 'Site Project'}</div>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {new Date(hi.date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-white">
                              {totalPieces} Pieces ({hi.items.length} SKUs)
                            </td>
                            <td className="py-3 px-4">
                              {/* 4 sequential dots */}
                              <div className="flex items-center gap-1 text-xs">
                                <span title={`Store Keeper: ${hi.storeKeeperName || 'Pending'}`} className={`w-3 h-3 rounded-full ${hi.storeKeeperSignedAt ? 'bg-emerald-500' : 'bg-white/20'}`} />
                                <span title={`Packed by: ${hi.packedByName || 'Pending'}`} className={`w-3 h-3 rounded-full ${hi.packedBySignedAt ? 'bg-emerald-500' : 'bg-white/20'}`} />
                                <span title={`Checked by: ${hi.checkedByName || 'Pending'}`} className={`w-3 h-3 rounded-full ${hi.checkedBySignedAt ? 'bg-emerald-500' : 'bg-white/20'}`} />
                                <span title={`Incharge: ${hi.inchargeName || 'Pending'}`} className={`w-3 h-3 rounded-full ${hi.inchargeSignedAt ? 'bg-emerald-500' : 'bg-white/20'}`} />
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                hi.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {hi.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setPreviewIssue(hi)}
                                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                                  title="Preview Checklist"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a
                                  href={hardwareIssueApi.getPdfUrl(hi.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                                  title="Print PDF"
                                >
                                  <Printer className="w-4 h-4" />
                                </a>
                                {hi.status !== 'VERIFIED' && (
                                  <button
                                    onClick={() => {
                                      setSignModalIssue(hi);
                                      if (!hi.packedBySignedAt) setSignRole('packedBy');
                                      else if (!hi.checkedBySignedAt) setSignRole('checkedBy');
                                      else setSignRole('incharge');
                                    }}
                                    className="px-2 py-1 rounded-lg bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] text-xs font-semibold cursor-pointer min-h-[38px] flex items-center gap-1"
                                    title="Sign Next Role"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" /> Sign
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-white/5">
                  {issues.map((hi) => {
                    const totalPieces = hi.items.reduce((s, it) => s + Number(it.quantity), 0);
                    return (
                      <div key={hi.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-mono font-bold text-white">{hi.issueNumber}</div>
                            <div className="text-xs text-gray-400">{hi.buyerName}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            hi.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {hi.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div>{totalPieces} Pieces ({hi.items.length} SKUs)</div>
                          <div>{new Date(hi.date).toLocaleDateString('en-GB')}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                          <button
                            onClick={() => setPreviewIssue(hi)}
                            className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl"
                          >
                            <Eye className="w-4 h-4" /> Preview
                          </button>
                          {hi.status !== 'VERIFIED' ? (
                            <button
                              onClick={() => {
                                setSignModalIssue(hi);
                                if (!hi.packedBySignedAt) setSignRole('packedBy');
                                else if (!hi.checkedBySignedAt) setSignRole('checkedBy');
                                else setSignRole('incharge');
                              }}
                              className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-[#7FB706]/10 text-[#7FB706] rounded-xl"
                            >
                              <ShieldCheck className="w-4 h-4" /> Sign Step
                            </button>
                          ) : (
                            <a
                              href={hardwareIssueApi.getPdfUrl(hi.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl"
                            >
                              <Printer className="w-4 h-4" /> Print PDF
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Master Hardware Catalog (44 Items) */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-4">
          <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search catalog hardware items (e.g. Gravity Hinge, Toprail, CSK Screw)..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {(['ALL', 'Cubicle Hardware', 'Locker Hardware', 'Toilet Partition Hardware', 'Fasteners', 'Accessories'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCatalogCategory(cat)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
                    catalogCategory === cat
                      ? 'bg-[#7FB706] text-white'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
            {loadingCatalog ? (
              <div className="p-12 text-center text-gray-400">Loading catalog items...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-[#0a0a1a] text-xs uppercase text-gray-500 border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Default Size</th>
                      <th className="py-3 px-4">Default Color</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {catalogItems
                      .filter((c) => !catalogSearch || c.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">{item.name}</td>
                          <td className="py-3 px-4 text-xs text-gray-400">{item.category}</td>
                          <td className="py-3 px-4 text-xs font-mono">{item.defaultSize || '-'}</td>
                          <td className="py-3 px-4 text-xs">{item.defaultColor || '-'}</td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setCatalogForm({
                                  id: item.id,
                                  name: item.name,
                                  category: item.category,
                                  defaultSize: item.defaultSize || '',
                                  defaultColor: item.defaultColor || '',
                                  sortOrder: item.sortOrder || 0,
                                });
                                setShowCatalogModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sequential 4-Role Sign-Off Modal */}
      {signModalIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#7FB706]" /> Sequential Store Sign-off
              </h4>
              <button onClick={() => setSignModalIssue(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Sign off for <strong>{signModalIssue.issueNumber}</strong>. Verification follows storekeeper → packer → checker → incharge.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Select Role to Sign *</label>
                <select
                  value={signRole}
                  onChange={(e) => setSignRole(e.target.value as any)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                >
                  <option value="storeKeeper">1. Store Keeper (Issued by)</option>
                  <option value="packedBy">2. Packed by</option>
                  <option value="checkedBy">3. Checked by</option>
                  <option value="incharge">4. Store Incharge (Verified)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Signatory Name *</label>
                <input
                  type="text"
                  placeholder="Enter full name..."
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSignModalIssue(null)}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-xs min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignStep}
                className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-xs min-h-[44px]"
              >
                Record Sign-off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Item Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#7FB706]" />
                {catalogForm.id ? 'Edit Hardware Item' : 'Add Catalog Item'}
              </h4>
              <button onClick={() => setShowCatalogModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={catalogForm.name}
                  onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                  placeholder="e.g. Gravity Hinge, Toprail Bracket"
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
                <select
                  value={catalogForm.category}
                  onChange={(e) => setCatalogForm({ ...catalogForm, category: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                >
                  <option value="Cubicle Hardware">Cubicle Hardware</option>
                  <option value="Locker Hardware">Locker Hardware</option>
                  <option value="Toilet Partition Hardware">Toilet Partition Hardware</option>
                  <option value="Fasteners">Fasteners</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Default Size</label>
                  <input
                    type="text"
                    value={catalogForm.defaultSize}
                    onChange={(e) => setCatalogForm({ ...catalogForm, defaultSize: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Default Color</label>
                  <input
                    type="text"
                    value={catalogForm.defaultColor}
                    onChange={(e) => setCatalogForm({ ...catalogForm, defaultColor: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-xs min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCatalogItem}
                className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-xs min-h-[44px]"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Issue Modal */}
      {showCreateIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#7FB706]" /> Issue Hardware Package (PPS/HIL/...)
              </h3>
              <button onClick={() => setShowCreateIssueModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Customer *</label>
                  <select
                    value={issueForm.customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.legalName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Linked Order (Optional)</label>
                  <select
                    value={issueForm.orderId}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  >
                    <option value="">-- Standalone / Select Order --</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>{o.orderNumber} - {o.customer?.legalName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={issueForm.projectName}
                    onChange={(e) => setIssueForm({ ...issueForm, projectName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Store Keeper Signatory</label>
                  <input
                    type="text"
                    value={issueForm.storeKeeperName}
                    onChange={(e) => setIssueForm({ ...issueForm, storeKeeperName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Hardware Pieces to Issue
                </span>
                {issueForm.items.map((it, idx) => (
                  <div key={idx} className="p-3 bg-[#0a0a1a] border border-white/10 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-[#7FB706]">Piece #{it.serialNumber}</span>
                      {issueForm.items.length > 1 && (
                        <button type="button" onClick={() => removeIssueItemRow(idx)} className="text-xs text-red-400 p-1">
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => handleIssueItemChange(idx, 'description', e.target.value)}
                        placeholder="Hardware Description"
                        className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                      />
                      <input
                        type="text"
                        value={it.color}
                        onChange={(e) => handleIssueItemChange(idx, 'color', e.target.value)}
                        placeholder="Color (e.g. Black, SS)"
                        className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                      />
                      <input
                        type="text"
                        value={it.size}
                        onChange={(e) => handleIssueItemChange(idx, 'size', e.target.value)}
                        placeholder="Size"
                        className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleIssueItemChange(idx, 'quantity', Number(e.target.value))}
                        placeholder="Quantity"
                        className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                      />
                      <input
                        type="text"
                        value={it.remarks}
                        onChange={(e) => handleIssueItemChange(idx, 'remarks', e.target.value)}
                        placeholder="Remarks / Box Label"
                        className="col-span-2 w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addIssueItemRow}
                  className="w-full py-2 border-2 border-dashed border-white/10 hover:border-[#7FB706]/40 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <Plus className="w-4 h-4" /> Add Hardware Piece
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateIssueModal(false)}
                  className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-xs min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateIssue}
                  className="px-6 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-xs min-h-[44px]"
                >
                  Issue Hardware Checklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vector A4 Printable Preview Modal */}
      {previewIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#7FB706]" />
                <span className="font-mono font-bold text-white">
                  {previewIssue.issueNumber}
                </span>
                <span className="text-xs text-gray-400">
                  ({previewIssue.buyerName})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={hardwareIssueApi.getPdfUrl(previewIssue.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 min-h-[40px]"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </a>
                <button
                  onClick={() => setPreviewIssue(null)}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-900 p-2 sm:p-4 overflow-hidden">
              <iframe
                src={hardwareIssueApi.getPdfUrl(previewIssue.id)}
                title="Hardware Issue List Preview"
                className="w-full h-full bg-white rounded-lg shadow-2xl border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
