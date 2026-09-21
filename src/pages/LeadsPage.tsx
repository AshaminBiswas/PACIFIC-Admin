import React, { useEffect, useState, useCallback } from 'react';
import { leadsApi } from '../api/services';
import type { Lead } from '../types/admin';
import { Search, RefreshCw, Eye, Trash2 } from 'lucide-react';

const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await leadsApi.list({ page, limit: 20, search: search || undefined });
      setLeads(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
    } catch { } finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleStatusChange = async (id: string, status: string) => {
    try { await leadsApi.update(id, { status: status as any }); fetch(); }
    catch { alert('Failed to update'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    try { await leadsApi.delete(id); fetch(); }
    catch { alert('Failed to delete'); }
  };

  const statusColors: Record<string, string> = {
    NEW: 'bg-blue-50 text-blue-700', CONTACTED: 'bg-yellow-50 text-yellow-700',
    QUALIFIED: 'bg-orange-50 text-orange-700', PROPOSAL_SENT: 'bg-purple-50 text-purple-700',
    WON: 'bg-green-50 text-green-700', LOST: 'bg-red-50 text-red-700',
    INACTIVE: 'bg-gray-100 text-gray-500', NEGOTIATING: 'bg-indigo-50 text-indigo-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search leads..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pacific-500" />
        </div>
        <button onClick={fetch} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={16} className="text-gray-500" /></button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="px-4 py-3" />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              : leads.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No leads found</td></tr>
              : leads.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{l.firstName} {l.lastName || ''}</td>
                  <td className="px-4 py-3"><div className="text-gray-600">{l.email}</div>{l.phone && <div className="text-xs text-gray-400">{l.phone}</div>}</td>
                  <td className="px-4 py-3 text-gray-500">{l.company || '—'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{l.source}</span></td>
                  <td className="px-4 py-3">
                    <select value={l.status} onChange={(e) => handleStatusChange(l.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none">
                      {['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'WON', 'LOST', 'INACTIVE'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-pacific-600"><Eye size={14} /></button>
                      <button onClick={() => handleDelete(l.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {leads.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={leads.length < 20} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsPage;
