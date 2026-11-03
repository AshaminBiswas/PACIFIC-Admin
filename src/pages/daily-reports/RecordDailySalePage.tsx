import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Receipt,
  DollarSign,
  Calendar,
  Building2,
  Users,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase,
  HelpCircle,
  Percent,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  Clock,
} from 'lucide-react';
import { crmApi, vendorsApi } from '../../api';
import { dailySalesPurchasesApi } from '../../api/dailySalesPurchasesApi';
import { CreateDailySalesPurchasePayload } from '../../types/admin';
import { formatCurrency } from '../../utils/formatters';

interface RecordDailySalePageProps {
  initialType?: 'SALES' | 'PURCHASE';
}

const CATEGORIES = [
  'Restroom Cubicles',
  'Urinal Modesty Partitions',
  'Modular Lockers',
  'Hardware & Fittings',
  'Raw Materials / Boards',
  'General Store / Consumables',
  'Other Services',
];

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash Payment' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT / RTGS / IMPS)' },
  { value: 'UPI', label: 'UPI / QR Code Transfer' },
  { value: 'CHEQUE', label: 'Cheque Payment' },
  { value: 'CREDIT', label: 'Credit (Pay Later / Accounts Receivable)' },
];

const PAYMENT_STATUSES = [
  { value: 'PAID', label: 'Paid / Full Settlement' },
  { value: 'PARTIAL', label: 'Partially Paid' },
  { value: 'UNPAID', label: 'Unpaid / Outstanding' },
];

