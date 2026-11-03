import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Building2,
  Users,
  DollarSign,
  Calendar,
  Tag,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { crmApi, vendorsApi } from '../../api';
import { dailySalesPurchasesApi } from '../../api/dailySalesPurchasesApi';
import {
  DailySalesPurchaseItem,
  CreateDailySalesPurchasePayload,
  BusinessParty,
} from '../../types/admin';

interface AddEditDailySalesPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: 'SALES' | 'PURCHASE';
  initialDate?: string;
  editItem?: DailySalesPurchaseItem | null;
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
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
  { value: 'UPI', label: 'UPI / QR Code' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CREDIT', label: 'Credit (Pay Later)' },
];

const PAYMENT_STATUSES = [
  { value: 'PAID', label: 'Paid / Received' },
  { value: 'PARTIAL', label: 'Partially Paid' },
  { value: 'UNPAID', label: 'Unpaid / Outstanding' },
];

export const AddEditDailySalesPurchaseModal: React.FC<AddEditDailySalesPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'SALES',
  initialDate,
  editItem = null,
}) => {
  const [type, setType] = useState<'SALES' | 'PURCHASE'>(initialType);
  const [entryDate, setEntryDate] = useState<string>(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('0');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [hasCashDeduction, setHasCashDeduction] = useState<boolean>(false);
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isDelhiGst, setIsDelhiGst] = useState<boolean>(true);
  const [isManualTax, setIsManualTax] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('Restroom Cubicles');
  const [description, setDescription] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [paymentStatus, setPaymentStatus] = useState<string>('PAID');

  // Advance Payment State
  const [hasAdvance, setHasAdvance] = useState<boolean>(false);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceMode, setAdvanceMode] = useState<string>('BANK_TRANSFER');
  const [advanceRef, setAdvanceRef] = useState<string>('');

  // Customer & Vendor selections
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [customPartyName, setCustomPartyName] = useState<string>('');
  const [isLoadingParties, setIsLoadingParties] = useState<boolean>(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Customers & Vendors
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingParties(true);

    Promise.all([
      crmApi.listCustomers({ limit: 100 }).catch(() => ({ data: { data: { items: [] } } })),
      vendorsApi.listVendors({ limit: 100 }).catch(() => ({ data: { data: { items: [] } } })),
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
  }, [isOpen]);

  // Populate fields if in edit mode or initial props changed
  useEffect(() => {
    if (editItem) {
      setType(editItem.type);
      setEntryDate(editItem.entryDate ? editItem.entryDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setAmount(String(editItem.amount || ''));
      setTaxAmount(String(editItem.taxAmount || '0'));
      setReferenceNo(editItem.referenceNo || '');
      setCategory(editItem.category || 'Restroom Cubicles');
      setDescription(editItem.description || '');
      setPaymentMode(editItem.paymentMode || 'BANK_TRANSFER');
      setPaymentStatus(editItem.paymentStatus || 'PAID');
      setSelectedCustomerId(editItem.customerId || '');
      setSelectedVendorId(editItem.vendorId || '');
      setCustomPartyName(editItem.partyName || '');
    } else {
      setType(initialType);
      setEntryDate(initialDate || new Date().toISOString().slice(0, 10));
      setAmount('');
      setTaxAmount('0');
      setReferenceNo('');
      setCategory(initialType === 'SALES' ? 'Restroom Cubicles' : 'Raw Materials / Boards');
      setDescription('');
      setPaymentMode('BANK_TRANSFER');
      setPaymentStatus('PAID');
      setSelectedCustomerId('');
      setSelectedVendorId('');
      setCustomPartyName('');
    }
    setErrorMessage(null);
  }, [editItem, initialType, initialDate, isOpen]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const numCash = hasCashDeduction ? (parseFloat(cashReceived) || 0) : 0;
  const remainingBasic = Math.max(0, numAmount - numCash);
  const autoTax = Math.round(remainingBasic * 0.18 * 100) / 100;
  const numTax = isManualTax ? (parseFloat(taxAmount) || 0) : autoTax;
  const totalAmount = Math.round((remainingBasic + numTax) * 100) / 100;
  const numAdvance = hasAdvance ? (parseFloat(advanceAmount) || 0) : 0;
  const balanceDue = Math.max(0, Math.round((totalAmount - numAdvance) * 100) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!referenceNo.trim()) {
      setErrorMessage('Invoice No / Reference No is mandatory.');
      return;
    }

    if (numAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than zero.');
      return;
    }

    if (type === 'SALES' && !selectedCustomerId && !customPartyName.trim()) {
      setErrorMessage('Please select a customer or enter the customer name.');
      return;
    }

    if (type === 'PURCHASE' && !selectedVendorId && !customPartyName.trim()) {
      setErrorMessage('Please select a vendor or enter the supplier name.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find party name from selection if not manually overridden
      let partyDisplayName = customPartyName.trim();
      if (!partyDisplayName) {
        if (type === 'SALES' && selectedCustomerId) {
          const c = customers.find((cust) => cust.id === selectedCustomerId || cust.partyId === selectedCustomerId);
          partyDisplayName = c?.legalName || c?.tradeName || c?.party?.tradeName || c?.party?.legalName || 'Customer';
        } else if (type === 'PURCHASE' && selectedVendorId) {
          const v = vendors.find((vend) => vend.id === selectedVendorId || vend.partyId === selectedVendorId);
          partyDisplayName = v?.legalName || v?.tradeName || v?.party?.tradeName || v?.party?.legalName || 'Supplier';
        }
      }

      const notes: string[] = [];
      if (description.trim()) notes.push(description.trim());
      if (hasCashDeduction && numCash > 0) {
        notes.push(`[Pre-GST Cash Deduction: Basic ₹${numAmount} - Cash ₹${numCash} = Net Basic ₹${remainingBasic} + Tax ₹${numTax} = Total ₹${totalAmount}]`);
      }
      if (hasAdvance && numAdvance > 0) {
        const refText = advanceRef.trim() ? ` (Ref: ${advanceRef.trim()})` : '';
        const dueText = balanceDue <= 0 ? 'Full Advance Settlement (Balance: ₹0.00)' : `Balance Due: ₹${balanceDue.toLocaleString('en-IN')}`;
        notes.push(`[Advance Payment: ₹${numAdvance.toLocaleString('en-IN')} via ${advanceMode}${refText} | ${dueText}]`);
      }

      let resolvedStatus = paymentStatus;
      if (hasAdvance && numAdvance > 0) {
        resolvedStatus = balanceDue <= 0 ? 'PAID' : 'PARTIAL';
      }

      let resolvedMode = paymentMode;
      if (hasAdvance && numAdvance > 0) {
        resolvedMode = advanceMode;
      } else if (hasCashDeduction && numCash > 0) {
        resolvedMode = 'CASH';
      }

      const payload: CreateDailySalesPurchasePayload = {
        entryDate,
        type,
        amount: remainingBasic,
        taxAmount: numTax,
        totalAmount,
        referenceNo: referenceNo.trim(),
        partyName: partyDisplayName,
        customerId: type === 'SALES' ? selectedCustomerId || undefined : undefined,
        vendorId: type === 'PURCHASE' ? selectedVendorId || undefined : undefined,
        category,
        description: notes.length > 0 ? notes.join('\n') : undefined,
        paymentMode: resolvedMode,
        paymentStatus: resolvedStatus,
      };

      if (editItem) {
        await dailySalesPurchasesApi.update(editItem.id, payload);
      } else {
        await dailySalesPurchasesApi.create(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save daily entry:', err);
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to save daily entry. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span
              className={`p-2 rounded-xl border ${
                type === 'SALES'
                  ? 'bg-lime-500/10 text-lime-400 border-lime-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {type === 'SALES' ? <DollarSign className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{editItem ? 'Edit Daily Entry' : 'Add Manual Daily Entry'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Delinked from PI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {type === 'SALES'
                  ? 'Record verified sales directly with Customer Selection'
                  : 'Record procurement spend directly with Vendor Selection'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Type Toggle: Sales vs Purchase */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Transaction Classification *
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setType('SALES');
                  if (!editItem) setCategory('Restroom Cubicles');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  type === 'SALES'
                    ? 'bg-lime-500 text-slate-950 shadow-md shadow-lime-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Daily Sales (Customer)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('PURCHASE');
                  if (!editItem) setCategory('Raw Materials / Boards');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  type === 'PURCHASE'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Daily Purchase (Vendor)</span>
              </button>
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Transaction Date *
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                  className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setEntryDate(new Date().toISOString().slice(0, 10))}
                  className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg border border-slate-700 whitespace-nowrap"
                >
                  Today
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {type === 'SALES' ? 'Tax Invoice / Cash Memo No. *' : 'Vendor Bill / Challan No. *'}
              </label>
              <input
                type="text"
                required
                placeholder={type === 'SALES' ? 'e.g. INV-2026-0042' : 'e.g. VEND-BILL-990'}
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Conditional Party Selection */}
          {type === 'SALES' ? (
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <label className="text-xs font-bold text-lime-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Select Customer Party *</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const found = customers.find((c) => c.id === e.target.value || c.partyId === e.target.value);
                  if (found) {
                    setCustomPartyName(found.legalName || found.tradeName || found.party?.tradeName || found.party?.legalName || '');
                  }
                }}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none"
              >
                <option value="">-- Choose Existing B2B Customer --</option>
                {customers.map((c) => {
                  const name = c.legalName || c.tradeName || c.party?.tradeName || c.party?.legalName || 'Customer';
                  const gstin = c.gstin || c.party?.gstin;
                  return (
                    <option key={c.id} value={c.id}>
                      {name} {gstin ? `(${gstin})` : ''}
                    </option>
                  );
                })}
              </select>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Or custom / walk-in customer name:</span>
              </div>
              <input
                type="text"
                placeholder="Enter client trade name if not in list"
                value={customPartyName}
                onChange={(e) => setCustomPartyName(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Select Vendor / Supplier *</span>
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => {
                  setSelectedVendorId(e.target.value);
                  const found = vendors.find((v) => v.id === e.target.value || v.partyId === e.target.value);
                  if (found) {
                    setCustomPartyName(found.legalName || found.tradeName || found.party?.tradeName || found.party?.legalName || '');
                  }
                }}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 w-full focus:ring-1 focus:ring-amber-400 focus:outline-none"
              >
                <option value="">-- Choose Existing Vendor / Supplier --</option>
                {vendors.map((v) => {
                  const name = v.legalName || v.tradeName || v.party?.tradeName || v.party?.legalName || 'Supplier';
                  const gstin = v.gstin || v.party?.gstin;
                  return (
                    <option key={v.id} value={v.id}>
                      {name} {gstin ? `(${gstin})` : ''}
                    </option>
                  );
                })}
              </select>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Or custom / local supplier name:</span>
              </div>
              <input
                type="text"
                placeholder="Enter supplier name if not in list"
                value={customPartyName}
                onChange={(e) => setCustomPartyName(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 w-full focus:ring-1 focus:ring-amber-400 focus:outline-none"
              />
            </div>
          )}

          {/* Category & Amount Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Product Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Total Basic Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                GST / Tax (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={isManualTax ? taxAmount : autoTax}
                onChange={(e) => {
                  setIsManualTax(true);
                  setTaxAmount(e.target.value);
                }}
                className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Cash Deduction from Basic Feature */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasCashDeduction}
                  onChange={(e) => {
                    setHasCashDeduction(e.target.checked);
                    if (!e.target.checked) setCashReceived('');
                  }}
                  className="rounded text-lime-500 bg-slate-900 border-slate-700"
                />
                <span>Record Cash Received (Subtract from Basic before GST)</span>
              </label>
              {hasCashDeduction && (
                <span className="text-[10px] text-lime-400 font-bold">Active</span>
              )}
            </div>

            {hasCashDeduction && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Cash Payment Received (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-lime-400 text-xs rounded-xl px-3 py-1.5 w-full font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="flex flex-col justify-end text-[11px] text-slate-400">
                  <span>Net Taxable Basic: <strong className="text-white font-mono">₹{remainingBasic.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  <span>18% GST: <strong className="text-amber-400 font-mono">₹{autoTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Grand Total Summary Box */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Bill Amount including GST *:</span>
            <span className="text-sm font-black text-lime-400 font-mono">
              ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Advance Payment Option & Balance Settlement Feature */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAdvance}
                  onChange={(e) => {
                    setHasAdvance(e.target.checked);
                    if (!e.target.checked) setAdvanceAmount('');
                  }}
                  className="rounded text-cyan-500 bg-slate-900 border-slate-700"
                />
                <span>Record Advance Payment (Advance Received against Bill)</span>
              </label>
              {hasAdvance && (
                <span className="text-[10px] text-cyan-400 font-bold">Active</span>
              )}
            </div>

            {hasAdvance && (
              <div className="space-y-2.5 pt-2 border-t border-slate-850">
                {totalAmount > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400">Presets:</span>
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setAdvanceAmount((totalAmount * (pct / 100)).toFixed(2))}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 hover:text-white"
                      >
                        {pct === 100 ? '100% Full' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-cyan-300 block mb-1">
                      Advance (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs rounded-xl px-3 py-1.5 w-full font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Mode
                    </label>
                    <select
                      value={advanceMode}
                      onChange={(e) => setAdvanceMode(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-2 py-1.5 w-full focus:outline-none"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      UTR / Cheque Ref
                    </label>
                    <input
                      type="text"
                      placeholder="Reference #"
                      value={advanceRef}
                      onChange={(e) => setAdvanceRef(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-2 py-1.5 w-full focus:outline-none"
                    />
                  </div>
                </div>

                {numAdvance > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
                    <span className="text-slate-300">
                      Advance: <strong className="font-mono text-cyan-300">₹{numAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </span>
                    <span className="text-slate-300">
                      Balance Due: <strong className={`font-mono ${balanceDue <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${balanceDue <= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {balanceDue <= 0 ? 'Fully Paid' : 'Partial Due'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none"
              >
                {PAYMENT_MODES.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none"
              >
                {PAYMENT_STATUSES.map((ps) => (
                  <option key={ps.value} value={ps.value}>
                    {ps.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description / Item Details */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 4 Restroom cubicle units delivered to site, installation pending"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 w-full focus:ring-1 focus:ring-lime-400 focus:outline-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-xl border border-slate-700 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg transition-all ${
              type === 'SALES'
                ? 'bg-lime-500 hover:bg-lime-400 text-slate-950 shadow-lime-500/20'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{editItem ? 'Update Entry' : 'Save Daily Entry'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
