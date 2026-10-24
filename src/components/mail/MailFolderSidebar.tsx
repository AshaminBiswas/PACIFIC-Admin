import React, { useState } from 'react';
import {
  Inbox,
  Star,
  Send,
  FileEdit,
  Archive,
  AlertOctagon,
  Trash2,
  Plus,
  Copy,
  Check,
  X,
  ShieldCheck,
  Shield,
} from 'lucide-react';
import type { MailViewFolder, MailFolderCounts, MailAddress } from '../../types/admin';

interface MailFolderSidebarProps {
  currentFolder: MailViewFolder;
  onSelectFolder: (folder: MailViewFolder) => void;
  onOpenCompose: () => void;
  counts: MailFolderCounts | null;
  myAddress: MailAddress | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

interface FolderNavConfig {
  id: MailViewFolder;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getCount?: (counts: MailFolderCounts | null) => { total: number; unread: number } | null;
}

const FOLDERS: FolderNavConfig[] = [
  {
    id: 'INBOX',
    label: 'Inbox',
    icon: Inbox,
    getCount: (c) => c?.inbox || null,
  },
  {
    id: 'STARRED',
    label: 'Starred',
    icon: Star,
    getCount: (c) => c?.starred || null,
  },
  {
    id: 'SENT',
    label: 'Sent',
    icon: Send,
    getCount: (c) => c?.sent || null,
  },
  {
    id: 'DRAFTS',
    label: 'Drafts',
    icon: FileEdit,
    getCount: (c) => c?.drafts || null,
  },
  {
    id: 'ARCHIVE',
    label: 'Archive',
    icon: Archive,
    getCount: (c) => c?.archive || null,
  },
  {
    id: 'SPAM',
    label: 'Spam',
    icon: AlertOctagon,
    getCount: (c) => c?.spam || null,
  },
  {
    id: 'TRASH',
    label: 'Trash',
    icon: Trash2,
    getCount: (c) => c?.trash || null,
  },
];

export const MailFolderSidebar: React.FC<MailFolderSidebarProps> = ({
  currentFolder,
  onSelectFolder,
  onOpenCompose,
  counts,
  myAddress,
  isOpenMobile = false,
  onCloseMobile,
  isAdmin = false,
  onOpenAdmin,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    if (myAddress?.fullAddress) {
      navigator.clipboard.writeText(myAddress.fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-[#0a091d] border-r border-white/10 select-none">
      {/* Mobile Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 lg:hidden">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#B5F823]" />
          <span className="text-sm font-semibold tracking-wider uppercase text-white">
            Pacific Mail
          </span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
          aria-label="Close folder sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Compose Trigger Button (Gmail-style Pill) */}
      <div className="p-4 shrink-0">
        <button
          onClick={() => {
            onOpenCompose();
            onCloseMobile?.();
          }}
          className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#B5F823] to-[#7FB706] text-black font-bold text-sm tracking-wide shadow-lg shadow-[#B5F823]/25 hover:shadow-xl hover:shadow-[#B5F823]/35 hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-[#B5F823]"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Compose</span>
        </button>
      </div>

      {/* Folder Navigation Items */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar" aria-label="Mail Folders">
        {FOLDERS.map((item) => {
          const Icon = item.icon;
          const isActive = currentFolder === item.id;
          const countData = item.getCount ? item.getCount(counts) : null;
          const unreadCount = countData?.unread || 0;
          const totalCount = countData?.total || 0;

          // For Drafts, Starred, Trash show total; for Inbox show unread
          const displayBadge =
            item.id === 'INBOX' ? unreadCount : item.id === 'DRAFTS' || item.id === 'STARRED' ? totalCount : 0;

          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectFolder(item.id);
                onCloseMobile?.();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-[#B5F823]/15 text-[#B5F823] border border-[#B5F823]/30 shadow-sm shadow-[#B5F823]/10 font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-[#B5F823]'
                      : item.id === 'STARRED'
                      ? 'text-amber-400'
                      : 'text-white/50 group-hover:text-white'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {displayBadge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#B5F823] text-black'
                      : 'bg-white/10 text-white/80 group-hover:bg-white/20'
                  }`}
                >
                  {displayBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin Operations Trigger for Super Admin & Admin */}
      {isAdmin && onOpenAdmin && (
        <div className="px-3 pt-2 pb-1 border-t border-white/5 bg-[#0b0a1f] shrink-0">
          <button
            type="button"
            onClick={onOpenAdmin}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-[#B5F823]/10 text-white/70 hover:text-[#B5F823] border border-white/10 hover:border-[#B5F823]/30 transition-all text-xs font-semibold"
          >
            <div className="flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 text-[#B5F823]" />
              <span>Admin Controls</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
              Operations
            </span>
          </button>
        </div>
      )}

      {/* User Verified Internal Identity Badge */}
      <div className="p-3 border-t border-white/10 bg-[#0e0d26] shrink-0">
        <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-[#B5F823] shrink-0 animate-pulse" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#B5F823]" />
                Internal Address
              </span>
              <span className="text-xs text-white/90 font-mono truncate">
                {myAddress?.fullAddress || 'Loading...'}
              </span>
            </div>
          </div>

          {myAddress?.fullAddress && (
            <button
              onClick={handleCopyEmail}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Copy address"
              aria-label="Copy verified email"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#B5F823]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / Tablet Sidebar Column */}
      <aside className="hidden lg:flex flex-col w-64 h-full shrink-0">{content}</aside>

      {/* Mobile Drawer (Overlay) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 shadow-2xl animate-slideRight">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
