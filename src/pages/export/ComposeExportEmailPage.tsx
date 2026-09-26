import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, Send, Mail } from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type { ExportOrder, ExportEmailTemplate } from '../../types/admin';

const LOCAL_STORAGE_KEY = 'pacific_create_export_email_v1';

interface EmailFormData {
  exportOrderId: string;
  partyId: string;
  recipientEmail: string;
  ccEmails: string;
  bccEmails: string;
  templateCode: string;
  subject: string;
  bodyHtml: string;
}

const INITIAL_FORM_DATA: EmailFormData = {
  exportOrderId: '',
  partyId: '',
  recipientEmail: '',
  ccEmails: '',
  bccEmails: '',
  templateCode: 'EXPORT_ORDER_CONFIRMATION',
  subject: '',
  bodyHtml: '',
};

export default function ComposeExportEmailPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [templates, setTemplates] = useState<ExportEmailTemplate[]>([]);

  const [formData, setFormData] = useState<EmailFormData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM_DATA, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM_DATA;
  });

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [oRes, tRes] = await Promise.all([
          exportApi.listOrders({ limit: 100 }),
          exportApi.listEmailTemplates()
        ]);
        if (oRes.data.success && oRes.data.data) setOrders(oRes.data.data.items);
        if (tRes.data.success && tRes.data.data) setTemplates(tRes.data.data);
      } catch (err) {
        console.error('Failed to load email lookups', err);
      }
    };
    loadLookups();
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
  }, [formData]);

  const handleOrderSelect = (orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (found) {
      setFormData({
        ...formData,
        exportOrderId: orderId,
        partyId: found.partyId,
        recipientEmail: found.party?.email || formData.recipientEmail,
        subject: `Export Order #${found.exportOrderNumber} Update — Pacific Products & Solutions`,
      });
    } else {
      setFormData({
        ...formData,
        exportOrderId: orderId,
      });
    }
  };

  const handleTemplateSelect = (code: string) => {
    const tmpl = templates.find((t) => t.templateCode === code);
    if (tmpl) {
      setFormData({
        ...formData,
        templateCode: code,
        subject: tmpl.subjectTemplate,
        bodyHtml: tmpl.bodyTemplateHtml,
      });
    } else {
      setFormData({
        ...formData,
        templateCode: code,
      });
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset this draft? All inputs will be cleared.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipientEmail) {
      alert('Please enter a recipient email');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await exportApi.sendTradeEmail(formData);
      if (res.data.success) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        alert('Email Dispatched successfully!');
        navigate('/admin/dashboard/export/emails');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to dispatch trade email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard/export/emails" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#7FB706]" />
              Compose Trade Email
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Send messages using presets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved in Local Storage</span>
            {lastSavedTime && <span className="text-[11px] opacity-80">({lastSavedTime})</span>}
          </div>
          <button type="button" onClick={handleReset} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Draft</span>
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 mb-4">Email Details</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Link Export Order (Optional)</label>
              <select
                value={formData.exportOrderId}
                onChange={(e) => handleOrderSelect(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">Select Export Order</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.exportOrderNumber} - {o.party?.legalName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Template Preset</label>
              <select
                value={formData.templateCode}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              >
                <option value="">No Template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.templateCode}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Recipient Email *</label>
            <input
              required
              type="email"
              placeholder="procurement@foreignbuyer.com"
              value={formData.recipientEmail}
              onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">CC Emails</label>
              <input
                type="text"
                placeholder="logistics@buyer.com"
                value={formData.ccEmails}
                onChange={(e) => setFormData({ ...formData, ccEmails: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">BCC Emails</label>
              <input
                type="text"
                placeholder="exports@pacificrestroomcubicle.com"
                value={formData.bccEmails}
                onChange={(e) => setFormData({ ...formData, bccEmails: e.target.value })}
                className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Subject Line *</label>
            <input
              required
              type="text"
              placeholder="Export Shipment Advice / Order Update"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Body (HTML Supported)</label>
            <textarea
              rows={8}
              placeholder="<p>Dear Customer,</p><p>We are pleased to inform you...</p>"
              value={formData.bodyHtml}
              onChange={(e) => setFormData({ ...formData, bodyHtml: e.target.value })}
              className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#7FB706]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3 mt-6">
          <Link to="/admin/dashboard/export/emails" className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50">
            <Send className="w-5 h-5" />
            {isSubmitting ? 'Sending...' : 'Dispatch Email'}
          </button>
        </div>
      </form>
    </div>
  );
}
