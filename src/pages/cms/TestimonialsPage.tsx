import React, { useEffect, useState, useCallback } from 'react';
import { cmsApi } from '../../api/services';
import type { Testimonial } from '../../types/admin';
import { Plus, Edit, Trash2, Star } from 'lucide-react';

const TestimonialsPage: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try { const { data } = await cmsApi.listTestimonials(); setTestimonials(data.data ?? []); }
    catch { } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">{testimonials.length} testimonials</h2>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-pacific-600 text-white rounded-lg text-sm hover:bg-pacific-700"><Plus size={16} /> Add Testimonial</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? [...Array(4)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)
          : testimonials.length === 0 ? <div className="col-span-2 py-12 text-center text-gray-400">No testimonials yet</div>
          : testimonials.map((t) => (
            <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < (t.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />)}
                  </div>
                  <p className="text-sm text-gray-600 italic line-clamp-3">"{t.message}"</p>
                  <div className="mt-3">
                    <div className="font-medium text-sm text-gray-900">{t.clientName}</div>
                    {(t.designation || t.company) && <div className="text-xs text-gray-400">{[t.designation, t.company].filter(Boolean).join(', ')}</div>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-pacific-600"><Edit size={14} /></button>
                  <button onClick={async () => { if (confirm('Delete?')) try { await cmsApi.deleteTestimonial(t.id); fetch(); } catch { } }}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default TestimonialsPage;