export const RecordDailySalePage: React.FC<RecordDailySalePageProps> = ({ initialType = 'SALES' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine type from query param or prop
  const searchParams = new URLSearchParams(location.search);
  const typeParam = searchParams.get('type')?.toUpperCase();
  const [entryType, setEntryType] = useState<'SALES' | 'PURCHASE'>(
    typeParam === 'PURCHASE' || initialType === 'PURCHASE' ? 'PURCHASE' : 'SALES'
  );

  // Form Fields
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>('Restroom Cubicles');
  const [description, setDescription] = useState<string>('');

  // Customer / Vendor Selection
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [customPartyName, setCustomPartyName] = useState<string>('');
  const [useCustomParty, setUseCustomParty] = useState<boolean>(false);
  const [partySearchTerm, setPartySearchTerm] = useState<string>('');
  const [isLoadingParties, setIsLoadingParties] = useState<boolean>(true);

  // Financials & Core Math
  const [totalBasicAmount, setTotalBasicAmount] = useState<string>('');
  const [hasCashReceived, setHasCashReceived] = useState<boolean>(false);
  const [cashReceivedAmount, setCashReceivedAmount] = useState<string>('');
  const [isDelhiGst, setIsDelhiGst] = useState<boolean>(true); // Delhi intra-state default (07)
  const [gstRate, setGstRate] = useState<number>(18); // Default standard 18%

  // Payment Tracking
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [paymentStatus, setPaymentStatus] = useState<string>('PAID');

  // Advance Payment State
  const [hasAdvanceReceived, setHasAdvanceReceived] = useState<boolean>(false);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advancePaymentMode, setAdvancePaymentMode] = useState<string>('BANK_TRANSFER');
  const [advancePaymentDate, setAdvancePaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [advanceReferenceNo, setAdvanceReferenceNo] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Load CRM Customers & Vendors
  useEffect(() => {
    let isMounted = true;
    setIsLoadingParties(true);

    Promise.all([
      crmApi.listCustomers({ limit: 200 }).catch(() => ({ data: { data: { items: [] } } })),
      vendorsApi.listVendors({ limit: 200 }).catch(() => ({ data: { data: { items: [] } } })),
    ])
      .then(([custRes, vendRes]: any) => {
        if (!isMounted) return;
        const cItems = custRes?.data?.data?.items || custRes?.data?.items || [];
        const vItems = vendRes?.data?.data?.items || vendRes?.data?.items || [];
        setCustomers(cItems);
        setVendors(vItems);
      })
      .finally(() => {
        if (isMounted) setIsLoadingParties(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-detect Delhi vs Interstate when customer changes
  useEffect(() => {
    if (entryType === 'SALES' && selectedCustomerId) {
      const selected = customers.find((c) => c.id === selectedCustomerId || c.partyId === selectedCustomerId);
      if (selected) {
        const gstin = selected.gstin || selected.party?.gstin || '';
        const stateCode = selected.party?.stateCode || selected.stateCode || '';
        const state = (selected.party?.state || selected.state || '').toLowerCase();

        if (gstin && gstin.length >= 2) {
          setIsDelhiGst(gstin.startsWith('07'));
        } else if (stateCode === '07' || state.includes('delhi')) {
          setIsDelhiGst(true);
        } else if (stateCode && stateCode !== '07') {
          setIsDelhiGst(false);
        }
      }
    }
  }, [selectedCustomerId, customers, entryType]);

  // Numeric Calculations
  const numTotalBasic = Math.max(0, parseFloat(totalBasicAmount) || 0);
  const numCashReceived = hasCashReceived ? Math.max(0, parseFloat(cashReceivedAmount) || 0) : 0;

  // Formula: Remaining Basic Amount = Total Basic Amount - Cash Received
  const remainingBasicAmount = Math.max(0, numTotalBasic - numCashReceived);

  // 18% GST calculation on Remaining Basic Amount
  const effectiveGstRate = gstRate || 18;
  const halfRate = effectiveGstRate / 2; // 9% for Delhi CGST & SGST

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalGstAmount = 0;

  if (remainingBasicAmount > 0) {
    if (isDelhiGst) {
      cgstAmount = Math.round(remainingBasicAmount * (halfRate / 100) * 100) / 100;
      sgstAmount = Math.round(remainingBasicAmount * (halfRate / 100) * 100) / 100;
      totalGstAmount = Math.round((cgstAmount + sgstAmount) * 100) / 100;
    } else {
      igstAmount = Math.round(remainingBasicAmount * (effectiveGstRate / 100) * 100) / 100;
      totalGstAmount = igstAmount;
    }
  }

  // Total Bill Amount including GST
  const totalBillAmount = Math.round((remainingBasicAmount + totalGstAmount) * 100) / 100;

  // Advance Payment Calculations
  const numAdvance = hasAdvanceReceived ? Math.max(0, parseFloat(advanceAmount) || 0) : 0;
  const balanceDue = Math.max(0, Math.round((totalBillAmount - numAdvance) * 100) / 100);

  const handleApplyAdvancePercentage = (percentage: number) => {
    if (totalBillAmount <= 0) return;
    const calculated = Math.round(totalBillAmount * (percentage / 100) * 100) / 100;
    setAdvanceAmount(calculated.toString());
    if (validationErrors.advanceAmount) {
      setValidationErrors((prev) => ({ ...prev, advanceAmount: '' }));
    }
  };

  // Filtered party list for search
  const filteredCustomers = useMemo(() => {
    if (!partySearchTerm.trim()) return customers;
    const term = partySearchTerm.toLowerCase();
    return customers.filter((c) => {
      const name = (c.tradeName || c.legalName || c.party?.tradeName || c.party?.legalName || '').toLowerCase();
      const gstin = (c.gstin || c.party?.gstin || '').toLowerCase();
      const phone = (c.phone || c.party?.phone || '').toLowerCase();
      return name.includes(term) || gstin.includes(term) || phone.includes(term);
    });
  }, [customers, partySearchTerm]);

  const filteredVendors = useMemo(() => {
    if (!partySearchTerm.trim()) return vendors;
    const term = partySearchTerm.toLowerCase();
    return vendors.filter((v) => {
      const name = (v.tradeName || v.legalName || v.party?.tradeName || v.party?.legalName || '').toLowerCase();
      const gstin = (v.gstin || v.party?.gstin || '').toLowerCase();
      return name.includes(term) || gstin.includes(term);
    });
  }, [vendors, partySearchTerm]);

  // Form Validation
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // 1. Invoice No is MANDATORY
    if (!invoiceNo.trim()) {
      errors.invoiceNo = 'Invoice No is mandatory. Please enter a valid invoice reference.';
    }

    // 2. Total Basic Amount is MANDATORY & must be > 0
    if (numTotalBasic <= 0) {
      errors.totalBasicAmount = 'Total Basic Amount is mandatory and must be greater than ₹0.00.';
    }

    // Cash received check
    if (hasCashReceived && numCashReceived > numTotalBasic) {
      errors.cashReceivedAmount = 'Cash received cannot exceed the Total Basic Amount.';
    }

    // Advance received check
    if (hasAdvanceReceived) {
      if (numAdvance <= 0) {
        errors.advanceAmount = 'Please enter a valid advance amount greater than ₹0.00.';
      } else if (numAdvance > totalBillAmount && totalBillAmount > 0) {
        errors.advanceAmount = `Advance amount (₹${numAdvance.toLocaleString('en-IN')}) cannot exceed the Total Bill Amount (₹${totalBillAmount.toLocaleString('en-IN')}).`;
      }
    }

    // 3. Customer / Party is MANDATORY
    if (entryType === 'SALES') {
      if (!useCustomParty && !selectedCustomerId) {
        errors.party = 'Please select a customer or switch to enter a custom client name.';
      } else if (useCustomParty && !customPartyName.trim()) {
        errors.party = 'Please enter the customer / client name.';
      }
    } else {
      if (!useCustomParty && !selectedVendorId) {
        errors.party = 'Please select a vendor / supplier or enter a custom name.';
      } else if (useCustomParty && !customPartyName.trim()) {
        errors.party = 'Please enter the supplier / vendor name.';
      }
    }

    // 4. Date check
    if (!entryDate) {
      errors.entryDate = 'Transaction date is mandatory.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      // Scroll to first error
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Resolve party display name
      let resolvedPartyName = customPartyName.trim();
      if (!resolvedPartyName) {
        if (entryType === 'SALES' && selectedCustomerId) {
          const c = customers.find((cust) => cust.id === selectedCustomerId || cust.partyId === selectedCustomerId);
          resolvedPartyName = c?.legalName || c?.tradeName || c?.party?.tradeName || c?.party?.legalName || 'Customer';
        } else if (entryType === 'PURCHASE' && selectedVendorId) {
          const v = vendors.find((vend) => vend.id === selectedVendorId || vend.partyId === selectedVendorId);
          resolvedPartyName = v?.legalName || v?.tradeName || v?.party?.tradeName || v?.party?.legalName || 'Supplier';
        }
      }

      // Format clean audit note with settlement formula and advance details
      const notes: string[] = [];
      if (description.trim()) {
        notes.push(description.trim());
      }

      if (numCashReceived > 0) {
        notes.push(
          `[Pre-GST Cash Deduction: Total Basic ₹${numTotalBasic.toLocaleString('en-IN')} - Cash Received ₹${numCashReceived.toLocaleString('en-IN')} = Remaining Basic ₹${remainingBasicAmount.toLocaleString('en-IN')} + ${isDelhiGst ? 'Delhi GST (CGST 9% + SGST 9%)' : 'Interstate IGST (18%)'} ₹${totalGstAmount.toLocaleString('en-IN')} = Bill Amount ₹${totalBillAmount.toLocaleString('en-IN')}]`
        );
      } else {
        notes.push(
          `[Standard Bill: Basic ₹${numTotalBasic.toLocaleString('en-IN')} + 18% GST ₹${totalGstAmount.toLocaleString('en-IN')} = Bill Amount ₹${totalBillAmount.toLocaleString('en-IN')}]`
        );
      }

      if (hasAdvanceReceived && numAdvance > 0) {
        const refStr = advanceReferenceNo.trim() ? ` (Ref / UTR: ${advanceReferenceNo.trim()})` : '';
        const dateStr = advancePaymentDate ? ` on ${advancePaymentDate}` : '';
        const statusStr = balanceDue <= 0 ? 'Full Advance Settlement (Balance: ₹0.00)' : `Balance Due: ₹${balanceDue.toLocaleString('en-IN')}`;
        notes.push(
          `[Advance Payment: ₹${numAdvance.toLocaleString('en-IN')} received via ${advancePaymentMode}${refStr}${dateStr} | ${statusStr}]`
        );
      }

      const fullDescription = notes.join('\n');

      // Compute final payment status & mode
      let resolvedPaymentStatus = paymentStatus;
      if (hasAdvanceReceived && numAdvance > 0) {
        resolvedPaymentStatus = balanceDue <= 0 ? 'PAID' : 'PARTIAL';
      }

      let resolvedPaymentMode = paymentMode;
      if (hasAdvanceReceived && numAdvance > 0) {
        resolvedPaymentMode = advancePaymentMode;
      } else if (hasCashReceived && numCashReceived > 0) {
        resolvedPaymentMode = 'CASH';
      }

      const payload: CreateDailySalesPurchasePayload = {
        entryDate,
        type: entryType,
        // When cash is deducted, the taxable amount is the remaining basic amount
        amount: remainingBasicAmount,
        taxAmount: totalGstAmount,
        totalAmount: totalBillAmount,
        referenceNo: invoiceNo.trim(),
        partyName: resolvedPartyName,
        customerId: entryType === 'SALES' && !useCustomParty ? selectedCustomerId || undefined : undefined,
        vendorId: entryType === 'PURCHASE' && !useCustomParty ? selectedVendorId || undefined : undefined,
        category,
        description: fullDescription,
        paymentMode: resolvedPaymentMode,
        paymentStatus: resolvedPaymentStatus,
      };

      await dailySalesPurchasesApi.create(payload);

      // Navigate back to daily reports list on success
      navigate('/admin/dashboard/daily-reports', {
        state: { message: `Successfully recorded ${entryType === 'SALES' ? 'sale' : 'purchase'} invoice ${invoiceNo.trim()}!` }
      });
    } catch (err: any) {
      console.error('Failed to create daily entry:', err);
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to save daily entry. Please verify fields and try again.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 animate-fade-in text-slate-100">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard/daily-reports')}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-lime-500/40 text-slate-300 hover:text-white transition cursor-pointer shadow-md group"
            title="Back to Daily Reports"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <span
                onClick={() => navigate('/admin/dashboard/daily-reports')}
                className="hover:text-lime-400 cursor-pointer transition"
              >
                Daily Sales & Purchase Report
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-lime-400 font-semibold">
                {entryType === 'SALES' ? 'Record Daily Sale' : 'Record Daily Purchase'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>{entryType === 'SALES' ? 'Record Daily Sale' : 'Record Daily Purchase'}</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-lime-500/15 text-lime-400 border border-lime-500/30">
                Live Tax & Cash Settlement
              </span>
            </h1>
          </div>
        </div>

        {/* Type Toggle Switcher */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setEntryType('SALES');
              setCategory('Restroom Cubicles');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              entryType === 'SALES'
                ? 'bg-lime-500 text-slate-950 shadow-md shadow-lime-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Sales Entry</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryType('PURCHASE');
              setCategory('Raw Materials / Boards');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              entryType === 'PURCHASE'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Purchase Entry</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Details & Cash Settlement (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Mandatory Identification Details */}
            <div className="bg-[#121226]/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-lime-500/10 text-lime-400 border border-lime-500/20">
                    <Receipt className="w-4 h-4" />
                  </span>
                  <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                    Mandatory Invoice & Party Details
                  </h2>
                </div>
                <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                  <span>* Required fields</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Invoice No (MANDATORY *) */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Invoice No / Reference No <span className="text-rose-400 text-sm">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={invoiceNo}
                      onChange={(e) => {
                        setInvoiceNo(e.target.value);
                        if (validationErrors.invoiceNo) {
                          setValidationErrors((prev) => ({ ...prev, invoiceNo: '' }));
                        }
                      }}
                      placeholder={entryType === 'SALES' ? 'e.g. INV-2026-001 or PRC/DEL/26-27/012' : 'e.g. SUP-BILL-8891'}
                      className={`w-full bg-[#030213] border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 font-mono focus:outline-none transition ${
                        validationErrors.invoiceNo
                          ? 'border-rose-500 focus:border-rose-400'
                          : 'border-slate-700/80 focus:border-lime-500'
                      }`}
                    />
                  </div>
                  {validationErrors.invoiceNo ? (
                    <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                      {validationErrors.invoiceNo}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Mandatory formal document number for ledger identification.
                    </span>
                  )}
                </div>

                {/* 2. Transaction Date (MANDATORY *) */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Transaction Date <span className="text-rose-400 text-sm">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full bg-[#030213] border border-slate-700/80 focus:border-lime-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none transition"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Financial accounting posting date.
                  </span>
                </div>
              </div>

              {/* Customer / Vendor Selection */}
              <div className="pt-2 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    {entryType === 'SALES' ? 'Customer / Client' : 'Vendor / Supplier'}{' '}
                    <span className="text-rose-400 text-sm">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomParty(!useCustomParty);
                      if (validationErrors.party) {
                        setValidationErrors((prev) => ({ ...prev, party: '' }));
                      }
                    }}
                    className="text-[11px] font-bold text-lime-400 hover:text-lime-300 transition underline underline-offset-2 cursor-pointer"
                  >
                    {useCustomParty
                      ? `Select from ${entryType === 'SALES' ? 'CRM Customer Directory' : 'Vendor Directory'}`
                      : '+ Enter Custom Direct Name'}
                  </button>
                </div>

                {useCustomParty ? (
                  <div>
                    <input
                      type="text"
                      value={customPartyName}
                      onChange={(e) => {
                        setCustomPartyName(e.target.value);
                        if (validationErrors.party) {
                          setValidationErrors((prev) => ({ ...prev, party: '' }));
                        }
                      }}
                      placeholder={
                        entryType === 'SALES'
                          ? 'Enter direct client or organization name...'
                          : 'Enter direct vendor or supplier name...'
                      }
                      className={`w-full bg-[#030213] border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                        validationErrors.party
                          ? 'border-rose-500 focus:border-rose-400'
                          : 'border-slate-700/80 focus:border-lime-500'
                      }`}
                    />
                    {validationErrors.party && (
                      <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                        {validationErrors.party}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Search filter for dropdown */}
                    <div className="relative">
                      <input
                        type="text"
                        value={partySearchTerm}
                        onChange={(e) => setPartySearchTerm(e.target.value)}
                        placeholder={`Search ${entryType === 'SALES' ? 'customers by name / GSTIN...' : 'vendors by name...'}`}
                        className="w-full bg-[#030213] border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500 mb-1"
                      />
                    </div>

                    <select
                      value={entryType === 'SALES' ? selectedCustomerId : selectedVendorId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (entryType === 'SALES') {
                          setSelectedCustomerId(val);
                        } else {
                          setSelectedVendorId(val);
                        }
                        if (validationErrors.party) {
                          setValidationErrors((prev) => ({ ...prev, party: '' }));
                        }
                      }}
                      className={`w-full bg-[#030213] border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition ${
                        validationErrors.party
                          ? 'border-rose-500 focus:border-rose-400'
                          : 'border-slate-700/80 focus:border-lime-500'
                      }`}
                      disabled={isLoadingParties}
                    >
                      <option value="">
                        {isLoadingParties
                          ? 'Loading parties...'
                          : `-- Select ${entryType === 'SALES' ? 'Customer from CRM' : 'Vendor'} --`}
                      </option>
                      {entryType === 'SALES'
                        ? filteredCustomers.map((cust) => {
                            const name = cust.legalName || cust.tradeName || cust.party?.tradeName || cust.party?.legalName || 'Unnamed Customer';
                            const gstin = cust.gstin || cust.party?.gstin ? ` [GST: ${cust.gstin || cust.party?.gstin}]` : '';
                            return (
                              <option key={cust.id} value={cust.id}>
                                {name} {gstin}
                              </option>
                            );
                          })
                        : filteredVendors.map((vend) => {
                            const name = vend.legalName || vend.tradeName || vend.party?.tradeName || vend.party?.legalName || 'Unnamed Vendor';
                            return (
                              <option key={vend.id} value={vend.id}>
                                {name}
                              </option>
                            );
                          })}
                    </select>
                    {validationErrors.party && (
                      <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                        {validationErrors.party}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Category & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#030213] border border-slate-700/80 focus:border-lime-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    GST Jurisdiction (State)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDelhiGst(true)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                        isDelhiGst
                          ? 'bg-lime-500/15 border-lime-500 text-lime-300 shadow-sm'
                          : 'bg-[#030213] border-slate-700/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>Delhi (07)</span>
                      <span className="text-[10px] font-normal text-slate-400">CGST 9% + SGST 9%</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDelhiGst(false)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                        !isDelhiGst
                          ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-sm'
                          : 'bg-[#030213] border-slate-700/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>Interstate</span>
                      <span className="text-[10px] font-normal text-slate-400">IGST 18%</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Core Financials & Cash Deduction Engine */}
            <div className="bg-[#121226]/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <DollarSign className="w-4 h-4" />
                  </span>
                  <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                    Financials &amp; Cash Deduction Engine
                  </h2>
                </div>
                <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Pre-GST Cash Deduction
                </span>
              </div>

              {/* Total Basic Amount (MANDATORY *) */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Total Basic Amount (₹) <span className="text-rose-400 text-sm">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={totalBasicAmount}
                    onChange={(e) => {
                      setTotalBasicAmount(e.target.value);
                      if (validationErrors.totalBasicAmount) {
                        setValidationErrors((prev) => ({ ...prev, totalBasicAmount: '' }));
                      }
                    }}
                    placeholder="0.00"
                    className={`w-full bg-[#030213] border rounded-xl pl-9 pr-3.5 py-3 text-lg font-mono font-bold text-white placeholder-slate-500 focus:outline-none transition ${
                      validationErrors.totalBasicAmount
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-slate-700/80 focus:border-lime-500'
                    }`}
                  />
                </div>
                {validationErrors.totalBasicAmount ? (
                  <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                    {validationErrors.totalBasicAmount}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Full taxable base value prior to any cash settlement deduction.
                  </span>
                )}
              </div>

              {/* Cash Payment Option & Deduction Feature */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="hasCashPaymentToggle"
                      checked={hasCashReceived}
                      onChange={(e) => {
                        setHasCashReceived(e.target.checked);
                        if (!e.target.checked) setCashReceivedAmount('');
                      }}
                      className="w-4 h-4 rounded text-lime-500 focus:ring-lime-500 bg-slate-950 border-slate-700 cursor-pointer"
                    />
                    <label
                      htmlFor="hasCashPaymentToggle"
                      className="text-xs font-bold text-white cursor-pointer select-none flex items-center gap-1.5"
                    >
                      <Wallet className="w-4 h-4 text-lime-400" />
                      <span>Record Payment Received / Cash Deduction from Basic</span>
                    </label>
                  </div>

                  {hasCashReceived && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-lime-500/20 text-lime-300 border border-lime-500/30">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When cash is received, it is subtracted from Total Basic Amount. The remaining amount will then have 18% GST added ({isDelhiGst ? '9% CGST + 9% SGST for Delhi' : '18% IGST'}).
                </p>

                {hasCashReceived && (
                  <div className="pt-2 border-t border-slate-800 space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold text-lime-300 mb-1">
                        Cash Payment Received (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lime-400 font-mono font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={numTotalBasic || undefined}
                          step="0.01"
                          value={cashReceivedAmount}
                          onChange={(e) => {
                            setCashReceivedAmount(e.target.value);
                            if (validationErrors.cashReceivedAmount) {
                              setValidationErrors((prev) => ({ ...prev, cashReceivedAmount: '' }));
                            }
                          }}
                          placeholder="0.00"
                          className={`w-full bg-[#030213] border rounded-xl pl-9 pr-3.5 py-2.5 text-base font-mono font-bold text-lime-300 placeholder-slate-600 focus:outline-none transition ${
                            validationErrors.cashReceivedAmount
                              ? 'border-rose-500 focus:border-rose-400'
                              : 'border-lime-500/50 focus:border-lime-400'
                          }`}
                        />
                      </div>
                      {validationErrors.cashReceivedAmount ? (
                        <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                          {validationErrors.cashReceivedAmount}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          This amount will be deducted directly from Total Basic Amount before tax.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Advance Payment Option & Balance Settlement Feature */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="hasAdvancePaymentToggle"
                      checked={hasAdvanceReceived}
                      onChange={(e) => {
                        setHasAdvanceReceived(e.target.checked);
                        if (!e.target.checked) {
                          setAdvanceAmount('');
                          if (validationErrors.advanceAmount) {
                            setValidationErrors((prev) => ({ ...prev, advanceAmount: '' }));
                          }
                        }
                      }}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-700 cursor-pointer"
                    />
                    <label
                      htmlFor="hasAdvancePaymentToggle"
                      className="text-xs font-bold text-white cursor-pointer select-none flex items-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4 text-cyan-400" />
                      <span>Record Advance Payment (Advance Received against Bill)</span>
                    </label>
                  </div>

                  {hasAdvanceReceived && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Record advance payment or token deposit received from the customer against the Total Bill Amount. The system tracks payment mode, transaction reference date, and computes remaining balance due.
                </p>

                {hasAdvanceReceived && (
                  <div className="pt-2 border-t border-slate-800 space-y-3 animate-fade-in">
                    {/* Quick percentage buttons */}
                    {totalBillAmount > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Presets:</span>
                        {[25, 50, 75, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleApplyAdvancePercentage(pct)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 hover:text-white transition cursor-pointer"
                          >
                            {pct === 100 ? '100% Full' : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-cyan-300 mb-1">
                          Advance Amount Received (₹) <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 font-mono font-bold">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={advanceAmount}
                            onChange={(e) => {
                              setAdvanceAmount(e.target.value);
                              if (validationErrors.advanceAmount) {
                                setValidationErrors((prev) => ({ ...prev, advanceAmount: '' }));
                              }
                            }}
                            placeholder="0.00"
                            className={`w-full bg-[#030213] border rounded-xl pl-9 pr-3.5 py-2.5 text-base font-mono font-bold text-cyan-300 placeholder-slate-600 focus:outline-none transition ${
                              validationErrors.advanceAmount
                                ? 'border-rose-500 focus:border-rose-400'
                                : 'border-cyan-500/50 focus:border-cyan-400'
                            }`}
                          />
                        </div>
                        {validationErrors.advanceAmount ? (
                          <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                            {validationErrors.advanceAmount}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Advance deposit towards Total Bill Amount of {formatCurrency(totalBillAmount)}.
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          Advance Payment Mode
                        </label>
                        <select
                          value={advancePaymentMode}
                          onChange={(e) => setAdvancePaymentMode(e.target.value)}
                          className="w-full bg-[#030213] border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                        >
                          <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                          <option value="UPI">UPI / QR Code Transfer</option>
                          <option value="CHEQUE">Cheque Payment</option>
                          <option value="CASH">Cash Payment</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          Advance Payment Date
                        </label>
                        <input
                          type="date"
                          value={advancePaymentDate}
                          onChange={(e) => setAdvancePaymentDate(e.target.value)}
                          className="w-full bg-[#030213] border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-200 mb-1">
                          Transaction Ref / UTR / Cheque No
                        </label>
                        <input
                          type="text"
                          value={advanceReferenceNo}
                          onChange={(e) => setAdvanceReferenceNo(e.target.value)}
                          placeholder="e.g. UTR198273645 / Cheque #88201"
                          className="w-full bg-[#030213] border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Live Advance Summary Pill */}
                    {numAdvance > 0 && (
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="text-slate-400 block text-[11px]">Advance Received:</span>
                          <span className="font-mono font-bold text-cyan-300 text-sm">
                            {formatCurrency(numAdvance)}
                          </span>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="text-slate-400 block text-[11px]">Remaining Balance Due:</span>
                          <span
                            className={`font-mono font-bold text-sm ${
                              balanceDue <= 0 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {formatCurrency(balanceDue)}
                          </span>
                        </div>
                        <div>
                          {balanceDue <= 0 ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Paid in Full
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Partial (Balance Due)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Mode & Status Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Payment Mode</label>
                  <select
                    value={hasCashReceived && numCashReceived > 0 ? 'CASH' : paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-[#030213] border border-slate-700/80 focus:border-lime-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  >
                    {PAYMENT_MODES.map((pm) => (
                      <option key={pm.value} value={pm.value}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full bg-[#030213] border border-slate-700/80 focus:border-lime-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  >
                    {PAYMENT_STATUSES.map((ps) => (
                      <option key={ps.value} value={ps.value}>
                        {ps.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional order specifications, customer notes, or cheque / UTR transaction details..."
                  className="w-full bg-[#030213] border border-slate-700/80 focus:border-lime-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Calculation Card & Action Panel (1 col) */}
          <div className="space-y-6">
            {/* Live Calculation Breakdown Card */}
            <div className="bg-[#121226] border border-[#7FB706]/40 rounded-2xl p-5 shadow-2xl space-y-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-lime-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                    Live Settlement Engine
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-lime-500/10 text-lime-400 border border-lime-500/20">
                  {isDelhiGst ? 'Delhi (07)' : 'Interstate'}
                </span>
              </div>

              {/* Detailed Math Steps */}
              <div className="space-y-2.5 text-xs">
                {/* 1. Total Basic Amount */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030213]/80 border border-white/5">
                  <span className="text-slate-300 font-medium">1. Total Basic Amount</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatCurrency(numTotalBasic)}
                  </span>
                </div>

                {/* 2. Less: Cash Received */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030213]/80 border border-white/5">
                  <span className="text-lime-400 font-medium flex items-center gap-1">
                    <span>2. Less: Cash Received</span>
                  </span>
                  <span className="font-mono font-bold text-lime-400 text-sm">
                    {numCashReceived > 0 ? `- ${formatCurrency(numCashReceived)}` : '₹0.00'}
                  </span>
                </div>

                {/* 3. Remaining Basic Amount */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-700/60">
                  <span className="text-slate-200 font-bold">3. Remaining Taxable Basic</span>
                  <span className="font-mono font-bold text-slate-100 text-sm">
                    {formatCurrency(remainingBasicAmount)}
                  </span>
                </div>

                {/* 4. GST Breakdown (18%) */}
                <div className="p-3 rounded-xl bg-[#030213]/80 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>4. Statutory GST (18%)</span>
                    <span>on {formatCurrency(remainingBasicAmount)}</span>
                  </div>

                  {isDelhiGst ? (
                    <>
                      <div className="flex items-center justify-between pl-2 border-l-2 border-blue-500/50">
                        <span className="text-slate-300">CGST (9%)</span>
                        <span className="font-mono font-bold text-blue-400">
                          {formatCurrency(cgstAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-2 border-l-2 border-blue-500/50">
                        <span className="text-slate-300">SGST (9%)</span>
                        <span className="font-mono font-bold text-blue-400">
                          {formatCurrency(sgstAmount)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between pl-2 border-l-2 border-purple-500/50">
                      <span className="text-slate-300">IGST (18%)</span>
                      <span className="font-mono font-bold text-purple-400">
                        {formatCurrency(igstAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[11px]">
                    <span className="text-slate-400 font-semibold">Total GST Amount</span>
                    <span className="font-mono font-bold text-amber-400">
                      {formatCurrency(totalGstAmount)}
                    </span>
                  </div>
                </div>

                {/* 5. Total Bill Amount including GST (MANDATORY *) */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-lime-500/20 via-emerald-500/10 to-transparent border-2 border-lime-500/60 shadow-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black uppercase text-lime-300 tracking-wider">
                      Total Bill Amount including GST <span className="text-rose-400">*</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-lime-500/30 text-lime-200">
                      Tax Invoice
                    </span>
                  </div>
                  <div className="font-mono font-black text-2xl sm:text-3xl text-white tracking-tight">
                    {formatCurrency(totalBillAmount)}
                  </div>
                  <span className="text-[10px] text-lime-200/80 block mt-1">
                    = Remaining Basic ({formatCurrency(remainingBasicAmount)}) + GST ({formatCurrency(totalGstAmount)})
                  </span>
                </div>

                {/* Summary of Total Deal / Cash + Bill */}
                {numCashReceived > 0 && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1.5">
                    <span className="font-bold text-slate-300 block">Total Transaction Value</span>
                    <div className="flex justify-between text-slate-400">
                      <span>Cash Collected:</span>
                      <span className="font-mono text-lime-400 font-semibold">{formatCurrency(numCashReceived)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Billed with GST:</span>
                      <span className="font-mono text-white font-semibold">{formatCurrency(totalBillAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-200 font-bold border-t border-slate-800 pt-1">
                      <span>Combined Realization:</span>
                      <span className="font-mono text-amber-400">{formatCurrency(numCashReceived + totalBillAmount)}</span>
                    </div>
                  </div>
                )}

                {/* 6. Advance Payment Received & Balance Due (when active) */}
                {hasAdvanceReceived && numAdvance > 0 && (
                  <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-cyan-400" />
                        <span>6. Advance Payment Received</span>
                      </span>
                      <span className="font-mono font-bold text-cyan-300 text-sm">
                        - {formatCurrency(numAdvance)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 flex items-center justify-between pl-2 border-l-2 border-cyan-500/40">
                      <span className="text-slate-400">Payment Mode:</span>
                      <span className="font-semibold text-slate-200">
                        {advancePaymentMode === 'BANK_TRANSFER'
                          ? 'Bank Transfer (NEFT/RTGS)'
                          : advancePaymentMode === 'UPI'
                          ? 'UPI / QR Code'
                          : advancePaymentMode === 'CHEQUE'
                          ? 'Cheque'
                          : 'Cash'}
                        {advanceReferenceNo ? ` [${advanceReferenceNo}]` : ''}
                      </span>
                    </div>

                    {/* 7. Balance Due / Outstanding Amount */}
                    <div className="pt-2 border-t border-cyan-500/30 flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <span>7. Remaining Balance Due:</span>
                      </span>
                      <span
                        className={`font-mono font-black text-lg ${
                          balanceDue <= 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {formatCurrency(balanceDue)}
                      </span>
                    </div>

                    <div className="pt-1">
                      {balanceDue <= 0 ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>100% Settled in Full — No Balance Pending</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Partially Paid — ₹{balanceDue.toLocaleString('en-IN')} Balance Due</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-black bg-lime-500 hover:bg-lime-400 text-slate-950 shadow-lg shadow-lime-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Daily Entry...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Record Daily Sale</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin/dashboard/daily-reports')}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 flex items-center justify-center transition cursor-pointer"
                >
                  <span>Cancel and Return</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RecordDailySalePage;
