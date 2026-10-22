import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Zap,
  Sparkles,
  MessageSquare,
  FileText,
  Key,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Save,
  Check,
  X,
  Sliders,
  Database,
  Lock,
} from 'lucide-react';
import { wacrmApi } from '../../api/wacrmApi';
import type {
  WacrmConfig,
  WacrmTemplate,
  WacrmQuickReply,
  WacrmAiConfig,
} from '../../types/admin';

interface WacrmSettingsProps {
  config: WacrmConfig | null;
  templates: WacrmTemplate[];
  quickReplies: WacrmQuickReply[];
  onRefreshConfig: () => void;
  onRefreshTemplates: () => void;
  onRefreshQuickReplies: () => void;
}

export default function WacrmSettings({
  config,
  templates,
  quickReplies,
  onRefreshConfig,
  onRefreshTemplates,
  onRefreshQuickReplies,
}: WacrmSettingsProps) {
  // ─── Active Subtab ──────────────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<'cloud' | 'templates' | 'ai' | 'quickreplies'>('cloud');

  // ─── Cloud API Form State ───────────────────────────────────────────────────
  const [cloudForm, setCloudForm] = useState({
    phoneNumberId: config?.phoneNumberId || '',
    wabaId: config?.wabaId || '',
    accessToken: '',
    verifyToken: config?.verifyToken || 'pacific_wacrm_verify_secret',
  });
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (config) {
      setCloudForm((prev) => ({
        ...prev,
        phoneNumberId: config.phoneNumberId || '',
        wabaId: config.wabaId || '',
        verifyToken: config.verifyToken || 'pacific_wacrm_verify_secret',
      }));
    }
  }, [config]);

  // ─── AI Config State ────────────────────────────────────────────────────────
  const [aiConfig, setAiConfig] = useState<WacrmAiConfig>({
    provider: 'openai',
    model: 'gpt-4o-mini',
    systemPrompt: '',
    temperature: 0.7,
    autoReplyEnabled: false,
    maxAutoRepliesPerThread: 5,
    knowledgeBase: [],
  });
  const [aiApiKey, setAiApiKey] = useState('');
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [newKbTitle, setNewKbTitle] = useState('');
  const [newKbContent, setNewKbContent] = useState('');

  useEffect(() => {
    wacrmApi.getAiConfig().then((res) => {
      if (res.data) setAiConfig(res.data);
    }).catch(() => {});
  }, []);

  // ─── Quick Reply Modal State ────────────────────────────────────────────────
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrForm, setQrForm] = useState({ shortcut: '', title: '', contentText: '' });

  // ─── Template Creator Modal State ───────────────────────────────────────────
  const [isTplModalOpen, setIsTplModalOpen] = useState(false);
  const [tplForm, setTplForm] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en',
    bodyText: 'Hello {{1}}, here is your Pacific Restroom Cubicles quotation update for {{2}}.',
  });

  // ─── Save Meta Cloud Config ─────────────────────────────────────────────────
  const handleSaveCloudConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudForm.phoneNumberId.trim() || !cloudForm.accessToken.trim()) {
      alert('Phone Number ID and Access Token are required');
      return;
    }

    try {
      setIsSavingCloud(true);
      await wacrmApi.saveConfig(cloudForm);
      alert('WhatsApp Cloud API credentials saved successfully!');
      onRefreshConfig();
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    } finally {
      setIsSavingCloud(false);
    }
  };

  // ─── Test Meta Connection ───────────────────────────────────────────────────
  const handleTestConnection = async () => {
    try {
      setIsTestingCloud(true);
      setTestResult(null);
      const res = await wacrmApi.testConnection();
      setTestResult(res.data);
      onRefreshConfig();
    } catch (err: any) {
      alert(err.message || 'Connection test failed');
    } finally {
      setIsTestingCloud(false);
    }
  };

  // ─── Save AI Config ─────────────────────────────────────────────────────────
  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingAi(true);
      await wacrmApi.saveAiConfig({
        ...aiConfig,
        apiKey: aiApiKey || undefined,
      });
      alert('AI Assistant configuration updated successfully!');
      setAiApiKey('');
    } catch (err: any) {
      alert('Save AI config failed: ' + err.message);
    } finally {
      setIsSavingAi(false);
    }
  };

  const handleAddKbItem = () => {
    if (!newKbTitle.trim() || !newKbContent.trim()) return;
    const nextKb = [
      ...aiConfig.knowledgeBase,
      { title: newKbTitle.trim(), content: newKbContent.trim() },
    ];
    setAiConfig({ ...aiConfig, knowledgeBase: nextKb });
    setNewKbTitle('');
    setNewKbContent('');
  };

  const handleRemoveKbItem = (idx: number) => {
    const nextKb = aiConfig.knowledgeBase.filter((_, i) => i !== idx);
    setAiConfig({ ...aiConfig, knowledgeBase: nextKb });
  };

  // ─── Create Quick Reply ─────────────────────────────────────────────────────
  const handleCreateQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrForm.shortcut.trim() || !qrForm.contentText.trim()) return;
    try {
      await wacrmApi.createQuickReply(qrForm);
      setIsQrModalOpen(false);
      setQrForm({ shortcut: '', title: '', contentText: '' });
      onRefreshQuickReplies();
    } catch (err: any) {
      alert('Create quick reply failed: ' + err.message);
    }
  };

  const handleDeleteQuickReply = async (id: string) => {
    try {
      await wacrmApi.deleteQuickReply(id);
      onRefreshQuickReplies();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  // ─── Create Template ────────────────────────────────────────────────────────
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplForm.name.trim() || !tplForm.bodyText.trim()) return;
    try {
      await wacrmApi.createTemplate(tplForm);
      setIsTplModalOpen(false);
      onRefreshTemplates();
    } catch (err: any) {
      alert('Create template failed: ' + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0e26]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              WhatsApp Cloud & AI Intelligence Settings
            </h2>
            <p className="text-xs text-gray-400">
              Meta Graph API credentials, message templates, AI reply model, and canned shortcuts
            </p>
          </div>
        </div>

        {/* Subtabs Navigation */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 flex-wrap">
          {[
            { id: 'cloud', label: 'Meta Cloud API', icon: ShieldCheck },
            { id: 'templates', label: 'Templates', icon: FileText },
            { id: 'ai', label: 'AI Reply Assistant', icon: Sparkles },
            { id: 'quickreplies', label: 'Quick Replies', icon: MessageSquare },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#7FB706] text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TAB 1: META CLOUD API ─────────────────────────────────────────── */}
      {subTab === 'cloud' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0b0922] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-[#7FB706]" />
              Meta WhatsApp Business Cloud API Credentials
            </h3>
            <p className="text-xs text-gray-400">
              Obtained from Meta for Developers &rarr; WhatsApp &rarr; API Setup. Requires a permanent System User token.
            </p>

            <form onSubmit={handleSaveCloudConfig} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Phone Number ID *</label>
                <input
                  type="text"
                  required
                  value={cloudForm.phoneNumberId}
                  onChange={(e) => setCloudForm({ ...cloudForm, phoneNumberId: e.target.value })}
                  placeholder="e.g. 104829104819203"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">WhatsApp Business Account ID (WABA ID)</label>
                <input
                  type="text"
                  value={cloudForm.wabaId}
                  onChange={(e) => setCloudForm({ ...cloudForm, wabaId: e.target.value })}
                  placeholder="e.g. 293847291048572"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Permanent Access Token *</label>
                <input
                  type="password"
                  required
                  value={cloudForm.accessToken}
                  onChange={(e) => setCloudForm({ ...cloudForm, accessToken: e.target.value })}
                  placeholder="EAABw..."
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Encrypted at rest with AES-256-GCM.
                </span>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Webhook Verify Token</label>
                <input
                  type="text"
                  value={cloudForm.verifyToken}
                  onChange={(e) => setCloudForm({ ...cloudForm, verifyToken: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingCloud}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-gray-300 font-bold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingCloud ? 'animate-spin' : ''}`} />
                  <span>{isTestingCloud ? 'Verifying...' : 'Test Meta Connection'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingCloud}
                  className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingCloud ? 'Saving...' : 'Save Credentials'}</span>
                </button>
              </div>
            </form>

            {/* Test Result Banner */}
            {testResult && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Meta WhatsApp Business Connected Successfully!
                </p>
                <p className="text-[11px] text-gray-300">
                  Phone: <strong>{testResult.displayPhoneNumber}</strong> &bull; Verified Name:{' '}
                  <strong>{testResult.verifiedName}</strong> &bull; Quality Rating:{' '}
                  <strong>{testResult.qualityRating}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Webhook Callback Info */}
          <div className="bg-[#0b0922] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3 text-xs">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#B5F823]" />
              Meta Webhook Callback Coordinates
            </h3>
            <p className="text-gray-400">
              Configure these coordinates in Meta Developer Portal &rarr; WhatsApp &rarr; Configuration:
            </p>

            <div className="space-y-1 bg-black/40 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-gray-400">Callback URL</span>
              <p className="font-mono text-emerald-400 text-xs break-all">
                https://api.pacificproduct.in/api/v1/wacrm/webhook
              </p>
            </div>

            <div className="space-y-1 bg-black/40 p-3 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-gray-400">Verify Token</span>
              <p className="font-mono text-[#B5F823] text-xs">pacific_wacrm_verify_secret</p>
            </div>

            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold text-gray-400">Required Webhook Fields:</span>
              <ul className="list-disc list-inside text-gray-300 space-y-0.5 mt-1">
                <li><code>messages</code> (inbound text, media, reactions)</li>
                <li><code>message_template_status_update</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: TEMPLATES ──────────────────────────────────────────────── */}
      {subTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Official Meta WhatsApp approved message templates for outbound notifications and marketing broadcasts.
            </p>
            <button
              onClick={() => setIsTplModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-[#0b0922] border border-white/10 rounded-2xl p-4 shadow-xl space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-white">{tpl.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                    {tpl.status || 'APPROVED'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 flex items-center gap-2">
                  <span>Category: {tpl.category}</span>
                  <span>Lang: {tpl.language}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5 whitespace-pre-wrap">
                  {tpl.bodyText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: AI ASSISTANT & KNOWLEDGE BASE ──────────────────────────── */}
      {subTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0b0922] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              AI Reply Assistant Engine Configuration
            </h3>
            <p className="text-xs text-gray-400">
              Powers instant contextual AI drafted replies in the shared inbox and automated customer support.
            </p>

            <form onSubmit={handleSaveAiConfig} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">AI Provider</label>
                  <select
                    value={aiConfig.provider}
                    onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Model Selection</label>
                  <select
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Fast & Recommended)</option>
                    <option value="gpt-4o">gpt-4o (High Accuracy)</option>
                    <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">API Key (Bring Your Own Key)</label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="sk-... (Leave blank to keep existing key)"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">System Instructions & Brand Tone</label>
                <textarea
                  rows={4}
                  value={aiConfig.systemPrompt}
                  onChange={(e) => setAiConfig({ ...aiConfig, systemPrompt: e.target.value })}
                  placeholder="Instructions for the AI assistant..."
                  className="w-full bg-black/40 border border-white/15 rounded-lg p-2.5 text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Temperature ({aiConfig.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={aiConfig.temperature}
                    onChange={(e) => setAiConfig({ ...aiConfig, temperature: Number(e.target.value) })}
                    className="w-full accent-[#7FB706]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Max Auto-Replies Per Thread</label>
                  <input
                    type="number"
                    value={aiConfig.maxAutoRepliesPerThread}
                    onChange={(e) => setAiConfig({ ...aiConfig, maxAutoRepliesPerThread: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSavingAi}
                  className="px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingAi ? 'Saving...' : 'Update AI Configuration'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Knowledge Base Editor */}
          <div className="bg-[#0b0922] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3 text-xs">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#B5F823]" />
              Enterprise Knowledge Base
            </h3>
            <p className="text-gray-400">
              The AI retrieves these product documents and FAQs to draft technical replies:
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {aiConfig.knowledgeBase?.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{item.title}</span>
                    <button onClick={() => handleRemoveKbItem(idx)} className="text-rose-400 hover:text-white">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-gray-400 text-[11px] line-clamp-3">{item.content}</p>
                </div>
              ))}
            </div>

            {/* Add KB Item */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <input
                type="text"
                placeholder="Article Title (e.g. Warranty Period)"
                value={newKbTitle}
                onChange={(e) => setNewKbTitle(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <textarea
                rows={2}
                placeholder="Factual product content, dimensions, lead times..."
                value={newKbContent}
                onChange={(e) => setNewKbContent(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white resize-none"
              />
              <button
                type="button"
                onClick={handleAddKbItem}
                className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Knowledge Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: QUICK REPLIES ──────────────────────────────────────────── */}
      {subTab === 'quickreplies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Canned responses triggered in the inbox composer by typing <code className="text-[#B5F823]">/</code> followed by shortcut.
            </p>
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Quick Reply</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickReplies.map((qr) => (
              <div
                key={qr.id}
                className="bg-[#0b0922] border border-white/10 rounded-2xl p-4 shadow-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-[#B5F823] font-mono">{qr.shortcut}</span>
                  <button
                    onClick={() => handleDeleteQuickReply(qr.id)}
                    className="p-1 rounded text-rose-400 hover:text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-white">{qr.title}</h4>
                <p className="text-xs text-gray-300 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                  {qr.contentText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD QUICK REPLY ────────────────────────────────────────── */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#7FB706]" />
                New Quick Reply Shortcut
              </h3>
              <button onClick={() => setIsQrModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickReply} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Shortcut (starts with /) *</label>
                <input
                  type="text"
                  required
                  value={qrForm.shortcut}
                  onChange={(e) => setQrForm({ ...qrForm, shortcut: e.target.value })}
                  placeholder="/specs"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Title / Label *</label>
                <input
                  type="text"
                  required
                  value={qrForm.title}
                  onChange={(e) => setQrForm({ ...qrForm, title: e.target.value })}
                  placeholder="e.g. Standard 12mm Compact Specs"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Canned Reply Message *</label>
                <textarea
                  rows={3}
                  required
                  value={qrForm.contentText}
                  onChange={(e) => setQrForm({ ...qrForm, contentText: e.target.value })}
                  placeholder="Text that will populate into the composer..."
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black shadow-lg shadow-[#7FB706]/20"
                >
                  Save Shortcut
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE TEMPLATE ────────────────────────────────────────── */}
      {isTplModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7FB706]" />
                Create WhatsApp Message Template
              </h3>
              <button onClick={() => setIsTplModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Template Identifier (lowercase, underscores) *</label>
                <input
                  type="text"
                  required
                  value={tplForm.name}
                  onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                  placeholder="e.g. quote_dispatch_notice"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Category</label>
                  <select
                    value={tplForm.category}
                    onChange={(e) => setTplForm({ ...tplForm, category: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Language</label>
                  <select
                    value={tplForm.language}
                    onChange={(e) => setTplForm({ ...tplForm, language: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="en">English (en)</option>
                    <option value="hi">Hindi (hi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Body Text with Placeholders *</label>
                <textarea
                  rows={4}
                  required
                  value={tplForm.bodyText}
                  onChange={(e) => setTplForm({ ...tplForm, bodyText: e.target.value })}
                  placeholder="Hello {{1}}, your quotation for {{2}} is ready..."
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsTplModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black shadow-lg shadow-[#7FB706]/20"
                >
                  Register Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
