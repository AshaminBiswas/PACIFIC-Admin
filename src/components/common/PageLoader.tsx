import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ message = 'Loading Pacific Console…' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-3">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#7FB706] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-[#7FB706]/30 animate-pulse" />
        </div>
      </div>
      <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">{message}</p>
    </div>
  );
};
