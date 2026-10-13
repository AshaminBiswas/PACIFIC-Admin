import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import {
  fetchBlogById,
  toggleBlogPublication,
  type BlogPost,
} from "../../lib/blogService";
import {
  ArrowLeft,
  Pencil,
  Eye,
  EyeOff,
  Globe,
  Monitor,
  Tablet,
  Smartphone,
  Calendar,
  Clock,
  User,
  Tag,
  Share2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
} from "lucide-react";
import logo from "../../image/logo/logo.webp";

type ViewportMode = "desktop" | "tablet" | "mobile";

export default function BlogPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [showSeoInspector, setShowSeoInspector] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("No blog ID provided.");
      setLoading(false);
      return;
    }

    const loadBlog = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchBlogById(id);
        if (!data) {
          setError("Blog post not found.");
        } else {
          setBlog(data);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load blog post preview.");
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [id]);

  const handleTogglePublication = async () => {
    if (!blog) return;
    const nextState = !blog.published;
    const confirmMsg = nextState
      ? "Publish this post immediately to the public website?"
      : "Unpublish this post and return it to Draft status?";

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsTogglingPublish(true);
      await toggleBlogPublication(blog.id, nextState);
      setBlog((prev) =>
        prev
          ? {
              ...prev,
              published: nextState,
              status: nextState ? "PUBLISHED" : "DRAFT",
              published_at: nextState ? new Date().toISOString() : prev.published_at,
            }
          : null
      );
      alert(nextState ? "🎉 Post published to live website!" : "Post reverted to Draft.");
    } catch (err: any) {
      alert("Failed to toggle status: " + err.message);
    } finally {
      setIsTogglingPublish(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#7FB706] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Loading Live Post Preview...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{error || "Blog Not Found"}</h2>
        <p className="text-gray-400 text-sm mb-6">
          The requested blog post could not be retrieved from the database.
        </p>
        <button
          onClick={() => navigate("/admin/dashboard/blogs")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white font-semibold rounded-xl text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Blog Management
        </button>
      </div>
    );
  }

  // Sanitize content with DOMPurify
  const sanitizedContent = DOMPurify.sanitize(blog.content, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "target", "rel"],
  });

  // Calculate formatted dates
  const displayDate = blog.published_at
    ? new Date(blog.published_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : blog.scheduled_at
    ? `Scheduled: ${new Date(blog.scheduled_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`
    : "Draft (Unpublished)";

  return (
    <div className="space-y-6 pb-24">
      {/* ── TOP CONTROL BAR ────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#030213]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Back & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/dashboard/blogs")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
              title="Back to Blogs List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400">Preview Mode</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    blog.published
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : blog.status === "SCHEDULED"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {blog.published ? "LIVE" : blog.status}
                </span>
              </div>
              <h1 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {blog.title}
              </h1>
            </div>
          </div>

          {/* Viewport Switcher (Desktop / Tablet / Mobile) */}
          <div className="hidden sm:flex items-center bg-black/40 border border-white/10 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewport === "desktop"
                  ? "bg-[#7FB706] text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("tablet")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewport === "tablet"
                  ? "bg-[#7FB706] text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewport === "mobile"
                  ? "bg-[#7FB706] text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Edit in Word Processor */}
            <Link
              to={`/admin/dashboard/blogs/edit/${blog.id}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition"
            >
              <Pencil className="w-3.5 h-3.5 text-[#7FB706]" />
              <span>Edit Post</span>
            </Link>

            {/* Quick Publish / Unpublish Toggle */}
            <button
              type="button"
              onClick={handleTogglePublication}
              disabled={isTogglingPublish}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 ${
                blog.published
                  ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                  : "bg-[#7FB706] hover:bg-[#6fa005] text-white shadow-md shadow-[#7FB706]/20"
              }`}
            >
              {blog.published ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Unpublish</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Publish Live</span>
                </>
              )}
            </button>

            {/* External link to public site */}
            {blog.published && (
              <a
                href={`/blog/${blog.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
                title="View live post on public website"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── PREVIEW CONTAINER / FRAME ──────────────────────────── */}
      <div className="flex justify-center transition-all duration-300">
        <div
          className={`transition-all duration-300 ease-in-out ${
            viewport === "mobile"
              ? "w-[390px] border-8 border-gray-800 rounded-[40px] shadow-2xl overflow-hidden bg-[#0A0A14] my-4"
              : viewport === "tablet"
              ? "w-[768px] border-4 border-gray-800/80 rounded-2xl shadow-xl overflow-hidden bg-[#0A0A14] my-2"
              : "w-full max-w-4xl"
          }`}
        >
          {/* Simulated Storefront Header */}
          <div className="border-b border-white/5 bg-[#080816] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Pacific Products & Solutions" className="h-7 w-auto object-contain" />
              <div className="hidden sm:block h-4 w-px bg-white/10" />
              <span className="hidden sm:inline text-xs text-gray-400 font-medium">
                Pacific Washroom Solutions
              </span>
            </div>
            <div className="text-[11px] text-[#7FB706] font-semibold bg-[#7FB706]/10 px-2.5 py-1 rounded-full border border-[#7FB706]/20 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>Official Blog</span>
            </div>
          </div>

          {/* Storefront Article Canvas */}
          <article className="bg-[#0A0A14] p-6 sm:p-10 text-white min-h-[700px]">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6 flex-wrap">
              <span className="hover:text-white cursor-pointer">Home</span>
              <span>/</span>
              <span className="hover:text-white cursor-pointer">Blogs</span>
              <span>/</span>
              <span className="text-[#7FB706] font-medium">{blog.category || "General"}</span>
            </nav>

            {/* Category, Date & Reading Time Row */}
            <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
              <span className="px-3 py-1 rounded-full font-bold bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/30">
                {blog.category || "Restroom Cubicles"}
              </span>
              <span className="flex items-center gap-1 text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                {displayDate}
              </span>
              <span className="flex items-center gap-1 text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {blog.reading_time || "5 min read"}
              </span>
            </div>

            {/* Article Title */}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
              {blog.title}
            </h1>

            {/* Excerpt / Lead Paragraph */}
            {blog.excerpt && (
              <p className="text-base sm:text-lg text-gray-300 font-normal leading-relaxed mb-6 border-l-2 border-[#7FB706] pl-4 italic">
                {blog.excerpt}
              </p>
            )}

            {/* Author Byline */}
            <div className="flex items-center gap-3 py-4 border-y border-white/5 mb-8">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7FB706] to-[#0A0A14] border border-[#7FB706]/40 flex items-center justify-center font-bold text-white text-sm shadow-inner">
                {blog.author ? blog.author.charAt(0).toUpperCase() : "P"}
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span>{blog.author || "Pacific Technical Team"}</span>
                  <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded font-normal">
                    Author
                  </span>
                </div>
                <div className="text-xs text-gray-400">Pacific Products &amp; Solutions</div>
              </div>
            </div>

            {/* Cover Image */}
            {blog.cover_image_url && (
              <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                <img
                  src={blog.cover_image_url}
                  alt={blog.alt_text || blog.title}
                  className="w-full h-auto max-h-[460px] object-cover"
                />
                {blog.alt_text && (
                  <p className="p-2 text-center text-xs text-gray-400 italic bg-black/20 border-t border-white/5">
                    {blog.alt_text}
                  </p>
                )}
              </div>
            )}

            {/* ── ARTICLE RICH TEXT BODY ───────────────────────── */}
            <div
              className="prose prose-invert max-w-none 
                prose-headings:font-bold prose-headings:text-white prose-headings:tracking-tight
                prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-white/10
                prose-h3:text-xl sm:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-base prose-p:mb-4
                prose-a:text-[#7FB706] prose-a:underline hover:prose-a:text-[#9fe008]
                prose-strong:text-white prose-strong:font-bold
                prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-2 prose-ul:my-4 prose-ul:text-gray-300
                prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-2 prose-ol:my-4 prose-ol:text-gray-300
                prose-blockquote:border-l-4 prose-blockquote:border-[#7FB706] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-200 prose-blockquote:my-6
                prose-code:text-[#B5F823] prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-img:my-6
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_table]:text-sm
                [&_th]:bg-white/10 [&_th]:border [&_th]:border-white/15 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-bold [&_th]:text-white
                [&_td]:border [&_td]:border-white/10 [&_td]:px-4 [&_td]:py-2 [&_td]:text-gray-300
                [&_.pro-tip]:bg-emerald-950/40 [&_.pro-tip]:border-l-4 [&_.pro-tip]:border-emerald-500 [&_.pro-tip]:p-4 [&_.pro-tip]:rounded-r-xl [&_.pro-tip]:my-6
                [&_.warning-notice]:bg-amber-950/40 [&_.warning-notice]:border-l-4 [&_.warning-notice]:border-amber-500 [&_.warning-notice]:p-4 [&_.warning-notice]:rounded-r-xl [&_.warning-notice]:my-6
                [&_.cta-quote]:bg-[#7FB706]/10 [&_.cta-quote]:border-l-4 [&_.cta-quote]:border-[#7FB706] [&_.cta-quote]:p-5 [&_.cta-quote]:rounded-r-xl [&_.cta-quote]:my-8
                [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-xl [&_iframe]:my-6"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />

            {/* Tags Section */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="mt-12 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-[#7FB706]" />
                  <span>Related Topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition cursor-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Commercial Washroom Solution Callout Box */}
            <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#121226] to-[#030213] border border-[#7FB706]/30 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7FB706] mb-1 block">
                    Pan-India Commercial Restroom Projects
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                    Need Custom Restroom Cubicles or HPL Partitions?
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
                    Pacific Products &amp; Solutions manufactures precision-machined 12mm &amp; 18mm Solid
                    Compact Laminate cubicles with certified hardware and pan-India installation.
                  </p>
                </div>
                <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
                  <a
                    href="https://wa.me/919999999999"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold rounded-xl text-center shadow-lg transition"
                  >
                    Request a BOQ Quote
                  </a>
                  <Link
                    to="/admin/dashboard/products"
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-xl text-center border border-white/10 transition"
                  >
                    View Catalog
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* ── SEO & METADATA INSPECTOR (COLLAPSIBLE) ──────────────── */}
      <div className="max-w-4xl mx-auto bg-[#121226] border border-white/10 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSeoInspector(!showSeoInspector)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[#7FB706]" />
            <div>
              <h3 className="text-sm font-bold text-white">SEO &amp; Search Engine Inspector</h3>
              <p className="text-xs text-gray-400">
                Inspect how Google and social platforms will index this blog post
              </p>
            </div>
          </div>
          {showSeoInspector ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showSeoInspector && (
          <div className="p-6 border-t border-white/5 space-y-6">
            {/* Google SERP Snippet Preview */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#7FB706]" />
                <span>Live Google Search Snippet</span>
              </h4>
              <div className="bg-[#1f1f23] p-4 rounded-xl border border-white/10 font-sans">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded-full bg-[#7FB706] flex items-center justify-center text-[9px] font-bold text-white">
                    P
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    https://pacificrestroom.com &gt; blog &gt; {blog.slug}
                  </div>
                </div>
                <div className="text-[#8ab4f8] text-base font-medium hover:underline cursor-pointer truncate">
                  {blog.seo_title || blog.title} | Pacific Products &amp; Solutions
                </div>
                <p className="text-gray-300 text-xs mt-1 leading-relaxed line-clamp-2">
                  {blog.meta_description ||
                    blog.excerpt ||
                    "Explore premium restroom cubicles, urinal partitions, and commercial washroom solutions by Pacific Products & Solutions."}
                </p>
              </div>
            </div>

            {/* Metadata Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">
                  Canonical URL
                </span>
                <span className="text-gray-300 font-mono break-all">
                  {blog.canonical_url || `https://pacificrestroom.com/blog/${blog.slug}`}
                </span>
              </div>

              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">
                  Index Status
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {blog.published ? "index, follow (Live on web)" : "noindex, nofollow (Draft)"}
                </span>
              </div>

              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">
                  OpenGraph Title
                </span>
                <span className="text-gray-300 break-words">
                  {blog.og_title || blog.seo_title || blog.title}
                </span>
              </div>

              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">
                  Estimated Reading Time
                </span>
                <span className="text-gray-300">{blog.reading_time || "4 min read"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
