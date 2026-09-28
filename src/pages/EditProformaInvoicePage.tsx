import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Truck,
  Layers,
  FileText,
  Sparkles,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  MapPin,
  Wrench,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { piApi } from '../api/proformaApi';
import { crmApi } from '../api/crmApi';
import { productCatalogApi } from '../api/productCatalogApi';
import {
  getMergedQuotationModels,
  formatModelHardwareInclusions,
  extractModelDimensions,
  extractModelHardwareItems,
} from '../utils/quotationProductPresets';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';
import CustomerSearchSelect from '../components/common/CustomerSearchSelect';
import type { BusinessParty, ProductCatalogModel } from '../types/admin';
import { calculateGstSplit, isDelhiState } from '../utils/tax';
import { DEFAULT_ACCESSORIES_TEXT, type CreateItem, type BillingAddressData, type DeliveryAddressData } from './CreateProformaPage';

export default function EditProformaInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups
  const [customers, setCustomers] = useState<BusinessParty[]>([]);
  const [catalogModels, setCatalogModels] = useState<ProductCatalogModel[]>([]);

  // Metadata
  const [piNumber, setPiNumber] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [customerId, setCustomerId] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('Delhi');
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState('07');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [modeOfTransport, setModeOfTransport] = useState('Road');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [grLrNumber, setGrLrNumber] = useState('');
  const [linkedPoNumber, setLinkedPoNumber] = useState('');
  const [linkedPoDate, setLinkedPoDate] = useState('');
  const [freightAmount, setFreightAmount] = useState<number>(0);
  const [advancePercentage, setAdvancePercentage] = useState<number>(50);
  const [quotationId, setQuotationId] = useState<string | undefined>(undefined);
  const [quotationRef, setQuotationRef] = useState<string | undefined>(undefined);

  // Hardware & Inclusions
  const [selectedHardwarePreset, setSelectedHardwarePreset] = useState<string>('SS_304');
  const [accessoriesText, setAccessoriesText] = useState<string>(DEFAULT_ACCESSORIES_TEXT);

  // Addresses
  const [billingAddress, setBillingAddress] = useState<BillingAddressData>({
    partyName: '',
    gstin: '',
    pan: '',
    addressLine: '',
    city: 'New Delhi',
    pincode: '',
    state: 'Delhi',
    stateCode: '07',
    phone: '',
    email: '',
  });

  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressData>({
    partyName: '',
    addressLine: '',
    city: 'New Delhi',
    pincode: '',
    state: 'Delhi',
    stateCode: '07',
    phone: '',
  });

  // Items & Terms
  const [items, setItems] = useState<CreateItem[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [newTermText, setNewTermText] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  // Load PI and lookups
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [piRes, custRes, modelsList] = await Promise.all([
        piApi.getById(id),
        crmApi.listCustomers({ limit: 100 }).catch(() => ({ data: { data: { items: [] } } })),
        productCatalogApi.listModels().catch(() => []),
      ]);

      const data = piRes.data?.data ?? (piRes.data as any);
      setCustomers(custRes.data?.data?.items || []);
      setCatalogModels(getMergedQuotationModels(modelsList || []));

      setPiNumber(data.piNumber || '');
      setStatus(data.status || 'DRAFT');
      setCustomerId(data.customerId || '');
      setPlaceOfSupply(data.placeOfSupply || 'Delhi');
      setPlaceOfSupplyStateCode(data.placeOfSupplyStateCode || '07');
      setReverseCharge(Boolean(data.reverseCharge));
      setModeOfTransport(data.modeOfTransport || 'Road');
      setVehicleNumber(data.vehicleNumber || '');
      setGrLrNumber(data.grLrNumber || '');
      setLinkedPoNumber(data.linkedPoNumber || '');
      setLinkedPoDate(data.linkedPoDate ? new Date(data.linkedPoDate).toISOString().split('T')[0] : '');
      setFreightAmount(Number(data.freightAmount) || 0);
      setAdvancePercentage(Number(data.advancePercentage) || 50);
      setQuotationId(data.quotationId || undefined);
      setQuotationRef(data.quotationRef || undefined);

      // Extract Parties
      const bParty = data.parties?.find((p: any) => p.partyRole === 'BILL_TO');
      const sParty = data.parties?.find((p: any) => p.partyRole === 'SHIP_TO');

      // Extract PAN & PIN from addressLine if formatted
      const bAddr = bParty?.addressLine || '';
      const panMatch = bAddr.match(/PAN:\s*([A-Z0-9]{10})/i);
      const pinMatch = bAddr.match(/PIN:\s*(\d{6})/i);
      const cleanBAddr = bAddr.replace(/,\s*(PAN:\s*[A-Z0-9]{10}|PIN:\s*\d{6})/gi, '').trim();

      const customerPan = (data.customer as any)?.pan || '';
      const bGstin = bParty?.gstin || data.customer?.gstin || '';
      const bPan = panMatch ? panMatch[1] : (customerPan || (bGstin.length === 15 ? bGstin.slice(2, 12) : ''));
      const bPincode = pinMatch ? pinMatch[1] : (data.customer?.addresses?.[0]?.postalCode || '');

      setBillingAddress({
        partyName: bParty?.partyName || data.customer?.legalName || '',
        gstin: bGstin,
        pan: bPan,
        addressLine: cleanBAddr,
        city: 'New Delhi',
        pincode: bPincode,
        state: bParty?.state || data.placeOfSupply || 'Delhi',
        stateCode: bParty?.stateCode || data.placeOfSupplyStateCode || '07',
        phone: bParty?.phone || data.customer?.phone || '',
        email: bParty?.email || data.customer?.email || '',
      });

      const sAddr = sParty?.addressLine || '';
      const sPinMatch = sAddr.match(/PIN:\s*(\d{6})/i);
      const cleanSAddr = sAddr.replace(/,\s*PIN:\s*\d{6}/gi, '').trim();

      setDeliveryAddress({
        partyName: sParty?.partyName || bParty?.partyName || data.customer?.legalName || '',
        addressLine: cleanSAddr || cleanBAddr,
        city: 'New Delhi',
        pincode: sPinMatch ? sPinMatch[1] : bPincode,
        state: sParty?.state || bParty?.state || 'Delhi',
        stateCode: sParty?.stateCode || bParty?.stateCode || '07',
        phone: sParty?.phone || bParty?.phone || '',
      });

      // Extract Hardware Inclusions from Terms
      const termsList: string[] = Array.isArray(data.terms) ? data.terms.map((t: any) => t.text) : [];
      const hardwareTerm = termsList.find(
        (t) =>
          t.toLowerCase().includes('hardware accessories') ||
          t.toLowerCase().includes('standard inclusions')
      );

      if (hardwareTerm) {
        const cleanHw = hardwareTerm.replace(/^Standard Inclusions & Hardware Accessories:\s*/i, '').trim();
        setAccessoriesText(cleanHw);
        setTerms(termsList.filter((t) => t !== hardwareTerm));
      } else {
        setTerms(termsList);
      }

      // Extract Items & Specifications
      if (data.items && Array.isArray(data.items)) {
        setItems(
          data.items.map((it: any) => {
            const rawDesc: string = it.description || '';
            let mainDesc = rawDesc;
            let boardType = it.boardType || 'HPL';
            let boardThickness = it.boardThickness || '12mm';
            let boardColor = it.boardColor || 'D.No. 123 – Oyster White';
            let cubicleSize = it.cubicleSize || '1000mm W × 1500mm D';
            let doorSize = it.doorSize || '600mm × 1785mm';
            let overallHeight = it.overallHeight || '1980mm (incl. 100mm ground clearance)';
            let hardwarePackage = it.hardwarePackage || 'SS 304 Stainless Steel (Satin/Brushed)';

            // Parse specs from \n(Board: ... | Hardware: ...)
            if (rawDesc.includes('(') && rawDesc.includes(')')) {
              const specSection = rawDesc.slice(rawDesc.indexOf('(') + 1, rawDesc.lastIndexOf(')'));
              mainDesc = rawDesc.slice(0, rawDesc.indexOf('(')).trim();

              const parts = specSection.split('|').map((s) => s.trim());
              parts.forEach((p) => {
                const [k, ...vParts] = p.split(':');
                const v = vParts.join(':').trim();
                const keyLower = k.toLowerCase().trim();
                if (keyLower.includes('board')) {
                  const bTokens = v.split(' ');
                  if (bTokens[0]) boardType = bTokens[0];
                  if (bTokens[1]) boardThickness = bTokens.slice(1).join(' ');
                } else if (keyLower.includes('color')) {
                  boardColor = v;
                } else if (keyLower.includes('size')) {
                  cubicleSize = v;
                } else if (keyLower.includes('door')) {
                  doorSize = v;
                } else if (keyLower.includes('height')) {
                  overallHeight = v;
                } else if (keyLower.includes('hardware')) {
                  hardwarePackage = v;
                }
              });
            }

            const isHardware =
              it.hsnSac === '8302' ||
              it.hsnSac === '7610' ||
              (!it.boardType &&
                !rawDesc.includes('Board:') &&
                (it.unit === 'SET' || it.unit === 'PAIR' || it.unit === 'NOS' || it.unit === 'PCS' || it.unit === 'RMT') &&
                !mainDesc.toLowerCase().includes('cubicle') &&
                !mainDesc.toLowerCase().includes('partition') &&
                !mainDesc.toLowerCase().includes('locker'));

            if (isHardware) {
              return {
                id: it.id,
                itemType: 'hardware',
                isCustom: true,
                description: mainDesc,
                hsnSac: it.hsnSac || '8302',
                quantity: Number(it.quantity) || 1,
                unit: it.unit || 'SET',
                rate: Number(it.rate) || 0,
                gstRate: Number(it.gstRate ?? 18),
              };
            }

            return {
              id: it.id,
              itemType: 'cubicle',
              modelId: it.productId,
              description: mainDesc,
              hsnSac: it.hsnSac || '9403',
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'NOS',
              rate: Number(it.rate) || 0,
              gstRate: Number(it.gstRate ?? 18),
              boardType,
              boardThickness,
              boardColor,
              cubicleSize,
              doorSize,
              overallHeight,
              hardwarePackage,
            };
          })
        );
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load Proforma Invoice for editing.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Customer selection auto-fill
  const handleCustomerSelect = (cId: string) => {
    setCustomerId(cId);
    const selected = customers.find((c) => c.id === cId);
    if (!selected) return;

    const billing = selected.addresses?.find((a: any) => a.addressType === 'BILLING' || a.isDefaultBilling) || selected.addresses?.[0];
    const shipping = selected.addresses?.find((a: any) => a.addressType === 'SHIPPING' || a.isDefaultShipping) || billing;

    const bState = billing?.state || 'Delhi';
    const bStateCode = billing?.stateCode || (bState.toLowerCase().includes('delhi') ? '07' : '07');

    setPlaceOfSupply(bState);
    setPlaceOfSupplyStateCode(bStateCode);

    setBillingAddress((prev) => ({
      ...prev,
      partyName: selected.legalName || selected.tradeName || prev.partyName,
      gstin: selected.gstin || prev.gstin,
      pan: selected.pan || prev.pan,
      addressLine: [billing?.addressLine1, billing?.addressLine2].filter(Boolean).join(', ') || prev.addressLine,
      city: billing?.city || prev.city,
      pincode: billing?.postalCode || (billing as any)?.pincode || prev.pincode,
      state: bState,
      stateCode: bStateCode,
      phone: selected.phone || (selected as any).contactPhone || prev.phone,
      email: selected.email || (selected as any).contactEmail || prev.email,
    }));

    setDeliveryAddress((prev) => ({
      ...prev,
      partyName: selected.legalName || selected.tradeName || prev.partyName,
      addressLine: [shipping?.addressLine1, shipping?.addressLine2].filter(Boolean).join(', ') || prev.addressLine,
      city: shipping?.city || prev.city,
      pincode: shipping?.postalCode || (shipping as any)?.pincode || prev.pincode,
      state: shipping?.state || bState,
      stateCode: shipping?.stateCode || bStateCode,
      phone: selected.phone || (selected as any).contactPhone || prev.phone,
    }));
  };

  // Copy Billing Address to Delivery Address
  const handleCopyBillingToDelivery = () => {
    setDeliveryAddress({
      partyName: billingAddress.partyName,
      addressLine: billingAddress.addressLine,
      city: billingAddress.city,
      pincode: billingAddress.pincode,
      state: billingAddress.state,
      stateCode: billingAddress.stateCode,
      phone: billingAddress.phone,
    });
  };

  // Line item handlers
  const handleItemChange = (idx: number, field: keyof CreateItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSelectModel = (idx: number, modelId: string) => {
    if (!modelId) {
      handleItemChange(idx, 'modelId', '');
      return;
    }

    const selected = catalogModels.find((m) => m.id === modelId || m.slug === modelId);
    if (!selected) return;

    const dims = extractModelDimensions(selected);
    const hwText = formatModelHardwareInclusions(selected);
    const qty = Number(items[idx]?.quantity) || 1;
    const modelHwItems: CreateItem[] = extractModelHardwareItems(selected, qty).map((h) => ({
      ...h,
      parentModelId: selected.id,
    }));

    setItems((prev) => {
      const current = prev[idx];
      const previousParentId = current?.modelId;

      const updatedCubicle: CreateItem = {
        ...current,
        modelId: selected.id,
        itemType: 'cubicle',
        description: `Pacific ${selected.title} (${selected.category})`,
        cubicleSize: dims.cubicleSize,
        doorSize: dims.doorSize,
        overallHeight: dims.overallHeight,
        boardThickness: dims.boardThickness,
        boardType: dims.boardType,
        hardwarePackage: dims.hardwarePackage,
      };

      // Filter out auto-generated hardware items previously linked to this model
      const otherItems = prev.filter((it, i) => {
        if (i === idx) return false;
        if (it.itemType === 'hardware' && !it.isCustom && previousParentId && it.parentModelId === previousParentId) {
          return false;
        }
        return true;
      });

      // Insert updated cubicle and its individual hardware items directly after it
      const before = otherItems.slice(0, idx);
      const after = otherItems.slice(idx);

      return [...before, updatedCubicle, ...modelHwItems, ...after];
    });

    setAccessoriesText(hwText);
    clearFieldError(`item_${idx}_desc`);
  };

  const handleAddCubicleItem = () => {
    const defaultHardware = 'SS 304 Stainless Steel (Satin/Brushed)';
    setItems((prev) => [
      ...prev,
      {
        itemType: 'cubicle',
        description: '',
        hsnSac: '9403',
        unit: 'NOS',
        quantity: 1,
        rate: 18500,
        gstRate: 18,
        boardType: 'HPL',
        boardThickness: '12mm',
        boardColor: 'D.No. 123 – Oyster White',
        cubicleSize: '1000mm W × 1500mm D',
        doorSize: '600mm × 1785mm',
        overallHeight: '1980mm (incl. 100mm ground clearance)',
        hardwarePackage: defaultHardware,
      },
    ]);
  };

  const handleAddHardwareItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemType: 'hardware',
        isCustom: true,
        description: '',
        hsnSac: '8302',
        unit: 'SET',
        quantity: 1,
        rate: 0,
        gstRate: 18,
      },
    ]);
  };

  const handleAddItem = handleAddCubicleItem;

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('A Proforma Invoice must have at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Terms handlers
  const handleAddTerm = () => {
    if (!newTermText.trim()) return;
    setTerms((prev) => [...prev, newTermText.trim()]);
    setNewTermText('');
  };

  const handleRemoveTerm = (index: number) => {
    setTerms((prev) => prev.filter((_, i) => i !== index));
  };

  // Math Computations
  const basicPrice = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
    0
  );
  const totalTaxable = basicPrice + Number(freightAmount || 0);

  const gstBreakdown = calculateGstSplit(
    totalTaxable,
    billingAddress.stateCode,
    billingAddress.state,
    false,
    18,
    billingAddress.gstin,
    billingAddress.addressLine
  );
  const grandTotal = gstBreakdown.grandTotal;
  const requiredAdvance = Math.round(grandTotal * (Number(advancePercentage || 50) / 100));

  // Field validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!billingAddress.partyName.trim()) {
      errs.partyName = 'Billing Party Name is required.';
    }

    if (billingAddress.gstin && billingAddress.gstin.trim().length !== 15) {
      errs.gstin = 'GSTIN must be exactly 15 characters (e.g. 07AAAAA0000A1Z5).';
    }

    if (billingAddress.pan && billingAddress.pan.trim().length !== 10) {
      errs.pan = 'PAN must be exactly 10 alphanumeric characters (e.g. ABCDE1234F).';
    }

    if (items.length === 0) {
      errs.items = 'At least one line item is required.';
    } else {
      items.forEach((it, idx) => {
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

  // Submit Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || submitting) return;

    if (!validateForm()) {
      alert('Please fill in all required fields and correct the errors marked in red.');
      return;
    }

    setSubmitting(true);
    try {
      // Build clean structured address lines containing PIN and PAN
      const billAddrParts = [
        billingAddress.addressLine,
        billingAddress.city,
        billingAddress.pincode ? `PIN: ${billingAddress.pincode}` : '',
        billingAddress.pan ? `PAN: ${billingAddress.pan.toUpperCase().trim()}` : '',
      ].filter(Boolean);
      const billToAddressFormatted = billAddrParts.join(', ');

      const shipAddrParts = [
        deliveryAddress.addressLine,
        deliveryAddress.city,
        deliveryAddress.pincode ? `PIN: ${deliveryAddress.pincode}` : '',
      ].filter(Boolean);
      const shipToAddressFormatted = shipAddrParts.join(', ');

      // Prepare terms with Standard Inclusions & Hardware Accessories
      const finalTerms = [
        `Standard Inclusions & Hardware Accessories:\n${accessoriesText}`,
        ...terms.filter(
          (t) =>
            !t.toLowerCase().includes('hardware accessories') &&
            !t.toLowerCase().includes('standard inclusions')
        ),
      ];

      // Enrich item descriptions with specifications so they persist to DB, PDF, and Detail views
      const enrichedItems = items.map((it) => {
        let desc = it.description;
        const specParts = [];
        if (it.boardType || it.boardThickness) {
          specParts.push(`Board: ${[it.boardType, it.boardThickness].filter(Boolean).join(' ')}`);
        }
        if (it.boardColor) specParts.push(`Color: ${it.boardColor}`);
        if (it.cubicleSize) specParts.push(`Size: ${it.cubicleSize}`);
        if (it.doorSize) specParts.push(`Door: ${it.doorSize}`);
        if (it.overallHeight) specParts.push(`Height: ${it.overallHeight}`);
        if (it.hardwarePackage) specParts.push(`Hardware: ${it.hardwarePackage}`);

        if (specParts.length > 0 && !desc.includes('Board:')) {
          desc = `${desc}\n(${specParts.join(' | ')})`;
        }

        return {
          id: it.id,
          productId: (it.modelId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.modelId)) ? it.modelId : undefined,
          description: desc,
          hsnSac: it.hsnSac || (it.itemType === 'hardware' ? '8302' : '9403'),
          quantity: Number(it.quantity) || 1,
          unit: it.unit || (it.itemType === 'hardware' ? 'SET' : 'NOS'),
          rate: Number(it.rate) || 0,
          gstRate: Number(it.gstRate || 18),
          boardType: it.boardType || undefined,
          boardThickness: it.boardThickness || undefined,
          boardColor: it.boardColor || undefined,
          cubicleSize: it.cubicleSize || undefined,
          doorSize: it.doorSize || undefined,
          overallHeight: it.overallHeight || undefined,
          hardwarePackage: it.hardwarePackage || undefined,
        };
      });

      await piApi.update(id, {
        customerId,
        placeOfSupply,
        placeOfSupplyStateCode,
        reverseCharge,
        modeOfTransport,
        vehicleNumber,
        grLrNumber,
        linkedPoNumber,
        linkedPoDate: linkedPoDate || undefined,
        freightAmount,
        advancePercentage,
        advanceRequiredAmount: requiredAdvance,
        status,
        billTo: {
          partyName: billingAddress.partyName,
          gstin: billingAddress.gstin ? billingAddress.gstin.toUpperCase().trim() : undefined,
          addressLine: billToAddressFormatted,
          state: billingAddress.state,
          stateCode: billingAddress.stateCode,
          phone: billingAddress.phone || undefined,
          email: billingAddress.email || undefined,
        },
        shipTo: {
          partyName: deliveryAddress.partyName || billingAddress.partyName,
          gstin: billingAddress.gstin ? billingAddress.gstin.toUpperCase().trim() : undefined,
          addressLine: shipToAddressFormatted || billToAddressFormatted,
          state: deliveryAddress.state || billingAddress.state,
          stateCode: deliveryAddress.stateCode || billingAddress.stateCode,
          phone: deliveryAddress.phone || billingAddress.phone || undefined,
        },
        items: enrichedItems,
        terms: finalTerms,
        notes: `Updated on ${new Date().toLocaleString('en-GB')}`,
      });

      alert('Proforma Invoice updated successfully!');
      navigate(`/admin/dashboard/proforma-invoices/${id}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update Proforma Invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-400 mb-1';
  const getInputCls = (key: string) =>
    fieldErrors[key]
      ? 'w-full bg-[#0a0a1a] border border-red-500 rounded-xl p-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400 transition-colors'
      : inputCls;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-mono text-sm">Loading Proforma Invoice for Editing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-[#121226] border border-red-500/20 rounded-2xl text-center space-y-4 shadow-2xl">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Error Loading PI</h2>
        <p className="text-sm text-gray-400">{error}</p>
        <Link
          to="/admin/dashboard/proforma-invoices"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to List
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* ── Top Back Button ────────────────────────────────────── */}
      <div className="py-2">
        <Link
          to={`/admin/dashboard/proforma-invoices/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to PI Details
        </Link>
      </div>

      {/* ── Document Flow Timeline (Stage 02) ───────────────────── */}
      <DocumentFlowTimeline
        currentStage={2}
        advanceInfo={{
          grandTotal,
          advanceRequired: requiredAdvance,
          advancePaymentStatus: status === 'ISSUED' ? 'PENDING' : 'DRAFT',
        }}
      />

      {/* ── Client Selection ────────────────────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
          <Building2 className="w-4 h-4 text-[#7FB706]" /> Client Master Assignment
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CustomerSearchSelect
            customers={customers}
            selectedCustomerId={customerId}
            onSelectCustomer={(cId) => handleCustomerSelect(cId)}
            label="Customer Party"
            placeholder="Search party name, email, GST, phone..."
            required={false}
          />

          <div>
            <label className={labelCls}>Lifecycle Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputCls + ' font-semibold text-amber-300'}
            >
              <option value="DRAFT">DRAFT (Drafting &amp; Internal Review)</option>
              <option value="ISSUED">ISSUED (Official Commercial Demand)</option>
              <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
              <option value="PAID">PAID</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Card 2: Billing & Delivery Addresses (with GST, PAN, PIN) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing Address Card */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#7FB706]" /> Billing Address (Customer)
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706]">
              Tax Target
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>Legal / Entity Name *</label>
              <input
                type="text"
                value={billingAddress.partyName}
                onChange={(e) => {
                  setBillingAddress((prev) => ({ ...prev, partyName: e.target.value }));
                  if (fieldErrors.partyName) {
                    setFieldErrors((prev) => {
                      const { partyName, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                placeholder="Customer registered company name"
                className={getInputCls('partyName')}
                required
              />
              {fieldErrors.partyName && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.partyName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>GSTIN Number (15 Digits)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={billingAddress.gstin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    const stateCode = val.length >= 2 && /^\d{2}$/.test(val.slice(0, 2)) ? val.slice(0, 2) : billingAddress.stateCode;
                    const state = stateCode === '07' ? 'Delhi' : billingAddress.state;
                    setPlaceOfSupply(state);
                    setPlaceOfSupplyStateCode(stateCode);
                    setBillingAddress((prev) => ({
                      ...prev,
                      gstin: val,
                      stateCode,
                      state,
                    }));
                  }}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className={getInputCls('gstin') + ' font-mono'}
                />
                {fieldErrors.gstin && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.gstin}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>PAN Number (10 Digits)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={billingAddress.pan}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setBillingAddress((prev) => ({ ...prev, pan: val }));
                  }}
                  placeholder="e.g. ABCDE1234F"
                  className={getInputCls('pan') + ' font-mono'}
                />
                {fieldErrors.pan && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.pan}</p>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>Address Line (Premises, Street, Area)</label>
              <input
                type="text"
                value={billingAddress.addressLine}
                onChange={(e) =>
                  setBillingAddress((prev) => ({ ...prev, addressLine: e.target.value }))
                }
                placeholder="Building No, Industrial Area, Street"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  value={billingAddress.city}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="New Delhi"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={billingAddress.pincode}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, pincode: e.target.value }))
                  }
                  placeholder="110020"
                  className={inputCls + ' font-mono'}
                />
              </div>

              <div>
                <label className={labelCls}>State &amp; Code</label>
                <input
                  type="text"
                  value={`${billingAddress.state} (${billingAddress.stateCode})`}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBillingAddress((prev) => ({ ...prev, state: val }));
                  }}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Billing Phone</label>
                <input
                  type="text"
                  value={billingAddress.phone}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Billing Email</label>
                <input
                  type="email"
                  value={billingAddress.email}
                  onChange={(e) =>
                    setBillingAddress((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="accounts@company.com"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Address Card */}
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" /> Delivery Address (Ship To / Site)
            </h3>
            <button
              type="button"
              onClick={handleCopyBillingToDelivery}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition cursor-pointer"
              title="Copy from Billing Address"
            >
              <Copy className="w-3 h-3" /> Same as Billing
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>Consignee / Site Name</label>
              <input
                type="text"
                value={deliveryAddress.partyName}
                onChange={(e) =>
                  setDeliveryAddress((prev) => ({ ...prev, partyName: e.target.value }))
                }
                placeholder="Site contact or company name"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Delivery / Site Address</label>
              <input
                type="text"
                value={deliveryAddress.addressLine}
                onChange={(e) =>
                  setDeliveryAddress((prev) => ({ ...prev, addressLine: e.target.value }))
                }
                placeholder="Exact site delivery location"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  value={deliveryAddress.city}
                  onChange={(e) =>
                    setDeliveryAddress((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="New Delhi"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={deliveryAddress.pincode}
                  onChange={(e) =>
                    setDeliveryAddress((prev) => ({ ...prev, pincode: e.target.value }))
                  }
                  placeholder="110020"
                  className={inputCls + ' font-mono'}
                />
              </div>

              <div>
                <label className={labelCls}>State &amp; Code</label>
                <input
                  type="text"
                  value={`${deliveryAddress.state} (${deliveryAddress.stateCode})`}
                  onChange={(e) =>
                    setDeliveryAddress((prev) => ({ ...prev, state: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Site Contact Phone</label>
              <input
                type="text"
                value={deliveryAddress.phone}
                onChange={(e) =>
                  setDeliveryAddress((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+91 98765 43210 (Site In-charge)"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 3: Transport & Logistics ──────────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
          <Truck className="w-4 h-4 text-amber-400" /> Transport, Logistics &amp; PO References
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Place of Supply *</label>
            <input
              type="text"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              placeholder="Delhi"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Place of Supply State Code *</label>
            <input
              type="text"
              maxLength={2}
              value={placeOfSupplyStateCode}
              onChange={(e) => setPlaceOfSupplyStateCode(e.target.value)}
              placeholder="07"
              className={inputCls + ' font-mono'}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Mode of Transport</label>
            <select
              value={modeOfTransport}
              onChange={(e) => setModeOfTransport(e.target.value)}
              className={inputCls}
            >
              {['Road', 'Courier', 'Air', 'Self Pickup', 'To Pay'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Vehicle Number</label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. DL 01 AB 1234"
              className={inputCls + ' font-mono'}
            />
          </div>

          <div>
            <label className={labelCls}>GR / LR Number</label>
            <input
              type="text"
              value={grLrNumber}
              onChange={(e) => setGrLrNumber(e.target.value)}
              placeholder="e.g. LR-987654"
              className={inputCls + ' font-mono'}
            />
          </div>

          <div>
            <label className={labelCls}>Linked PO Number</label>
            <input
              type="text"
              value={linkedPoNumber}
              onChange={(e) => setLinkedPoNumber(e.target.value)}
              placeholder="e.g. PO/2026/049"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Linked PO Date</label>
            <input
              type="date"
              value={linkedPoDate}
              onChange={(e) => setLinkedPoDate(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Freight Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={freightAmount}
              onChange={(e) => setFreightAmount(Number(e.target.value) || 0)}
              placeholder="0"
              className={inputCls + ' font-mono'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
          <div>
            <label className={labelCls}>Advance Required (%)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                value={advancePercentage}
                onChange={(e) => setAdvancePercentage(Number(e.target.value) || 0)}
                className={inputCls + ' font-mono max-w-[140px]'}
              />
              <span className="text-xs text-gray-400">
                Amount: <strong className="text-white font-mono">₹{requiredAdvance.toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="reverseChargeEdit"
              checked={reverseCharge}
              onChange={(e) => setReverseCharge(e.target.checked)}
              className="w-4 h-4 rounded border-gray-700 text-[#7FB706] focus:ring-[#7FB706]"
            />
            <label htmlFor="reverseChargeEdit" className="text-xs text-gray-300">
              Tax is payable on Reverse Charge basis (RCM)
            </label>
          </div>
        </div>
      </div>

      {/* ── Card 4: Standard Inclusions & Hardware Accessories ── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Wrench className="w-4 h-4 text-[#7FB706]" />
          <h3 className="text-sm font-bold text-white">Standard Inclusions &amp; Hardware Accessories</h3>
        </div>

        <div>
          <label className={labelCls}>Standard Inclusions &amp; Hardware Accessories *</label>
          <textarea
            rows={5}
            value={accessoriesText}
            onChange={(e) => setAccessoriesText(e.target.value)}
            placeholder="Door stoppers, gravity hinges, indicator locks, coat hooks, support shoes..."
            className={inputCls + ' font-mono text-xs leading-relaxed'}
          />
        </div>
      </div>

      {/* ── Card 5: Line Items Configuration ───────────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7FB706]" /> Line Items (Cubicles &amp; Individual Hardware)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Select cubicle models to auto-generate hardware lists, or add custom hardware with individual rates and units.
            </p>
            {fieldErrors.items && (
              <p className="text-xs text-red-400 mt-0.5">{fieldErrors.items}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddCubicleItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB706]/10 hover:bg-[#7FB706]/20 text-[#7FB706] rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Cubicle Model
            </button>
            <button
              type="button"
              onClick={handleAddHardwareItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" /> Add Custom Hardware
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => {
            const isHardware = item.itemType === 'hardware';
            const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);

            if (isHardware) {
              return (
                <div key={idx} className="bg-[#0b1022] border border-cyan-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">Item #{idx + 1}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-cyan-400" />
                        {item.isCustom ? 'Custom Hardware Component' : 'Hardware Component'}
                      </span>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
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
                        placeholder="e.g. Gravity Hinges (Self-Closing Pair with Nylon Cam)"
                        className={getInputCls(`item_${idx}_desc`)}
                        required
                      />
                      {fieldErrors[`item_${idx}_desc`] && (
                        <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_desc`]}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className={labelCls}>HSN / SAC</label>
                      <input
                        type="text"
                        value={item.hsnSac || '8302'}
                        onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                        placeholder="8302"
                        className={inputCls + ' font-mono text-xs'}
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className={labelCls}>Unit</label>
                      <select
                        value={item.unit || 'SET'}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className={inputCls + ' text-xs'}
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
                        className={getInputCls(`item_${idx}_qty`) + ' font-mono text-xs'}
                        required
                      />
                      {fieldErrors[`item_${idx}_qty`] && (
                        <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_qty`]}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-1">
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
                        className={getInputCls(`item_${idx}_rate`) + ' font-mono text-xs font-bold text-cyan-300'}
                        required
                      />
                      {fieldErrors[`item_${idx}_rate`] && (
                        <p className="mt-1 text-xs text-red-400">{fieldErrors[`item_${idx}_rate`]}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                    <span className="text-[11px] text-gray-500 italic">
                      Hardware Itemized line item (HSN: {item.hsnSac || '8302'} · GST: 18%)
                    </span>
                    <div className="text-right font-mono text-xs text-gray-400">
                      Line Total: <span className="font-bold text-cyan-300 text-sm">
                        ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="bg-[#0a0a1a] border border-[#7FB706]/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#7FB706]">Item #{idx + 1}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7FB706]/10 text-[#7FB706] border border-[#7FB706]/30 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#7FB706]" /> Cubicle Model System
                    </span>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
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
                        <Sparkles className="w-3 h-3" /> Auto-generates individual hardware items &amp; dimensions
                      </span>
                    </div>

                    <div>
                      <select
                        value={item.modelId || ''}
                        onChange={(e) => handleSelectModel(idx, e.target.value)}
                        className="w-full bg-[#161536] border border-[#7FB706]/40 rounded-xl px-3 py-2.5 text-white font-semibold text-xs focus:border-[#7FB706] focus:outline-none"
                        required
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
                      </select>
                    </div>
                    {item.description && (
                      <div className="text-[11px] text-gray-400 font-medium px-1 flex items-center gap-1.5">
                        <span className="text-gray-500">Selected Model:</span>
                        <span className="text-white font-semibold">{item.description}</span>
                      </div>
                    )}
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
                      <label className={labelCls}>Board Color / Shade</label>
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

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className={labelCls}>Hardware Package Specification</label>
                      <input
                        type="text"
                        value={item.hardwarePackage || ''}
                        onChange={(e) => handleItemChange(idx, 'hardwarePackage', e.target.value)}
                        placeholder="e.g. SS 304 Stainless Steel (Satin/Brushed)"
                        className={inputCls}
                      />
                    </div>
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
        </div>
      </div>

      {/* ── Card 6: Commercial Terms & Conditions ──────────────── */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Commercial Terms &amp; Conditions</h3>
          </div>
          <span className="text-xs text-gray-500 font-mono">{terms.length} Clauses</span>
        </div>

        <div className="space-y-2">
          {terms.map((term, idx) => (
            <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-[#0a0a1a] border border-white/5">
              <span className="text-xs font-mono text-gray-500 mt-1 shrink-0">{idx + 1}.</span>
              <p className="text-xs text-gray-300 flex-1 leading-relaxed">{term}</p>
              <button
                type="button"
                onClick={() => handleRemoveTerm(idx)}
                className="text-gray-500 hover:text-red-400 p-1"
                title="Remove clause"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <input
            type="text"
            value={newTermText}
            onChange={(e) => setNewTermText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTerm();
              }
            }}
            placeholder="Add new commercial condition or delivery clause..."
            className={inputCls + ' text-xs'}
          />
          <button
            type="button"
            onClick={handleAddTerm}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
          >
            Add Clause
          </button>
        </div>
      </div>

      {/* ── Form Footer: Grand Total & Statutory GST Breakdown Card ── */}
      <div className="bg-[#121226] border border-[#7FB706]/30 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#7FB706]" /> Financial Summary &amp; Statutory GST Breakdown
          </h3>
          <span className="text-xs font-mono text-[#7FB706]">
            Place of Supply: {placeOfSupply} ({placeOfSupplyStateCode})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">Basic Goods Value</span>
            <span className="text-white font-mono font-bold text-sm">
              ₹ {basicPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">Freight &amp; Handling</span>
            <span className="text-white font-mono font-bold text-sm">
              ₹ {freightAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">Net Taxable Amount</span>
            <span className="text-white font-mono font-bold text-sm">
              ₹ {totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3 bg-[#0a0a1a] rounded-xl border border-white/5">
            <span className="text-gray-400 block mb-1">{advancePercentage}% Required Advance</span>
            <span className="text-amber-400 font-mono font-bold text-sm">
              ₹ {requiredAdvance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* GST Tax Slabs & Grand Total Banner */}
        <div className="p-3.5 bg-[#0a0a1a] rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {gstBreakdown.isDelhi ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">CGST (9%):</span>
                  <span className="text-blue-400 font-mono font-bold">
                    ₹ {gstBreakdown.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">SGST (9%):</span>
                  <span className="text-blue-400 font-mono font-bold">
                    ₹ {gstBreakdown.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">IGST (18%):</span>
                <span className="text-purple-400 font-mono font-bold">
                  ₹ {gstBreakdown.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm font-semibold">Grand Total:</span>
            <span className="text-[#7FB706] font-mono font-bold text-lg sm:text-xl">
              ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Floating Action Bar ─────────────────────────── */}
      <div className="sticky bottom-4 z-20 bg-[#121226]/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs sm:text-sm">
          <div className="text-gray-400">
            Grand Total: <span className="font-bold text-[#7FB706] font-mono text-base">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="text-gray-400 border-l border-white/10 pl-4">
            Required Advance ({advancePercentage}%): <span className="font-bold text-amber-400 font-mono text-base">₹ {requiredAdvance.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm transition cursor-pointer shadow-lg shadow-[#7FB706]/20 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Saving Proforma Invoice...' : 'Save Proforma Invoice'}
          </button>
        </div>
      </div>
    </form>
  );
}
