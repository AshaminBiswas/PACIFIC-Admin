import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Building2,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  User,
  Users,
  Search,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  ChevronDown,
  PenLine,
} from 'lucide-react';
import {
  BranchItem,
  BranchTransactionItem,
  CreateBranchTransactionPayload,
  BusinessParty,
} from '../../types/admin';
import { branchLedgerApi } from '../../api/branchLedgerApi';
import { crmApi, vendorsApi } from '../../api/crmApi';

interface AddEditBranchTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branches: BranchItem[];
  defaultBranchId?: string;
  initialType?: 'CREDIT' | 'DEBIT';
  transactionToEdit?: BranchTransactionItem | null;
}

const CREDIT_CATEGORIES = [
  'Sales Collection',
  'HO Fund Transfer',
  'Customer Advance',
  'Scrap / Asset Sale',
  'Bank Interest',
  'Inter-Branch Transfer',
  'Refund Received',
  'Other Inflow',
];

const DEBIT_CATEGORIES = [
  'Local Material Purchase',
  'Transporter & Freight',
  'Site Installation Expense',
  'Branch Rent & Utilities',
  'Petty Cash Expense',
  'Labor & Fabrication Wage',
  'Office Stationary & Tea',
  'Staff Travel & Conveyance',
  'Bank Charges & Fees',
  'Customer Refund',
  'Other Outflow',
];

const PAYMENT_MODES = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / IMPS' },
  { value: 'UPI', label: 'UPI / QR Payment' },
  { value: 'CASH', label: 'Branch Cash / Petty Cash' },
  { value: 'CHEQUE', label: 'Bank Cheque' },
  { value: 'NEFT_RTGS', label: 'NEFT / RTGS' },
];

const QUICK_CREDIT_PAYERS = [
  'Head Office Remittance',
  'Cash Client',
  'Scrap / Salvage Buyer',
  'Bank Deposit / Interest',
  'Inter-Branch Inflow',
];

const QUICK_DEBIT_PAYEES = [
  'Site Transporter',
  'Office Landlord (Rent)',
  'Daily Labor Contractor',
  'Electricity & Utilities',
  'Petty Cash Incharge',
];

