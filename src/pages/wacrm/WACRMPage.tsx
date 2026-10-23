import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Users,
  GitBranch,
  Radio,
  Zap,
  Workflow,
  Settings,
  ShieldCheck,
  TrendingUp,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { wacrmApi } from '../../api/wacrmApi';
import type {
  WacrmContact,
  WacrmConversation,
  WacrmPipelineStage,
  WacrmDeal,
  WacrmTemplate,
  WacrmTag,
  WacrmBroadcast,
  WacrmConfig,
  WacrmQuickReply,
  WacrmDashboardData,
} from '../../types/admin';

// ─── Sub-modules ─────────────────────────────────────────────────────────────
import WacrmInbox from '../../components/wacrm/WacrmInbox';
import WacrmContacts from '../../components/wacrm/WacrmContacts';
import WacrmPipelines from '../../components/wacrm/WacrmPipelines';
import WacrmBroadcasts from '../../components/wacrm/WacrmBroadcasts';
import WacrmAutomations from '../../components/wacrm/WacrmAutomations';
import WacrmFlows from '../../components/wacrm/WacrmFlows';
import WacrmSettings from '../../components/wacrm/WacrmSettings';

type WacrmTab = 'inbox' | 'contacts' | 'pipelines' | 'broadcasts' | 'automations' | 'flows' | 'settings';

const formatInr = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN');
};

