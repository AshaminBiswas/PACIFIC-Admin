import React, { useEffect, useState, useCallback } from 'react';
import { projectsApi } from '../api/services';
import type { CommercialProject } from '../types/admin';
import { Plus, RefreshCw, Edit, Trash2 } from 'lucide-react';

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<CommercialProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await projectsApi.list({ page, limit: 20 });
      setProjects(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
    } catch { } finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try { await projectsApi.delete(id); fetch(); }
    catch { alert('Failed to delete'); }
  };

  const statusColors: Record<string, string> = {
    INQUIRY: 'bg-gray-100 text-gray-600', DESIGN: 'bg-blue-50 text-blue-700',
    PROPOSAL: 'bg-yellow-50 text-yellow-700', APPROVED: 'bg-orange-50 text-orange-700',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700', INSTALLATION: 'bg-purple-50 text-purple-700',
    COMPLETED: 'bg-green-50 text-green-700', ON_HOLD: 'bg-red-50 text-red-700', CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">{total} total projects</h2>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={16} className="text-gray-500" /></button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-pacific-600 text-white rounded-lg text-sm hover:bg-pacific-700"><Plus size={16} /> New Project</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Budget</th>
            <th className="px-4 py-3" />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              : projects.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No projects yet</td></tr>
              : projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                  <td className="px-4 py-3"><div className="text-gray-700">{p.clientName}</div>{p.clientCompany && <div className="text-xs text-gray-400">{p.clientCompany}</div>}</td>
                  <td className="px-4 py-3 text-gray-500">{p.location || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] || ''}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-gray-700">{p.budget ? `₹${Number(p.budget).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-pacific-600"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {projects.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={projects.length < 20} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
