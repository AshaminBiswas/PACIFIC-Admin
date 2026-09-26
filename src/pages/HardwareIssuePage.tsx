import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, Search, Plus, Filter, Printer, CheckCircle2,
  Clock, ShieldCheck, Eye, ChevronRight, X, UserCheck,
  FileText, RefreshCw, Layers, Edit3, CheckSquare, Sparkles, Edit, Trash2
} from 'lucide-react';
import { hardwareIssueApi, crmApi, salesOrdersApi } from '../api/services';
import { useAdminAuth } from '../context/AdminAuthContext';
import DocumentFlowTimelineModal from '../components/common/DocumentFlowTimelineModal';
import type {
  HardwareIssueList, HardwareCatalogItem, BusinessParty, SalesOrder
} from '../types/admin';

export default function HardwareIssuePage() {
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'ISSUES' | 'CATALOG'>('ISSUES');

  // Issues State
  const [issues, setIssues] = useState<HardwareIssueList[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [issuesSearch, setIssuesSearch] = useState('');
  const [issuesPage, setIssuesPage] = useState(1);
  const [issuesTotalPages, setIssuesTotalPages] = useState(1);
  const [selectedIssueForTimeline, setSelectedIssueForTimeline] = useState<HardwareIssueList | null>(null);

  // Edit State
  const [editingIssue, setEditingIssue] = useState<HardwareIssueList | null>(null);
  const [editIssueForm, setEditIssueForm] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Catalog State
  const [catalogItems, setCatalogItems] = useState<HardwareCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('ALL');

  // Lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  // Modals
  const [signModalIssue, setSignModalIssue] = useState<HardwareIssueList | null>(null);
  const [signRole, setSignRole] = useState<string>('');
  const [signName, setSignName] = useState('');
  
  interface CatalogFormState {
    id: string;
    name: string;
    category: string;
    defaultSize: string;
    defaultColor: string;
    sortOrder: number;
  }
  const [catalogForm, setCatalogForm] = useState<CatalogFormState>({ id: '', name: '', category: 'Cubicle Hardware', defaultSize: 'Standard', defaultColor: 'Black', sortOrder: 0 });
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [previewIssue, setPreviewIssue] = useState<HardwareIssueList | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);

  const handleOpenPreview = async (hi: HardwareIssueList) => {
    setPreviewIssue(hi);
    setLoadingPdf(true);
    try {
      const token = localStorage.getItem('pacific_access_token');
      const res = await fetch(hardwareIssueApi.getPdfUrl(hi.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const html = await res.text();
        setPdfHtml(html);
      } else {
        setPdfHtml('<div style="color:red;padding:20px;font-family:sans-serif;">Failed to load Hardware Issue preview</div>');
      }
    } catch (e) {
      console.error('Error loading PDF preview:', e);
      setPdfHtml('<div style="color:red;padding:20px;font-family:sans-serif;">Error connecting to preview service</div>');
    } finally {
      setLoadingPdf(false);
    }
  };

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

  const handleStartEditIssue = (hi: HardwareIssueList) => {
    setEditingIssue(hi);
    setEditIssueForm({
      buyerName: hi.buyerName || '',
      buyerAddress: hi.buyerAddress || '',
      projectName: hi.projectName || '',
      storeKeeperName: hi.storeKeeperName || '',
      packedByName: hi.packedByName || '',
      checkedByName: hi.checkedByName || '',
      inchargeName: hi.inchargeName || '',
      status: hi.status || 'ISSUED',
      items: hi.items ? hi.items.map((it: any) => ({
        id: it.id,
        description: it.description || '',
        category: it.category || 'Cubicle Hardware',
        color: it.color || '',
        size: it.size || '',
        quantity: Number(it.quantity) || 1,
        remarks: it.remarks || '',
      })) : [],
    });
  };

  const handleSaveIssueEdit = async () => {
    if (!editingIssue) return;
    setSavingEdit(true);
    try {
      await hardwareIssueApi.updateIssue(editingIssue.id, editIssueForm);
      setEditingIssue(null);
      fetchIssues();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update Hardware Issue List');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteIssue = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to permanently delete Hardware Issue ${num}? This action cannot be undone.`)) return;
    try {
      await hardwareIssueApi.deleteIssue(id);
      fetchIssues();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete Hardware Issue List');
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
            <Link
              to="/admin/dashboard/issue-lists/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Issue Hardware Set
            </Link>
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
                        <th className="py-3 px-4 text-center w-12">#</th>
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
                      {issues.map((hi, idx) => {
                        const totalPieces = hi.items.reduce((s, it) => s + Number(it.quantity), 0);
                        return (
                          <tr
                            key={hi.id}
                            onClick={() => setSelectedIssueForTimeline(hi)}
                            className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4 text-center font-mono text-gray-400 text-xs">
                              {(issuesPage - 1) * 15 + idx + 1}
                            </td>
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
                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedIssueForTimeline(hi)}
                                  className="p-2 rounded-lg bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] border border-[#7FB706]/30 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors shadow-sm"
                                  title="View Document Flow Timeline (Status & Next Steps)"
                                >
                                  <Layers className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleOpenPreview(hi)}
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
                                <button
                                  onClick={() => handleStartEditIssue(hi)}
                                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                                  title="Edit Issue List"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteIssue(hi.id, hi.issueNumber)}
                                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                                  title="Delete Issue List"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>

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
                  {issues.map((hi, idx) => {
                    const totalPieces = hi.items.reduce((s, it) => s + Number(it.quantity), 0);
                    return (
                      <div key={hi.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">#{(issuesPage - 1) * 15 + idx + 1}</span>
                              <div className="font-mono font-bold text-white">{hi.issueNumber}</div>
                            </div>
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
                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/5">
                          <button
                            onClick={() => setSelectedIssueForTimeline(hi)}
                            className="min-h-[44px] flex items-center justify-center gap-1 text-xs font-semibold bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30 rounded-xl"
                          >
                            <Layers className="w-3.5 h-3.5" /> Flow
                          </button>
                          <button
                            onClick={() => handleOpenPreview(hi)}
                            className="min-h-[44px] flex items-center justify-center gap-1 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
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

                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                          <button
                            onClick={() => handleStartEditIssue(hi)}
                            className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-amber-300 rounded-xl cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteIssue(hi.id, hi.issueNumber)}
                            className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-red-500/10 text-red-400 rounded-xl cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
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
                      <th className="py-3 px-4 text-center w-12">#</th>
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
                      .map((item, idx) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-gray-400 text-xs">{idx + 1}</td>
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
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow && pdfHtml) {
                      printWindow.document.write(pdfHtml);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    } else {
                      window.open(hardwareIssueApi.getPdfUrl(previewIssue.id), '_blank');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 min-h-[40px] cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>
                <button
                  onClick={() => {
                    setPreviewIssue(null);
                    setPdfHtml('');
                  }}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-900 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
              {loadingPdf ? (
                <div className="text-gray-400 text-sm animate-pulse">Loading hardware issue preview...</div>
              ) : (
                <iframe
                  srcDoc={pdfHtml}
                  title="Hardware Issue List Preview"
                  className="w-full h-full bg-white rounded-lg shadow-2xl border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Hardware Issue Modal */}
      {editingIssue && editIssueForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Edit Hardware Issue — <span className="font-mono text-[#7FB706]">{editingIssue.issueNumber}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingIssue(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Buyer / Consignee Name *</label>
                  <input
                    type="text"
                    value={editIssueForm.buyerName}
                    onChange={(e) => setEditIssueForm({ ...editIssueForm, buyerName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={editIssueForm.projectName}
                    onChange={(e) => setEditIssueForm({ ...editIssueForm, projectName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Buyer Address</label>
                <input
                  type="text"
                  value={editIssueForm.buyerAddress}
                  onChange={(e) => setEditIssueForm({ ...editIssueForm, buyerAddress: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Store Keeper</label>
                  <input
                    type="text"
                    value={editIssueForm.storeKeeperName}
                    onChange={(e) => setEditIssueForm({ ...editIssueForm, storeKeeperName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Packed By</label>
                  <input
                    type="text"
                    value={editIssueForm.packedByName}
                    onChange={(e) => setEditIssueForm({ ...editIssueForm, packedByName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Checked By</label>
                  <input
                    type="text"
                    value={editIssueForm.checkedByName}
                    onChange={(e) => setEditIssueForm({ ...editIssueForm, checkedByName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Incharge</label>
                  <input
                    type="text"
                    value={editIssueForm.inchargeName}
                    onChange={(e) => setEditIssueForm({ ...editIssueForm, inchargeName: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Status</label>
                <select
                  value={editIssueForm.status}
                  onChange={(e) => setEditIssueForm({ ...editIssueForm, status: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white"
                >
                  <option value="ISSUED">ISSUED</option>
                  <option value="PACKED">PACKED</option>
                  <option value="CHECKED">CHECKED</option>
                  <option value="VERIFIED">VERIFIED</option>
                </select>
              </div>

              {/* Items Section */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-200">Hardware Items ({editIssueForm.items?.length || 0})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(editIssueForm.items || [])];
                      updated.push({
                        description: '',
                        category: 'Cubicle Hardware',
                        color: 'Black',
                        size: 'Standard',
                        quantity: 1,
                        remarks: '',
                      });
                      setEditIssueForm({ ...editIssueForm, items: updated });
                    }}
                    className="text-xs text-[#7FB706] hover:text-[#90ce08] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Piece
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {editIssueForm.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-[#0a0a1a] border border-white/5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-gray-400">Piece #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editIssueForm.items.filter((_: any, i: number) => i !== idx);
                            setEditIssueForm({ ...editIssueForm, items: updated });
                          }}
                          className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...editIssueForm.items];
                            updated[idx].description = e.target.value;
                            setEditIssueForm({ ...editIssueForm, items: updated });
                          }}
                          className="col-span-1 sm:col-span-2 bg-[#121226] border border-white/10 rounded-lg p-2 text-white text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Category"
                          value={item.category}
                          onChange={(e) => {
                            const updated = [...editIssueForm.items];
                            updated[idx].category = e.target.value;
                            setEditIssueForm({ ...editIssueForm, items: updated });
                          }}
                          className="bg-[#121226] border border-white/10 rounded-lg p-2 text-white text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Color"
                          value={item.color}
                          onChange={(e) => {
                            const updated = [...editIssueForm.items];
                            updated[idx].color = e.target.value;
                            setEditIssueForm({ ...editIssueForm, items: updated });
                          }}
                          className="bg-[#121226] border border-white/10 rounded-lg p-2 text-white text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Size"
                          value={item.size}
                          onChange={(e) => {
                            const updated = [...editIssueForm.items];
                            updated[idx].size = e.target.value;
                            setEditIssueForm({ ...editIssueForm, items: updated });
                          }}
                          className="bg-[#121226] border border-white/10 rounded-lg p-2 text-white text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...editIssueForm.items];
                            updated[idx].quantity = Number(e.target.value) || 1;
                            setEditIssueForm({ ...editIssueForm, items: updated });
                          }}
                          className="bg-[#121226] border border-white/10 rounded-lg p-2 text-white text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Remarks"
                          value={item.remarks}
                          onChange={(e) => {
                            const updated = [...editIssueForm.items];
                            updated[idx].remarks = e.target.value;
                            setEditIssueForm({ ...editIssueForm, items: updated });
                          }}
                          className="bg-[#121226] border border-white/10 rounded-lg p-2 text-white text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-white/10 bg-[#0a0a1a]">
              <button
                type="button"
                onClick={() => setEditingIssue(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveIssueEdit}
                disabled={savingEdit}
                className="px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Flow Timeline Modal for Individual Issue Lists */}
      {selectedIssueForTimeline && (
        <DocumentFlowTimelineModal
          isOpen={!!selectedIssueForTimeline}
          onClose={() => setSelectedIssueForTimeline(null)}
          title="Hardware Store Issue (HIL)"
          stage={7}
          documentRef={selectedIssueForTimeline.issueNumber}
          currentStatus={selectedIssueForTimeline.status}
          statusDescription="Store picklist for 44 cubicle hardware catalog items with sequential 4-role installer sign-off protocol."
          linkedDocs={{
            issueListId: selectedIssueForTimeline.id,
            hilNumber: selectedIssueForTimeline.issueNumber,
            orderId: selectedIssueForTimeline.order?.id,
            orderNumber: selectedIssueForTimeline.order?.orderNumber,
          }}
          primaryDetailUrl={
            selectedIssueForTimeline.order?.id
              ? `/admin/dashboard/sales-orders/${selectedIssueForTimeline.order.id}`
              : undefined
          }
        />
      )}
    </div>
  );
}
