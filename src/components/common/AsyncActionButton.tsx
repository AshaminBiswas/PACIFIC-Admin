import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import type { AsyncActionState } from '../../hooks/useAsyncAction';

interface AsyncActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state?: AsyncActionState;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const AsyncActionButton: React.FC<AsyncActionButtonProps> = ({
  state = 'idle',
  loadingText,
  successText,
  errorText,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const isLoading = state === 'loading';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading && <Loader2 size={16} className="animate-spin" />}
      {isSuccess && <Check size={16} className="text-emerald-400" />}
      {isError && <AlertCircle size={16} className="text-rose-400" />}
      {!isLoading && !isSuccess && !isError && icon}

      <span>
        {isLoading && loadingText ? loadingText : isSuccess && successText ? successText : isError && errorText ? errorText : children}
      </span>
    </button>
  );
};
