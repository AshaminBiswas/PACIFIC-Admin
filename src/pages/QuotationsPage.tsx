import React, { useEffect, useState, useCallback } from 'react';
import { quotesApi } from '../api/services';
import type { Quotation } from '../types/admin';
import { Plus, RefreshCw, Eye, Trash2 } from 'lucide-react';

const QuotationsPage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await quotesApi.list({ page, limit: 20 });
      setQuotes(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
    } catch { console.error('Failed to load quotes'); }
    finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quotation?')) return;
    try { await quotesApi.delete(id); fetch(); }
    catch { alert('Failed to delete'); }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600', SENT: 'bg-blue-50 text-blue-700',
    VIEWED: 'bg-yellow-50 text-yellow-700', ACCEPTED: 'bg-green-50 text-green-700',
    REJECTED: 'bg-red-50 text-red-700', EXPIRED: 'bg-orange-50 text-orange-700', CONVERTED: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">{total} total quotations</h2>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={16} className="text-gray-500" /></button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-pacific-600 text-white rounded-lg text-sm hover:bg-pacific-700"><Plus size={16} /> New Quote</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Quote #</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Lead</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="px-4 py-3" />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              : quotes.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No quotations yet</td></tr>
              : quotes.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-pacific-700">{q.quoteNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{q.lead ? `${q.lead.firstName} ${q.lead.lastName || ''}` : '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">₹{Number(q.totalAmount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[q.status] || ''}`}>{q.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(q.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-pacific-600"><Eye size={14} /></button>
                      <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {quotes.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={quotes.length < 20} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationsPage;
