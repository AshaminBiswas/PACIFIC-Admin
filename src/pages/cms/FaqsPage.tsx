import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../api/services';
import type { Faq } from '../../types/admin';
import { Plus, RefreshCw, Edit, Trash2 } from 'lucide-react';

const FaqsPage: React.FC = () => {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try { const { data } = await cmsApi.listFaqs(); setFaqs(data.data ?? []); }
    catch { } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">{faqs.length} FAQs</h2>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-pacific-600 text-white rounded-lg text-sm hover:bg-pacific-700"><Plus size={16} /> Add FAQ</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {isLoading ? [...Array(4)].map((_, i) => <div key={i} className="p-4 space-y-2"><div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" /><div className="h-3 bg-gray-100 rounded animate-pulse w-full" /></div>)
          : faqs.length === 0 ? <div className="py-12 text-center text-gray-400">No FAQs yet</div>
          : faqs.map((f) => (
            <div key={f.id} className="p-4 hover:bg-gray-50 flex items-start gap-3">
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">{f.question}</div>
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{f.answer}</div>
                {f.category && <div className="text-xs text-pacific-600 mt-1">{f.category}</div>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-pacific-600"><Edit size={14} /></button>
                <button onClick={async () => { if (confirm('Delete FAQ?')) try { await cmsApi.deleteFaq(f.id); fetch(); } catch { } }}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default FaqsPage;
