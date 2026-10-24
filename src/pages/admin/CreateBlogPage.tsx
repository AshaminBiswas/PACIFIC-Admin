import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, X, Search, Globe, Sparkles, BookOpen } from 'lucide-react';
import { saveBlogPost, BLOG_CATEGORIES, BLOG_AUTHORS, toSlug } from '../../lib/blogService';

const LOCAL_STORAGE_KEY = 'pacific_create_blog_v2';

export default function CreateBlogPage() {
  const navigate = useNavigate();
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const INITIAL_FORM_DATA = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_image_url: '',
    author: 'Pacific Team',
    category: BLOG_CATEGORIES[0] || 'Restroom Cubicles',
    tags: [] as string[],
    metaTitle: '',
    metaDescription: '',
    published: false,
    published_at: null as string | null,
  };

  const [formData, setFormData] = useState<typeof INITIAL_FORM_DATA>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) return { ...INITIAL_FORM_DATA, ...JSON.parse(cached) };
    } catch {}
    return INITIAL_FORM_DATA;
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch {}
  }, [formData]);

  const handleReset = () => {
    if (window.confirm('Reset this blog draft?')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
    }
  };

  const effectiveMetaTitle = formData.metaTitle.trim() || formData.title || 'Blog Post Title | Pacific Products';
  const effectiveMetaDescription =
    formData.metaDescription.trim() ||
    formData.excerpt ||
    'Read our latest insights, technical guidelines, and case studies on restroom cubicles and architectural washroom solutions.';
  const effectiveSlug = formData.slug ? toSlug(formData.slug) : toSlug(formData.title);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a blog title.');
      return;
    }

    try {
      setIsSubmitting(true);
      await saveBlogPost({
        title: formData.title.trim(),
        slug: effectiveSlug,
        excerpt: formData.excerpt.trim(),
        content: formData.content,
        cover_image_url: formData.cover_image_url,
        author: formData.author,
        category: formData.category,
        tags: formData.tags,
        seo_title: formData.metaTitle.trim() || undefined,
        meta_title: formData.metaTitle.trim() || undefined,
        metaTitle: formData.metaTitle.trim() || undefined,
        meta_description: formData.metaDescription.trim() || undefined,
        metaDescription: formData.metaDescription.trim() || undefined,
        published: formData.published,
        published_at: formData.published && !formData.published_at ? new Date().toISOString() : formData.published_at,
      });

      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert('Blog created successfully!');
      navigate('/admin/dashboard/blogs');
    } catch (err: any) {
      alert(err.message || 'Failed to create blog post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/dashboard/blogs"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition flex items-center justify-center min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#7FB706] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Blog Publishing Studio
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-0.5">Create New Blog</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSavedTime && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Draft saved ({lastSavedTime})</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Draft</span>
          </button>
        </div>
      </div>

      {/* Main Content Form */}
      <div className="bg-[#121226] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Blog Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Modern Restroom Cubicle Specifications & Standards for 2026"
            className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white w-full focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        {/* Slug & Author & Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">URL Slug (Auto-generated)</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData((f) => ({ ...f, slug: e.target.value }))}
              placeholder={formData.title ? toSlug(formData.title) : 'my-blog-post'}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-300 w-full focus:outline-none focus:border-[#7FB706]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white w-full focus:outline-none focus:border-[#7FB706]"
            >
              {BLOG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Author</label>
            <select
              value={formData.author}
              onChange={(e) => setFormData((f) => ({ ...f, author: e.target.value }))}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white w-full focus:outline-none focus:border-[#7FB706]"
            >
              {BLOG_AUTHORS.map((auth) => (
                <option key={auth} value={auth}>
                  {auth}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cover Image URL */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Cover Image URL</label>
          <input
            type="text"
            value={formData.cover_image_url}
            onChange={(e) => setFormData((f) => ({ ...f, cover_image_url: e.target.value }))}
            placeholder="https://..."
            className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white w-full focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Short Excerpt (Summary)</label>
          <textarea
            rows={2}
            value={formData.excerpt}
            onChange={(e) => setFormData((f) => ({ ...f, excerpt: e.target.value }))}
            placeholder="Brief overview displayed on blog catalog cards..."
            className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white w-full focus:outline-none focus:border-[#7FB706] resize-none"
          />
        </div>

        {/* Content Body */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Blog Content (HTML / Text)</label>
          <textarea
            rows={8}
            value={formData.content}
            onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
            placeholder="Write or paste your article content here..."
            className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white w-full font-mono focus:outline-none focus:border-[#7FB706]"
          />
        </div>

        {/* ── SEO Metadata Card (Meta Title & Meta Description) ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#7FB706]" />
              <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                SEO Metadata (Meta Title &amp; Meta Description)
              </h3>
            </div>
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#7FB706]" /> Search Engine Optimization
            </span>
          </div>

          {/* Google SERP Snippet Preview */}
          <div className="rounded-xl bg-[#080811] border border-white/10 p-3.5 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
              Google Search Result Snippet Preview
            </span>
            <p className="text-xs text-[#8ab4f8] font-medium truncate">{effectiveMetaTitle}</p>
            <p className="text-[11px] text-[#00a67e] truncate font-mono">
              https://www.pacificproduct.in/blog/{effectiveSlug || 'url-slug'}
            </p>
            <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
              {effectiveMetaDescription}
            </p>
          </div>

          {/* Meta Title Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Meta Title (Page Title Tag)
              </label>
              <span
                className={`text-[10px] font-mono ${
                  formData.metaTitle.length >= 50 && formData.metaTitle.length <= 60
                    ? 'text-emerald-400'
                    : formData.metaTitle.length > 60
                    ? 'text-amber-400'
                    : 'text-gray-400'
                }`}
              >
                {formData.metaTitle.length} / 60 characters (Recommended: 50–60)
              </span>
            </div>
            <input
              type="text"
              value={formData.metaTitle}
              onChange={(e) => setFormData((f) => ({ ...f, metaTitle: e.target.value }))}
              placeholder={formData.title ? `${formData.title} | Pacific Products` : 'Custom SEO title for Google SERPs'}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white w-full focus:outline-none focus:border-[#7FB706]"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Leave blank to automatically fallback to the blog's main title.
            </p>
          </div>

          {/* Meta Description Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Meta Description (Search Snippet)
              </label>
              <span
                className={`text-[10px] font-mono ${
                  formData.metaDescription.length >= 140 && formData.metaDescription.length <= 160
                    ? 'text-emerald-400'
                    : formData.metaDescription.length > 160
                    ? 'text-amber-400'
                    : 'text-gray-400'
                }`}
              >
                {formData.metaDescription.length} / 160 characters (Recommended: 150–160)
              </span>
            </div>
            <textarea
              rows={2}
              value={formData.metaDescription}
              onChange={(e) => setFormData((f) => ({ ...f, metaDescription: e.target.value }))}
              placeholder={formData.excerpt || 'Engaging 150-160 character summary that prompts clicks from search results...'}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white w-full focus:outline-none focus:border-[#7FB706] resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Displayed as the snippet underneath your title on Google and social media cards.
            </p>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="e.g. Toilet Partitions, HPL, Commercial Restroom"
              className="flex-1 bg-[#0a0a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#7FB706]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newTag.trim()) {
                    setFormData((f) => ({ ...f, tags: [...f.tags, newTag.trim()] }));
                    setNewTag('');
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (newTag.trim()) {
                  setFormData((f) => ({ ...f, tags: [...f.tags, newTag.trim()] }));
                  setNewTag('');
                }
              }}
              className="px-3 py-2 bg-[#7FB706]/20 text-[#7FB706] font-semibold rounded-xl text-xs hover:bg-[#7FB706]/30 transition"
            >
              Add Tag
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300"
              >
                {t}
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      tags: prev.tags.filter((_, j) => j !== i),
                    }))
                  }
                  className="hover:text-red-400 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Publish Checkbox */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="published-checkbox"
            checked={formData.published}
            onChange={(e) => setFormData((f) => ({ ...f, published: e.target.checked }))}
            className="w-4 h-4 rounded text-[#7FB706] focus:ring-[#7FB706] bg-[#0a0a1a] border-white/20"
          />
          <label htmlFor="published-checkbox" className="text-xs font-semibold text-gray-200 cursor-pointer">
            Publish immediately (Make public on pacificproduct.in/blog)
          </label>
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link
            to="/admin/dashboard/blogs"
            className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl min-h-[48px] flex items-center justify-center gap-2 transition"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold rounded-xl shadow-lg shadow-[#7FB706]/20 min-h-[48px] flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : formData.published ? 'Publish Blog' : 'Save Blog Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
