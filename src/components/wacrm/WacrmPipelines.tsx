import React, { useState } from 'react';
import {
  GitBranch,
  Plus,
  DollarSign,
  Calendar,
  Building2,
  Phone,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  X,
  TrendingUp,
  Award,
  Layers,
  Edit2,
  Trash2,
} from 'lucide-react';
import { wacrmApi } from '../../api/wacrmApi';
import type {
  WacrmPipelineStage,
  WacrmDeal,
  WacrmContact,
  CreateWacrmDealInput,
} from '../../types/admin';

interface WacrmPipelinesProps {
  stages: WacrmPipelineStage[];
  deals: WacrmDeal[];
  contacts: WacrmContact[];
  pipelineId: string;
  onRefreshDeals: () => void;
  onOpenChatWithContactId: (contactId: string) => void;
}

const formatInr = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN');
};

export default function WacrmPipelines({
  stages,
  deals,
  contacts,
  pipelineId,
  onRefreshDeals,
  onOpenChatWithContactId,
}: WacrmPipelinesProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<WacrmDeal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<CreateWacrmDealInput>({
    pipelineId: pipelineId || '',
    stageId: '',
    contactId: '',
    title: '',
    value: 0,
    notes: '',
    expectedCloseDate: '',
  });

  const totalPipelineValue = deals.reduce((acc, d) => acc + (Number(d.value) || 0), 0);

  const handleOpenAddModal = (defaultStageId?: string) => {
    setEditingDeal(null);
    setForm({
      pipelineId: pipelineId || stages[0]?.pipelineId || '',
      stageId: defaultStageId || stages[0]?.id || '',
      contactId: '',
      title: '',
      value: 0,
      notes: '',
      expectedCloseDate: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (deal: WacrmDeal) => {
    setEditingDeal(deal);
    setForm({
      pipelineId: deal.pipelineId,
      stageId: deal.stageId,
      contactId: deal.contactId || '',
      title: deal.title,
      value: Number(deal.value) || 0,
      notes: deal.notes || '',
      expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : '',
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.stageId) {
      alert('Deal title and stage are required');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingDeal) {
        await wacrmApi.updateDeal(editingDeal.id, {
          title: form.title,
          value: Number(form.value) || 0,
          stageId: form.stageId,
          notes: form.notes || undefined,
          expectedCloseDate: form.expectedCloseDate || undefined,
        });
      } else {
        await wacrmApi.createDeal({
          ...form,
          pipelineId: form.pipelineId || stages[0]?.pipelineId,
          value: Number(form.value) || 0,
        });
      }
      setIsAddModalOpen(false);
      onRefreshDeals();
    } catch (err: any) {
      alert('Failed to save deal: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveStage = async (dealId: string, currentStageId: string, direction: 'prev' | 'next') => {
    const curIdx = stages.findIndex((s) => s.id === currentStageId);
    if (curIdx === -1) return;
    const nextIdx = direction === 'next' ? curIdx + 1 : curIdx - 1;
    if (nextIdx < 0 || nextIdx >= stages.length) return;
    const targetStage = stages[nextIdx];

    try {
      await wacrmApi.updateDeal(dealId, { stageId: targetStage.id });
      onRefreshDeals();
    } catch (err: any) {
      alert('Move deal failed: ' + err.message);
    }
  };

  const handleDelete = async (dealId: string) => {
    if (!window.confirm('Delete this deal from the pipeline?')) return;
    try {
      await wacrmApi.deleteDeal(dealId);
      onRefreshDeals();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ─── Top Pipeline Header & Value Hero ──────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0e26]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823]">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              Commercial Restroom Cubicle Pipeline
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40">
                {deals.length} Active Deals
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Kanban stage tracker for drawings, quotations, and commercial sign-offs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Pipeline Value</span>
            <p className="text-lg font-black text-[#B5F823]">₹ {formatInr(totalPipelineValue)}</p>
          </div>
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Deal</span>
          </button>
        </div>
      </div>

      {/* ─── Kanban Stage Columns ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
        {stages.map((stage, sIdx) => {
          const stageDeals = deals.filter((d) => d.stageId === stage.id);
          const stageSum = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

          return (
            <div
              key={stage.id}
              className="bg-[#0b0922]/90 border border-white/10 rounded-2xl p-3 flex flex-col min-h-[500px] shadow-xl"
            >
              {/* Column Header */}
              <div className="pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-white truncate">{stage.name}</span>
                  <span className="w-5 h-5 rounded-full bg-white/10 text-gray-300 text-[10px] font-bold flex items-center justify-center">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 text-[10px] uppercase font-bold">Sum</span>
                  <span className="font-bold text-[#B5F823]">₹ {formatInr(stageSum)}</span>
                </div>
              </div>

              {/* Deal Cards Container */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {stageDeals.length === 0 ? (
                  <div className="py-8 text-center text-gray-600 text-xs">No deals</div>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#7FB706]/40 hover:bg-[#7FB706]/5 transition-all shadow-md group space-y-2"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-black text-white leading-tight line-clamp-2">
                          {deal.title}
                        </h4>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditModal(deal)}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 text-gray-300"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(deal.id)}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Value & Currency */}
                      <div className="text-sm font-black text-[#B5F823]">
                        ₹ {formatInr(deal.value)}
                      </div>

                      {/* Customer Info */}
                      {(deal.contactName || deal.contactCompany) && (
                        <div className="pt-1 border-t border-white/5 space-y-0.5">
                          {deal.contactName && (
                            <p className="text-[11px] font-semibold text-gray-300 flex items-center justify-between">
                              <span>{deal.contactName}</span>
                              {deal.contactId && (
                                <button
                                  onClick={() => onOpenChatWithContactId(deal.contactId!)}
                                  className="text-[#7FB706] hover:underline flex items-center gap-0.5 text-[10px]"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Chat</span>
                                </button>
                              )}
                            </p>
                          )}
                          {deal.contactCompany && (
                            <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5" />
                              {deal.contactCompany}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Expected Close Date */}
                      {deal.expectedCloseDate && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span>Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}</span>
                        </div>
                      )}

                      {/* Stage Movement Controls */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <button
                          disabled={sIdx === 0}
                          onClick={() => handleMoveStage(deal.id, stage.id, 'prev')}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 disabled:opacity-20"
                          title="Move to previous stage"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] uppercase font-bold text-gray-500">Stage {sIdx + 1}</span>
                        <button
                          disabled={sIdx === stages.length - 1}
                          onClick={() => handleMoveStage(deal.id, stage.id, 'next')}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#7FB706] disabled:opacity-20"
                          title="Advance to next stage"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Deal into Column */}
              <button
                onClick={() => handleOpenAddModal(stage.id)}
                className="mt-3 w-full py-1.5 rounded-lg border border-dashed border-white/20 hover:border-[#7FB706] text-gray-400 hover:text-[#B5F823] text-xs font-semibold flex items-center justify-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deal</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ─── ADD / EDIT DEAL MODAL ─────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#7FB706]" />
                {editingDeal ? 'Edit Commercial Deal' : 'New Pipeline Deal'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Deal Title / Project *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. DLF Cybercity Phase 4 - 48 Cubicles"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Deal Value (₹ INR) *</label>
                  <input
                    type="number"
                    required
                    value={form.value || ''}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    placeholder="350000"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Pipeline Stage *</label>
                  <select
                    value={form.stageId}
                    onChange={(e) => setForm({ ...form, stageId: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  >
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Associated Contact / Architect</label>
                <select
                  value={form.contactId || ''}
                  onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">— Select Contact —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) {c.company ? `- ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Target Close Date</label>
                <input
                  type="date"
                  value={form.expectedCloseDate || ''}
                  onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Scope & Estimation Notes</label>
                <textarea
                  rows={2}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="12mm Compact laminate, nylon hardware, 12 sets standard..."
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black shadow-lg shadow-[#7FB706]/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingDeal ? 'Update Deal' : 'Add to Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
