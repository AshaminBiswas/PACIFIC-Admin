import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Building2, Check, Phone, Mail, FileText } from 'lucide-react';
import type { BusinessParty } from '../../types/admin';

interface CustomerSearchSelectProps {
  customers: BusinessParty[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export const CustomerSearchSelect: React.FC<CustomerSearchSelectProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  error,
  label = 'Customer Party *',
  placeholder = 'Search by name, email, GSTIN, or phone...',
  required = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Keep display input in sync with selected customer if not searching
  useEffect(() => {
    if (selectedCustomer && !isOpen) {
      setSearchQuery(
        `${selectedCustomer.legalName || selectedCustomer.tradeName || 'Client'}${
          selectedCustomer.gstin ? ` (${selectedCustomer.gstin})` : ''
        }`
      );
    } else if (!selectedCustomer && !isOpen) {
      setSearchQuery('');
    }
  }, [selectedCustomer, isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedCustomer) {
          setSearchQuery(
            `${selectedCustomer.legalName || selectedCustomer.tradeName || 'Client'}${
              selectedCustomer.gstin ? ` (${selectedCustomer.gstin})` : ''
            }`
          );
        } else {
          setSearchQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedCustomer]);

  // Multi-attribute search
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || (selectedCustomer && searchQuery === `${selectedCustomer.legalName || selectedCustomer.tradeName || 'Client'}${selectedCustomer.gstin ? ` (${selectedCustomer.gstin})` : ''}`)) {
      return customers;
    }

    return customers.filter((c) => {
      const legalName = (c.legalName || '').toLowerCase();
      const tradeName = (c.tradeName || '').toLowerCase();
      const email = (c.email || (c as any).contactEmail || '').toLowerCase();
      const gstin = (c.gstin || '').toLowerCase();
      const pan = (c.pan || '').toLowerCase();
      const phone = (c.phone || (c as any).contactPhone || '').toLowerCase();
      const contactName = (c.contactName || '').toLowerCase();

      return (
        legalName.includes(q) ||
        tradeName.includes(q) ||
        email.includes(q) ||
        gstin.includes(q) ||
        pan.includes(q) ||
        phone.includes(q) ||
        contactName.includes(q)
      );
    });
  }, [customers, searchQuery, selectedCustomer]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer('');
    setSearchQuery('');
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSelect = (customer: BusinessParty) => {
    onSelectCustomer(customer.id);
    setSearchQuery(
      `${customer.legalName || customer.tradeName || 'Client'}${
        customer.gstin ? ` (${customer.gstin})` : ''
      }`
    );
    setIsOpen(false);
  };

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-gray-400 font-medium text-xs">
          {label} {required && <span className="text-[#7FB706]">*</span>}
        </label>
        {selectedCustomer && (
          <span className="text-[10px] text-[#7FB706] font-mono flex items-center gap-1 font-semibold">
            <Check className="w-3 h-3" /> Party Mapped
          </span>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search className="w-3.5 h-3.5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (selectedCustomer && searchQuery.includes('(')) {
              // Select input content for quick re-typing
              inputRef.current?.select();
            }
          }}
          placeholder={placeholder}
          className={`w-full bg-[#0a0a1a] border ${
            error
              ? 'border-rose-500/80 focus:border-rose-500'
              : isOpen
              ? 'border-[#7FB706] ring-1 ring-[#7FB706]/40'
              : 'border-white/10 hover:border-white/20'
          } rounded-xl pl-9 pr-16 py-2 text-white text-xs placeholder:text-gray-500 focus:outline-none transition-all`}
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Clear customer search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#7FB706]' : ''}`} />
          </button>
        </div>
      </div>

      {error && <p className="text-[11px] text-rose-400 mt-0.5">{error}</p>}

      {/* Dropdown Results Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl bg-[#0d0c22] border border-[#7FB706]/40 shadow-2xl p-1.5 space-y-1 backdrop-blur-xl">
          <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-gray-400 border-b border-white/5 flex items-center justify-between">
            <span>Matching Customer Master</span>
            <span>{filteredCustomers.length} Found</span>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="p-3 text-center text-xs text-gray-400">
              No customers found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const isSelected = c.id === selectedCustomerId;
              const phone = c.phone || (c as any).contactPhone;
              const email = c.email || (c as any).contactEmail;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left p-2 rounded-lg transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-[#7FB706]/15 border border-[#7FB706]/40 text-white'
                      : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#7FB706]" />
                      {c.legalName || c.tradeName || 'Unnamed Customer'}
                      {c.tradeName && c.legalName && c.tradeName !== c.legalName && (
                        <span className="text-[10px] text-gray-400 font-normal">({c.tradeName})</span>
                      )}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#7FB706] shrink-0" />}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {c.gstin && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" /> {c.gstin}
                      </span>
                    )}
                    {phone && (
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300 font-mono flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-gray-400" /> {phone}
                      </span>
                    )}
                    {email && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 flex items-center gap-1 truncate max-w-[200px]">
                        <Mail className="w-2.5 h-2.5 text-blue-400" /> {email}
                      </span>
                    )}
                    {c.pan && !c.gstin && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">
                        PAN: {c.pan}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearchSelect;
