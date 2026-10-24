import React, { useState } from 'react';
import {
  Star,
  RefreshCw,
  Archive,
  AlertOctagon,
  Trash2,
  Mail,
  MailOpen,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Search,
  X,
  Menu,
  Inbox,
  FileEdit,
  Send,
  Users,
} from 'lucide-react';
import type { MailThreadSummary, MailViewFolder } from '../../types/admin';
import { formatMailTimestamp } from '../../utils/mailFormatters';

interface MailMessageListProps {
  threads: MailThreadSummary[];
  loading: boolean;
  currentFolder: MailViewFolder;
  onSelectThread: (threadId: string) => void;
  selectedThreadId: string | null;
  onToggleStar: (item: MailThreadSummary) => void;
  onRefresh: () => void;
  onBulkAction: (action: 'markRead' | 'markUnread' | 'star' | 'unstar' | 'archive' | 'spam' | 'trash') => void;
  page: number;
  limit: number;
  total: number;
  onPageChange: (newPage: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMobileSidebar?: () => void;
  selectedItemIds: string[];
  onToggleSelectItem: (id: string) => void;
  onToggleSelectAll: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

export const MailMessageList: React.FC<MailMessageListProps> = ({
  threads,
  loading,
  currentFolder,
  onSelectThread,
  selectedThreadId,
  onToggleStar,
  onRefresh,
  onBulkAction,
  page,
  limit,
  total,
  onPageChange,
  searchQuery,
  onSearchChange,
  onOpenMobileSidebar,
  selectedItemIds,
  onToggleSelectItem,
  onToggleSelectAll,
  isAdmin = false,
  onOpenAdmin,
}) => {
  const [searchInput, setSearchInput] = useState(searchQuery);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(total, page * limit);

  const allSelected = threads.length > 0 && threads.every((t) => selectedItemIds.includes(t.mailboxItemId));
  const someSelected = selectedItemIds.length > 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    onSearchChange('');
  };

  // ─── Empty State Config ────────────────────────────────────────────────────
  const getEmptyState = () => {
    if (searchQuery) {
      return {
        icon: Search,
        title: 'No matching messages',
        desc: `No messages found matching "${searchQuery}". Check your spelling or try different keywords.`,
      };
    }
    switch (currentFolder) {
      case 'STARRED':
        return {
          icon: Star,
          title: 'No starred messages',
          desc: 'Star messages to keep track of important internal notes and conversations.',
        };
      case 'SENT':
        return {
          icon: Send,
          title: 'No sent messages',
          desc: 'Messages you send to internal colleagues will appear here.',
        };
      case 'DRAFTS':
        return {
          icon: FileEdit,
          title: 'No saved drafts',
          desc: 'Unsent drafts you create will be safely stored here.',
        };
      case 'ARCHIVE':
        return {
          icon: Archive,
          title: 'Archive is empty',
          desc: 'Clean up your inbox by archiving completed threads.',
        };
      case 'SPAM':
        return {
          icon: AlertOctagon,
          title: 'No spam detected',
          desc: 'Hooray! No messages have been marked as spam.',
        };
      case 'TRASH':
        return {
          icon: Trash2,
          title: 'Trash is empty',
          desc: 'Deleted messages are kept here before permanent removal.',
        };
      default:
        return {
          icon: Inbox,
          title: 'Your inbox is clean',
          desc: 'No messages in this folder. All caught up!',
        };
    }
  };

  const emptyState = getEmptyState();
  const EmptyIcon = emptyState.icon;

  return (
    <div className="flex flex-col h-full bg-[#030213] flex-1 min-w-0 overflow-hidden">
      {/* Top Search & Toolbar Header */}
      <div className="px-4 py-2.5 bg-[#0e0d24] border-b border-white/10 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {/* Mobile Drawer Hamburger */}
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 lg:hidden shrink-0"
            aria-label="Open folder navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Omnibox */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg relative min-w-0">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-white/40 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search mail by keyword, subject, or sender..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#B5F823]/60 focus:bg-white/10 transition-all font-sans"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2.5 text-white/40 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Action Toolbar & Pagination */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
          {someSelected ? (
            <div className="flex items-center space-x-1.5 animate-fadeIn">
              <span className="text-xs font-semibold text-[#B5F823] px-2 py-0.5 rounded-md bg-[#B5F823]/10 border border-[#B5F823]/20">
                {selectedItemIds.length} selected
              </span>
              <button
                onClick={() => onBulkAction('markRead')}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Mark as read"
                aria-label="Mark selected as read"
              >
                <MailOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => onBulkAction('markUnread')}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Mark as unread"
                aria-label="Mark selected as unread"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                onClick={() => onBulkAction('archive')}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Archive"
                aria-label="Archive selected"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={() => onBulkAction('trash')}
                className="p-1.5 rounded-lg text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Move to trash"
                aria-label="Move selected to trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {isAdmin && onOpenAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#B5F823]/10 hover:bg-[#B5F823]/20 text-[#B5F823] border border-[#B5F823]/30 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Create and assign @pacificproduct.in email addresses to employees"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Assign Employee Emails</span>
                </button>
              )}
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Refresh"
                aria-label="Refresh mail list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#B5F823]' : ''}`} />
              </button>
            </div>
          )}

          {/* Server-Side Pagination Controller */}
          <div className="flex items-center space-x-2 pl-2 border-l border-white/10 text-xs text-white/60">
            <span>
              {startItem}–{endItem} of {total}
            </span>
            <div className="flex items-center space-x-0.5">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Select-All Subheader */}
      <div className="px-4 py-1.5 bg-[#09081a] border-b border-white/5 flex items-center space-x-3 text-xs text-white/50 shrink-0">
        <label className="flex items-center space-x-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#B5F823] focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span>Select all</span>
        </label>
        {searchQuery && (
          <div className="flex items-center space-x-1.5 text-[#B5F823]">
            <span>Filter: &ldquo;{searchQuery}&rdquo;</span>
            <button onClick={clearSearch} className="hover:underline text-[11px]">
              (Clear)
            </button>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
        {loading && threads.length === 0 ? (
          /* Skeleton Loader */
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-3 rounded-xl bg-white/[0.02]">
                <div className="w-4 h-4 rounded bg-white/10" />
                <div className="w-4 h-4 rounded bg-white/10" />
                <div className="w-36 h-3 rounded bg-white/10" />
                <div className="flex-1 h-3 rounded bg-white/5" />
                <div className="w-16 h-3 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fadeIn">
            <div className="p-4 rounded-3xl bg-white/5 border border-white/10 mb-4 text-[#B5F823]">
              <EmptyIcon className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1.5">{emptyState.title}</h4>
            <p className="text-xs text-white/50 max-w-sm leading-relaxed">{emptyState.desc}</p>
          </div>
        ) : (
          /* Thread Rows */
          threads.map((item) => {
            const isSelected = selectedItemIds.includes(item.mailboxItemId);
            const isCurrent = selectedThreadId === item.id;
            const isUnread = !item.isRead;

            return (
              <div
                key={item.mailboxItemId}
                onClick={() => onSelectThread(item.id)}
                className={`group flex items-center px-4 py-3 sm:py-2.5 gap-3 cursor-pointer transition-all select-none ${
                  isCurrent
                    ? 'bg-[#B5F823]/10 border-l-4 border-l-[#B5F823]'
                    : isUnread
                    ? 'bg-white/[0.04] hover:bg-white/[0.07] border-l-4 border-l-[#7FB706]'
                    : 'bg-transparent hover:bg-white/[0.03] border-l-4 border-l-transparent text-white/70'
                }`}
                role="row"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelectThread(item.id);
                }}
              >
                {/* Row Checkbox */}
                <div
                  className="shrink-0 flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectItem(item.mailboxItemId);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#B5F823] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </div>

                {/* Star Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(item);
                  }}
                  className="shrink-0 p-1 rounded-md text-white/20 hover:text-amber-400 transition-colors focus:outline-none"
                  aria-label={item.isStarred ? 'Unstar message' : 'Star message'}
                >
                  <Star
                    className={`w-4 h-4 transition-all ${
                      item.isStarred ? 'fill-amber-400 text-amber-400' : 'stroke-current'
                    }`}
                  />
                </button>

                {/* Sender Column */}
                <div className="w-28 sm:w-44 shrink-0 min-w-0">
                  <span
                    className={`text-xs truncate block ${
                      isUnread ? 'font-bold text-white' : 'font-normal text-white/80'
                    }`}
                  >
                    {item.fromDisplayName || item.fromEmail}
                  </span>
                </div>

                {/* Subject & Snippet Column */}
                <div className="flex-1 min-w-0 flex items-center space-x-2">
                  <span
                    className={`text-xs truncate ${
                      isUnread ? 'font-bold text-white' : 'font-medium text-white/90'
                    }`}
                  >
                    {item.subject || '(No Subject)'}
                  </span>
                  {item.snippet && (
                    <span className="text-xs text-white/40 truncate hidden md:inline">
                      — {item.snippet}
                    </span>
                  )}
                </div>

                {/* Message count badge if multi-message conversation */}
                {item.messageCount > 1 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 shrink-0">
                    {item.messageCount}
                  </span>
                )}

                {/* Attachment paperclip indicator */}
                {item.hasAttachments && (
                  <span title="Has attachments" className="shrink-0 flex items-center">
                    <Paperclip className="w-3.5 h-3.5 text-white/40" />
                  </span>
                )}

                {/* Timestamp */}
                <div className="w-16 sm:w-20 text-right shrink-0">
                  <span
                    className={`text-[11px] font-mono ${
                      isUnread ? 'text-[#B5F823] font-semibold' : 'text-white/40'
                    }`}
                  >
                    {formatMailTimestamp(item.lastMessageAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
