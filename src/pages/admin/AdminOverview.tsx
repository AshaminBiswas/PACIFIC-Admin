import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { dashboardApi, crmApi } from "@/api/services";
import {
  Package, FileText, Lightbulb, ImageIcon, MonitorPlay, Layers,
  LayoutTemplate, MessageSquare, Star, HelpCircle, Users, FileDown,
  ArrowRight, TrendingUp, ShoppingBag, Receipt, Truck, CreditCard,
  Briefcase, QrCode, Building2
} from "lucide-react";

export default function AdminOverview() {
  const [counts, setCounts] = useState<Record<string, number>>({
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
  });
  const [erpStats, setErpStats] = useState<{
    customers: number;
    quotations: number;
    orders: number;
    invoices: number;
  }>({
    customers: 0,
    quotations: 0,
    orders: 0,
    invoices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      // 1. Fetch ERP stats from Pacific Backend API
      try {
        const [statsRes, crmRes] = await Promise.allSettled([
          dashboardApi.getStats(),
          crmApi.listCustomers({ limit: 1 }),
        ]);

        const statsData = statsRes.status === 'fulfilled' ? statsRes.value.data?.data?.overview : null;
        const crmData = crmRes.status === 'fulfilled' ? crmRes.value.data?.data : null;

        setErpStats({
          customers: crmData?.total || 0,
          quotations: statsData?.totalQuotations || 0,
          orders: statsData?.totalProjects || 0,
          invoices: statsData?.totalInvoices || 0,
        });
      } catch (_e) {}

      // 2. Fetch CMS item counts
      const tables = [
        { key: "products", table: "products" },
        { key: "blogs", table: "blogs" },
        { key: "solutions", table: "solutions" },
        { key: "gallery", table: "gallery_images" },
        { key: "hero_images", table: "hero_images" },
        { key: "core_services", table: "core_services" },
        { key: "page_banners", table: "page_banners" },
        { key: "catalogs", table: "catalogs" },
        { key: "contact_queries", table: "leads" },
        { key: "feedback", table: "testimonials" },
        { key: "faqs", table: "faqs" },
        { key: "leads", table: "visitor_leads" },
      ];

      try {
        const results = await Promise.all(
          tables.map((t) =>
            supabase.from(t.table).select("id", { count: "exact", head: true }).then((r) => ({
              key: t.key,
              count: r.count || 0,
            }))
          )
        );

        const newCounts: Record<string, number> = {};
        results.forEach((r) => (newCounts[r.key] = r.count));
        setCounts(newCounts);
      } catch (_sErr) {}

      setLoading(false);
    }
    fetchCounts();
  }, []);

  const allCards = [
    { label: "Services", count: counts.products, icon: Package, color: "#7FB706", path: "/admin/dashboard/products" },
    { label: "Blog Posts", count: counts.blogs, icon: FileText, color: "#3B82F6", path: "/admin/dashboard/blogs" },
    { label: "Solutions", count: counts.solutions, icon: Lightbulb, color: "#F59E0B", path: "/admin/dashboard/solutions" },
    { label: "Gallery", count: counts.gallery, icon: ImageIcon, color: "#EC4899", path: "/admin/dashboard/gallery" },
    { label: "Hero Images", count: counts.hero_images, icon: MonitorPlay, color: "#8B5CF6", path: "/admin/dashboard/hero" },
    { label: "Core Services", count: counts.core_services, icon: Layers, color: "#06B6D4", path: "/admin/dashboard/core-services" },
    { label: "Page Banners", count: counts.page_banners, icon: LayoutTemplate, color: "#10B981", path: "/admin/dashboard/page-banners" },
    { label: "Catalogs", count: counts.catalogs, icon: FileDown, color: "#F97316", path: "/admin/dashboard/catalogs" },
    { label: "Contact Queries", count: counts.contact_queries, icon: MessageSquare, color: "#EF4444", path: "/admin/dashboard/contact-queries" },
    { label: "Feedback", count: counts.feedback, icon: Star, color: "#FBBF24", path: "/admin/dashboard/feedback" },
    { label: "FAQ", count: counts.faqs, icon: HelpCircle, color: "#A78BFA", path: "/admin/dashboard/faq" },
    { label: "Visitor Leads", count: counts.leads, icon: Users, color: "#14B8A6", path: "/admin/dashboard/leads" },
  ];

  // Top 4 highlighted stats
  const topStats = allCards.slice(0, 4);
  const restCards = allCards.slice(4);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all content from one place</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <TrendingUp className="w-4 h-4 text-[#7FB706]" />
          <span>{allCards.reduce((sum, c) => sum + c.count, 0)} total items</span>
        </div>
      </div>

      {/* Section: Enterprise ERP Operations */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#7FB706] uppercase tracking-wider">Enterprise Operations (Live API)</h2>
          <span className="text-[11px] text-gray-500 font-mono">PACIFIC-Backend :5001</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/dashboard/customers"
            className="group bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-[#7FB706]/40 hover:bg-white/[0.09] transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-[#7FB706]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#7FB706]" />
              </div>
              <span className="text-3xl font-black text-white">{loading ? "—" : erpStats.customers}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-300 text-sm font-medium">B2B Customers</p>
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[#7FB706] group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>

          <Link
            to="/admin/dashboard/sales-quotations"
            className="group bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-blue-500/40 hover:bg-white/[0.09] transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-3xl font-black text-white">{loading ? "—" : erpStats.quotations}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-300 text-sm font-medium">Sales Quotations</p>
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>

          <Link
            to="/admin/dashboard/sales-orders"
            className="group bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-amber-500/40 hover:bg-white/[0.09] transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-3xl font-black text-white">{loading ? "—" : erpStats.orders}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-300 text-sm font-medium">Sales Orders Hub</p>
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>

          <Link
            to="/admin/dashboard/payments"
            className="group bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-purple-500/40 hover:bg-white/[0.09] transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-3xl font-black text-white">{loading ? "—" : erpStats.invoices}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-300 text-sm font-medium">Invoices & Dues</p>
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        </div>
      </div>

      {/* Section: Website CMS */}
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Website & Content CMS</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {topStats.map((card) => (
          <Link
            key={card.label}
            to={card.path}
            className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 hover:bg-white/[0.07] transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${card.color}20` }}
              >
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <span className="text-3xl font-black text-white">
                {loading ? "—" : card.count}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm font-medium">{card.label}</p>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>

      {/* All Sections Grid */}
      <h2 className="text-base font-bold text-white mb-3">All Sections</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {restCards.map((card) => (
          <Link
            key={card.label}
            to={card.path}
            className="group flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3.5 hover:border-white/15 hover:bg-white/5 transition-all"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${card.color}15` }}
            >
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-300 truncate">{card.label}</p>
              <p className="text-xs text-gray-500">{loading ? "—" : card.count} items</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-white shrink-0 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Quick Start Guide */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Start</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-gray-400 text-sm">
          <p>
            ✅ Start with <strong className="text-white">Hero Images</strong> and{" "}
            <strong className="text-white">Page Banners</strong> so your key pages have the right visual assets first.
          </p>
          <p>
            🧩 Then update core content in <strong className="text-white">Services</strong>,{" "}
            <strong className="text-white">Solutions</strong>, <strong className="text-white">Blogs</strong>, and{" "}
            <strong className="text-white">Gallery</strong>.
          </p>
          <p>
            📤 Upload images while editing — files are stored in Supabase Storage and linked automatically.
          </p>
          <p>
            🔒 Use the publish toggle to control what appears on the live website.
          </p>
          <p>
            💬 Review <strong className="text-white">Contact Queries</strong> and{" "}
            <strong className="text-white">Feedback</strong> regularly to prioritize follow-ups.
          </p>
          <p>
            🌐 Use <strong className="text-white">"View Site"</strong> in the top bar to verify updates on the public site.
          </p>
        </div>
      </div>
    </div>
  );
}
