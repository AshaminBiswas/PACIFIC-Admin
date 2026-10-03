import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FileText, ArrowLeft, Save, Plus, Trash2, RefreshCw,
  AlertTriangle, RotateCcw, Wrench, Sparkles, Layers,
  UploadCloud, ExternalLink, Eye,
} from 'lucide-react';
import { salesQuotationsApi } from '../api/salesQuotationsApi';
import { companiesApi } from '../api/companyApi';
import { productCatalogApi } from '../api/productCatalogApi';
import {
  getMergedQuotationModels,
  formatModelHardwareInclusions,
  extractModelDimensions,
} from '../utils/quotationProductPresets';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import BranchSelector from '../components/common/BranchSelector';
import ModelImageField from '../components/quotations/ModelImageField';
import type { ProductCatalogModel, CompanyProfile } from '../types/admin';
import { calculateGstSplit, isRestroomCubicleItem } from '../utils/tax';
import { uploadToImageKit } from '../lib/imagekit';

interface EditItem {
  id?: string;
  modelId?: string;
  customModelName?: string;
  modelName?: string;
  modelImageUrl?: string;
  systemCategory?: 'cubicle' | 'ump' | 'locker' | 'custom' | string;
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
  make?: string;
  customSpecsJson?: any;
}

interface EditFormData {
  companyProfileId?: string;
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
  customerGstin?: string;
  customerStateCode?: string;
  customerStateName?: string;
  drawingUrl?: string;
  drawingFileName?: string;
  drawingFileId?: string;
  drawingFileSize?: number;
  items: EditItem[];
}


const DEFAULT_ACCESSORIES_TEXT = '• Gravity Hinges: Self-closing SS 304 stainless steel gravity hinges with nylon cam mechanism.\n• Indicator Lock: SS 304 surface-mounted privacy lock with external red/white occupancy indicator and emergency release.\n• Supporting Shoe/Legs: SS 304 adjustable height support legs (100mm to 150mm ground clearance).\n• Coat Hook: SS 304 heavy-duty coat hook with integrated rubber door buffer.\n• Fasteners: Grade 304 stainless steel tamper-proof screws and expanding anchors.';

function getStorageKey(id: string) {
  return `pacific_edit_quotation_v1_${id}`;
}

