import { useState, useRef, useCallback } from "react";
import { supabase, uploadImage } from "@/lib/supabase";
import { useAdminHeroImages } from "@/lib/hooks";
import type { HeroImage } from "@/lib/database.types";
import {
  Upload,
  Trash2,
  ImageIcon,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save,
  Pencil,
} from "lucide-react";

const MAX_IMAGES = 10;

export default function AdminHero() {
  const { data: images, loading, refetch } = useAdminHeroImages();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // Get working description for an image (local edit or saved value)
  function getDesc(img: HeroImage) {
    return descriptions[img.id] !== undefined ? descriptions[img.id] : img.description;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      showToast("error", `Maximum ${MAX_IMAGES} images allowed. Please delete one first.`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      showToast("error", `Only ${remaining} slot(s) left. Uploading first ${remaining} file(s).`);
    }

    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];

      if (!file.type.startsWith("image/")) {
        showToast("error", `"${file.name}" is not an image file.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        showToast("error", `"${file.name}" exceeds 10 MB limit.`);
        continue;
      }

      const url = await uploadImage(file, "hero");
      if (!url) {
        showToast("error", `Failed to upload "${file.name}". Check Supabase Storage bucket.`);
        continue;
      }

      const nextOrder = (images[images.length - 1]?.sort_order ?? -1) + 1 + i;
      const { error } = await supabase
        .from("hero_images")
        .insert({ url, description: "", sort_order: nextOrder });

      if (error) {
        showToast("error", `DB error: ${error.message}`);
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      showToast("success", `${successCount} image${successCount > 1 ? "s" : ""} uploaded successfully!`);
      refetch();
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSaveDescription(img: HeroImage) {
    const newDesc = getDesc(img);
    setSavingId(img.id);

    const { error } = await supabase
      .from("hero_images")
      .update({ description: newDesc })
      .eq("id", img.id);

    if (error) {
      showToast("error", `Save failed: ${error.message}`);
    } else {
      showToast("success", "Description saved!");
      setEditingId(null);
      // Clear local override so refetch takes over
      setDescriptions((prev) => {
        const next = { ...prev };
        delete next[img.id];
        return next;
      });
      refetch();
    }

    setSavingId(null);
  }

  async function handleDelete(img: HeroImage) {
    if (!confirm("Delete this hero image?")) return;
    setDeletingId(img.id);

    const { error } = await supabase.from("hero_images").delete().eq("id", img.id);
    if (error) {
      showToast("error", `Delete failed: ${error.message}`);
    } else {
      showToast("success", "Image deleted.");
      refetch();
    }

    setDeletingId(null);
  }

  async function handleMove(img: HeroImage, direction: "up" | "down") {
    const idx = images.findIndex((i) => i.id === img.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= images.length) return;

    const other = images[swapIdx];

    await Promise.all([
      supabase.from("hero_images").update({ sort_order: other.sort_order }).eq("id", img.id),
      supabase.from("hero_images").update({ sort_order: img.sort_order }).eq("id", other.id),
    ]);

    refetch();
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium border transition-all duration-300 ${
            toast.type === "success"
              ? "bg-[#1a2e00] border-[#7FB706]/40 text-[#B5F823]"
              : "bg-[#2e0000] border-red-500/40 text-red-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Hero Background Images</h1>
          <p className="text-gray-400 text-sm">
            Upload up to {MAX_IMAGES} images. Add a description for each — it will appear as the hero subheadline when that slide is active.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full ${
              images.length >= MAX_IMAGES
                ? "bg-red-500/15 text-red-400"
                : "bg-[#7FB706]/15 text-[#7FB706]"
            }`}
          >
            {images.length} / {MAX_IMAGES}
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= MAX_IMAGES}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#7FB706] text-white rounded-xl text-sm font-semibold hover:bg-[#6fa005] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#7FB706]/20"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Uploading…" : "Upload Images"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Limit warning */}
      {images.length >= MAX_IMAGES && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Maximum of {MAX_IMAGES} images reached. Delete an image before uploading more.
        </div>
      )}

      {/* Image List */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading images…
        </div>
      ) : images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center py-20 cursor-pointer hover:border-[#7FB706]/40 hover:bg-[#7FB706]/5 transition-all group"
        >
          <ImageIcon className="w-12 h-12 text-gray-600 group-hover:text-[#7FB706]/60 mb-4 transition-colors" />
          <p className="text-gray-400 text-base font-medium mb-1">No hero images yet</p>
          <p className="text-gray-600 text-sm">Click to upload your first image</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {images.map((img, idx) => {
            const isEditing = editingId === img.id;
            const isSaving = savingId === img.id;
            const desc = getDesc(img);

            return (
              <div
                key={img.id}
                className="flex gap-4 bg-[#0a0a1a] border border-white/8 rounded-2xl overflow-hidden hover:border-[#7FB706]/20 transition-all"
              >
                {/* Thumbnail */}
                <div className="relative w-48 shrink-0 aspect-video">
                  <img
                    src={img.url}
                    alt={`Hero background ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Order badge */}
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                    #{idx + 1}
                  </div>
                </div>

                {/* Description + controls */}
                <div className="flex-1 flex flex-col justify-between py-3 pr-4 gap-3">
                  {/* Description field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Slide Description
                    </label>
                    {isEditing ? (
                      <textarea
                        autoFocus
                        rows={3}
                        value={desc}
                        onChange={(e) =>
                          setDescriptions((prev) => ({ ...prev, [img.id]: e.target.value }))
                        }
                        placeholder="Enter a short description for this slide…"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#7FB706]/50 resize-none transition-colors"
                      />
                    ) : (
                      <p
                        className="text-sm text-gray-300 leading-relaxed min-h-[3rem] cursor-pointer hover:text-white transition-colors"
                        onClick={() => setEditingId(img.id)}
                      >
                        {desc || (
                          <span className="text-gray-600 italic">No description yet — click to add one</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between">
                    {/* Edit / Save buttons */}
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveDescription(img)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB706] text-white rounded-lg text-xs font-semibold hover:bg-[#6fa005] transition-colors disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            {isSaving ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setDescriptions((prev) => {
                                const next = { ...prev };
                                delete next[img.id];
                                return next;
                              });
                            }}
                            className="px-3 py-1.5 text-gray-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditingId(img.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit Description
                        </button>
                      )}
                    </div>

                    {/* Reorder + Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMove(img, "up")}
                        disabled={idx === 0}
                        className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(img, "down")}
                        disabled={idx === images.length - 1}
                        className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(img)}
                        disabled={deletingId === img.id}
                        className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50 transition-colors"
                        title="Delete image"
                      >
                        {deletingId === img.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {images.length > 0 && (
        <p className="mt-6 text-xs text-gray-600 text-center">
          Each slide's description replaces the static subheadline on the home page hero section.
        </p>
      )}
    </div>
  );
}
