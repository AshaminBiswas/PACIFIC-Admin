import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  Mic,
  MicOff,
  Sparkles,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Phone,
  Building2,
  Mail,
  ExternalLink,
  Tag as TagIcon,
  Plus,
  Search,
  Filter,
  RefreshCw,
  X,
  FileText,
  CornerDownRight,
  ArrowUpRight,
  Play,
  Pause,
  MoreVertical,
  Edit2,
  Bot,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { wacrmApi } from '../../api/wacrmApi';
import type {
  WacrmConversation,
  WacrmMessage,
  WacrmContact,
  WacrmTemplate,
  WacrmQuickReply,
} from '../../types/admin';

interface WacrmInboxProps {
  conversations: WacrmConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onRefreshConversations: () => void;
  templates: WacrmTemplate[];
  quickReplies: WacrmQuickReply[];
  operatorName: string;
}

export default function WacrmInbox({
  conversations,
  activeConversationId,
  onSelectConversation,
  onRefreshConversations,
  templates,
  quickReplies,
  operatorName,
}: WacrmInboxProps) {
  const navigate = useNavigate();

  // ─── Filter & Search State ──────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Thread States ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<WacrmMessage[]>([]);
  const [activeConversation, setActiveConversation] = useState<WacrmConversation | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WacrmTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // ─── AI Draft State ─────────────────────────────────────────────────────────
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiDraftBadge, setAiDraftBadge] = useState<string | null>(null);

  // ─── Quick Reply Popover State ──────────────────────────────────────────────
  const [showQuickReplyMenu, setShowQuickReplyMenu] = useState(false);
  const [quickReplyFilter, setQuickReplyFilter] = useState('');

  // ─── Audio Recording State ──────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // ─── Reactions & Attachment State ───────────────────────────────────────────
  const [reactionPopoverMsgId, setReactionPopoverMsgId] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);

  // ─── Contact 360 Sidebar Notes ──────────────────────────────────────────────
  const [contactNotes, setContactNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Auto-scroll Messages to bottom ─────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Sync active conversation object ────────────────────────────────────────
  useEffect(() => {
    if (activeConversationId) {
      const found = conversations.find((c) => c.id === activeConversationId);
      if (found) {
        setActiveConversation(found);
        setContactNotes(found.contactCompany ? `Company: ${found.contactCompany}` : '');
      }
    }
  }, [activeConversationId, conversations]);

  // ─── Fetch Messages for active conversation ─────────────────────────────────
  const fetchMessages = useCallback(async (convId: string) => {
    try {
      setLoadingMessages(true);
      const res = await wacrmApi.getConversation(convId);
      if (res.data) {
        setActiveConversation(res.data.conversation);
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.warn('Failed to load conversation messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  // ─── Send Message ───────────────────────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() && !selectedTemplate && !attachmentPreview) return;
    if (!activeConversationId) return;

    try {
      setIsSending(true);
      const isTemplate = Boolean(selectedTemplate);
      const isMedia = Boolean(attachmentPreview);

      const res = await wacrmApi.sendMessage({
        conversationId: activeConversationId,
        contentType: isTemplate ? 'template' : isMedia ? 'document' : 'text',
        contentText: isTemplate ? null : messageInput.trim() || attachmentPreview?.name || null,
        templateName: isTemplate ? selectedTemplate?.name : null,
        mediaUrl: attachmentPreview?.url || null,
      });

      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
      }

      setMessageInput('');
      setSelectedTemplate(null);
      setAttachmentPreview(null);
      setAiDraftBadge(null);
      setShowQuickReplyMenu(false);
      onRefreshConversations();
    } catch (err: any) {
      alert(err?.message || 'Failed to send WhatsApp message');
    } finally {
      setIsSending(false);
    }
  };

  // ─── Trigger AI Draft Reply ─────────────────────────────────────────────────
  const handleGenerateAiReply = async () => {
    if (!activeConversationId) return;
    try {
      setIsGeneratingAi(true);
      const res = await wacrmApi.generateAiDraft(activeConversationId);
      if (res.data?.draft) {
        setMessageInput(res.data.draft);
        setAiDraftBadge(`${res.data.model} AI`);
        textareaRef.current?.focus();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to generate AI response');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // ─── Voice Note Recording ───────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAttachmentPreview({
          url: audioUrl,
          name: `Voice_Note_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`,
          type: 'audio',
        });
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied or not available.');
    }
  };

  const stopRecording = (cancel = false) => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (cancel) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current.stop();
      }
    }
  };

  // ─── Quick Reply Auto-detect ────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageInput(val);

    if (val.startsWith('/')) {
      setShowQuickReplyMenu(true);
      setQuickReplyFilter(val.substring(1).toLowerCase());
    } else {
      setShowQuickReplyMenu(false);
    }
  };

  const handleSelectQuickReply = (qr: WacrmQuickReply) => {
    setMessageInput(qr.contentText || '');
    setShowQuickReplyMenu(false);
    textareaRef.current?.focus();
  };

  // ─── Message Reaction Toggle ────────────────────────────────────────────────
  const handleReactToMessage = async (msgId: string, emoji: string) => {
    try {
      await wacrmApi.reactToMessage(msgId, emoji);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, reaction: m.reaction === emoji ? null : emoji } : m))
      );
      setReactionPopoverMsgId(null);
    } catch (err) {
      console.warn('Reaction failed:', err);
    }
  };

  // ─── Save Contact Notes ─────────────────────────────────────────────────────
  const handleSaveNotes = async () => {
    if (!activeConversation?.contactId) return;
    try {
      setIsSavingNotes(true);
      await wacrmApi.updateContact(activeConversation.contactId, { notes: contactNotes });
    } catch (err: any) {
      alert('Failed to save notes: ' + err.message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // ─── Filtered Conversation List ─────────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchSearch =
        !searchQuery.trim() ||
        c.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactPhone?.includes(searchQuery) ||
        (c.contactCompany && c.contactCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.lastMessageText && c.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [conversations, statusFilter, searchQuery]);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-145px)] overflow-hidden bg-[#030213]">
      {/* ─── COLUMN 1: Conversation List ───────────────────────────────────── */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-white/10 flex flex-col bg-[#07051f]/60 backdrop-blur-md">
        {/* Search & Filter Header */}
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats, numbers, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
            {(['all', 'open', 'pending', 'closed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex-1 py-1 text-[11px] font-bold uppercase rounded-md transition-all ${
                  statusFilter === tab
                    ? 'bg-[#7FB706] text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto text-gray-600 mb-2 stroke-1" />
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 relative ${
                    isActive
                      ? 'bg-[#7FB706]/15 border-l-4 border-[#7FB706]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7FB706]/40 to-blue-600/40 border border-white/10 flex items-center justify-center text-sm font-black text-white flex-shrink-0">
                    {conv.contactName?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate">
                        {conv.contactName || conv.contactPhone}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {conv.contactCompany && (
                      <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-gray-500" />
                        {conv.contactCompany}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 truncate mt-1">
                      {conv.lastMessageText || 'No messages yet'}
                    </p>

                    {/* Tags & Badges */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          conv.status === 'open'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : conv.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                        }`}
                      >
                        {conv.status}
                      </span>

                      {conv.tags?.map((t) => (
                        <span
                          key={t.id}
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-gray-300"
                        >
                          {t.name}
                        </span>
                      ))}

                      {conv.unreadCount > 0 && (
                        <span className="ml-auto w-4 h-4 rounded-full bg-[#B5F823] text-black text-[10px] font-black flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── COLUMN 2: Active Message Thread ───────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#05031a] relative">
        {activeConversation ? (
          <>
            {/* Thread Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-[#0c0a24]/90 backdrop-blur-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#7FB706]/30 border border-[#7FB706]/40 flex items-center justify-center text-sm font-black text-white">
                  {activeConversation.contactName?.[0]?.toUpperCase() || 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-white tracking-tight">
                      {activeConversation.contactName}
                    </h2>
                    <a
                      href={`https://wa.me/${activeConversation.contactPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center gap-0.5"
                    >
                      <Phone className="w-3 h-3" />
                      {activeConversation.contactPhone}
                    </a>
                  </div>
                  {activeConversation.contactCompany && (
                    <p className="text-xs text-gray-400">{activeConversation.contactCompany}</p>
                  )}
                </div>
              </div>

              {/* Status Selector & Actions */}
              <div className="flex items-center gap-2">
                <select
                  value={activeConversation.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value as 'open' | 'pending' | 'closed';
                    await wacrmApi.updateConversation(activeConversation.id, { status: newStatus });
                    setActiveConversation((prev) => (prev ? { ...prev, status: newStatus } : null));
                    onRefreshConversations();
                  }}
                  className="bg-black/40 border border-white/15 text-xs rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="open">🟢 Open</option>
                  <option value="pending">🟡 Pending</option>
                  <option value="closed">⚪ Closed</option>
                </select>

                <button
                  onClick={() => fetchMessages(activeConversation.id)}
                  title="Refresh conversation"
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#15123d_1px,transparent_1px)] [background-size:16px_16px]">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#7FB706]" />
                  Loading WhatsApp messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 text-xs p-6">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="font-semibold text-white">No messages yet in this conversation.</p>
                  <p className="text-gray-500 mt-1">
                    Send a direct message or select a Meta-approved template below to initiate.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAgent = msg.senderType === 'agent';
                  const isBot = msg.senderType === 'bot';
                  const isCustomer = msg.senderType === 'customer';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'} relative group`}
                    >
                      {/* Sender label */}
                      <span className="text-[10px] text-gray-500 mb-0.5 px-1 flex items-center gap-1">
                        {isBot ? (
                          <>
                            <Bot className="w-3 h-3 text-purple-400" />
                            <span>AI Auto-Reply</span>
                          </>
                        ) : isAgent ? (
                          <>
                            <User className="w-3 h-3 text-[#B5F823]" />
                            <span>{msg.senderName || operatorName}</span>
                          </>
                        ) : (
                          <span>{activeConversation.contactName}</span>
                        )}
                      </span>

                      {/* Bubble */}
                      <div
                        className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-2.5 shadow-lg relative ${
                          isCustomer
                            ? 'bg-[#15123d] text-white border border-white/10 rounded-tl-sm'
                            : isBot
                            ? 'bg-purple-950/60 text-white border border-purple-500/30 rounded-tr-sm'
                            : 'bg-gradient-to-r from-[#213f04] to-[#112402] text-white border border-[#7FB706]/40 rounded-tr-sm'
                        }`}
                      >
                        {/* Template Tag */}
                        {msg.templateName && (
                          <div className="mb-1 text-[10px] font-bold text-[#B5F823] flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Meta Template: {msg.templateName}
                          </div>
                        )}

                        {/* Media Preview */}
                        {msg.mediaUrl && (
                          <div className="mb-2">
                            {msg.contentType === 'audio' ? (
                              <audio controls src={msg.mediaUrl} className="w-full h-8 rounded" />
                            ) : msg.contentType === 'image' ? (
                              <img src={msg.mediaUrl} alt="WhatsApp media" className="rounded-lg max-h-48 object-cover border border-white/10" />
                            ) : (
                              <a
                                href={msg.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded bg-black/30 border border-white/10 text-xs text-blue-400 hover:underline"
                              >
                                <FileText className="w-4 h-4" />
                                <span>Attached Document / Drawing</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Text */}
                        {msg.contentText && (
                          <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                            {msg.contentText}
                          </p>
                        )}

                        {/* Interactive Buttons / Choices Payload */}
                        {msg.interactivePayload?.buttons && (
                          <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                            {msg.interactivePayload.buttons.map((btn: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 text-[11px] rounded bg-white/10 text-white font-medium border border-white/20"
                              >
                                🔘 {btn.title || btn}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Timestamp & Status Icon */}
                        <div className="flex items-center justify-end gap-1 text-[10px] text-gray-400 mt-1">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!isCustomer && (
                            <span>
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                              ) : msg.status === 'sent' ? (
                                <Check className="w-3.5 h-3.5 text-gray-400" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Reaction Badge */}
                        {msg.reaction && (
                          <div className="absolute -bottom-2 right-2 bg-black/80 border border-white/20 px-1.5 py-0.5 rounded-full text-xs shadow-md">
                            {msg.reaction}
                          </div>
                        )}
                      </div>

                      {/* Hover Emoji Reaction Button */}
                      <button
                        onClick={() =>
                          setReactionPopoverMsgId(reactionPopoverMsgId === msg.id ? null : msg.id)
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white text-xs mt-1 px-1 flex items-center gap-1"
                      >
                        <Smile className="w-3.5 h-3.5" />
                        <span>React</span>
                      </button>

                      {/* Reaction Popover */}
                      {reactionPopoverMsgId === msg.id && (
                        <div className="flex items-center gap-1 bg-[#1a183d] border border-white/20 p-1 rounded-full shadow-2xl mt-1 z-20">
                          {['👍', '❤️', '😂', '🔥', '🙏', '👏'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReactToMessage(msg.id, emoji)}
                              className="w-6 h-6 flex items-center justify-center hover:scale-125 transition-transform text-sm"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reply Auto-Complete Menu */}
            {showQuickReplyMenu && (
              <div className="absolute bottom-20 left-4 right-4 max-w-md bg-[#131130] border border-[#7FB706]/40 rounded-xl shadow-2xl p-2 z-30 space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-400 px-2 py-1 flex items-center justify-between">
                  <span>Quick Replies (/shortcut)</span>
                  <span>Esc to dismiss</span>
                </div>
                {quickReplies
                  .filter((q) => q.shortcut.toLowerCase().includes(quickReplyFilter))
                  .map((qr) => (
                    <button
                      key={qr.id}
                      onClick={() => handleSelectQuickReply(qr)}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#7FB706]/20 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-[#B5F823]">{qr.shortcut}</span>
                      <span className="text-gray-300 truncate max-w-[200px]">{qr.title}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* Composer Footer */}
            <div className="p-3 border-t border-white/10 bg-[#0c0a24]/90 backdrop-blur-md">
              {/* Selected template / attachment chip */}
              {(selectedTemplate || attachmentPreview || aiDraftBadge) && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {selectedTemplate && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Template: {selectedTemplate.name}
                      <button onClick={() => setSelectedTemplate(null)} className="hover:text-white ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {attachmentPreview && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      <FileText className="w-3.5 h-3.5" />
                      {attachmentPreview.name}
                      <button onClick={() => setAttachmentPreview(null)} className="hover:text-white ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {aiDraftBadge && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      <Sparkles className="w-3.5 h-3.5" />
                      Drafted by {aiDraftBadge}
                    </span>
                  )}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  {/* Template Picker */}
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#B5F823]" />
                    <span>Templates</span>
                  </button>

                  {/* Attachment Picker */}
                  <button
                    onClick={() => setIsAttachmentModalOpen(true)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white"
                    title="Attach document/drawing"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Voice Note Recorder Button */}
                  {isRecording ? (
                    <div className="flex items-center gap-2 bg-rose-500/20 border border-rose-500/40 px-3 py-1 rounded-lg text-rose-300 text-xs">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>Recording: {recordingSeconds}s</span>
                      <button onClick={() => stopRecording(false)} className="font-bold underline ml-1 hover:text-white">
                        Done
                      </button>
                      <button onClick={() => stopRecording(true)} className="text-gray-400 hover:text-white ml-1">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white"
                      title="Record Voice Note"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* AI Draft Button */}
                <button
                  onClick={handleGenerateAiReply}
                  disabled={isGeneratingAi}
                  className="px-3 py-1 rounded-lg bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingAi ? 'Thinking...' : 'AI Draft Reply'}</span>
                </button>
              </div>

              {/* Text Input & Send */}
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message or '/' for canned replies... (Enter to send)"
                  className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] resize-none"
                />

                <button
                  type="submit"
                  disabled={isSending || (!messageInput.trim() && !selectedTemplate && !attachmentPreview)}
                  className="h-12 px-5 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#7FB706]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-[#7FB706]">
              <MessageSquare className="w-8 h-8 stroke-1" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Select a Conversation</h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Pick any customer from the left list to review chat logs, send quotations, or initiate an AI auto-draft.
            </p>
          </div>
        )}
      </div>

      {/* ─── COLUMN 3: Contact 360 Right Sidebar ───────────────────────────── */}
      {activeConversation && (
        <div className="w-full md:w-72 lg:w-80 flex-shrink-0 border-l border-white/10 bg-[#07051f]/80 backdrop-blur-md p-4 flex flex-col overflow-y-auto space-y-4">
          <div className="text-center pb-3 border-b border-white/10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#7FB706] to-emerald-400 text-black font-black text-xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-[#7FB706]/20">
              {activeConversation.contactName?.[0]?.toUpperCase() || 'C'}
            </div>
            <h3 className="text-sm font-black text-white">{activeConversation.contactName}</h3>
            <p className="text-xs text-gray-400">{activeConversation.contactPhone}</p>
            {activeConversation.contactCompany && (
              <p className="text-xs font-semibold text-[#B5F823] mt-0.5">{activeConversation.contactCompany}</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enterprise Actions</h4>
            <button
              onClick={() => navigate('/admin/dashboard/sales-quotations/new')}
              className="w-full py-2 px-3 rounded-lg bg-[#7FB706]/20 hover:bg-[#7FB706]/30 border border-[#7FB706]/40 text-[#B5F823] text-xs font-bold flex items-center justify-between transition-all"
            >
              <span>Create PPS Quotation</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <a
              href={`https://wa.me/${activeConversation.contactPhone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between transition-all"
            >
              <span>Open in WhatsApp Web</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Internal CRM Notes</h4>
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="text-[10px] text-[#B5F823] hover:underline"
              >
                {isSavingNotes ? 'Saving...' : 'Save'}
              </button>
            </div>
            <textarea
              rows={4}
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder="Add project specifications, cubicle quantities, architect names, or delivery site notes..."
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned Tags</h4>
            <div className="flex flex-wrap gap-1">
              {activeConversation.tags?.length ? (
                activeConversation.tags.map((t) => (
                  <span
                    key={t.id}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10"
                  >
                    {t.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">No tags assigned.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Template Picker ────────────────────────────────────────── */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7FB706]" />
                Select Meta WhatsApp Template
              </h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {templates.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No templates found.</p>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      setIsTemplateModalOpen(false);
                    }}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#7FB706] hover:bg-[#7FB706]/10 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#B5F823]">{tpl.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {tpl.status || 'APPROVED'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-2">{tpl.bodyText}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: File / Document Attachment Simulator ───────────────────── */}
      {isAttachmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#7FB706]" />
                Attach Drawing / Document
              </h3>
              <button onClick={() => setIsAttachmentModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-300">Document URL or Pre-loaded PDF</label>
              <input
                type="text"
                placeholder="https://example.com/cubicle-layout-drawing.pdf"
                id="docUrlInput"
                defaultValue="https://pacificproduct.in/catalogs/pacific-restroom-cubicles-2026.pdf"
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs text-white"
              />
              <button
                onClick={() => {
                  const el = document.getElementById('docUrlInput') as HTMLInputElement;
                  setAttachmentPreview({
                    url: el?.value || 'https://pacificproduct.in/catalogs/pacific-restroom-cubicles-2026.pdf',
                    name: 'pacific-restroom-cubicles-2026.pdf',
                    type: 'document',
                  });
                  setIsAttachmentModalOpen(false);
                }}
                className="w-full py-2 rounded-lg bg-[#7FB706] hover:bg-[#8ecb07] text-black font-bold text-xs"
              >
                Attach to Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
