import { useMemo, useRef, useState } from "react";
import { supabase, uploadImage } from "@/lib/supabase";
import { useAdminGallery } from "@/lib/hooks";
import type { GalleryImage } from "@/lib/database.types";
import { Plus, Trash2, X, Upload, Eye, EyeOff, MapPin } from "lucide-react";

const CATS = ["airports", "malls", "offices", "restroom-cubicles", "locker-solutions", "cladding", "other"];
const LOCATIONS = [
  { slug: "", label: "General website gallery" },
  { slug: "delhi", label: "Delhi NCR" },
  { slug: "mumbai", label: "Mumbai" },
  { slug: "bangalore", label: "Bangalore" },
  { slug: "ahmedabad", label: "Ahmedabad" },
  { slug: "kolkata", label: "Kolkata" },
  { slug: "uae", label: "UAE" },
];
const PLACEMENTS = [
  { value: "general", label: "General gallery" },
  { value: "hero", label: "Location hero image" },
  { value: "gallery", label: "Location showcase gallery" },
] as const;

type Placement = (typeof PLACEMENTS)[number]["value"];

export default function AdminGallery() {
  const { data: images, loading, refetch } = useAdminGallery();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [category, setCategory] = useState("other");
  const [locationSlug, setLocationSlug] = useState("");
  const [placement, setPlacement] = useState<Placement>("general");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      const locA = a.location_slug || "";
      const locB = b.location_slug || "";
      if (locA !== locB) return locA.localeCompare(locB);
      return a.sort_order - b.sort_order;
    });
  }, [images]);

  const resetForm = () => {
    setTitle("");
    setAltText("");
    setCategory("other");
    setLocationSlug("");
    setPlacement("general");
    setImageUrls([]);
    setErr("");
  };

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setErr("");
    const folder = locationSlug ? `locations/${locationSlug}/${placement}` : "gallery";
    
    const urls: string[] = [];
    for (const f of files) {
      const url = await uploadImage(f, folder);
      if (url) urls.push(url);
    }
    
    if (urls.length > 0) {
      setImageUrls((prev) => [...prev, ...urls]);
    } else {
      setErr("Upload failed. Check Supabase Storage bucket and policies.");
    }
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      const normalizedPlacement = locationSlug ? placement : "general";

      if (normalizedPlacement === "hero" && locationSlug) {
        const existingHeroCount = images.filter(img => img.location_slug === locationSlug && img.placement === "hero").length;
        if (existingHeroCount + imageUrls.length > 8) {
          throw new Error("Maximum of 8 hero images allowed for this location. Please delete existing ones first.");
        }
      }

      const rows = imageUrls.map((url, idx) => ({
        title: imageUrls.length > 1 ? `${title} ${idx + 1}` : title,
        alt_text: altText || null,
        category,
        location_slug: locationSlug || null,
        placement: normalizedPlacement,
        image_url: url,
        sort_order: images.length + idx + 1,
        published: true,
      }));

      const { error } = await supabase.from("gallery_images").insert(rows);
      if (error) throw error;
      setShow(false);
      resetForm();
      refetch();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    await supabase.from("gallery_images").delete().eq("id", id);
    refetch();
  };

  const toggle = async (img: GalleryImage) => {
    await supabase.from("gallery_images").update({ published: !img.published }).eq("id", img.id);
    refetch();
  };

  const locationLabel = (slug: string | null) => LOCATIONS.find((l) => l.slug === (slug || ""))?.label || slug || "General";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gallery & Location Images</h1>
          <p className="text-sm text-gray-500 mt-1">Upload general gallery images or location-specific hero/showcase images.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShow(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#7FB706] text-white rounded-xl hover:bg-[#6fa005] text-sm font-medium"
        >
          <Plus className="w-4 h-4" />Add Image
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">Loading...</div>
      ) : sortedImages.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-gray-400 mb-4">No gallery images yet</p>
          <button onClick={() => setShow(true)} className="text-[#7FB706] hover:underline text-sm">Upload your first image</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedImages.map((img) => (
            <div key={img.id} className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <img src={img.image_url} alt={img.title} className="w-full h-40 object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => toggle(img)} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" title={img.published ? "Hide image" : "Publish image"}>
                  {img.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => del(img.id)} className="p-2 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30" title="Delete image">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <p className="text-white text-sm font-medium truncate">{img.title}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] capitalize text-gray-400">
                    <MapPin className="h-3 w-3" />
                    {locationLabel(img.location_slug)}
                  </span>
                  <span className="rounded-full bg-[#7FB706]/15 px-2 py-0.5 text-[11px] capitalize text-[#B5F823]">{img.placement || "general"}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] capitalize text-gray-500">{img.category}</span>
                </div>
              </div>
              {!img.published && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-gray-800/80 text-gray-400 text-xs rounded-full">Draft</div>
              )}
            </div>
          ))}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg bg-[#0a0a1a] border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Add Image</h3>
              <button onClick={() => setShow(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{err}</div>}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Title *</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Alt Text (SEO)</label>
                  <input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Describe image for screen readers" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Location</label>
                  <select
                    value={locationSlug}
                    onChange={(e) => {
                      setLocationSlug(e.target.value);
                      if (!e.target.value) setPlacement("general");
                      else if (placement === "general") setPlacement("gallery");
                    }}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]"
                  >
                    {LOCATIONS.map((loc) => <option key={loc.slug || "general"} value={loc.slug} className="bg-[#0a0a1a]">{loc.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Placement</label>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value as Placement)}
                    disabled={!locationSlug}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706] disabled:opacity-50"
                  >
                    {PLACEMENTS.map((p) => <option key={p.value} value={p.value} className="bg-[#0a0a1a]">{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]">
                  {CATS.map((c) => <option key={c} value={c} className="bg-[#0a0a1a]">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Image(s) *</label>
                <div className="flex items-center gap-3">
                  <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleImg} className="hidden" />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 text-sm disabled:opacity-50 shrink-0">
                    <Upload className="w-4 h-4" />{uploading ? "Uploading..." : "Upload Multiple"}
                  </button>
                  <input 
                    placeholder="or paste URL and press Enter" 
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        setImageUrls(prev => [...prev, e.currentTarget.value]);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  {placement === "hero" 
                    ? "For location hero, upload up to 8 images with a 16:9 ratio (e.g. 1920x1080). Images are automatically optimized." 
                    : "For showcase gallery, upload 6+ images when possible. Images are automatically optimized."}
                </p>
                {imageUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {imageUrls.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="h-16 w-full rounded-lg object-cover" />
                        <button onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/70 p-1 rounded-md text-white opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button onClick={() => setShow(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
              <button onClick={save} disabled={saving || uploading || !title || imageUrls.length === 0} className="px-6 py-2 bg-[#7FB706] text-white rounded-xl hover:bg-[#6fa005] disabled:opacity-50 text-sm font-medium">{saving ? "Saving..." : `Add ${imageUrls.length} Image(s)`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
