import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, ArrowLeft, Save, Plus, Trash2, RefreshCw,
  AlertTriangle, RotateCcw, Sparkles, ShieldCheck, Wrench, CheckCircle2, Layers, Package,
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
import { calculateGstSplit } from '../utils/tax';

export type QuotationScope = 'CUBICLE' | 'BOARD' | 'HARDWARE';

export interface CreateItem {
  id?: string;
  modelId?: string;
  systemCategory?: 'cubicle' | 'ump' | 'locker' | 'board' | 'hardware';
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
  quotationScope?: QuotationScope;
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
  installationRatePerCubicle?: number;
  installationCubicleCount?: number;
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
  selectedHardwarePreset?: string;
  items: CreateItem[];
}

const LOCAL_STORAGE_KEY = 'pacific_create_quotation_v2';

export const DEFAULT_ACCESSORIES_TEXT =
  '• Gravity Hinges: Self-closing SS 304 stainless steel gravity hinges with nylon cam mechanism.\n• Indicator Lock: SS 304 surface-mounted privacy lock with external red/white occupancy indicator and emergency release.\n• Supporting Shoe/Legs: SS 304 adjustable height support legs (100mm to 150mm ground clearance).\n• Coat Hook: SS 304 heavy-duty coat hook with integrated rubber door buffer.\n• Fasteners: Grade 304 stainless steel tamper-proof screws and expanding anchors.';

