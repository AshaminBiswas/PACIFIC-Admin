import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchAllBlogs,
  deleteBlogPost,
  duplicateBlogPost,
  toggleBlogPublication,
  BLOG_CATEGORIES,
  type BlogPost,
  type BlogPublicationStatus,
} from "../../lib/blogService";
import {
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Pencil,
  Copy,
  Trash2,
  ExternalLink,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Check,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

type SortOption = "newest" | "oldest" | "title" | "updated";
type StatusFilter = "ALL" | "PUBLISHED" | "DRAFT" | "SCHEDULED";

export default function AdminBlogs() {
  const navigate = useNavigate();

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Interaction State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deleteModalBlog, setDeleteModalBlog] = useState<BlogPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch blogs
  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllBlogs();
      setBlogs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load blog posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = blogs.length;
    const published = blogs.filter((b) => b.published && b.status === "PUBLISHED").length;
    const drafts = blogs.filter((b) => !b.published && b.status === "DRAFT").length;
    const scheduled = blogs.filter((b) => b.status === "SCHEDULED").length;

    // Updated in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyUpdated = blogs.filter((b) => {
      const date = b.updated_at ? new Date(b.updated_at) : new Date(b.created_at);
      return date >= sevenDaysAgo;
    }).length;

    return { total, published, drafts, scheduled, recentlyUpdated };
  }, [blogs]);

  // Unique categories in dataset
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    blogs.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    BLOG_CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set);
  }, [blogs]);

  // Filtered and Sorted blogs
  const filteredBlogs = useMemo(() => {
    let result = [...blogs];

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "ALL") {
      result = result.filter((b) => b.category === categoryFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.slug.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.excerpt && b.excerpt.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "updated") {
        const timeA = new Date(a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.updated_at || b.created_at).getTime();
        return timeB - timeA;
      }
      return 0;
    });

    return result;
  }, [blogs, statusFilter, categoryFilter, searchQuery, sortBy]);

  // Actions
  const handleTogglePublication = async (blog: BlogPost) => {
    try {
      setActionLoadingId(blog.id);
      const nextPublished = !blog.published;
      await toggleBlogPublication(blog.id, nextPublished);
      setBlogs((prev) =>
        prev.map((b) =>
          b.id === blog.id
            ? {
                ...b,
                published: nextPublished,
                status: nextPublished ? "PUBLISHED" : "DRAFT",
                published_at: nextPublished ? new Date().toISOString() : b.published_at,
              }
            : b
        )
      );
    } catch (err: any) {
      alert("Failed to toggle publication: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (blog: BlogPost) => {
    try {
      setActionLoadingId(blog.id);
      const duplicated = await duplicateBlogPost(blog.id);
      setBlogs((prev) => [duplicated, ...prev]);
      alert(`Created duplicate: "${duplicated.title}"`);
    } catch (err: any) {
      alert("Failed to duplicate blog: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModalBlog) return;
    try {
      setIsDeleting(true);
      await deleteBlogPost(deleteModalBlog.id);
      setBlogs((prev) => prev.filter((b) => b.id !== deleteModalBlog.id));
      setDeleteModalBlog(null);
    } catch (err: any) {
      alert("Failed to delete blog: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopySlug = (slug: string) => {
    navigator.clipboard.writeText(`/blog/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-3 sm:space-y-6 pb-24 p-0 m-0">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-[#121226] border border-white/5 p-3 sm:p-6 rounded-xl sm:rounded-2xl m-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-white">Blog Management</h1>
            <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/20">
              CMS Suite
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
            Author, curate, preview, and publish architectural washroom articles with live storefront sync.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBlogs}
            disabled={loading}
            className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition disabled:opacity-50"
            title="Refresh blogs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            to="/admin/dashboard/blogs/new"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 text-xs sm:text-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Write New Blog</span>
          </Link>
        </div>
      </div>

      {/* ── METRICS SUMMARY CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 m-0">
        <div className="bg-[#121226] border border-white/5 p-2.5 sm:p-4 rounded-xl m-0">
          <div className="text-gray-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total</span>
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{metrics.total}</div>
          <div className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">All articles</div>
        </div>

        <div className="bg-[#121226] border border-white/5 p-2.5 sm:p-4 rounded-xl m-0">
          <div className="text-emerald-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Published</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{metrics.published}</div>
          <div className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">Live storefront</div>
        </div>

        <div className="bg-[#121226] border border-white/5 p-2.5 sm:p-4 rounded-xl m-0">
          <div className="text-amber-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Drafts</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">{metrics.drafts}</div>
          <div className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">Unpublished</div>
        </div>

        <div className="bg-[#121226] border border-white/5 p-2.5 sm:p-4 rounded-xl m-0">
          <div className="text-blue-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Scheduled</span>
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-400">{metrics.scheduled}</div>
          <div className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">Queued</div>
        </div>

        <div className="bg-[#121226] border border-white/5 p-2.5 sm:p-4 rounded-xl col-span-2 sm:col-span-1 m-0">
          <div className="text-[#B5F823] text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Recent (7d)</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B5F823]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#B5F823]">{metrics.recentlyUpdated}</div>
          <div className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">Updated this week</div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────── */}
      <div className="bg-[#121226] border border-white/5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl space-y-2.5 sm:space-y-3 m-0">
        <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 items-stretch lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by blog title, slug, author, or excerpt..."
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-[#0a0a1a] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filter Controls */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Status Filter */}
            <div className="flex items-center bg-[#0a0a1a] border border-white/10 rounded-xl p-0.5 sm:p-1 text-[11px] sm:text-xs overflow-x-auto no-scrollbar">
              {(["ALL", "PUBLISHED", "DRAFT", "SCHEDULED"] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold transition shrink-0 ${
                    statusFilter === st
                      ? "bg-[#7FB706] text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs text-white focus:outline-none focus:border-[#7FB706]"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7FB706]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── BLOGS LISTING ────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-12 text-center">
          <div className="w-8 h-8 border-4 border-[#7FB706] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading blog catalog...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <h3 className="text-white font-bold text-sm mb-1">Failed to load blogs</h3>
          <p className="text-red-300 text-xs mb-4">{error}</p>
          <button
            onClick={loadBlogs}
            className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className="bg-[#121226] border border-white/5 rounded-2xl p-16 text-center">
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-500">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-base mb-1">No blog posts found</h3>
          <p className="text-gray-400 text-xs max-w-md mx-auto mb-6">
            {searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL"
              ? "No blogs match your active filters or search terms. Try clearing your filters."
              : "Get started by creating your first technical or architectural washroom article."}
          </p>
          {searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL" ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
                setCategoryFilter("ALL");
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl"
            >
              Reset Filters
            </button>
          ) : (
            <Link
              to="/admin/dashboard/blogs/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Write First Blog
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-[#121226] border border-white/5 rounded-2xl overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a0a1a] border-b border-white/10 text-gray-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-16">Cover</th>
                  <th className="py-3.5 px-4">Title &amp; URL Slug</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Published Date</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBlogs.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition">
                    {/* Cover Thumbnail */}
                    <td className="py-3 px-4">
                      <div className="w-14 h-10 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                        {b.cover_image_url ? (
                          <img
                            src={b.cover_image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                    </td>

                    {/* Title & Slug */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-bold text-white truncate text-sm hover:text-[#7FB706] transition">
                        <Link to={`/admin/dashboard/blogs/edit/${b.id}`}>{b.title}</Link>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-gray-400 font-mono truncate max-w-[220px]">
                          /blog/{b.slug}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopySlug(b.slug)}
                          className="text-gray-500 hover:text-white transition p-0.5"
                          title="Copy relative slug path"
                        >
                          {copiedSlug === b.slug ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/5 text-gray-300 border border-white/10">
                        {b.category || "General"}
                      </span>
                    </td>

                    {/* Author */}
                    <td className="py-3 px-4 whitespace-nowrap text-gray-300">
                      {b.author || "Pacific Team"}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.published && b.status === "PUBLISHED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : b.status === "SCHEDULED"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {b.published && b.status === "PUBLISHED" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Live</span>
                          </>
                        ) : b.status === "SCHEDULED" ? (
                          <>
                            <Calendar className="w-3 h-3" />
                            <span>Scheduled</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>Draft</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Published Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-gray-400 text-[11px]">
                      {b.published_at ? (
                        new Date(b.published_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      ) : b.scheduled_at ? (
                        <span className="text-blue-400">
                          {new Date(b.scheduled_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>

                    {/* Last Updated */}
                    <td className="py-3 px-4 whitespace-nowrap text-gray-400 text-[11px]">
                      {b.updated_at
                        ? new Date(b.updated_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })
                        : new Date(b.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Preview */}
                        <Link
                          to={`/admin/dashboard/blogs/preview/${b.id}`}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                          title="Preview Post"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {/* Edit in Word Processor */}
                        <Link
                          to={`/admin/dashboard/blogs/edit/${b.id}`}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#7FB706] hover:bg-[#7FB706]/10 transition"
                          title="Edit Post"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>

                        {/* Quick Publish / Unpublish Toggle */}
                        <button
                          type="button"
                          onClick={() => handleTogglePublication(b)}
                          disabled={actionLoadingId === b.id}
                          className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                            b.published
                              ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                          title={b.published ? "Unpublish to Draft" : "Publish Live"}
                        >
                          {b.published ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicate(b)}
                          disabled={actionLoadingId === b.id}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition disabled:opacity-50"
                          title="Duplicate Post"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteModalBlog(b)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* View Public Link (if live) */}
                        {b.published && (
                          <a
                            href={`/blog/${b.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                            title="Open public URL"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card Layout */}
          <div className="block lg:hidden divide-y divide-white/5">
            {filteredBlogs.map((b) => (
              <div key={b.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                    {b.cover_image_url ? (
                      <img
                        src={b.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold text-[#7FB706]">
                        {b.category || "General"}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          b.published
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {b.published ? "Live" : "Draft"}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate">{b.title}</h4>
                    <p className="text-[11px] text-gray-400 font-mono truncate">
                      /blog/{b.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                  <span>Author: {b.author}</span>
                  <span>{b.reading_time || "4 min read"}</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <Link
                    to={`/admin/dashboard/blogs/preview/${b.id}`}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-xs font-semibold"
                  >
                    Preview
                  </Link>
                  <Link
                    to={`/admin/dashboard/blogs/edit/${b.id}`}
                    className="px-3 py-1.5 rounded-lg bg-[#7FB706]/15 text-[#7FB706] text-xs font-semibold"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleTogglePublication(b)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-xs font-semibold"
                  >
                    {b.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModalBlog(b)}
                    className="p-1.5 rounded-lg bg-white/5 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DELETE MODAL CONFIRMATION ────────────────────────────── */}
      {deleteModalBlog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121226] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete Blog Post?</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Are you sure you want to delete{" "}
              <span className="text-white font-semibold">"{deleteModalBlog.title}"</span>?
              This action cannot be undone and will immediately remove the post from the public
              storefront.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalBlog(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
