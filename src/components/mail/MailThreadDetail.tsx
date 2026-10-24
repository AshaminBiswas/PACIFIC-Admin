import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  Archive,
  AlertOctagon,
  Trash2,
  Mail,
  Reply,
  ReplyAll,
  Forward,
  Paperclip,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import type { MailMessageDetail, MailAddress } from '../../types/admin';
import { formatFullMailDate, formatFileSize, sanitizeMailHtml, textToSafeHtml } from '../../utils/mailFormatters';
import { MailRecipientInput } from './MailRecipientInput';
import { mailApi } from '../../api/mailApi';

interface MailThreadDetailProps {
  threadId: string;
  subject: string;
  messages: MailMessageDetail[];
  loading: boolean;
  onBack: () => void;
  onStarThread: () => void;
  isStarred?: boolean;
  onArchiveThread: () => void;
  onTrashThread: () => void;
  onMarkUnreadThread: () => void;
  myAddress: MailAddress | null;
  onMessageSent: () => void;
}

export const MailThreadDetail: React.FC<MailThreadDetailProps> = ({
  subject,
  messages,
  loading,
  onBack,
  onStarThread,
  isStarred = false,
  onArchiveThread,
  onTrashThread,
  onMarkUnreadThread,
  myAddress,
  onMessageSent,
}) => {
  // Collapsed states: keep the latest message open by default
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    if (messages.length === 0) return {};
    const lastId = messages[messages.length - 1].id;
    return { [lastId]: true };
  });

  // Inline Quick Reply / Forward state
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward' | null>(null);
  const [replyTo, setReplyTo] = useState<string[]>([]);
  const [replyCc, setReplyCc] = useState<string[]>([]);
  const [replyBcc, setReplyBcc] = useState<string[]>([]);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const toggleExpand = (msgId: string) => {
    setExpandedIds((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    messages.forEach((m) => {
      all[m.id] = true;
    });
    setExpandedIds(all);
  };

  const collapseAll = () => {
    setExpandedIds({});
  };

  // Open inline reply box configured for a specific message
  const handleInitiateReply = (msg: MailMessageDetail, mode: 'reply' | 'replyAll' | 'forward') => {
    setReplyMode(mode);
    setReplyStatus(null);

    const fromEmail = `${msg.fromAddress.localPart}@${msg.fromAddress.domain}`;
    const myEmail = myAddress?.fullAddress?.toLowerCase();

    if (mode === 'reply') {
      setReplyTo([fromEmail]);
      setReplyCc([]);
      setReplyBcc([]);
      setReplyBody('');
    } else if (mode === 'replyAll') {
      // To: original sender + original TO recipients (excluding me)
      const otherTos = msg.recipients
        .filter((r) => r.type === 'TO' && r.rawEmail.toLowerCase() !== myEmail && r.rawEmail.toLowerCase() !== fromEmail)
        .map((r) => r.rawEmail);
      setReplyTo(Array.from(new Set([fromEmail, ...otherTos])));

      // CC: original CCs (excluding me)
      const otherCcs = msg.recipients
        .filter((r) => r.type === 'CC' && r.rawEmail.toLowerCase() !== myEmail)
        .map((r) => r.rawEmail);
      setReplyCc(otherCcs);
      setReplyBcc([]);
      setReplyBody('');
    } else if (mode === 'forward') {
      setReplyTo([]);
      setReplyCc([]);
      setReplyBcc([]);
      const citation = `\n\n---------- Forwarded message ---------\nFrom: ${msg.fromAddress.displayName || fromEmail} <${fromEmail}>\nDate: ${formatFullMailDate(msg.sentAt || msg.createdAt)}\nSubject: ${msg.subject}\nTo: ${msg.recipients.map((r) => r.rawEmail).join(', ')}\n\n${msg.bodyText || ''}`;
      setReplyBody(citation);
    }

    // Scroll to reply box smoothly
    setTimeout(() => {
      const el = document.getElementById('inline-reply-box');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Submit the inline reply / forward
  const handleSubmitReply = async () => {
    if (replyTo.length === 0) {
      setReplyStatus({ text: 'Please specify at least one recipient', type: 'error' });
      return;
    }
    if (!replyBody.trim()) {
      setReplyStatus({ text: 'Reply content cannot be empty', type: 'error' });
      return;
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;

    setSendingReply(true);
    setReplyStatus(null);

    try {
      const idempotencyKey = `reply-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

      if (replyMode === 'forward') {
        await mailApi.forwardMessage(latestMessage.id, {
          to: replyTo,
          cc: replyCc,
          bcc: replyBcc,
          bodyText: replyBody,
          idempotencyKey,
        });
      } else {
        await mailApi.replyMessage(latestMessage.id, {
          to: replyTo,
          cc: replyCc,
          bcc: replyBcc,
          bodyText: replyBody,
          replyAll: replyMode === 'replyAll',
          idempotencyKey,
        });
      }

      setReplyStatus({ text: 'Reply sent successfully', type: 'success' });
      setReplyBody('');
      setReplyMode(null);
      onMessageSent();
    } catch (err: any) {
      setReplyStatus({
        text: err?.response?.data?.message || err.message || 'Failed to send reply',
        type: 'error',
      });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#030213] flex-1 min-w-0 overflow-hidden">
      {/* Top Detail Header Toolbar */}
      <div className="px-4 py-2.5 bg-[#0e0d24] border-b border-white/10 shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Back to messages list"
            title="Back (ESC)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {subject || '(No Subject)'}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/60 shrink-0">
              {messages.length} {messages.length === 1 ? 'msg' : 'msgs'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={onStarThread}
            className="p-2 rounded-xl text-white/40 hover:text-amber-400 hover:bg-white/5 transition-colors"
            title="Star thread"
            aria-label="Star thread"
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
          <button
            onClick={onArchiveThread}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Archive thread"
            aria-label="Archive thread"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={onTrashThread}
            className="p-2 rounded-xl text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Move thread to trash"
            aria-label="Move thread to trash"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onMarkUnreadThread}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Mark unread"
            aria-label="Mark thread as unread"
          >
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversation Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
        {loading && messages.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-6 rounded-2xl bg-white/[0.03] space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-48 h-3 rounded bg-white/10" />
                    <div className="w-32 h-2.5 rounded bg-white/5" />
                  </div>
                </div>
                <div className="h-16 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isExpanded = expandedIds[msg.id] ?? (idx === messages.length - 1);
            const fromDisplay = msg.fromAddress.displayName || `${msg.fromAddress.localPart}@${msg.fromAddress.domain}`;
            const fromEmail = `${msg.fromAddress.localPart}@${msg.fromAddress.domain}`;
            const initials = (fromDisplay.slice(0, 2)).toUpperCase();

            // BCC visibility check: only displayed if sender
            const hasBcc = Boolean(msg.bccRecipients && msg.bccRecipients.length > 0);

            return (
              <article
                key={msg.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'bg-[#0d0c24] border-white/15 shadow-xl'
                    : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 cursor-pointer'
                }`}
              >
                {/* Message Header Bar */}
                <div
                  onClick={() => toggleExpand(msg.id)}
                  className="p-4 flex items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Sender Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7FB706] to-[#B5F823] flex items-center justify-center text-black font-bold text-xs shrink-0 shadow-md shadow-[#B5F823]/20">
                      {initials}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-semibold text-white truncate">
                          {fromDisplay}
                        </span>
                        <span className="text-[11px] text-white/40 truncate hidden sm:inline">
                          &lt;{fromEmail}&gt;
                        </span>
                      </div>

                      {!isExpanded && msg.bodyText && (
                        <p className="text-xs text-white/50 truncate max-w-xl">
                          {msg.bodyText.slice(0, 100)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-xs text-white/40 font-mono">
                      {formatFullMailDate(msg.sentAt || msg.createdAt)}
                    </span>
                    <button
                      type="button"
                      className="p-1 text-white/40 hover:text-white"
                      aria-label={isExpanded ? 'Collapse message' : 'Expand message'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Message Content */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-white/5 space-y-5">
                    {/* Recipients Info Bar */}
                    <div className="text-xs text-white/60 space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <div className="flex items-start">
                        <span className="text-white/40 w-12 font-medium shrink-0">To:</span>
                        <span className="text-white/80 flex-1">
                          {msg.recipients.filter((r) => r.type === 'TO').map((r) => r.rawEmail).join(', ') || 'undisclosed-recipients'}
                        </span>
                      </div>

                      {msg.recipients.some((r) => r.type === 'CC') && (
                        <div className="flex items-start">
                          <span className="text-white/40 w-12 font-medium shrink-0">Cc:</span>
                          <span className="text-white/80 flex-1">
                            {msg.recipients.filter((r) => r.type === 'CC').map((r) => r.rawEmail).join(', ')}
                          </span>
                        </div>
                      )}

                      {/* BCC: Displayed only if caller is the sender */}
                      {hasBcc && (
                        <div className="flex items-start text-amber-300">
                          <span className="text-amber-400 w-12 font-medium shrink-0">Bcc:</span>
                          <span className="flex-1">
                            {msg.bccRecipients!.map((r) => r.rawEmail).join(', ')} (Private)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Email Body Rendering with DOMPurify sanitization */}
                    <div className="text-white/90 text-sm leading-relaxed overflow-x-auto min-h-[60px] font-sans">
                      {msg.bodyHtml ? (
                        <div
                          className="prose prose-invert max-w-none text-sm font-sans"
                          dangerouslySetInnerHTML={{ __html: sanitizeMailHtml(msg.bodyHtml) }}
                        />
                      ) : (
                        <div
                          className="whitespace-pre-wrap font-sans text-sm"
                          dangerouslySetInnerHTML={{ __html: textToSafeHtml(msg.bodyText) }}
                        />
                      )}
                    </div>

                    {/* Attachments Section */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="pt-4 border-t border-white/10 space-y-2">
                        <span className="text-xs font-semibold text-white/60 flex items-center space-x-1.5 uppercase tracking-wider">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Attachments ({msg.attachments.length})</span>
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {msg.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#B5F823]/40 transition-all"
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <FileText className="w-4 h-4 text-[#B5F823] shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-medium text-white truncate">
                                    {att.filename}
                                  </span>
                                  <span className="text-[10px] text-white/40">
                                    {formatFileSize(att.sizeBytes)} • {att.mimeType}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => mailApi.downloadAttachment(att.id, att.filename)}
                                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                title="Download attachment"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message Action Buttons */}
                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleInitiateReply(msg, 'reply')}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInitiateReply(msg, 'replyAll')}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors"
                      >
                        <ReplyAll className="w-3.5 h-3.5" />
                        <span>Reply All</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInitiateReply(msg, 'forward')}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors"
                      >
                        <Forward className="w-3.5 h-3.5" />
                        <span>Forward</span>
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}

        {/* Inline Quick Reply / Forward Form Box */}
        {replyMode ? (
          <div
            id="inline-reply-box"
            className="rounded-2xl border border-[#B5F823]/30 bg-[#0d0c24] shadow-2xl p-4 sm:p-6 space-y-4 animate-scaleUp"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                {replyMode === 'reply' && <Reply className="w-4 h-4 text-[#B5F823]" />}
                {replyMode === 'replyAll' && <ReplyAll className="w-4 h-4 text-[#B5F823]" />}
                {replyMode === 'forward' && <Forward className="w-4 h-4 text-[#B5F823]" />}
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {replyMode === 'reply' ? 'Reply' : replyMode === 'replyAll' ? 'Reply All' : 'Forward'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setReplyMode(null)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
                aria-label="Cancel reply"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {replyStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  replyStatus.type === 'success'
                    ? 'bg-[#B5F823]/15 text-[#B5F823] border border-[#B5F823]/30'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}
              >
                {replyStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{replyStatus.text}</span>
              </div>
            )}

            <div className="space-y-2 bg-[#09081a] p-3 rounded-xl border border-white/5">
              <MailRecipientInput
                id="reply-to"
                label="To"
                recipients={replyTo}
                onChange={setReplyTo}
                placeholder="recipient@pacific.internal"
                disabled={sendingReply}
              />
              {replyCc.length > 0 && (
                <MailRecipientInput
                  id="reply-cc"
                  label="Cc"
                  recipients={replyCc}
                  onChange={setReplyCc}
                  placeholder="cc@pacific.internal"
                  disabled={sendingReply}
                />
              )}
            </div>

            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Type your reply here..."
              disabled={sendingReply}
              rows={6}
              className="w-full bg-[#09081a] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B5F823]/50 font-sans leading-relaxed resize-y"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSubmitReply}
                disabled={sendingReply || replyTo.length === 0}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#B5F823] hover:bg-[#7FB706] disabled:opacity-40 text-black font-semibold text-xs tracking-wide transition-all shadow-md shadow-[#B5F823]/20 focus:outline-none focus:ring-2 focus:ring-[#B5F823]"
              >
                {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sendingReply ? 'Sending...' : 'Send'}</span>
              </button>

              <button
                type="button"
                onClick={() => setReplyMode(null)}
                className="px-4 py-2 text-xs font-medium text-white/50 hover:text-white transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          /* Bottom Trigger to Reply/Forward */
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <span className="text-xs text-white/50">Reply or forward this message thread</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  if (messages.length > 0) handleInitiateReply(messages[messages.length - 1], 'reply');
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (messages.length > 0) handleInitiateReply(messages[messages.length - 1], 'forward');
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors"
              >
                <Forward className="w-3.5 h-3.5" />
                <span>Forward</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