const INITIAL_FORM_STATE: CreateFormData = {
  customerId: '',
  companyProfileId: '',
  quotationScope: 'CUBICLE',
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
  installationRatePerCubicle: 1000,
  installationCubicleCount: 0,
  freightTerms: 'Extra as Actual / To pay',
  freightAmount: 0,
  gstRate: 18,
  isSezExempt: false,
  sezCertificateRef: '',
  paymentTerms: '50% Advance along with confirmed Purchase Order. Balance 50% prior to dispatch.',
  deliveryTerms: '2-3 weeks from receipt of advance, approved shop drawings, and color confirmation.',
  warrantyText: 'We provide ten (10) years of warranty for partitions against any moisture-related defects and one (1) year warranty for workmanship and hardware against manufacturing defects.',
  accessoriesText: DEFAULT_ACCESSORIES_TEXT,
  generalTerms: '1. Price Basis: Ex-works New Delhi factory.\n2. Taxes: GST as applicable at the time of invoice.\n3. Unloading & Safe Storage: In buyer’s scope at site.\n4. Site Readiness: Finished floor level and plumb walls required prior to installation.',
  otherTerms: '',
  notes: '',
  selectedHardwarePreset: 'SS_304',
  items: [
    {
      systemCategory: 'cubicle',
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
      setCatalogModels(getMergedQuotationModels(modelsList || []));
    } catch (err) {
      console.error('Failed to load customers or companies:', err);
      setCatalogModels(getMergedQuotationModels([]));
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
      const deliveryAddr = cust.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping);
      const billingAddr = cust.addresses?.find((a: any) => a.addressType === 'BILLING' || a.isDefaultBilling) || cust.addresses?.[0];
      const preferredAddr = deliveryAddr || billingAddr;
      const fullAddr = preferredAddr ? [preferredAddr.addressLine1, preferredAddr.addressLine2, preferredAddr.city].filter(Boolean).join(', ') : '';

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

  // Quick Boilerplate Presets
  const applyBoilerplatePreset = (type: 'STANDARD' | 'URINAL_PARTITION' | 'LOCKER' | 'BOARD_ONLY' | 'HARDWARE_ONLY') => {
    if (type === 'STANDARD') {
      setForm((f) => ({
        ...f,
        quotationScope: 'CUBICLE',
        subject: 'Quotation for Supply of Restroom Cubicle System',
        title: 'Quotation for Supply of Restroom Cubicle System',
        accessoriesText: DEFAULT_ACCESSORIES_TEXT,
        items: [
          {
            systemCategory: 'cubicle',
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
    } else if (type === 'BOARD_ONLY') {
      setForm((f) => ({
        ...f,
        quotationScope: 'BOARD',
        subject: 'Quotation for Supply of Compact Laminate / HPL Boards',
        title: 'Quotation for Supply of Compact Laminate / HPL Boards',
        warrantyText: 'We provide ten (10) years of warranty for compact laminate boards against delamination, moisture ingress, and swelling defects under standard operational use.',
        accessoriesText: '• Scope of Supply: Raw material compact laminate / HPL board sheets only.\n• Hardware & Accessories: Not included in this quotation.\n• Safe Packaging: Protected in export-grade wooden pallet crates.',
        items: [
          {
            systemCategory: 'board',
            description: '12mm High Pressure Compact Laminate (HPL) Board Sheet',
            unit: 'SQFT',
            quantity: 100,
            rate: 185,
            boardType: 'HPL',
            boardThickness: '12mm',
            boardColor: 'D.No. 123 – Oyster White',
            cubicleSize: '1220mm × 2440mm (4ft × 8ft)',
          },
        ],
      }));
    } else if (type === 'HARDWARE_ONLY') {
      setForm((f) => ({
        ...f,
        quotationScope: 'HARDWARE',
        subject: 'Quotation for Supply of Restroom Cubicle Hardware & Accessories',
        title: 'Quotation for Supply of Restroom Cubicle Hardware & Accessories',
        warrantyText: 'We provide one (1) year replacement warranty for all stainless steel and virgin nylon hardware fittings against manufacturing defects.',
        accessoriesText: DEFAULT_ACCESSORIES_TEXT,
        items: [
          {
            systemCategory: 'hardware',
            description: 'SS 304 Gravity Hinges (Self-Closing Pair with Nylon Cam Mechanism)',
            unit: 'PAIR',
            quantity: 10,
            rate: 450,
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
          {
            systemCategory: 'hardware',
            description: 'SS 304 Occupancy Indicator Privacy Lock with Emergency Release',
            unit: 'SET',
            quantity: 5,
            rate: 650,
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
          {
            systemCategory: 'hardware',
            description: 'SS 304 Adjustable Supporting Legs (100mm to 150mm Ground Clearance)',
            unit: 'NOS',
            quantity: 10,
            rate: 350,
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
          {
            systemCategory: 'hardware',
            description: 'SS 304 Ergonomic Door Pull Handle / Knob',
            unit: 'NOS',
            quantity: 5,
            rate: 180,
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
          {
            systemCategory: 'hardware',
            description: 'SS 304 Heavy Duty Coat Hook with Integrated Rubber Buffer Stop',
            unit: 'NOS',
            quantity: 5,
            rate: 120,
            hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          },
        ],
      }));
    } else if (type === 'URINAL_PARTITION') {
      setForm((f) => ({
        ...f,
        quotationScope: 'CUBICLE',
        subject: 'Quotation for Supply of Urinal Privacy Partition Panels',
        title: 'Quotation for Supply of Urinal Privacy Partition Panels',
        items: [
          {
            systemCategory: 'ump',
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
        quotationScope: 'CUBICLE',
        subject: 'Quotation for Supply of Heavy Duty HPL Tier Lockers',
        title: 'Quotation for Supply of Heavy Duty HPL Tier Lockers',
        items: [
          {
            systemCategory: 'locker',
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

  function buildQuotationAccessoriesText(
    primaryModel?: ProductCatalogModel,
    umpModel?: ProductCatalogModel,
    lockerModel?: ProductCatalogModel
  ): string {
    const parts: string[] = [];

    if (umpModel || lockerModel) {
      if (primaryModel) {
        parts.push(`--- RESTROOM CUBICLE HARDWARE (${primaryModel.title.toUpperCase()}) ---\n${formatModelHardwareInclusions(primaryModel)}`);
      } else {
        parts.push(`--- RESTROOM CUBICLE HARDWARE ---\n${DEFAULT_ACCESSORIES_TEXT}`);
      }
      if (umpModel) {
        parts.push(`--- URINAL MODESTY PARTITION HARDWARE (${umpModel.title.toUpperCase()}) ---\n${formatModelHardwareInclusions(umpModel)}`);
      }
      if (lockerModel) {
        parts.push(`--- MODULAR LOCKER HARDWARE (${lockerModel.title.toUpperCase()}) ---\n${formatModelHardwareInclusions(lockerModel)}`);
      }
    } else {
      if (primaryModel) {
        parts.push(formatModelHardwareInclusions(primaryModel));
      } else {
        parts.push(DEFAULT_ACCESSORIES_TEXT);
      }
    }

    return parts.join('\n\n');
  }

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

    setForm((f) => {
      const nextItems = [...f.items];
      nextItems[idx] = {
        ...nextItems[idx],
        modelId: selected.id,
        systemCategory: 'cubicle',
        description: `Pacific ${selected.title} (${selected.category})`,
        cubicleSize: dims.cubicleSize,
        doorSize: dims.doorSize,
        overallHeight: dims.overallHeight,
        boardThickness: dims.boardThickness,
        boardType: dims.boardType,
        hardwarePackage: dims.hardwarePackage,
      };

      const umpItem = nextItems.find((it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
      const umpModel = catalogModels.find((m) => m.id === umpItem?.modelId);
      const lockerItem = nextItems.find((it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker')));
      const lockerModel = catalogModels.find((m) => m.id === lockerItem?.modelId);

      return {
        ...f,
        accessoriesText: buildQuotationAccessoriesText(selected, umpModel, lockerModel),
        items: nextItems,
      };
    });

    clearFieldError(`item_${idx}_desc`);
  };

  // ── Urinal Modesty Partition (UMP) Selection & Field Change Handlers (Optional Add-on) ──
  const handleSelectUmpModel = (modelId: string) => {
    if (!modelId) {
      setForm((f) => {
        const nextItems = f.items.filter(
          (it) => it.systemCategory !== 'ump' && !(it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
        );
        const primaryItem = nextItems.find((it) => it.systemCategory !== 'locker') || nextItems[0];
        const primaryModel = catalogModels.find((m) => m.id === primaryItem?.modelId);
        const lockerItem = nextItems.find((it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker')));
        const lockerModel = catalogModels.find((m) => m.id === lockerItem?.modelId);

        return {
          ...f,
          items: nextItems,
          accessoriesText: buildQuotationAccessoriesText(primaryModel, undefined, lockerModel),
        };
      });
      return;
    }

    const selected = urinalModels.find((m) => m.id === modelId || m.slug === modelId) || catalogModels.find((m) => m.id === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);

    setForm((f) => {
      const existingUmp = f.items.find(
        (it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
      );
      const currentQty = existingUmp ? Number(existingUmp.quantity) || 1 : 1;
      const currentRate = existingUmp && existingUmp.rate > 0 ? existingUmp.rate : 5500;

      const updatedUmpItem: CreateItem = {
        modelId: selected.id,
        systemCategory: 'ump',
        description: `Pacific ${selected.title} (Urinal Partitions)`,
        quantity: currentQty,
        unit: existingUmp?.unit || 'NOS',
        rate: currentRate,
        boardType: dims.boardType || 'HPL',
        boardThickness: dims.boardThickness || '12mm',
        boardColor: existingUmp?.boardColor || 'D.No. 123 – Oyster White',
        cubicleSize: dims.cubicleSize || '450mm W × 900mm H',
        doorSize: 'N/A',
        overallHeight: dims.overallHeight || '1200mm (affixed 300mm above finished floor)',
        hardwarePackage: dims.hardwarePackage || 'Grade 304 Wall Mount Cantilever Clamps',
      };

      const remainingItems = f.items.filter(
        (it) => it !== existingUmp && it.systemCategory !== 'ump' && !(it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
      );

      const nextItems = [...remainingItems, updatedUmpItem];

      const primaryItem = nextItems.find((it) => it.systemCategory !== 'ump' && it.systemCategory !== 'locker') || nextItems[0];
      const primaryModel = catalogModels.find((m) => m.id === primaryItem?.modelId);
      const lockerItem = nextItems.find((it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker')));
      const lockerModel = catalogModels.find((m) => m.id === lockerItem?.modelId);

      return {
        ...f,
        items: nextItems,
        accessoriesText: buildQuotationAccessoriesText(primaryModel, selected, lockerModel),
      };
    });
  };

  const handleUmpFieldChange = (field: keyof CreateItem, val: any) => {
    setForm((f) => {
      const existingUmpIdx = f.items.findIndex(
        (it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
      );
      if (existingUmpIdx === -1) return f;
      const nextItems = [...f.items];
      nextItems[existingUmpIdx] = { ...nextItems[existingUmpIdx], [field]: val };
      return { ...f, items: nextItems };
    });
  };

  // ── Modular Locker Selection & Field Change Handlers (Optional Add-on) ──
  const handleSelectLockerModel = (modelId: string) => {
    if (!modelId) {
      setForm((f) => {
        const nextItems = f.items.filter(
          (it) => it.systemCategory !== 'locker' && !(it.description && it.description.toLowerCase().includes('locker'))
        );
        const primaryItem = nextItems.find((it) => it.systemCategory !== 'ump') || nextItems[0];
        const primaryModel = catalogModels.find((m) => m.id === primaryItem?.modelId);
        const umpItem = nextItems.find((it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
        const umpModel = catalogModels.find((m) => m.id === umpItem?.modelId);

        return {
          ...f,
          items: nextItems,
          accessoriesText: buildQuotationAccessoriesText(primaryModel, umpModel, undefined),
        };
      });
      return;
    }

    const selected = lockerModels.find((m) => m.id === modelId || m.slug === modelId) || catalogModels.find((m) => m.id === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);

    setForm((f) => {
      const existingLocker = f.items.find(
        (it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker'))
      );
      const currentQty = existingLocker ? Number(existingLocker.quantity) || 1 : 1;
      const currentRate = existingLocker && existingLocker.rate > 0 ? existingLocker.rate : 14500;

      const updatedLockerItem: CreateItem = {
        modelId: selected.id,
        systemCategory: 'locker',
        description: `Pacific ${selected.title} (Lockers)`,
        quantity: currentQty,
        unit: existingLocker?.unit || 'NOS',
        rate: currentRate,
        boardType: dims.boardType || 'HPL',
        boardThickness: dims.boardThickness || '12mm',
        boardColor: existingLocker?.boardColor || 'D.No. 123 – Oyster White',
        cubicleSize: dims.cubicleSize || '300mm W × 450mm D × 1800mm H',
        doorSize: dims.doorSize || 'Tier Modular Doors as per drawing',
        overallHeight: dims.overallHeight || '1900mm (including 100mm plinth base)',
        hardwarePackage: dims.hardwarePackage || 'Heavy-Duty Uniform Standard Locker Hardware',
      };

      const remainingItems = f.items.filter(
        (it) => it !== existingLocker && it.systemCategory !== 'locker' && !(it.description && it.description.toLowerCase().includes('locker'))
      );

      const nextItems = [...remainingItems, updatedLockerItem];

      const primaryItem = nextItems.find((it) => it.systemCategory !== 'ump' && it.systemCategory !== 'locker') || nextItems[0];
      const primaryModel = catalogModels.find((m) => m.id === primaryItem?.modelId);
      const umpItem = nextItems.find((it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
      const umpModel = catalogModels.find((m) => m.id === umpItem?.modelId);

      return {
        ...f,
        items: nextItems,
        accessoriesText: buildQuotationAccessoriesText(primaryModel, umpModel, selected),
      };
    });
  };

  const handleLockerFieldChange = (field: keyof CreateItem, val: any) => {
    setForm((f) => {
      const existingLockerIdx = f.items.findIndex(
        (it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker'))
      );
      if (existingLockerIdx === -1) return f;
      const nextItems = [...f.items];
      nextItems[existingLockerIdx] = { ...nextItems[existingLockerIdx], [field]: val };
      return { ...f, items: nextItems };
    });
  };

  const addBoardItem = () => {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          systemCategory: 'board',
          description: '12mm High Pressure Compact Laminate (HPL) Board Sheet',
          unit: 'SQFT',
          quantity: 100,
          rate: 185,
          boardType: 'HPL',
          boardThickness: '12mm',
          boardColor: 'D.No. 123 – Oyster White',
          cubicleSize: '1220mm × 2440mm (4ft × 8ft)',
        },
      ],
    }));
  };

  const addHardwareItem = (customDesc?: string, defaultUnit = 'SET', defaultRate = 500) => {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          systemCategory: 'hardware',
          description: customDesc || 'SS 304 Restroom Hardware Fitting',
          unit: defaultUnit,
          quantity: 1,
          rate: defaultRate,
          hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
        },
      ],
    }));
  };

  const addItem = () => {
    if (form.quotationScope === 'BOARD') {
      addBoardItem();
      return;
    }
    if (form.quotationScope === 'HARDWARE') {
      addHardwareItem();
      return;
    }
    const defaultHardware = 'SS 304 Stainless Steel (Satin/Brushed)';
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

  const detectedCubicleCount = useMemo(() => {
    return form.items
      .filter((it) => it.unit === 'NOS' || it.unit === 'SET' || !it.unit || (it.unit as string) === 'CUBICLE')
      .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [form.items]);

  const effectiveCubicleCount = form.installationCubicleCount || (detectedCubicleCount || 1);
  const effectiveInstallRate = form.installationRatePerCubicle || (effectiveCubicleCount > 0 && form.installationCharge ? Math.round(Number(form.installationCharge) / effectiveCubicleCount) : 1000);

  const installationCharge = Number(form.installationCharge) || 0;
  const freightAmount = Number(form.freightAmount) || 0;
  const gstRate = form.isSezExempt ? 0 : Number(form.gstRate) || 18;

  const taxable = basicPrice + installationCharge + (form.freightTerms === 'Fixed' || (form.freightTerms === 'Extra as Actual / To pay' && freightAmount > 0) ? freightAmount : 0);
  const selectedCust = customers.find((c) => c.id === form.customerId);
  const activeGstin = selectedCust?.gstin || null;
  const activeStateCode = selectedCust?.addresses?.[0]?.stateCode || (activeGstin && activeGstin.length >= 2 ? activeGstin.slice(0, 2) : null);
  const activeStateName = selectedCust?.addresses?.[0]?.state || null;

  const gstBreakdown = calculateGstSplit(
    taxable,
    activeStateCode,
    activeStateName,
    Boolean(form.isSezExempt),
    gstRate,
    activeGstin,
    form.recipientAddress
  );
  const gstAmount = gstBreakdown.totalTax;
  const grandTotal = gstBreakdown.grandTotal;

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
        installationRatePerCubicle: Number(form.installationCharge) > 0 ? (form.installationRatePerCubicle ?? 1000) : undefined,
        installationCubicleCount: Number(form.installationCharge) > 0 ? (form.installationCubicleCount || detectedCubicleCount || 1) : undefined,
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
          boardType: it.boardType || (form.quotationScope === 'HARDWARE' ? undefined : 'HPL'),
          cubicleSize: it.cubicleSize || undefined,
          boardColor: it.boardColor || undefined,
          boardThickness: it.boardThickness || undefined,
          doorSize: it.doorSize || undefined,
          overallHeight: it.overallHeight || undefined,
          hardwarePackage: it.hardwarePackage || undefined,
          customSpecsJson: {
            hardwarePackage: it.hardwarePackage || undefined,
            boardType: it.boardType || (form.quotationScope === 'HARDWARE' ? undefined : 'HPL'),
            systemCategory: it.systemCategory || undefined,
            quotationScope: form.quotationScope || 'CUBICLE',
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
            <span className="text-xs text-[#7FB706] font-mono ml-1 font-bold">
              (@ ₹ {effectiveInstallRate.toLocaleString('en-IN')}/Cubicle for {effectiveCubicleCount} Cubicles)
            </span>
          </div>
        )}
        {freightAmount > 0 && (
          <div className="text-gray-400">
            Freight: <span className="text-white font-mono font-semibold">₹ {freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {gstBreakdown.isSez ? (
          <div className="text-gray-400">
            GST (0% SEZ): <span className="text-white font-mono font-semibold">₹ 0.00</span>
          </div>
        ) : gstBreakdown.isDelhi ? (
          <>
            <div className="text-gray-400">
              CGST (9%): <span className="text-white font-mono font-semibold">₹ {gstBreakdown.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="text-gray-400">
              SGST (9%): <span className="text-white font-mono font-semibold">₹ {gstBreakdown.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </>
        ) : (
          <div className="text-gray-400">
            IGST ({gstRate}%): <span className="text-white font-mono font-semibold">₹ {gstBreakdown.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer flex items-center gap-1.5 ${
              (!form.quotationScope || form.quotationScope === 'CUBICLE')
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Standard Cubicle
          </button>
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('BOARD_ONLY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer flex items-center gap-1.5 ${
              form.quotationScope === 'BOARD'
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Board Only (HPL / HDF)
          </button>
          <button
            type="button"
            onClick={() => applyBoilerplatePreset('HARDWARE_ONLY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px] transition cursor-pointer flex items-center gap-1.5 ${
              form.quotationScope === 'HARDWARE'
                ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Custom Hardware Only
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
          <h3 className="text-sm font-bold text-white">Pricing & Commercial Terms</h3>
          <span className="text-xs text-[#7FB706] font-mono">
            {effectiveCubicleCount} Cubicle{effectiveCubicleCount === 1 ? '' : 's'} detected in items
          </span>
        </div>

        {/* Installation Charges Per Cubicle Sub-block */}
        <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>🔧 Installation Charges (Per Cubicle Calculation)</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Presets:</span>
              {[
                { label: '₹ 800', rate: 800 },
                { label: '₹ 1,000 (Std)', rate: 1000 },
                { label: '₹ 1,200', rate: 1200 },
                { label: '₹ 1,500', rate: 1500 },
                { label: 'Free (₹ 0)', rate: 0 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const cCount = form.installationCubicleCount || detectedCubicleCount || 1;
                    const tot = p.rate * (p.rate === 0 ? 0 : cCount);
                    setForm((f) => ({
                      ...f,
                      installationRatePerCubicle: p.rate,
                      installationCubicleCount: cCount,
                      installationCharge: tot,
                    }));
                    clearFieldError('installationCharge');
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Rate (₹ / Cubicle)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.installationRatePerCubicle ?? 1000}
                onChange={(e) => {
                  const rate = Number(e.target.value) || 0;
                  const count = form.installationCubicleCount || detectedCubicleCount || 1;
                  setForm((f) => ({
                    ...f,
                    installationRatePerCubicle: rate,
                    installationCharge: rate * count,
                  }));
                  clearFieldError('installationCharge');
                }}
                className={inputCls}
                placeholder="1000"
              />
              <span className="text-[10px] text-slate-400">Default: ₹ 1,000 / Cubicle</span>
            </div>

            <div>
              <label className={labelCls}>Cubicles (Qty)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.installationCubicleCount || (detectedCubicleCount || 1)}
                onChange={(e) => {
                  const count = Number(e.target.value) || 0;
                  const rate = form.installationRatePerCubicle ?? 1000;
                  setForm((f) => ({
                    ...f,
                    installationCubicleCount: count,
                    installationCharge: rate * count,
                  }));
                  clearFieldError('installationCharge');
                }}
                className={inputCls}
                placeholder="Number of cubicles"
              />
              <span className="text-[10px] text-slate-400">Auto-detected: {detectedCubicleCount || 1} Cubicles</span>
            </div>

            <div>
              <label className={labelCls}>Total Installation Charge (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.installationCharge}
                onChange={(e) => {
                  const total = Number(e.target.value) || 0;
                  const count = form.installationCubicleCount || detectedCubicleCount || 1;
                  const derivedRate = count > 0 ? Math.round(total / count) : 0;
                  setForm((f) => ({
                    ...f,
                    installationCharge: total,
                    installationRatePerCubicle: derivedRate,
                  }));
                  clearFieldError('installationCharge');
                }}
                className={getInputCls('installationCharge')}
              />
              {fieldErrors.installationCharge && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.installationCharge}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <span>
              📄 <strong>Mentioned on document:</strong> Cubicle Installation Charges{' '}
              {form.installationCharge > 0
                ? `(@ ₹ ${(form.installationRatePerCubicle ?? 1000).toLocaleString('en-IN')}/Cubicle for ${form.installationCubicleCount || detectedCubicleCount || 1} Cubicle${(form.installationCubicleCount || detectedCubicleCount || 1) === 1 ? '' : 's'})`
                : '(Nil / Client Scope)'}
            </span>
            <span className="font-mono font-bold text-white">
              ₹ {Number(form.installationCharge).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7FB706]" /> Line Items &amp; Specifications
            </h3>
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
            <Plus className="w-3.5 h-3.5" />
            {form.quotationScope === 'BOARD' ? 'Add Board Sheet' : form.quotationScope === 'HARDWARE' ? 'Add Hardware Item' : 'Add Item'}
          </button>
        </div>

        {/* 3-Way Mode / Scope Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-[#0a0a1a] rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              if (form.quotationScope !== 'CUBICLE') {
                if (window.confirm('Switch quotation mode to Restroom Cubicle System?')) {
                  applyBoilerplatePreset('STANDARD');
                }
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              (!form.quotationScope || form.quotationScope === 'CUBICLE')
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" /> Restroom Cubicle System
          </button>
          <button
            type="button"
            onClick={() => {
              if (form.quotationScope !== 'BOARD') {
                if (window.confirm('Switch quotation mode to Board Only (HPL/HDF)? This will configure items for raw board sheet supply.')) {
                  applyBoilerplatePreset('BOARD_ONLY');
                }
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              form.quotationScope === 'BOARD'
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" /> Board Only (HPL / HDF)
          </button>
          <button
            type="button"
            onClick={() => {
              if (form.quotationScope !== 'HARDWARE') {
                if (window.confirm('Switch quotation mode to Custom Hardware Only? This will configure items for hardware fittings supply.')) {
                  applyBoilerplatePreset('HARDWARE_ONLY');
                }
              }
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              form.quotationScope === 'HARDWARE'
                ? 'bg-[#7FB706] text-black shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench className="w-4 h-4" /> Custom Hardware Only
          </button>
        </div>

        {form.items.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No line items yet. Click &quot;Add Item&quot; to configure quotation items.
          </div>
        )}

        <div className="space-y-5">
          {form.quotationScope === 'BOARD' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-300">
                <span className="flex items-center gap-2 font-medium">
                  <Package className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span><strong>Board Supply Mode Active:</strong> Quoting for raw compact laminate / HDF sheets only. Cubicle model is not required.</span>
                </span>
                <button
                  type="button"
                  onClick={addBoardItem}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Board Sheet
                </button>
              </div>

              {form.items.map((item, idx) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                return (
                  <div key={idx} className="bg-[#0a0a1a] border border-amber-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400">Board Item #{idx + 1}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-400" /> Raw Board Supply
                        </span>
                      </div>
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          title="Remove Board Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 space-y-1">
                        <label className={labelCls}>Board Description *</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            handleItemChange(idx, 'description', e.target.value);
                            clearFieldError(`item_${idx}_desc`);
                          }}
                          placeholder="e.g. 12mm High Pressure Compact Laminate (HPL) Board Sheet"
                          className={getInputCls(`item_${idx}_desc`)}
                          required
                        />
                        {fieldErrors[`item_${idx}_desc`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_desc`]}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Board Type *</label>
                        <select
                          value={item.boardType || 'HPL'}
                          onChange={(e) => handleItemChange(idx, 'boardType', e.target.value)}
                          className={inputCls}
                        >
                          <option value="HPL">HPL (Compact Laminate)</option>
                          <option value="HDF">HDF (High Density Board)</option>
                          <option value="WOODEN">Wooden Core Panel</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Thickness</label>
                        <input
                          type="text"
                          value={item.boardThickness || ''}
                          onChange={(e) => handleItemChange(idx, 'boardThickness', e.target.value)}
                          placeholder="e.g. 12mm"
                          className={inputCls}
                        />
                        <div className="flex gap-1 pt-0.5">
                          {['12mm', '18mm', '25mm'].map((th) => (
                            <button
                              key={th}
                              type="button"
                              onClick={() => handleItemChange(idx, 'boardThickness', th)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            >
                              {th}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Color / Decor Code</label>
                        <input
                          type="text"
                          value={item.boardColor || ''}
                          onChange={(e) => handleItemChange(idx, 'boardColor', e.target.value)}
                          placeholder="e.g. D.No. 123 – Oyster White"
                          className={inputCls}
                        />
                      </div>

                      <div className="sm:col-span-5 space-y-1">
                        <label className={labelCls}>Sheet Dimensions / Size</label>
                        <input
                          type="text"
                          value={item.cubicleSize || ''}
                          onChange={(e) => handleItemChange(idx, 'cubicleSize', e.target.value)}
                          placeholder="e.g. 1220mm × 2440mm (4ft × 8ft)"
                          className={inputCls}
                        />
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {[
                            { label: '4ft × 8ft', val: '1220mm × 2440mm (4ft × 8ft)' },
                            { label: '6ft × 6ft', val: '1830mm × 1830mm (6ft × 6ft)' },
                            { label: '6ft × 9ft', val: '1830mm × 2740mm (6ft × 9ft)' },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => handleItemChange(idx, 'cubicleSize', preset.val)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Unit</label>
                        <select
                          value={item.unit || 'SQFT'}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className={inputCls}
                        >
                          {['SQFT', 'SQM', 'NOS', 'SHEET', 'LOT'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
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

                      <div className="sm:col-span-3 space-y-1">
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

                    <div className="text-right text-xs text-gray-400 font-mono pt-1 border-t border-white/5">
                      Line Total: <span className="font-bold text-white text-sm">
                        ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addBoardItem}
                className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-dashed border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Another Board Line Item
              </button>
            </div>
          ) : form.quotationScope === 'HARDWARE' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-cyan-300">
                <span className="flex items-center gap-2 font-medium">
                  <Wrench className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span><strong>Custom Hardware Only Mode Active:</strong> Quoting for individual restroom cubicle hardware fittings. Cubicle model is not required.</span>
                </span>
                <button
                  type="button"
                  onClick={() => addHardwareItem()}
                  className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Hardware Item
                </button>
              </div>

              {/* Quick Insert Hardware Chips */}
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-[#0a0a1a] border border-white/5">
                <span className="text-[11px] text-gray-400 mr-1 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> Quick Add:
                </span>
                {[
                  { name: 'SS 304 Gravity Hinges (Pair)', unit: 'PAIR', rate: 450 },
                  { name: 'SS 304 Occupancy Indicator Lock with Release', unit: 'SET', rate: 650 },
                  { name: 'SS 304 Adjustable Supporting Legs (100-150mm)', unit: 'NOS', rate: 350 },
                  { name: 'SS 304 Door Pull Handle / Knob', unit: 'NOS', rate: 180 },
                  { name: 'SS 304 Heavy Duty Coat Hook with Buffer', unit: 'NOS', rate: 120 },
                  { name: 'Continuous Top Headrail Extrusion (Mtr)', unit: 'MTR', rate: 550 },
                  { name: 'Aluminium U-Channel Wall Profile (Mtr)', unit: 'MTR', rate: 220 },
                  { name: 'Grade 304 Screws & Anchor Fasteners Pack', unit: 'SET', rate: 150 },
                ].map((hw) => (
                  <button
                    key={hw.name}
                    type="button"
                    onClick={() => addHardwareItem(hw.name, hw.unit, hw.rate)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {hw.name.split(' (')[0]}
                  </button>
                ))}
              </div>

              {form.items.map((item, idx) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                return (
                  <div key={idx} className="bg-[#0a0a1a] border border-cyan-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400">Hardware Item #{idx + 1}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-cyan-400" /> Architectural Hardware
                        </span>
                      </div>
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          title="Remove Hardware Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-5 space-y-1">
                        <label className={labelCls}>Hardware Description / Name *</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            handleItemChange(idx, 'description', e.target.value);
                            clearFieldError(`item_${idx}_desc`);
                          }}
                          placeholder="e.g. SS 304 Gravity Hinges (Self-Closing Pair)"
                          className={getInputCls(`item_${idx}_desc`)}
                          required
                        />
                        {fieldErrors[`item_${idx}_desc`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_desc`]}</p>
                        )}
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className={labelCls}>Material / Hardware Finish</label>
                        <select
                          value={item.hardwarePackage || 'SS 304 Stainless Steel (Satin/Brushed)'}
                          onChange={(e) => handleItemChange(idx, 'hardwarePackage', e.target.value)}
                          className={inputCls}
                        >
                          <option value="SS 304 Stainless Steel (Satin/Brushed)">SS 304 Stainless Steel (Satin/Brushed)</option>
                          <option value="SS 316 Marine Grade Stainless Steel">SS 316 Marine Grade</option>
                          <option value="Heavy-Duty Virgin Nylon (Matt Black)">Nylon (Matt Black)</option>
                          <option value="Aluminium Silver Anodized Finish">Aluminium Anodized</option>
                          <option value="PVD Titanium Coated (Gold / Rose Gold / Black)">PVD Titanium Coated</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className={labelCls}>Unit</label>
                        <select
                          value={item.unit || 'SET'}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className={inputCls}
                        >
                          {['SET', 'PAIR', 'NOS', 'PCS', 'MTR', 'RMT', 'LOT'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-1 space-y-1">
                        <label className={labelCls}>Qty *</label>
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

                      <div className="sm:col-span-1 space-y-1">
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

                    <div className="text-right text-xs text-gray-400 font-mono pt-1 border-t border-white/5">
                      Line Total: <span className="font-bold text-white text-sm">
                        ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => addHardwareItem()}
                className="w-full py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-dashed border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Another Hardware Item
              </button>
            </div>
          ) : (
            (() => {
            const primaryCubicleItem = form.items.find(
              (it) => it.systemCategory !== 'ump' && it.systemCategory !== 'locker'
            ) || form.items[0];
            const primaryCubicleIdx = primaryCubicleItem ? form.items.indexOf(primaryCubicleItem) : 0;

            const umpItem = form.items.find(
              (it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
            );

            const lockerItem = form.items.find(
              (it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker'))
            );

            const additionalCubicleItems = form.items.filter(
              (it, i) => i !== primaryCubicleIdx && it !== umpItem && it !== lockerItem
            );

            return (
              <>
                {/* ── SECTION 1: CUBICLE MODEL SYSTEM (PRIMARY) ── */}
                {primaryCubicleItem && (
                  <div className="bg-[#0a0a1a] border border-[#7FB706]/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#7FB706]">Item #1 (Primary System)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-[#7FB706]" /> Cubicle Model System
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40">
                        Primary System
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3 space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <label className={labelCls}>Cubicle Model Selection &amp; Description (Optional)</label>
                          <span className="text-[11px] text-[#7FB706] font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Auto-fetches hardware list, sizes &amp; height
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <select
                              value={primaryCubicleItem.modelId || ''}
                              onChange={(e) => handleSelectModel(primaryCubicleIdx, e.target.value)}
                              className={inputCls + ' bg-[#161536] border-[#7FB706]/40 text-white font-semibold'}
                            >
                              <option value="">-- Choose Cubicle Model (Optional) --</option>
                              {cubicleModels.length > 0 && (
                                <optgroup label="Restroom Cubicles (13 Models)">
                                  {cubicleModels.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.title}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <option value="CUSTOM">Custom / Manual Specification (No Model)</option>
                            </select>
                          </div>

                          <div>
                            <input
                              type="text"
                              value={primaryCubicleItem.description}
                              onChange={(e) => {
                                handleItemChange(primaryCubicleIdx, 'description', e.target.value);
                                clearFieldError(`item_${primaryCubicleIdx}_desc`);
                              }}
                              placeholder="Description (auto-filled on model select)"
                              className={getInputCls(`item_${primaryCubicleIdx}_desc`)}
                              required
                            />
                          </div>
                        </div>
                        {fieldErrors[`item_${primaryCubicleIdx}_desc`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_desc`]}</p>
                        )}
                      </div>

                      <div>
                        <label className={labelCls}>Unit</label>
                        <select
                          value={primaryCubicleItem.unit}
                          onChange={(e) => handleItemChange(primaryCubicleIdx, 'unit', e.target.value)}
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
                          value={primaryCubicleItem.quantity}
                          onChange={(e) => {
                            handleItemChange(primaryCubicleIdx, 'quantity', Number(e.target.value) || 0);
                            clearFieldError(`item_${primaryCubicleIdx}_qty`);
                          }}
                          className={getInputCls(`item_${primaryCubicleIdx}_qty`)}
                          required
                        />
                        {fieldErrors[`item_${primaryCubicleIdx}_qty`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_qty`]}</p>
                        )}
                      </div>

                      <div>
                        <label className={labelCls}>Rate (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={primaryCubicleItem.rate}
                          onChange={(e) => {
                            handleItemChange(primaryCubicleIdx, 'rate', Number(e.target.value) || 0);
                            clearFieldError(`item_${primaryCubicleIdx}_rate`);
                          }}
                          className={getInputCls(`item_${primaryCubicleIdx}_rate`)}
                          required
                        />
                        {fieldErrors[`item_${primaryCubicleIdx}_rate`] && (
                          <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_rate`]}</p>
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
                            value={primaryCubicleItem.boardType || 'HPL'}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardType', e.target.value)}
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
                            value={primaryCubicleItem.boardThickness || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardThickness', e.target.value)}
                            placeholder="e.g. 12mm / 18mm"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Board Color</label>
                          <input
                            type="text"
                            value={primaryCubicleItem.boardColor || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardColor', e.target.value)}
                            placeholder="e.g. D.No. 123 – Oyster White"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Cubicle Size</label>
                          <input
                            type="text"
                            value={primaryCubicleItem.cubicleSize || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'cubicleSize', e.target.value)}
                            placeholder="e.g. 1000mm W × 1500mm D"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Door Size</label>
                          <input
                            type="text"
                            value={primaryCubicleItem.doorSize || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'doorSize', e.target.value)}
                            placeholder="e.g. 600mm × 1785mm"
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Overall Height</label>
                          <input
                            type="text"
                            value={primaryCubicleItem.overallHeight || ''}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'overallHeight', e.target.value)}
                            placeholder="e.g. 1980mm (incl. 100mm ground clearance)"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 font-mono pt-1">
                      Line Total: <span className="font-bold text-white text-sm">
                        ₹ {((Number(primaryCubicleItem.quantity) || 0) * (Number(primaryCubicleItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── SECTION 2: URINAL MODESTY PARTITION (OPTIONAL) ── */}
                <div className={`rounded-xl p-4 space-y-3 transition-all ${
                  umpItem ? 'bg-[#0a1826] border border-cyan-500/50 shadow-lg shadow-cyan-950/20' : 'bg-[#0a1826]/40 border border-cyan-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">Optional Section #2</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" /> Urinal Modesty Partition (UMP)
                      </span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      umpItem ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {umpItem ? '✓ Active & Included' : 'Optional / Not Selected'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className={labelCls}>Urinal Partition Model Selection (Optional)</label>
                      <span className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Auto-updates hardware inclusions &amp; specs
                      </span>
                    </div>
                    <select
                      value={umpItem?.modelId || ''}
                      onChange={(e) => handleSelectUmpModel(e.target.value)}
                      className="w-full bg-[#161536] border border-cyan-500/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="">-- No Urinal Partitions Required (Optional) --</option>
                      <optgroup label="Urinal Partitions (4 Models)">
                        {urinalModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {umpItem && (
                    <div className="space-y-3 pt-2 border-t border-cyan-500/20">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Unit</label>
                          <select
                            value={umpItem.unit}
                            onChange={(e) => handleUmpFieldChange('unit', e.target.value)}
                            className={inputCls}
                          >
                            {['NOS', 'SET', 'SQM', 'MTR', 'LOT'].map((u) => (
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
                            value={umpItem.quantity}
                            onChange={(e) => handleUmpFieldChange('quantity', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={umpItem.rate}
                            onChange={(e) => handleUmpFieldChange('rate', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>
                      </div>

                      {/* UMP Technical Specifications */}
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>⚙️</span> Urinal Partition Specifications
                          </span>
                          <span className="text-[11px] text-cyan-400">Wall-mounted modesty divider details</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type *</label>
                            <select
                              value={umpItem.boardType || 'HPL'}
                              onChange={(e) => handleUmpFieldChange('boardType', e.target.value)}
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
                              value={umpItem.boardThickness || ''}
                              onChange={(e) => handleUmpFieldChange('boardThickness', e.target.value)}
                              placeholder="e.g. 12mm / 18mm"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Board Color / Shade</label>
                            <input
                              type="text"
                              value={umpItem.boardColor || ''}
                              onChange={(e) => handleUmpFieldChange('boardColor', e.target.value)}
                              placeholder="e.g. D.No. 123 – Oyster White"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Partition Size</label>
                            <input
                              type="text"
                              value={umpItem.cubicleSize || ''}
                              onChange={(e) => handleUmpFieldChange('cubicleSize', e.target.value)}
                              placeholder="e.g. 450mm W × 900mm H"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Overall Height</label>
                            <input
                              type="text"
                              value={umpItem.overallHeight || ''}
                              onChange={(e) => handleUmpFieldChange('overallHeight', e.target.value)}
                              placeholder="e.g. 1200mm (affixed 300mm above finished floor)"
                              className={inputCls}
                            />
                          </div>

                          <div className="sm:col-span-2 lg:col-span-1">
                            <label className={labelCls}>Hardware Package Specification</label>
                            <input
                              type="text"
                              value={umpItem.hardwarePackage || ''}
                              onChange={(e) => handleUmpFieldChange('hardwarePackage', e.target.value)}
                              placeholder="e.g. Grade 304 Wall Mount Cantilever Clamps"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-gray-400 italic">
                          Urinal Modesty Partition System (Auto-updates Hardware Accessories below)
                        </span>
                        <div className="font-mono text-xs text-gray-400">
                          Line Total: <span className="font-bold text-cyan-300 text-sm">
                            ₹ {((Number(umpItem.quantity) || 0) * (Number(umpItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── SECTION 3: MODULAR LOCKER SYSTEM (OPTIONAL) ── */}
                <div className={`rounded-xl p-4 space-y-3 transition-all ${
                  lockerItem ? 'bg-[#140e2b] border border-purple-500/50 shadow-lg shadow-purple-950/20' : 'bg-[#140e2b]/40 border border-purple-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-400">Optional Section #3</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-purple-400" /> Modular Locker System
                      </span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      lockerItem ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {lockerItem ? '✓ Active & Included' : 'Optional / Not Selected'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className={labelCls}>Modular Locker Model Selection (Optional)</label>
                      <span className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Auto-updates hardware inclusions &amp; specs
                      </span>
                    </div>
                    <select
                      value={lockerItem?.modelId || ''}
                      onChange={(e) => handleSelectLockerModel(e.target.value)}
                      className="w-full bg-[#161536] border border-purple-500/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-purple-400 focus:outline-none"
                    >
                      <option value="">-- No Modular Lockers Required (Optional) --</option>
                      <optgroup label="Modular Lockers (7 Models)">
                        {lockerModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {lockerItem && (
                    <div className="space-y-3 pt-2 border-t border-purple-500/20">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Unit</label>
                          <select
                            value={lockerItem.unit}
                            onChange={(e) => handleLockerFieldChange('unit', e.target.value)}
                            className={inputCls}
                          >
                            {['NOS', 'SET', 'BANK', 'BAY', 'LOT'].map((u) => (
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
                            value={lockerItem.quantity}
                            onChange={(e) => handleLockerFieldChange('quantity', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={lockerItem.rate}
                            onChange={(e) => handleLockerFieldChange('rate', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>
                      </div>

                      {/* Locker Technical Specifications */}
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>⚙️</span> Locker Technical Specifications
                          </span>
                          <span className="text-[11px] text-purple-400">Dimensions, door tiers &amp; security locks</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type *</label>
                            <select
                              value={lockerItem.boardType || 'HPL'}
                              onChange={(e) => handleLockerFieldChange('boardType', e.target.value)}
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
                              value={lockerItem.boardThickness || ''}
                              onChange={(e) => handleLockerFieldChange('boardThickness', e.target.value)}
                              placeholder="e.g. 12mm / 18mm"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Board Color / Shade</label>
                            <input
                              type="text"
                              value={lockerItem.boardColor || ''}
                              onChange={(e) => handleLockerFieldChange('boardColor', e.target.value)}
                              placeholder="e.g. D.No. 123 – Oyster White"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Locker Dimension</label>
                            <input
                              type="text"
                              value={lockerItem.cubicleSize || ''}
                              onChange={(e) => handleLockerFieldChange('cubicleSize', e.target.value)}
                              placeholder="e.g. 300mm W × 450mm D × 1800mm H"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Compartment / Door Size</label>
                            <input
                              type="text"
                              value={lockerItem.doorSize || ''}
                              onChange={(e) => handleLockerFieldChange('doorSize', e.target.value)}
                              placeholder="e.g. Tier Modular Doors as per drawing"
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Overall Height</label>
                            <input
                              type="text"
                              value={lockerItem.overallHeight || ''}
                              onChange={(e) => handleLockerFieldChange('overallHeight', e.target.value)}
                              placeholder="e.g. 1900mm (including 100mm plinth base)"
                              className={inputCls}
                            />
                          </div>

                          <div className="sm:col-span-2 lg:col-span-3">
                            <label className={labelCls}>Hardware Package Specification</label>
                            <input
                              type="text"
                              value={lockerItem.hardwarePackage || ''}
                              onChange={(e) => handleLockerFieldChange('hardwarePackage', e.target.value)}
                              placeholder="e.g. Master-Keyed Cam Lock, Concealed Pivot Hinges, Number Plates &amp; Plinth Legs"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-gray-400 italic">
                          Modular Locker System (Auto-updates Hardware Accessories below)
                        </span>
                        <div className="font-mono text-xs text-gray-400">
                          Line Total: <span className="font-bold text-purple-300 text-sm">
                            ₹ {((Number(lockerItem.quantity) || 0) * (Number(lockerItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── SECTION 4: ADDITIONAL SYSTEMS (IF ANY) ── */}
                {additionalCubicleItems.map((item, addIdx) => {
                  const realIdx = form.items.indexOf(item);
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);

                  return (
                    <div key={realIdx} className="bg-[#0a0a1a] border border-[#7FB706]/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#7FB706]">Additional System #{addIdx + 2}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#7FB706]" /> Cubicle Model System
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(realIdx)}
                          className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          title="Remove System"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-3 space-y-1.5">
                          <label className={labelCls}>Product Model Selection &amp; Description (Optional)</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <select
                                value={item.modelId || ''}
                                onChange={(e) => handleSelectModel(realIdx, e.target.value)}
                                className={inputCls + ' bg-[#161536] border-[#7FB706]/40 text-white font-semibold'}
                              >
                                <option value="">-- Choose Product Model (Optional) --</option>
                                <optgroup label="Restroom Cubicles">
                                  {cubicleModels.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.title}
                                    </option>
                                  ))}
                                </optgroup>
                                <option value="CUSTOM">Custom / Manual Specification (No Model)</option>
                              </select>
                            </div>

                            <div>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  handleItemChange(realIdx, 'description', e.target.value);
                                  clearFieldError(`item_${realIdx}_desc`);
                                }}
                                placeholder="Description (auto-filled on model select)"
                                className={getInputCls(`item_${realIdx}_desc`)}
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className={labelCls}>Unit</label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(realIdx, 'unit', e.target.value)}
                            className={inputCls}
                          >
                            {['NOS', 'SET', 'SQM', 'MTR', 'LOT'].map((u) => (
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
                            onChange={(e) => handleItemChange(realIdx, 'quantity', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleItemChange(realIdx, 'rate', Number(e.target.value) || 0)}
                            className={inputCls}
                            required
                          />
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-400 font-mono pt-1">
                        Line Total: <span className="font-bold text-white text-sm">
                          ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })())}
        </div>
      </div>

      {/* Section 5: Standard Inclusions & Hardware Accessories */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Wrench className="w-4 h-4 text-[#7FB706]" />
          <h3 className="text-sm font-bold text-white">Standard Inclusions &amp; Hardware Accessories</h3>
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
