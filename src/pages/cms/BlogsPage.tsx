import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../api/services';
import type { Blog } from '../../types/admin';
import { Plus, RefreshCw, Edit, Trash2 } from 'lucide-react';

const BlogsPage: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try { const { data } = await cmsApi.listBlogs({}); setBlogs(data.data?.items ?? []); }
    catch { } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete blog post?')) return;
    try { await cmsApi.deleteBlog(id); fetch(); } catch { alert('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">{blogs.length} blog posts</h2>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={16} /></button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-pacific-600 text-white rounded-lg text-sm hover:bg-pacific-700"><Plus size={16} /> New Post</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Views</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="px-4 py-3" />
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? [...Array(3)].map((_, i) => <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              : blogs.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No blog posts yet</td></tr>
              : blogs.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : b.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-600'}`}>{b.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{b.viewCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3"><div className="flex gap-2 justify-end">
                    <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-pacific-600"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BlogsPage;
