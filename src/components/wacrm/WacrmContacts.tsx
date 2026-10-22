import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  Tag as TagIcon,
  MessageSquare,
  Edit2,
  Trash2,
  Download,
  Upload,
  X,
  ExternalLink,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { wacrmApi } from '../../api/wacrmApi';
import type { WacrmContact, WacrmTag, CreateWacrmContactInput } from '../../types/admin';

interface WacrmContactsProps {
  contacts: WacrmContact[];
  tags: WacrmTag[];
  onRefreshContacts: () => void;
  onOpenChat: (contact: WacrmContact) => void;
}

export default function WacrmContacts({
  contacts,
  tags,
  onRefreshContacts,
  onOpenChat,
}: WacrmContactsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // ─── Modal States ───────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<WacrmContact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState<CreateWacrmContactInput>({
    name: '',
    phone: '',
    email: '',
    company: '',
    notes: '',
    status: 'lead',
    tags: [],
  });

  const handleOpenAddModal = () => {
    setEditingContact(null);
    setForm({
      name: '',
      phone: '',
      email: '',
      company: '',
      notes: '',
      status: 'lead',
      tags: [],
    });
    setTagInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (contact: WacrmContact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      company: contact.company || '',
      notes: contact.notes || '',
      status: contact.status || 'lead',
      tags: contact.tags?.map((t) => t.name) || [],
    });
    setTagInput('');
    setIsModalOpen(true);
  };

  const handleAddTagToForm = () => {
    if (!tagInput.trim()) return;
    const norm = tagInput.trim();
    if (!form.tags?.includes(norm)) {
      setForm((prev) => ({ ...prev, tags: [...(prev.tags || []), norm] }));
    }
    setTagInput('');
  };

  const handleRemoveTagFromForm = (tagToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      alert('Name and Phone Number are mandatory');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingContact) {
        await wacrmApi.updateContact(editingContact.id, form);
      } else {
        await wacrmApi.createContact(form);
      }
      setIsModalOpen(false);
      onRefreshContacts();
    } catch (err: any) {
      alert(err?.message || 'Failed to save contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (contact: WacrmContact) => {
    if (!window.confirm(`Delete ${contact.name} and conversation history?`)) return;
    try {
      await wacrmApi.deleteContact(contact.id);
      onRefreshContacts();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  // ─── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (contacts.length === 0) return;
    const headers = ['Name', 'Phone', 'Email', 'Company', 'Status', 'Tags', 'Notes', 'Created At'];
    const rows = filteredContacts.map((c) => [
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.company || ''}"`,
      `"${c.status}"`,
      `"${c.tags?.map((t) => t.name).join(', ') || ''}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      `"${c.createdAt}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pacific_wacrm_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Filtered Contacts ──────────────────────────────────────────────────────
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTag = !selectedTag || c.tags?.some((t) => t.name === selectedTag);
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchSearch && matchTag && matchStatus;
    });
  }, [contacts, searchQuery, selectedTag, statusFilter]);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ─── Top Control Bar ───────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0e26]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              Audience & Commercial Contacts
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40">
                {filteredContacts.length} Contacts
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Verified phone numbers, building firms, architects, and direct WhatsApp threads
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4 text-[#B5F823]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* ─── Search, Filters & Tag Pills ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by contact name, phone, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
        >
          <option value="all">All Statuses</option>
          <option value="lead">Commercial Leads</option>
          <option value="customer">Active Customers</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Tag Filter Pills */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTag('')}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
              !selectedTag
                ? 'bg-[#7FB706] text-black font-black'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            All Tags
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTag(selectedTag === t.name ? '' : t.name)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
                selectedTag === t.name
                  ? 'bg-[#B5F823] text-black font-black'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:border-white/30'
              }`}
            >
              #{t.name}
            </button>
          ))}
        </div>
      )}

      {/* ─── Contacts Table ────────────────────────────────────────────────── */}
      <div className="bg-[#0b0922] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-4">Contact Profile</th>
                <th className="py-3 px-4">WhatsApp Phone</th>
                <th className="py-3 px-4">Company / Architect</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4">Active Deals</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No contacts matched your search or tag criteria.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7FB706]/30 to-blue-500/30 text-white font-bold flex items-center justify-center text-xs">
                          {contact.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{contact.name}</p>
                          {contact.email && <p className="text-[11px] text-gray-500">{contact.email}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#B5F823] whitespace-nowrap">
                      {contact.phone}
                    </td>

                    <td className="py-3 px-4">
                      {contact.company ? (
                        <span className="flex items-center gap-1 font-medium text-white">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {contact.company}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {contact.tags?.length ? (
                          contact.tags.map((t) => (
                            <span
                              key={t.id}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-300"
                            >
                              {t.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-600 text-[11px]">—</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {contact.deals?.length ? (
                        <span className="text-xs font-bold text-emerald-400">
                          {contact.deals.length} Deal ({contact.deals[0].stageName})
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          contact.status === 'customer'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : contact.status === 'lead'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}
                      >
                        {contact.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenChat(contact)}
                          title="Open WhatsApp Thread"
                          className="p-1.5 rounded-lg bg-[#7FB706]/20 border border-[#7FB706]/40 text-[#B5F823] hover:bg-[#7FB706]/30 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(contact)}
                          title="Edit Contact"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact)}
                          title="Delete Contact"
                          className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
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

      {/* ─── ADD / EDIT CONTACT MODAL ──────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7FB706]" />
                {editingContact ? 'Edit Commercial Contact' : 'Create Commercial Contact'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ar. Rajesh Mehta"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">WhatsApp Phone *</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98185 92113"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Company / Project</label>
                  <input
                    type="text"
                    value={form.company || ''}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="e.g. DLF Commercial Towers"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="rajesh@dlf.in"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Lifecycle Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white"
                >
                  <option value="lead">Commercial Lead</option>
                  <option value="customer">Active Customer</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Tag Editor */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTagToForm();
                      }
                    }}
                    placeholder="Add tag (e.g. HPL-12mm, Architect) and hit Enter"
                    className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddTagToForm}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {form.tags?.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-[#7FB706]/20 text-[#B5F823] border border-[#7FB706]/40 text-xs flex items-center gap-1"
                    >
                      {t}
                      <button type="button" onClick={() => handleRemoveTagFromForm(t)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Specifications & Internal Notes</label>
                <textarea
                  rows={2}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Cubicle layout details, preferred board shade..."
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white resize-none"
                />
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
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingContact ? 'Update Contact' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
