import { useQuery } from '@tanstack/react-query';
import { dashboardApi, crmApi } from '../../api/services';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryClient';

export interface DashboardOverviewStats {
  counts: Record<string, number>;
  erpStats: {
    customers: number;
    quotations: number;
    orders: number;
    invoices: number;
  };
}

export function useOverviewStatsQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async (): Promise<DashboardOverviewStats> => {
      // 1. Fetch ERP stats from backend
      let erpStats = { customers: 0, quotations: 0, orders: 0, invoices: 0 };
      try {
        const [statsRes, crmRes] = await Promise.allSettled([
          dashboardApi.getStats(),
          crmApi.listCustomers({ limit: 1 }),
        ]);

        const statsData = statsRes.status === 'fulfilled' ? statsRes.value.data?.data?.overview : null;
        const crmData = crmRes.status === 'fulfilled' ? crmRes.value.data?.data : null;

        erpStats = {
          customers: crmData?.total || 0,
          quotations: statsData?.totalQuotations || 0,
          orders: statsData?.totalProjects || 0,
          invoices: statsData?.totalInvoices || 0,
        };
      } catch (err) {
        console.warn('[useOverviewStatsQuery] ERP stats fetch warning:', err);
      }

      // 2. Fetch CMS item counts in parallel with graceful fallbacks
      const tables = [
        { key: 'products', table: 'products' },
        { key: 'blogs', table: 'blogs' },
        { key: 'solutions', table: 'solutions' },
        { key: 'hero_images', table: 'hero_images' },
        { key: 'page_banners', table: 'page_banners' },
        { key: 'catalogs', table: 'catalogs' },
        { key: 'contact_queries', table: 'leads' },
        { key: 'feedback', table: 'testimonials' },
        { key: 'faqs', table: 'faqs' },
        { key: 'leads', table: 'visitor_leads' },
      ];

      const counts: Record<string, number> = {
        products: 0,
        blogs: 0,
        solutions: 0,
        gallery: 0,
        hero_images: 0,
        core_services: 0,
        page_banners: 0,
        catalogs: 0,
        contact_queries: 0,
        feedback: 0,
        faqs: 0,
        leads: 0,
      };

      try {
        const results = await Promise.all(
          tables.map(async (t) => {
            try {
              const r = await supabase.from(t.table).select('id', { count: 'exact', head: true });
              return { key: t.key, count: r.count || 0 };
            } catch {
              return { key: t.key, count: 0 };
            }
          })
        );

        results.forEach((r: { key: string; count: number }) => {
          counts[r.key] = r.count;
        });
      } catch (err) {
        console.warn('[useOverviewStatsQuery] CMS counts fetch warning:', err);
      }

      return { counts, erpStats };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes fresh
    gcTime: 30 * 60 * 1000,
  });
}
