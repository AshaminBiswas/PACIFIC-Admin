import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { TiptapEditor } from "../../components/blog/TiptapEditor";
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
  ChevronRight,
  ExternalLink,
  Search,
  Check,
  X,
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
      alert("Please provide a blog title.");
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

      const saved = await saveBlogPost(postPayload);
      localStorage.removeItem(`${AUTOSAVE_STORAGE_PREFIX}${id || "new"}`);
      setSaveStatus("saved");

      if (intendedStatus === "PUBLISHED") {
        alert("🎉 Blog post published successfully! It is now live on the public website.");
      } else if (intendedStatus === "SCHEDULED") {
        alert("🗓️ Blog post scheduled for publication.");
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
          <p className="text-gray-400">Loading Blog Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* ── Editor Top Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#121226]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard/blogs"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
            title="Back to Blog Management"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white">
                {isEditing ? "Edit Blog Post" : "Write New Blog Article"}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
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
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lastSavedTime ? `Autosaved: ${lastSavedTime}` : "Local storage backed up"}
              </span>
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Reset draft button */}
          {!isEditing && (
            <button
              type="button"
              onClick={handleResetDraft}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold transition"
              title="Reset unsaved draft"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}

          {/* Preview button */}
          <Link
            to={id ? `/admin/dashboard/blogs/preview/${id}` : "#"}
            onClick={(e) => {
              if (!id) {
                e.preventDefault();
                alert("Please save draft at least once to view complete preview.");
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </Link>

          {/* Save Draft button */}
          <button
            type="button"
            onClick={() => handleSave("DRAFT")}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>

          {/* Publish button */}
          <button
            type="button"
            onClick={() => handleSave(status === "SCHEDULED" ? "SCHEDULED" : "PUBLISHED")}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-white text-xs font-bold shadow-lg shadow-[#7FB706]/20 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{status === "SCHEDULED" ? "Schedule Post" : "Publish Live"}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Main Layout: 70% Writing Canvas / 30% Settings Sidebar ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* ── Left Writing Area ──────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Article Title Input */}
          <div className="rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Article Headline / Primary H1
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete Guide to 12mm Compact Laminate Restroom Cubicles for Heavy Traffic"
              className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-4 py-3.5 text-xl sm:text-2xl font-bold text-white placeholder-gray-600 focus:border-[#7FB706] focus:outline-none transition-colors"
            />

            {/* Dynamic URL Slug preview & edit */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500 font-mono">Public URL: /blog/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(toSlug(e.target.value));
                  setSlugManuallyEdited(true);
                }}
                className="rounded-lg border border-white/10 bg-[#0a0a1a] px-2.5 py-1 text-xs font-mono text-[#B5F823] focus:border-[#7FB706] focus:outline-none"
                placeholder="slug"
              />
              <span className="text-gray-500 font-mono">/</span>

              {checkingSlug ? (
                <span className="text-gray-400 text-[11px]">Validating...</span>
              ) : isSlugUnique === true ? (
                <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Slug Unique
                </span>
              ) : isSlugUnique === false ? (
                <span className="text-red-400 text-[11px] font-semibold flex items-center gap-1">
                  <X className="w-3 h-3" /> Slug Taken
                </span>
              ) : null}
            </div>
          </div>

          {/* Short Excerpt / Summary */}
          <div className="rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Article Summary / Excerpt
              </label>
              <span className="text-[11px] text-gray-500">{excerpt.length} characters (rec: 120–160)</span>
            </div>
            <textarea
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Provide a concise 2-sentence summary of the article for blog cards and Google snippets..."
              className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#7FB706] focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Rich-Text Word Processor */}
          <div className="rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Long-Form Word Processor Content
              </label>
              <span className="text-xs font-medium text-[#7FB706] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {effectiveReadingTime}
              </span>
            </div>

            <TiptapEditor
              content={contentHtml}
              onChange={setContentHtml}
              placeholder="Write comprehensive article content. Use headings, bullet lists, custom tables, quotes, and images..."
            />
          </div>
        </div>

        {/* ── Right Settings Sidebar ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Publication Workflow Settings */}
          <div className="rounded-2xl border border-white/10 bg-[#121226] p-5 shadow-xl space-y-4">
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
          <div className="rounded-2xl border border-white/10 bg-[#121226] p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#7FB706]" />
              Featured Cover Image
            </h3>

            {coverImageUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10">
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
          <div className="rounded-2xl border border-white/10 bg-[#121226] p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#7FB706]" />
              SEO & Social Sharing
            </h3>

            {/* Google SERP Snippet Preview */}
            <div className="p-3.5 rounded-xl bg-[#0a0a1a] border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Google SERP Preview</span>
              <p className="text-xs text-[#8ab4f8] font-medium truncate">{effectiveSeoTitle}</p>
              <p className="text-[11px] text-[#00a67e] truncate font-mono">
                https://www.pacificproduct.in{effectiveCanonicalUrl}
              </p>
              <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{effectiveMetaDescription}</p>
            </div>

            {/* SEO Title */}
            <div>
              <div className="flex items-between justify-between mb-1">
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
              <div className="flex items-between justify-between mb-1">
                <label className="text-[11px] font-semibold text-gray-400">Meta Description</label>
                <span className="text-[10px] text-gray-500">{metaDescription.length} / 160</span>
              </div>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder={excerpt || "Custom search snippet..."}
                className="w-full rounded-lg border border-white/10 bg-[#0a0a1a] px-2.5 py-1.5 text-xs text-white focus:border-[#7FB706] focus:outline-none resize-none"
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
      </div>
    </div>
  );
}
