import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  Phone,
  MessageCircle,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Send,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building2,
  X,
  ChevronRight,
} from 'lucide-react';
import { piApi } from '../api/proformaApi';
import type { ProformaInvoice } from '../types/admin';
import DocumentFlowTimeline from '../components/common/DocumentFlowTimeline';

export default function ProformaInvoiceFollowupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pi, setPi] = useState<ProformaInvoice | null>(null);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for logging a touchpoint
  const [channel, setChannel] = useState('PHONE');
  const [followupStatus, setFollowupStatus] = useState('PROMISED_TO_PAY');
  const [priority, setPriority] = useState('MEDIUM');
  const [discussionNotes, setDiscussionNotes] = useState('');
  const [promisedPaymentDate, setPromisedPaymentDate] = useState('');
  const [promisedAmount, setPromisedAmount] = useState<string>('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [submittingTouchpoint, setSubmittingTouchpoint] = useState(false);

  // Advance modal state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'NEFT_RTGS',
    referenceNumber: '',
    notes: '',
  });
  const [recordingAdvance, setRecordingAdvance] = useState(false);

  // Email composer modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [piRes, followRes] = await Promise.all([
        piApi.getById(id),
        piApi.getFollowups(id).catch(() => ({ data: { data: [] } })),
      ]);

      const piData = piRes.data?.data ?? (piRes.data as any);
      setPi(piData);
      setFollowups(followRes.data?.data ?? (followRes.data as any) ?? []);

      const reqAdv = Number(piData.advanceRequiredAmount) || Math.round(Number(piData.grandTotal) * 0.5);
      const recvAdv = Number(piData.advanceReceivedAmount) || 0;
      const pendingAdv = Math.max(0, reqAdv - recvAdv);

      setPromisedAmount(String(pendingAdv));
      setAdvanceForm((prev) => ({
        ...prev,
        amount: pendingAdv,
      }));

      // Prepopulate email template
      setEmailSubject(`Advance Payment Follow-up: Proforma Invoice ${piData.piNumber} — Pacific Restroom Cubicle`);
      setEmailBody(
        `Dear ${piData.customer?.contactName || piData.customer?.legalName || 'Client'},\n\n` +
        `This is a gentle reminder regarding Proforma Invoice ${piData.piNumber} dated ${new Date(piData.piDate).toLocaleDateString('en-GB')}.\n\n` +
        `Total Bill Amount: ₹${Number(piData.grandTotal).toLocaleString('en-IN')}\n` +
        `Required 50% Advance: ₹${reqAdv.toLocaleString('en-IN')}\n` +
        `Advance Already Received: ₹${recvAdv.toLocaleString('en-IN')}\n` +
        `Pending Advance to Release Production: ₹${pendingAdv.toLocaleString('en-IN')}\n\n` +
        `Kindly remit the pending advance at your earliest convenience to avoid delays in materials reservation and factory fabrication.\n\n` +
        `Bank Details:\n` +
        `Account Name: Pacific Polyplast Solutions\n` +
        `Bank: HDFC Bank / ICICI Bank\n\n` +
        `Warm regards,\nFinance & Sales Coordination Team\nPacific Restroom Cubicle`
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load PI follow-up details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Log touchpoint
  const handleLogTouchpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pi || submittingTouchpoint) return;
    setSubmittingTouchpoint(true);
    try {
      await piApi.addFollowup(pi.id, {
        communicationChannel: channel,
        followupStatus,
        priority,
        discussionNotes,
        promisedPaymentDate: promisedPaymentDate || undefined,
        promisedAmount: promisedAmount ? Number(promisedAmount) : undefined,
        nextFollowupDate: nextFollowupDate || undefined,
      });
      setDiscussionNotes('');
      setPromisedPaymentDate('');
      setNextFollowupDate('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record touchpoint.');
    } finally {
      setSubmittingTouchpoint(false);
    }
  };

  // Record Advance
  const handleRecordAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pi || recordingAdvance) return;
    setRecordingAdvance(true);
    try {
      await piApi.recordAdvancePayment(pi.id, advanceForm);
      setShowAdvanceModal(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record advance payment.');
    } finally {
      setRecordingAdvance(false);
    }
  };

  // WhatsApp click handler
  const handleOpenWhatsApp = () => {
    if (!pi) return;
    const phone = pi.customer?.phone || pi.parties?.find((p) => p.partyRole === 'BILL_TO')?.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const clientName = pi.customer?.contactName || pi.customer?.legalName || 'Valued Client';
    const reqAdv = Number(pi.advanceRequiredAmount) || Math.round(Number(pi.grandTotal) * 0.5);
    const recvAdv = Number(pi.advanceReceivedAmount) || 0;
    const pendingAdv = Math.max(0, reqAdv - recvAdv);

    const message = encodeURIComponent(
      `Hello ${clientName},\n\n` +
      `Greetings from Pacific Restroom Cubicle.\n\n` +
      `This is regarding your Proforma Invoice *${pi.piNumber}*.\n` +
      `• Total Invoice: ₹${Number(pi.grandTotal).toLocaleString('en-IN')}\n` +
      `• Required Advance: ₹${reqAdv.toLocaleString('en-IN')}\n` +
      `• Received: ₹${recvAdv.toLocaleString('en-IN')}\n` +
      `• Pending Advance: *₹${pendingAdv.toLocaleString('en-IN')}*\n\n` +
      `Kindly confirm when the payment will be remitted so our factory team can schedule production and dispatch.\n\n` +
      `Thank you!`
    );

    window.open(`https://wa.me/${cleanPhone ? (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone) : ''}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-mono text-sm">Loading Advance Follow-up Hub...</p>
      </div>
    );
  }

  if (error || !pi) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-[#121226] border border-red-500/20 rounded-2xl text-center space-y-4 shadow-2xl">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Error Loading Follow-up Hub</h2>
        <p className="text-sm text-gray-400">{error || 'Record could not be found.'}</p>
        <Link
          to="/admin/dashboard/proforma-invoices"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Proforma Invoices
        </Link>
      </div>
    );
  }

  const grandTotal = Number(pi.grandTotal) || 0;
  const reqAdv = Number(pi.advanceRequiredAmount) || Math.round(grandTotal * 0.5);
  const recvAdv = Number(pi.advanceReceivedAmount) || 0;
  const pendingAdv = Math.max(0, reqAdv - recvAdv);
  const totalBalanceDue = Math.max(0, grandTotal - recvAdv);
  const advStatus = pi.advancePaymentStatus || (recvAdv >= reqAdv ? 'FULLY_RECEIVED' : recvAdv > 0 ? 'PARTIAL' : 'PENDING');
  const advPct = reqAdv > 0 ? Math.min(100, Math.round((recvAdv / reqAdv) * 100)) : 0;
  const phone = pi.customer?.phone || pi.parties?.find((p) => p.partyRole === 'BILL_TO')?.phone || '';
  const email = pi.customer?.email || pi.parties?.find((p) => p.partyRole === 'BILL_TO')?.email || '';

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/admin/dashboard/proforma-invoices/${pi.id}`)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Back to PI Details"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-white">
                Follow-up &amp; Advance Hub: {pi.piNumber}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 pl-10">
            Client: <strong className="text-white">{pi.customer?.legalName || 'Valued Client'}</strong> • Stage 02 Advance Recovery &amp; Omnichannel Touchpoints
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/admin/dashboard/proforma-invoices/${pi.id}`}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold"
          >
            View PI 360°
          </Link>
          <button
            onClick={() => setShowAdvanceModal(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" /> Record Advance
          </button>
        </div>
      </div>

      {/* ── Universal 7-Stage Document Timeline (Stage 2 highlighted) ── */}
      <DocumentFlowTimeline
        currentStage={2}
        linkedDocs={{
          piId: pi.id,
          piNumber: pi.piNumber,
          quotationId: pi.quotationId || undefined,
          quotationRef: pi.quotationRef || undefined,
          orderId: pi.convertedOrderId || pi.orderId || undefined,
        }}
        advanceInfo={{
          grandTotal,
          advanceRequired: reqAdv,
          advanceReceived: recvAdv,
          advancePaymentStatus: advStatus,
        }}
      />

      {/* ── Advance Payment Hero Tracker ───────────────────────── */}
      <div className="bg-gradient-to-br from-[#121226] via-[#101026] to-[#0c0c1e] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Advance Clearance Status</h3>
              <p className="text-xs text-gray-400">Production is queued once 50% advance is received and verified.</p>
            </div>
          </div>
          <span
            className={`self-start sm:self-auto text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
              advStatus === 'FULLY_RECEIVED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : advStatus === 'PARTIAL'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {advStatus === 'FULLY_RECEIVED' ? '✓ Fully Cleared' : advStatus === 'PARTIAL' ? '⚡ Partially Received' : '⏳ Advance Pending'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-[11px] text-gray-400">Total Proforma Value</span>
            <div className="text-lg font-black text-white mt-1">₹ {grandTotal.toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-[11px] text-gray-400">Required Advance ({Number(pi.advancePercentage) || 50}%)</span>
            <div className="text-lg font-black text-amber-400 mt-1">₹ {reqAdv.toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-[11px] text-gray-400">Received Advance</span>
            <div className="text-lg font-black text-emerald-400 mt-1">₹ {recvAdv.toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-[11px] text-gray-400">Pending Advance Needed</span>
            <div className="text-lg font-black text-rose-400 mt-1">₹ {pendingAdv.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Advance Progress:</span>
            <span className="font-mono font-bold text-white">{advPct}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                advStatus === 'FULLY_RECEIVED' ? 'bg-emerald-500' : advStatus === 'PARTIAL' ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${advPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Omnichannel Quick Actions (44px mobile touch targets) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Call Client */}
        <a
          href={phone ? `tel:${phone}` : '#'}
          onClick={(e) => {
            if (!phone) {
              e.preventDefault();
              alert('No contact phone found for this client.');
            }
          }}
          className="flex items-center justify-center gap-2 p-3.5 min-h-[48px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-2xl font-bold text-xs transition-all shadow-md group"
        >
          <Phone className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          <span>Call Client {phone ? `(${phone})` : ''}</span>
        </a>

        {/* WhatsApp Message */}
        <button
          onClick={handleOpenWhatsApp}
          className="flex items-center justify-center gap-2 p-3.5 min-h-[48px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl font-bold text-xs transition-all shadow-md group cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>WhatsApp Advance Reminder</span>
        </button>

        {/* Send Email */}
        <button
          onClick={() => setShowEmailModal(true)}
          className="flex items-center justify-center gap-2 p-3.5 min-h-[48px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-2xl font-bold text-xs transition-all shadow-md group cursor-pointer"
        >
          <Mail className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          <span>Compose Email Follow-up</span>
        </button>
      </div>

      {/* ── 2-Column: Log Touchpoint & Follow-up History ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Log Touchpoint Form */}
        <div className="lg:col-span-5 bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Clock className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Log Follow-up Touchpoint</h4>
          </div>

          <form onSubmit={handleLogTouchpoint} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Communication Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-medium"
              >
                <option value="PHONE">Phone Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="VISIT">In-Person Meeting</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Follow-up Outcome / Status</label>
              <select
                value={followupStatus}
                onChange={(e) => setFollowupStatus(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-medium"
              >
                <option value="PROMISED_TO_PAY">Promised to Pay Advance</option>
                <option value="CONTACTED">Contacted / In Discussion</option>
                <option value="PENDING">Pending Response / Callback</option>
                <option value="DISPUTED">Disputed / Requested Revision</option>
                <option value="RESOLVED">Resolved / Payment Received</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Promised Pay Date</label>
                <input
                  type="date"
                  value={promisedPaymentDate}
                  onChange={(e) => setPromisedPaymentDate(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Promised Amount (₹)</label>
                <input
                  type="number"
                  placeholder="Amount"
                  value={promisedAmount}
                  onChange={(e) => setPromisedAmount(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Next Follow-up Scheduled Date</label>
              <input
                type="datetime-local"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Discussion Notes / Client Remarks *</label>
              <textarea
                required
                rows={3}
                placeholder="What did the client say regarding advance remittance, account department approval, or site readiness?..."
                value={discussionNotes}
                onChange={(e) => setDiscussionNotes(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submittingTouchpoint}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submittingTouchpoint ? 'Saving Touchpoint...' : 'Record Touchpoint'}
            </button>
          </form>
        </div>

        {/* Right: Follow-up & Touchpoint History Timeline */}
        <div className="lg:col-span-7 bg-[#121226] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#7FB706]" />
              <h4 className="text-sm font-bold text-white">Touchpoint &amp; Payment History</h4>
            </div>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              title="Refresh history"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {followups && followups.length > 0 ? (
              followups.map((item, idx) => (
                <div key={item.id || idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white uppercase">{item.communicationChannel || 'PHONE'}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.followupStatus === 'RESOLVED'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : item.followupStatus === 'PROMISED_TO_PAY'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}
                      >
                        {item.followupStatus}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-gray-500">
                      {new Date(item.createdAt).toLocaleString('en-GB')}
                    </span>
                  </div>

                  {item.notes && <p className="text-xs text-gray-300 leading-relaxed">{item.notes}</p>}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 pt-1 border-t border-white/5">
                    {item.promisedAmount && (
                      <span>Promised: <strong className="text-emerald-400 font-mono">₹{Number(item.promisedAmount).toLocaleString('en-IN')}</strong></span>
                    )}
                    {item.promisedPaymentDate && (
                      <span>Target: <strong className="text-white">{new Date(item.promisedPaymentDate).toLocaleDateString('en-GB')}</strong></span>
                    )}
                    {item.nextFollowupDate && (
                      <span>Next Follow-up: <strong className="text-amber-300">{new Date(item.nextFollowupDate).toLocaleString('en-GB')}</strong></span>
                    )}
                    {item.assignedUser && (
                      <span className="ml-auto text-gray-500">By: {item.assignedUser.firstName || 'Staff'}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500 space-y-2">
                <Clock className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">No follow-up touchpoints logged yet.</p>
                <p className="text-[11px] text-gray-600">Use the form on the left or the communication buttons to log your first client touchpoint.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: Record Advance Payment ──────────────────────── */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0e0e1e]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Record Advance Receipt</h3>
              </div>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordAdvance} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-1 font-mono">
                <div className="text-gray-400">Total Proforma Bill: <span className="text-white font-bold">₹{grandTotal.toLocaleString('en-IN')}</span></div>
                <div className="text-gray-400">Required Advance: <span className="text-amber-400 font-bold">₹{reqAdv.toLocaleString('en-IN')}</span></div>
                <div className="text-gray-400">Pending Advance: <span className="text-rose-400 font-bold">₹{pendingAdv.toLocaleString('en-IN')}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Receipt Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: Number(e.target.value) })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white font-bold text-lg focus:border-emerald-400 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Payment Mode</label>
                  <select
                    value={advanceForm.paymentMode}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, paymentMode: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
                  >
                    <option value="NEFT_RTGS">NEFT / RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Receipt Date</label>
                  <input
                    type="date"
                    required
                    value={advanceForm.paymentDate}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, paymentDate: e.target.value })}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">UTR / Bank Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-90812903"
                  value={advanceForm.referenceNumber}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, referenceNumber: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Bank Remarks / Verified By</label>
                <textarea
                  rows={2}
                  placeholder="Notes..."
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingAdvance}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {recordingAdvance ? 'Recording...' : 'Save Advance Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Email Composer ──────────────────────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121226] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0e0e1e]">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Compose Email Follow-up</h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">To Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-gray-400 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Message Body</label>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl p-2.5 text-white text-xs font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <a
                  href={`mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                  onClick={() => setShowEmailModal(false)}
                  className="px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
                >
                  <Send className="w-3.5 h-3.5" /> Open in Mail Client
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
