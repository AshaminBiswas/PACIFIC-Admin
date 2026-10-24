import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MailFolderSidebar } from '../../components/mail/MailFolderSidebar';
import { MailMessageList } from '../../components/mail/MailMessageList';
import { MailThreadDetail } from '../../components/mail/MailThreadDetail';
import { MailComposeModal } from '../../components/mail/MailComposeModal';
import { MailConfirmDialog } from '../../components/mail/MailConfirmDialog';
import { MailAdminModal } from '../../components/mail/MailAdminModal';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { mailApi } from '../../api/mailApi';
import type {
  MailViewFolder,
  MailThreadSummary,
  MailMessageDetail,
  MailFolderCounts,
  MailAddress,
} from '../../types/admin';

export default function PacificMailPage() {
  const { folder: urlFolder } = useParams<{ folder?: string }>();
  const navigate = useNavigate();

  // ─── Folder Navigation State ────────────────────────────────────────────────
  const currentFolder: MailViewFolder = useMemo(() => {
    if (!urlFolder) return 'INBOX';
    const upper = urlFolder.toUpperCase();
    const valid: MailViewFolder[] = ['INBOX', 'STARRED', 'SENT', 'DRAFTS', 'ARCHIVE', 'SPAM', 'TRASH'];
    return valid.includes(upper as MailViewFolder) ? (upper as MailViewFolder) : 'INBOX';
  }, [urlFolder]);

  const handleSelectFolder = (folder: MailViewFolder) => {
    setSelectedThreadId(null);
    setSelectedThread(null);
    setSearchQuery('');
    setPage(1);
    setSelectedIds([]);
    navigate(`/admin/dashboard/mail/${folder.toLowerCase()}`);
  };

  // ─── Data & Pagination State ────────────────────────────────────────────────
  const [threads, setThreads] = useState<MailThreadSummary[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<MailFolderCounts | null>(null);
  const [myAddress, setMyAddress] = useState<MailAddress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ─── Thread Detail State ────────────────────────────────────────────────────
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<{
    subject: string;
    messages: MailMessageDetail[];
  } | null>(null);
  const [loadingThreadDetail, setLoadingThreadDetail] = useState(false);

  // ─── Compose Modal State ────────────────────────────────────────────────────
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDraftId, setComposeDraftId] = useState<string | null>(null);
  const [composeInitialData, setComposeInitialData] = useState<any>(null);

  // ─── Mobile Drawer State ────────────────────────────────────────────────────
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ─── Admin Modal State (Step 4) ─────────────────────────────────────────────
  const { hasRole } = useAdminAuth();
  const isAdmin = hasRole(['SUPER_ADMIN', 'ADMIN']);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // ─── Destructive Confirmation Dialog State ──────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // ─── 1. Load User Address & Folder Counts ───────────────────────────────────
  const fetchCounts = useCallback(async () => {
    try {
      const res = await mailApi.getCounts();
      if (res.data) setCounts(res.data);
    } catch (err) {
      console.warn('[PacificMail] Failed to load counts:', err);
    }
  }, []);

  useEffect(() => {
    mailApi
      .getMyAddress()
      .then((res) => {
        if (res.data) setMyAddress(res.data);
      })
      .catch((err) => console.warn('[PacificMail] Address resolve warning:', err));

    fetchCounts();
  }, [fetchCounts]);

  // ─── 2. Fetch Messages for Current Folder or Search ─────────────────────────
  const fetchThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      if (searchQuery.trim()) {
        const res = await mailApi.searchMail({
          q: searchQuery.trim(),
          page,
          limit,
        });
        setThreads(res.data || []);
        setTotal(res.pagination?.totalItems ?? (res.data?.length || 0));
      } else {
        const res = await mailApi.listFolder(currentFolder, {
          page,
          limit,
        });
        setThreads(res.data || []);
        setTotal(res.pagination?.totalItems ?? (res.data?.length || 0));
      }
    } catch (err) {
      console.error('[PacificMail] Failed to load mail list:', err);
      setThreads([]);
      setTotal(0);
    } finally {
      setLoadingThreads(false);
    }
  }, [currentFolder, page, limit, searchQuery]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // ─── 3. Fetch Thread Detail ─────────────────────────────────────────────────
  const fetchThreadDetail = useCallback(async (threadId: string) => {
    setLoadingThreadDetail(true);
    try {
      const res = await mailApi.getThreadDetail(threadId);
      if (res.data) {
        setSelectedThread({
          subject: res.data.thread.subject,
          messages: res.data.messages || [],
        });

        // Mark thread as read optimistically in local list
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, isRead: true } : t))
        );
        fetchCounts();
      }
    } catch (err) {
      console.error('[PacificMail] Failed to load thread:', err);
    } finally {
      setLoadingThreadDetail(false);
    }
  }, [fetchCounts]);

  // ─── 4. Thread Selection Handler ────────────────────────────────────────────
  const handleSelectThread = (threadId: string) => {
    // If in DRAFTS folder, clicking opens the draft in compose editor
    if (currentFolder === 'DRAFTS') {
      const threadItem = threads.find((t) => t.id === threadId);
      if (threadItem) {
        // Fetch message detail to populate compose form
        mailApi.getThreadDetail(threadId).then((res) => {
          const firstMsg = res.data?.messages?.[0];
          if (firstMsg) {
            setComposeDraftId(firstMsg.id);
            setComposeInitialData({
              subject: firstMsg.subject,
              bodyText: firstMsg.bodyText,
              to: firstMsg.recipients.filter((r) => r.type === 'TO').map((r) => r.rawEmail),
              cc: firstMsg.recipients.filter((r) => r.type === 'CC').map((r) => r.rawEmail),
              bcc: firstMsg.bccRecipients?.map((r) => r.rawEmail) || [],
              threadId: firstMsg.threadId,
            });
            setComposeOpen(true);
          }
        });
        return;
      }
    }

    setSelectedThreadId(threadId);
    fetchThreadDetail(threadId);
  };

  // ─── 5. Optimistic Star Toggle ──────────────────────────────────────────────
  const handleToggleStar = async (item: MailThreadSummary) => {
    const nextState = !item.isStarred;

    // Optimistic UI update
    setThreads((prev) =>
      prev.map((t) =>
        t.mailboxItemId === item.mailboxItemId ? { ...t, isStarred: nextState } : t
      )
    );

    try {
      await mailApi.updateItem(item.mailboxItemId, { isStarred: nextState });
      fetchCounts();
    } catch (err) {
      console.error('[PacificMail] Failed to toggle star:', err);
      // Revert on error
      setThreads((prev) =>
        prev.map((t) =>
          t.mailboxItemId === item.mailboxItemId ? { ...t, isStarred: item.isStarred } : t
        )
      );
    }
  };

  // ─── 6. Multi-Select & Bulk Actions ─────────────────────────────────────────
  const handleToggleSelectItem = (itemId: string) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleToggleSelectAll = () => {
    if (threads.every((t) => selectedIds.includes(t.mailboxItemId))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(threads.map((t) => t.mailboxItemId));
    }
  };

  const executeBulkAction = async (
    action: 'markRead' | 'markUnread' | 'star' | 'unstar' | 'archive' | 'spam' | 'trash' | 'delete'
  ) => {
    if (selectedIds.length === 0) return;

    try {
      await mailApi.bulkAction({ itemIds: selectedIds, action });
      setSelectedIds([]);
      fetchThreads();
      fetchCounts();
    } catch (err) {
      console.error(`[PacificMail] Bulk ${action} failed:`, err);
    }
  };

  const handleBulkAction = (
    action: 'markRead' | 'markUnread' | 'star' | 'unstar' | 'archive' | 'spam' | 'trash'
  ) => {
    if (action === 'trash' && currentFolder === 'TRASH') {
      // Destructive permanent deletion prompt
      setConfirmDialog({
        isOpen: true,
        title: 'Delete Permanently?',
        message: `Permanently delete ${selectedIds.length} message(s)? This action cannot be undone.`,
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          executeBulkAction('delete');
        },
      });
      return;
    }
    executeBulkAction(action);
  };

  // ─── 7. Thread-level Single Actions ─────────────────────────────────────────
  const handleArchiveSingleThread = async () => {
    if (!selectedThreadId) return;
    const currentItem = threads.find((t) => t.id === selectedThreadId);
    if (currentItem) {
      await mailApi.updateItem(currentItem.mailboxItemId, { folder: 'ARCHIVE' });
      setSelectedThreadId(null);
      setSelectedThread(null);
      fetchThreads();
      fetchCounts();
    }
  };

  const handleTrashSingleThread = async () => {
    if (!selectedThreadId) return;
    const currentItem = threads.find((t) => t.id === selectedThreadId);
    if (!currentItem) return;

    if (currentFolder === 'TRASH') {
      setConfirmDialog({
        isOpen: true,
        title: 'Delete Message Permanently?',
        message: 'This message is already in Trash. Permanently deleting cannot be undone.',
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          await mailApi.deleteItem(currentItem.mailboxItemId);
          setSelectedThreadId(null);
          setSelectedThread(null);
          fetchThreads();
          fetchCounts();
        },
      });
    } else {
      await mailApi.deleteItem(currentItem.mailboxItemId);
      setSelectedThreadId(null);
      setSelectedThread(null);
      fetchThreads();
      fetchCounts();
    }
  };

  const handleMarkUnreadSingleThread = async () => {
    if (!selectedThreadId) return;
    const currentItem = threads.find((t) => t.id === selectedThreadId);
    if (currentItem) {
      await mailApi.updateItem(currentItem.mailboxItemId, { isRead: false });
      setSelectedThreadId(null);
      setSelectedThread(null);
      fetchThreads();
      fetchCounts();
    }
  };

  const handleStarSingleThread = async () => {
    if (!selectedThreadId) return;
    const currentItem = threads.find((t) => t.id === selectedThreadId);
    if (currentItem) {
      handleToggleStar(currentItem);
    }
  };

  // ─── 8. Keyboard Navigation (Gmail Shortcuts) ───────────────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in inputs or textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'c' && !composeOpen) {
        e.preventDefault();
        setComposeDraftId(null);
        setComposeInitialData(null);
        setComposeOpen(true);
      } else if (e.key === 'Escape') {
        if (selectedThreadId) {
          e.preventDefault();
          setSelectedThreadId(null);
          setSelectedThread(null);
        }
      } else if (e.key === 'e' && selectedThreadId) {
        e.preventDefault();
        handleArchiveSingleThread();
      } else if (e.key === '#' && selectedThreadId) {
        e.preventDefault();
        handleTrashSingleThread();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [composeOpen, selectedThreadId, handleArchiveSingleThread, handleTrashSingleThread]);

  return (
    <div className="flex h-full w-full bg-[#030213] text-white overflow-hidden relative font-sans">
      {/* Left Column: Folders & Compose Action */}
      <MailFolderSidebar
        currentFolder={currentFolder}
        onSelectFolder={handleSelectFolder}
        onOpenCompose={() => {
          setComposeDraftId(null);
          setComposeInitialData(null);
          setComposeOpen(true);
        }}
        counts={counts}
        myAddress={myAddress}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        isAdmin={isAdmin}
        onOpenAdmin={() => setAdminModalOpen(true)}
      />

      {/* Right Column: Dynamic Content (Thread List vs Thread Detail) */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {selectedThreadId && selectedThread ? (
          /* Detailed Thread View */
          <MailThreadDetail
            threadId={selectedThreadId}
            subject={selectedThread.subject}
            messages={selectedThread.messages}
            loading={loadingThreadDetail}
            onBack={() => {
              setSelectedThreadId(null);
              setSelectedThread(null);
            }}
            onStarThread={handleStarSingleThread}
            isStarred={threads.find((t) => t.id === selectedThreadId)?.isStarred}
            onArchiveThread={handleArchiveSingleThread}
            onTrashThread={handleTrashSingleThread}
            onMarkUnreadThread={handleMarkUnreadSingleThread}
            myAddress={myAddress}
            onMessageSent={() => {
              fetchThreadDetail(selectedThreadId);
              fetchCounts();
            }}
          />
        ) : (
          /* Paginated Message List View */
          <MailMessageList
            threads={threads}
            loading={loadingThreads}
            currentFolder={currentFolder}
            onSelectThread={handleSelectThread}
            selectedThreadId={selectedThreadId}
            onToggleStar={handleToggleStar}
            onRefresh={() => {
              fetchThreads();
              fetchCounts();
            }}
            onBulkAction={handleBulkAction}
            page={page}
            limit={limit}
            total={total}
            onPageChange={(p) => setPage(p)}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setPage(1);
            }}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            selectedItemIds={selectedIds}
            onToggleSelectItem={handleToggleSelectItem}
            onToggleSelectAll={handleToggleSelectAll}
          />
        )}
      </div>

      {/* Floating Gmail-Style Compose Window */}
      <MailComposeModal
        isOpen={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setComposeDraftId(null);
          setComposeInitialData(null);
        }}
        onSent={() => {
          fetchThreads();
          fetchCounts();
        }}
        initialDraftId={composeDraftId}
        initialData={composeInitialData}
      />

      {/* Accessible Destructive Confirmation Dialog */}
      <MailConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
      {/* Admin Operations Modal (Step 4) */}
      {isAdmin && (
        <MailAdminModal
          isOpen={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
        />
      )}
    </div>
  );
}
