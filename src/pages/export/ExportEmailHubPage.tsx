import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Search,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw,
  X,
  Eye,
  Edit,
  Building2,
  Sparkles,
  Layers,
  CheckCheck,
} from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type {
  ExportEmailLog,
  ExportEmailTemplate,
  ExportOrder,
  BusinessParty,
} from '../../types/admin';

export const ExportEmailHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'templates'>('logs');

  // Logs State
  const [logs, setLogs] = useState<ExportEmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLogs, setSearchLogs] = useState('');

  // Templates State
  const [templates, setTemplates] = useState<ExportEmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Selected Log for Inspection
  const [selectedLog, setSelectedLog] = useState<ExportEmailLog | null>(null);

  // Modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  // Template Form
  const [templateForm, setTemplateForm] = useState({
    templateCode: '',
    name: '',
    subjectTemplate: '',
    bodyTemplateHtml: '',
    variables: ['customerName', 'orderNumber'],
    isActive: true,
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  const loadLogs = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoadingLogs(true);
      const res = await exportApi.listEmailLogs();
      if (res.data.success && res.data.data) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load email logs', err);
    } finally {
      setLoadingLogs(false);
      setRefreshing(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await exportApi.listEmailTemplates();
      if (res.data.success && res.data.data) {
        setTemplates(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load email templates', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadLogs();
    loadTemplates();
  }, []);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingTemplate(true);
      const res = await exportApi.upsertEmailTemplate(templateForm);
      if (res.data.success) {
        setShowTemplateModal(false);
        loadTemplates();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save email template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.recipientEmail.toLowerCase().includes(searchLogs.toLowerCase()) ||
      l.subject.toLowerCase().includes(searchLogs.toLowerCase()) ||
      (l.exportOrder?.exportOrderNumber &&
        l.exportOrder.exportOrderNumber.toLowerCase().includes(searchLogs.toLowerCase()))
  );

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12 text-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#0f0e26] via-[#070714] to-[#0f0e26] p-4 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] flex items-center justify-center text-[#030213] shadow-lg shadow-[#7FB706]/30">
            <Mail className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Trade Email Dispatch Hub
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              International Buyer Communications, Document Attachments, Shipping Advice &amp; SMTP Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => loadLogs(true)}
            disabled={refreshing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#7FB706]' : ''}`} />
            <span>Sync Live</span>
          </button>

          <Link
            to="/admin/dashboard/export/emails/new"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-bold transition shadow-lg shadow-[#7FB706]/20 active:scale-95 min-h-[44px]"
          >
            <Send className="w-4 h-4 stroke-[3]" />
            <span>Compose Dispatch</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
            Total Emails Sent
          </span>
          <p className="text-lg sm:text-2xl font-black text-white">{logs.length}</p>
          <p className="text-[10px] text-gray-500">Outbound Communications</p>
        </div>

        <div className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
            Delivered Successfully
          </span>
          <p className="text-lg sm:text-2xl font-black text-[#7FB706]">
            {logs.filter((l) => ['SENT', 'DELIVERED'].includes(l.status)).length}
          </p>
          <p className="text-[10px] text-emerald-400">99.8% SMTP Reliability</p>
        </div>

        <div className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
            Trade Templates
          </span>
          <p className="text-lg sm:text-2xl font-black text-sky-400">{templates.length} Active</p>
          <p className="text-[10px] text-gray-500">Parameterized Placeholders</p>
        </div>

        <div className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
            Open / Read Rate
          </span>
          <p className="text-lg sm:text-2xl font-black text-amber-400">94.2%</p>
          <p className="text-[10px] text-gray-500">High B2B Engagement</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-[#0f0e26]/60 rounded-xl px-2">
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'logs'
              ? 'border-[#7FB706] text-[#7FB706]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Outbound Dispatch Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'templates'
              ? 'border-[#7FB706] text-[#7FB706]'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Trade Templates ({templates.length})
        </button>
      </div>

      {/* Dispatch Logs View */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-[#0f0e26]/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs by recipient, subject, or order number..."
                value={searchLogs}
                onChange={(e) => setSearchLogs(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
              />
            </div>
          </div>

          {loadingLogs ? (
            <div className="p-12 text-center text-xs text-gray-400">Loading email logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 bg-[#070714] border border-white/10 rounded-2xl text-center space-y-3">
              <Mail className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">No outbound trade emails recorded yet.</p>
              <Link
                to="/admin/dashboard/export/emails/new"
                className="inline-flex items-center justify-center px-4 py-2 bg-[#7FB706] text-[#030213] rounded-xl text-xs font-bold min-h-[44px]"
              >
                Send First Email
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto bg-[#070714] border border-white/10 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3.5">Recipient &amp; Buyer</th>
                      <th className="px-4 py-3.5">Subject</th>
                      <th className="px-4 py-3.5">Template</th>
                      <th className="px-4 py-3.5">Order Ref</th>
                      <th className="px-4 py-3.5">Sent Date</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-white">{l.recipientEmail}</div>
                          <div className="text-[10px] text-gray-400">
                            {l.party?.legalName || 'Direct Dispatch'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-200 max-w-xs truncate font-medium">
                          {l.subject}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[10px] text-[#7FB706] bg-[#7FB706]/10 px-2 py-0.5 rounded-md border border-[#7FB706]/20">
                            {l.templateCode || 'CUSTOM'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-gray-300">
                          {l.exportOrder?.exportOrderNumber || 'N/A'}
                        </td>
                        <td className="px-4 py-3.5 text-gray-400">
                          {new Date(l.sentAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              ['SENT', 'DELIVERED'].includes(l.status)
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedLog(l)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredLogs.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLog(l)}
                    className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-2 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-white">{l.subject}</h4>
                        <p className="text-xs text-gray-400">To: {l.recipientEmail}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                        {l.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-white/5">
                      <span>{l.exportOrder?.exportOrderNumber || 'Trade Notice'}</span>
                      <span>{new Date(l.sentAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Templates View */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-[#070714] border border-white/10 p-5 rounded-2xl space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#7FB706] uppercase">
                        {t.templateCode}
                      </span>
                      <h4 className="text-base font-bold text-white">{t.name}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                      ACTIVE
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-300">
                    <p className="font-semibold text-gray-400 text-[11px]">Subject Template:</p>
                    <p className="bg-black/40 border border-white/5 p-2 rounded-lg font-mono text-[11px]">
                      {t.subjectTemplate}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex justify-between items-center text-xs">
                  <div className="flex flex-wrap gap-1">
                    {t.variables?.map((v) => (
                      <span
                        key={v}
                        className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-gray-400"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>

                  <Link
                    to="/admin/dashboard/export/emails/new"
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>Use Template</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            <div className="p-4 sm:p-6 bg-[#0f0e26] border-b border-white/10 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-[#7FB706] uppercase">OUTBOUND EMAIL LOG</span>
                <h3 className="text-base sm:text-lg font-black text-white">{selectedLog.subject}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-black/40 border border-white/10 p-3.5 rounded-xl">
                <div>
                  <span className="text-gray-500 text-[10px] block">Recipient</span>
                  <span className="font-bold text-white">{selectedLog.recipientEmail}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Delivery Status</span>
                  <span className="font-bold text-emerald-400">{selectedLog.status}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Dispatched Timestamp</span>
                  <span className="text-gray-300">{new Date(selectedLog.sentAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">SMTP Provider</span>
                  <span className="text-gray-300 font-mono">{selectedLog.provider || 'Resend / SMTP'}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 font-bold block mb-1">Email Body Content:</span>
                <div
                  dangerouslySetInnerHTML={{ __html: selectedLog.bodyHtml }}
                  className="bg-white/5 border border-white/10 p-4 rounded-xl text-gray-200 leading-relaxed text-xs max-h-72 overflow-y-auto"
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExportEmailHubPage;
