import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Plus, Filter, Printer, ArrowRight,
  CheckCircle2, Clock, Send, Eye, Copy, AlertTriangle, ShieldCheck,
  ChevronRight, RefreshCw, X, UserCheck, Building2, MapPin, Sparkles, Download
} from 'lucide-react';
import { salesQuotationsApi, crmApi, companiesApi } from '../api/services';
import type {
  SalesQuotation, BusinessParty, CompanyProfile,
  QuotationStatus, QuotationContentTemplate
} from '../types/admin';

export default function SalesQuotationsPage() {
  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Entities & Customers lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<SalesQuotation | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<SalesQuotation | null>(null);
  const [revisionReason, setRevisionReason] = useState('');

  // Draft Form State
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState({
    customerId: '',
    companyProfileId: '',
    siteName: '',
    siteAddress: '',
    subject: 'Quotation for Supply of Restroom Cubicle System',
    salutation: 'Dear Sir / Ma’am,',
    validityDays: 30,
    // Staff Sign-off
    staffName: 'Sales Executive',
    staffDesignation: 'Manager - Commercial Sales',
    staffPhone: '+91 98111 22334',
    staffEmail: 'sales@pacificcubicles.com',
    // Narrative clauses
    openingParagraph: 'We thank you for your enquiry regarding toilet cubicle partitions. As per your layout drawing and technical specification, we are pleased to submit our most competitive offer for your kind consideration:',
    closingParagraph: 'We trust you will find our quotation competitive and in order. Looking forward to receiving your valued purchase order. Assuring you of our best quality and prompt services at all times.',
    specificationNotes: '• High Pressure Compact Laminate (HPL) 12mm thickness confirming to IS:2046.\n• Heavy-duty extruded anodized aluminium profiles with 20-25 micron satin black coating.\n• Standard cubicle height 1980mm including 100mm ground clearance for easy drainage.',
    accessoriesNotes: '• Grade A Nylon / Stainless Steel SS 304 hardware package including gravity hinges, privacy thumb-turn indicator locks, coat hooks with rubber buffers, and adjustable support shoeboxes.\n• Note on Stainless Steel: Commercial chemical resistance disclaimer applies in marine/chlorinated environments.',
    isSez: false,
    sezDeclarationNote: '',
    termsAndConditions: '1. Price Basis: Ex-works New Delhi factory.\n2. Taxes: GST as applicable at the time of invoice.\n3. Payment Terms: 50% advance along with PO & drawing sign-off, 50% against Proforma Invoice prior to dispatch.\n4. Delivery: 7 to 10 working days from approval of site measurements.\n5. Unloading: In buyer’s scope at site.\n6. Warranty: 5-Year replacement warranty on cubicle hardware fittings.',
    discountAmount: 0,
    items: [
      {
        serialNumber: 1,
        itemDescription: 'Pacific Restroom Cubicle System (12mm Compact Laminate)',
        specifications: 'Black Nylon Hardware, Standard Dimensions 1000x1500x1980mm',
        quantity: 1,
        unit: 'Unit',
        unitPrice: 18500,
        gstRate: 18,
      },
    ],
  });

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, search };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await salesQuotationsApi.list(params);
      if (res.data?.data) {
        setQuotations(res.data.data.items || []);
        setTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const loadLookups = useCallback(async () => {
    try {
      const [custRes, compRes] = await Promise.all([
        crmApi.listCustomers({ limit: 100 }),
        companiesApi.list(),
      ]);
      if (custRes.data?.data?.items) setCustomers(custRes.data.data.items);
      const companyList = compRes.data?.data;
      if (companyList && companyList.length > 0) {
        setCompanies(companyList);
        if (!formData.companyProfileId) {
          setFormData((prev) => ({ ...prev, companyProfileId: companyList[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load customers/companies:', err);
    }
  }, [formData.companyProfileId]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Customer Selection Auto-fill
  const handleCustomerSelect = (custId: string) => {
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      const addr = cust.addresses?.[0]?.addressLine1 || '';
      const city = cust.addresses?.[0]?.city || '';
      setFormData((prev) => ({
        ...prev,
        customerId: cust.id,
        siteName: `${cust.legalName} Project Site`,
        siteAddress: addr ? `${addr}, ${city}` : '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, customerId: custId }));
    }
  };

  // SEZ toggle
  const handleSezToggle = (isSez: boolean) => {
    const defaultSezNote =
      'SUPPLY MEANT FOR EXPORT/SUPPLY TO SEZ UNIT OR SEZ DEVELOPER FOR AUTHORISED OPERATIONS UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX (LUT Ref: AD070425001234F)';
    setFormData((prev) => ({
      ...prev,
      isSez,
      sezDeclarationNote: isSez ? defaultSezNote : '',
      items: prev.items.map((it) => ({
        ...it,
        gstRate: isSez ? 0 : 18,
      })),
    }));
  };

  // Items math
  const handleItemChange = (index: number, field: string, val: any) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: val };
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
          itemDescription: 'Restroom Divider Panel / Urinal Partition',
          specifications: '12mm Compact Laminate with U-Channel profiles',
          quantity: 1,
          unit: 'Unit',
          unitPrice: 5500,
          gstRate: prev.isSez ? 0 : 18,
        },
      ],
    }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((it, idx) => ({ ...it, serialNumber: idx + 1 })),
    }));
  };

  const calcSubtotal = () => {
    return formData.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  };

  const calcTaxable = () => {
    return Math.max(0, calcSubtotal() - (Number(formData.discountAmount) || 0));
  };

  const calcGstTotal = () => {
    if (formData.isSez) return 0;
    return formData.items.reduce((sum, it) => {
      const lineAmt = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      return sum + lineAmt * ((Number(it.gstRate) || 0) / 100);
    }, 0);
  };

  const calcGrandTotal = () => {
    return calcTaxable() + calcGstTotal();
  };

  // Submit Draft
  const handleCreateQuotation = async () => {
    try {
      if (!formData.customerId) {
        alert('Please select a customer.');
        return;
      }
      if (!formData.companyProfileId) {
        alert('Please select an issuing company.');
        return;
      }

      await salesQuotationsApi.create({
        ...formData,
        discountAmount: Number(formData.discountAmount) || 0,
      });

      setShowCreateModal(false);
      fetchQuotations();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to create quotation');
    }
  };

  // 1-Click Convert to Order
  const handleConvertToOrder = async (quote: SalesQuotation) => {
    if (!confirm(`Convert Quotation ${quote.quotationNumber} into an official Sales Order?`)) return;
    try {
      const res = await salesQuotationsApi.convertToOrder(quote.id);
      alert(`Successfully generated Sales Order: ${res.data?.data?.orderNumber}`);
      fetchQuotations();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Conversion failed');
    }
  };

  // Revision submit
  const handleSubmitRevision = async () => {
    if (!revisionTarget) return;
    try {
      await salesQuotationsApi.revise(revisionTarget.id, {
        reason: revisionReason,
        items: revisionTarget.items,
        discountAmount: revisionTarget.discountAmount,
        termsAndConditions: revisionTarget.termsAndConditions,
      });
      setRevisionTarget(null);
      setRevisionReason('');
      fetchQuotations();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Revision failed');
    }
  };

  // Mark Sent
  const handleMarkSent = async (id: string) => {
    try {
      await salesQuotationsApi.send(id);
      fetchQuotations();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update status');
    }
  };

  // Boilerplate templates
  const applyTemplate = (type: 'STANDARD' | 'SUPPLY_INSTALL' | 'LOCKER') => {
    if (type === 'STANDARD') {
      setFormData((prev) => ({
        ...prev,
        subject: 'Quotation for Supply of Restroom Cubicle System',
        openingParagraph: 'We thank you for your valued enquiry regarding restroom cubicles. We are pleased to submit our formal commercial proposal and pricing as per the project layout:',
        specificationNotes: '• 12mm thick High Pressure Compact Laminate (HPL) boards.\n• Matte Black Powder Coated Aluminium extrusions.\n• Standard cubicle height 1980mm with 100mm ground clearance.',
      }));
    } else if (type === 'SUPPLY_INSTALL') {
      setFormData((prev) => ({
        ...prev,
        subject: 'Quotation for Supply & Installation of Restroom Cubicle System',
        openingParagraph: 'With reference to the site inspection and cubicle layout drawings, we submit our complete turnkey offer for supply, freight, and expert installation at your premises:',
        specificationNotes: '• 12mm Compact Laminate boards with anti-bacterial coating.\n• SS 304 satin finish hardware set (hinges, indicator lock, coat hooks, shoeboxes).\n• Pacific certified technicians to execute installation at site.',
      }));
    } else if (type === 'LOCKER') {
      setFormData((prev) => ({
        ...prev,
        subject: 'Quotation for Supply of Heavy Duty HPL Tier Lockers',
        openingParagraph: 'We thank you for your enquiry for heavy-duty moisture-resistant HPL lockers. Please find our commercial offer below:',
        specificationNotes: '• 12mm HPL carcass and doors with rounded safety edges.\n• Cam key locks with master key system & integrated ventilation slots.\n• Stainless steel continuous piano hinges.',
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Sales Quotation Letters</h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Formal project-specific proposal letters with narrative clauses, SEZ exemption & 1-click order conversion
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setActiveStep(1);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Draft Quotation Letter
        </button>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Total Quotations</div>
          <div className="text-2xl font-bold text-white mt-1">{quotations.length}</div>
          <div className="text-[11px] text-[#7FB706] mt-1 font-mono">PPS/D/26-27/... Series</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Sent to Clients</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {quotations.filter((q) => q.status === 'SENT').length}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Awaiting acceptance</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Converted to Orders</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {quotations.filter((q) => q.status === 'CONVERTED').length}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Active fulfillment pipeline</div>
        </div>
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-gray-400">SEZ Zero-Rated</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {quotations.filter((q) => q.isSez).length}
          </div>
          <div className="text-[11px] text-amber-500/80 mt-1">Statutory LUT compliance</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search quotation reference (e.g. PPS/D/26-27/817), site, or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'CONVERTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[44px] ${
                statusFilter === st
                  ? 'bg-[#7FB706] text-white shadow-md shadow-[#7FB706]/20'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
          <button
            onClick={() => fetchQuotations()}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quotations List: Table on Desktop, Card on Mobile */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading sales quotations...</div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <FileText className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm">No sales quotations found matching criteria</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0a0a1a] text-xs uppercase text-gray-500 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Ref Number</th>
                    <th className="py-3 px-4">Customer & Site</th>
                    <th className="py-3 px-4">Date & Validity</th>
                    <th className="py-3 px-4">Taxable Amount</th>
                    <th className="py-3 px-4">Grand Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-white flex items-center gap-1.5">
                          {q.quotationNumber}
                          {q.revisionNumber > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                              R{q.revisionNumber}
                            </span>
                          )}
                        </div>
                        {q.isSez && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            SEZ 0% IGST
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{q.customer?.legalName || 'N/A'}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {q.siteName || q.siteAddress || 'Site not specified'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div>{new Date(q.date).toLocaleDateString('en-GB')}</div>
                        {q.validUntil && (
                          <div className="text-gray-500 text-[11px]">
                            Valid to {new Date(q.validUntil).toLocaleDateString('en-GB')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-gray-300">
                        ₹ {Number(q.taxableAmount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#7FB706]">
                        ₹ {Number(q.grandTotal).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            q.status === 'CONVERTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : q.status === 'SENT'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : q.status === 'ACCEPTED'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-white/5 text-gray-300'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewQuotation(q)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Preview Letter"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <a
                            href={salesQuotationsApi.getPdfUrl(q.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Print PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </a>

                          {q.status === 'DRAFT' && (
                            <button
                              onClick={() => handleMarkSent(q.id)}
                              className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                              title="Mark Sent to Client"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setRevisionTarget(q);
                              setRevisionReason(`Revision following client comments on ${q.quotationNumber}`);
                            }}
                            className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Create Revision (R+1)"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {q.status !== 'CONVERTED' && (
                            <button
                              onClick={() => handleConvertToOrder(q)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold text-xs cursor-pointer flex items-center gap-1 min-h-[38px]"
                              title="Convert to Sales Order"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Order
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-white/5">
              {quotations.map((q) => (
                <div key={q.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono font-bold text-white flex items-center gap-1.5">
                        {q.quotationNumber}
                        {q.revisionNumber > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                            R{q.revisionNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{q.customer?.legalName}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        q.status === 'CONVERTED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : q.status === 'SENT'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-white/5 text-gray-300'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div>{new Date(q.date).toLocaleDateString('en-GB')}</div>
                    <div className="text-base font-bold text-[#7FB706]">
                      ₹ {Number(q.grandTotal).toLocaleString()}
                    </div>
                  </div>

                  {q.isSez && (
                    <div className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded inline-block">
                      SEZ Exemption (0% IGST)
                    </div>
                  )}

                  {/* Touch Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => setPreviewQuotation(q)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl"
                    >
                      <Eye className="w-4 h-4" /> Letter
                    </button>
                    <a
                      href={salesQuotationsApi.getPdfUrl(q.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl"
                    >
                      <Printer className="w-4 h-4" /> PDF
                    </a>
                    {q.status !== 'CONVERTED' ? (
                      <button
                        onClick={() => handleConvertToOrder(q)}
                        className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Order
                      </button>
                    ) : (
                      <div className="min-h-[44px] flex items-center justify-center text-[11px] text-gray-500 font-semibold">
                        Ordered
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Multi-Step Quotation Drafting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#7FB706]" />
                  Draft Sales Quotation Letter (PPS/D/...)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Formal project-specific proposal letter for client review & sign-off
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Wizard Breadcrumb */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
              {[
                { step: 1, label: '1. Client & Site' },
                { step: 2, label: '2. Staff Sign-off' },
                { step: 3, label: '3. Pricing Table' },
                { step: 4, label: '4. Narrative & T&Cs' },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setActiveStep(s.step as any)}
                  className={`py-2 px-1 rounded-xl transition-all min-h-[44px] flex items-center justify-center ${
                    activeStep === s.step
                      ? 'bg-[#7FB706] text-white shadow-md'
                      : activeStep > s.step
                      ? 'bg-white/10 text-gray-200'
                      : 'bg-white/5 text-gray-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Quick Boilerplate Selector */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#7FB706]" /> Quick Templates:
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('STANDARD')}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg min-h-[36px]"
                >
                  Standard Cubicle
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('SUPPLY_INSTALL')}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg min-h-[36px]"
                >
                  Supply & Installation
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('LOCKER')}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg min-h-[36px]"
                >
                  HPL Lockers
                </button>
              </div>
            </div>

            {/* Step 1: Client & Site */}
            {activeStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Customer (Client Master) *
                    </label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7FB706] min-h-[44px]"
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.legalName} {c.gstin ? `(${c.gstin})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Issuing Company Entity *
                    </label>
                    <select
                      value={formData.companyProfileId}
                      onChange={(e) => setFormData({ ...formData, companyProfileId: e.target.value })}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#7FB706] min-h-[44px]"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.legalName} ({c.taxRegime} - {c.entityCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Site / Project Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DLF Cyber Park, Gurugram"
                      value={formData.siteName}
                      onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
                    >
                    </input>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Site Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tower B, 4th Floor, Phase 2, Gurugram"
                      value={formData.siteAddress}
                      onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Quotation Subject *
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
                    />
                  </div>
                </div>

                {/* SEZ Exemption Banner */}
                <div className="p-4 rounded-xl bg-[#0a0a1a] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="text-sm font-bold text-white">Special Economic Zone (SEZ) Supply</div>
                        <div className="text-xs text-gray-400">
                          Force 0% IGST with statutory LUT/Bond export declaration
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isSez}
                        onChange={(e) => handleSezToggle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7FB706]"></div>
                    </label>
                  </div>

                  {formData.isSez && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                        Statutory LUT / SEZ Declaration Clause:
                      </label>
                      <textarea
                        rows={2}
                        value={formData.sezDeclarationNote}
                        onChange={(e) => setFormData({ ...formData, sezDeclarationNote: e.target.value })}
                        className="w-full bg-[#121226] border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-6 py-2.5 bg-[#7FB706] text-white font-semibold rounded-xl min-h-[44px] flex items-center gap-2 cursor-pointer"
                  >
                    Next: Staff Sign-off <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Staff Sign-off */}
            {activeStep === 2 && (
              <div className="space-y-4">
                <div className="bg-[#0a0a1a] border border-white/10 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#7FB706]" /> Issuing Representative Signature Details
                  </h4>
                  <p className="text-xs text-gray-500">
                    These credentials will appear at the foot of the formal letter.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Signatory Staff Name *</label>
                      <input
                        type="text"
                        value={formData.staffName}
                        onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                        className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Designation</label>
                      <input
                        type="text"
                        value={formData.staffDesignation}
                        onChange={(e) => setFormData({ ...formData, staffDesignation: e.target.value })}
                        className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Direct Phone</label>
                      <input
                        type="text"
                        value={formData.staffPhone}
                        onChange={(e) => setFormData({ ...formData, staffPhone: e.target.value })}
                        className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Direct Email</label>
                      <input
                        type="text"
                        value={formData.staffEmail}
                        onChange={(e) => setFormData({ ...formData, staffEmail: e.target.value })}
                        className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[44px]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-6 py-2.5 bg-[#7FB706] text-white font-semibold rounded-xl min-h-[44px] flex items-center gap-2 cursor-pointer"
                  >
                    Next: Pricing Table <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Pricing Table */}
            {activeStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {formData.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#0a0a1a] border border-white/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#7FB706] font-mono">
                          Item #{item.serialNumber}
                        </span>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-xs text-red-400 hover:text-red-300 p-1 min-h-[36px]"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] text-gray-400 mb-1">Description *</label>
                          <input
                            type="text"
                            value={item.itemDescription}
                            onChange={(e) => handleItemChange(idx, 'itemDescription', e.target.value)}
                            className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">Specifications</label>
                          <input
                            type="text"
                            value={item.specifications}
                            onChange={(e) => handleItemChange(idx, 'specifications', e.target.value)}
                            className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">Unit Rate (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-400 mb-1">GST Rate (%)</label>
                          <input
                            type="number"
                            disabled={formData.isSez}
                            value={item.gstRate}
                            onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                            className="w-full bg-[#121226] border border-white/10 rounded-xl px-3 py-2 text-xs text-white disabled:opacity-50 min-h-[44px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="w-full py-2.5 border-2 border-dashed border-white/10 hover:border-[#7FB706]/40 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" /> Add Line Item
                  </button>
                </div>

                {/* Subtotal & Grand Total Preview */}
                <div className="p-4 rounded-xl bg-[#0a0a1a] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Discount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: Number(e.target.value) })}
                      className="w-28 bg-[#121226] border border-white/10 rounded-lg px-2 py-1 text-xs text-white min-h-[38px]"
                    />
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs mr-2">Taxable:</span>
                      <span className="font-semibold text-white">₹ {calcTaxable().toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs mr-2">GST Total:</span>
                      <span className="font-semibold text-white">₹ {calcGstTotal().toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs mr-2">Grand Total:</span>
                      <span className="text-lg font-bold text-[#7FB706]">
                        ₹ {calcGrandTotal().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[44px]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    className="px-6 py-2.5 bg-[#7FB706] text-white font-semibold rounded-xl min-h-[44px] flex items-center gap-2 cursor-pointer"
                  >
                    Next: Narrative Clauses <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Narrative Clauses & T&Cs */}
            {activeStep === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Opening Covering Paragraph *
                  </label>
                  <textarea
                    rows={2}
                    value={formData.openingParagraph}
                    onChange={(e) => setFormData({ ...formData, openingParagraph: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Attached Technical Specifications (Board & Profiles)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.specificationNotes}
                    onChange={(e) => setFormData({ ...formData, specificationNotes: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Accessories & Hardware Alloy Grade Note
                  </label>
                  <textarea
                    rows={2}
                    value={formData.accessoriesNotes}
                    onChange={(e) => setFormData({ ...formData, accessoriesNotes: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Commercial Terms & Conditions *
                  </label>
                  <textarea
                    rows={4}
                    value={formData.termsAndConditions}
                    onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Closing Paragraph
                  </label>
                  <textarea
                    rows={2}
                    value={formData.closingParagraph}
                    onChange={(e) => setFormData({ ...formData, closingParagraph: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-xs text-white"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[44px]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateQuotation}
                    className="px-6 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Generate Formal Quotation Letter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vector Letter Preview Modal (A4 Vector Embed) */}
      {previewQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a1a]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7FB706]" />
                <span className="font-mono font-bold text-white">
                  {previewQuotation.quotationNumber}
                </span>
                <span className="text-xs text-gray-400">
                  ({previewQuotation.customer?.legalName})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={salesQuotationsApi.getPdfUrl(previewQuotation.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 min-h-[40px]"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </a>
                <button
                  onClick={() => setPreviewQuotation(null)}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-900 p-2 sm:p-4 overflow-hidden">
              <iframe
                src={salesQuotationsApi.getPdfUrl(previewQuotation.id)}
                title="Quotation Letter Preview"
                className="w-full h-full bg-white rounded-lg shadow-2xl border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Revision Dialog */}
      {revisionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-400" />
                Create Revision (R{revisionTarget.revisionNumber + 1})
              </h4>
              <button onClick={() => setRevisionTarget(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              This will increment the quotation to <strong>R{revisionTarget.revisionNumber + 1}</strong> and archive the current version in audit logs.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Revision Reason *</label>
              <textarea
                rows={3}
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="e.g. Added 2 divider panels and adjusted discount as negotiated..."
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevisionTarget(null)}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-xs min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRevision}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs min-h-[44px]"
              >
                Create R{revisionTarget.revisionNumber + 1}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
