import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, ArrowLeft, Save, Plus, Trash2, RefreshCw,
  AlertTriangle, RotateCcw, Sparkles, ShieldCheck, Wrench, CheckCircle2, Layers,
} from 'lucide-react';
import { salesQuotationsApi } from '../api/salesQuotationsApi';
import { crmApi } from '../api/crmApi';
import { companiesApi } from '../api/companyApi';
import { productCatalogApi } from '../api/productCatalogApi';
import {
  getMergedQuotationModels,
  formatModelHardwareInclusions,
  extractModelDimensions,
} from '../utils/quotationProductPresets';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import type { BusinessParty, CompanyProfile, ProductCatalogModel } from '../types/admin';

export interface CreateItem {
  modelId?: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  boardType?: 'HPL' | 'HDF' | string;
  cubicleSize?: string;
  boardColor?: string;
  boardThickness?: string;
  doorSize?: string;
  overallHeight?: string;
  hardwarePackage?: string;
}

export interface CreateFormData {
  customerId: string;
  companyProfileId: string;
  recipientSalutation: string;
  recipientName: string;
  recipientCompany: string;
  recipientAddress: string;
  recipientEmail: string;
  recipientPhone: string;
  projectName: string;
  subject: string;
  title: string;
  validUntil: string;
  validityDays: number;
  installationCharge: number;
  freightTerms: string;
  freightAmount: number;
  gstRate: number;
  isSezExempt: boolean;
  sezCertificateRef: string;
  paymentTerms: string;
  deliveryTerms: string;
  warrantyText: string;
  accessoriesText: string;
  generalTerms: string;
  otherTerms: string;
  notes: string;
  selectedHardwarePreset: string;
  items: CreateItem[];
}

const LOCAL_STORAGE_KEY = 'pacific_create_quotation_v2';

export const HARDWARE_PRESETS = [
  {
    id: 'SS_304',
    name: 'SS 304 Stainless Steel',
    label: 'SS 304 Satin Finish',
    badge: 'Most Popular',
    itemSpec: 'SS 304 Stainless Steel (Satin/Brushed)',
    accessoriesText:
      '• Gravity Hinges: Self-closing SS 304 stainless steel gravity hinges with nylon cam mechanism.\n• Indicator Lock: SS 304 surface-mounted privacy lock with external red/white occupancy indicator and emergency release.\n• Supporting Shoe/Legs: SS 304 adjustable height support legs (100mm to 150mm ground clearance).\n• Coat Hook: SS 304 heavy-duty coat hook with integrated rubber door buffer.\n• Fasteners: Grade 304 stainless steel tamper-proof screws and expanding anchors.',
  },
  {
    id: 'NYLON_BLACK',
    name: 'Black Polyamide Nylon',
    label: 'Grade A Nylon',
    badge: 'High Impact',
    itemSpec: 'Grade A Black Polyamide Nylon',
    accessoriesText:
      '• Gravity Hinges: High-impact engineered Black Polyamide Nylon (Grade 6) self-closing hinges.\n• Indicator Lock: Ergonomic nylon privacy bolt lock with color-coded occupancy indicator and emergency release.\n• Supporting Shoe/Legs: Heavy-duty adjustable nylon support feet (100mm to 150mm floor clearance).\n• Coat Hook: Color-matched polyamide nylon coat hook with rubber shock absorber.\n• Fasteners: High-tensile fasteners with nylon finishing caps.',
  },
  {
    id: 'SS_316',
    name: 'SS 316 Marine Grade',
    label: 'SS 316 Marine',
    badge: 'Coastal & Pool',
    itemSpec: 'SS 316 Marine Grade Stainless Steel',
    accessoriesText:
      '• Premium Grade 316 Austenitic Stainless Steel hardware package.\n• Specifically engineered for coastal, high-humidity, marine, and chlorinated swimming pool environments.\n• Includes SS 316 heavy-duty self-closing hinges, indicator thumb-turn lock, adjustable shoe plinths, and coat hooks.\n• Maximum corrosion resistance against saline atmospheres and aggressive cleaning chemicals.',
  },
  {
    id: 'ALUMINIUM',
    name: 'Aluminium Heavy-Duty',
    label: 'Aluminium Alloy',
    badge: 'Architectural Grade',
    itemSpec: 'Aluminium Satin / Black Anodised',
    accessoriesText:
      '• Architectural extruded Grade 6063-T6 Aluminium alloy hardware in Satin Silver Anodised or Black Matte finish.\n• Heavy-duty continuous aluminium U-channels and top rail headrail system.\n• Complementary matching indicator lock and self-closing pivot hinge hardware set.',
  },
];

