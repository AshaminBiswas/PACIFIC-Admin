import React, { useState, KeyboardEvent, ClipboardEvent } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface MailRecipientInputProps {
  id: string;
  label: string;
  recipients: string[];
  onChange: (recipients: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const MailRecipientInput: React.FC<MailRecipientInputProps> = ({
  id,
  label,
  recipients,
  onChange,
  placeholder = 'Add recipient...',
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanEmail = (raw: string): string => {
    return raw.trim().replace(/^[,;\s]+|[,;\s]+$/g, '');
  };

  const addRecipient = (raw: string) => {
    const cleaned = cleanEmail(raw);
    if (!cleaned) return;

    // Basic email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Also accept "Name <email@domain>" format
    const angleMatch = cleaned.match(/<([^>]+)>/);
    const targetEmail = angleMatch ? angleMatch[1] : cleaned;

    if (!emailRegex.test(targetEmail)) {
      setErrorMsg(`Invalid email format: "${cleaned}"`);
      return;
    }

    // Clear any previous error; outsider recipients will simply be styled with distinct color
    setErrorMsg(null);

    if (!recipients.includes(cleaned)) {
      onChange([...recipients, cleaned]);
    }
    setInputValue('');
  };

  const removeRecipient = (indexToRemove: number) => {
    onChange(recipients.filter((_, i) => i !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') {
      if (inputValue.trim()) {
        e.preventDefault();
        addRecipient(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      removeRecipient(recipients.length - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const items = pasted.split(/[,;\n\s]+/).filter(Boolean);
    const updated = [...recipients];

    for (const item of items) {
      const cleaned = cleanEmail(item);
      if (cleaned && !updated.includes(cleaned)) {
        updated.push(cleaned);
      }
    }
    onChange(updated);
  };

  return (
    <div className="flex flex-col text-sm border-b border-white/10 py-1.5 focus-within:border-[#B5F823]/50 transition-colors">
      <div className="flex items-start flex-wrap gap-1.5 min-h-[36px] px-1">
        <label
          htmlFor={id}
          className="text-white/40 font-medium py-1 w-12 text-xs uppercase tracking-wider select-none shrink-0"
        >
          {label}:
        </label>

        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {recipients.map((email, idx) => {
            const isInternal =
              email.toLowerCase().endsWith('@pacificproduct.in') ||
              email.toLowerCase().endsWith('@pacific.internal');
            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                  isInternal
                    ? 'bg-[#B5F823]/10 text-[#B5F823] border border-[#B5F823]/20'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                <span className="truncate max-w-[200px]">{email}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(idx)}
                    className="p-0.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}

          {!disabled && (
            <input
              id={id}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onBlur={() => {
                if (inputValue.trim()) addRecipient(inputValue);
              }}
              placeholder={recipients.length === 0 ? placeholder : ''}
              className="bg-transparent border-none text-white text-xs placeholder:text-white/30 focus:outline-none flex-1 min-w-[120px] py-1"
            />
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-1 pl-14">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
