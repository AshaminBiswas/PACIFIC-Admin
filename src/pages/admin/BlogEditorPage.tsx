import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { TiptapEditor, type DocumentHeading } from "../../components/blog/TiptapEditor";
import {
  fetchBlogById,
  saveBlogPost,
  checkSlugAvailability,
  toSlug,
  calculateReadingTime,
  BLOG_CATEGORIES,
  BLOG_AUTHORS,
  type BlogPost,
  type BlogPublicationStatus,
} from "../../lib/blogService";
import { uploadImage } from "../../lib/supabase";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Eye,
  RotateCcw,
  Upload,
  Trash2,
  Calendar,
  Clock,
  Globe,
  Tag,
  Folder,
  User,
  Star,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Search,
  Check,
  X,
  FileText,
  Bookmark,
  Share2,
  Smartphone,
  Laptop,
  HelpCircle,
  TrendingUp,
  Layers,
  ChevronRight,
  ListTree,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
} from "lucide-react";

const AUTOSAVE_STORAGE_PREFIX = "pacific_blog_draft_";

export default function BlogEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Primary Content Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isSlugUnique, setIsSlugUnique] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContentHtml] = useState("");

  // Document Outline
  const [headings, setHeadings] = useState<DocumentHeading[]>([]);
  const [showOutline, setShowOutline] = useState(true);

  // Media
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Metadata & Categorization
  const [author, setAuthor] = useState("Pacific Team");
  const [category, setCategory] = useState(BLOG_CATEGORIES[0]);
  const [newCategory, setNewCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<BlogPublicationStatus>("DRAFT");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [manualReadingTime, setManualReadingTime] = useState("");
  const [overrideReadingTime, setOverrideReadingTime] = useState(false);

  // SEO Settings
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [serpDevice, setSerpDevice] = useState<"desktop" | "mobile">("desktop");
  const [isExpandedStudio, setIsExpandedStudio] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load existing post if editing
  useEffect(() => {
    if (!id) {
      // Check localStorage for unsaved new post
      try {
        const cached = localStorage.getItem(`${AUTOSAVE_STORAGE_PREFIX}new`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setTitle(parsed.title || "");
          setSlug(parsed.slug || "");
          setExcerpt(parsed.excerpt || "");
          setContentHtml(parsed.content || "");
          setCoverImageUrl(parsed.cover_image_url || "");
          setAltText(parsed.alt_text || "");
          setAuthor(parsed.author || "Pacific Team");
          setCategory(parsed.category || BLOG_CATEGORIES[0]);
          setTags(parsed.tags || []);
          setStatus(parsed.status || "DRAFT");
          setSeoTitle(parsed.seo_title || "");
          setMetaDescription(parsed.meta_description || "");
          setSaveStatus("saved");
          setLastSavedTime("Restored from backup");
        }
      } catch {}
      return;
    }

    async function loadPost() {
      try {
        setLoading(true);
        const post = await fetchBlogById(id!);
        if (!post) {
          alert("Blog post not found.");
          navigate("/admin/dashboard/blogs");
          return;
        }

        setTitle(post.title);
        setSlug(post.slug);
        setSlugManuallyEdited(true);
        setExcerpt(post.excerpt || "");
        setContentHtml(post.content || "");
        setCoverImageUrl(post.cover_image_url || "");
        setAltText(post.alt_text || "");
        setAuthor(post.author || "Pacific Team");
        setCategory(post.category || BLOG_CATEGORIES[0]);
        setTags(post.tags || []);
        setStatus(post.status || (post.published ? "PUBLISHED" : "DRAFT"));
        setScheduledAt(post.scheduled_at ? post.scheduled_at.slice(0, 16) : "");
        setIsFeatured(post.is_featured || false);
        setManualReadingTime(post.reading_time || "");
        setOverrideReadingTime(Boolean(post.reading_time));
        setSeoTitle(post.seo_title || "");
        setMetaDescription(post.meta_description || "");
        setCanonicalUrl(post.canonical_url || "");
        setOgTitle(post.og_title || "");
        setOgDescription(post.og_description || "");
        setSaveStatus("saved");
      } catch (err: any) {
        setErrorMsg("Failed to load blog post: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [id, navigate]);

  // Auto-generate slug from title unless manually edited
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(toSlug(title));
    }
  }, [title, slugManuallyEdited]);

  // Validate slug uniqueness debounced
  useEffect(() => {
    if (!slug) {
      setIsSlugUnique(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      const available = await checkSlugAvailability(slug, id);
      setIsSlugUnique(available);
      setCheckingSlug(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [slug, id]);

  // Autosave to LocalStorage
  useEffect(() => {
    const storageKey = `${AUTOSAVE_STORAGE_PREFIX}${id || "new"}`;
    const draftPayload = {
      title,
      slug,
      excerpt,
      content: contentHtml,
      cover_image_url: coverImageUrl,
      alt_text: altText,
      author,
      category,
      tags,
      status,
      seo_title: seoTitle,
      meta_description: metaDescription,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(draftPayload));
      setSaveStatus("saved");
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch {}
  }, [title, slug, excerpt, contentHtml, coverImageUrl, altText, author, category, tags, status, seoTitle, metaDescription, id]);

  // Reading time
  const autoReadingTime = useMemo(() => {
    return calculateReadingTime(contentHtml);
  }, [contentHtml]);

  const effectiveReadingTime = overrideReadingTime && manualReadingTime ? manualReadingTime : autoReadingTime;

  // SEO Fallback previews
  const effectiveSeoTitle = seoTitle.trim() || (title ? `${title} | Pacific Products & Solutions` : "Blog Post Title | Pacific");
  const effectiveMetaDescription = metaDescription.trim() || excerpt.trim() || "Commercial restroom cubicle insights, architectural guides, and turnkey washroom infrastructure by Pacific Products & Solutions.";
  const effectiveCanonicalUrl = canonicalUrl.trim() || `/blog/${slug || "your-blog-slug"}`;

  // Content Quality & SEO Health Scorecard
  const contentAudit = useMemo(() => {
    let score = 0;
    const items = [
      {
        id: "title",
        label: "Headline Length (40–70 chars)",
        met: title.trim().length >= 35 && title.trim().length <= 80,
        hint: `${title.trim().length} chars (aim for 40-70)`,
        points: 15,
      },
      {
        id: "excerpt",
        label: "Excerpt / Meta Snippet (100–180 chars)",
        met: excerpt.trim().length >= 80 && excerpt.trim().length <= 200,
        hint: `${excerpt.trim().length} chars (aim for 100-180)`,
        points: 15,
      },
      {
        id: "words",
        label: "In-Depth Word Count (300+ words)",
        met: (() => {
          const plain = contentHtml.replace(/<[^>]*>/g, " ");
          const words = plain.trim() ? plain.trim().split(/\s+/).filter(Boolean).length : 0;
          return words >= 300;
        })(),
        hint: (() => {
          const plain = contentHtml.replace(/<[^>]*>/g, " ");
          const words = plain.trim() ? plain.trim().split(/\s+/).filter(Boolean).length : 0;
          return `${words} words (aim for 300+)`;
        })(),
        points: 20,
      },
      {
        id: "headings",
        label: "Section Hierarchy (At least 2 subheadings)",
        met: headings.length >= 2,
        hint: `${headings.length} subheadings present`,
        points: 15,
      },
      {
        id: "cover",
        label: "Featured Cover Visual",
        met: Boolean(coverImageUrl),
        hint: coverImageUrl ? "Cover visual linked" : "Missing cover image",
        points: 15,
      },
      {
        id: "visuals",
        label: "Rich Content Blocks (Images / Tables / Callouts)",
        met: /<(img|table|iframe|details)/i.test(contentHtml),
        hint: /<(img|table|iframe|details)/i.test(contentHtml) ? "Rich blocks included" : "Add table or image in body",
        points: 10,
      },
      {
        id: "taxonomies",
        label: "Category & Topic Tags",
        met: Boolean(category) && tags.length >= 1,
        hint: `${tags.length} tags assigned`,
        points: 10,
      },
    ];

    items.forEach((item) => {
      if (item.met) score += item.points;
    });

    return {
      score: Math.min(100, score),
      items,
    };
  }, [title, excerpt, contentHtml, headings, coverImageUrl, category, tags]);

  // Cover image upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCover(true);
      const url = await uploadImage(file, "blogs");
      if (url) {
        setCoverImageUrl(url);
        if (!altText) setAltText(`${title || "Pacific"} blog cover`);
      }
    } catch {
      alert("Failed to upload cover image.");
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // Tags
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Custom Category
  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !BLOG_CATEGORIES.includes(trimmed)) {
      setCategory(trimmed);
      setNewCategory("");
    }
  };

  // Reset Draft
  const handleResetDraft = () => {
    if (window.confirm("Are you sure you want to reset this draft to empty? Unsaved work will be discarded.")) {
      localStorage.removeItem(`${AUTOSAVE_STORAGE_PREFIX}${id || "new"}`);
      setTitle("");
      setSlug("");
      setExcerpt("");
      setContentHtml("");
      setCoverImageUrl("");
      setAltText("");
      setTags([]);
      setStatus("DRAFT");
      setSeoTitle("");
      setMetaDescription("");
      setSaveStatus("saved");
    }
  };

  // Save / Publish
  const handleSave = async (intendedStatus: BlogPublicationStatus) => {
    if (!title.trim()) {
      alert("Please provide a blog headline.");
      return;
    }

    if (!slug.trim()) {
      alert("Please provide a valid URL slug.");
      return;
    }

    if (isSlugUnique === false) {
      alert(`The URL slug "${slug}" is already in use by another blog post. Please specify a unique slug.`);
      return;
    }

    if (intendedStatus === "PUBLISHED" && !contentHtml.trim()) {
      alert("Cannot publish an empty blog article. Please write some content first.");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");

      const postPayload: Partial<BlogPost> & { title: string } = {
        id: id || undefined,
        title: title.trim(),
        slug: toSlug(slug),
        excerpt: excerpt.trim(),
        content: contentHtml,
        cover_image_url: coverImageUrl,
        alt_text: altText || null,
        author,
        category,
        tags,
        status: intendedStatus,
        published: intendedStatus === "PUBLISHED",
        scheduled_at: intendedStatus === "SCHEDULED" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        seo_title: seoTitle.trim() || undefined,
        meta_title: seoTitle.trim() || undefined,
        metaTitle: seoTitle.trim() || undefined,
        meta_description: metaDescription.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        canonical_url: canonicalUrl.trim() || undefined,
        og_title: ogTitle.trim() || undefined,
        og_description: ogDescription.trim() || undefined,
        og_image: coverImageUrl || undefined,
        reading_time: effectiveReadingTime,
        is_featured: isFeatured,
      };

      await saveBlogPost(postPayload);
      localStorage.removeItem(`${AUTOSAVE_STORAGE_PREFIX}${id || "new"}`);
      setSaveStatus("saved");

      if (intendedStatus === "PUBLISHED") {
        alert("🎉 Blog article published successfully! It is now live on the public website.");
      } else if (intendedStatus === "SCHEDULED") {
        alert("🗓️ Blog article scheduled for publication.");
      } else {
        alert("💾 Draft saved successfully.");
      }

      navigate("/admin/dashboard/blogs");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save blog post.");
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#7FB706] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Real-Word Blog Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-6 pb-24 p-0 m-0 w-full max-w-full overflow-x-hidden">
      {/* ── Editor Master Top Ribbon ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border border-white/10 bg-[#121226]/95 p-[5px] sm:p-5 shadow-2xl backdrop-blur-md m-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/admin/dashboard/blogs"
            className="flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white shrink-0"
            title="Back to Blog Management"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-sm sm:text-xl font-bold text-white flex items-center gap-1.5 truncate">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#7FB706] shrink-0" />
                <span className="truncate">{isEditing ? "Edit Blog Article" : "Word Studio"}</span>
              </h1>
              <span
                className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                  status === "PUBLISHED"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : status === "SCHEDULED"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 sm:gap-2 flex-wrap truncate">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {lastSavedTime ? `Autosaved: ${lastSavedTime}` : "Local backup live"}
              </span>
              <span className="text-gray-600 hidden sm:inline">•</span>
              <span className="text-gray-400 font-mono hidden sm:inline">{effectiveReadingTime}</span>
            </p>
          </div>
        </div>

        {/* Master Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar max-w-full">
          {/* Outline Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowOutline(!showOutline)}
            className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold border transition shrink-0 ${
              showOutline
                ? "bg-[#7FB706]/15 border-[#7FB706]/40 text-[#B5F823]"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            }`}
            title="Toggle Document Outline Navigation"
          >
            <ListTree className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Outline</span>
          </button>

          {/* Expand Studio (Focus Mode - Full Width Writing Area) */}
          <button
            type="button"
            onClick={() => {
              setIsExpandedStudio((prev) => !prev);
              setShowSettingsDrawer(false);
            }}
            className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold border transition shrink-0 ${
              isExpandedStudio
                ? "bg-[#7FB706]/20 border-[#7FB706] text-[#B5F823]"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            }`}
            title={isExpandedStudio ? "Exit expanded canvas and restore sidebar" : "Expand writing area (hide sidebar for deep focus)"}
          >
            {isExpandedStudio ? <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            <span className="hidden sm:inline">{isExpandedStudio ? "Standard" : "Expand"}</span>
          </button>

          {/* Settings Drawer Button when in Expanded Studio mode */}
          {isExpandedStudio && (
            <button
              type="button"
              onClick={() => setShowSettingsDrawer((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold border transition shrink-0 ${
                showSettingsDrawer
                  ? "bg-[#7FB706] text-black border-[#7FB706] font-bold"
                  : "bg-white/5 border-white/10 text-gray-300 hover:text-white"
              }`}
              title="Open Blog Settings & SEO Panel"
            >
              <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Settings ({contentAudit.score}%)</span>
            </button>
          )}

          {/* Reset draft button */}
          {!isEditing && (
            <button
              type="button"
              onClick={handleResetDraft}
              className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[11px] sm:text-xs font-semibold transition shrink-0"
              title="Reset unsaved draft"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}

          {/* Preview button */}
          <Link
            to={id ? `/admin/dashboard/blogs/preview/${id}` : "#"}
            onClick={(e) => {
              if (!id) {
                e.preventDefault();
                alert("Please save draft at least once to view complete live preview.");
              }
            }}
            className="flex items-center gap-1 px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] sm:text-xs font-semibold border border-white/10 transition shrink-0"
          >
            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Preview</span>
          </Link>

          {/* Save Draft button */}
          <button
            type="button"
            onClick={() => handleSave("DRAFT")}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-semibold border border-white/15 transition disabled:opacity-50 shrink-0"
          >
            <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>

          {/* Publish button */}
          <button
            type="button"
            onClick={() => handleSave(status === "SCHEDULED" ? "SCHEDULED" : "PUBLISHED")}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg sm:rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-[11px] sm:text-xs font-bold shadow-lg shadow-[#7FB706]/20 transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{status === "SCHEDULED" ? "Schedule" : "Publish"}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm m-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Main Layout: Document Outline (Optional) + Writing Canvas + Sidebar ─── */}
      <div
        className={`grid grid-cols-1 ${
          showOutline && !isExpandedStudio
            ? "xl:grid-cols-[240px_minmax(0,1fr)_340px]"
            : showOutline && isExpandedStudio
            ? "xl:grid-cols-[240px_minmax(0,1fr)]"
            : !showOutline && isExpandedStudio
            ? "grid-cols-1"
            : "lg:grid-cols-[minmax(0,1fr)_340px]"
        } gap-2 sm:gap-6 items-start w-full min-w-0 m-0`}
      >
        {/* ── Left Document Outline Pane ─────────────────────────────────────── */}
        {showOutline && (
          <div className="hidden xl:block sticky top-28 space-y-3 min-w-0">
            <div className="rounded-2xl border border-white/10 bg-[#121226] p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ListTree className="w-3.5 h-3.5 text-[#7FB706]" />
                  Document Outline
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                  {headings.length}
                </span>
              </div>

              {headings.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500 leading-relaxed">
                  No headings yet.<br />
                  Use <kbd className="font-mono bg-white/10 px-1 rounded text-gray-300">H2</kbd> or{" "}
                  <kbd className="font-mono bg-white/10 px-1 rounded text-gray-300">H3</kbd> to build an outline.
                </div>
              ) : (
                <nav className="space-y-1 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
                  {headings.map((h, i) => (
                    <div
                      key={i}
                      className={`text-xs text-gray-300 hover:text-white rounded-lg py-1 px-1.5 transition flex items-center gap-1.5 ${
                        h.level === 1
                          ? "font-bold text-white pl-1"
                          : h.level === 2
                          ? "font-semibold pl-2.5 border-l border-white/10"
                          : h.level === 3
                          ? "text-gray-400 pl-4 border-l border-white/5"
                          : "text-gray-500 pl-6 border-l border-white/5"
                      }`}
                    >
                      <span className="text-[10px] font-mono text-[#7FB706]">H{h.level}</span>
                      <span className="truncate">{h.text}</span>
                    </div>
                  ))}
                </nav>
              )}
            </div>
          </div>
        )}

        {/* ── Central Word Processor Canvas ──────────────────────────────────── */}
        <div className="space-y-2 sm:space-y-6 min-w-0 w-full overflow-hidden m-0 p-0">
          {/* Article Headline Input */}
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-[#121226] p-[5px] sm:p-6 shadow-xl m-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2 px-1 sm:px-0">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-[#7FB706]" /> Article Headline / Title
              </label>
              <span
                className={`text-[10px] sm:text-[11px] font-mono ${
                  title.length >= 40 && title.length <= 70
                    ? "text-emerald-400 font-semibold"
                    : title.length > 70
                    ? "text-amber-400"
                    : "text-gray-500"
                }`}
              >
                {title.length} chars (rec: 40–70)
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Definitive Architectural Guide to 12mm Compact Laminate Restroom Cubicles"
              className="w-full rounded-lg sm:rounded-xl border border-white/10 bg-[#0a0a1a] px-2.5 py-2 sm:px-4 sm:py-3.5 text-base sm:text-2xl font-bold text-white placeholder-gray-600 focus:border-[#7FB706] focus:outline-none transition-colors m-0"
            />

            {/* Dynamic URL Slug preview & edit */}
            <div className="mt-1.5 sm:mt-3 flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs px-1 sm:px-0">
              <span className="text-gray-500 font-mono">Public URL: /blog/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(toSlug(e.target.value));
                  setSlugManuallyEdited(true);
                }}
                className="rounded-lg border border-white/10 bg-[#0a0a1a] px-2 py-0.5 text-xs font-mono text-[#B5F823] focus:border-[#7FB706] focus:outline-none"
                placeholder="slug"
              />
              <span className="text-gray-500 font-mono">/</span>

              {checkingSlug ? (
                <span className="text-gray-400 text-[10px]">Validating...</span>
              ) : isSlugUnique === true ? (
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Unique
                </span>
              ) : isSlugUnique === false ? (
                <span className="text-red-400 text-[10px] font-semibold flex items-center gap-1">
                  <X className="w-3 h-3" /> Slug In Use
                </span>
              ) : null}
            </div>
          </div>

          {/* Short Excerpt / Summary */}
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-[#121226] p-[5px] sm:p-6 shadow-xl m-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2 px-1 sm:px-0">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                Article Summary / SERP Excerpt
              </label>
              <span
                className={`text-[10px] sm:text-[11px] font-mono ${
                  excerpt.length >= 120 && excerpt.length <= 160
                    ? "text-emerald-400 font-semibold"
                    : excerpt.length > 160
                    ? "text-amber-400"
                    : "text-gray-500"
                }`}
              >
                {excerpt.length} chars (rec: 120–160)
              </span>
            </div>
            <textarea
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Provide a concise 2-sentence summary of the article for blog cards, social meta, and Google search snippets..."
              className="w-full rounded-lg sm:rounded-xl border border-white/10 bg-[#0a0a1a] px-2.5 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-white placeholder-gray-600 focus:border-[#7FB706] focus:outline-none transition-colors resize-none leading-relaxed m-0"
            />
          </div>

          {/* Full Advanced Word Processor */}
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-[#121226] p-[5px] sm:p-5 shadow-xl space-y-1.5 sm:space-y-3 m-0">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 sm:pb-3 px-1 sm:px-0">
              <label className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 sm:gap-2">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7FB706]" /> Content Canvas
              </label>
              <span className="text-[11px] sm:text-xs font-medium text-[#7FB706] flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {effectiveReadingTime}
              </span>
            </div>

            <TiptapEditor
              content={contentHtml}
              onChange={setContentHtml}
              onHeadingsChange={setHeadings}
              placeholder="Write comprehensive article content. Use headings, bullet lists, custom tables, quotes, and images..."
            />
          </div>
        </div>

        {/* ── Right Settings Sidebar ─────────────────────────────────────────── */}
        {(() => {
          const sidebarContent = (
            <div className="space-y-3 sm:space-y-6 m-0 p-0">
          {/* Real-World Content & SEO Quality Scorecard */}
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-[#121226] p-3 sm:p-5 shadow-xl space-y-3 sm:space-y-4 m-0">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#7FB706]" /> Content Health Score
              </h3>
              <div
                className={`text-sm font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  contentAudit.score >= 80
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : contentAudit.score >= 50
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-white/10 text-gray-400 border-white/15"
                }`}
              >
                {contentAudit.score}%
              </div>
            </div>

            {/* Score progress bar */}
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  contentAudit.score >= 80
                    ? "bg-gradient-to-r from-[#7FB706] to-[#B5F823]"
                    : contentAudit.score >= 50
                    ? "bg-amber-400"
                    : "bg-gray-500"
                }`}
                style={{ width: `${contentAudit.score}%` }}
              />
            </div>

            {/* Interactive Audit Checklist */}
            <div className="space-y-2 pt-1 text-xs">
              {contentAudit.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.met ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-600 shrink-0" />
                    )}
                    <span className={item.met ? "text-gray-200" : "text-gray-400"}>{item.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono text-right shrink-0">{item.hint}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Publication Workflow Settings */}
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-[#121226] p-3 sm:p-5 shadow-xl space-y-3 sm:space-y-4 m-0">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#7FB706]" />
              Publishing & Status
            </h3>

            {/* Status Radio / Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Publication Status</label>
              <div className="grid grid-cols-3 gap-1 bg-[#0a0a1a] p-1 rounded-xl border border-white/10">
                {(["DRAFT", "PUBLISHED", "SCHEDULED"] as BlogPublicationStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      status === s ? "bg-[#7FB706] text-white shadow" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {s === "SCHEDULED" ? "Schedule" : s === "PUBLISHED" ? "Live" : "Draft"}
                  </button>
                ))}
              </div>
            </div>

            {/* Scheduled Date Picker */}
            {status === "SCHEDULED" && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  Release Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3 py-2 text-xs text-white focus:border-[#7FB706] focus:outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">Post stays unlisted until release timestamp arrives.</p>
              </div>
            )}

            {/* Featured Post Toggle */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${isFeatured ? "text-amber-400 fill-amber-400" : "text-gray-500"}`} />
                <span className="text-xs font-semibold text-white">Feature in Blog Hero</span>
              </div>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-white/20 bg-[#0a0a1a] text-[#7FB706] focus:ring-0"
              />
            </label>

            {/* Category Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-[#7FB706]" />
                Primary Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3 py-2 text-xs text-white focus:border-[#7FB706] focus:outline-none"
              >
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Add Custom Category */}
              <div className="mt-2 flex gap-1.5">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Or new category..."
                  className="flex-1 rounded-lg border border-white/10 bg-[#0a0a1a] px-2.5 py-1 text-xs text-white focus:border-[#7FB706] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Author */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#7FB706]" />
                Article Author
              </label>
              <select
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3 py-2 text-xs text-white focus:border-[#7FB706] focus:outline-none"
              >
                {BLOG_AUTHORS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Pills */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#7FB706]" />
                Topic Tags
              </label>
              <div className="flex gap-1.5 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="e.g. HPL, IS:2046"
                  className="flex-1 rounded-lg border border-white/10 bg-[#0a0a1a] px-2.5 py-1.5 text-xs text-white focus:border-[#7FB706] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-[#7FB706]/20 text-[#B5F823] rounded-lg text-xs font-bold hover:bg-[#7FB706]/30"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-red-400"
                      title="Remove tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Reading Time override */}
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-400">Reading Time</label>
                <button
                  type="button"
                  onClick={() => setOverrideReadingTime(!overrideReadingTime)}
                  className="text-[11px] text-[#7FB706] hover:underline"
                >
                  {overrideReadingTime ? "Auto Calculate" : "Override"}
                </button>
              </div>
              {overrideReadingTime ? (
                <input
                  type="text"
                  value={manualReadingTime}
                  onChange={(e) => setManualReadingTime(e.target.value)}
                  placeholder="e.g. 7 min read"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3 py-1.5 text-xs text-white focus:border-[#7FB706] focus:outline-none"
                />
              ) : (
                <div className="p-2 rounded-lg bg-white/5 text-xs text-gray-300 font-mono">
                  {autoReadingTime} (auto-computed)
                </div>
              )}
            </div>
          </div>

          {/* Featured Cover Image */}
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-[#121226] p-3 sm:p-5 shadow-xl space-y-3 sm:space-y-4 m-0">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#7FB706]" />
              Featured Cover Image
            </h3>

            {coverImageUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 shadow-lg">
                  <img src={coverImageUrl} alt={altText || "Cover"} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl("")}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-500 text-white transition shadow"
                    title="Remove cover image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/15 rounded-xl p-6 text-center hover:border-[#7FB706]/40 transition-colors">
                <input
                  type="file"
                  ref={coverInputRef}
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                  id="cover-img-input"
                />
                <label
                  htmlFor="cover-img-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2 text-xs text-gray-300"
                >
                  <Upload className="w-6 h-6 text-[#7FB706]" />
                  <span>{isUploadingCover ? "Uploading to CDN..." : "Upload Cover Image"}</span>
                  <span className="text-[10px] text-gray-500">1200x630px recommended (WebP/PNG/JPG)</span>
                </label>
              </div>
            )}

            {/* Direct Image URL input */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Direct CDN URL</label>
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-white/10 bg-[#0a0a1a] px-2.5 py-1.5 text-xs text-white focus:border-[#7FB706] focus:outline-none"
              />
            </div>

            {/* Cover Alt Text */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Cover Image Alt Text</label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="SEO description of cover visual..."
                className="w-full rounded-lg border border-white/10 bg-[#0a0a1a] px-2.5 py-1.5 text-xs text-white focus:border-[#7FB706] focus:outline-none"
              />
            </div>
          </div>

          {/* SEO & Social Metadata Card */}
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-[#121226] p-3 sm:p-5 shadow-xl space-y-3 sm:space-y-4 m-0">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-[#7FB706]" />
                SEO & Google SERP
              </h3>
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setSerpDevice("desktop")}
                  className={`p-1 rounded ${serpDevice === "desktop" ? "bg-[#7FB706] text-white" : "text-gray-400"}`}
                  title="Desktop SERP Preview"
                >
                  <Laptop className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setSerpDevice("mobile")}
                  className={`p-1 rounded ${serpDevice === "mobile" ? "bg-[#7FB706] text-white" : "text-gray-400"}`}
                  title="Mobile SERP Preview"
                >
                  <Smartphone className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Google SERP Snippet Preview */}
            <div
              className={`p-3.5 rounded-xl bg-[#0a0a1a] border border-white/10 space-y-1 ${
                serpDevice === "mobile" ? "max-w-[280px] mx-auto" : ""
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Google {serpDevice === "mobile" ? "Mobile" : "Desktop"} SERP Snippet
              </span>
              <p className="text-xs text-[#8ab4f8] font-medium truncate">{effectiveSeoTitle}</p>
              <p className="text-[11px] text-[#00a67e] truncate font-mono">
                https://www.pacificproduct.in{effectiveCanonicalUrl}
              </p>
              <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{effectiveMetaDescription}</p>
            </div>

            {/* SEO Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-gray-400">SEO Meta Title</label>
                <span className="text-[10px] text-gray-500">{seoTitle.length} / 60</span>
              </div>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title || "Custom Title for SERPs"}
                className="w-full rounded-lg border border-white/10 bg-[#0a0a1a] px-2.5 py-1.5 text-xs text-white focus:border-[#7FB706] focus:outline-none"
              />
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-gray-400">Meta Description</label>
                <span className="text-[10px] text-gray-500">{metaDescription.length} / 160</span>
              </div>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder={excerpt || "Custom search snippet..."}
                className="w-full rounded-lg border border-white/10 bg-[#0a0a1a] px-2.5 py-1.5 text-xs text-white focus:border-[#7FB706] focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Canonical URL */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Canonical URL</label>
              <input
                type="text"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder={`/blog/${slug || "article-slug"}`}
                className="w-full rounded-lg border border-white/10 bg-[#0a0a1a] px-2.5 py-1.5 text-xs font-mono text-white focus:border-[#7FB706] focus:outline-none"
              />
            </div>
          </div>
        </div>
      );

      return (
        <>
          {!isExpandedStudio && (
            <div className="space-y-3 sm:space-y-6 min-w-0 w-full m-0 p-0">{sidebarContent}</div>
          )}

          {/* Slide-over Settings Drawer when Studio is in Expanded Focus Mode */}
          {isExpandedStudio && showSettingsDrawer && (
            <div className="fixed inset-0 z-50 overflow-hidden">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setShowSettingsDrawer(false)}
              />
              <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 z-10">
                <div className="w-screen max-w-md bg-[#121226] border-l border-white/10 shadow-2xl p-4 sm:p-6 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#7FB706]" />
                      Blog Settings & SEO Audit
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowSettingsDrawer(false)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {sidebarContent}
                </div>
              </div>
            </div>
          )}
        </>
      );
    })()}
  </div>
</div>
);
}