const INITIAL_FORM_STATE: CreateFormData = {
  customerId: '',
  companyProfileId: '',
  recipientSalutation: 'Mr.',
  recipientName: '',
  recipientCompany: '',
  recipientAddress: '',
  recipientEmail: '',
  recipientPhone: '',
  projectName: '',
  subject: 'Quotation for Supply of Restroom Cubicle System',
  title: 'Quotation for Supply of Restroom Cubicle System',
  validUntil: '',
  validityDays: 30,
  installationCharge: 0,
  freightTerms: 'Extra as Actual / To pay',
  freightAmount: 0,
  gstRate: 18,
  isSezExempt: false,
  sezCertificateRef: '',
  paymentTerms: '50% Advance along with confirmed Purchase Order. Balance 50% prior to dispatch.',
  deliveryTerms: '2-3 weeks from receipt of advance, approved shop drawings, and color confirmation.',
  warrantyText: 'We provide ten (10) years of warranty for partitions against any moisture-related defects and one (1) year warranty for workmanship and hardware against manufacturing defects.',
  accessoriesText: HARDWARE_PRESETS[0].accessoriesText,
  generalTerms: '1. Price Basis: Ex-works New Delhi factory.\n2. Taxes: GST as applicable at the time of invoice.\n3. Unloading & Safe Storage: In buyer’s scope at site.\n4. Site Readiness: Finished floor level and plumb walls required prior to installation.',
  otherTerms: '',
  notes: '',
  selectedHardwarePreset: 'SS_304',
  items: [
    {
      description: 'Pacific Restroom Cubicle System (12mm Compact Laminate)',
      unit: 'NOS',
      quantity: 1,
      rate: 18500,
      boardType: 'HPL',
      cubicleSize: '1000mm W × 1500mm D',
      boardColor: 'D.No. 123 – Oyster White',
      boardThickness: '12mm',
      doorSize: '600mm × 1785mm',
      overallHeight: '1980mm (incl. 100mm ground clearance)',
      hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
    },
  ],
};

