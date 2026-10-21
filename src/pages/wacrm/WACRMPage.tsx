import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Users,
  GitBranch,
  Radio,
  Settings,
  Search,
  Plus,
  Send,
  Phone,
  Building2,
  Mail,
  ExternalLink,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  Paperclip,
  Smile,
  FileText,
  DollarSign,
  Tag,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Inbox,
  Filter,
  Trash2,
  Edit2,
  Layers,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { wacrmApi } from '../../api/wacrmApi';
import type {
  WacrmContact,
  WacrmConversation,
  WacrmMessage,
  WacrmPipelineStage,
  WacrmDeal,
  WacrmTemplate,
  WacrmTag,
  WacrmBroadcast,
  WacrmConfig,
  WacrmDashboardData,
  CreateWacrmContactInput,
  CreateWacrmDealInput,
} from '../../types/admin';

type WacrmTab = 'inbox' | 'contacts' | 'pipeline' | 'broadcasts' | 'config';

const formatInr = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN');
};

export default function WACRMPage() {
  const { user } = useAdminAuth();

  // ─── Active Tab State ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<WacrmTab>('inbox');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Dashboard Stats ────────────────────────────────────────────────────────
  const [dashboard, setDashboard] = useState<WacrmDashboardData | null>(null);

  // ─── Inbox States ────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<WacrmConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<WacrmConversation | null>(null);
  const [messages, setMessages] = useState<WacrmMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [conversationFilter, setConversationFilter] = useState<'all' | 'open' | 'pending' | 'closed'>('all');
  const [inboxSearch, setInboxSearch] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Contacts States ─────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<WacrmContact[]>([]);
  const [contactsSearch, setContactsSearch] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<WacrmContact | null>(null);

  // ─── Pipeline States ─────────────────────────────────────────────────────────
  const [stages, setStages] = useState<WacrmPipelineStage[]>([]);
  const [deals, setDeals] = useState<WacrmDeal[]>([]);
  const [pipelineId, setPipelineId] = useState<string>('');
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);

  // ─── Broadcasts States ───────────────────────────────────────────────────────
  const [broadcasts, setBroadcasts] = useState<WacrmBroadcast[]>([]);
  const [isNewBroadcastModalOpen, setIsNewBroadcastModalOpen] = useState(false);

  // ─── Meta Config & Templates ─────────────────────────────────────────────────
  const [config, setConfig] = useState<WacrmConfig | null>(null);
  const [templates, setTemplates] = useState<WacrmTemplate[]>([]);
  const [tags, setTags] = useState<WacrmTag[]>([]);
  const [configForm, setConfigForm] = useState({
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    verifyToken: 'pacific_wacrm_verify_secret',
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // ─── Form Inputs ─────────────────────────────────────────────────────────────
  const [contactForm, setContactForm] = useState<CreateWacrmContactInput>({
    phone: '',
    name: '',
    email: '',
    company: '',
    notes: '',
    status: 'lead',
    tags: [],
  });

  const [dealForm, setDealForm] = useState({
    title: '',
    value: 0,
    stageId: '',
    contactId: '',
    notes: '',
    expectedCloseDate: '',
  });

  const [broadcastForm, setBroadcastForm] = useState({
    name: '',
    templateName: '',
  });

  // ─── Clear notification banners ─────────────────────────────────────────────
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  // ─── Fetch Initial Data ──────────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, convsRes, contactsRes, pipeRes, castsRes, tplRes, tagsRes, confRes] = await Promise.all([
        wacrmApi.getDashboard().catch(() => ({ data: null })),
        wacrmApi.getConversations().catch(() => ({ data: [] })),
        wacrmApi.getContacts().catch(() => ({ data: [] })),
        wacrmApi.getPipeline().catch(() => ({ data: { pipeline: { id: '', name: '' }, stages: [], deals: [] } })),
        wacrmApi.getBroadcasts().catch(() => ({ data: [] })),
        wacrmApi.getTemplates().catch(() => ({ data: [] })),
        wacrmApi.getTags().catch(() => ({ data: [] })),
        wacrmApi.getConfig().catch(() => ({ data: null })),
      ]);

      if (dashRes.data) setDashboard(dashRes.data);
      if (convsRes.data) {
        setConversations(convsRes.data);
        if (convsRes.data.length > 0 && !activeConversationId) {
          setActiveConversationId(convsRes.data[0].id);
        }
      }
      if (contactsRes.data) setContacts(contactsRes.data);
      if (pipeRes.data) {
        setPipelineId(pipeRes.data.pipeline?.id || '');
        setStages(pipeRes.data.stages || []);
        setDeals(pipeRes.data.deals || []);
      }
      if (castsRes.data) setBroadcasts(castsRes.data);
      if (tplRes.data) setTemplates(tplRes.data);
      if (tagsRes.data) setTags(tagsRes.data);
      if (confRes.data) {
        setConfig(confRes.data);
        setConfigForm({
          phoneNumberId: confRes.data.phoneNumberId || '',
          wabaId: confRes.data.wabaId || '',
          accessToken: '',
          verifyToken: confRes.data.verifyToken || 'pacific_wacrm_verify_secret',
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize WhatsApp CRM data');
    } finally {
      setLoading(false);
    }
  }, [activeConversationId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ─── Auto-scroll Messages to Bottom ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Fetch Active Conversation Messages ──────────────────────────────────────
  const loadActiveConversation = useCallback(async (id: string) => {
    try {
      const res = await wacrmApi.getConversation(id);
      setActiveConversation(res.data.conversation);
      setMessages(res.data.messages);
      // Clear unread badge in state
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err: any) {
      console.warn('Could not load messages:', err.message);
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      loadActiveConversation(activeConversationId);
    }
  }, [activeConversationId, loadActiveConversation]);

  // ─── Polling / Refresh Interval ──────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'inbox' && activeConversationId) {
        loadActiveConversation(activeConversationId);
        wacrmApi.getConversations(conversationFilter, inboxSearch).then((res) => {
          if (res.data) setConversations(res.data);
        }).catch(() => {});
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [activeTab, activeConversationId, conversationFilter, inboxSearch, loadActiveConversation]);

  // ─── Send Message Handler ────────────────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() && !selectedTemplateName) return;
    if (!activeConversationId && !activeConversation) return;

    try {
      setIsSendingMessage(true);
      const isTemplate = Boolean(selectedTemplateName);
      const res = await wacrmApi.sendMessage({
        conversationId: activeConversationId || undefined,
        contentType: isTemplate ? 'template' : 'text',
        contentText: isTemplate ? null : messageInput.trim(),
        templateName: isTemplate ? selectedTemplateName : null,
      });

      setMessageInput('');
      setSelectedTemplateName('');
      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
      }
      // Update snippet in conversation list
      if (activeConversationId) {
        const preview = isTemplate ? `[Template: ${selectedTemplateName}]` : messageInput.trim();
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? { ...c, lastMessageText: preview, lastMessageAt: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch WhatsApp message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ─── Switch Chat from Contacts View ──────────────────────────────────────────
  const handleOpenChatWithContact = (contact: WacrmContact) => {
    if (contact.conversationId) {
      setActiveConversationId(contact.conversationId);
      setActiveTab('inbox');
    } else {
      // Create conversation
      wacrmApi
        .sendMessage({
          contactId: contact.id,
          contentType: 'text',
          contentText: 'Hello, welcome to Pacific Restroom Cubicles & Modular Lockers!',
        })
        .then(() => {
          wacrmApi.getConversations().then((res) => {
            if (res.data) setConversations(res.data);
            const found = res.data.find((c) => c.contactId === contact.id);
            if (found) setActiveConversationId(found.id);
            setActiveTab('inbox');
          });
        });
    }
  };

  // ─── Add or Update Contact ───────────────────────────────────────────────────
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim()) {
      setErrorMessage('Name and phone number are required');
      return;
    }

    try {
      if (editingContact) {
        await wacrmApi.updateContact(editingContact.id, contactForm);
        setSuccessMessage('Contact updated successfully');
      } else {
        await wacrmApi.createContact(contactForm);
        setSuccessMessage('Contact created successfully');
      }
      setIsAddContactModalOpen(false);
      setEditingContact(null);
      setContactForm({ phone: '', name: '', email: '', company: '', notes: '', status: 'lead', tags: [] });
      const cRes = await wacrmApi.getContacts();
      if (cRes.data) setContacts(cRes.data);
      const convRes = await wacrmApi.getConversations();
      if (convRes.data) setConversations(convRes.data);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save contact');
    }
  };

  // ─── Delete Contact ──────────────────────────────────────────────────────────
  const handleDeleteContact = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact and its conversation history?')) return;
    try {
      await wacrmApi.deleteContact(id);
      setSuccessMessage('Contact deleted');
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setConversations((prev) => prev.filter((c) => c.contactId !== id));
      if (activeConversation?.contactId === id) {
        setActiveConversation(null);
        setActiveConversationId(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete contact');
    }
  };

  // ─── Add Deal ────────────────────────────────────────────────────────────────
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealForm.title.trim() || !dealForm.stageId) {
      setErrorMessage('Deal title and stage are required');
      return;
    }

    try {
      const res = await wacrmApi.createDeal({
        pipelineId: pipelineId || stages[0]?.pipelineId,
        stageId: dealForm.stageId,
        contactId: dealForm.contactId || null,
        title: dealForm.title.trim(),
        value: Number(dealForm.value) || 0,
        notes: dealForm.notes || null,
        expectedCloseDate: dealForm.expectedCloseDate || null,
      });

      setSuccessMessage('Deal added to pipeline');
      setIsAddDealModalOpen(false);
      setDealForm({ title: '', value: 0, stageId: '', contactId: '', notes: '', expectedCloseDate: '' });
      if (res.data) setDeals((prev) => [res.data, ...prev]);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create deal');
    }
  };

  // ─── Advance Deal Stage ──────────────────────────────────────────────────────
  const handleMoveDealStage = async (dealId: string, currentStageId: string, direction: 'next' | 'prev') => {
    const currentIndex = stages.findIndex((s) => s.id === currentStageId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;
    const targetStage = stages[targetIndex];

    try {
      await wacrmApi.updateDeal(dealId, { stageId: targetStage.id });
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stageId: targetStage.id } : d))
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update deal stage');
    }
  };

  // ─── Launch Broadcast Campaign ───────────────────────────────────────────────
  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.name.trim() || !broadcastForm.templateName) {
      setErrorMessage('Campaign name and template selection required');
      return;
    }

    try {
      const res = await wacrmApi.createBroadcast({
        name: broadcastForm.name.trim(),
        templateName: broadcastForm.templateName,
      });
      setSuccessMessage('Broadcast campaign scheduled & dispatched');
      setIsNewBroadcastModalOpen(false);
      setBroadcastForm({ name: '', templateName: '' });
      if (res.data) setBroadcasts((prev) => [res.data, ...prev]);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to launch broadcast');
    }
  };

  // ─── Save Meta WhatsApp Config ───────────────────────────────────────────────
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.phoneNumberId.trim() || !configForm.accessToken.trim()) {
      setErrorMessage('Phone Number ID and Access Token are required');
      return;
    }

    try {
      setIsSavingConfig(true);
      await wacrmApi.saveConfig(configForm);
      setSuccessMessage('Meta WhatsApp Cloud API credentials saved successfully');
      const confRes = await wacrmApi.getConfig();
      if (confRes.data) setConfig(confRes.data);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save WhatsApp Cloud API configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // ─── Filtered Lists ──────────────────────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchStatus = conversationFilter === 'all' || c.status === conversationFilter;
      const matchSearch =
        !inboxSearch.trim() ||
        c.contactName?.toLowerCase().includes(inboxSearch.toLowerCase()) ||
        c.contactPhone?.includes(inboxSearch) ||
        c.lastMessageText?.toLowerCase().includes(inboxSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [conversations, conversationFilter, inboxSearch]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch =
        !contactsSearch.trim() ||
        c.name.toLowerCase().includes(contactsSearch.toLowerCase()) ||
        c.phone.includes(contactsSearch) ||
        (c.company && c.company.toLowerCase().includes(contactsSearch.toLowerCase()));
      const matchTag =
        !selectedTagFilter ||
        (c.tags && c.tags.some((t) => t.name === selectedTagFilter));
      return matchSearch && matchTag;
    });
  }, [contacts, contactsSearch, selectedTagFilter]);

  return (
    <div className="min-h-screen bg-[#030213] text-white flex flex-col font-sans">
      {/* ─── Top Enterprise Header ─────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-[#0f0e26]/80 backdrop-blur-md px-4 sm:px-6 py-4 sticky top-0 z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823] shadow-lg shadow-[#7FB706]/10">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  WhatsApp CRM <span className="text-[#B5F823]">WACRM</span>
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/30 uppercase tracking-widest">
                  Enterprise
                </span>
                {config?.status === 'connected' ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Meta Cloud Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Simulator Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Official Meta WhatsApp Business Cloud API &bull; Operator:{' '}
                <strong className="text-white">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'Pacific Admin'}
                </strong>{' '}
                ({user?.role})
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#B5F823]" />
              <span className="text-xs text-gray-400">Contacts:</span>
              <span className="text-xs font-bold text-white font-mono">{contacts.length}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-[#7FB706]" />
              <span className="text-xs text-gray-400">Chats:</span>
              <span className="text-xs font-bold text-white font-mono">{conversations.length}</span>
            </div>
            <div className="bg-[#7FB706]/15 border border-[#7FB706]/30 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#B5F823]" />
              <span className="text-xs text-gray-300">Pipeline:</span>
              <span className="text-xs font-black text-[#B5F823] font-mono">
                ₹{formatInr(deals.reduce((acc, d) => acc + (Number(d.value) || 0), 0))}
              </span>
            </div>
            <button
              onClick={loadInitialData}
              title="Refresh"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ─── Navigation Sub-Tabs ─────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto no-scrollbar pt-1">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'inbox'
                ? 'bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black shadow-lg shadow-[#7FB706]/20'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Shared Inbox
            {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black">
                {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'contacts'
                ? 'bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black shadow-lg shadow-[#7FB706]/20'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            Contacts & Leads ({contacts.length})
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'pipeline'
                ? 'bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black shadow-lg shadow-[#7FB706]/20'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Sales Pipelines ({deals.length})
          </button>

          <button
            onClick={() => setActiveTab('broadcasts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'broadcasts'
                ? 'bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black shadow-lg shadow-[#7FB706]/20'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Radio className="w-4 h-4" />
            Broadcast Campaigns ({broadcasts.length})
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ml-auto ${
              activeTab === 'config'
                ? 'bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black shadow-lg shadow-[#7FB706]/20'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-4 h-4" />
            Meta API Config
          </button>
        </div>
      </div>

      {/* ─── Notification Banners ─────────────────────────────────────────── */}
      {errorMessage && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-[#7FB706]/15 border-b border-[#7FB706]/30 px-6 py-2.5 flex items-center justify-between text-xs text-[#B5F823]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#7FB706]" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── TAB 1: SHARED INBOX ──────────────────────────────────────────── */}
      {activeTab === 'inbox' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-130px)]">
          {/* Conversation List (Left Panel) */}
          <div className="w-full lg:w-80 xl:w-96 border-r border-white/10 bg-[#0f0e26]/60 flex flex-col h-full">
            {/* Search and Filters */}
            <div className="p-3 border-b border-white/10 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chats, phone, name..."
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-1">
                {(['all', 'open', 'pending', 'closed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setConversationFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition ${
                      conversationFilter === st
                        ? 'bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40'
                        : 'text-gray-400 hover:text-white bg-white/5'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#7FB706]" />
                  No conversations matching current filter.
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActive = c.id === activeConversationId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveConversationId(c.id)}
                      className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                        isActive
                          ? 'bg-[#7FB706]/15 border-l-4 border-l-[#B5F823]'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7FB706]/30 to-[#0f0e26] border border-[#7FB706]/40 flex items-center justify-center text-sm font-black text-[#B5F823] shrink-0">
                        {c.contactName?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white truncate">{c.contactName}</h4>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {c.lastMessageText || 'No messages yet'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[9px] font-mono text-gray-500">{c.contactPhone}</span>
                          {c.tags && c.tags.slice(0, 2).map((t) => (
                            <span
                              key={t.id}
                              className="text-[9px] px-1.5 py-0.2 rounded font-semibold"
                              style={{ backgroundColor: `${t.color}25`, color: t.color }}
                            >
                              {t.name}
                            </span>
                          ))}
                          {c.unreadCount > 0 && (
                            <span className="ml-auto px-1.5 py-0.2 rounded-full bg-[#7FB706] text-black text-[10px] font-black">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Chat Thread (Center Panel) */}
          {activeConversation ? (
            <div className="flex-1 flex flex-col bg-[#030213] relative h-full">
              {/* Thread Header */}
              <div className="p-3.5 border-b border-white/10 bg-[#0f0e26]/70 backdrop-blur-sm flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center font-bold text-[#B5F823]">
                    {activeConversation.contactName?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{activeConversation.contactName}</h3>
                      <span className="text-[10px] font-mono text-gray-400">{activeConversation.contactPhone}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {activeConversation.contactCompany ? `${activeConversation.contactCompany} &bull; ` : ''}
                      Assigned:{' '}
                      <strong className="text-gray-300">
                        {activeConversation.assignedAgentName || 'Unassigned'}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${activeConversation.contactPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp Web</span>
                  </a>
                  <select
                    value={activeConversation.status}
                    onChange={(e) =>
                      wacrmApi
                        .updateConversation(activeConversation.id, {
                          status: e.target.value as any,
                        })
                        .then(() => {
                          setActiveConversation({ ...activeConversation, status: e.target.value as any });
                        })
                    }
                    className="bg-white/5 border border-white/10 text-xs rounded-xl px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Messages Scroll View (WhatsApp Dark Wallpaper Style) */}
              <div
                className="flex-1 p-4 overflow-y-auto space-y-3 bg-[radial-gradient(#121226_1px,transparent_1px)] [background-size:16px_16px]"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 text-xs">
                    <Sparkles className="w-8 h-8 text-[#7FB706] mb-2 opacity-50" />
                    <p className="font-semibold text-gray-400">Fresh WhatsApp Thread</p>
                    <p className="text-[11px] max-w-xs mt-1">
                      Type a message below or select an approved Meta template to start conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAgent = m.senderType === 'agent';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md p-3.5 rounded-2xl text-xs relative shadow-md leading-relaxed ${
                            isAgent
                              ? 'bg-gradient-to-br from-[#7FB706]/25 to-[#0f0e26] border border-[#7FB706]/40 text-white rounded-br-none'
                              : 'bg-[#121226] border border-white/10 text-gray-200 rounded-bl-none'
                          }`}
                        >
                          {m.senderName && (
                            <span className="text-[10px] font-bold text-[#B5F823] block mb-1">
                              {m.senderName}
                            </span>
                          )}
                          <p className="whitespace-pre-wrap">{m.contentText}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-gray-400">
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isAgent && (
                              <span>
                                {m.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#B5F823]" />
                                ) : m.status === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Template Chips */}
              <div className="px-3 py-1.5 bg-[#0f0e26] border-t border-white/10 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
                  Quick Templates:
                </span>
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplateName(tpl.name);
                      setMessageInput(tpl.bodyText);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#7FB706]/20 text-gray-300 hover:text-[#B5F823] border border-white/5 text-[11px] whitespace-nowrap transition"
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="p-3 bg-[#0f0e26] border-t border-white/10 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={
                    selectedTemplateName
                      ? `Template [${selectedTemplateName}] ready to send...`
                      : 'Type a WhatsApp message...'
                  }
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none transition"
                />

                <button
                  type="submit"
                  disabled={isSendingMessage || (!messageInput.trim() && !selectedTemplateName)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500">
              <MessageSquare className="w-12 h-12 text-[#7FB706] opacity-30 mb-3" />
              <p className="text-sm font-bold text-white">No Conversation Selected</p>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                Select a conversation from the left drawer or start a new conversation from the Contacts list.
              </p>
            </div>
          )}

          {/* Right Contact Card & Deal Context */}
          {activeConversation && (
            <div className="hidden xl:flex w-80 border-l border-white/10 bg-[#0f0e26]/60 flex-col p-4 space-y-5 overflow-y-auto">
              <div className="text-center pb-4 border-b border-white/10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7FB706] to-[#0f0e26] border-2 border-[#B5F823] flex items-center justify-center text-2xl font-black text-black mx-auto mb-2 shadow-lg shadow-[#7FB706]/20">
                  {activeConversation.contactName?.charAt(0) || 'C'}
                </div>
                <h3 className="text-sm font-bold text-white">{activeConversation.contactName}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{activeConversation.contactPhone}</p>
                {activeConversation.contactCompany && (
                  <span className="text-[11px] font-semibold text-[#B5F823] mt-1 block">
                    {activeConversation.contactCompany}
                  </span>
                )}
              </div>

              {/* Tags */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  Customer Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeConversation.tags && activeConversation.tags.length > 0 ? (
                    activeConversation.tags.map((t) => (
                      <span
                        key={t.id}
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: `${t.color}25`, color: t.color, borderColor: `${t.color}50` }}
                      >
                        {t.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500 italic">No tags assigned</span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Quick Actions
                </span>
                <button
                  onClick={() => {
                    setDealForm((prev) => ({
                      ...prev,
                      title: `Deal with ${activeConversation.contactName}`,
                      contactId: activeConversation.contactId,
                      stageId: stages[0]?.id || '',
                    }));
                    setIsAddDealModalOpen(true);
                  }}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-[#B5F823]" />
                  Create Sales Deal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: CONTACTS & LEADS ──────────────────────────────────────── */}
      {activeTab === 'contacts' && (
        <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f0e26] p-4 rounded-2xl border border-white/10">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts by name, phone, company..."
                  value={contactsSearch}
                  onChange={(e) => setContactsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              <select
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
                className="bg-white/5 border border-white/10 text-xs rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">All Tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setEditingContact(null);
                setContactForm({ phone: '', name: '', email: '', company: '', notes: '', status: 'lead', tags: [] });
                setIsAddContactModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs flex items-center gap-2 hover:opacity-90 transition shadow-lg shadow-[#7FB706]/15 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              New WhatsApp Contact
            </button>
          </div>

          {/* Contacts Data Table */}
          <div className="bg-[#0f0e26] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#030213] text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">WhatsApp Phone</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Tags</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Message</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500 text-xs">
                        No contacts found. Click &quot;New WhatsApp Contact&quot; to add your first lead.
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((c) => (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#7FB706]/20 border border-[#7FB706]/30 flex items-center justify-center font-bold text-[#B5F823]">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div>{c.name}</div>
                            {c.email && <div className="text-[10px] text-gray-500 font-normal">{c.email}</div>}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-300">{c.phone}</td>
                        <td className="py-3 px-4 text-gray-300">{c.company || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {c.tags && c.tags.length > 0 ? (
                              c.tags.map((t) => (
                                <span
                                  key={t.id}
                                  className="text-[9px] px-1.5 py-0.2 rounded font-semibold"
                                  style={{ backgroundColor: `${t.color}20`, color: t.color }}
                                >
                                  {t.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-gray-600">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 truncate max-w-xs">
                          {c.lastMessageText || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenChatWithContact(c)}
                              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition"
                              title="Open WhatsApp Chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingContact(c);
                                setContactForm({
                                  name: c.name,
                                  phone: c.phone,
                                  email: c.email || '',
                                  company: c.company || '',
                                  notes: c.notes || '',
                                  status: c.status,
                                  tags: (c.tags || []).map((t) => t.name),
                                });
                                setIsAddContactModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                              title="Edit Contact"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteContact(c.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SALES PIPELINES (KANBAN) ──────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <div className="p-4 sm:p-6 space-y-4 max-w-full overflow-x-auto">
          {/* Header & Controls */}
          <div className="flex items-center justify-between bg-[#0f0e26] p-4 rounded-2xl border border-white/10">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#7FB706]" />
                Commercial Restroom Cubicle Deals & Pipeline
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Total Deals: <strong className="text-white">{deals.length}</strong> &bull; Cumulative
                Value:{' '}
                <strong className="text-[#B5F823]">
                  ₹{formatInr(deals.reduce((acc, d) => acc + (Number(d.value) || 0), 0))}
                </strong>
              </p>
            </div>

            <button
              onClick={() => {
                setDealForm({
                  title: '',
                  value: 0,
                  stageId: stages[0]?.id || '',
                  contactId: contacts[0]?.id || '',
                  notes: '',
                  expectedCloseDate: '',
                });
                setIsAddDealModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition shadow-lg shadow-[#7FB706]/15"
            >
              <Plus className="w-4 h-4" />
              Add Deal
            </button>
          </div>

          {/* Kanban Board Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 min-w-[1200px]">
            {stages.map((stage) => {
              const stageDeals = deals.filter((d) => d.stageId === stage.id);
              const stageValue = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

              return (
                <div
                  key={stage.id}
                  className="bg-[#0f0e26] border border-white/10 rounded-2xl flex flex-col max-h-[75vh]"
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-white/10 bg-white/[0.02] rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold text-white flex items-center gap-1.5 truncate"
                        title={stage.name}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-gray-300 font-bold font-mono">
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="text-[11px] font-black text-[#B5F823] font-mono mt-1">
                      ₹{formatInr(stageValue)}
                    </div>
                  </div>

                  {/* Deal Cards Container */}
                  <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1">
                    {stageDeals.length === 0 ? (
                      <div className="py-8 text-center text-gray-600 text-[11px]">
                        Empty stage
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <div
                          key={deal.id}
                          className="bg-[#121226] border border-white/10 hover:border-[#7FB706]/40 p-3 rounded-xl transition shadow group"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-bold text-white line-clamp-2">{deal.title}</h4>
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this deal?')) {
                                  wacrmApi.deleteDeal(deal.id).then(() => {
                                    setDeals((prev) => prev.filter((d) => d.id !== deal.id));
                                  });
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          {deal.contactName && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1.5">
                              <Users className="w-3 h-3 text-[#7FB706]" />
                              <span className="truncate">{deal.contactName}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                            <span className="text-xs font-black text-[#B5F823] font-mono">
                              ₹{formatInr(deal.value)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleMoveDealStage(deal.id, stage.id, 'prev')}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                                title="Move Back"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveDealStage(deal.id, stage.id, 'next')}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                                title="Advance Stage"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 4: BROADCASTS ────────────────────────────────────────────── */}
      {activeTab === 'broadcasts' && (
        <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between bg-[#0f0e26] p-4 rounded-2xl border border-white/10">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#7FB706]" />
                WhatsApp Broadcast Campaigns
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Bulk outbound messaging via approved Meta WhatsApp templates with audience segmentation.
              </p>
            </div>

            <button
              onClick={() => setIsNewBroadcastModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition shadow-lg shadow-[#7FB706]/15"
            >
              <Plus className="w-4 h-4" />
              Launch Campaign
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {broadcasts.length === 0 ? (
              <div className="col-span-full bg-[#0f0e26] border border-white/10 rounded-2xl p-12 text-center text-gray-500 text-xs">
                No broadcast campaigns yet. Click &quot;Launch Campaign&quot; to reach your contacts.
              </div>
            ) : (
              broadcasts.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#0f0e26] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{b.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {b.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#B5F823] font-mono mt-1 block">
                      Template: {b.templateName}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[#030213] p-2.5 rounded-xl border border-white/5 text-center">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Recipients</span>
                      <strong className="text-xs font-mono text-white">{b.totalRecipients}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Delivered</span>
                      <strong className="text-xs font-mono text-emerald-400">{b.deliveredCount}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Read</span>
                      <strong className="text-xs font-mono text-[#B5F823]">{b.readCount}</strong>
                    </div>
                  </div>

                  <span className="text-[10px] text-gray-500 block">
                    Created: {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: META CONFIGURATION ────────────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
          <div className="bg-[#0f0e26] border border-white/10 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#7FB706]" />
                Meta WhatsApp Business Cloud API Settings
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Configure your Meta Developer App credentials to connect Pacific CRM directly to official WhatsApp Business accounts.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Phone Number ID <span className="text-[#B5F823]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 109823482390234"
                  value={configForm.phoneNumberId}
                  onChange={(e) => setConfigForm({ ...configForm, phoneNumberId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  WhatsApp Business Account (WABA) ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 293842398429384"
                  value={configForm.wabaId}
                  onChange={(e) => setConfigForm({ ...configForm, wabaId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  System User Permanent Access Token <span className="text-[#B5F823]">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="EAAB..."
                  value={configForm.accessToken}
                  onChange={(e) => setConfigForm({ ...configForm, accessToken: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Webhook Verify Secret Token
                </label>
                <input
                  type="text"
                  value={configForm.verifyToken}
                  onChange={(e) => setConfigForm({ ...configForm, verifyToken: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none font-mono"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Callback URL for Meta Webhook configuration: <code className="text-[#B5F823]">/api/v1/wacrm/webhook</code>
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSavingConfig ? 'Saving...' : 'Save & Connect WhatsApp API'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD / EDIT CONTACT ─────────────────────────────────────── */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f0e26] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7FB706]" />
                {editingContact ? 'Edit WhatsApp Contact' : 'New WhatsApp Contact'}
              </h3>
              <button onClick={() => setIsAddContactModalOpen(false)}>
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">
                  Full Name <span className="text-[#B5F823]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">
                  WhatsApp Phone Number <span className="text-[#B5F823]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">Company / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. DLF Developers Ltd"
                  value={contactForm.company || ''}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="rahul@dlf.com"
                  value={contactForm.email || ''}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">Notes / Requirement</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Inquired about 45 doors compact HPL cubicles"
                  value={contactForm.notes || ''}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddContactModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs"
                >
                  {editingContact ? 'Save Changes' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD DEAL ──────────────────────────────────────────────── */}
      {isAddDealModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f0e26] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#7FB706]" />
                Add Sales Deal
              </h3>
              <button onClick={() => setIsAddDealModalOpen(false)}>
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">
                  Deal Title <span className="text-[#B5F823]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Station 24 Cubicle Doors"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">
                  Estimated Value (₹) <span className="text-[#B5F823]">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="e.g. 150000"
                  value={dealForm.value || ''}
                  onChange={(e) => setDealForm({ ...dealForm, value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">Pipeline Stage</label>
                <select
                  value={dealForm.stageId}
                  onChange={(e) => setDealForm({ ...dealForm, stageId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">Linked Contact</label>
                <select
                  value={dealForm.contactId}
                  onChange={(e) => setDealForm({ ...dealForm, contactId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="">None (Independent Deal)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDealModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs"
                >
                  Add to Kanban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: LAUNCH BROADCAST ──────────────────────────────────────── */}
      {isNewBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f0e26] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#7FB706]" />
                Launch WhatsApp Campaign
              </h3>
              <button onClick={() => setIsNewBroadcastModalOpen(false)}>
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">
                  Campaign Name <span className="text-[#B5F823]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2026 Commercial Cubicle Expo Blast"
                  value={broadcastForm.name}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-1">
                  Approved Meta WhatsApp Template <span className="text-[#B5F823]">*</span>
                </label>
                <select
                  required
                  value={broadcastForm.templateName}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, templateName: e.target.value })}
                  className="w-full px-3 py-2 bg-[#030213] border border-white/10 focus:border-[#7FB706] rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-gray-300">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">
                  Audience Scope
                </span>
                <p>
                  Will dispatch to all <strong>{contacts.length}</strong> active contacts in Pacific CRM database.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewBroadcastModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#B5F823] text-black font-bold text-xs flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5" />
                  Launch Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
