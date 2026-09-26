import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Download, Search, Edit2, Trash2, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminContactQueries() {
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    requirement: "",
    message: "",
    status: "new",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    setLoading(true);
    let items: any[] = [];
    // Try contact_queries table
    const { data: cqData, error: cqErr } = await supabase
      .from('contact_queries')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!cqErr && cqData && cqData.length > 0) {
      items = cqData;
    } else {
      // Fallback to leads table
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .order('createdAt', { ascending: false });

      if (leadData) {
        items = leadData.map((l: any) => ({
          ...l,
          name: l.name || `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Inquiry Contact',
          email: l.email || '',
          phone: l.phone || '',
          company: l.company || '',
          requirement: l.requirement || l.notes || 'General Inquiry',
          message: l.message || '',
          status: l.status?.toLowerCase() || 'new',
          created_at: l.createdAt || l.created_at || new Date().toISOString(),
        }));
      }
    }
    setQueries(items);
    setLoading(false);
  };

  const downloadCSV = () => {
    if (queries.length === 0) return;
    const headers = ['Date', 'Status', 'Name', 'Email', 'Phone', 'Company', 'Requirement', 'Message'];
    const rows = queries.map(q => [
      new Date(q.created_at).toLocaleDateString(),
      `"${q.status}"`,
      `"${(q.name || '').replace(/"/g, '""')}"`,
      `"${(q.email || '').replace(/"/g, '""')}"`,
      `"${(q.phone || '').replace(/"/g, '""')}"`,
      `"${(q.company || '').replace(/"/g, '""')}"`,
      `"${(q.requirement || '').replace(/"/g, '""')}"`,
      `"${(q.message || '').replace(/"/g, '""')}"`,
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `contact_queries_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openModal = (item: any = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || "",
        email: item.email || "",
        phone: item.phone || "",
        company: item.company || "",
        requirement: item.requirement || "",
        message: item.message || "",
        status: item.status || "new",
      });
    } else {
      setEditingItem(null);
      setFormData({ name: "", email: "", phone: "", company: "", requirement: "", message: "", status: "new" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editingItem) {
      // Update
      const { error } = await supabase
        .from('contact_queries')
        .update(formData)
        .eq('id', editingItem.id);
      
      if (!error) {
        fetchQueries();
        closeModal();
      } else {
        alert("Failed to update: " + error.message);
      }
    } else {
      // Create
      const { error } = await supabase
        .from('contact_queries')
        .insert([formData]);
      
      if (!error) {
        fetchQueries();
        closeModal();
      } else {
        alert("Failed to create: " + error.message);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this query?")) return;
    try {
      await supabase.from('contact_queries').delete().eq('id', id);
      await supabase.from('leads').delete().eq('id', id);
      setQueries((prev) => prev.filter((q) => q.id !== id));
      fetchQueries();
    } catch (error: any) {
      alert("Failed to delete: " + (error?.message || "Unknown error"));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'in-progress': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const filteredQueries = queries.filter(q => 
    q.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Contact Queries</h1>
          <p className="text-gray-400 text-sm mt-1">Manage, update, and export customer inquiries.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => openModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-colors font-medium border border-white/5"
          >
            <Plus className="w-4 h-4" />
            New Query
          </button>
          <button
            onClick={downloadCSV}
            disabled={queries.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#7FB706] hover:bg-[#6ca305] text-white px-4 py-2 rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-white/5 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Status / Date</th>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Contact Details</th>
                <th className="px-6 py-4 font-medium">Requirement</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading queries...</td></tr>
              ) : filteredQueries.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No queries found.</td></tr>
              ) : (
                filteredQueries.map((query) => (
                  <tr key={query.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mb-2 uppercase tracking-wider ${getStatusColor(query.status)}`}>
                        {query.status}
                      </span>
                      <div className="text-gray-500 text-xs">
                        {new Date(query.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{query.name}</div>
                      {query.company && (
                        <div className="text-xs text-gray-500 mt-1">{query.company}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">{query.email}</div>
                      <div className="text-gray-400">{query.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white mb-1">{query.requirement || '-'}</div>
                      <div className="text-xs text-gray-500 max-w-[200px] truncate" title={query.message || ''}>
                        {query.message || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(query)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Edit Query"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(query.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Query"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <h3 className="text-xl font-bold text-white">
                  {editingItem ? "Edit Contact Query" : "New Contact Query"}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                <form id="queryForm" onSubmit={handleSave} className="space-y-6">
                  
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-[#030213] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7FB706] transition-colors"
                    >
                      <option value="new">New</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#030213] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7FB706] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#030213] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7FB706] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-[#030213] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7FB706] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Company</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full bg-[#030213] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7FB706] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Requirement</label>
                    <input
                      type="text"
                      value={formData.requirement}
                      onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                      className="w-full bg-[#030213] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7FB706] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-[#030213] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7FB706] transition-colors resize-none"
                    />
                  </div>
                </form>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="queryForm"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#7FB706] hover:bg-[#6ca305] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Query"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