export default function DraftQuotationPage() {
  const navigate = useNavigate();

  // Lookup dependencies
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [catalogModels, setCatalogModels] = useState<ProductCatalogModel[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const cubicleModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Cubicle'),
    [catalogModels]
  );
  const lockerModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Lockers'),
    [catalogModels]
  );
  const urinalModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Urinal Partitions'),
    [catalogModels]
  );

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Initialize form with local storage draft or clean initial state
  const [form, setForm] = useState<CreateFormData>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_FORM_STATE,
          ...parsed,
          items: Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : INITIAL_FORM_STATE.items,
        };
      }
    } catch (e) {
      console.error('Failed to load draft from localStorage', e);
    }
    return INITIAL_FORM_STATE;
  });

  // Auto-save draft to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(form));
      setLastSaved(new Date());
    } catch (e) {
      console.error('Failed to save draft to localStorage', e);
    }
  }, [form]);

  // Load Customers, Company Profiles & Product Catalog Models
  const loadLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const [custRes, compRes, modelsList] = await Promise.all([
        crmApi.listCustomers({ limit: 100 }),
        companiesApi.list(),
        productCatalogApi.listModels().catch(() => []),
      ]);
      if (custRes.data?.data?.items) {
        setCustomers(custRes.data.data.items);
      }
      const companyList = compRes.data?.data;
      if (companyList && companyList.length > 0) {
        setCompanies(companyList);
        setForm((prev) => ({
          ...prev,
          companyProfileId: prev.companyProfileId || companyList[0].id,
        }));
      }
      setCatalogModels(modelsList || []);
    } catch (err) {
      console.error('Failed to load customers or companies:', err);
      setCatalogModels([]);
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Customer Selection Auto-fill
  const handleCustomerSelect = (custId: string) => {
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      const addr = cust.addresses?.[0]?.addressLine1 || '';
      const city = cust.addresses?.[0]?.city || '';
      const fullAddr = addr ? (city ? `${addr}, ${city}` : addr) : '';
      setForm((f) => ({
        ...f,
        customerId: cust.id,
        recipientName: cust.contactName || cust.contacts?.[0]?.name || cust.legalName,
        recipientCompany: cust.tradeName || cust.legalName || '',
        recipientAddress: fullAddr,
        recipientEmail: cust.email || '',
        recipientPhone: cust.phone || '',
        projectName: f.projectName || `${cust.legalName} Restroom Project`,
      }));
    } else {
      setForm((f) => ({ ...f, customerId: custId }));
    }
    clearFieldError('customerId');
    clearFieldError('recipientName');
    clearFieldError('projectName');
  };

  // Hardware Preset Selection
  const applyHardwarePreset = (presetId: string) => {
    const preset = HARDWARE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      selectedHardwarePreset: preset.id,
      accessoriesText: preset.accessoriesText,
      items: f.items.map((it) => ({
        ...it,
        hardwarePackage: it.hardwarePackage || preset.itemSpec,
      })),
    }));
  };

  // Quick Boilerplate Presets
  const applyBoilerplatePreset = (type: 'STANDARD' | 'URINAL_PARTITION' | 'LOCKER') => {
    if (type === 'STANDARD') {
      setForm((f) => ({
        ...f,
        subject: 'Quotation for Supply of Restroom Cubicle System',
        title: 'Quotation for Supply of Restroom Cubicle System',
        items: [
          {
            description: 'Pacific Restroom Cubicle System (12mm Compact Laminate)',
            unit: 'NOS',
            quantity: 1,
            rate: 18500,
            boardType: 'HPL',
            cubicleSize: '1000mm W × 1500mm D',
            boardColor: 'D.No. 123 – Oyster White',
            boardThickness: '12mm',
            doorSize: '600mm × 1785mm',
            overallHeight: '1980mm (incl. 100mm ground clearance)',
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
        ],
      }));
    } else if (type === 'URINAL_PARTITION') {
      setForm((f) => ({
        ...f,
        subject: 'Quotation for Supply of Urinal Privacy Partition Panels',
        title: 'Quotation for Supply of Urinal Privacy Partition Panels',
        items: [
          {
            description: 'Solid Compact Laminate Urinal Privacy Divider Screen',
            unit: 'NOS',
            quantity: 1,
            rate: 5500,
            boardType: 'HPL',
            cubicleSize: '450mm W × 900mm H',
            boardColor: 'D.No. 123 – Oyster White',
            boardThickness: '12mm',
            doorSize: 'N/A',
            overallHeight: '900mm (wall-mounted with 300mm floor clearance)',
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
        ],
      }));
    } else if (type === 'LOCKER') {
      setForm((f) => ({
        ...f,
        subject: 'Quotation for Supply of Heavy Duty HPL Tier Lockers',
        title: 'Quotation for Supply of Heavy Duty HPL Tier Lockers',
        items: [
          {
            description: 'Heavy-Duty Moisture-Resistant HPL Tier Lockers (12mm Carcass & Doors)',
            unit: 'SET',
            quantity: 1,
            rate: 32000,
            boardType: 'HPL',
            cubicleSize: '300mm W × 450mm D × 1800mm H',
            boardColor: 'D.No. 123 – Oyster White',
            boardThickness: '12mm',
            doorSize: 'Tier Configuration as per drawing',
            overallHeight: '1800mm (plus 100mm plinth base)',
            hardwarePackage: 'SS 304 Continuous Piano Hinges & Cam Locks',
          },
        ],
      }));
    }
  };

  // Line item handlers
  const handleItemChange = (idx: number, field: keyof CreateItem, val: any) => {
    setForm((f) => {
      const next = [...f.items];
      next[idx] = { ...next[idx], [field]: val };
      return { ...f, items: next };
    });
  };

  // Handle Model Selection for line item (Auto-fetches dimensions & hardware list)
  const handleSelectModel = (idx: number, modelId: string) => {
    if (!modelId) {
      handleItemChange(idx, 'modelId', '');
      return;
    }
    if (modelId === 'CUSTOM') {
      handleItemChange(idx, 'modelId', 'CUSTOM');
      return;
    }

    const selected = catalogModels.find((m) => m.id === modelId || m.slug === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);
    const hwText = formatModelHardwareInclusions(selected);

    setForm((f) => {
      const nextItems = [...f.items];
      nextItems[idx] = {
        ...nextItems[idx],
        modelId: selected.id,
        description: `Pacific ${selected.title} (${selected.category})`,
        cubicleSize: dims.cubicleSize,
        doorSize: dims.doorSize,
        overallHeight: dims.overallHeight,
        boardThickness: dims.boardThickness,
        boardType: dims.boardType,
        hardwarePackage: dims.hardwarePackage,
      };

      // Auto-fetch and replace "Standard Inclusions & Hardware Accessories *"
      return {
        ...f,
        accessoriesText: hwText,
        items: nextItems,
      };
    });

    clearFieldError(`item_${idx}_desc`);
  };

  const addItem = () => {
    const defaultHardware = HARDWARE_PRESETS.find((p) => p.id === form.selectedHardwarePreset)?.itemSpec || 'SS 304 Stainless Steel (Satin/Brushed)';
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          description: '',
          unit: 'NOS',
          quantity: 1,
          rate: 0,
          boardType: 'HPL',
          cubicleSize: '1000mm W × 1500mm D',
          boardColor: 'D.No. 123 – Oyster White',
          boardThickness: '12mm',
          doorSize: '600mm × 1785mm',
          overallHeight: '1980mm (incl. 100mm ground clearance)',
          hardwarePackage: defaultHardware,
        },
      ],
    }));
  };

  const removeItem = (idx: number) => {
    if (form.items.length <= 1) return;
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  // Reset Draft
  const resetDraft = () => {
    if (window.confirm('Are you sure you want to reset this quotation form? All unsaved inputs in local storage will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setForm({
        ...INITIAL_FORM_STATE,
        companyProfileId: companies[0]?.id || '',
      });
      setFieldErrors({});
    }
  };

  // Live Math Computations
  const basicPrice = form.items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
    0
  );
  const installationCharge = Number(form.installationCharge) || 0;
  const freightAmount = Number(form.freightAmount) || 0;
  const gstRate = form.isSezExempt ? 0 : Number(form.gstRate) || 18;

  const taxable = basicPrice + installationCharge + (form.freightTerms === 'Fixed' || (form.freightTerms === 'Extra as Actual / To pay' && freightAmount > 0) ? freightAmount : 0);
  const gstAmount = form.isSezExempt ? 0 : Math.round(taxable * (gstRate / 100) * 100) / 100;
  const grandTotal = Math.round(taxable + gstAmount);

  // Field validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.customerId) {
      errs.customerId = 'Please select a customer from Client Master.';
    }

    if (!form.recipientName.trim()) {
      errs.recipientName = 'Contact / Recipient name is required.';
    } else if (form.recipientName.trim().length < 2) {
      errs.recipientName = 'Contact name must be at least 2 characters.';
    }

    if (form.recipientEmail && form.recipientEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.recipientEmail.trim())) {
        errs.recipientEmail = 'Please enter a valid email address (e.g. client@company.com).';
      }
    }

    if (form.recipientPhone && form.recipientPhone.trim()) {
      const phoneRegex = /^[+0-9\s-]{7,20}$/;
      if (!phoneRegex.test(form.recipientPhone.trim())) {
        errs.recipientPhone = 'Please enter a valid phone number (7-20 digits).';
      }
    }

    if (!form.projectName.trim()) {
      errs.projectName = 'Project name is required.';
    } else if (form.projectName.trim().length < 2) {
      errs.projectName = 'Project name must be at least 2 characters.';
    }

    if (form.isSezExempt && !form.sezCertificateRef.trim()) {
      errs.sezCertificateRef = 'SEZ Certificate Reference / LUT Ref is required when SEZ zero-rated GST is active.';
    }

    if (form.installationCharge < 0) {
      errs.installationCharge = 'Installation charge cannot be negative.';
    }

    if (form.freightAmount < 0) {
      errs.freightAmount = 'Freight amount cannot be negative.';
    }

    if (form.items.length === 0) {
      errs.items = 'At least one line item is required.';
    } else {
      form.items.forEach((it, idx) => {
        if (!it.description.trim()) {
          errs[`item_${idx}_desc`] = `Item #${idx + 1} description is required.`;
        }
        if (Number(it.quantity) <= 0) {
          errs[`item_${idx}_qty`] = `Item #${idx + 1} quantity must be greater than 0.`;
        }
        if (Number(it.rate) < 0) {
          errs[`item_${idx}_rate`] = `Item #${idx + 1} rate cannot be negative.`;
        }
      });
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('Please fill in all required fields and correct the errors marked in red.');
      return;
    }

    setSaving(true);
    try {
      const customer = customers.find((c) => c.id === form.customerId);

      const res = await salesQuotationsApi.create({
        customerId: form.customerId,
        companyProfileId: form.companyProfileId || companies[0]?.id,
        recipientSalutation: form.recipientSalutation,
        recipientName: form.recipientName,
        recipientCompany: form.recipientCompany || customer?.tradeName || customer?.legalName || '',
        recipientAddress: form.recipientAddress || customer?.addresses?.[0]?.addressLine1 || '',
        recipientEmail: form.recipientEmail || customer?.email || '',
        recipientPhone: form.recipientPhone || customer?.phone || '',
        projectName: form.projectName,
        subject: form.subject || 'Submission of Commercial Offer for Supply of Toilet Cubicles',
        title: form.title || 'Quotation for Supply of Toilet Cubicles',
        validUntil: form.validUntil || undefined,
        validityDays: Number(form.validityDays) || 30,
        installationCharge: Number(form.installationCharge) || 0,
        freightTerms: form.freightTerms,
        freightAmount: Number(form.freightAmount) || 0,
        gstRate: Number(form.gstRate) || 18,
        isSezExempt: Boolean(form.isSezExempt),
        sezCertificateRef: form.sezCertificateRef || undefined,
        paymentTerms: form.paymentTerms,
        deliveryTerms: form.deliveryTerms,
        warrantyText: form.warrantyText,
        accessoriesText: form.accessoriesText,
        generalTerms: form.generalTerms,
        otherTerms: form.otherTerms,
        items: form.items.map((it, idx) => ({
          serialNumber: idx + 1,
          description: it.description,
          unit: it.unit || 'NOS',
          quantity: Number(it.quantity),
          rate: Number(it.rate),
          amount: Number(it.quantity) * Number(it.rate),
          boardType: it.boardType || 'HPL',
          cubicleSize: it.cubicleSize || undefined,
          boardColor: it.boardColor || undefined,
          boardThickness: it.boardThickness || undefined,
          doorSize: it.doorSize || undefined,
          overallHeight: it.overallHeight || undefined,
          hardwarePackage: it.hardwarePackage || undefined,
          customSpecsJson: {
            hardwarePackage: it.hardwarePackage || undefined,
            boardType: it.boardType || 'HPL',
          },
        })),
      });

      localStorage.removeItem(LOCAL_STORAGE_KEY);
      const newRef = res.data?.data?.referenceNumber || res.data?.data?.quotationNumber || '';
      alert(`Quotation created successfully! Ref: ${newRef}`);
      navigate('/admin/dashboard/sales-quotations');
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to create quotation');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#7FB706] transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-400 mb-1';
  const getInputCls = (key: string) =>
    fieldErrors[key]
      ? 'w-full bg-[#0a0a1a] border border-red-500 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-400 transition-colors'
      : inputCls;

  if (loadingLookups) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading client master and company entities...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/admin/dashboard/sales-quotations"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quotations List
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2.5 rounded-xl bg-[#7FB706]/10 text-[#7FB706]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Create Sales Quotation</h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Commercial proposal with technical specifications &amp; precision pricing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-gray-500 hidden sm:block">
              Draft saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Discard draft and reset form"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-[#7FB706]/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Creating Quotation...' : 'Create Quotation'}
          </button>
        </div>
      </div>

      {/* ── Document Flow Timeline (Stage 01) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={1}
        advanceInfo={{
          grandTotal,
          advanceRequired: Math.round(grandTotal * 0.5),
          advancePaymentStatus: 'DRAFT',
        }}
      />

      {/* Live Total Banner */}
      <div className="bg-[#121226] border border-[#7FB706]/20 rounded-2xl px-5 py-3.5 flex flex-wrap items-center gap-4 text-sm shadow-md">
        <div className="text-gray-400">
          Basic: <span className="text-white font-mono font-semibold">₹ {basicPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        {installationCharge > 0 && (
          <div className="text-gray-400">
            Installation: <span className="text-white font-mono font-semibold">₹ {installationCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {freightAmount > 0 && (
          <div className="text-gray-400">
            Freight: <span className="text-white font-mono font-semibold">₹ {freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="text-gray-400">
          GST {form.isSezExempt ? '(0% SEZ)' : `${gstRate}%`}:{' '}
          <span className="text-white font-mono font-semibold">₹ {gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="ml-auto font-bold text-[#7FB706] text-base sm:text-lg font-mono">
          Total: ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* Quick Boilerplate Presets */}
      <div className="p-3.5 rounded-2xl bg-[#121226] border border-white/5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
          <Sparkles className="w-4 h-4 text-[#7FB706]" /> Quick Boilerplate Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('STANDARD')}
            className="px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg min-h-[36px] transition cursor-pointer"
          >
            Standard Cubicle
          </button>
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('URINAL_PARTITION')}
            className="px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg min-h-[36px] transition cursor-pointer"
          >
            Urinal Partition
          </button>
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('LOCKER')}
            className="px-3 py-1.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg min-h-[36px] transition cursor-pointer"
          >
            Hpl Locker
          </button>
        </div>
      </div>

      {/* Customer & Company Entity Selection */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Client Master &amp; Issuing Entity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Customer (Client Master) *</label>
            <select
              value={form.customerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className={getInputCls('customerId')}
              required
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legalName} {c.gstin ? `(${c.gstin})` : ''}
                </option>
              ))}
            </select>
            {fieldErrors.customerId && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.customerId}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Issuing Company Profile *</label>
            <select
              value={form.companyProfileId}
              onChange={(e) => setForm((f) => ({ ...f, companyProfileId: e.target.value }))}
              className={inputCls}
              required
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.legalName} ({c.taxRegime || 'GST'} - {c.entityCode || 'PPS'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 1: Recipient Details */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Recipient Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Salutation</label>
            <select
              value={form.recipientSalutation}
              onChange={(e) => setForm((f) => ({ ...f, recipientSalutation: e.target.value }))}
              className={inputCls}
            >
              {['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'M/s.', 'Sir/Madam'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Contact Name *</label>
            <input
              type="text"
              value={form.recipientName}
              onChange={(e) => {
                setForm((f) => ({ ...f, recipientName: e.target.value }));
                clearFieldError('recipientName');
              }}
              placeholder="Full name of recipient"
              className={getInputCls('recipientName')}
              required
            />
            {fieldErrors.recipientName && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.recipientName}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Company / Organization</label>
            <input
              type="text"
              value={form.recipientCompany}
              onChange={(e) => setForm((f) => ({ ...f, recipientCompany: e.target.value }))}
              placeholder="Company name"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input
              type="text"
              value={form.recipientAddress}
              onChange={(e) => setForm((f) => ({ ...f, recipientAddress: e.target.value }))}
              placeholder="Billing / project address"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={form.recipientEmail}
              onChange={(e) => {
                setForm((f) => ({ ...f, recipientEmail: e.target.value }));
                clearFieldError('recipientEmail');
              }}
              placeholder="contact@company.com"
              className={getInputCls('recipientEmail')}
            />
            {fieldErrors.recipientEmail && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.recipientEmail}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input
              type="text"
              value={form.recipientPhone}
              onChange={(e) => {
                setForm((f) => ({ ...f, recipientPhone: e.target.value }));
                clearFieldError('recipientPhone');
              }}
              placeholder="+91 98765 43210"
              className={getInputCls('recipientPhone')}
            />
            {fieldErrors.recipientPhone && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.recipientPhone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Project & Validity */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Project &amp; Validity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Project Name *</label>
            <input
              type="text"
              value={form.projectName}
              onChange={(e) => {
                setForm((f) => ({ ...f, projectName: e.target.value }));
                clearFieldError('projectName');
              }}
              placeholder="e.g. Restroom Cubicles – XYZ Mall"
              className={getInputCls('projectName')}
              required
            />
            {fieldErrors.projectName && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.projectName}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Valid Until</label>
            <input
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Subject Line</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Submission of Commercial Offer..."
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Quotation Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Quotation for Supply of Toilet Cubicles"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Pricing Options */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Pricing Options</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Installation Charge (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.installationCharge}
              onChange={(e) => {
                setForm((f) => ({ ...f, installationCharge: Number(e.target.value) || 0 }));
                clearFieldError('installationCharge');
              }}
              className={getInputCls('installationCharge')}
            />
            {fieldErrors.installationCharge && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.installationCharge}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Freight Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.freightAmount}
              onChange={(e) => {
                setForm((f) => ({ ...f, freightAmount: Number(e.target.value) || 0 }));
                clearFieldError('freightAmount');
              }}
              className={getInputCls('freightAmount')}
            />
            {fieldErrors.freightAmount && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.freightAmount}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Freight Terms</label>
            <select
              value={form.freightTerms}
              onChange={(e) => setForm((f) => ({ ...f, freightTerms: e.target.value }))}
              className={inputCls}
            >
              {['Extra as Actual / To pay', 'Fixed', 'Included', 'FOB', 'CIF'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>GST Rate (%)</label>
            <select
              value={form.gstRate}
              onChange={(e) => setForm((f) => ({ ...f, gstRate: Number(e.target.value) }))}
              disabled={form.isSezExempt}
              className={inputCls + (form.isSezExempt ? ' opacity-40 cursor-not-allowed' : '')}
            >
              {[0, 5, 12, 18, 28].map((r) => (
                <option key={r} value={r}>{r}%</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id="createSezToggle"
            checked={form.isSezExempt}
            onChange={(e) => setForm((f) => ({ ...f, isSezExempt: e.target.checked }))}
            className="w-4 h-4 accent-[#7FB706] cursor-pointer"
          />
          <label htmlFor="createSezToggle" className="text-sm text-gray-300 cursor-pointer">
            SEZ Zero-Rated (0% IGST — statutory supply under Bond / LUT)
          </label>
        </div>

        {form.isSezExempt && (
          <div>
            <label className={labelCls}>SEZ Certificate Reference / LUT Ref *</label>
            <input
              type="text"
              value={form.sezCertificateRef}
              onChange={(e) => {
                setForm((f) => ({ ...f, sezCertificateRef: e.target.value }));
                clearFieldError('sezCertificateRef');
              }}
              placeholder="e.g. LUT Ref: AD070425001234F / Form-I Ref"
              className={getInputCls('sezCertificateRef')}
              required
            />
            {fieldErrors.sezCertificateRef && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.sezCertificateRef}</p>
            )}
          </div>
        )}
      </div>

      {/* Section 4: Line Items */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h3 className="text-sm font-bold text-white">Line Items</h3>
            {fieldErrors.items && (
              <p className="text-xs text-red-400 mt-0.5">{fieldErrors.items}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              addItem();
              clearFieldError('items');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] rounded-lg text-xs font-bold cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        {form.items.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No line items yet. Click &quot;Add Item&quot; to configure cubicle partitions.
          </div>
        )}

        <div className="space-y-4">
          {form.items.map((item, idx) => (
            <div key={idx} className="bg-[#0a0a1a] border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#7FB706]">Item #{idx + 1}</span>
                {form.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className={labelCls}>Product Model Selection &amp; Description *</label>
                    <span className="text-[11px] text-[#7FB706] font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Auto-fetches hardware list, sizes &amp; height
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <select
                        value={item.modelId || ''}
                        onChange={(e) => handleSelectModel(idx, e.target.value)}
                        className={inputCls + ' bg-[#161536] border-[#7FB706]/40 text-white font-semibold'}
                      >
                        <option value="">-- Choose Product Model --</option>
                        {cubicleModels.length > 0 && (
                          <optgroup label="Restroom Cubicles (13 Models)">
                            {cubicleModels.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {lockerModels.length > 0 && (
                          <optgroup label="Modular Lockers (7 Models)">
                            {lockerModels.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {urinalModels.length > 0 && (
                          <optgroup label="Urinal Partitions (4 Models)">
                            {urinalModels.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="CUSTOM">Custom / Manual Description</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          handleItemChange(idx, 'description', e.target.value);
                          clearFieldError(`item_${idx}_desc`);
                        }}
                        placeholder="Description (auto-filled on model select)"
                        className={getInputCls(`item_${idx}_desc`)}
                        required
                      />
                    </div>
                  </div>
                  {fieldErrors[`item_${idx}_desc`] && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_desc`]}</p>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Unit</label>
                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    className={inputCls}
                  >
                    {['NOS', 'SET', 'SQM', 'MTR', 'RMT', 'LOT'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Quantity *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => {
                      handleItemChange(idx, 'quantity', Number(e.target.value) || 0);
                      clearFieldError(`item_${idx}_qty`);
                    }}
                    className={getInputCls(`item_${idx}_qty`)}
                    required
                  />
                  {fieldErrors[`item_${idx}_qty`] && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_qty`]}</p>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Rate (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => {
                      handleItemChange(idx, 'rate', Number(e.target.value) || 0);
                      clearFieldError(`item_${idx}_rate`);
                    }}
                    className={getInputCls(`item_${idx}_rate`)}
                    required
                  />
                  {fieldErrors[`item_${idx}_rate`] && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_rate`]}</p>
                  )}
                </div>
              </div>

              {/* Cubicle Technical Specifications */}
              <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>⚙️</span> Cubicle Technical Specifications
                  </span>
                  <span className="text-[11px] text-gray-400">Board type, dimensions &amp; colors</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Board Type *</label>
                    <select
                      value={item.boardType || 'HPL'}
                      onChange={(e) => handleItemChange(idx, 'boardType', e.target.value)}
                      className={inputCls}
                    >
                      <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                      <option value="HDF">HDF (High Density Fibreboard)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Board Thickness</label>
                    <input
                      type="text"
                      value={item.boardThickness || ''}
                      onChange={(e) => handleItemChange(idx, 'boardThickness', e.target.value)}
                      placeholder="e.g. 12mm / 18mm"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Board Color</label>
                    <input
                      type="text"
                      value={item.boardColor || ''}
                      onChange={(e) => handleItemChange(idx, 'boardColor', e.target.value)}
                      placeholder="e.g. D.No. 123 – Oyster White"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cubicle Size</label>
                    <input
                      type="text"
                      value={item.cubicleSize || ''}
                      onChange={(e) => handleItemChange(idx, 'cubicleSize', e.target.value)}
                      placeholder="e.g. 1000mm W × 1500mm D"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Door Size</label>
                    <input
                      type="text"
                      value={item.doorSize || ''}
                      onChange={(e) => handleItemChange(idx, 'doorSize', e.target.value)}
                      placeholder="e.g. 600mm × 1785mm"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Overall Height</label>
                    <input
                      type="text"
                      value={item.overallHeight || ''}
                      onChange={(e) => handleItemChange(idx, 'overallHeight', e.target.value)}
                      placeholder="e.g. 1980mm (incl. 100mm ground clearance)"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>


              <div className="text-right text-xs text-gray-400 font-mono pt-1">
                Line Total: <span className="font-bold text-white text-sm">
                  ₹ {((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Hardware Selection Option & Inclusions */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#7FB706]" />
            <h3 className="text-sm font-bold text-white">Standard Inclusions &amp; Hardware Accessories</h3>
          </div>
          <span className="text-xs text-gray-400">Select standard hardware package to populate technical specs</span>
        </div>

        {/* Quick Hardware Package Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {HARDWARE_PRESETS.map((preset) => {
            const isSelected = form.selectedHardwarePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyHardwarePreset(preset.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                  isSelected
                    ? 'bg-[#7FB706]/15 border-[#7FB706] text-white shadow-md shadow-[#7FB706]/10'
                    : 'bg-[#0a0a1a] border-white/10 text-gray-400 hover:border-white/25 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-white">{preset.name}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-[#7FB706] text-black'
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-2 font-mono truncate">
                  {preset.label}
                </div>
              </button>
            );
          })}
        </div>

        <div>
          <label className={labelCls}>Standard Inclusions &amp; Hardware Accessories *</label>
          <textarea
            rows={5}
            value={form.accessoriesText}
            onChange={(e) => setForm((f) => ({ ...f, accessoriesText: e.target.value }))}
            placeholder="Door stoppers, gravity hinges, indicator locks, coat hooks, support shoes..."
            className={inputCls + ' font-mono text-xs leading-relaxed'}
          />
        </div>
      </div>

      {/* Section 6: Commercial Terms */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Commercial Terms &amp; Conditions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Payment Terms</label>
            <textarea
              rows={3}
              value={form.paymentTerms}
              onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
              placeholder="e.g. 50% advance with PO, balance before dispatch"
              className={inputCls + ' resize-none'}
            />
          </div>
          <div>
            <label className={labelCls}>Delivery &amp; Lead Time</label>
            <textarea
              rows={3}
              value={form.deliveryTerms}
              onChange={(e) => setForm((f) => ({ ...f, deliveryTerms: e.target.value }))}
              placeholder="e.g. 2–3 weeks from receipt of advance and site measurements"
              className={inputCls + ' resize-none'}
            />
          </div>
          <div>
            <label className={labelCls}>Warranty Commitment</label>
            <textarea
              rows={3}
              value={form.warrantyText}
              onChange={(e) => setForm((f) => ({ ...f, warrantyText: e.target.value }))}
              placeholder="Warranty terms..."
              className={inputCls + ' resize-none'}
            />
          </div>
          <div>
            <label className={labelCls}>General Terms</label>
            <textarea
              rows={3}
              value={form.generalTerms}
              onChange={(e) => setForm((f) => ({ ...f, generalTerms: e.target.value }))}
              placeholder="Price basis, taxes, site readiness..."
              className={inputCls + ' resize-none'}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Other Terms / Notes</label>
            <textarea
              rows={2}
              value={form.otherTerms}
              onChange={(e) => setForm((f) => ({ ...f, otherTerms: e.target.value }))}
              placeholder="Any additional custom conditions..."
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Internal Notes (not printed on PDF)</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Internal remarks, negotiation notes..."
            className={inputCls + ' resize-none'}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          to="/admin/dashboard/sales-quotations"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-2.5 min-h-[44px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-[#7FB706]/20 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          {saving ? 'Creating Quotation...' : 'Create Quotation'}
        </button>
      </div>
    </form>
  );
}
