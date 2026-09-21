import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../api/services';
import type { GalleryImage } from '../../types/admin';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';

const GalleryPage: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try { const { data } = await cmsApi.listGallery({}); setImages(data.data?.items ?? []); }
    catch { } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete image?')) return;
    try { await cmsApi.deleteGalleryImage(id); fetch(); } catch { alert('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">{images.length} gallery images</h2>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={16} /></button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-pacific-600 text-white rounded-lg text-sm hover:bg-pacific-700"><Plus size={16} /> Add Image</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? [...Array(8)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)
          : images.length === 0 ? <div className="col-span-4 py-12 text-center text-gray-400">No gallery images yet</div>
          : images.map((img) => (
            <div key={img.id} className="group relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
              <img src={img.imageUrl} alt={img.title || ''} className="w-full aspect-square object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/></svg>'; }} />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => handleDelete(img.id)} className="p-2 rounded-full bg-white/20 hover:bg-red-500 text-white"><Trash2 size={16} /></button>
              </div>
              {img.title && <div className="absolute bottom-0 left-0 right-0 p-2 text-xs text-white bg-gradient-to-t from-black/60">{img.title}</div>}
            </div>
          ))}
      </div>
    </div>
  );
};

export default GalleryPage;
