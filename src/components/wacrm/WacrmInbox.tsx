import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  Mic,
  Sparkles,
  Check,
  CheckCheck,
  Clock,
  Phone,
  Building2,
  ExternalLink,
  Search,
  X,
  FileText,
  ArrowUpRight,
  User,
  ShieldCheck,
  ArrowLeft,
  Info,
  ChevronDown,
  RefreshCw,
  Share2,
  Bot,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { wacrmApi } from '../../api/wacrmApi';
import type {
  WacrmConversation,
  WacrmMessage,
  WacrmTemplate,
  WacrmQuickReply,
} from '../../types/admin';

interface WacrmInboxProps {
  conversations: WacrmConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onRefreshConversations: () => void;
  templates: WacrmTemplate[];
  quickReplies: WacrmQuickReply[];
  operatorName: string;
}

// ─── WhatsApp Day Separator Helper ──────────────────────────────────────────
const getDayLabel = (dateStr?: string | Date | null): string => {
  if (!dateStr) return 'Today';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Today';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Resilient Time Formatter (Never prints "Invalid Date") ──────────────────
const formatMsgTime = (timestamp?: string | Date | null): string => {
  if (!timestamp) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

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

  // ─── Responsive Drawer / Sidebar State ──────────────────────────────────────
  const [showContactDrawer, setShowContactDrawer] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

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
    } else {
      setActiveConversation(null);
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
    } else {
      setMessages([]);
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

      // If sending a template, resolve contentText from selectedTemplate body
      const contentTextToSend = isTemplate
        ? selectedTemplate?.bodyText || null
        : messageInput.trim() || attachmentPreview?.name || null;

      const res = await wacrmApi.sendMessage({
        conversationId: activeConversationId,
        contentType: isTemplate ? 'template' : isMedia ? 'document' : 'text',
        contentText: contentTextToSend,
        templateName: isTemplate ? selectedTemplate?.name : null,
        mediaUrl: attachmentPreview?.url || null,
      });

      if (res.data) {
        const newMsg: WacrmMessage = {
          ...res.data,
          createdAt: res.data.createdAt || (res.data as any).created_at || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, newMsg]);
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
    } catch {
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

  // ─── Copy Phone to Clipboard ────────────────────────────────────────────────
  const handleCopyPhone = (phone: string) => {
    navigator.clipboard?.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
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

  // ─── Resolve Template Display Body ──────────────────────────────────────────
  const getTemplateBodyText = (tplName: string, rawText?: string | null): string => {
    if (rawText && !rawText.startsWith('[Template:')) {
      return rawText;
    }
    const matched = templates.find((t) => t.name === tplName);
    if (matched?.bodyText) {
      return matched.bodyText;
    }
    return rawText?.replace(/^\[Template:\s*|\s*\]$/g, '') || `Meta Template: ${tplName}`;
  };

  return (
    <div className="flex-1 flex w-full h-[calc(100dvh-195px)] lg:h-[calc(100vh-135px)] overflow-hidden bg-[#030213] relative">
      {/* ──────────────────────────────────────────────────────────────────────────
          COLUMN 1: Conversation List
          - On Mobile (< md): Hidden when a conversation is active (activeConversationId != null)
          - On Desktop (>= md): Always visible as the left column (w-80 lg:w-96)
      ────────────────────────────────────────────────────────────────────────── */}
      <div
        className={`${
          activeConversationId ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-white/10 flex-col bg-[#07051f]/80 backdrop-blur-md h-full min-h-0`}
      >
        {/* Search & Filter Header */}
        <div className="p-3 border-b border-white/10 space-y-2 bg-[#0a0826]/90">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats, numbers, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* WhatsApp Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/5">
            {(['all', 'open', 'pending', 'closed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${
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

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 overscroll-contain">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto text-gray-600 mb-2 stroke-1" />
              <p className="font-medium">No conversations found.</p>
              <p className="text-[11px] text-gray-500 mt-1">
                New WhatsApp inbound inquiries will appear here automatically.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative cursor-pointer ${
                    isActive
                      ? 'bg-[#7FB706]/15 border-l-4 border-[#7FB706]'
                      : 'hover:bg-white/[0.04] active:bg-white/[0.08]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#7FB706]/30 via-emerald-600/30 to-blue-600/30 border border-white/10 flex items-center justify-center text-sm font-black text-white flex-shrink-0 shadow-inner">
                    {conv.contactName?.[0]?.toUpperCase() || <User className="w-4 h-4 text-gray-300" />}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate">
                        {conv.contactName || conv.contactPhone}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {formatMsgTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>

                    {conv.contactCompany && (
                      <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <span className="truncate">{conv.contactCompany}</span>
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

                      {conv.tags?.slice(0, 2).map((t) => (
                        <span
                          key={t.id}
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-gray-300 truncate max-w-[90px]"
                        >
                          {t.name}
                        </span>
                      ))}

                      {conv.unreadCount > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#B5F823] text-black text-[10px] font-black flex items-center justify-center shadow-sm">
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

      {/* ──────────────────────────────────────────────────────────────────────────
          COLUMN 2: Active WhatsApp Chat Thread
          - On Mobile (< md): Visible when activeConversationId != null, hidden when null
          - On Desktop (>= md): Always visible flex-1 container
      ────────────────────────────────────────────────────────────────────────── */}
      <div
        className={`${
          activeConversationId ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col bg-[#05031a] relative h-full min-h-0 min-w-0`}
      >
        {activeConversation ? (
          <>
            {/* ─── Thread Header (WhatsApp Real App Style) ─── */}
            <div className="px-3 sm:px-4 py-2.5 border-b border-white/10 bg-[#0c0a24]/95 backdrop-blur-md flex items-center justify-between gap-2 z-20 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Mobile Back Button (Returns to Conversation List) */}
                <button
                  onClick={() => onSelectConversation(null)}
                  className="md:hidden p-1.5 -ml-1 rounded-full text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                  title="Back to Chats"
                  aria-label="Back to chat list"
                >
                  <ArrowLeft className="w-5 h-5 text-[#B5F823]" />
                </button>

                {/* Contact Avatar (Clickable to toggle Contact 360) */}
                <button
                  onClick={() => setShowContactDrawer(!showContactDrawer)}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7FB706]/40 to-blue-500/30 border border-[#7FB706]/40 flex items-center justify-center text-sm font-black text-white flex-shrink-0 hover:ring-2 hover:ring-[#7FB706]/60 transition-all cursor-pointer"
                  title="View Contact Details"
                >
                  {activeConversation.contactName?.[0]?.toUpperCase() || 'C'}
                </button>

                {/* Contact Details Header Info */}
                <div
                  onClick={() => setShowContactDrawer(!showContactDrawer)}
                  className="min-w-0 cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-black text-white tracking-tight truncate group-hover:text-[#B5F823] transition-colors">
                      {activeConversation.contactName || activeConversation.contactPhone}
                    </h2>
                    <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 truncate">
                    <span className="text-emerald-400/90 font-mono flex items-center gap-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      {activeConversation.contactPhone}
                    </span>
                    {activeConversation.contactCompany && (
                      <span className="truncate hidden sm:inline text-gray-400">
                        • {activeConversation.contactCompany}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Status Selector Dropdown */}
                <select
                  value={activeConversation.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value as 'open' | 'pending' | 'closed';
                    await wacrmApi.updateConversation(activeConversation.id, { status: newStatus });
                    setActiveConversation((prev) => (prev ? { ...prev, status: newStatus } : null));
                    onRefreshConversations();
                  }}
                  className="bg-black/50 border border-white/15 text-[11px] font-bold rounded-lg px-2 py-1 text-white focus:outline-none focus:border-[#7FB706] cursor-pointer"
                >
                  <option value="open">🟢 Open</option>
                  <option value="pending">🟡 Pending</option>
                  <option value="closed">⚪ Closed</option>
                </select>

                {/* Refresh Thread */}
                <button
                  onClick={() => fetchMessages(activeConversation.id)}
                  title="Refresh messages"
                  className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {/* Contact 360 Toggle Button */}
                <button
                  onClick={() => setShowContactDrawer(!showContactDrawer)}
                  title="Contact 360 Overview"
                  className={`p-1.5 rounded-lg border transition-colors ${
                    showContactDrawer
                      ? 'bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]'
                      : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── Messages Canvas with WhatsApp Obsidian Pattern ─── */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3 bg-[radial-gradient(#1a1745_1px,transparent_1px)] [background-size:20px_20px] overscroll-contain">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mb-2 text-[#7FB706]" />
                  <span>Loading WhatsApp messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 text-xs p-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-[#7FB706]">
                    <MessageSquare className="w-7 h-7 stroke-1" />
                  </div>
                  <p className="font-bold text-white text-sm">No messages yet in this conversation</p>
                  <p className="text-gray-400 mt-1 max-w-xs text-xs">
                    Send a direct message or select a Meta-approved template below to start the conversation.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isAgent = msg.senderType === 'agent';
                  const isBot = msg.senderType === 'bot';
                  const isCustomer = msg.senderType === 'customer';

                  // Date divider check
                  const currentMsgDate = (msg.createdAt || (msg as any).created_at);
                  const prevMsgDate = index > 0 ? (messages[index - 1].createdAt || (messages[index - 1] as any).created_at) : null;
                  const currentDay = getDayLabel(currentMsgDate);
                  const prevDay = prevMsgDate ? getDayLabel(prevMsgDate) : null;
                  const showDateDivider = index === 0 || currentDay !== prevDay;

                  return (
                    <React.Fragment key={msg.id}>
                      {/* WhatsApp Centered Date Pill */}
                      {showDateDivider && (
                        <div className="flex justify-center my-3">
                          <span className="px-3 py-1 rounded-lg bg-[#141238]/90 border border-white/10 text-[11px] font-semibold text-gray-300 shadow-md uppercase tracking-wider backdrop-blur-sm">
                            {currentDay}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble Container */}
                      <div
                        className={`flex flex-col ${
                          isCustomer ? 'items-start' : 'items-end'
                        } relative group`}
                      >
                        {/* Only show AI Assistant tag for Bot messages; NO redundant sender name or email above agent/customer bubbles */}
                        {isBot && (
                          <div className="text-[10px] text-purple-400 mb-1 px-1 flex items-center gap-1 font-semibold">
                            <Bot className="w-3.5 h-3.5 text-purple-400" />
                            <span>AI Assistant</span>
                          </div>
                        )}

                        {/* Bubble Body */}
                        <div
                          className={`max-w-[88%] sm:max-w-md md:max-w-lg rounded-2xl px-3.5 py-2.5 shadow-md relative transition-all ${
                            isCustomer
                              ? 'bg-[#15123d] text-white border border-white/10 rounded-tl-xs'
                              : isBot
                              ? 'bg-purple-950/70 text-white border border-purple-500/40 rounded-tr-xs'
                              : 'bg-gradient-to-br from-[#1c3807] via-[#152c04] to-[#0c1a02] text-white border border-[#7FB706]/40 rounded-tr-xs'
                          }`}
                        >
                          {/* Meta Approved Template Badge */}
                          {msg.templateName && (
                            <div className="mb-1.5 pb-1 border-b border-white/10 text-[10px] font-bold text-[#B5F823] flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#7FB706]" />
                              <span>Meta Template • {msg.templateName}</span>
                            </div>
                          )}

                          {/* Media Preview (Audio / Image / Document) */}
                          {msg.mediaUrl && (
                            <div className="mb-2">
                              {msg.contentType === 'audio' ? (
                                <audio controls src={msg.mediaUrl} className="w-full h-8 rounded" />
                              ) : msg.contentType === 'image' ? (
                                <img
                                  src={msg.mediaUrl}
                                  alt="WhatsApp media"
                                  className="rounded-lg max-h-56 object-cover border border-white/10"
                                />
                              ) : (
                                <a
                                  href={msg.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-[#B5F823] hover:underline"
                                >
                                  <FileText className="w-4 h-4 text-[#7FB706]" />
                                  <span className="truncate">Attached Document / Drawing</span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Message Content Text (Cleanly resolved without bracket repetition) */}
                          {msg.templateName ? (
                            <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words text-gray-100">
                              {getTemplateBodyText(msg.templateName, msg.contentText)}
                            </p>
                          ) : msg.contentText ? (
                            <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words text-gray-100">
                              {msg.contentText}
                            </p>
                          ) : null}

                          {/* Interactive Buttons / Choices Payload */}
                          {msg.interactivePayload?.buttons && (
                            <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                              {msg.interactivePayload.buttons.map((btn: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 text-[11px] rounded-lg bg-white/10 text-white font-medium border border-white/20"
                                >
                                  🔘 {btn.title || btn}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Bottom-Right Corner: Timestamp & Status Ticks */}
                          <div className="flex items-center justify-end gap-1 text-[10px] text-gray-400 mt-1 select-none">
                            <span>
                              {formatMsgTime(msg.createdAt || (msg as any).created_at)}
                            </span>
                            {!isCustomer && (
                              <span className="inline-flex items-center">
                                {msg.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
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

                          {/* Floating Emoji Reaction Badge */}
                          {msg.reaction && (
                            <div
                              onClick={() => handleReactToMessage(msg.id, msg.reaction!)}
                              title="Click to remove reaction"
                              className="absolute -bottom-2.5 right-2 bg-[#12102e] border border-white/20 rounded-full px-1.5 py-0.5 text-xs shadow-lg cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                            >
                              <span>{msg.reaction}</span>
                            </div>
                          )}
                        </div>

                        {/* Subtle Reaction Trigger (Smiley icon on hover/tap, NO clunky "React" text) */}
                        <div className="flex items-center gap-1 mt-0.5 px-1">
                          <button
                            onClick={() =>
                              setReactionPopoverMsgId(reactionPopoverMsgId === msg.id ? null : msg.id)
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white p-1 rounded-full hover:bg-white/10"
                            title="React with emoji"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Floating Emoji Picker Popover */}
                        {reactionPopoverMsgId === msg.id && (
                          <div className="flex items-center gap-1.5 bg-[#19163f] border border-white/20 p-1.5 rounded-full shadow-2xl mt-1 z-30 animate-in fade-in zoom-in-95">
                            {['👍', '❤️', '😂', '🔥', '🙏', '👏'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReactToMessage(msg.id, emoji)}
                                className="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-sm cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ─── Canned / Quick Reply Popover Menu ─── */}
            {showQuickReplyMenu && (
              <div className="absolute bottom-20 left-4 right-4 max-w-md bg-[#131130] border border-[#7FB706]/40 rounded-2xl shadow-2xl p-2 z-30 space-y-1 backdrop-blur-md">
                <div className="text-[10px] uppercase font-bold text-gray-400 px-2 py-1 flex items-center justify-between border-b border-white/10">
                  <span>Quick Replies (/shortcut)</span>
                  <span>Esc to dismiss</span>
                </div>
                {quickReplies
                  .filter((q) => q.shortcut.toLowerCase().includes(quickReplyFilter))
                  .map((qr) => (
                    <button
                      key={qr.id}
                      onClick={() => handleSelectQuickReply(qr)}
                      className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-[#7FB706]/20 flex items-center justify-between text-xs transition-colors"
                    >
                      <span className="font-bold text-[#B5F823]">{qr.shortcut}</span>
                      <span className="text-gray-300 truncate max-w-[200px]">{qr.title}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* ─── WhatsApp Style Bottom Composer ─── */}
            <div className="p-2 sm:p-3 border-t border-white/10 bg-[#0c0a24]/95 backdrop-blur-md flex-shrink-0">
              {/* Selected Template / Attachment / AI Banner Chips */}
              {(selectedTemplate || attachmentPreview || aiDraftBadge) && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {selectedTemplate && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Template: {selectedTemplate.name}
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="hover:text-white ml-1 p-0.5 rounded-full hover:bg-white/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {attachmentPreview && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      <FileText className="w-3.5 h-3.5" />
                      {attachmentPreview.name}
                      <button
                        onClick={() => setAttachmentPreview(null)}
                        className="hover:text-white ml-1 p-0.5 rounded-full hover:bg-white/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {aiDraftBadge && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      <Sparkles className="w-3.5 h-3.5" />
                      Drafted by {aiDraftBadge}
                    </span>
                  )}
                </div>
              )}

              {/* Input Action Bar */}
              <div className="flex items-end gap-1.5 sm:gap-2">
                {/* Left Attachment & Template Controls */}
                <div className="flex items-center gap-1 pb-1">
                  {/* Meta Template Trigger */}
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="Insert Meta WhatsApp Template"
                  >
                    <FileText className="w-4 h-4 text-[#B5F823]" />
                  </button>

                  {/* Attachment Picker */}
                  <button
                    onClick={() => setIsAttachmentModalOpen(true)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="Attach Drawing / PDF"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* AI Draft Button */}
                  <button
                    onClick={handleGenerateAiReply}
                    disabled={isGeneratingAi}
                    className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 hover:text-white transition-colors disabled:opacity-40"
                    title="Generate AI response draft"
                  >
                    <Sparkles className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Voice Note Active Recording Strip */}
                {isRecording ? (
                  <div className="flex-1 flex items-center justify-between bg-rose-500/20 border border-rose-500/40 px-3 py-2 rounded-2xl text-rose-300 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="font-bold">Recording Voice Note: {recordingSeconds}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => stopRecording(false)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors"
                      >
                        Done
                      </button>
                      <button
                        onClick={() => stopRecording(true)}
                        className="text-gray-400 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Rounded Textarea Input Pill */
                  <div className="flex-1 bg-black/50 border border-white/15 focus-within:border-[#7FB706] rounded-2xl px-3 py-1.5 flex items-center transition-colors">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={messageInput}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message or '/' for canned replies... (Enter to send)"
                      className="w-full bg-transparent text-xs sm:text-[13px] text-white placeholder-gray-500 focus:outline-none resize-none max-h-24 overflow-y-auto leading-relaxed"
                    />
                  </div>
                )}

                {/* Send / Mic Button */}
                {messageInput.trim() || selectedTemplate || attachmentPreview ? (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isSending}
                    className="w-10 h-10 rounded-full bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#7FB706]/20 disabled:opacity-40 transition-all cursor-pointer"
                    title="Send WhatsApp message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
                    title="Record Voice Note"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Empty Chat State (Desktop) */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 select-none">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#7FB706]/15 to-blue-500/10 border border-white/10 flex items-center justify-center mb-4 text-[#7FB706] shadow-xl">
              <MessageSquare className="w-10 h-10 stroke-1" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-1">
              WhatsApp CRM for Pacific Restroom Cubicles
            </h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Select any customer conversation from the list to view chat logs, send quotations, or generate AI replies.
            </p>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          COLUMN 3: Contact 360 Right Sidebar / Mobile Slide-Over Drawer
          - On Desktop (>= xl): Smooth collapsible sidebar (w-80)
          - On Mobile / Tablet (< xl): Slide-over drawer with backdrop overlay
      ────────────────────────────────────────────────────────────────────────── */}
      {activeConversation && showContactDrawer && (
        <>
          {/* Backdrop Overlay for Mobile / Tablet */}
          <div
            onClick={() => setShowContactDrawer(false)}
            className="xl:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          <div
            className={`fixed xl:static top-0 right-0 bottom-0 z-50 xl:z-10 w-80 md:w-88 flex-shrink-0 border-l border-white/10 bg-[#07051f]/95 backdrop-blur-md p-4 flex flex-col overflow-y-auto space-y-4 shadow-2xl transition-transform duration-200 h-full`}
          >
            {/* Header & Close Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#7FB706]" />
                <span>Contact 360</span>
              </h3>
              <button
                onClick={() => setShowContactDrawer(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Card */}
            <div className="text-center pb-3 border-b border-white/10">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#7FB706] to-emerald-400 text-black font-black text-xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-[#7FB706]/20">
                {activeConversation.contactName?.[0]?.toUpperCase() || 'C'}
              </div>
              <h3 className="text-sm font-black text-white">{activeConversation.contactName}</h3>

              {/* Phone with 1-click Copy */}
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-xs text-emerald-400 font-mono">{activeConversation.contactPhone}</span>
                <button
                  onClick={() => handleCopyPhone(activeConversation.contactPhone)}
                  className="text-gray-400 hover:text-white transition-colors p-0.5"
                  title="Copy Phone Number"
                >
                  {copiedPhone ? (
                    <CheckCircle className="w-3.5 h-3.5 text-[#B5F823]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {activeConversation.contactCompany && (
                <p className="text-xs font-semibold text-[#B5F823] mt-0.5">
                  {activeConversation.contactCompany}
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Enterprise Actions
              </h4>
              <button
                onClick={() => navigate('/admin/dashboard/sales-quotations/new')}
                className="w-full py-2 px-3 rounded-xl bg-[#7FB706]/20 hover:bg-[#7FB706]/30 border border-[#7FB706]/40 text-[#B5F823] text-xs font-bold flex items-center justify-between transition-all"
              >
                <span>Create PPS Quotation</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <a
                href={`https://wa.me/${activeConversation.contactPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between transition-all"
              >
                <span>Open in WhatsApp Web</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Internal CRM Notes */}
            <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Internal CRM Notes
                </h4>
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="text-[10px] text-[#B5F823] font-bold hover:underline disabled:opacity-40"
                >
                  {isSavingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
              <textarea
                rows={4}
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                placeholder="Add project specifications, cubicle quantities, architect names, or delivery site notes..."
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] resize-none leading-relaxed flex-1"
              />
            </div>

            {/* Assigned Tags */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Assigned Tags
              </h4>
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
        </>
      )}

      {/* ─── MODAL: Template Picker ─── */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7FB706]" />
                Select Meta WhatsApp Template
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
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

      {/* ─── MODAL: File / Document Attachment Simulator ─── */}
      {isAttachmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#7FB706]" />
                Attach Drawing / Document
              </h3>
              <button
                onClick={() => setIsAttachmentModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-300">
                Document URL or Pre-loaded PDF
              </label>
              <input
                type="text"
                placeholder="https://example.com/cubicle-layout-drawing.pdf"
                id="docUrlInput"
                defaultValue="https://pacificproduct.in/catalogs/pacific-restroom-cubicles-2026.pdf"
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
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
                className="w-full py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-bold text-xs shadow-lg shadow-[#7FB706]/20 transition-all cursor-pointer"
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