export default function WACRMPage() {
  const { user } = useAdminAuth();
  const operatorName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.email || 'Pacific Admin';

  // ─── Active Tab State ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<WacrmTab>('inbox');
  const [loading, setLoading] = useState(true);

  // ─── Shared State ───────────────────────────────────────────────────────────
  const [dashboard, setDashboard] = useState<WacrmDashboardData | null>(null);
  const [conversations, setConversations] = useState<WacrmConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<WacrmContact[]>([]);
  const [stages, setStages] = useState<WacrmPipelineStage[]>([]);
  const [deals, setDeals] = useState<WacrmDeal[]>([]);
  const [pipelineId, setPipelineId] = useState<string>('');
  const [broadcasts, setBroadcasts] = useState<WacrmBroadcast[]>([]);
  const [templates, setTemplates] = useState<WacrmTemplate[]>([]);
  const [tags, setTags] = useState<WacrmTag[]>([]);
  const [config, setConfig] = useState<WacrmConfig | null>(null);
  const [quickReplies, setQuickReplies] = useState<WacrmQuickReply[]>([]);

  // ─── Load Initial Master Data ───────────────────────────────────────────────
  const loadMasterData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        dashRes,
        convsRes,
        contactsRes,
        pipeRes,
        castsRes,
        tplRes,
        tagsRes,
        confRes,
        qrRes,
      ] = await Promise.all([
        wacrmApi.getDashboard().catch(() => ({ data: null })),
        wacrmApi.getConversations().catch(() => ({ data: [] })),
        wacrmApi.getContacts().catch(() => ({ data: [] })),
        wacrmApi.getPipeline().catch(() => ({ data: { pipeline: { id: '', name: '' }, stages: [], deals: [] } })),
        wacrmApi.getBroadcasts().catch(() => ({ data: [] })),
        wacrmApi.getTemplates().catch(() => ({ data: [] })),
        wacrmApi.getTags().catch(() => ({ data: [] })),
        wacrmApi.getConfig().catch(() => ({ data: null })),
        wacrmApi.getQuickReplies().catch(() => ({ data: [] })),
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
      if (confRes.data) setConfig(confRes.data);
      if (qrRes.data) setQuickReplies(qrRes.data);
    } catch (err) {
      console.warn('WACRM master initialization note:', err);
    } finally {
      setLoading(false);
    }
  }, [activeConversationId]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // ─── Polling for Live Inbound WhatsApp Events (every 10s) ───────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      wacrmApi.getConversations().then((res) => {
        if (res.data) setConversations(res.data);
      }).catch(() => {});

      wacrmApi.getDashboard().then((res) => {
        if (res.data) setDashboard(res.data);
      }).catch(() => {});
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // ─── Total Unread Badge ─────────────────────────────────────────────────────
  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  // ─── Jump from Contacts or Deals directly to Chat ───────────────────────────
  const handleOpenChatWithContact = (contact: WacrmContact) => {
    if (contact.conversationId) {
      setActiveConversationId(contact.conversationId);
      setActiveTab('inbox');
    } else {
      wacrmApi
        .sendMessage({
          contactId: contact.id,
          contentType: 'text',
          contentText: 'Hello! Thank you for reaching out to Pacific Restroom Cubicles & Lockers.',
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

  const handleOpenChatWithContactId = (contactId: string) => {
    const found = contacts.find((c) => c.id === contactId);
    if (found) {
      handleOpenChatWithContact(found);
    } else {
      setActiveTab('inbox');
    }
  };

  return (
    <div className="min-h-full bg-[#030213] text-white flex flex-col font-sans">
      {/* ─── Master Enterprise Top Header ─────────────────────────────────── */}
      <div className="border-b border-white/10 bg-[#0c0a24]/95 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-0 z-40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] p-0.5 shadow-lg shadow-[#7FB706]/20">
              <div className="w-full h-full bg-[#07051f] rounded-[10px] flex items-center justify-center text-[#B5F823]">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  CRM
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40 uppercase tracking-widest">
                  Zero-Auth Core
                </span>
                {config?.status === 'connected' ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Meta Cloud Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Direct Simulator Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Full-featured WhatsApp Business Suite &bull; Signed In Operator:{' '}
                <strong className="text-white">{operatorName}</strong>
              </p>
            </div>
          </div>

          {/* KPI Pills */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto text-xs pb-1 md:pb-0">
            <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-gray-400 text-[11px]">Contacts:</span>
              <strong className="text-white font-mono">{contacts.length}</strong>
            </div>

            <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-gray-400 text-[11px]">Pipeline:</span>
              <strong className="text-[#B5F823] font-mono">
                ₹ {formatInr(dashboard?.pipelineValue || deals.reduce((s, d) => s + (Number(d.value) || 0), 0))}
              </strong>
            </div>

            <button
              onClick={() => loadMasterData()}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors"
              title="Refresh all CRM data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Navigation Tabs Bar ─────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/10 overflow-x-auto">
          {[
            { id: 'inbox', label: 'Shared Inbox', icon: MessageSquare, badge: totalUnread > 0 ? totalUnread : null },
            { id: 'contacts', label: 'Audience & Contacts', icon: Users, badge: null },
            { id: 'pipelines', label: 'Pipelines & Deals', icon: GitBranch, badge: null },
            { id: 'broadcasts', label: 'Broadcast Campaigns', icon: Radio, badge: null },
            { id: 'automations', label: 'No-Code Automations', icon: Zap, badge: null },
            { id: 'flows', label: 'Visual Flows', icon: Workflow, badge: null },
            { id: 'settings', label: 'Cloud & AI Settings', icon: Settings, badge: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#7FB706] text-black shadow-lg shadow-[#7FB706]/20 font-black'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Main Tab Body ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'inbox' && (
          <WacrmInbox
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
            onRefreshConversations={() => {
              wacrmApi.getConversations().then((res) => {
                if (res.data) setConversations(res.data);
              });
            }}
            templates={templates}
            quickReplies={quickReplies}
            operatorName={operatorName}
          />
        )}

        {activeTab === 'contacts' && (
          <WacrmContacts
            contacts={contacts}
            tags={tags}
            onRefreshContacts={() => {
              wacrmApi.getContacts().then((res) => {
                if (res.data) setContacts(res.data);
              });
            }}
            onOpenChat={handleOpenChatWithContact}
          />
        )}

        {activeTab === 'pipelines' && (
          <WacrmPipelines
            stages={stages}
            deals={deals}
            contacts={contacts}
            pipelineId={pipelineId}
            onRefreshDeals={() => {
              wacrmApi.getPipeline().then((res) => {
                if (res.data) {
                  setStages(res.data.stages || []);
                  setDeals(res.data.deals || []);
                }
              });
            }}
            onOpenChatWithContactId={handleOpenChatWithContactId}
          />
        )}

        {activeTab === 'broadcasts' && (
          <WacrmBroadcasts
            broadcasts={broadcasts}
            templates={templates}
            tags={tags}
            contacts={contacts}
            onRefreshBroadcasts={() => {
              wacrmApi.getBroadcasts().then((res) => {
                if (res.data) setBroadcasts(res.data);
              });
            }}
          />
        )}

        {activeTab === 'automations' && <WacrmAutomations />}

        {activeTab === 'flows' && <WacrmFlows />}

        {activeTab === 'settings' && (
          <WacrmSettings
            config={config}
            templates={templates}
            quickReplies={quickReplies}
            onRefreshConfig={() => {
              wacrmApi.getConfig().then((res) => {
                if (res.data) setConfig(res.data);
              });
            }}
            onRefreshTemplates={() => {
              wacrmApi.getTemplates().then((res) => {
                if (res.data) setTemplates(res.data);
              });
            }}
            onRefreshQuickReplies={() => {
              wacrmApi.getQuickReplies().then((res) => {
                if (res.data) setQuickReplies(res.data);
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
