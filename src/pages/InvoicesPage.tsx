import React, { useEffect, useState, useCallback } from 'react';
import { invoicesApi } from '../api/services';
import type { Invoice } from '../types/admin';
import { Plus, RefreshCw, Eye, Trash2 } from 'lucide-react';

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await invoicesApi.list({ page, limit: 20 });
      setInvoices(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
    } catch { } finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600', SENT: 'bg-blue-50 text-blue-700',
    VIEWED: 'bg-yellow-50 text-yellow-700', PARTIALLY_PAID: 'bg-orange-50 text-orange-700',
    PAID: 'bg-green-50 text-green-700', OVERDUE: 'bg-red-50 text-red-700', CANCELLED: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">{total} total invoices</h2>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={16} className="text-gray-500" /></button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-pacific-600 text-white rounded-lg text-sm hover:bg-pacific-700"><Plus size={16} /> New Invoice</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Issue Date</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
            <th className="px-4 py-3" />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              : invoices.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No invoices yet</td></tr>
              : invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-pacific-700">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 font-medium">₹{Number(inv.totalAmount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status] || ''}`}>{inv.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(inv.issueDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-pacific-600"><Eye size={14} /></button>
                      <button onClick={async () => { if (confirm('Delete invoice?')) try { await invoicesApi.delete(inv.id); fetch(); } catch { alert('Failed'); } }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {invoices.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={invoices.length < 20} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicesPage;