export default function EditSalesQuotationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotationNum, setQuotationNum] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [catalogModels, setCatalogModels] = useState<ProductCatalogModel[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);

  const cubicleModels = useMemo(
    () => catalogModels.filter((m) => m.category === 'Cubicle' || m.category === 'Kids Toilet'),
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

  useEffect(() => {
    productCatalogApi
      .listModels()
      .then((models) => setCatalogModels(getMergedQuotationModels(models || [])))
      .catch(() => setCatalogModels(getMergedQuotationModels([])));

    companiesApi
      .list()
      .then((res) => {
        const comps = res.data?.data;
        if (Array.isArray(comps)) setCompanies(comps);
      })
      .catch((err) => console.error('Failed to load companies:', err));
  }, []);

  const [form, setForm] = useState<EditFormData>({
    companyProfileId: '',
    recipientSalutation: 'Mr.',
    recipientName: '',
    recipientCompany: '',
    recipientAddress: '',
    recipientEmail: '',
    recipientPhone: '',
    projectName: '',
    subject: '',
    title: '',
    validUntil: '',
    installationCharge: 0,
    installationRatePerCubicle: 1000,
    installationCubicleCount: 0,
    freightTerms: 'Extra as Actual / To pay',
    freightAmount: 0,
    gstRate: 18,
    isSezExempt: false,
    sezCertificateRef: '',
    paymentTerms: '',
    deliveryTerms: '',
    warrantyText: '',
    accessoriesText: '',
    generalTerms: '',
    otherTerms: '',
    notes: '',
    selectedHardwarePreset: 'SS_304',
    customerGstin: '',
    customerStateCode: '',
    customerStateName: '',
    drawingUrl: '',
    drawingFileName: '',
    drawingFileId: '',
    drawingFileSize: 0,
    items: [],
  });

  // Load data from server
  useEffect(() => {
    if (!id) return;

    // Check if there's a saved draft in localStorage
    const storageKey = getStorageKey(id);
    const savedDraft = localStorage.getItem(storageKey);

    setLoading(true);
    salesQuotationsApi
      .getById(id)
      .then((res) => {
        const q: any = res.data?.data ?? res.data;
        setQuotationNum(q.referenceNumber || q.quotationNumber || q.id);

        // Build form data from API response
        const serverForm: EditFormData = {
          companyProfileId: q.companyProfileId || q.companyProfile?.id || '',
          recipientSalutation: q.recipientSalutation || 'Mr.',
          recipientName: q.recipientName || q.customer?.legalName || '',
          recipientCompany: q.recipientCompany || q.customer?.tradeName || '',
          recipientAddress: q.recipientAddress || '',
          recipientEmail: q.recipientEmail || '',
          recipientPhone: q.recipientPhone || '',
          projectName: q.projectName || '',
          subject: q.subject || '',
          title: q.title || '',
          validUntil: q.validUntil ? new Date(q.validUntil).toISOString().split('T')[0] : '',
          installationCharge: Number(q.installationCharge) || 0,
          installationRatePerCubicle: q.installationRatePerCubicle || (Number(q.installationCharge) > 0 ? Math.round(Number(q.installationCharge) / (q.installationCubicleCount || 1)) : 1000),
          installationCubicleCount: q.installationCubicleCount || 0,
          freightTerms: q.freightTerms || 'Extra as Actual / To pay',
          freightAmount: Number(q.freightAmount) || 0,
          gstRate: Number(q.gstRate) || 18,
          isSezExempt: Boolean(q.isSezExempt || q.isSez),
          sezCertificateRef: q.sezCertificateRef || '',
          paymentTerms: q.paymentTerms || '',
          deliveryTerms: q.deliveryTerms || '',
          warrantyText: q.warrantyText || '',
          accessoriesText: q.accessoriesText || '',
          generalTerms: q.generalTerms || '',
          otherTerms: q.otherTerms || q.termsAndConditions || '',
          notes: q.notes || '',
          selectedHardwarePreset: q.selectedHardwarePreset || 'SS_304',
          customerGstin: q.customerGstin || q.customer?.gstin || '',
          customerStateCode: q.customer?.addresses?.[0]?.stateCode || '',
          customerStateName: q.customer?.addresses?.[0]?.state || '',
          drawingUrl: q.drawingUrl || '',
          drawingFileName: q.drawingFileName || '',
          drawingFileId: q.drawingFileId || '',
          drawingFileSize: q.drawingFileSize || 0,
          items: (q.items || []).map((it: any) => ({
            id: it.id,
            modelId: it.modelId || it.productId || '',
            customModelName: it.customModelName || it.modelName || it.customSpecsJson?.customModelName || it.customSpecsJson?.modelName || '',
            description: it.description || it.itemDescription || '',
            unit: it.unit || 'NOS',
            quantity: Number(it.quantity) || 1,
            rate: Number(it.rate ?? it.unitPrice) || 0,
            boardType: it.boardType || it.customSpecsJson?.boardType || 'HPL',
            cubicleSize: it.cubicleSize || '',
            boardColor: it.boardColor || '',
            boardThickness: it.boardThickness || '',
            doorSize: it.doorSize || '',
            overallHeight: it.overallHeight || '',
            hardwarePackage: it.hardwarePackage || it.customSpecsJson?.hardwarePackage || '',
            make: it.make || it.customSpecsJson?.make || 'Pacific',
            systemCategory: (it.customSpecsJson?.systemCategory) ||
              (it.description && it.description.toLowerCase().includes('locker') ? 'locker' :
               it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')) ? 'ump' : 'cubicle'),
            modelImageUrl: it.modelImageUrl || it.customSpecsJson?.modelImageUrl || it.customSpecsJson?.imageUrl || '',
            customSpecsJson: it.customSpecsJson,
          })),
        };

        // If there's a saved draft, merge it over server data
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            setForm(parsed);
          } catch {
            setForm(serverForm);
          }
        } else {
          setForm(serverForm);
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load quotation');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-save to localStorage
  const autoSave = useCallback(
    (data: EditFormData) => {
      if (!id) return;
      localStorage.setItem(getStorageKey(id), JSON.stringify(data));
      setLastSaved(new Date());
    },
    [id]
  );

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => autoSave(form), 800);
      return () => clearTimeout(timer);
    }
  }, [form, loading, autoSave]);

  const resetDraft = () => {
    if (!id) return;
    localStorage.removeItem(getStorageKey(id));
    window.location.reload();
  };

  // Live totals
  const basicPrice = form.items.reduce((s, it) => s + it.quantity * it.rate, 0);

  const detectedCubicleCount = useMemo(() => {
    return form.items
      .filter(isRestroomCubicleItem)
      .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [form.items]);

  const effectiveCubicleCount = form.installationCubicleCount !== undefined && form.installationCubicleCount > 0
    ? form.installationCubicleCount
    : detectedCubicleCount;
  const effectiveInstallRate = form.installationRatePerCubicle ?? (effectiveCubicleCount > 0 && form.installationCharge ? Math.round(Number(form.installationCharge) / effectiveCubicleCount) : 1000);

  const subtotal = basicPrice + Number(form.installationCharge || 0) + Number(form.freightAmount || 0);
  const activeGstin = form.customerGstin || null;
  const activeStateCode = form.customerStateCode || (activeGstin && activeGstin.length >= 2 ? activeGstin.slice(0, 2) : null);
  const activeStateName = form.customerStateName || null;

  const selectedCompany = companies.find((c) => c.id === form.companyProfileId) || companies[0];
  const sellerStateCode = selectedCompany?.stateCode || '07';

  const gstBreakdown = calculateGstSplit(
    subtotal,
    activeStateCode,
    activeStateName,
    Boolean(form.isSezExempt),
    Number(form.gstRate) || 18,
    activeGstin,
    form.recipientAddress,
    sellerStateCode
  );
  const gstAmount = gstBreakdown.totalTax;
  const grandTotal = gstBreakdown.grandTotal;

  const handleItemChange = (idx: number, field: keyof EditItem, value: string | number) => {
    const updated = [...form.items];
    (updated[idx] as any)[field] = value;
    setForm((f) => ({ ...f, items: updated }));
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

  // Handle Model Selection for line item (Auto-fetches dimensions & hardware list)
  const handleSelectModel = (idx: number, modelId: string) => {
    if (!modelId) {
      handleItemChange(idx, 'modelId', '');
      return;
    }
    if (modelId === 'CUSTOM') {
      setForm((f) => {
        const next = [...f.items];
        next[idx] = {
          ...next[idx],
          modelId: 'CUSTOM',
          customModelName: next[idx].customModelName || '',
        };
        return { ...f, items: next };
      });
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
        systemCategory: 'cubicle' as const,
        description: `Pacific ${selected.title} (${selected.category})`,
        cubicleSize: dims.cubicleSize,
        doorSize: dims.doorSize,
        overallHeight: dims.overallHeight,
        boardThickness: dims.boardThickness,
        boardType: dims.boardType,
        hardwarePackage: dims.hardwarePackage,
        make: dims.make || nextItems[idx].make || 'Pacific',
        modelImageUrl: selected.imageUrl || '',
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
      parts.push(primaryModel ? formatModelHardwareInclusions(primaryModel) : DEFAULT_ACCESSORIES_TEXT);
    }
    return parts.join('\n\n');
  }

  const handleSelectUmpModel = (modelId: string) => {
    if (!modelId) {
      setForm((f) => {
        const nextItems = f.items.filter((it) => it.systemCategory !== 'ump' && !(it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
        const primaryItem = nextItems.find((it) => it.systemCategory !== 'locker') || nextItems[0];
        const primaryModel = catalogModels.find((m) => m.id === primaryItem?.modelId);
        const lockerItem = nextItems.find((it) => it.systemCategory === 'locker');
        const lockerModel = catalogModels.find((m) => m.id === lockerItem?.modelId);
        return { ...f, items: nextItems, accessoriesText: buildQuotationAccessoriesText(primaryModel, undefined, lockerModel) };
      });
      return;
    }

    if (modelId === 'CUSTOM') {
      setForm((f) => {
        const existingUmp = f.items.find(
          (it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump')))
        );
        const currentQty = existingUmp ? Number(existingUmp.quantity) || 1 : 1;
        const currentRate = existingUmp && existingUmp.rate > 0 ? existingUmp.rate : 5500;

        const updatedUmpItem: EditItem = {
          modelId: 'CUSTOM',
          customModelName: existingUmp?.customModelName || '',
          systemCategory: 'ump',
          description: existingUmp?.description || 'Pacific Custom Urinal Modesty Partition',
          quantity: currentQty,
          unit: existingUmp?.unit || 'NOS',
          rate: currentRate,
          boardType: existingUmp?.boardType || 'HPL',
          boardThickness: existingUmp?.boardThickness || '12mm',
          boardColor: existingUmp?.boardColor || 'D.No. 123 – Oyster White',
          cubicleSize: existingUmp?.cubicleSize || '450mm W × 900mm H',
          doorSize: 'N/A',
          overallHeight: existingUmp?.overallHeight || '1200mm',
          hardwarePackage: existingUmp?.hardwarePackage || 'Grade 304 Wall Mount Cantilever Clamps',
        };

        const remainingItems = f.items.filter((it) => it !== existingUmp && it.systemCategory !== 'ump' && !(it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
        return { ...f, items: [...remainingItems, updatedUmpItem] };
      });
      return;
    }

    const selected = urinalModels.find((m) => m.id === modelId || m.slug === modelId) || catalogModels.find((m) => m.id === modelId);
    if (!selected) return;
    const dims = extractModelDimensions(selected);
    setForm((f) => {
      const existingUmp = f.items.find((it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
      const updatedUmpItem: EditItem = {
        modelId: selected.id,
        systemCategory: 'ump',
        description: `Pacific ${selected.title} (Urinal Partitions)`,
        quantity: existingUmp ? Number(existingUmp.quantity) || 1 : 1,
        unit: existingUmp?.unit || 'NOS',
        rate: existingUmp && existingUmp.rate > 0 ? existingUmp.rate : 5500,
        boardType: dims.boardType || 'HPL',
        boardThickness: dims.boardThickness || '12mm',
        boardColor: existingUmp?.boardColor || 'D.No. 123 – Oyster White',
        cubicleSize: dims.cubicleSize || '450mm W × 900mm H',
        doorSize: 'N/A',
        overallHeight: dims.overallHeight || '1200mm',
        hardwarePackage: dims.hardwarePackage || 'Grade 304 Wall Mount Cantilever Clamps',
        modelImageUrl: selected.imageUrl || '',
      };
      const remainingItems = f.items.filter((it) => it !== existingUmp && it.systemCategory !== 'ump');
      const nextItems = [...remainingItems, updatedUmpItem];
      const primaryItem = nextItems.find((it) => it.systemCategory !== 'ump' && it.systemCategory !== 'locker') || nextItems[0];
      const primaryModel = catalogModels.find((m) => m.id === primaryItem?.modelId);
      const lockerItem = nextItems.find((it) => it.systemCategory === 'locker');
      const lockerModel = catalogModels.find((m) => m.id === lockerItem?.modelId);
      return { ...f, items: nextItems, accessoriesText: buildQuotationAccessoriesText(primaryModel, selected, lockerModel) };
    });
  };

  const handleUmpFieldChange = (field: keyof EditItem, val: any) => {
    setForm((f) => {
      const idx = f.items.findIndex((it) => it.systemCategory === 'ump' || (it.description && (it.description.toLowerCase().includes('urinal') || it.description.toLowerCase().includes('ump'))));
      if (idx === -1) return f;
      const nextItems = [...f.items];
      nextItems[idx] = { ...nextItems[idx], [field]: val };
      return { ...f, items: nextItems };
    });
  };

  const handleSelectLockerModel = (modelId: string) => {
    if (!modelId) {
      setForm((f) => {
        const nextItems = f.items.filter((it) => it.systemCategory !== 'locker' && !(it.description && it.description.toLowerCase().includes('locker')));
        const primaryItem = nextItems.find((it) => it.systemCategory !== 'ump') || nextItems[0];
        const primaryModel = catalogModels.find((m) => m.id === primaryItem?.modelId);
        const umpItem = nextItems.find((it) => it.systemCategory === 'ump');
        const umpModel = catalogModels.find((m) => m.id === umpItem?.modelId);
        return { ...f, items: nextItems, accessoriesText: buildQuotationAccessoriesText(primaryModel, umpModel, undefined) };
      });
      return;
    }

    if (modelId === 'CUSTOM') {
      setForm((f) => {
        const existingLocker = f.items.find(
          (it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker'))
        );
        const currentQty = existingLocker ? Number(existingLocker.quantity) || 1 : 1;
        const currentRate = existingLocker && existingLocker.rate > 0 ? existingLocker.rate : 14500;

        const updatedLockerItem: EditItem = {
          modelId: 'CUSTOM',
          customModelName: existingLocker?.customModelName || '',
          systemCategory: 'locker',
          description: existingLocker?.description || 'Pacific Custom Modular Lockers',
          quantity: currentQty,
          unit: existingLocker?.unit || 'NOS',
          rate: currentRate,
          boardType: existingLocker?.boardType || 'HPL',
          boardThickness: existingLocker?.boardThickness || '12mm',
          boardColor: existingLocker?.boardColor || 'D.No. 123 – Oyster White',
          cubicleSize: existingLocker?.cubicleSize || '300mm W × 450mm D × 1800mm H',
          doorSize: existingLocker?.doorSize || 'Tier Modular Doors as per drawing',
          overallHeight: existingLocker?.overallHeight || '1900mm',
          hardwarePackage: existingLocker?.hardwarePackage || 'Heavy-Duty Uniform Standard Locker Hardware',
        };

        const remainingItems = f.items.filter((it) => it !== existingLocker && it.systemCategory !== 'locker');
        return { ...f, items: [...remainingItems, updatedLockerItem] };
      });
      return;
    }

    const selected = lockerModels.find((m) => m.id === modelId || m.slug === modelId) || catalogModels.find((m) => m.id === modelId);
    if (!selected) return;
    const dims = extractModelDimensions(selected);
    setForm((f) => {
      const existingLocker = f.items.find((it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker')));
      const updatedLockerItem: EditItem = {
        modelId: selected.id,
        systemCategory: 'locker',
        description: `Pacific ${selected.title} (Lockers)`,
        quantity: existingLocker ? Number(existingLocker.quantity) || 1 : 1,
        unit: existingLocker?.unit || 'NOS',
        rate: existingLocker && existingLocker.rate > 0 ? existingLocker.rate : 14500,
        boardType: dims.boardType || 'HPL',
        boardThickness: dims.boardThickness || '12mm',
        boardColor: existingLocker?.boardColor || 'D.No. 123 – Oyster White',
        cubicleSize: dims.cubicleSize || '300mm W × 450mm D × 1800mm H',
        doorSize: dims.doorSize || 'Tier Modular Doors as per drawing',
        overallHeight: dims.overallHeight || '1900mm',
        hardwarePackage: dims.hardwarePackage || 'Heavy-Duty Uniform Standard Locker Hardware',
        modelImageUrl: selected.imageUrl || '',
      };
      const remainingItems = f.items.filter((it) => it !== existingLocker && it.systemCategory !== 'locker');
      const nextItems = [...remainingItems, updatedLockerItem];
      const primaryItem = nextItems.find((it) => it.systemCategory !== 'ump' && it.systemCategory !== 'locker') || nextItems[0];
      const primaryModel = catalogModels.find((m) => m.id === primaryItem?.modelId);
      const umpItem = nextItems.find((it) => it.systemCategory === 'ump');
      const umpModel = catalogModels.find((m) => m.id === umpItem?.modelId);
      return { ...f, items: nextItems, accessoriesText: buildQuotationAccessoriesText(primaryModel, umpModel, selected) };
    });
  };

  const handleLockerFieldChange = (field: keyof EditItem, val: any) => {
    setForm((f) => {
      const idx = f.items.findIndex((it) => it.systemCategory === 'locker' || (it.description && it.description.toLowerCase().includes('locker')));
      if (idx === -1) return f;
      const nextItems = [...f.items];
      nextItems[idx] = { ...nextItems[idx], [field]: val };
      return { ...f, items: nextItems };
    });
  };

  const [uploadingDrawing, setUploadingDrawing] = useState(false);
  const [drawingUploadError, setDrawingUploadError] = useState<string | null>(null);

  const handleDrawingUpload = async (file: File) => {
    if (!file) return;
    setUploadingDrawing(true);
    setDrawingUploadError(null);
    try {
      const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = file.name.split('.').pop() || 'pdf';
      const fileName = `drawing_${Date.now()}_${cleanBaseName}.${ext}`;

      const result = await uploadToImageKit(file, fileName, 'quotations/drawings');
      setForm((f) => ({
        ...f,
        drawingUrl: result.url,
        drawingFileName: file.name,
        drawingFileId: result.fileId,
        drawingFileSize: file.size,
      }));
    } catch (err: any) {
      console.error('Failed to upload drawing to ImageKit:', err);
      setDrawingUploadError(err.message || 'Failed to upload drawing file to ImageKit CDN');
    } finally {
      setUploadingDrawing(false);
    }
  };

  const handleRemoveDrawing = () => {
    setForm((f) => ({
      ...f,
      drawingUrl: '',
      drawingFileName: '',
      drawingFileId: '',
      drawingFileSize: 0,
    }));
  };

  const addCustomModelItem = () => {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          systemCategory: 'custom',
          modelId: 'CUSTOM',
          customModelName: '',
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
          hardwarePackage: 'SS 304 Stainless Steel (Satin/Brushed)',
          make: 'Pacific',
        },
      ],
    }));
  };

  const addItem = () => {
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
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

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
      errs.sezCertificateRef = 'SEZ Certificate Reference is required when SEZ zero-rated GST is active.';
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
        if (it.quantity <= 0) {
          errs[`item_${idx}_qty`] = `Item #${idx + 1} quantity must be greater than 0.`;
        }
        if (it.rate < 0) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!validateForm()) {
      alert('Please fill in all required fields and correct the errors marked in red.');
      return;
    }
    setSaving(true);
    try {
      await salesQuotationsApi.update(id, {
        ...form,
        drawingUrl: form.drawingUrl || undefined,
        drawingFileName: form.drawingFileName || undefined,
        drawingFileId: form.drawingFileId || undefined,
        items: form.items.map((it, idx) => ({
          ...it,
          serialNumber: idx + 1,
          customModelName: it.customModelName || undefined,
          modelId: it.modelId || undefined,
          description: it.description,
          unit: it.unit,
          quantity: Number(it.quantity),
          rate: Number(it.rate),
          boardType: it.boardType || 'HPL',
          cubicleSize: it.cubicleSize || undefined,
          boardColor: it.boardColor || undefined,
          boardThickness: it.boardThickness || undefined,
          doorSize: it.doorSize || undefined,
          overallHeight: it.overallHeight || undefined,
          hardwarePackage: it.hardwarePackage || undefined,
          make: it.make || undefined,
          modelImageUrl: it.modelImageUrl || undefined,
          customSpecsJson: {
            ...(typeof (it as any).customSpecsJson === 'object' ? (it as any).customSpecsJson : {}),
            customModelName: it.customModelName || undefined,
            modelName: it.customModelName || undefined,
            modelImageUrl: it.modelImageUrl || undefined,
            systemCategory: it.systemCategory || undefined,
            hardwarePackage: it.hardwarePackage || undefined,
            boardType: it.boardType || 'HPL',
            make: it.make || undefined,
          },
        })),
        validUntil: form.validUntil || undefined,
        installationCharge: Number(form.installationCharge),
        freightAmount: Number(form.freightAmount),
        gstRate: Number(form.gstRate),
      });
      if (id) localStorage.removeItem(getStorageKey(id));
      navigate(`/admin/dashboard/sales-quotations/${id}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#7FB706] transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-400 mb-1';
  const getInputCls = (key: string) =>
    fieldErrors[key]
      ? 'w-full bg-[#0a0a1a] border border-red-500 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-400 transition-colors'
      : inputCls;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading quotation for editing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 text-sm">{error}</p>
          <Link
            to="/admin/dashboard/sales-quotations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-sm hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to={`/admin/dashboard/sales-quotations/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Detail
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Edit Quotation</h1>
              <p className="text-sm text-gray-400 font-mono">{quotationNum}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-gray-500 hidden sm:block">
              Draft saved {lastSaved.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Discard draft and reload from server"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Document Flow Timeline (Stage 01) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={1}
        linkedDocs={{
          quotationId: id,
          quotationRef: quotationNum,
        }}
        advanceInfo={{
          grandTotal,
          advanceRequired: Math.round(grandTotal * 0.5),
          advancePaymentStatus: 'DRAFT',
        }}
      />

      {/* Live Total Banner */}
      <div className="bg-[#121226] border border-[#7FB706]/20 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-4 text-sm">
        <div className="text-gray-400">Basic: <span className="text-white font-mono font-semibold">₹ {basicPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        {form.installationCharge > 0 && (
          <div className="text-gray-400">
            Installation:{' '}
            <span className="text-white font-mono font-semibold">
              ₹ {Number(form.installationCharge).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {effectiveCubicleCount > 0 && (
              <span className="text-xs text-[#7FB706] font-mono ml-1 font-bold">
                (@ ₹ {effectiveInstallRate.toLocaleString('en-IN')}/Cubicle for {effectiveCubicleCount} Cubicle{effectiveCubicleCount === 1 ? '' : 's'})
              </span>
            )}
          </div>
        )}
        {form.freightAmount > 0 && <div className="text-gray-400">Freight: <span className="text-white font-mono font-semibold">₹ {form.freightAmount.toLocaleString('en-IN')}</span></div>}
        {gstBreakdown.isSez ? (
          <div className="text-gray-400">GST (0% SEZ): <span className="text-white font-mono font-semibold">₹ 0.00</span></div>
        ) : gstBreakdown.isDelhi ? (
          <>
            <div className="text-gray-400">CGST (9%): <span className="text-white font-mono font-semibold">₹ {gstBreakdown.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div className="text-gray-400">SGST (9%): <span className="text-white font-mono font-semibold">₹ {gstBreakdown.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          </>
        ) : (
          <div className="text-gray-400">IGST ({form.gstRate}%): <span className="text-white font-mono font-semibold">₹ {gstBreakdown.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        )}
        <div className="ml-auto font-bold text-[#7FB706] text-base font-mono">
          Total: ₹ {grandTotal.toLocaleString('en-IN')}
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

      {/* ── Dynamic Issuing Branch & Entity Selection ───────── */}
      <BranchSelector
        companies={companies}
        selectedCompanyId={form.companyProfileId || ''}
        onSelectCompany={(compId) => setForm((f) => ({ ...f, companyProfileId: compId }))}
        label="Issuing Branch & Commercial Operating Entity"
        sublabel="Select which branch is issuing this quotation. Determines seller GST jurisdiction, billing address, and factory dispatch."
      />

      {/* Section 1: Recipient */}
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

      {/* Section 2: Project */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Project & Validity</h3>
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
            <input type="date" value={form.validUntil}
              onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Subject Line</label>
            <input type="text" value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Submission of Commercial Offer..." className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Quotation Title</label>
            <input type="text" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Quotation for Supply of Toilet Cubicles" className={inputCls} />
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
                    const cCount = form.installationCubicleCount !== undefined && form.installationCubicleCount > 0 ? form.installationCubicleCount : detectedCubicleCount;
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
                  const count = form.installationCubicleCount !== undefined && form.installationCubicleCount > 0 ? form.installationCubicleCount : detectedCubicleCount;
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
                value={form.installationCubicleCount !== undefined && form.installationCubicleCount > 0 ? form.installationCubicleCount : (detectedCubicleCount || '')}
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
              <span className="text-[10px] text-slate-400">
                {detectedCubicleCount > 0
                  ? `Auto-detected: ${detectedCubicleCount} Cubicle${detectedCubicleCount === 1 ? '' : 's'}`
                  : '0 Cubicles in item list (Hardware/Board only)'}
              </span>
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
                  const count = form.installationCubicleCount !== undefined && form.installationCubicleCount > 0 ? form.installationCubicleCount : detectedCubicleCount;
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
              {form.installationCharge > 0 && (form.installationCubicleCount || detectedCubicleCount) > 0
                ? `(@ ₹ ${(form.installationRatePerCubicle ?? 1000).toLocaleString('en-IN')}/Cubicle for ${form.installationCubicleCount || detectedCubicleCount} Cubicle${(form.installationCubicleCount || detectedCubicleCount) === 1 ? '' : 's'})`
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
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sezToggle"
            checked={form.isSezExempt}
            onChange={(e) => setForm((f) => ({ ...f, isSezExempt: e.target.checked }))}
            className="w-4 h-4 accent-[#7FB706] cursor-pointer"
          />
          <label htmlFor="sezToggle" className="text-sm text-gray-300 cursor-pointer">
            SEZ Zero-Rated (0% IGST — requires valid LUT/SEZ certificate)
          </label>
        </div>
        {form.isSezExempt && (
          <div>
            <label className={labelCls}>SEZ Certificate Reference *</label>
            <input
              type="text"
              value={form.sezCertificateRef}
              onChange={(e) => {
                setForm((f) => ({ ...f, sezCertificateRef: e.target.value }));
                clearFieldError('sezCertificateRef');
              }}
              placeholder="SEZ Certificate No. / Form-I Reference"
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
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7FB706]" /> Line Items &amp; Specifications
            </h3>
            {fieldErrors.items && (
              <p className="text-xs text-red-400 mt-0.5">{fieldErrors.items}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                addCustomModelItem();
                clearFieldError('items');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              title="Write custom model name and technical specifications"
            >
              <Plus className="w-3.5 h-3.5" />
              ＋ Add Custom Item &amp; Model
            </button>
            <button
              type="button"
              onClick={() => {
                addItem();
                clearFieldError('items');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
        </div>

        {form.items.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No line items yet. Click "Add Item" to add cubicle specifications.
          </div>
        )}

        <div className="space-y-5">
          {(() => {
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
                {/* ── PRIMARY CUBICLE SYSTEM ── */}
                {primaryCubicleItem && (
                  <div className="bg-[#0a0a1a] border border-[#7FB706]/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#7FB706]">Item #1 (Primary System)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-[#7FB706]" /> Cubicle Model System
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3 space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <label className={labelCls}>Product Model Selection &amp; Description (Optional)</label>
                          <span className="text-[11px] text-[#7FB706] font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Auto-fetches hardware list, sizes &amp; height
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <select
                            value={primaryCubicleItem.modelId || ''}
                            onChange={(e) => handleSelectModel(primaryCubicleIdx, e.target.value)}
                            className={inputCls + ' bg-[#161536] border-[#7FB706]/40 font-semibold'}
                          >
                            <option value="">-- Choose Product Model (Optional) --</option>
                            {cubicleModels.length > 0 && (
                              <optgroup label={`Restroom Cubicles (${cubicleModels.length} Listed)`}>
                                {cubicleModels.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                              </optgroup>
                            )}
                            <option value="CUSTOM">Custom / Manual Specification (Write Model)</option>
                          </select>
                          <input
                            type="text"
                            value={primaryCubicleItem.description}
                            onChange={(e) => { handleItemChange(primaryCubicleIdx, 'description', e.target.value); clearFieldError(`item_${primaryCubicleIdx}_desc`); }}
                            placeholder="Description (auto-filled on model select)"
                            className={getInputCls(`item_${primaryCubicleIdx}_desc`)}
                            required
                          />
                        </div>
                        {primaryCubicleItem.modelId === 'CUSTOM' && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                            <span className="text-xs font-bold text-amber-300 whitespace-nowrap flex items-center gap-1.5">
                              <span>✍️</span> Custom Model Name:
                            </span>
                            <input
                              type="text"
                              value={primaryCubicleItem.customModelName || ''}
                              onChange={(e) => handleItemChange(primaryCubicleIdx, 'customModelName', e.target.value)}
                              placeholder="e.g. Pacific Luxe Floor-to-Ceiling / Custom Restroom Model"
                              className="flex-1 w-full bg-[#0a0a1a] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-semibold"
                            />
                            <span className="text-[11px] text-amber-300/80 italic whitespace-nowrap">Printed in PDF Model specification</span>
                          </div>
                        )}
                        {fieldErrors[`item_${primaryCubicleIdx}_desc`] && <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_desc`]}</p>}

                        <ModelImageField
                          imageUrl={primaryCubicleItem.modelImageUrl}
                          modelName={
                            primaryCubicleItem.customModelName ||
                            primaryCubicleItem.modelName ||
                            (cubicleModels.find((m) => m.id === primaryCubicleItem.modelId)?.title) ||
                            'Restroom Cubicle'
                          }
                          categoryLabel="Cubicle Model Visual"
                          onImageChange={(newUrl) => handleItemChange(primaryCubicleIdx, 'modelImageUrl', newUrl)}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Unit</label>
                        <select value={primaryCubicleItem.unit} onChange={(e) => handleItemChange(primaryCubicleIdx, 'unit', e.target.value)} className={inputCls}>
                          {['NOS', 'SET', 'SQM', 'MTR', 'RMT', 'LOT'].map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Quantity *</label>
                        <input type="number" min="0.01" step="0.01" value={primaryCubicleItem.quantity} onChange={(e) => { handleItemChange(primaryCubicleIdx, 'quantity', Number(e.target.value) || 0); clearFieldError(`item_${primaryCubicleIdx}_qty`); }} className={getInputCls(`item_${primaryCubicleIdx}_qty`)} required />
                        {fieldErrors[`item_${primaryCubicleIdx}_qty`] && <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_qty`]}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>Rate (₹) *</label>
                        <input type="number" min="0" step="0.01" value={primaryCubicleItem.rate} onChange={(e) => { handleItemChange(primaryCubicleIdx, 'rate', Number(e.target.value) || 0); clearFieldError(`item_${primaryCubicleIdx}_rate`); }} className={getInputCls(`item_${primaryCubicleIdx}_rate`)} required />
                        {fieldErrors[`item_${primaryCubicleIdx}_rate`] && <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${primaryCubicleIdx}_rate`]}</p>}
                      </div>
                    </div>

                    <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5"><span>⚙️</span> Cubicle Technical Specifications</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Board Type *</label>
                          <select value={primaryCubicleItem.boardType || 'HPL'} onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardType', e.target.value)} className={inputCls}>
                            <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                            <option value="HDF">HDF (High Density Fibreboard)</option>
                          </select>
                        </div>
                        <div><label className={labelCls}>Board Thickness</label><input type="text" value={primaryCubicleItem.boardThickness || ''} onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardThickness', e.target.value)} placeholder="e.g. 12mm / 18mm" className={inputCls} /></div>
                        <div><label className={labelCls}>Board Color</label><input type="text" value={primaryCubicleItem.boardColor || ''} onChange={(e) => handleItemChange(primaryCubicleIdx, 'boardColor', e.target.value)} placeholder="e.g. D.No. 123 – Oyster White" className={inputCls} /></div>
                        <div><label className={labelCls}>Cubicle Size</label><input type="text" value={primaryCubicleItem.cubicleSize || ''} onChange={(e) => handleItemChange(primaryCubicleIdx, 'cubicleSize', e.target.value)} placeholder="e.g. 1000mm W × 1500mm D" className={inputCls} /></div>
                        <div><label className={labelCls}>Door Size</label><input type="text" value={primaryCubicleItem.doorSize || ''} onChange={(e) => handleItemChange(primaryCubicleIdx, 'doorSize', e.target.value)} placeholder="e.g. 600mm × 1785mm" className={inputCls} /></div>
                        <div><label className={labelCls}>Overall Height</label><input type="text" value={primaryCubicleItem.overallHeight || ''} onChange={(e) => handleItemChange(primaryCubicleIdx, 'overallHeight', e.target.value)} placeholder="e.g. 1980mm (incl. 100mm ground clearance)" className={inputCls} /></div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className={labelCls}>Make</label>
                            <span className="text-[10px] text-gray-400 font-normal">Type or pick preset</span>
                          </div>
                          <input
                            type="text"
                            value={primaryCubicleItem.make ?? 'Pacific'}
                            onChange={(e) => handleItemChange(primaryCubicleIdx, 'make', e.target.value)}
                            placeholder="e.g. Pacific / Greenlam / Merino"
                            className={inputCls}
                          />
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {['Pacific', 'Greenlam', 'Merino', 'Stylam', 'Formica'].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleItemChange(primaryCubicleIdx, 'make', preset)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                  (primaryCubicleItem.make ?? 'Pacific') === preset
                                    ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#7FB706] font-medium'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 font-mono">
                      Line Total: <span className="font-bold text-white">₹ {((Number(primaryCubicleItem.quantity) || 0) * (Number(primaryCubicleItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                {/* ── OPTIONAL #2: URINAL MODESTY PARTITION ── */}
                <div className={`rounded-xl p-4 space-y-3 transition-all ${umpItem ? 'bg-[#0a1826] border border-cyan-500/50' : 'bg-[#0a1826]/40 border border-cyan-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">Optional Section #2</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" /> Urinal Modesty Partition (UMP)
                      </span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${umpItem ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-gray-800 text-gray-400'}`}>
                      {umpItem ? '✓ Active & Included' : 'Optional / Not Selected'}
                    </span>
                  </div>
                  <div>
                    <label className={labelCls}>Urinal Partition Model Selection (Optional)</label>
                    <select value={umpItem?.modelId || ''} onChange={(e) => handleSelectUmpModel(e.target.value)} className="w-full mt-1.5 bg-[#161536] border border-cyan-500/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-cyan-400 focus:outline-none">
                      <option value="">-- No Urinal Partitions Required (Optional) --</option>
                      {urinalModels.length > 0 && (
                        <optgroup label={`Urinal Partitions (${urinalModels.length} Listed)`}>
                          {urinalModels.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </optgroup>
                      )}
                      <option value="CUSTOM">Custom / Manual Specification (Write Model)</option>
                    </select>
                  </div>
                  {umpItem && umpItem.modelId === 'CUSTOM' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                      <span className="text-xs font-bold text-amber-300 whitespace-nowrap flex items-center gap-1.5">
                        <span>✍️</span> Custom UMP Model Name:
                      </span>
                      <input
                        type="text"
                        value={umpItem.customModelName || ''}
                        onChange={(e) => handleUmpFieldChange('customModelName', e.target.value)}
                        placeholder="e.g. Pacific Custom Modesty Partition / Designer Glass UMP"
                        className="flex-1 w-full bg-[#0a0a1a] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-semibold"
                      />
                      <span className="text-[11px] text-amber-300/80 italic whitespace-nowrap">Printed in PDF Model specification</span>
                    </div>
                  )}
                  {umpItem && (
                    <ModelImageField
                      imageUrl={umpItem.modelImageUrl}
                      modelName={
                        umpItem.customModelName ||
                        (urinalModels.find((m) => m.id === umpItem.modelId)?.title) ||
                        'Urinal Modesty Partition'
                      }
                      categoryLabel="Urinal Partition Visual"
                      onImageChange={(newUrl) => handleUmpFieldChange('modelImageUrl', newUrl)}
                    />
                  )}
                  {umpItem && (
                    <div className="space-y-3 pt-2 border-t border-cyan-500/20">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Unit</label>
                          <select value={umpItem.unit} onChange={(e) => handleUmpFieldChange('unit', e.target.value)} className={inputCls}>
                            {['NOS', 'SET', 'SQM', 'MTR', 'LOT'].map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Quantity *</label>
                          <input type="number" min="0.01" step="0.01" value={umpItem.quantity} onChange={(e) => handleUmpFieldChange('quantity', Number(e.target.value) || 0)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input type="number" min="0" step="0.01" value={umpItem.rate} onChange={(e) => handleUmpFieldChange('rate', Number(e.target.value) || 0)} className={inputCls} />
                        </div>
                      </div>
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-3"><span>⚙️</span> Urinal Partition Specifications</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type *</label>
                            <select value={umpItem.boardType || 'HPL'} onChange={(e) => handleUmpFieldChange('boardType', e.target.value)} className={inputCls}>
                              <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                              <option value="HDF">HDF (High Density Fibreboard)</option>
                            </select>
                          </div>
                          <div><label className={labelCls}>Board Thickness</label><input type="text" value={umpItem.boardThickness || ''} onChange={(e) => handleUmpFieldChange('boardThickness', e.target.value)} placeholder="e.g. 12mm" className={inputCls} /></div>
                          <div><label className={labelCls}>Board Color</label><input type="text" value={umpItem.boardColor || ''} onChange={(e) => handleUmpFieldChange('boardColor', e.target.value)} placeholder="e.g. Oyster White" className={inputCls} /></div>
                          <div><label className={labelCls}>Partition Size</label><input type="text" value={umpItem.cubicleSize || ''} onChange={(e) => handleUmpFieldChange('cubicleSize', e.target.value)} placeholder="e.g. 450mm W × 900mm H" className={inputCls} /></div>
                          <div><label className={labelCls}>Overall Height</label><input type="text" value={umpItem.overallHeight || ''} onChange={(e) => handleUmpFieldChange('overallHeight', e.target.value)} placeholder="e.g. 1200mm" className={inputCls} /></div>
                          <div><label className={labelCls}>Hardware Package</label><input type="text" value={umpItem.hardwarePackage || ''} onChange={(e) => handleUmpFieldChange('hardwarePackage', e.target.value)} placeholder="e.g. Grade 304 Wall Mount Clamps" className={inputCls} /></div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs text-gray-400">
                        Line Total: <span className="font-bold text-cyan-300 text-sm">₹ {((Number(umpItem.quantity) || 0) * (Number(umpItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── OPTIONAL #3: MODULAR LOCKER SYSTEM ── */}
                <div className={`rounded-xl p-4 space-y-3 transition-all ${lockerItem ? 'bg-[#140e2b] border border-purple-500/50' : 'bg-[#140e2b]/40 border border-purple-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-400">Optional Section #3</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-purple-400" /> Modular Locker System
                      </span>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${lockerItem ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-gray-800 text-gray-400'}`}>
                      {lockerItem ? '✓ Active & Included' : 'Optional / Not Selected'}
                    </span>
                  </div>
                  <div>
                    <label className={labelCls}>Modular Locker Model Selection (Optional)</label>
                    <select value={lockerItem?.modelId || ''} onChange={(e) => handleSelectLockerModel(e.target.value)} className="w-full mt-1.5 bg-[#161536] border border-purple-500/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-purple-400 focus:outline-none">
                      <option value="">-- No Modular Lockers Required (Optional) --</option>
                      {lockerModels.length > 0 && (
                        <optgroup label={`Modular Lockers (${lockerModels.length} Listed)`}>
                          {lockerModels.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </optgroup>
                      )}
                      <option value="CUSTOM">Custom / Manual Specification (Write Model)</option>
                    </select>
                  </div>
                  {lockerItem && lockerItem.modelId === 'CUSTOM' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                      <span className="text-xs font-bold text-amber-300 whitespace-nowrap flex items-center gap-1.5">
                        <span>✍️</span> Custom Locker Model Name:
                      </span>
                      <input
                        type="text"
                        value={lockerItem.customModelName || ''}
                        onChange={(e) => handleLockerFieldChange('customModelName', e.target.value)}
                        placeholder="e.g. Pacific Custom Tier Z-Lockers / Gym Locker"
                        className="flex-1 w-full bg-[#0a0a1a] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-semibold"
                      />
                      <span className="text-[11px] text-amber-300/80 italic whitespace-nowrap">Printed in PDF Model specification</span>
                    </div>
                  )}
                  {lockerItem && (
                    <ModelImageField
                      imageUrl={lockerItem.modelImageUrl}
                      modelName={
                        lockerItem.customModelName ||
                        (lockerModels.find((m) => m.id === lockerItem.modelId)?.title) ||
                        'Modular Locker'
                      }
                      categoryLabel="Modular Locker Visual"
                      onImageChange={(newUrl) => handleLockerFieldChange('modelImageUrl', newUrl)}
                    />
                  )}
                  {lockerItem && (
                    <div className="space-y-3 pt-2 border-t border-purple-500/20">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Unit</label>
                          <select value={lockerItem.unit} onChange={(e) => handleLockerFieldChange('unit', e.target.value)} className={inputCls}>
                            {['NOS', 'SET', 'BANK', 'BAY', 'LOT'].map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Quantity *</label>
                          <input type="number" min="0.01" step="0.01" value={lockerItem.quantity} onChange={(e) => handleLockerFieldChange('quantity', Number(e.target.value) || 0)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input type="number" min="0" step="0.01" value={lockerItem.rate} onChange={(e) => handleLockerFieldChange('rate', Number(e.target.value) || 0)} className={inputCls} />
                        </div>
                      </div>
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-3"><span>⚙️</span> Locker Technical Specifications</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type *</label>
                            <select value={lockerItem.boardType || 'HPL'} onChange={(e) => handleLockerFieldChange('boardType', e.target.value)} className={inputCls}>
                              <option value="HPL">HPL (High Pressure Compact Laminate)</option>
                              <option value="HDF">HDF (High Density Fibreboard)</option>
                            </select>
                          </div>
                          <div><label className={labelCls}>Board Thickness</label><input type="text" value={lockerItem.boardThickness || ''} onChange={(e) => handleLockerFieldChange('boardThickness', e.target.value)} placeholder="e.g. 12mm" className={inputCls} /></div>
                          <div><label className={labelCls}>Board Color</label><input type="text" value={lockerItem.boardColor || ''} onChange={(e) => handleLockerFieldChange('boardColor', e.target.value)} placeholder="e.g. Oyster White" className={inputCls} /></div>
                          <div><label className={labelCls}>Locker Dimension</label><input type="text" value={lockerItem.cubicleSize || ''} onChange={(e) => handleLockerFieldChange('cubicleSize', e.target.value)} placeholder="e.g. 300mm W × 450mm D × 1800mm H" className={inputCls} /></div>
                          <div><label className={labelCls}>Door Size</label><input type="text" value={lockerItem.doorSize || ''} onChange={(e) => handleLockerFieldChange('doorSize', e.target.value)} placeholder="e.g. Tier Modular Doors as per drawing" className={inputCls} /></div>
                          <div><label className={labelCls}>Overall Height</label><input type="text" value={lockerItem.overallHeight || ''} onChange={(e) => handleLockerFieldChange('overallHeight', e.target.value)} placeholder="e.g. 1900mm" className={inputCls} /></div>
                          <div className="sm:col-span-2 lg:col-span-3"><label className={labelCls}>Hardware Package</label><input type="text" value={lockerItem.hardwarePackage || ''} onChange={(e) => handleLockerFieldChange('hardwarePackage', e.target.value)} placeholder="e.g. Master-Keyed Cam Lock, Concealed Pivot Hinges" className={inputCls} /></div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs text-gray-400">
                        Line Total: <span className="font-bold text-purple-300 text-sm">₹ {((Number(lockerItem.quantity) || 0) * (Number(lockerItem.rate) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── ADDITIONAL CUBICLE SYSTEMS ── */}
                {additionalCubicleItems.map((item, addIdx) => {
                  const realIdx = form.items.indexOf(item);
                  return (
                    <div key={realIdx} className="bg-[#0a0a1a] border border-[#7FB706]/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#7FB706]">Additional System #{addIdx + 2}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#7FB706]" /> Cubicle Model System
                          </span>
                        </div>
                        <button type="button" onClick={() => removeItem(realIdx)} className="p-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-3 space-y-1.5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className={labelCls}>
                                  Product Model Name <span className="text-[11px] text-amber-300 font-medium">(Write Manually)</span>
                                </label>
                                <span className="text-[10px] text-amber-300/80">Printed on PDF</span>
                              </div>
                              <input
                                type="text"
                                value={item.customModelName ?? (item.modelId && item.modelId !== 'CUSTOM' ? (cubicleModels.find((m) => m.id === item.modelId)?.title || '') : '')}
                                onChange={(e) => {
                                  handleItemChange(realIdx, 'customModelName', e.target.value);
                                  handleItemChange(realIdx, 'modelName', e.target.value);
                                  handleItemChange(realIdx, 'modelId', 'CUSTOM');
                                }}
                                placeholder="e.g. Pacific Classique / Custom Model Name"
                                className={inputCls + ' font-semibold text-white bg-[#0a0a1a] border-amber-500/40 focus:border-amber-400'}
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className={labelCls}>Description *</label>
                              </div>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  handleItemChange(realIdx, 'description', e.target.value);
                                  clearFieldError(`item_${realIdx}_desc`);
                                }}
                                placeholder="Item description / specification"
                                className={getInputCls(`item_${realIdx}_desc`)}
                                required
                              />
                              {fieldErrors[`item_${realIdx}_desc`] && (
                                <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${realIdx}_desc`]}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <ModelImageField
                            imageUrl={item.modelImageUrl}
                            modelName={item.customModelName || item.description || `Item #${realIdx + 1}`}
                            categoryLabel="Line Item Model Visual"
                            onImageChange={(newUrl) => handleItemChange(realIdx, 'modelImageUrl', newUrl)}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Unit</label>
                          <select value={item.unit} onChange={(e) => handleItemChange(realIdx, 'unit', e.target.value)} className={inputCls}>
                            {['NOS', 'SET', 'SQM', 'MTR', 'LOT'].map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Quantity *</label>
                          <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(realIdx, 'quantity', Number(e.target.value) || 0)} className={inputCls} required />
                        </div>
                        <div>
                          <label className={labelCls}>Rate (₹) *</label>
                          <input type="number" min="0" step="0.01" value={item.rate} onChange={(e) => handleItemChange(realIdx, 'rate', Number(e.target.value) || 0)} className={inputCls} required />
                        </div>
                      </div>

                      {/* Technical Specifications */}
                      <div className="bg-[#121226]/80 border border-white/5 rounded-xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>⚙️</span> Technical Specifications
                          </span>
                          <span className="text-[11px] text-gray-400">Board type, dimensions &amp; colors</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Board Type</label>
                            <select
                              value={item.boardType || 'HPL'}
                              onChange={(e) => handleItemChange(realIdx, 'boardType', e.target.value)}
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
                              onChange={(e) => handleItemChange(realIdx, 'boardThickness', e.target.value)}
                              placeholder="e.g. 12mm / 18mm"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Board Color</label>
                            <input
                              type="text"
                              value={item.boardColor || ''}
                              onChange={(e) => handleItemChange(realIdx, 'boardColor', e.target.value)}
                              placeholder="e.g. D.No. 123 – Oyster White"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Size / Dimension</label>
                            <input
                              type="text"
                              value={item.cubicleSize || ''}
                              onChange={(e) => handleItemChange(realIdx, 'cubicleSize', e.target.value)}
                              placeholder="e.g. 1000mm W × 1500mm D"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Door Size</label>
                            <input
                              type="text"
                              value={item.doorSize || ''}
                              onChange={(e) => handleItemChange(realIdx, 'doorSize', e.target.value)}
                              placeholder="e.g. 600mm × 1785mm"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Overall Height</label>
                            <input
                              type="text"
                              value={item.overallHeight || ''}
                              onChange={(e) => handleItemChange(realIdx, 'overallHeight', e.target.value)}
                              placeholder="e.g. 1980mm (incl. 100mm clearance)"
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
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>

      {/* Section 4B: Architectural & Technical Drawing (CAD / Layout Plan) */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#7FB706]" />
            <h3 className="text-sm font-bold text-white">Architectural &amp; Site Drawing (CAD / Layout Plan)</h3>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ImageKit CDN Storage
          </span>
        </div>

        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2">
          <span className="text-sm">🔒</span>
          <div>
            <strong>Internal Technical Reference Only:</strong> Uploaded drawing is stored on ImageKit CDN for factory estimation, fabrication, and engineering reference. It is <em>strictly excluded</em> and will never appear on the customer-facing Quotation PDF.
          </div>
        </div>

        {form.drawingUrl ? (
          <div className="bg-[#0a0a1a] border border-[#7FB706]/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#7FB706]/10 border border-[#7FB706]/30 flex items-center justify-center text-[#7FB706] flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {form.drawingFileName || 'Architectural_Drawing.pdf'}
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                  {form.drawingFileSize ? <span>{(form.drawingFileSize / 1024).toFixed(1)} KB</span> : null}
                  <span className="text-[#7FB706] font-medium">✓ Uploaded to ImageKit</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={form.drawingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#7FB706] border border-[#7FB706]/40 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>View Drawing</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <button
                type="button"
                onClick={handleRemoveDrawing}
                className="inline-flex items-center justify-center p-2.5 min-h-[44px] min-w-[44px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="Remove uploaded drawing"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label
              htmlFor="edit-drawing-file-upload"
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                uploadingDrawing
                  ? 'border-gray-600 bg-white/5 opacity-60 cursor-not-allowed'
                  : 'border-white/10 hover:border-[#7FB706]/50 bg-[#0a0a1a] hover:bg-white/[0.02]'
              }`}
            >
              <input
                id="edit-drawing-file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.webp"
                disabled={uploadingDrawing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDrawingUpload(file);
                }}
              />
              <UploadCloud className={`w-8 h-8 mb-2 ${uploadingDrawing ? 'text-gray-500 animate-bounce' : 'text-[#7FB706]'}`} />
              <div className="text-sm font-semibold text-white">
                {uploadingDrawing ? 'Uploading Drawing to ImageKit CDN...' : 'Click to Upload CAD / Site Drawing'}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Supports PDF, DWG, DXF, PNG, JPG (Internal technical reference)
              </p>
            </label>

            {drawingUploadError && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <span>⚠️</span> {drawingUploadError}
              </p>
            )}
          </div>
        )}
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
            <textarea rows={3} value={form.paymentTerms}
              onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
              placeholder="e.g. 50% advance with PO, balance before dispatch"
              className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className={labelCls}>Delivery & Lead Time</label>
            <textarea rows={3} value={form.deliveryTerms}
              onChange={(e) => setForm((f) => ({ ...f, deliveryTerms: e.target.value }))}
              placeholder="e.g. 2–3 weeks from receipt of advance"
              className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className={labelCls}>Warranty Commitment</label>
            <textarea rows={3} value={form.warrantyText}
              onChange={(e) => setForm((f) => ({ ...f, warrantyText: e.target.value }))}
              placeholder="Warranty terms..."
              className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className={labelCls}>General Terms</label>
            <textarea rows={3} value={form.generalTerms}
              onChange={(e) => setForm((f) => ({ ...f, generalTerms: e.target.value }))}
              placeholder="General commercial terms..."
              className={inputCls + ' resize-none'} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Other Terms / Notes</label>
            <textarea rows={3} value={form.otherTerms}
              onChange={(e) => setForm((f) => ({ ...f, otherTerms: e.target.value }))}
              placeholder="Any additional conditions..."
              className={inputCls + ' resize-none'} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Internal Notes (not printed on PDF)</label>
          <textarea rows={2} value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Internal remarks, negotiation notes..."
            className={inputCls + ' resize-none'} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          to={`/admin/dashboard/sales-quotations/${id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-8 py-2.5 min-h-[44px] bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
