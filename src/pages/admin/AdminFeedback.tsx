import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Download, Search, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminFeedback() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching feedback:", error);
    } else {
      setFeedbackList(data || []);
    }
    setLoading(false);
  };

  const downloadCSV = () => {
    if (feedbackList.length === 0) return;
    const headers = ['Date', 'Name', 'Company', 'Rating', 'Message'];
    const rows = feedbackList.map(f => [
      new Date(f.created_at).toLocaleDateString(),
      `"${(f.name || '').replace(/"/g, '""')}"`,
      `"${(f.company || '').replace(/"/g, '""')}"`,
      f.stars,
      `"${(f.message || '').replace(/"/g, '""')}"`,
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `feedback_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this feedback?")) return;
    const { error } = await supabase.from('feedback').delete().eq('id', id);
    if (!error) {
      fetchFeedback();
    } else {
      alert("Failed to delete: " + error.message);
    }
  };

  const filteredFeedback = feedbackList.filter(f => 
    f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Client Feedback</h1>
          <p className="text-gray-400 text-sm mt-1">Review feedback submitted by clients.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={downloadCSV}
            disabled={feedbackList.length === 0}
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
            placeholder="Search by name, company, or message..."
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
                <th className="px-6 py-4 font-medium">Date / Rating</th>
                <th className="px-6 py-4 font-medium">Client Info</th>
                <th className="px-6 py-4 font-medium">Message</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading feedback...</td></tr>
              ) : filteredFeedback.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No feedback found.</td></tr>
              ) : (
                filteredFeedback.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 mb-2 text-[#F59E0B]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            viewBox="0 0 24 24"
                            className="w-3.5 h-3.5"
                            fill={i < item.stars ? "currentColor" : "none"}
                            stroke={i < item.stars ? "currentColor" : "#4B5563"}
                            strokeWidth={1.5}
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{item.name}</div>
                      {item.company && (
                        <div className="text-xs text-gray-500 mt-1">{item.company}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 max-w-lg break-words">
                        {item.message || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors inline-flex"
                        title="Delete Feedback"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
