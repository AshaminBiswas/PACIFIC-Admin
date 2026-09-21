import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../api/services';
import type { Catalog } from '../../types/admin';
import { Plus, RefreshCw, Trash2, Download } from 'lucide-react';

const CatalogsPage: React.FC = () => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try { const { data } = await cmsApi.listCatalogs(); setCatalogs(data.data ?? []); }
    catch { } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">{catalogs.length} catalogs</h2>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-pacific-600 text-white rounded-lg text-sm hover:bg-pacific-700"><Plus size={16} /> Add Catalog</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)
          : catalogs.length === 0 ? <div className="col-span-3 py-12 text-center text-gray-400">No catalogs yet</div>
          : catalogs.map((c) => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <div className="w-12 h-16 bg-pacific-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Download size={20} className="text-pacific-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{c.title}</div>
                {c.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{c.description}</div>}
                <div className="text-xs text-gray-400 mt-1">{c.downloadCount} downloads</div>
              </div>
              <button onClick={async () => { if (confirm('Delete catalog?')) try { await cmsApi.deleteCatalog(c.id); fetch(); } catch { } }}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 flex-shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
      </div>
    </div>
  );
};

export default CatalogsPage;
