import React from 'react';
import { Building2, MapPin, Landmark, ShieldCheck, CheckCircle2, ChevronDown } from 'lucide-react';
import type { CompanyProfile, CompanyAddress } from '../../types/admin';

interface BranchSelectorProps {
  companies: CompanyProfile[];
  selectedCompanyId: string;
  onSelectCompany: (companyId: string, company: CompanyProfile) => void;
  selectedAddressId?: string;
  onSelectAddress?: (addressId: string, address: CompanyAddress) => void;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
  compact?: boolean;
}

export default function BranchSelector({
  companies,
  selectedCompanyId,
  onSelectCompany,
  selectedAddressId,
  onSelectAddress,
  label = 'Issuing Branch & Operating Entity',
  sublabel = 'Determines seller GST jurisdiction, billing address, bank remittance coordinates, and dispatch facility.',
  disabled = false,
  compact = false,
}: BranchSelectorProps) {
  const activeCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const compId = e.target.value;
    const found = companies.find((c) => c.id === compId);
    if (found) {
      onSelectCompany(compId, found);
      if (onSelectAddress && found.addresses && found.addresses.length > 0) {
        const defaultAddr = found.addresses.find((a) => a.isDefault) || found.addresses[0];
        onSelectAddress(defaultAddr.id, defaultAddr);
      }
    }
  };

  const primaryAddress =
    activeCompany?.addresses?.find((a) => a.id === selectedAddressId) ||
    activeCompany?.addresses?.find((a) => a.isDefault) ||
    activeCompany?.addresses?.[0];

  const primaryBank =
    activeCompany?.bankAccounts?.find((b) => b.isDefault) ||
    activeCompany?.bankAccounts?.[0];

  if (!companies || companies.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#121226] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl transition-all space-y-4">
      {/* ── Section Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30 flex items-center justify-center min-h-[44px] min-w-[44px]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              {label}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Dynamic
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>
          </div>
        </div>

        {/* Quick Dropdown Selector */}
        <div className="relative min-w-[240px]">
          <select
            value={activeCompany?.id || ''}
            onChange={handleCompanyChange}
            disabled={disabled}
            className="w-full appearance-none bg-[#0a0a1a] hover:bg-[#161630] border border-white/15 focus:border-[#7FB706] rounded-xl px-3.5 py-2.5 pr-9 text-xs sm:text-sm text-white font-semibold focus:outline-none transition min-h-[44px] cursor-pointer"
          >
            {companies.map((comp) => (
              <option key={comp.id} value={comp.id} className="bg-[#121226] text-white">
                {comp.companyName || comp.legalName} ({comp.entityCode || 'BRANCH'}) - {comp.state || comp.country || 'HQ'}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* ── Branch Fast-Select Quick Buttons ─────────────────────── */}
      {companies.length > 1 && !compact && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
            Quick Switch:
          </span>
          {companies.map((comp) => {
            const isSelected = comp.id === activeCompany?.id;
            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => {
                  onSelectCompany(comp.id, comp);
                  if (onSelectAddress && comp.addresses && comp.addresses.length > 0) {
                    const defaultAddr = comp.addresses.find((a) => a.isDefault) || comp.addresses[0];
                    onSelectAddress(defaultAddr.id, defaultAddr);
                  }
                }}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition min-h-[44px] sm:min-h-[36px] cursor-pointer ${
                  isSelected
                    ? 'bg-[#7FB706] text-black shadow-lg shadow-[#7FB706]/20 font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{comp.companyName || comp.legalName}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                    isSelected ? 'bg-black/25 text-black' : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {comp.entityCode || comp.stateCode || 'IN'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active Branch Coordinates Summary Card ───────────────── */}
      {activeCompany && (
        <div className="bg-[#0a0a1a] border border-white/5 rounded-xl p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          {/* Statutory Identity */}
          <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-white/5 pb-3 md:pb-0 md:pr-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Legal Entity</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30">
                Code: {activeCompany.entityCode || 'PRC'}
              </span>
            </div>
            <p className="font-bold text-white text-sm leading-tight">
              {activeCompany.legalName || activeCompany.companyName}
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] text-gray-300 pt-1">
              {activeCompany.gstin && (
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  GST: <strong className="text-white">{activeCompany.gstin}</strong>
                </span>
              )}
              {activeCompany.pan && (
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  PAN: <strong className="text-white">{activeCompany.pan}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Operating State & Address */}
          <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-white/5 pb-3 md:pb-0 md:pr-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#7FB706]" />
                Operating Location
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {activeCompany.state || 'Delhi'} ({activeCompany.stateCode || '07'})
              </span>
            </div>
            <p className="text-gray-300 text-[11px] line-clamp-2">
              {primaryAddress
                ? [primaryAddress.addressLine1, primaryAddress.city, primaryAddress.state, primaryAddress.postalCode]
                    .filter(Boolean)
                    .join(', ')
                : activeCompany.phone || 'H-3, JR Complex, Mandoli, New Delhi - 110093'}
            </p>
            {activeCompany.addresses && activeCompany.addresses.length > 1 && onSelectAddress && (
              <div className="pt-1">
                <select
                  value={primaryAddress?.id || ''}
                  onChange={(e) => {
                    const addr = activeCompany.addresses?.find((a) => a.id === e.target.value);
                    if (addr) onSelectAddress(addr.id, addr);
                  }}
                  className="w-full bg-[#161630] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-gray-200"
                >
                  {activeCompany.addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.type || 'Branch'}: {a.city} ({a.addressLine1?.slice(0, 30)}...)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Remittance & Bank Settlement Coordinates */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Landmark className="w-3 h-3 text-sky-400" />
                Settlement Bank
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            </div>
            {primaryBank ? (
              <div className="text-[11px] text-gray-300 space-y-0.5">
                <p className="font-bold text-white">{primaryBank.bankName}</p>
                <p className="font-mono text-gray-400">
                  A/C: <span className="text-white">{primaryBank.accountNumber}</span>
                  {primaryBank.ifscCode && (
                    <span className="ml-2">
                      IFSC: <span className="text-white">{primaryBank.ifscCode}</span>
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">Standard Corporate Account</p>
            )}
            <p className="text-[10px] text-gray-500 pt-0.5">
              GST jurisdiction is automatically resolved to State Code {activeCompany.stateCode || '07'}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
