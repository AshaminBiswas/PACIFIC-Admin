import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Phone, Mail, User, DollarSign, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { BranchItem, CreateBranchPayload } from '../../types/admin';
import { branchLedgerApi } from '../../api/branchLedgerApi';

interface AddEditBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branchToEdit?: BranchItem | null;
}

export const AddEditBranchModal: React.FC<AddEditBranchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branchToEdit,
}) => {
  const isEditing = !!branchToEdit;

  const [formData, setFormData] = useState<CreateBranchPayload>({
    name: '',
    code: '',
    city: '',
    state: '',
    address: '',
    phone: '',
    email: '',
    contactPerson: '',
    openingBalance: 0,
    isDefault: false,
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branchToEdit) {
      setFormData({
        name: branchToEdit.name || '',
        code: branchToEdit.code || '',
        city: branchToEdit.city || '',
        state: branchToEdit.state || '',
        address: branchToEdit.address || '',
        phone: branchToEdit.phone || '',
        email: branchToEdit.email || '',
        contactPerson: branchToEdit.contactPerson || '',
        openingBalance: Number(branchToEdit.openingBalance || 0),
        isDefault: !!branchToEdit.isDefault,
        isActive: branchToEdit.isActive !== false,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        city: '',
        state: '',
        address: '',
        phone: '',
        email: '',
        contactPerson: '',
        openingBalance: 0,
        isDefault: false,
        isActive: true,
      });
    }
    setError(null);
  }, [branchToEdit, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    const updated: any = { name: val };
    if (!isEditing && (!formData.code || formData.code.trim().length <= 4)) {
      updated.code = val.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    setFormData((prev) => ({ ...prev, ...updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Branch name is mandatory.');
      return;
    }
    if (!formData.city.trim() || !formData.state.trim()) {
      setError('City and State are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && branchToEdit) {
        await branchLedgerApi.updateBranch(branchToEdit.id, formData);
      } else {
        await branchLedgerApi.createBranch(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save branch:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to save branch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isEditing ? 'Edit Regional Branch' : 'Add New Regional Branch'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-500/15 text-lime-400 border border-lime-500/30">
                  Dynamic
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure branch location, contact manager, and financial opening book balance.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Branch Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Mumbai Western Regional Hub"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Branch Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. MUM"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-mono text-lime-400 font-bold placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                City <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                placeholder="e.g. Mumbai"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                State <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))}
                placeholder="e.g. Maharashtra"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Branch Address</label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
              placeholder="e.g. Plot 15, MIDC Industrial Area, Andheri East"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Contact Person / Manager</label>
              <input
                type="text"
                value={formData.contactPerson || ''}
                onChange={(e) => setFormData((p) => ({ ...p, contactPerson: e.target.value }))}
                placeholder="e.g. Rajesh Sharma"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Phone</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+91 98200 00000"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="mumbai@pacificcubicles.com"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          {/* Initial Opening Balance */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>Opening Financial Balance (₹)</span>
              <span className="text-[10px] text-slate-400 font-normal">Starting cash / bank pool</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.openingBalance ?? 0}
                onChange={(e) => setFormData((p) => ({ ...p, openingBalance: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="pt-2 flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                className="rounded border-slate-700 text-lime-500 focus:ring-lime-500 bg-slate-800"
              />
              <span>Branch is Active</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData((p) => ({ ...p, isDefault: e.target.checked }))}
                className="rounded border-slate-700 text-lime-500 focus:ring-lime-500 bg-slate-800"
              />
              <span>Set as Central HQ Default</span>
            </label>
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-lime-500 hover:bg-lime-400 text-slate-950 shadow-md shadow-lime-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Create Branch'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
