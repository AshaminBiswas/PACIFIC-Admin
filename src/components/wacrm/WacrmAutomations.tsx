import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Tag,
  ArrowRight,
  Trash2,
  Edit2,
  X,
  Send,
  Eye,
  Activity,
  Bot,
} from 'lucide-react';
import { wacrmApi } from '../../api/wacrmApi';
import type { WacrmAutomation, WacrmAutomationLog } from '../../types/admin';

interface WacrmAutomationsProps {
  onRefreshStats?: () => void;
}

export default function WacrmAutomations({ onRefreshStats }: WacrmAutomationsProps) {
  const [automations, setAutomations] = useState<WacrmAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuto, setEditingAuto] = useState<WacrmAutomation | null>(null);

  // ─── Execution Logs Modal ───────────────────────────────────────────────────
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [logs, setLogs] = useState<WacrmAutomationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ─── Form State ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    description: '',
    triggerType: 'first_inbound_message',
    keywords: 'quote, price, cubicle, cost',
    actionType: 'send_message',
    actionText: 'Thank you for reaching out to Pacific Restroom Cubicles! A technical estimation consultant will respond shortly.',
    isActive: true,
  });

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const res = await wacrmApi.getAutomations();
      if (res.data) setAutomations(res.data);
    } catch (err) {
      console.warn('Failed to fetch automations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleOpenAddModal = () => {
    setEditingAuto(null);
    setForm({
      name: '',
      description: '',
      triggerType: 'keyword_match',
      keywords: 'quote, price, rate',
      actionType: 'send_message',
      actionText: 'Hello! Please share your floor layout / BOQ for an instant formal quotation.',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (auto: WacrmAutomation) => {
    setEditingAuto(auto);
    setForm({
      name: auto.name,
      description: auto.description || '',
      triggerType: auto.triggerType,
      keywords: Array.isArray(auto.triggerConfig?.keywords)
        ? auto.triggerConfig.keywords.join(', ')
        : '',
      actionType: 'send_message',
      actionText: auto.triggerConfig?.actionText || 'Thank you for contacting Pacific Restroom Cubicles!',
      isActive: auto.isActive,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (auto: WacrmAutomation) => {
    try {
      const nextState = !auto.isActive;
      await wacrmApi.updateAutomation(auto.id, { isActive: nextState });
      setAutomations((prev) =>
        prev.map((a) => (a.id === auto.id ? { ...a, isActive: nextState } : a))
      );
    } catch (err: any) {
      alert('Failed to toggle automation: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this automation?')) return;
    try {
      await wacrmApi.deleteAutomation(id);
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Automation name is required');
      return;
    }

    const triggerConfig: any = {
      actionType: form.actionType,
      actionText: form.actionText,
    };

    if (form.triggerType === 'keyword_match') {
      triggerConfig.keywords = form.keywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      triggerConfig.case_sensitive = false;
    }

    try {
      if (editingAuto) {
        await wacrmApi.updateAutomation(editingAuto.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          triggerType: form.triggerType,
          triggerConfig,
          isActive: form.isActive,
        });
      } else {
        await wacrmApi.createAutomation({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          triggerType: form.triggerType,
          triggerConfig,
          isActive: form.isActive,
        });
      }
      setIsModalOpen(false);
      fetchAutomations();
    } catch (err: any) {
      alert('Failed to save automation: ' + err.message);
    }
  };

  const handleViewLogs = async (automationId?: string) => {
    try {
      setLoadingLogs(true);
      setIsLogsModalOpen(true);
      const res = await wacrmApi.getAutomationLogs(automationId);
      if (res.data) setLogs(res.data);
    } catch (err) {
      console.warn('Failed to load logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0e26]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              No-Code Automations Engine
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40">
                {automations.length} Rules
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Keyword triggers, instant greetings, routing, and automated webhook events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewLogs()}
            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all"
          >
            <Activity className="w-4 h-4 text-[#B5F823]" />
            <span>Execution Audit Logs</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Automation</span>
          </button>
        </div>
      </div>

      {/* ─── Automations List ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-gray-400 text-xs">
            Loading automations...
          </div>
        ) : automations.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 bg-[#0b0922] border border-white/10 rounded-2xl">
            <Zap className="w-10 h-10 mx-auto text-gray-600 mb-2 stroke-1" />
            <p className="text-sm font-bold text-white">No automations configured yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Click &quot;Create Automation&quot; to set up keyword auto-replies or welcome flows.
            </p>
          </div>
        ) : (
          automations.map((auto) => (
            <div
              key={auto.id}
              className={`p-4 rounded-2xl border transition-all shadow-xl space-y-3 ${
                auto.isActive
                  ? 'bg-[#0b0922] border-white/10 hover:border-[#7FB706]/50'
                  : 'bg-black/40 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      auto.isActive ? 'bg-[#7FB706]/20 text-[#B5F823]' : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight">{auto.name}</h3>
                    {auto.description && <p className="text-xs text-gray-400 mt-0.5">{auto.description}</p>}
                  </div>
                </div>

                {/* Toggle Active Switch */}
                <button
                  onClick={() => handleToggleActive(auto)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                    auto.isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-gray-700/40 text-gray-400 border border-gray-600/30'
                  }`}
                >
                  {auto.isActive ? (
                    <>
                      <Play className="w-2.5 h-2.5 fill-emerald-300" /> Active
                    </>
                  ) : (
                    <>
                      <Pause className="w-2.5 h-2.5 fill-gray-400" /> Paused
                    </>
                  )}
                </button>
              </div>

              {/* Trigger Details */}
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <span className="font-bold text-white uppercase text-[10px]">Trigger:</span>
                  <span className="text-[#B5F823] font-semibold">{auto.triggerType.replace(/_/g, ' ')}</span>
                </div>

                {auto.triggerConfig?.keywords && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-gray-500">Keywords:</span>
                    {auto.triggerConfig.keywords.map((kw: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 text-[10px] font-mono">
                        &quot;{kw}&quot;
                      </span>
                    ))}
                  </div>
                )}

                {auto.triggerConfig?.actionText && (
                  <div className="pt-1 border-t border-white/5 text-[11px] text-gray-300 italic">
                    ↳ Reply: &quot;{auto.triggerConfig.actionText}&quot;
                  </div>
                )}
              </div>

              {/* Footer Metrics & Actions */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                <div className="flex items-center gap-3 text-[11px]">
                  <span>Fired: <strong className="text-white">{auto.executionCount} times</strong></span>
                  {auto.lastExecutedAt && (
                    <span>Last: {new Date(auto.lastExecutedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleViewLogs(auto.id)}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300"
                    title="Audit Logs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(auto)}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-300"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(auto.id)}
                    className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── CREATE / EDIT MODAL ───────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#7FB706]" />
                {editingAuto ? 'Edit Automation Rule' : 'Create Automation Rule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Automation Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Quotation Keyword Auto-Reply"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Trigger Event *</label>
                <select
                  value={form.triggerType}
                  onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                >
                  <option value="first_inbound_message">First Inbound Customer Message (Welcome)</option>
                  <option value="keyword_match">Keyword Match (e.g. quote, price, urgent)</option>
                  <option value="new_contact_created">New Contact Created in CRM</option>
                  <option value="tag_added">Specific Tag Attached</option>
                </select>
              </div>

              {form.triggerType === 'keyword_match' && (
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Keywords (comma-separated)</label>
                  <input
                    type="text"
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    placeholder="quote, price, estimate, catalogue, boq"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Automated Action Reply</label>
                <textarea
                  rows={3}
                  value={form.actionText}
                  onChange={(e) => setForm({ ...form, actionText: e.target.value })}
                  placeholder="Message to automatically send..."
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded bg-black/40 border-white/20 text-[#7FB706]"
                />
                <label htmlFor="activeCheck" className="text-gray-300 font-semibold cursor-pointer">
                  Activate immediately
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black shadow-lg shadow-[#7FB706]/20"
                >
                  {editingAuto ? 'Update Automation' : 'Create Automation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── AUDIT LOGS MODAL ──────────────────────────────────────────────── */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#7FB706]" />
                Automation Execution Audit Logs
              </h3>
              <button onClick={() => setIsLogsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
              {loadingLogs ? (
                <p className="text-gray-400 text-center py-6">Loading execution audit trail...</p>
              ) : logs.length === 0 ? (
                <p className="text-gray-500 text-center py-6">No execution logs recorded yet.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{log.triggerEvent}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            log.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      {log.contactName && (
                        <p className="text-gray-400 text-[11px] mt-0.5">
                          Target: {log.contactName} ({log.contactPhone})
                        </p>
                      )}
                      {log.errorMessage && <p className="text-rose-400 text-[11px] mt-1">{log.errorMessage}</p>}
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
