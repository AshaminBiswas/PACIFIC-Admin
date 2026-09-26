import { useState, useRef, useCallback } from "react";
import { supabase, uploadImage } from "@/lib/supabase";
import { useAdminPageBanners } from "@/lib/hooks";
import type { PageBanner } from "@/lib/database.types";
import {
  Upload,
  ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save,
  Pencil,
  Monitor,
  Trash2,
} from "lucide-react";

// Predefined specs per page slug
const PAGE_SPECS: Record<string, { label: string; size: string; ratio: string; bucket: string; aspect: string }> = {
  about:     { label: "About Us",   size: "1920×600 px", ratio: "16:5",  bucket: "page-banners", aspect: "aspect-[16/5]" },
  services:  { label: "Services",   size: "1920×600 px", ratio: "16:5",  bucket: "page-banners", aspect: "aspect-[16/5]" },
  solutions: { label: "Solutions",  size: "1920×600 px", ratio: "16:5",  bucket: "page-banners", aspect: "aspect-[16/5]" },
  gallery:   { label: "Gallery",    size: "1920×480 px", ratio: "4:1",   bucket: "page-banners", aspect: "aspect-[4/1]"  },
  contact:   { label: "Contact Us", size: "1920×600 px", ratio: "16:5",  bucket: "page-banners", aspect: "aspect-[16/5]" },
};

export default function AdminPageBanners() {
  const { data: banners, loading, refetch } = useAdminPageBanners();
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { title: string; subtitle: string }>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function getBanner(slug: string): PageBanner | undefined {
    return banners.find((b) => b.page_slug === slug);
  }

  function getEdit(slug: string, field: "title" | "subtitle", fallback: string) {
    return edits[slug]?.[field] !== undefined ? edits[slug][field] : fallback;
  }

  function setEdit(slug: string, field: "title" | "subtitle", value: string) {
    setEdits((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [field]: value },
    }));
  }

  async function handleUpload(slug: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("error", "Please select a valid image file."); return; }
    if (file.size > 10 * 1024 * 1024) { showToast("error", "File exceeds 10 MB limit."); return; }

    setUploadingSlug(slug);
    const url = await uploadImage(file, PAGE_SPECS[slug].bucket);
    if (!url) { showToast("error", "Upload failed. Check Supabase Storage."); setUploadingSlug(null); return; }

    const banner = getBanner(slug);
    let err;
    if (banner) {
      ({ error: err } = await supabase.from("page_banners").update({ image_url: url } as any).eq("id", banner.id));
    } else {
      ({ error: err } = await supabase.from("page_banners").insert({ page_slug: slug, image_url: url, title: "", subtitle: "" } as any));
    }

    if (err) { showToast("error", "Failed to save to database."); }
    else { showToast("success", `${PAGE_SPECS[slug].label} banner updated!`); refetch(); }
    setUploadingSlug(null);
    if (fileInputRefs.current[slug]) fileInputRefs.current[slug]!.value = "";
  }

  async function handleSave(slug: string) {
    const banner = getBanner(slug);
    if (!banner) return;
    setSavingSlug(slug);
    const { error: err } = await supabase.from("page_banners").update({
      title: getEdit(slug, "title", banner.title),
      subtitle: getEdit(slug, "subtitle", banner.subtitle),
    } as any).eq("id", banner.id);
    if (err) showToast("error", "Failed to save text.");
    else { showToast("success", "Text updated!"); refetch(); setEditingSlug(null); }
    setSavingSlug(null);
  }

  async function handleDeleteBanner(slug: string) {
    if (!confirm(`Delete banner image for ${PAGE_SPECS[slug]?.label || slug}?`)) return;
    const banner = getBanner(slug);
    if (!banner) return;
    setSavingSlug(slug);
    const { error: err } = await supabase.from("page_banners").delete().eq("id", banner.id);
    if (err) {
      showToast("error", "Failed to delete banner: " + err.message);
    } else {
      showToast("success", `${PAGE_SPECS[slug]?.label || slug} banner deleted.`);
      refetch();
    }
    setSavingSlug(null);
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium ${toast.type === "success" ? "bg-[#7FB706]" : "bg-red-500"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Page Banners</h1>
        <p className="text-gray-400 text-sm">
          Manage the hero background images for About, Services, Solutions, and Gallery pages.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading banners…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(PAGE_SPECS).map(([slug, spec]) => {
            const banner = getBanner(slug);
            const isUploading = uploadingSlug === slug;
            const isSaving = savingSlug === slug;
            const isEditing = editingSlug === slug;

            return (
              <div key={slug} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-sm">
                {/* Image Preview */}
                <div className={`relative w-full ${spec.aspect} bg-[#030213] overflow-hidden`}>
                  {banner?.image_url ? (
                    <img src={banner.image_url} alt={spec.label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="w-10 h-10 mb-2" />
                      <p className="text-sm">No image uploaded</p>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {/* Spec Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Monitor className="w-3.5 h-3.5" />
                    {spec.size} · {spec.ratio}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">{spec.label}</h2>
                    <button
                      onClick={() => { setEditingSlug(isEditing ? null : slug); }}
                      className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-[#7FB706] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {isEditing ? "Cancel" : "Edit text"}
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-400 mb-1 block">Title</label>
                        <input
                          type="text"
                          value={getEdit(slug, "title", banner?.title ?? "")}
                          onChange={(e) => setEdit(slug, "title", e.target.value)}
                          placeholder={`e.g. "About Us"`}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-white/10 bg-[#0a0a1a] text-white focus:outline-none focus:ring-2 focus:ring-[#7FB706]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 mb-1 block">Subtitle</label>
                        <input
                          type="text"
                          value={getEdit(slug, "subtitle", banner?.subtitle ?? "")}
                          onChange={(e) => setEdit(slug, "subtitle", e.target.value)}
                          placeholder="Short description"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-white/10 bg-[#0a0a1a] text-white focus:outline-none focus:ring-2 focus:ring-[#7FB706]"
                        />
                      </div>
                      <button
                        onClick={() => handleSave(slug)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Text
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">{banner?.title || <span className="text-gray-500 italic">No title set</span>}</p>
                      <p className="text-xs text-gray-400">{banner?.subtitle || <span className="text-gray-500 italic">No subtitle set</span>}</p>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => { fileInputRefs.current[slug] = el; }}
                      onChange={(e) => handleUpload(slug, e)}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRefs.current[slug]?.click()}
                        disabled={isUploading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#7FB706]/40 hover:border-[#7FB706] text-[#7FB706] hover:bg-[#7FB706]/5 text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {banner?.image_url ? "Replace Image" : "Upload Image"}
                      </button>
                      {banner && (
                        <button
                          onClick={() => handleDeleteBanner(slug)}
                          disabled={isUploading || isSaving}
                          className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-colors"
                          title="Delete Banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-1.5">
                      Recommended: {spec.size} ({spec.ratio}) · Max 10 MB
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
