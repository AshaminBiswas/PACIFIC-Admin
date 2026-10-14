import React, { useId } from 'react';

export interface HsnSelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  showQuickPills?: boolean;
}

export const HsnSelectInput: React.FC<HsnSelectInputProps> = ({
  value,
  onChange,
  options = ['48239019', '9403', '8302', '44119229', '7610'],
  placeholder = 'HSN / SAC (e.g. 9403)',
  className = '',
  inputClassName = '',
  showQuickPills = true,
}) => {
  const datalistId = useId();

  const defaultInputCls =
    'w-full bg-[#161536] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-[#7FB706] focus:outline-none transition placeholder:text-gray-500';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="relative">
        <input
          type="text"
          list={datalistId}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClassName || defaultInputCls}
        />
        {options && options.length > 0 && (
          <datalist id={datalistId}>
            {options.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        )}
      </div>

      {showQuickPills && options && options.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-gray-500">Quick:</span>
          {options.map((opt) => {
            const isSelected = String(value || '').trim() === opt.trim();
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition ${
                  isSelected
                    ? 'bg-[#7FB706]/20 text-[#7FB706] border border-[#7FB706]/40 font-bold'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HsnSelectInput;
