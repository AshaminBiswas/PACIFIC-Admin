import React, { useEffect, useState, useCallback } from 'react';
import { configuratorApi } from '../api/services';
import type { ConfiguratorDesign } from '../types/admin';
import { Search, RefreshCw, Eye, Trash2 } from 'lucide-react';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    SUBMITTED: 'bg-blue-50 text-blue-700',
    QUOTED: 'bg-yellow-50 text-yellow-700',
    CONVERTED: 'bg-green-50 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const ConfiguratorLeadsPage: React.FC = () => {
  const [designs, setDesigns] = useState<ConfiguratorDesign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDesigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await configuratorApi.list({ page, limit: 20 });
      setDesigns(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
    } catch { console.error('Failed to load configurator leads'); }
    finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetchDesigns(); }, [fetchDesigns]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await configuratorApi.updateStatus(id, status);
      fetchDesigns();
    } catch { alert('Failed to update status'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this design?')) return;
    try { await configuratorApi.delete(id); fetchDesigns(); }
    catch { alert('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">{total} total submissions</h2>
        <button onClick={fetchDesigns} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Design</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Lead</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Est. Price</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>))}</tr>
                ))
              ) : designs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No configurator submissions yet</td></tr>
              ) : (
                designs.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.designName || `Design #${d.id.slice(-6)}`}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.lead ? `${d.lead.firstName} ${d.lead.lastName || ''}` : '—'}
                      {d.lead?.email && <div className="text-xs text-gray-400">{d.lead.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {d.estimatedPrice ? `₹${Number(d.estimatedPrice).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={d.status}
                        onChange={(e) => handleStatusChange(d.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none"
                      >
                        {['DRAFT', 'SUBMITTED', 'QUOTED', 'CONVERTED'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(d.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-pacific-600"><Eye size={14} /></button>
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {designs.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={designs.length < 20} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfiguratorLeadsPage;
