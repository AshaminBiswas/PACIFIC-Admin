import React, { useState } from 'react';
import {
  Radio,
  Plus,
  Send,
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { wacrmApi } from '../../api/wacrmApi';
import type {
  WacrmBroadcast,
  WacrmTemplate,
  WacrmTag,
  WacrmContact,
} from '../../types/admin';

interface WacrmBroadcastsProps {
  broadcasts: WacrmBroadcast[];
  templates: WacrmTemplate[];
  tags: WacrmTag[];
  contacts: WacrmContact[];
  onRefreshBroadcasts: () => void;
}

export default function WacrmBroadcasts({
  broadcasts,
  templates,
  tags,
  contacts,
  onRefreshBroadcasts,
}: WacrmBroadcastsProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLaunching, setIsLaunching] = useState(false);

  // ─── Wizard Form State ──────────────────────────────────────────────────────
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [var1Value, setVar1Value] = useState('Valued Partner');
  const [var2Value, setVar2Value] = useState('Pacific Restroom Cubicles');

  // Compute audience count based on tag
  const audienceContacts = contacts.filter((c) =>
    selectedTag === 'all' ? true : c.tags?.some((t) => t.name === selectedTag)
  );

  const handleOpenWizard = () => {
    setCampaignName(`Pacific Update - ${new Date().toLocaleDateString()}`);
    setSelectedTemplateName(templates[0]?.name || '');
    setSelectedTag('all');
    setStep(1);
    setIsWizardOpen(true);
  };

  const handleLaunchCampaign = async () => {
    if (!campaignName.trim() || !selectedTemplateName) {
      alert('Campaign name and template are required');
      return;
    }

    try {
      setIsLaunching(true);
      await wacrmApi.createBroadcast({
        name: campaignName.trim(),
        templateName: selectedTemplateName,
        templateLanguage: 'en',
        audienceFilter: {
          tag: selectedTag === 'all' ? null : selectedTag,
          recipientCount: audienceContacts.length,
          vars: { '1': var1Value, '2': var2Value },
        },
      });
      setIsWizardOpen(false);
      onRefreshBroadcasts();
    } catch (err: any) {
      alert('Broadcast dispatch failed: ' + err.message);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ─── Top Control Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0e26]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823]">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              Meta WhatsApp Broadcast Campaigns
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40">
                {broadcasts.length} Campaigns
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Bulk announcements, architectural catalog dispatches, and delivery status notifications
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenWizard}
          className="px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Broadcast Campaign</span>
        </button>
      </div>

      {/* ─── Campaign List Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {broadcasts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 bg-[#0b0922] border border-white/10 rounded-2xl">
            <Radio className="w-10 h-10 mx-auto text-gray-600 mb-2 stroke-1" />
            <p className="text-sm font-bold text-white">No broadcast campaigns launched yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Click &quot;New Broadcast Campaign&quot; to send a Meta-approved template blast to your audience.
            </p>
          </div>
        ) : (
          broadcasts.map((b) => {
            const deliveryRate = b.totalRecipients > 0 ? Math.round((b.deliveredCount / b.totalRecipients) * 100) : 0;
            const readRate = b.totalRecipients > 0 ? Math.round((b.readCount / b.totalRecipients) * 100) : 0;

            return (
              <div
                key={b.id}
                className="bg-[#0b0922] border border-white/10 hover:border-[#7FB706]/40 rounded-2xl p-4 shadow-xl space-y-3 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight">{b.name}</h3>
                    <p className="text-[11px] font-mono text-[#B5F823] mt-0.5">
                      Template: {b.templateName}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {b.status}
                  </span>
                </div>

                {/* Progress Metric */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Delivery Status</span>
                    <span className="font-bold text-white">{deliveryRate}% Delivered</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7FB706] to-[#B5F823]"
                      style={{ width: `${Math.min(100, Math.max(5, deliveryRate))}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5 text-center">
                  <div className="bg-white/5 rounded-lg p-1.5">
                    <span className="text-[10px] uppercase text-gray-400">Total</span>
                    <p className="text-xs font-black text-white">{b.totalRecipients}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-1.5">
                    <span className="text-[10px] uppercase text-gray-400">Sent</span>
                    <p className="text-xs font-black text-blue-400">{b.sentCount}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-1.5">
                    <span className="text-[10px] uppercase text-gray-400">Delivered</span>
                    <p className="text-xs font-black text-emerald-400">{b.deliveredCount}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-1.5">
                    <span className="text-[10px] uppercase text-gray-400">Read</span>
                    <p className="text-xs font-black text-purple-400">{b.readCount}</p>
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 pt-1 flex items-center justify-between">
                  <span>Launched: {new Date(b.createdAt).toLocaleDateString()}</span>
                  <span>Lang: {b.templateLanguage}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── 4-STEP WIZARD MODAL ───────────────────────────────────────────── */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#7FB706]" />
                  Launch Meta WhatsApp Broadcast
                </h3>
                <p className="text-[11px] text-gray-400">Step {step} of 4</p>
              </div>
              <button onClick={() => setIsWizardOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-4 gap-1">
              {[
                '1. Template',
                '2. Audience',
                '3. Variables',
                '4. Launch',
              ].map((label, idx) => {
                const sNum = (idx + 1) as 1 | 2 | 3 | 4;
                const isCurrent = step === sNum;
                const isPassed = step > sNum;
                return (
                  <div
                    key={label}
                    className={`text-center py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all ${
                      isCurrent
                        ? 'bg-[#7FB706] text-black font-black'
                        : isPassed
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/5 text-gray-500'
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {/* STEP 1: Choose Template */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Campaign Name *</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Q4 Restroom Cubicle Catalog Release"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Select Approved Template *</label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateName(tpl.name)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedTemplateName === tpl.name
                            ? 'bg-[#7FB706]/15 border-[#7FB706]'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white">{tpl.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            {tpl.status || 'APPROVED'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-[11px] line-clamp-2">{tpl.bodyText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Select Audience */}
            {step === 2 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Target Contact Segment</label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="all">All Contacts ({contacts.length} recipients)</option>
                    {tags.map((t) => (
                      <option key={t.id} value={t.name}>
                        Tag: #{t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-gray-400 uppercase text-[10px] font-bold">Estimated Audience</span>
                  <p className="text-xl font-black text-[#B5F823]">{audienceContacts.length} Recipients</p>
                  <p className="text-gray-400 text-[11px]">
                    Messages will be queued and sent via Meta WhatsApp Cloud API with compliant throttling.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: Parameter Personalization */}
            {step === 3 && (
              <div className="space-y-4 text-xs">
                <p className="text-gray-400">
                  Provide fallback values for template variable placeholders (e.g.{' '}
                  <code className="text-[#B5F823]">&#123;&#123;1&#125;&#125;</code> and{' '}
                  <code className="text-[#B5F823]">&#123;&#123;2&#125;&#125;</code>):
                </p>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Variable 1 (Customer Name / Title)</label>
                  <input
                    type="text"
                    value={var1Value}
                    onChange={(e) => setVar1Value(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Variable 2 (Brand / Reference)</label>
                  <input
                    type="text"
                    value={var2Value}
                    onChange={(e) => setVar2Value(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Review & Launch */}
            {step === 4 && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Campaign Name:</span>
                    <strong className="text-white">{campaignName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Template:</span>
                    <strong className="text-[#B5F823]">{selectedTemplateName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target Audience:</span>
                    <strong className="text-emerald-400">{audienceContacts.length} Contacts</strong>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Ready for instant dispatch. Messages will be delivered under Pacific WhatsApp Business.</span>
                </div>
              </div>
            )}

            {/* Footer Navigation */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as any) : s))}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs disabled:opacity-30"
              >
                Back
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s < 4 ? ((s + 1) as any) : s))}
                  className="px-5 py-2 rounded-lg bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black text-xs flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLaunching}
                  onClick={handleLaunchCampaign}
                  className="px-6 py-2 rounded-lg bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isLaunching ? 'Dispatching...' : 'Launch Broadcast'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
