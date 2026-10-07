import React, { useState, useEffect } from 'react';

export interface HsnSelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
}

export const HsnSelectInput: React.FC<HsnSelectInputProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Enter custom HSN / SAC',
  className = '',
  selectClassName = '',
  inputClassName = '',
}) => {
  const isPredefined = options.includes(value);
  const [isCustomMode, setIsCustomMode] = useState(!isPredefined && Boolean(value));

  useEffect(() => {
    if (value && !options.includes(value)) {
      setIsCustomMode(true);
    } else if (options.includes(value)) {
      setIsCustomMode(false);
    }
  }, [value, options]);

  const defaultSelectCls =
    'w-full bg-[#161536] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-[#7FB706] focus:outline-none transition';
  const defaultInputCls =
    'w-full bg-[#161536] border border-[#7FB706]/50 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-[#7FB706] focus:outline-none transition mt-1.5 placeholder:text-gray-500';

  return (
    <div className={`space-y-1 ${className}`}>
      <select
        value={isCustomMode ? 'CUSTOM' : (value || '')}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'CUSTOM') {
            setIsCustomMode(true);
            if (options.includes(value)) {
              onChange('');
            }
          } else {
            setIsCustomMode(false);
            onChange(val);
          }
        }}
        className={selectClassName || defaultSelectCls}
      >
        {!value && !isCustomMode && (
          <option value="">-- Select HSN --</option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value="CUSTOM">Custom HSN...</option>
      </select>

      {isCustomMode && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClassName || defaultInputCls}
          autoFocus
        />
      )}
    </div>
  );
};

export default HsnSelectInput;
