import React from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface PWAInstallBannerProps {
  isInstalled: boolean;
  isDismissed: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  isInstalled,
  isDismissed,
  onInstall,
  onDismiss,
}) => {
  if (isInstalled || isDismissed) return null;

  return (
    <div className="lg:hidden fixed bottom-20 left-3 right-3 z-40 animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#0e0c28]/95 backdrop-blur-xl border border-[#7FB706]/30 rounded-2xl p-3 shadow-2xl shadow-black/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] p-0.5 flex items-center justify-center shrink-0 shadow-md shadow-[#7FB706]/20">
            <img
              src="/icon-192.png"
              alt="Logo"
              className="w-full h-full object-contain rounded-[10px] bg-[#030213]"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7FB706] bg-[#7FB706]/15 px-1.5 py-0.2 rounded">
                App Available
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate">Install Pacific Admin</p>
            <p className="text-[10px] text-gray-400 truncate">Fullscreen native app experience</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onInstall}
            className="px-3.5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] active:scale-95 text-[#030213] text-xs font-bold transition-all shadow-md shadow-[#7FB706]/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={onDismiss}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Dismiss prompt"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
