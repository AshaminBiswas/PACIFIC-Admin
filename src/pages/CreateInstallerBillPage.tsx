import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  MapPin,
  Mail,
  User,
  Phone,
  ShieldCheck,
  CreditCard,
  Send,
  Building2,
  Sparkles,
  Layers,
  Package,
  Wrench,
  Coins,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import { installerPaymentsService } from '../api/installerPaymentsService';
import { isNcrPinCode } from '../utils/ncrPincodes';
import type {
  CubicleModel,
  CubicleInstaller,
  CreateInstallerBillPayload,
} from '../types/installerPayment';

interface CreateInstallerBillPageProps {
  onBack?: () => void;
}

interface LineItemRow {
  id: string;
  category: 'CUBICLE' | 'UMP' | 'LOCKER';
  modelId: string;
  quantity: number;
  unitPrice: number;
}

export function CreateInstallerBillPage({ onBack }: CreateInstallerBillPageProps = {}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/admin/dashboard/installer-payments');
    }
  };

  const [models, setModels] = useState<CubicleModel[]>([]);
  const [installers, setInstallers] = useState<CubicleInstaller[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Form State: 1. Installer Identification
  const [selectedInstallerId, setSelectedInstallerId] = useState<string>('');
  const [installerName, setInstallerName] = useState<string>('');
  const [installerEmail, setInstallerEmail] = useState<string>('');
  const [installerPhone, setInstallerPhone] = useState<string>('');
  const [isAutoPopulated, setIsAutoPopulated] = useState<boolean>(false);

  // Form State: 2. Site & Date
  const [installDate, setInstallDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isNcr, setIsNcr] = useState<boolean>(false);
  const [travelExpenses, setTravelExpenses] = useState<number>(0);
  const [siteAddress, setSiteAddress] = useState<string>('');
  const [sitePin, setSitePin] = useState<string>('');

  // Form State: 3. Dynamic Item Categories (start at 0)
  const [cubicleItems, setCubicleItems] = useState<LineItemRow[]>([
    { id: 'cubicle-1', category: 'CUBICLE', modelId: '', quantity: 0, unitPrice: 0 },
  ]);
  const [umpItems, setUmpItems] = useState<LineItemRow[]>([
    { id: 'ump-1', category: 'UMP', modelId: '', quantity: 0, unitPrice: 0 },
  ]);
  const [lockerItems, setLockerItems] = useState<LineItemRow[]>([
    { id: 'locker-1', category: 'LOCKER', modelId: '', quantity: 0, unitPrice: 0 },
  ]);

  // Form State: 4. Payment Advance Management System
  const [hasAdvance, setHasAdvance] = useState<boolean>(false);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [advanceDate, setAdvanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [advanceNote, setAdvanceNote] = useState<string>('');

  // Form State: 5. Deductions & Adjustments
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState<string>('');

  // Form State: 6. Settlement on Completion & Notes
  const [initialAmountPaid, setInitialAmountPaid] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [sendEmailImmediately, setSendEmailImmediately] = useState<boolean>(true);

  // Fetch registered models & installers on mount
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        setLoadingInitial(true);
        const [modelsRes, installersRes] = await Promise.all([
          installerPaymentsService.listModels(true),
          installerPaymentsService.listInstallers(false),
        ]);
        if (isMounted) {
          setModels(Array.isArray(modelsRes) ? modelsRes : []);
          setInstallers(Array.isArray(installersRes) ? installersRes : []);
        }
      } catch (err: any) {
        if (isMounted) {
          setModels([]);
          setInstallers([]);
          setFeedback({
            type: 'error',
            message: `Failed to load models or installers: ${err?.message || err}`,
          });
        }
      } finally {
        if (isMounted) {
          setLoadingInitial(false);
        }
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle installer dropdown selection
  const handleInstallerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const instId = e.target.value;
    setSelectedInstallerId(instId);

    if (!instId) {
      setIsAutoPopulated(false);
      return;
    }

    const found = installers.find((i) => i.id === instId);
    if (found) {
      setInstallerName(found.name);
      setInstallerEmail(found.email);
      setInstallerPhone(found.phone || '');
      setIsAutoPopulated(true);
    }
  };

  // Handle site PIN input & automated NCR classification
  const handlePinChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, 6);
    setSitePin(cleaned);

    if (cleaned.length === 6) {
      const matched = isNcrPinCode(cleaned);
      if (matched) {
        setIsNcr(true);
        setTravelExpenses(0);
      } else {
        setIsNcr(false);
      }
    }
  };

  // Line item handlers
  const handleCubicleModelChange = (itemId: string, newModelId: string) => {
    const selected = models.find((m) => m.id === newModelId);
    const unitPrice = selected ? Number(selected.installationPrice) : 0;
    setCubicleItems((prev) =>
      prev.map((row) =>
        row.id === itemId ? { ...row, modelId: newModelId, unitPrice } : row
      )
    );
  };

  const handleCubicleQuantityChange = (itemId: string, qty: number) => {
    const validQty = Math.max(0, qty);
    setCubicleItems((prev) =>
      prev.map((row) => (row.id === itemId ? { ...row, quantity: validQty } : row))
    );
  };

  const addCubicleItem = () => {
    setCubicleItems((prev) => [
      ...prev,
      { id: `cubicle-${Date.now()}`, category: 'CUBICLE', modelId: '', quantity: 0, unitPrice: 0 },
    ]);
  };

  const removeCubicleItem = (itemId: string) => {
    setCubicleItems((prev) =>
      prev.length > 1
        ? prev.filter((row) => row.id !== itemId)
        : [{ id: `cubicle-${Date.now()}`, category: 'CUBICLE', modelId: '', quantity: 0, unitPrice: 0 }]
    );
  };

  const handleUmpModelChange = (itemId: string, newModelId: string) => {
    const selected = models.find((m) => m.id === newModelId);
    const unitPrice = selected ? Number(selected.installationPrice) : 0;
    setUmpItems((prev) =>
      prev.map((row) =>
        row.id === itemId ? { ...row, modelId: newModelId, unitPrice } : row
      )
    );
  };

  const handleUmpQuantityChange = (itemId: string, qty: number) => {
    const validQty = Math.max(0, qty);
    setUmpItems((prev) =>
      prev.map((row) => (row.id === itemId ? { ...row, quantity: validQty } : row))
    );
  };

  const addUmpItem = () => {
    setUmpItems((prev) => [
      ...prev,
      { id: `ump-${Date.now()}`, category: 'UMP', modelId: '', quantity: 0, unitPrice: 0 },
    ]);
  };

  const removeUmpItem = (itemId: string) => {
    setUmpItems((prev) =>
      prev.length > 1
        ? prev.filter((row) => row.id !== itemId)
        : [{ id: `ump-${Date.now()}`, category: 'UMP', modelId: '', quantity: 0, unitPrice: 0 }]
    );
  };

  const handleLockerModelChange = (itemId: string, newModelId: string) => {
    const selected = models.find((m) => m.id === newModelId);
    const unitPrice = selected ? Number(selected.installationPrice) : 0;
    setLockerItems((prev) =>
      prev.map((row) =>
        row.id === itemId ? { ...row, modelId: newModelId, unitPrice } : row
      )
    );
  };

  const handleLockerQuantityChange = (itemId: string, qty: number) => {
    const validQty = Math.max(0, qty);
    setLockerItems((prev) =>
      prev.map((row) => (row.id === itemId ? { ...row, quantity: validQty } : row))
    );
  };

  const addLockerItem = () => {
    setLockerItems((prev) => [
      ...prev,
      { id: `locker-${Date.now()}`, category: 'LOCKER', modelId: '', quantity: 0, unitPrice: 0 },
    ]);
  };

  const removeLockerItem = (itemId: string) => {
    setLockerItems((prev) =>
      prev.length > 1
        ? prev.filter((row) => row.id !== itemId)
        : [{ id: `locker-${Date.now()}`, category: 'LOCKER', modelId: '', quantity: 0, unitPrice: 0 }]
    );
  };

  // Category-specific model options from Master
  const cubicleModels = (Array.isArray(models) ? models : []).filter(
    (m) => (m.category || 'CUBICLE') === 'CUBICLE'
  );
  const umpModels = (Array.isArray(models) ? models : []).filter(
    (m) => m.category === 'UMP'
  );
  const lockerModels = (Array.isArray(models) ? models : []).filter(
    (m) => m.category === 'LOCKER'
  );

  // Auto-calculated scope totals
  const cubicleModelsSubtotal = cubicleItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity * row.unitPrice : 0),
    0
  );
  const totalCubicleQty = cubicleItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity : 0),
    0
  );

  const umpSubtotal = umpItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity * row.unitPrice : 0),
    0
  );
  const totalUmpQty = umpItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity : 0),
    0
  );

  const lockerSubtotal = lockerItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity * row.unitPrice : 0),
    0
  );
  const totalLockerQty = lockerItems.reduce(
    (acc, row) => acc + (row.modelId ? row.quantity : 0),
    0
  );

  const subtotal = cubicleModelsSubtotal + umpSubtotal + lockerSubtotal;
  const effectiveTravelExpenses = isNcr ? 0 : Number(travelExpenses || 0);
  const effectiveDeductionAmount = Math.max(0, Number(deductionAmount || 0));
  const effectiveAdvancePaid = hasAdvance ? Math.max(0, Number(advancePaid || 0)) : 0;

  // Gross total: Subtotal + Travel - Deductions
  const grossTotal = Math.max(0, subtotal + effectiveTravelExpenses - effectiveDeductionAmount);

  // Net payable after advance deduction
  const netPayableAfterAdvance = Math.max(0, grossTotal - effectiveAdvancePaid);

  // Final balance due after immediate completion payment
  const balanceDue = Math.max(0, netPayableAfterAdvance - Number(initialAmountPaid || 0));

  // Cleared if advance + completion payment covers the entire gross amount
  const willBeCleared = grossTotal > 0 && (effectiveAdvancePaid + initialAmountPaid) >= grossTotal;

  // Quick fill remaining balance
  const handlePayRemainingBalance = () => {
    setInitialAmountPaid(netPayableAfterAdvance);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!installerName.trim()) {
      setFeedback({ type: 'error', message: 'Installer Name is required.' });
      return;
    }
    if (!installerEmail.trim() || !installerEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'A valid Installer Email address is required.' });
      return;
    }
    if (!siteAddress.trim()) {
      setFeedback({ type: 'error', message: 'Installation Site Address is required.' });
      return;
    }
    if (!sitePin.trim() || !/^\d{6}$/.test(sitePin.trim())) {
      setFeedback({ type: 'error', message: 'Site Postal PIN must be a valid 6-digit code.' });
      return;
    }

    if (effectiveDeductionAmount > 0 && !deductionReason.trim()) {
      setFeedback({
        type: 'error',
        message: 'A deduction reason is required when specifying a deduction amount.',
      });
      return;
    }

    if (hasAdvance && effectiveAdvancePaid > grossTotal) {
      setFeedback({
        type: 'error',
        message: `Advance amount (₹${effectiveAdvancePaid}) cannot exceed the gross bill total (₹${grossTotal}).`,
      });
      return;
    }

    const validCubicles = cubicleItems.filter((i) => i.modelId && i.quantity > 0);
    const validUmps = umpItems.filter((i) => i.modelId && i.quantity > 0);
    const validLockers = lockerItems.filter((i) => i.modelId && i.quantity > 0);
    const allValidItems = [...validCubicles, ...validUmps, ...validLockers];

    if (allValidItems.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Please select at least one Cubicle, UMP, or Locker model with a quantity greater than 0.',
      });
      return;
    }

    if (!internalNotes.trim()) {
      setFeedback({
        type: 'error',
        message: 'Internal Notes are mandatory for tracking and audit logs.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateInstallerBillPayload = {
        installerId: selectedInstallerId || undefined,
        installerName: installerName.trim(),
        installerEmail: installerEmail.trim().toLowerCase(),
        installDate,
        isNcr,
        travelExpenses: effectiveTravelExpenses,
        deductionAmount: effectiveDeductionAmount,
        deductionReason: effectiveDeductionAmount > 0 ? deductionReason.trim() : undefined,
        siteAddress: siteAddress.trim(),
        sitePin: sitePin.trim(),
        items: allValidItems.map((item) => ({
          modelId: item.modelId,
          category: item.category,
          quantity: item.quantity,
        })),
        umpQuantity: totalUmpQty,
        umpRate: totalUmpQty > 0 ? umpSubtotal / totalUmpQty : 0,
        advancePaid: hasAdvance ? effectiveAdvancePaid : 0,
        advanceDate: hasAdvance && effectiveAdvancePaid > 0 ? advanceDate : undefined,
        advanceNote: hasAdvance && effectiveAdvancePaid > 0 ? advanceNote.trim() : undefined,
        initialAmountPaid: Number(initialAmountPaid || 0),
        paymentDate: initialAmountPaid > 0 ? paymentDate : undefined,
        paymentMode: initialAmountPaid > 0 ? paymentMode : undefined,
        notes: internalNotes.trim(),
        sendEmailToInstaller: sendEmailImmediately,
      };

      const createdBill = await installerPaymentsService.createBill(payload);
      setFeedback({
        type: 'success',
        message: `Installer Bill ${createdBill.billNo} generated successfully! ${
          sendEmailImmediately
            ? `Official PDF payment voucher dispatched to ${installerEmail.trim()}.`
            : willBeCleared
            ? 'Status is CLEARED.'
            : ''
        }`,
      });

      setTimeout(() => {
        handleBack();
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to create installer bill. Please check inputs.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <span>Finance & Operations</span>
            <span>/</span>
            <button
              onClick={handleBack}
              className="hover:text-[#7FB706] transition-colors cursor-pointer"
            >
              Installer Payments
            </button>
            <span>/</span>
            <span className="text-white font-medium">New Bill</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2.5 bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#B5F823] rounded-xl">
              <Wrench size={22} />
            </div>
            Generate Installer Payment Bill
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Create an itemized installation voucher with advance payment tracking, NCR travel automation, and multi-mode settlement.
          </p>
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Bills Hub
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          )}
          <div className="text-sm font-medium">{feedback.message}</div>
        </div>
      )}

      {loadingInitial ? (
        <div className="p-12 text-center text-gray-400 bg-[#0a091e] rounded-2xl border border-white/10">
          <div className="animate-spin w-8 h-8 border-3 border-[#7FB706] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">Loading cubicle models and registered installers...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Sections (2 Columns wide) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Installer Identification & Auto-Fetch */}
            <div className="bg-[#0a091e] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <User className="text-[#7FB706]" size={18} />
                  <h2 className="text-sm sm:text-base font-semibold text-white">
                    1. Installer Details & Auto-Fetch
                  </h2>
                </div>
                {isAutoPopulated && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#B5F823] bg-[#7FB706]/15 border border-[#7FB706]/30 rounded-full">
                    <Sparkles size={12} />
                    Auto-Populated
                  </span>
                )}
              </div>

              {/* Registered Installer Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Select Registered Installer (Auto-fill)
                </label>
                <select
                  value={selectedInstallerId}
                  onChange={handleInstallerSelect}
                  className="w-full px-3.5 py-2.5 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706] transition-colors"
                >
                  <option value="">-- Choose from Registered Installers or type custom below --</option>
                  {(Array.isArray(installers) ? installers : []).map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.email}) {inst.phone ? `• ${inst.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Installer Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input
                      type="text"
                      required
                      value={installerName}
                      onChange={(e) => {
                        setInstallerName(e.target.value);
                        if (isAutoPopulated) setIsAutoPopulated(false);
                      }}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full pl-9 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Installer Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input
                      type="email"
                      required
                      value={installerEmail}
                      onChange={(e) => {
                        setInstallerEmail(e.target.value);
                        if (isAutoPopulated) setIsAutoPopulated(false);
                      }}
                      placeholder="e.g. rajesh.sharma@example.com"
                      className="w-full pl-9 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706]"
                    />
                  </div>
                </div>
              </div>

              {installerPhone && (
                <div className="text-xs text-gray-400 flex items-center gap-1.5 pt-0.5">
                  <Phone size={13} className="text-gray-500" />
                  <span>Contact Phone: <strong className="text-gray-200">{installerPhone}</strong></span>
                </div>
              )}
            </div>

            {/* 2. Installation Site & Date */}
            <div className="bg-[#0a091e] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <MapPin className="text-[#7FB706]" size={18} />
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  2. Installation Site & Location
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Date of Installation <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input
                      type="date"
                      required
                      value={installDate}
                      onChange={(e) => setInstallDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-300">
                      Site Postal PIN Code <span className="text-rose-400">*</span>
                    </label>
                    {sitePin.length === 6 && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isNcrPinCode(sitePin)
                            ? 'bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30'
                            : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {isNcrPinCode(sitePin) ? (
                          <>
                            <CheckCircle2 size={12} /> NCR Territory
                          </>
                        ) : (
                          <>
                            <MapPin size={12} /> Outstation Territory
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={sitePin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="e.g. 110001"
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-mono text-white placeholder-gray-500 focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706]"
                  />
                  {sitePin.length === 6 && (
                    <p className="text-[11px] mt-1">
                      {isNcrPinCode(sitePin) ? (
                        <span className="text-[#B5F823] font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          PIN <strong>{sitePin}</strong> recognized in NCR master list. Inside NCR auto-selected (Travel ₹0.00).
                        </span>
                      ) : (
                        <span className="text-blue-300 font-medium flex items-center gap-1">
                          <MapPin size={12} />
                          PIN <strong>{sitePin}</strong> is outside NCR. Outstation auto-selected (Travel reimbursement enabled).
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Installation Site Full Address <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="e.g. DLF Cyber City, Tower B, 5th Floor, Sector 24, Gurugram, Haryana"
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706]"
                />
              </div>

              {/* NCR Toggle & Travel Expenses Logic */}
              <div className="p-4 bg-[#121226] rounded-xl border border-white/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                      <Building2 size={16} className="text-[#7FB706]" />
                      NCR Location Job (National Capital Region)?
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Auto-detected from Postal PIN. Delhi-NCR sites waive travel expenses to ₹0.00. Non-NCR requires travel reimbursement.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNcr(true);
                        setTravelExpenses(0);
                      }}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        isNcr
                          ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
                          : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      Yes (NCR)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNcr(false)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        !isNcr
                          ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
                          : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      No (Outstation)
                    </button>
                  </div>
                </div>

                {isNcr ? (
                  <div className="flex items-center gap-2 p-2.5 bg-[#7FB706]/10 border border-[#7FB706]/25 rounded-lg text-xs text-[#B5F823]">
                    <ShieldCheck size={14} className="text-[#7FB706] flex-shrink-0" />
                    <span>
                      <strong>NCR Job:</strong> Travel Expenses locked to <strong>₹0.00</strong> (Inside NCR radius).
                    </span>
                  </div>
                ) : (
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Travel & Boarding Expenses (₹) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-semibold text-gray-500">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        required={!isNcr}
                        value={travelExpenses || ''}
                        onChange={(e) => setTravelExpenses(Number(e.target.value))}
                        placeholder="e.g. 1500"
                        className="w-full pl-8 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-mono text-white placeholder-gray-500 focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Cubicle Models Installed */}
            <div className="bg-[#0a091e] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="text-[#7FB706]" size={18} />
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-white">
                      3. Restroom Cubicle Models Installed
                    </h2>
                    <p className="text-xs text-gray-400">
                      Standard cubicles installed on site. Rates loaded from Cubicle Models Master.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addCubicleItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#B5F823] bg-[#7FB706]/15 hover:bg-[#7FB706]/25 border border-[#7FB706]/30 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  Add Cubicle Row
                </button>
              </div>

              <div className="space-y-3">
                {cubicleItems.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-[#121226] rounded-xl border border-white/5 grid grid-cols-12 gap-3 items-center"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Cubicle Model
                        </label>
                        <select
                          value={item.modelId}
                          onChange={(e) => handleCubicleModelChange(item.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#030213] border border-white/10 rounded-lg text-sm text-white focus:border-[#7FB706] font-medium"
                        >
                          <option value="">-- Select Model (Starts at 0) --</option>
                          {cubicleModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.modelName} (Rate: ₹{Number(m.installationPrice).toLocaleString('en-IN')})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={item.quantity === 0 ? '' : item.quantity}
                          placeholder="0"
                          onChange={(e) => handleCubicleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-[#030213] border border-white/10 rounded-lg text-sm text-white focus:border-[#7FB706] text-center font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Rate / Unit
                        </label>
                        <div className="text-sm font-semibold text-gray-300 font-mono py-1.5">
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-10 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Line Total
                        </label>
                        <div className="text-sm font-bold text-[#B5F823] font-mono py-1.5">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                        {cubicleItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCubicleItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove Model"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. UMP Models Installed */}
            <div className="bg-[#0a091e] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="text-[#7FB706]" size={18} />
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-white">
                      4. Urinal Modesty Panels (UMP) Installed
                    </h2>
                    <p className="text-xs text-gray-400">
                      Urinal modesty partitions installed on site.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addUmpItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#B5F823] bg-[#7FB706]/15 hover:bg-[#7FB706]/25 border border-[#7FB706]/30 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  Add UMP Row
                </button>
              </div>

              <div className="space-y-3">
                {umpItems.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-[#121226] rounded-xl border border-white/5 grid grid-cols-12 gap-3 items-center"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          UMP Model
                        </label>
                        <select
                          value={item.modelId}
                          onChange={(e) => handleUmpModelChange(item.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#030213] border border-white/10 rounded-lg text-sm text-white focus:border-[#7FB706] font-medium"
                        >
                          <option value="">-- Select UMP Model (Starts at 0) --</option>
                          {umpModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.modelName} (Rate: ₹{Number(m.installationPrice).toLocaleString('en-IN')})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Qty (Panels)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={item.quantity === 0 ? '' : item.quantity}
                          placeholder="0"
                          onChange={(e) => handleUmpQuantityChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-[#030213] border border-white/10 rounded-lg text-sm text-white focus:border-[#7FB706] text-center font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Rate / Unit
                        </label>
                        <div className="text-sm font-semibold text-gray-300 font-mono py-1.5">
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-10 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Line Total
                        </label>
                        <div className="text-sm font-bold text-[#B5F823] font-mono py-1.5">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                        {umpItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUmpItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove UMP"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Locker Models Installed */}
            <div className="bg-[#0a091e] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="text-[#7FB706]" size={18} />
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-white">
                      5. Locker Models Installed
                    </h2>
                    <p className="text-xs text-gray-400">
                      Locker storage installations on site.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addLockerItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#B5F823] bg-[#7FB706]/15 hover:bg-[#7FB706]/25 border border-[#7FB706]/30 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  Add Locker Row
                </button>
              </div>

              <div className="space-y-3">
                {lockerItems.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-[#121226] rounded-xl border border-white/5 grid grid-cols-12 gap-3 items-center"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Locker Model
                        </label>
                        <select
                          value={item.modelId}
                          onChange={(e) => handleLockerModelChange(item.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#030213] border border-white/10 rounded-lg text-sm text-white focus:border-[#7FB706] font-medium"
                        >
                          <option value="">-- Select Locker Model (Starts at 0) --</option>
                          {lockerModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.modelName} (Rate: ₹{Number(m.installationPrice).toLocaleString('en-IN')})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Qty (Lockers)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={item.quantity === 0 ? '' : item.quantity}
                          placeholder="0"
                          onChange={(e) => handleLockerQuantityChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-[#030213] border border-white/10 rounded-lg text-sm text-white focus:border-[#7FB706] text-center font-mono font-bold"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Rate / Unit
                        </label>
                        <div className="text-sm font-semibold text-gray-300 font-mono py-1.5">
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-10 sm:col-span-2">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">
                          Line Total
                        </label>
                        <div className="text-sm font-bold text-[#B5F823] font-mono py-1.5">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                        {lockerItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLockerItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove Locker Model"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6. PAYMENT ADVANCE MANAGEMENT SYSTEM (USER REQUESTED) */}
            <div className="bg-[#0a091e] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="text-[#7FB706]" size={18} />
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                      6. Payment Advance Management System
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/15 text-[#B5F823] border border-[#7FB706]/30">
                        Advance Engine
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400">
                      Disburse or track upfront site advances given to installer prior to final job completion.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasAdvance(false)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      !hasAdvance
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    No Advance
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasAdvance(true);
                      if (advancePaid === 0) setAdvancePaid(1000);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      hasAdvance
                        ? 'bg-[#7FB706] text-white shadow-lg shadow-[#7FB706]/20'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    Advance Disbursed
                  </button>
                </div>
              </div>

              {hasAdvance ? (
                <div className="p-4 bg-[#121226] rounded-xl border border-white/5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Advance Disbursed Amount (₹) <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm font-semibold text-[#7FB706]">₹</span>
                        <input
                          type="number"
                          min={1}
                          required={hasAdvance}
                          value={advancePaid || ''}
                          onChange={(e) => setAdvancePaid(Math.max(0, Number(e.target.value)))}
                          placeholder="e.g. 2000"
                          className="w-full pl-8 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-mono font-bold text-white placeholder-gray-500 focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Advance Disbursement Date <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input
                          type="date"
                          required={hasAdvance}
                          value={advanceDate}
                          onChange={(e) => setAdvanceDate(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Advance Disbursement Note / Mode
                    </label>
                    <input
                      type="text"
                      value={advanceNote}
                      onChange={(e) => setAdvanceNote(e.target.value)}
                      placeholder="e.g. UPI transfer on site arrival for lodging, fuel allowance, or fooding"
                      className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706]"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-[#7FB706]/10 border border-[#7FB706]/25 rounded-xl text-xs text-[#B5F823]">
                    <Coins size={16} className="text-[#7FB706] shrink-0" />
                    <span>
                      Advance of <strong>₹{effectiveAdvancePaid.toLocaleString('en-IN')}</strong> will automatically be credited against this bill and deducted from the gross amount, leaving <strong>₹{netPayableAfterAdvance.toLocaleString('en-IN')}</strong> due upon job sign-off.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white/5 rounded-xl text-xs text-gray-400 flex items-center gap-2">
                  <HelpCircle size={15} className="text-gray-500" />
                  <span>No advance payment recorded for this installation job. Full gross bill amount will be payable at completion.</span>
                </div>
              )}
            </div>

            {/* 7. Deductions & Penalties */}
            <div className="bg-[#0a091e] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <AlertCircle className="text-rose-400" size={18} />
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-white">
                    7. Deductions & Site Penalties (Optional)
                  </h2>
                  <p className="text-xs text-gray-400">
                    Record hardware damage, missing items, unfinished scope penalty, or site delay deductions.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Deduction Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm font-bold text-rose-400">-₹</span>
                    <input
                      type="number"
                      min={0}
                      value={deductionAmount || ''}
                      onChange={(e) => setDeductionAmount(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-mono font-bold text-rose-400 placeholder-gray-500 focus:outline-hidden focus:border-rose-400"
                    />
                  </div>
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Deduction Reason {deductionAmount > 0 && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type="text"
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                    placeholder="e.g. Broken hardware hinge replacement, unfinished silicon joints, late site reporting"
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-hidden focus:border-rose-400"
                  />
                </div>
              </div>
            </div>

            {/* 8. Settlement on Completion & Mandatory Internal Notes */}
            <div className="bg-[#0a091e] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <CreditCard className="text-[#7FB706]" size={18} />
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-white">
                    8. Settlement on Completion & Mandatory Notes
                  </h2>
                  <p className="text-xs text-gray-400">
                    Settle any remaining balance now or defer payment to the installer ledger.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#7FB706]" />
                    Payment Date <span className="text-gray-500 font-normal">(if paying now)</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-300">
                      Amount Paid Now (₹)
                    </label>
                    <button
                      type="button"
                      onClick={handlePayRemainingBalance}
                      className="text-[11px] font-semibold text-[#B5F823] hover:underline cursor-pointer"
                    >
                      Settle Balance (100%)
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm font-semibold text-gray-500">₹</span>
                    <input
                      type="number"
                      min={0}
                      max={netPayableAfterAdvance}
                      value={initialAmountPaid || ''}
                      onChange={(e) =>
                        setInitialAmountPaid(Math.min(netPayableAfterAdvance, Number(e.target.value)))
                      }
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm font-mono font-semibold text-white placeholder-gray-500 focus:outline-hidden focus:border-[#7FB706]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    disabled={initialAmountPaid <= 0}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/10 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#7FB706] disabled:opacity-40"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Mandatory Internal Notes */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    Internal Notes <span className="text-rose-400 text-sm">*</span>
                    <span className="text-[11px] font-normal text-rose-400 lowercase">(mandatory audit log)</span>
                  </span>
                  <span className="text-[11px] font-normal text-gray-400">
                    Logged to ledger
                  </span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Enter mandatory internal audit notes, site verification notes, job instructions, or sign-off remarks..."
                  className="w-full px-3.5 py-2.5 bg-[#030213] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-hidden focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706]"
                />
              </div>

              {/* Dispatch Voucher Option */}
              <div className="pt-2 border-t border-white/5">
                <label className="flex items-start gap-3 p-3.5 bg-white/5 border border-white/10 rounded-xl cursor-pointer select-none hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={sendEmailImmediately}
                    onChange={(e) => setSendEmailImmediately(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 text-[#7FB706] focus:ring-[#7FB706] cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Send size={13} className="text-[#7FB706]" />
                      Auto-Dispatch Official PDF Payment Voucher to Installer
                    </span>
                    <span className="text-gray-400 block mt-0.5">
                      Automatically emails the PDF payment advice directly to{' '}
                      <strong className="text-gray-200">
                        {installerEmail.trim() || "the installer's registered email"}
                      </strong>{' '}
                      upon bill generation.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Calculation Summary & Submit Dock */}
          <div className="space-y-6">
            <div className="bg-[#0a091e] p-6 rounded-2xl border border-white/10 shadow-2xl sticky top-6 space-y-5">
              <h3 className="text-base font-bold text-white border-b border-white/5 pb-3 flex items-center gap-2">
                <DollarSign className="text-[#7FB706]" size={18} />
                Financial Calculation Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span className="flex items-center gap-1">
                    Cubicles:
                    {totalCubicleQty > 0 && (
                      <span className="text-[10px] text-[#B5F823] font-bold bg-[#7FB706]/15 px-1.5 py-0.5 rounded-sm">
                        {totalCubicleQty} unit(s)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold font-mono text-white">
                    ₹{cubicleModelsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-400">
                  <span className="flex items-center gap-1">
                    UMP Partitions:
                    {totalUmpQty > 0 && (
                      <span className="text-[10px] text-[#B5F823] font-bold bg-[#7FB706]/15 px-1.5 py-0.5 rounded-sm">
                        {totalUmpQty} panel(s)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold font-mono text-white">
                    ₹{umpSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-400">
                  <span className="flex items-center gap-1">
                    Lockers:
                    {totalLockerQty > 0 && (
                      <span className="text-[10px] text-[#B5F823] font-bold bg-[#7FB706]/15 px-1.5 py-0.5 rounded-sm">
                        {totalLockerQty} unit(s)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold font-mono text-white">
                    ₹{lockerSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-300 font-medium pt-1 border-t border-dashed border-white/10">
                  <span>Installation Subtotal:</span>
                  <span className="font-bold font-mono text-white">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-400">
                  <span className="flex items-center gap-1">
                    Travel Expenses:
                    {isNcr && (
                      <span className="text-[10px] text-[#B5F823] font-bold bg-[#7FB706]/15 px-1.5 py-0.5 rounded-sm">
                        NCR ₹0
                      </span>
                    )}
                  </span>
                  <span className="font-semibold font-mono text-white">
                    ₹{effectiveTravelExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {effectiveDeductionAmount > 0 && (
                  <div className="flex justify-between text-rose-400 font-medium">
                    <span className="flex items-center gap-1">
                      Deductions / Penalty:
                      {deductionReason && (
                        <span className="text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded-sm truncate max-w-[120px]" title={deductionReason}>
                          {deductionReason}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold font-mono">
                      -₹{effectiveDeductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-200">Gross Billed Total:</span>
                  <span className="text-base font-bold font-mono text-white">
                    ₹{grossTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {hasAdvance && effectiveAdvancePaid > 0 && (
                  <div className="flex justify-between text-[#B5F823] font-medium bg-[#7FB706]/10 px-2.5 py-1.5 rounded-xl border border-[#7FB706]/20">
                    <span className="flex items-center gap-1 text-xs">
                      <Coins size={13} />
                      Advance Disbursed:
                    </span>
                    <span className="font-bold font-mono text-xs">
                      -₹{effectiveAdvancePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-bold text-gray-300">Net Due on Completion:</span>
                  <span className="text-lg font-extrabold font-mono text-[#B5F823]">
                    ₹{netPayableAfterAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-400 pt-1">
                  <span>Settlement Paid Now:</span>
                  <span className="font-semibold font-mono text-emerald-400">
                    ₹{Number(initialAmountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-gray-400">
                  <span>Remaining Balance:</span>
                  <span className={`font-bold font-mono ${balanceDue > 0 ? 'text-amber-400' : 'text-[#B5F823]'}`}>
                    ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Status Indicator Preview */}
              <div className="pt-3 border-t border-white/10">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Projected Payment Status
                </div>
                {willBeCleared ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-sm">
                      <CheckCircle2 size={16} />
                      CLEARED (Full Settlement)
                    </div>
                    <p className="text-xs text-emerald-400">
                      ⚡ <strong>Auto-Dispatch:</strong> Upon creation, official PDF bill will be immediately generated and auto-emailed to <strong>{installerEmail || 'installer'}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-sm">
                      <AlertCircle size={16} />
                      PARTIAL (Balance Pending: ₹{balanceDue.toLocaleString('en-IN')})
                    </div>
                    <p className="text-xs text-amber-400">
                      Bill will be generated with status PARTIAL. Remaining dues can be settled anytime from the Payments Ledger.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit & Discard */}
              <div className="pt-3 space-y-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl shadow-lg shadow-[#7FB706]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Bill...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Issue & Create Installer Bill</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel & Discard
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default CreateInstallerBillPage;
