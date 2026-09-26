import React from 'react';
import {
  X,
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  Zap,
  Monitor,
  MoreVertical,
  Laptop,
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  canPromptDirectly: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  isIOS,
  isAndroid,
  isWindows,
  canPromptDirectly,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0c0a22] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#7FB706]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with App Logo */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] p-1 flex items-center justify-center shadow-lg shadow-[#7FB706]/20 shrink-0">
            <img
              src="/icon-192.png"
              alt="Pacific Logo"
              className="w-full h-full object-contain rounded-xl bg-[#030213]"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#7FB706] bg-[#7FB706]/10 px-2 py-0.5 rounded-full border border-[#7FB706]/20">
                PWA Mobile & Desktop App
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">Pacific Admin Console</h2>
            <p className="text-xs text-gray-400">Enterprise ERP & Model Management</p>
          </div>
        </div>

        {/* App Benefits */}
        <div className="space-y-2 mb-5 bg-white/[0.03] border border-white/5 rounded-xl p-3.5">
          <div className="flex items-center gap-2.5 text-xs text-gray-300">
            <CheckCircle2 className="w-4 h-4 text-[#7FB706] shrink-0" />
            <span>Installs app icon on your Windows screen & Mobile home screen</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-gray-300">
            <Zap className="w-4 h-4 text-[#7FB706] shrink-0" />
            <span>Launches in its own standalone window without browser address bars</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-gray-300">
            <Sparkles className="w-4 h-4 text-[#7FB706] shrink-0" />
            <span>Fast instant access, offline caching & full ERP functionality</span>
          </div>
        </div>

        {/* Platform Specific Action or Direct Prompt */}
        {canPromptDirectly ? (
          <div className="space-y-3">
            <button
              onClick={onInstall}
              className="w-full py-3.5 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] active:scale-[0.98] text-[#030213] font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#7FB706]/30 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install Pacific Admin Now</span>
            </button>
            <p className="text-[11px] text-center text-gray-400">
              Clicking will prompt your system to install the app icon.
            </p>
          </div>
        ) : isIOS ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>How to Install on iPhone / iPad (Safari):</span>
            </p>
            <div className="bg-[#131130] border border-white/10 rounded-xl p-4 space-y-3 text-xs text-gray-300">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="flex-1">
                  <span>Tap the </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-white bg-white/10 px-1.5 py-0.5 rounded">
                    <Share className="w-3.5 h-3.5 text-sky-400" /> Share
                  </span>
                  <span> button at the bottom of your Safari screen.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="flex-1">
                  <span>Scroll down and tap </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-white bg-white/10 px-1.5 py-0.5 rounded">
                    <PlusSquare className="w-3.5 h-3.5 text-[#7FB706]" /> Add to Home Screen
                  </span>
                  <span>.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="flex-1">
                  <span>Tap </span>
                  <span className="font-semibold text-white">Add</span>
                  <span> in the top-right corner to create the app icon.</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all cursor-pointer"
            >
              Got It
            </button>
          </div>
        ) : isAndroid ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>How to Install on Android (Chrome / Edge):</span>
            </p>
            <div className="bg-[#131130] border border-white/10 rounded-xl p-4 space-y-3 text-xs text-gray-300">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="flex-1">
                  <span>Tap the </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-white bg-white/10 px-1.5 py-0.5 rounded">
                    <MoreVertical className="w-3.5 h-3.5 text-gray-300" /> Menu
                  </span>
                  <span> (3 dots in the top-right corner of Chrome).</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="flex-1">
                  <span>Select </span>
                  <span className="font-semibold text-[#7FB706]">"Install app"</span>
                  <span> or </span>
                  <span className="font-semibold text-[#7FB706]">"Add to Home screen"</span>
                  <span>.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="flex-1">
                  <span>Tap </span>
                  <span className="font-semibold text-white">"Install"</span>
                  <span>. The Pacific icon will appear on your phone screen!</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold text-sm transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          /* Windows / Desktop Guide */
          <div className="space-y-3">
            <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Monitor className="w-4 h-4" />
              <span>How to Install on Windows Screen (Chrome / Edge):</span>
            </p>
            <div className="bg-[#131130] border border-white/10 rounded-xl p-4 space-y-3 text-xs text-gray-300">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="flex-1">
                  <span>Look at the </span>
                  <span className="font-semibold text-white">right side of your browser's address bar</span>
                  <span> (at the top).</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="flex-1">
                  <span>Click the </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#7FB706] bg-[#7FB706]/10 px-1.5 py-0.5 rounded border border-[#7FB706]/20">
                    <Download className="w-3 h-3" /> Install
                  </span>
                  <span> or computer icon (💻⬇️) in the address bar.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="flex-1">
                  <span>Alternatively, click the </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-white bg-white/10 px-1.5 py-0.5 rounded">
                    <MoreVertical className="w-3 h-3" /> Menu (3 dots)
                  </span>
                  <span> &rarr; </span>
                  <span className="font-semibold text-[#7FB706]">"Install Pacific Admin..."</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#7FB706]/20 text-[#7FB706] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  &check;
                </span>
                <div className="flex-1 text-[#7FB706] font-medium">
                  This creates the Pacific Admin app icon on your Windows Desktop and Start Menu!
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] font-bold text-sm transition-all cursor-pointer"
            >
              Understood
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
