import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Plus,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Edit2,
  ShieldCheck,
} from 'lucide-react';
import { hardwareInventoryApi } from '../../api/hardwareInventoryApi';
import type { HardwareBranch, CreateHardwareBranchInput } from '../../types/admin';

interface BranchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchesUpdated: () => void;
}

export default function BranchManagerModal({
  isOpen,
  onClose,
  onBranchesUpdated,
}: BranchManagerModalProps) {
  const [branches, setBranches] = useState<HardwareBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await hardwareInventoryApi.listBranches();
      if (res.data?.data) {
        setBranches(res.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      setError(null);
      setSuccessMsg(null);
      setShowAddForm(false);
    }
  }, [isOpen]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!code.trim()) {
      setError('Branch Code is required (e.g. MUMBAI, BLR).');
      return;
    }
    if (!name.trim()) {
      setError('Branch Name is required.');
      return;
    }
    if (!city.trim()) {
      setError('City is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateHardwareBranchInput = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        city: city.trim(),
        state: state.trim() || city.trim(),
        address: address.trim(),
        phone: phone.trim(),
        contactPerson: contactPerson.trim(),
      };

      await hardwareInventoryApi.createBranch(payload);
      setSuccessMsg(`Branch "${payload.code}" created successfully!`);
      // Reset form
      setCode('');
      setName('');
      setCity('');
      setState('');
      setAddress('');
      setPhone('');
      setContactPerson('');
      setShowAddForm(false);

      await loadBranches();
      onBranchesUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to create branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#121029] border border-[#7FB706]/30 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0d0b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#7FB706]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Multi-Branch Management
              </h2>
              <p className="text-xs text-gray-400">
                Configure warehouse locations for hardware stock and regional operations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-[#7FB706]/10 border border-[#7FB706]/30 rounded-xl text-[#B5F823] text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Active Branches ({branches.length})
            </span>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-semibold rounded-lg shadow-md shadow-[#7FB706]/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Branch
              </button>
            )}
          </div>

          {/* Add Branch Inline Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateBranch}
              className="p-4 bg-[#0d0b21] border border-[#7FB706]/30 rounded-xl space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-sm font-semibold text-[#B5F823] flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Branch Registration
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Branch Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MUMBAI, BLR, HYD"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs font-mono focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">Unique short uppercase identifier</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Branch Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai Regional Warehouse"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Patil"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Phone / Mobile</label>
                  <input
                    type="text"
                    placeholder="+91 98..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-300 mb-1">Warehouse Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Unit 12, Logistics Park, Bhiwandi, Mumbai"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-[#030213] border border-white/15 focus:border-[#7FB706] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-[#7FB706]/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Register Branch'}
                </button>
              </div>
            </form>
          )}

          {/* Branches List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading branches...</div>
            ) : branches.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm border border-dashed border-white/10 rounded-xl">
                No branches configured.
              </div>
            ) : (
              branches.map((b) => (
                <div
                  key={b.id}
                  className="p-4 bg-[#0d0b21] border border-white/10 hover:border-[#7FB706]/40 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#7FB706]/20 border border-[#7FB706]/40 text-[#B5F823] font-mono text-xs font-bold rounded-md">
                        {b.code}
                      </span>
                      <h4 className="text-sm font-semibold text-white">{b.name}</h4>
                      {b.isDefault && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-medium rounded-full">
                          Default Main
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#7FB706]" />
                        {b.city}, {b.state}
                      </span>
                      {b.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {b.phone}
                        </span>
                      )}
                      {b.contactPerson && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {b.contactPerson}
                        </span>
                      )}
                    </div>

                    {b.address && <p className="text-[11px] text-gray-500 truncate">{b.address}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                      <CheckCircle2 className="w-3 h-3" />
                      Active Hub
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0d0b21] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