export const AddEditBranchTransactionModal: React.FC<AddEditBranchTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branches,
  defaultBranchId,
  initialType = 'CREDIT',
  transactionToEdit,
}) => {
  const isEditing = !!transactionToEdit;

  const [type, setType] = useState<'CREDIT' | 'DEBIT'>(initialType);
  const [branchId, setBranchId] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [partyName, setPartyName] = useState<string>('');
  const [partyType, setPartyType] = useState<string>('CUSTOMER');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [paymentStatus, setPaymentStatus] = useState<string>('CLEARED');
  const [description, setDescription] = useState<string>('');

  // B2B Parties Search & Custom Name Mode
  const [partyInputMode, setPartyInputMode] = useState<'SEARCH' | 'CUSTOM'>('SEARCH');
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoadingParties, setIsLoadingParties] = useState<boolean>(false);
  const [partySearchTerm, setPartySearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedPartyObj, setSelectedPartyObj] = useState<any | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize or populate form
  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setBranchId(transactionToEdit.branchId);
      setEntryDate(transactionToEdit.entryDate);
      setAmount(String(transactionToEdit.amount || ''));
      setCategory(transactionToEdit.category || '');
      setPartyName(transactionToEdit.partyName || '');
      setPartySearchTerm(transactionToEdit.partyName || '');
      setPartyType(transactionToEdit.partyType || (transactionToEdit.type === 'CREDIT' ? 'CUSTOMER' : 'VENDOR'));
      setReferenceNo(transactionToEdit.referenceNo || '');
      setPaymentMode(transactionToEdit.paymentMode || 'BANK_TRANSFER');
      setPaymentStatus(transactionToEdit.paymentStatus || 'CLEARED');
      setDescription(transactionToEdit.description || '');
      setPartyInputMode('CUSTOM'); // Default to custom when editing existing
      setSelectedPartyObj(null);
    } else {
      setType(initialType);
      const selected = defaultBranchId && defaultBranchId !== 'ALL'
        ? defaultBranchId
        : branches[0]?.id || '';
      setBranchId(selected);
      setEntryDate(new Date().toISOString().slice(0, 10));
      setAmount('');
      setCategory(initialType === 'CREDIT' ? CREDIT_CATEGORIES[0] : DEBIT_CATEGORIES[0]);
      setPartyName('');
      setPartySearchTerm('');
      setPartyType(initialType === 'CREDIT' ? 'CUSTOMER' : 'VENDOR');
      setReferenceNo('');
      setPaymentMode('BANK_TRANSFER');
      setPaymentStatus('CLEARED');
      setDescription('');
      setPartyInputMode('SEARCH');
      setSelectedPartyObj(null);
    }
    setError(null);
  }, [transactionToEdit, isOpen, defaultBranchId, initialType, branches]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: 'CREDIT' | 'DEBIT') => {
    setType(newType);
    if (!isEditing) {
      setCategory(newType === 'CREDIT' ? CREDIT_CATEGORIES[0] : DEBIT_CATEGORIES[0]);
      setPartyType(newType === 'CREDIT' ? 'CUSTOMER' : 'VENDOR');
    }
  };

  const setDatePreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setEntryDate(d.toISOString().slice(0, 10));
  };

  // Filter customers by search term
  const filteredCustomers = useMemo(() => {
    if (!partySearchTerm.trim()) return customers.slice(0, 12);
    const q = partySearchTerm.toLowerCase();
    return customers.filter((c) => {
      const name = (c.tradeName || c.legalName || c.party?.tradeName || c.party?.legalName || '').toLowerCase();
      const gstin = (c.gstin || c.party?.gstin || '').toLowerCase();
      const phone = (c.phone || c.party?.phone || '').toLowerCase();
      return name.includes(q) || gstin.includes(q) || phone.includes(q);
    }).slice(0, 15);
  }, [customers, partySearchTerm]);

  // Filter vendors by search term
  const filteredVendors = useMemo(() => {
    if (!partySearchTerm.trim()) return vendors.slice(0, 12);
    const q = partySearchTerm.toLowerCase();
    return vendors.filter((v) => {
      const name = (v.tradeName || v.legalName || v.party?.tradeName || v.party?.legalName || '').toLowerCase();
      const gstin = (v.gstin || v.party?.gstin || '').toLowerCase();
      const phone = (v.phone || v.party?.phone || '').toLowerCase();
      return name.includes(q) || gstin.includes(q) || phone.includes(q);
    }).slice(0, 15);
  }, [vendors, partySearchTerm]);

  // Select customer handler
  const handleSelectCustomer = (cust: any) => {
    const name = cust.tradeName || cust.legalName || cust.party?.tradeName || cust.party?.legalName || 'B2B Customer';
    setSelectedPartyObj(cust);
    setPartyName(name);
    setPartySearchTerm(name);
    setPartyType('CUSTOMER');
    setIsDropdownOpen(false);
  };

  // Select vendor handler
  const handleSelectVendor = (vend: any) => {
    const name = vend.tradeName || vend.legalName || vend.party?.tradeName || vend.party?.legalName || 'Vendor';
    setSelectedPartyObj(vend);
    setPartyName(name);
    setPartySearchTerm(name);
    setPartyType('VENDOR');
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      setError('Please select a branch.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!partyName.trim()) {
      setError(type === 'CREDIT' ? 'Please specify the Received From (Payer) name.' : 'Please specify the Paid To (Payee) name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateBranchTransactionPayload = {
      branchId,
      entryDate,
      type,
      amount: numAmount,
      category: category.trim(),
      partyName: partyName.trim(),
      partyType,
      referenceNo: referenceNo.trim() || undefined,
      paymentMode,
      paymentStatus,
      description: description.trim() || undefined,
    };

    try {
      if (isEditing && transactionToEdit) {
        await branchLedgerApi.updateTransaction(transactionToEdit.id, payload);
      } else {
        await branchLedgerApi.createTransaction(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save transaction:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to record transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategories = type === 'CREDIT' ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;
  const quickParties = type === 'CREDIT' ? QUICK_CREDIT_PAYERS : QUICK_DEBIT_PAYEES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`p-2 rounded-xl border ${
                type === 'CREDIT'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {type === 'CREDIT' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isEditing ? 'Edit Transaction' : type === 'CREDIT' ? 'Record Credit (+ Inflow)' : 'Record Debit (- Outflow)'}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    type === 'CREDIT'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {type === 'CREDIT' ? 'Receipt / Inflow' : 'Payment / Outflow'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic book accounting ledger entry with B2B party auto-resolution.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Toggle Type Buttons */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleTypeChange('CREDIT')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'CREDIT'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-300" />
                <span>Credit (+ Inflow)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('DEBIT')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'DEBIT'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-300" />
                <span>Debit (- Outflow)</span>
              </button>
            </div>
          )}

          {/* Branch & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Select Branch <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Entry Date <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDatePreset(0)}
                    className="text-lime-400 hover:underline"
                  >
                    Today
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setDatePreset(1)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Yesterday
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          {/* Amount (₹) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Amount (₹) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          {/* Party Selection (Received From / Paid To) with Search B2B Customer & Custom Write */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            {/* Party Header & Input Mode Toggle */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                {type === 'CREDIT' ? (
                  <>
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Received From (Payer) <span className="text-rose-400">*</span></span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 text-rose-400" />
                    <span>Paid To (Payee) <span className="text-rose-400">*</span></span>
                  </>
                )}
              </label>

              {/* Mode Toggle Pills */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-700/80 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setPartyInputMode('SEARCH');
                    setIsDropdownOpen(true);
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                    partyInputMode === 'SEARCH'
                      ? 'bg-lime-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Search className="w-3 h-3" />
                  <span>{type === 'CREDIT' ? 'Search B2B Customer' : 'Search Vendor'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPartyInputMode('CUSTOM');
                    setIsDropdownOpen(false);
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                    partyInputMode === 'CUSTOM'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PenLine className="w-3 h-3" />
                  <span>Custom Write Name</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Search B2B Customer or Vendor */}
            {partyInputMode === 'SEARCH' && (
              <div className="space-y-2" ref={dropdownRef}>
                {/* If selected party exists, display card */}
                {selectedPartyObj ? (
                  <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        {type === 'CREDIT' ? <Users className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      </span>
                      <div className="truncate">
                        <div className="text-xs font-black text-white flex items-center gap-1.5 truncate">
                          <span>{partyName}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                            {type === 'CREDIT' ? 'B2B Customer' : 'Vendor'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 truncate font-mono">
                          {(selectedPartyObj.gstin || selectedPartyObj.party?.gstin) && (
                            <span>GSTIN: {selectedPartyObj.gstin || selectedPartyObj.party?.gstin}</span>
                          )}
                          {(selectedPartyObj.city || selectedPartyObj.party?.city) && (
                            <span>· {selectedPartyObj.city || selectedPartyObj.party?.city}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPartyObj(null);
                          setPartySearchTerm('');
                          setIsDropdownOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setPartyInputMode('CUSTOM')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:text-white bg-indigo-950/50 border border-indigo-500/30 rounded-lg transition-colors"
                      >
                        Edit Name
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Search Combobox Input */
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={partySearchTerm}
                      onChange={(e) => {
                        setPartySearchTerm(e.target.value);
                        setPartyName(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder={
                        type === 'CREDIT'
                          ? 'Search B2B customer by trade name, legal name, GSTIN...'
                          : 'Search vendor / supplier by name or GSTIN...'
                      }
                      className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
                    />
                    {isLoadingParties && (
                      <Loader2 className="w-3.5 h-3.5 text-lime-400 animate-spin absolute right-3 top-2.5" />
                    )}

                    {/* Dropdown Options List */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-800">
                        {type === 'CREDIT' ? (
                          filteredCustomers.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                              No B2B customer found matching "{partySearchTerm}".
                              <div className="mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPartyName(partySearchTerm);
                                    setPartyInputMode('CUSTOM');
                                    setIsDropdownOpen(false);
                                  }}
                                  className="text-lime-400 hover:underline font-bold text-xs"
                                >
                                  Use "{partySearchTerm}" as Custom Name
                                </button>
                              </div>
                            </div>
                          ) : (
                            filteredCustomers.map((cust) => {
                              const name = cust.tradeName || cust.legalName || cust.party?.tradeName || cust.party?.legalName || 'B2B Customer';
                              const gstin = cust.gstin || cust.party?.gstin;
                              const phone = cust.phone || cust.party?.phone;
                              const city = cust.city || cust.party?.city;

                              return (
                                <button
                                  key={cust.id}
                                  type="button"
                                  onClick={() => handleSelectCustomer(cust)}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between group transition-colors"
                                >
                                  <div>
                                    <div className="text-xs font-bold text-white group-hover:text-lime-400">
                                      {name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                      {gstin && <span className="font-mono">GSTIN: {gstin}</span>}
                                      {city && <span>📍 {city}</span>}
                                      {phone && <span>📞 {phone}</span>}
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-slate-500 group-hover:text-lime-400 font-bold shrink-0">
                                    Select
                                  </span>
                                </button>
                              );
                            })
                          )
                        ) : (
                          filteredVendors.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                              No vendor found matching "{partySearchTerm}".
                              <div className="mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPartyName(partySearchTerm);
                                    setPartyInputMode('CUSTOM');
                                    setIsDropdownOpen(false);
                                  }}
                                  className="text-amber-400 hover:underline font-bold text-xs"
                                >
                                  Use "{partySearchTerm}" as Custom Name
                                </button>
                              </div>
                            </div>
                          ) : (
                            filteredVendors.map((vend) => {
                              const name = vend.tradeName || vend.legalName || vend.party?.tradeName || vend.party?.legalName || 'Vendor';
                              const gstin = vend.gstin || vend.party?.gstin;

                              return (
                                <button
                                  key={vend.id}
                                  type="button"
                                  onClick={() => handleSelectVendor(vend)}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between group transition-colors"
                                >
                                  <div>
                                    <div className="text-xs font-bold text-white group-hover:text-amber-400">
                                      {name}
                                    </div>
                                    {gstin && (
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        GSTIN: {gstin}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 group-hover:text-amber-400 font-bold shrink-0">
                                    Select
                                  </span>
                                </button>
                              );
                            })
                          )
                        )}

                        <div className="p-2 bg-slate-950 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setPartyInputMode('CUSTOM');
                              setIsDropdownOpen(false);
                            }}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center justify-center gap-1 mx-auto"
                          >
                            <PenLine className="w-3 h-3" />
                            <span>Or Custom Write Name</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Custom Write Name */}
            {partyInputMode === 'CUSTOM' && (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    placeholder={
                      type === 'CREDIT'
                        ? 'Type custom payer name (e.g. Apex Infra, Cash Client, Head Office Transfer)'
                        : 'Type custom payee name (e.g. Transporter, Landlord, Labor Contractor)'
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Quick Suggestion Chips */}
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400">
                    Quick Suggestion Presets:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickParties.map((qp) => (
                      <button
                        key={qp}
                        type="button"
                        onClick={() => {
                          setPartyName(qp);
                          setPartyType('INTERNAL');
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                          partyName === qp
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {qp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-1 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setPartyInputMode('SEARCH');
                      setIsDropdownOpen(true);
                    }}
                    className="text-[11px] text-lime-400 hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    <span>Switch back to Search B2B Customer</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Transaction Category <span className="text-rose-400">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {activeCategories.slice(0, 5).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    category === cat
                      ? type === 'CREDIT'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500"
            >
              {activeCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode & Reference # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-lime-500"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Voucher / Bill / UTR Ref #</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. UTR-982144 / VCH-0042"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          {/* Particulars / Narration */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Particulars / Narration</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Advance payment received for Pune IT Park installation stage 1"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                type === 'CREDIT'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : type === 'CREDIT' ? 'Record Credit' : 'Record Debit'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
