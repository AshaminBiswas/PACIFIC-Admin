import React from 'react';
import {
  X,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  MessageCircle,
  ExternalLink,
  Layers,
  Lock,
  Columns,
  Sparkles,
  Flame,
  CheckCircle2,
  Plus,
  Send,
  Link2,
} from 'lucide-react';
import type { Lead } from '../../types/admin';

interface LeadDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onOpenFollowupModal: () => void;
  onOpenQuotationModal: () => void;
}

export default function LeadDetailDrawer({
  isOpen,
  onClose,
  lead,
  onOpenFollowupModal,
  onOpenQuotationModal,
}: LeadDetailDrawerProps) {
  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-[#09071a] border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Glow Accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 shrink-0" />

        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {lead.leadNumber}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  lead.priority === 'HOT'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : lead.priority === 'WARM'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}
              >
                {lead.priority === 'HOT' && '🔥 '}
                {lead.priority} PRIORITY
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-gray-200">
                {lead.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {lead.firstName} {lead.lastName || ''}
            </h2>
            <p className="text-xs text-gray-400">{lead.company || 'Direct Client'} • {lead.city || 'Location N/A'}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Top Bar */}
        <div className="px-4 sm:px-6 py-3 bg-white/5 border-b border-white/5 flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenFollowupModal}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 transition flex items-center gap-1.5 shadow-md shadow-sky-600/20"
          >
            <Clock className="w-3.5 h-3.5" />
            Log Touchpoint
          </button>

          <button
            onClick={onOpenQuotationModal}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <FileText className="w-3.5 h-3.5" />
            {lead.quotationNumber ? 'Quotation Actions' : 'Generate / Link Quote'}
          </button>

          {lead.phone && (
            <a
              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          )}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Linked Quotation Card */}
          {lead.quotationNumber ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Linked Sales Quotation
                </span>
                <span className="font-mono text-xs font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/20">
                  {lead.quotationNumber}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gray-300">Net Quotation Value:</span>
                <span className="text-lg font-mono font-bold text-white">
                  ₹{Number(lead.quotationAmount || lead.estimatedValue || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-emerald-500/20">
                <span>Status: <strong className="text-emerald-300">{lead.quotationStatus || 'SENT'}</strong></span>
                <button
                  onClick={onOpenQuotationModal}
                  className="text-emerald-400 hover:text-emerald-300 underline font-medium flex items-center gap-1 text-[11px]"
                >
                  <Send className="w-3 h-3" />
                  Dispatch Notice to Customer
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-400">No Quotation Linked Yet</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Customer is evaluating. Click to generate formal quote or attach existing quote.
                </p>
              </div>
              <button
                onClick={onOpenQuotationModal}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 transition"
              >
                Create Quote
              </button>
            </div>
          )}

          {/* Product Requirement Specs */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Technical Specifications ({lead.productCategory?.replace('_', ' ')})
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block">Product System:</span>
                <span className="font-semibold text-white">{lead.productCategory?.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Estimated Quantity:</span>
                <span className="font-semibold text-white">{lead.estimatedQuantity} Units</span>
              </div>

              {lead.cubicleSpecs && (
                <>
                  <div>
                    <span className="text-gray-500 block">Board Core / Material:</span>
                    <span className="text-gray-200">
                      {lead.cubicleSpecs.boardThickness} {lead.cubicleSpecs.boardType}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Hardware Package:</span>
                    <span className="text-gray-200">{lead.cubicleSpecs.hardwarePackage}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Color / Finish:</span>
                    <span className="text-gray-200">{lead.cubicleSpecs.colorPreference || 'Teak Woodgrain'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Model Style:</span>
                    <span className="text-gray-200">{lead.cubicleSpecs.cubicleModel}</span>
                  </div>
                </>
              )}

              {lead.lockerSpecs && (
                <>
                  <div>
                    <span className="text-gray-500 block">Locker Configuration:</span>
                    <span className="text-gray-200">{lead.lockerSpecs.lockerTiers}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Lock Mechanism:</span>
                    <span className="text-gray-200">{lead.lockerSpecs.lockType}</span>
                  </div>
                </>
              )}

              {lead.urinalSpecs && (
                <>
                  <div>
                    <span className="text-gray-500 block">Urinal Screen Size:</span>
                    <span className="text-gray-200">{lead.urinalSpecs.screenDimensions}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Mounting Style:</span>
                    <span className="text-gray-200">{lead.urinalSpecs.mountingType}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contact & Company Details Card */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              Prospect Information
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block">Contact Person:</span>
                <span className="text-white font-medium">{lead.firstName} {lead.lastName || ''}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Client Classification:</span>
                <span className="text-gray-200">{lead.clientType || 'Corporate Client'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Phone:</span>
                <span className="text-white font-mono">{lead.phone || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Email:</span>
                <span className="text-white font-mono">{lead.email || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 block">Site Delivery Address:</span>
                <span className="text-gray-300">{lead.address || lead.city || '—'}</span>
              </div>
            </div>
          </div>

          {/* Omnichannel Follow-Up Records Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Follow-Up Touchpoint History ({lead.followupCount || 0})
              </span>
              <button
                onClick={onOpenFollowupModal}
                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Touchpoint
              </button>
            </div>

            {(!lead.followups || lead.followups.length === 0) ? (
              <div className="p-4 rounded-xl bg-white/5 text-center text-xs text-gray-400">
                No follow-up touchpoints recorded yet. Click above to log the first phone call, meeting, or message.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                {lead.followups.map((fup) => (
                  <div key={fup.id} className="relative group">
                    <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-sky-500 ring-4 ring-[#09071a]" />
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                          {fup.channel}
                          {fup.outcome && (
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 text-[10px]">
                              {fup.outcome}
                            </span>
                          )}
                        </span>
                        <span className="text-gray-400 font-mono">
                          {new Date(fup.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{fup.discussionNotes}</p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-white/5">
                        <span>Logged by: {fup.performedByName || 'Sales Rep'}</span>
                        {fup.nextFollowupDate && (
                          <span className="text-amber-400 font-medium">
                            Next due: {new Date(fup.nextFollowupDate).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
