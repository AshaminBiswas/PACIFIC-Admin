import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CANONICAL_LOCATIONS,
  fetchAllLocationsMedia,
  fetchLocationMedia,
  uploadLocationHeroBanner,
  uploadLocationGalleryImage,
  deleteLocationImage,
  type LocationSectionData,
} from "../../lib/locationService";
import type { GalleryImage } from "../../lib/database.types";
import {
  MapPin,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  RefreshCw,
  Plus,
  Globe,
  Truck,
  Building,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  MessageSquare,
  X,
  Save,
} from "lucide-react";

type ClusterFilter = "all" | "ncr" | "west" | "south" | "east" | "international";
type ActiveTab = "banner" | "content" | "logistics" | "seo" | "faqs";

export default function AdminLocations() {
  const [locations, setLocations] = useState<LocationSectionData[]>(CANONICAL_LOCATIONS);
  const [mediaMap, setMediaMap] = useState<Record<string, { hero?: GalleryImage; galleryCount: number }>>({});
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [clusterFilter, setClusterFilter] = useState<ClusterFilter>("all");

  // Selected Location for editing
  const [selectedLocation, setSelectedLocation] = useState<LocationSectionData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("banner");

  // Media state for selected location
  const [selectedHeroImages, setSelectedHeroImages] = useState<GalleryImage[]>([]);
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<GalleryImage[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Upload state
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [bannerAltText, setBannerAltText] = useState("");
  const [bannerTitle, setBannerTitle] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Section edit state
  const [formData, setFormData] = useState<LocationSectionData | null>(null);
  const [savingSections, setSavingSections] = useState(false);

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Load all media records from Supabase
  const loadMedia = async () => {
    try {
      setLoading(true);
      const map = await fetchAllLocationsMedia();
      setMediaMap(map);
    } catch (err: any) {
      console.error("Failed to load locations media:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  // When a location is selected, fetch its specific media and populate form
  const handleSelectLocation = async (loc: LocationSectionData) => {
    setSelectedLocation(loc);
    setFormData({ ...loc });
    setActiveTab("banner");
    setBannerAltText(`${loc.city} Commercial Restroom Cubicle Installation by Pacific`);
    setBannerTitle(loc.h1);

    try {
      setLoadingMedia(true);
      const media = await fetchLocationMedia(loc.slug);
      setSelectedHeroImages(media.heroImages);
      setSelectedGalleryImages(media.galleryImages);
    } catch (err: any) {
      showToast("error", "Failed to load media for " + loc.city);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Upload hero banner
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLocation) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please upload a valid image file.");
      return;
    }

    try {
      setIsUploadingBanner(true);
      const uploaded = await uploadLocationHeroBanner(
        selectedLocation.slug,
        file,
        bannerAltText || `${selectedLocation.city} Restroom Cubicle Banner`,
        bannerTitle || selectedLocation.h1
      );
      setSelectedHeroImages([uploaded, ...selectedHeroImages]);
      setMediaMap((prev) => ({
        ...prev,
        [selectedLocation.slug]: {
          ...prev[selectedLocation.slug],
          hero: uploaded,
        },
      }));
      showToast("success", `Hero banner uploaded for ${selectedLocation.city}!`);
    } catch (err: any) {
      showToast("error", err.message || "Failed to upload banner.");
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
    }
  };

  // Upload gallery image
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLocation) return;

    try {
      setIsUploadingGallery(true);
      const uploaded = await uploadLocationGalleryImage(
        selectedLocation.slug,
        file,
        `${selectedLocation.city} project photo`,
        `${selectedLocation.city} Reference Installation`
      );
      setSelectedGalleryImages([...selectedGalleryImages, uploaded]);
      setMediaMap((prev) => ({
        ...prev,
        [selectedLocation.slug]: {
          ...prev[selectedLocation.slug],
          galleryCount: (prev[selectedLocation.slug]?.galleryCount || 0) + 1,
        },
      }));
      showToast("success", "Project photo added to gallery!");
    } catch (err: any) {
      showToast("error", err.message || "Failed to upload photo.");
    } finally {
      setIsUploadingGallery(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
    }
  };

  // Delete image
  const handleDeleteImage = async (imageId: string, isHero: boolean) => {
    if (!confirm("Delete this image?")) return;
    try {
      await deleteLocationImage(imageId);
      if (isHero) {
        setSelectedHeroImages((prev) => prev.filter((img) => img.id !== imageId));
        setMediaMap((prev) => {
          const clone = { ...prev };
          if (clone[selectedLocation!.slug]?.hero?.id === imageId) {
            delete clone[selectedLocation!.slug].hero;
          }
          return clone;
        });
      } else {
        setSelectedGalleryImages((prev) => prev.filter((img) => img.id !== imageId));
        setMediaMap((prev) => ({
          ...prev,
          [selectedLocation!.slug]: {
            ...prev[selectedLocation!.slug],
            galleryCount: Math.max(0, (prev[selectedLocation!.slug]?.galleryCount || 1) - 1),
          },
        }));
      }
      showToast("success", "Image deleted.");
    } catch (err: any) {
      showToast("error", "Delete failed: " + err.message);
    }
  };

  // Save content sections
  const handleSaveSections = () => {
    if (!formData || !selectedLocation) return;
    setSavingSections(true);
    try {
      // Update local state
      setLocations((prev) =>
        prev.map((l) => (l.slug === selectedLocation.slug ? { ...formData } : l))
      );
      setSelectedLocation({ ...formData });

      // Save to localStorage as overrides for preview
      try {
        localStorage.setItem(
          `pacific_location_override_${selectedLocation.slug}`,
          JSON.stringify(formData)
        );
      } catch {}

      showToast("success", `Sections updated for ${formData.city}!`);
    } catch (err: any) {
      showToast("error", "Failed to save sections.");
    } finally {
      setSavingSections(false);
    }
  };

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesCluster = clusterFilter === "all" || loc.cluster === clusterFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        loc.city.toLowerCase().includes(q) ||
        loc.stateName.toLowerCase().includes(q) ||
        loc.targetKeyword.toLowerCase().includes(q) ||
        loc.slug.toLowerCase().includes(q);
      return matchesCluster && matchesSearch;
    });
  }, [locations, clusterFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-24">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-xs font-bold ${
            toast.type === "success" ? "bg-[#7FB706]" : "bg-red-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121226] border border-white/5 p-4 sm:p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Location Pages &amp; Banners</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#7FB706]/15 text-[#7FB706] border border-[#7FB706]/20">
              17 Canonical Cities
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Upload custom hero banners, showcase regional projects, and configure local SEO sections for all 16 Indian cities and Dubai UAE.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMedia}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Media</span>
        </button>
      </div>

      {/* ── SEARCH & CLUSTERS ───────────────────────────────────── */}
      <div className="bg-[#121226] border border-white/5 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city name, keyword (e.g. Noida, Cyber City), or state..."
              className="w-full pl-10 pr-4 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition"
            />
          </div>

          {/* Cluster filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                { id: "all", label: "All Hubs (17)" },
                { id: "ncr", label: "Delhi NCR (6)" },
                { id: "west", label: "West (3)" },
                { id: "south", label: "South (4)" },
                { id: "east", label: "East & NE (3)" },
                { id: "international", label: "UAE (1)" },
              ] as Array<{ id: ClusterFilter; label: string }>
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClusterFilter(c.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  clusterFilter === c.id
                    ? "bg-[#7FB706] text-[#030213] font-bold shadow-sm"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LOCATIONS GRID ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map((loc) => {
          const media = mediaMap[loc.slug];
          const activeHeroUrl = media?.hero?.image_url || loc.defaultHeroImage;
          const isSelected = selectedLocation?.slug === loc.slug;

          return (
            <div
              key={loc.slug}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-[#121226] flex flex-col justify-between ${
                isSelected
                  ? "border-[#7FB706] ring-1 ring-[#7FB706] shadow-xl"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              {/* Card Banner Preview */}
              <div className="relative h-36 bg-black/50 overflow-hidden group">
                <img
                  src={activeHeroUrl}
                  alt={loc.city}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-[#7FB706] border border-[#7FB706]/30">
                    {loc.cluster.toUpperCase()}
                  </span>
                  {media?.hero && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/80 text-white flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Custom Banner
                    </span>
                  )}
                </div>

                {/* City name over image */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white drop-shadow-md">{loc.city}</h3>
                    <p className="text-[11px] text-gray-300 drop-shadow truncate">{loc.stateName}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                    {media?.galleryCount || 0} project photos
                  </span>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-[11px] text-[#7FB706] font-medium truncate mb-1">
                    🎯 {loc.targetKeyword}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {loc.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  {/* Public Link */}
                  <a
                    href={`https://www.pacificproduct.in/${loc.canonicalSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-white transition"
                    title="Open live public landing page"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#7FB706]" />
                    <span>View Page</span>
                  </a>

                  {/* Edit Banner & Content Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectLocation(loc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-bold transition shadow-sm"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Manage City</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL / DRAWER: LOCATION EDITOR ─────────────────────── */}
      {selectedLocation && formData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-[#121226] border border-white/10 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#08081a] border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7FB706]/15 border border-[#7FB706]/30 flex items-center justify-center text-[#7FB706]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{selectedLocation.city}</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                      /{selectedLocation.canonicalSlug}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{selectedLocation.region}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://www.pacificproduct.in/${selectedLocation.canonicalSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
                  title="View live website page"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedLocation(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 pt-3 bg-[#0a0a1a] border-b border-white/10 flex items-center gap-2 overflow-x-auto shrink-0">
              {[
                { id: "banner", label: "Hero Banner & Photos", icon: ImageIcon },
                { id: "content", label: "Headline & Content", icon: Building },
                { id: "logistics", label: "Logistics & Corridors", icon: Truck },
                { id: "seo", label: "SEO & SERP Preview", icon: Globe },
                { id: "faqs", label: "Projects & FAQs", icon: HelpCircle },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-[#7FB706] text-[#7FB706]"
                        : "border-transparent text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: HERO BANNER & MEDIA */}
              {activeTab === "banner" && (
                <div className="space-y-6">
                  {/* Current Hero Banner */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
                      <span>Location Hero Banner</span>
                      <span className="text-[10px] text-gray-500 font-normal">Recommended: 1600×500 px or 1920×600 px (16:5)</span>
                    </h4>

                    <div className="relative aspect-[16/6] bg-black/60 rounded-2xl overflow-hidden border border-white/10 shadow-inner group">
                      {selectedHeroImages.length > 0 ? (
                        <img
                          src={selectedHeroImages[0].image_url}
                          alt={selectedHeroImages[0].alt_text || selectedLocation.city}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={selectedLocation.defaultHeroImage}
                          alt={selectedLocation.city}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Overlay badge */}
                      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-bold text-white border border-white/10">
                        {selectedHeroImages.length > 0 ? "Active Custom Banner" : "Default Architectural Image"}
                      </div>

                      {/* Delete banner action */}
                      {selectedHeroImages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(selectedHeroImages[0].id, true)}
                          className="absolute top-3 right-3 p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl shadow-lg transition"
                          title="Remove custom banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Banner Upload Box */}
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-5 space-y-4">
                    <h5 className="text-xs font-bold text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#7FB706]" />
                      <span>Upload New Hero Banner for {selectedLocation.city}</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-gray-400 font-semibold mb-1">Banner Alt Text</label>
                        <input
                          type="text"
                          value={bannerAltText}
                          onChange={(e) => setBannerAltText(e.target.value)}
                          placeholder="e.g. Noida commercial cubicle installation"
                          className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#7FB706]"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 font-semibold mb-1">Banner Title Tag</label>
                        <input
                          type="text"
                          value={bannerTitle}
                          onChange={(e) => setBannerTitle(e.target.value)}
                          placeholder="e.g. Restroom Cubicle Manufacturer in Noida"
                          className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#7FB706]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="file"
                        ref={bannerFileInputRef}
                        onChange={handleBannerUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        disabled={isUploadingBanner}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{isUploadingBanner ? "Uploading Banner..." : "Select & Upload Banner Image"}</span>
                      </button>
                      <span className="text-[11px] text-gray-500">
                        PNG, JPG, or WebP. Auto-optimized via CDN.
                      </span>
                    </div>
                  </div>

                  {/* Project Showcase Gallery Photos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <span>Regional Project Installation Gallery</span>
                        <span className="text-[10px] text-[#7FB706] font-bold">({selectedGalleryImages.length} photos)</span>
                      </h4>

                      <div>
                        <input
                          type="file"
                          ref={galleryFileInputRef}
                          onChange={handleGalleryUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => galleryFileInputRef.current?.click()}
                          disabled={isUploadingGallery}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#7FB706]" />
                          <span>{isUploadingGallery ? "Uploading..." : "Add Project Photo"}</span>
                        </button>
                      </div>
                    </div>

                    {selectedGalleryImages.length === 0 ? (
                      <div className="p-8 text-center bg-black/20 rounded-2xl border border-white/5">
                        <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">No custom project photos added yet for {selectedLocation.city}.</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Click "Add Project Photo" above to showcase real commercial installations in this city.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {selectedGalleryImages.map((img) => (
                          <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group bg-black/40">
                            <img src={img.image_url} alt={img.alt_text || ""} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(img.id, false)}
                                className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                                title="Delete image"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: HEADLINE & CONTENT */}
              {activeTab === "content" && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">H1 Main Page Headline</label>
                    <input
                      type="text"
                      value={formData.h1}
                      onChange={(e) => setFormData({ ...formData, h1: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Tagline / Sub-Headline</label>
                    <input
                      type="text"
                      value={formData.tagline}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Primary Location Description</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white leading-relaxed focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-gray-400 font-semibold mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#7FB706]" />
                        <span>Regional Service Address</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 font-semibold mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#7FB706]" />
                        <span>Contact Phone</span>
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 font-semibold mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#7FB706]" />
                        <span>Support Email</span>
                      </label>
                      <input
                        type="text"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 font-semibold mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                        <span>WhatsApp Number</span>
                      </label>
                      <input
                        type="text"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LOGISTICS & CORRIDORS */}
              {activeTab === "logistics" && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Delivery Lead Time</label>
                    <input
                      type="text"
                      value={formData.deliveryTime}
                      onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                      placeholder="e.g. Same-day site audit; 24-48h fabrication & delivery"
                      className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Dispatch Mode &amp; Transit Route</label>
                    <input
                      type="text"
                      value={formData.dispatchMode}
                      onChange={(e) => setFormData({ ...formData, dispatchMode: e.target.value })}
                      placeholder="e.g. Direct dispatch from Delhi central plant via DND Flyway"
                      className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">
                      Coverage Hubs &amp; Industrial Corridors (comma separated)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.coverageHubs.join(", ")}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          coverageHubs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.coverageHubs.map((hub, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-gray-300">
                          {hub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SEO & SERP PREVIEW */}
              {activeTab === "seo" && (
                <div className="space-y-5 text-xs">
                  {/* Google Search Snippet Simulation */}
                  <div className="bg-[#1f1f23] p-4 rounded-xl border border-white/10 font-sans">
                    <div className="text-[11px] text-gray-400 truncate mb-1">
                      https://www.pacificproduct.in &gt; {formData.canonicalSlug}
                    </div>
                    <div className="text-[#8ab4f8] text-sm font-medium hover:underline cursor-pointer truncate">
                      {formData.metaTitle}
                    </div>
                    <p className="text-gray-300 text-xs mt-1 leading-relaxed line-clamp-2">
                      {formData.metaDescription}
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Target Primary Keyword</label>
                    <input
                      type="text"
                      value={formData.targetKeyword}
                      onChange={(e) => setFormData({ ...formData, targetKeyword: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-400 font-semibold mb-1">
                      <span>SEO Meta Title</span>
                      <span className={formData.metaTitle.length > 60 ? "text-amber-400" : "text-gray-500"}>
                        {formData.metaTitle.length} / 60
                      </span>
                    </div>
                    <input
                      type="text"
                      value={formData.metaTitle}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-400 font-semibold mb-1">
                      <span>SEO Meta Description</span>
                      <span className={formData.metaDescription.length > 160 ? "text-amber-400" : "text-gray-500"}>
                        {formData.metaDescription.length} / 160
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.metaDescription}
                      onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white leading-relaxed focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: PROJECTS & FAQS */}
              {activeTab === "faqs" && (
                <div className="space-y-6 text-xs">
                  {/* Projects */}
                  <div>
                    <label className="block text-gray-400 font-semibold mb-2">
                      Key Commercial Reference Projects in {selectedLocation.city}
                    </label>
                    <textarea
                      rows={3}
                      value={formData.projects.join("\n")}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          projects: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="One project per line"
                      className="w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#7FB706]"
                    />
                  </div>

                  {/* FAQs */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-white uppercase text-[11px] tracking-wider text-gray-400">
                      Regional Buyer FAQs
                    </h5>
                    {formData.faqs.map((faq, idx) => (
                      <div key={idx} className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-2">
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const updated = [...formData.faqs];
                            updated[idx].question = e.target.value;
                            setFormData({ ...formData, faqs: updated });
                          }}
                          placeholder="Question"
                          className="w-full px-2.5 py-1.5 bg-[#0a0a1a] border border-white/10 rounded-lg text-white font-semibold focus:outline-none focus:border-[#7FB706]"
                        />
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => {
                            const updated = [...formData.faqs];
                            updated[idx].answer = e.target.value;
                            setFormData({ ...formData, faqs: updated });
                          }}
                          placeholder="Answer"
                          className="w-full px-2.5 py-1.5 bg-[#0a0a1a] border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:border-[#7FB706]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#08081a] border-t border-white/10 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-gray-500">
                Changes persist immediately and synchronize with live storefront landing pages.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLocation(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveSections}
                  disabled={savingSections}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSections ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
