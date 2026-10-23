import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Save,
  Trash2,
  Paperclip,
  Bold,
  Italic,
  Underline,
  List,
  Quote,
  RemoveFormatting,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { MailRecipientInput } from './MailRecipientInput';
import { MailConfirmDialog } from './MailConfirmDialog';
import { mailApi } from '../../api/mailApi';
import type { SendMailRequest, CreateDraftRequest } from '../../types/admin';

interface MailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  initialDraftId?: string | null;
  initialData?: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    threadId?: string;
    parentId?: string;
    inReplyTo?: string;
    references?: string[];
  };
}

export const MailComposeModal: React.FC<MailComposeModalProps> = ({
  isOpen,
  onClose,
  onSent,
  initialDraftId = null,
  initialData,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Form fields
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');

  // Draft & execution state
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Populate initial data or load draft
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTo(initialData.to || []);
        setCc(initialData.cc || []);
        setBcc(initialData.bcc || []);
        setShowCc(Boolean(initialData.cc && initialData.cc.length > 0));
        setShowBcc(Boolean(initialData.bcc && initialData.bcc.length > 0));
        setSubject(initialData.subject || '');
        setBodyText(initialData.bodyText || '');
      } else {
        setTo([]);
        setCc([]);
        setBcc([]);
        setShowCc(false);
        setShowBcc(false);
        setSubject('');
        setBodyText('');
      }

      setCurrentDraftId(initialDraftId || null);
      setStatusMessage(null);
      setIsMinimized(false);
    }
  }, [isOpen, initialDraftId, initialData]);

  if (!isOpen) return null;

  const hasContent = to.length > 0 || subject.trim() || bodyText.trim();

  // ─── Format Toolbar Helpers ────────────────────────────────────────────────
  const applyFormat = (format: 'bold' | 'italic' | 'underline' | 'quote' | 'bullet') => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = bodyText.substring(start, end);
    let replacement = '';

    switch (format) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        break;
      case 'underline':
        replacement = `<u>${selected || 'underlined text'}</u>`;
        break;
      case 'quote':
        replacement = `\n> ${selected || 'quoted text'}\n`;
        break;
      case 'bullet':
        replacement = `\n- ${selected || 'list item'}\n`;
        break;
    }

    const updated = bodyText.substring(0, start) + replacement + bodyText.substring(end);
    setBodyText(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 10);
  };

  // ─── Save Draft ────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setStatusMessage(null);
    try {
      if (currentDraftId) {
        await mailApi.updateDraft(currentDraftId, {
          subject,
          to,
          cc,
          bcc,
          bodyText,
        });
      } else {
        const res = await mailApi.createDraft({
          subject,
          to,
          cc,
          bcc,
          bodyText,
          threadId: initialData?.threadId,
          parentId: initialData?.parentId,
        });
        if (res.data?.message?.id) {
          setCurrentDraftId(res.data.message.id);
        }
      }
      setStatusMessage({ text: 'Draft saved', type: 'success' });
    } catch (err: any) {
      setStatusMessage({
        text: err?.response?.data?.message || 'Failed to save draft',
        type: 'error',
      });
    } finally {
      setSavingDraft(false);
    }
  };

  // ─── Send Message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (to.length === 0) {
      setStatusMessage({ text: 'Please specify at least one recipient', type: 'error' });
      return;
    }

    if (!bodyText.trim()) {
      setStatusMessage({ text: 'Message body cannot be empty', type: 'error' });
      return;
    }

    setSending(true);
    setStatusMessage(null);

    try {
      const idempotencyKey = `web-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

      const payload: SendMailRequest = {
        draftId: currentDraftId || undefined,
        threadId: initialData?.threadId,
        parentId: initialData?.parentId,
        subject: subject.trim() || '(No Subject)',
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        bodyText,
        idempotencyKey,
      };

      await mailApi.sendMail(payload);
      setStatusMessage({ text: 'Message sent successfully', type: 'success' });

      setTimeout(() => {
        onSent?.();
        onClose();
      }, 500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to send message';
      setStatusMessage({ text: msg, type: 'error' });
    } finally {
      setSending(false);
    }
  };

  // ─── Discard Action ────────────────────────────────────────────────────────
  const handleDiscardClick = () => {
    if (hasContent && !currentDraftId) {
      setConfirmDiscardOpen(true);
    } else {
      onClose();
    }
  };

  // ─── Render Minimized Dock Bar ──────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 lg:right-12 z-50 w-72 bg-[#12112a] border border-white/20 rounded-t-xl shadow-2xl flex items-center justify-between px-4 py-2.5 text-white">
        <span className="text-xs font-semibold truncate flex-1 mr-2">
          {subject || 'New Message'}
        </span>
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
            aria-label="Restore"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDiscardClick}
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`fixed z-50 flex flex-col bg-[#0b0a1d] border border-white/15 shadow-2xl transition-all duration-200 overflow-hidden ${
          isMaximized
            ? 'inset-2 lg:inset-8 rounded-2xl'
            : 'inset-x-0 bottom-0 sm:inset-auto sm:bottom-0 sm:right-6 sm:w-[580px] sm:h-[620px] sm:max-h-[85vh] sm:rounded-t-2xl rounded-t-2xl'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#141233] border-b border-white/10 shrink-0 select-none">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#B5F823] animate-pulse" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/90">
              {currentDraftId ? 'Edit Draft' : initialData?.threadId ? 'Reply / Follow-up' : 'New Message'}
            </h3>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              aria-label="Minimize"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors hidden sm:block"
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleDiscardClick}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              aria-label="Close"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Toast / Alert Banner */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-[#B5F823]/15 text-[#B5F823] border-b border-[#B5F823]/20'
                : 'bg-red-500/15 text-red-400 border-b border-red-500/20'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-0.5 hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Recipients & Subject Fields */}
        <div className="px-4 py-2 shrink-0 bg-[#0e0d26]">
          {/* TO Field with CC/BCC toggles */}
          <div className="relative">
            <MailRecipientInput
              id="compose-to"
              label="To"
              recipients={to}
              onChange={setTo}
              placeholder="recipient@pacific.internal"
              disabled={sending}
            />
            <div className="absolute right-1 top-2 flex items-center space-x-2 text-xs text-white/40">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="hover:text-[#B5F823] transition-colors"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="hover:text-[#B5F823] transition-colors"
                >
                  Bcc
                </button>
              )}
            </div>
          </div>

          {/* CC Field */}
          {showCc && (
            <MailRecipientInput
              id="compose-cc"
              label="Cc"
              recipients={cc}
              onChange={setCc}
              placeholder="cc@pacific.internal"
              disabled={sending}
            />
          )}

          {/* BCC Field */}
          {showBcc && (
            <MailRecipientInput
              id="compose-bcc"
              label="Bcc"
              recipients={bcc}
              onChange={setBcc}
              placeholder="bcc@pacific.internal (hidden)"
              disabled={sending}
            />
          )}

          {/* Subject Field */}
          <div className="flex items-center border-b border-white/10 py-1.5 focus-within:border-[#B5F823]/50 transition-colors">
            <input
              id="compose-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              disabled={sending}
              className="w-full bg-transparent border-none text-white text-sm font-medium placeholder:text-white/30 focus:outline-none px-1 py-1"
            />
          </div>
        </div>

        {/* Format Toolbar */}
        <div className="flex items-center space-x-1 px-4 py-1.5 bg-[#13112c] border-b border-white/10 text-white/60 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Bold"
            aria-label="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Italic"
            aria-label="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('underline')}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Underline"
            aria-label="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-3.5 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => applyFormat('bullet')}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Bullet list"
            aria-label="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('quote')}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Quote"
            aria-label="Quote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-3.5 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => setBodyText(bodyText.replace(/[*_#>`]/g, ''))}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Remove formatting"
            aria-label="Remove formatting"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Message Body Textarea */}
        <div className="flex-1 min-h-[160px] p-4 bg-[#0a091a] flex flex-col">
          <textarea
            ref={editorRef}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Write your internal email here..."
            disabled={sending}
            className="w-full flex-1 bg-transparent border-none text-white text-sm leading-relaxed placeholder:text-white/20 focus:outline-none resize-none font-sans"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#110f2c] border-t border-white/10 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || to.length === 0}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#B5F823] hover:bg-[#7FB706] disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-xs tracking-wide transition-all shadow-lg shadow-[#B5F823]/20 focus:outline-none focus:ring-2 focus:ring-[#B5F823]"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{sending ? 'Sending...' : 'Send'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || sending || !hasContent}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Save as draft"
            >
              {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Save Draft</span>
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={handleDiscardClick}
              disabled={sending}
              className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Discard draft"
              aria-label="Discard draft"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Discard Confirmation Dialog */}
      <MailConfirmDialog
        isOpen={confirmDiscardOpen}
        title="Discard Draft?"
        message="You have unsaved changes in this message. Discarding will permanently discard this draft."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        isDestructive={true}
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onClose();
        }}
        onCancel={() => setConfirmDiscardOpen(false)}
      />
    </>
  );
};
