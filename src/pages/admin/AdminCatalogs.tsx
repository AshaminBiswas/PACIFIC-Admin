import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import { supabase, uploadFile, uploadImage } from "@/lib/supabase";
import { useAdminCatalogs, useAdminProducts } from "@/lib/hooks";
import type { Catalog } from "@/lib/database.types";
import {
  Plus, Trash2, X, Upload, Eye, EyeOff, Pencil,
  FileText, Image as ImageIcon, Download, ExternalLink,
  Maximize2, Minimize2
} from "lucide-react";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AdminCatalogs() {
  const { data: catalogs, loading, refetch } = useAdminCatalogs();
  const { data: products } = useAdminProducts();

  const [show, setShow] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("Catalog");
  const [category, setCategory] = useState("Other");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState<"pdf" | "image">("pdf");
  const [fileSize, setFileSize] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [productId, setProductId] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  // Preview modal state
  const [previewCatalog, setPreviewCatalog] = useState<Catalog | null>(null);

  // Edit state — null means "create new", a string means "editing that id"
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDocumentType("Catalog");
    setCategory("Other");
    setFileUrl("");
    setFileType("pdf");
    setFileSize(0);
    setThumbnailUrl("");
    setProductId("");
    setErr("");
    setEditingId(null);
    setIsExpanded(false);
  };

  const startEdit = (cat: Catalog) => {
    setEditingId(cat.id);
    setTitle(cat.title);
    setDescription(cat.description);
    setDocumentType(cat.document_type || "Catalog");
    setCategory(cat.category || "Other");
    setFileUrl(cat.file_url);
    setFileType(cat.file_type);
    setFileSize(cat.file_size);
    setThumbnailUrl(cat.thumbnail_url);
    setProductId(cat.product_id || "");
    setErr("");
    setShow(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Validate file type
    const isPdf = f.type === "application/pdf";
    const isImg = f.type.startsWith("image/");
    if (!isPdf && !isImg) {
      setErr("Only PDF and image files are allowed.");
      return;
    }

    setUploading(true);
    setErr("");

    try {
      const result = await uploadFile(f, "catalogs");
      if (result) {
        setFileUrl(result.url);
        setFileSize(result.size);
        setFileType(isPdf ? "pdf" : "image");
      } else {
        setErr("File upload failed. Please try again.");
      }
    } catch (ex: any) {
      setErr(ex.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await uploadImage(f, "catalog-thumbnails");
    if (url) setThumbnailUrl(url);
  };

  const save = async () => {
    if (!title || !fileUrl || !productId) {
      setErr("Title, file, and service are required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      if (editingId) {
        // Update existing catalog
        const { error } = await supabase.from("catalogs").update({
          title,
          description,
          document_type: documentType,
          category,
          file_url: fileUrl,
          file_type: fileType,
          file_size: fileSize,
          thumbnail_url: thumbnailUrl,
          product_id: productId || null,
        } as any).eq("id", editingId);
        if (error) throw error;
      } else {
        // Insert new catalog
        const { error } = await supabase.from("catalogs").insert({
          title,
          description,
          document_type: documentType,
          category,
          file_url: fileUrl,
          file_type: fileType,
          file_size: fileSize,
          thumbnail_url: thumbnailUrl,
          product_id: productId || null,
          sort_order: catalogs.length + 1,
          published: true,
        } as any);
        if (error) throw error;
      }
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
    if (!confirm("Delete this catalog?")) return;
    try {
      const { error } = await supabase.from("catalogs").delete().eq("id", id);
      if (error) throw error;
      refetch();
    } catch (e: any) {
      alert("Delete failed: " + (e?.message || "Unknown error"));
    }
  };

  const toggle = async (item: Catalog) => {
    await supabase.from("catalogs").update({ published: !item.published }).eq("id", item.id);
    refetch();
  };

  const getProductTitle = (pid: string | null) => {
    if (!pid) return "General";
    return products.find((p) => p.id === pid)?.title || "Unknown";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Downloads & Catalogs</h1>
        <button
          onClick={() => { setShow(true); setErr(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] text-white rounded-xl hover:bg-[#6fa005] text-sm font-medium"
        >
          <Plus className="w-4 h-4" />Upload Document
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-20">Loading…</div>
      ) : catalogs.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No catalogs uploaded yet</p>
          <button
            onClick={() => setShow(true)}
            className="text-[#7FB706] hover:underline text-sm"
          >
            Upload your first catalog →
          </button>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Details</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {catalogs.map((cat) => (
                  <tr key={cat.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {cat.thumbnail_url ? (
                            <img src={cat.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : cat.file_type === "pdf" ? (
                            <FileText className="w-5 h-5 text-red-400" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate max-w-[150px] sm:max-w-[250px]">{cat.title}</p>
                          <p className="text-gray-500 text-xs truncate max-w-[150px] sm:max-w-[250px]">{cat.description || "No description"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-300">{cat.document_type || 'Catalog'} • {cat.category || 'Other'}</span>
                        <span className="text-gray-500">
                          {cat.file_type.toUpperCase()} • {formatFileSize(cat.file_size)} • {getProductTitle(cat.product_id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggle(cat)}>
                        {cat.published ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-500/15 text-green-400 rounded-full">
                            <Eye className="w-3 h-3" /> Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-500/15 text-gray-400 rounded-full">
                            <EyeOff className="w-3 h-3" /> Draft
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(cat)}
                          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPreviewCatalog(cat)}
                          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={cat.file_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => del(cat.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className={`w-full bg-[#0a0a1a] border border-white/10 rounded-2xl flex flex-col transition-all duration-300 ${isExpanded ? 'max-w-[98vw] h-[95vh]' : 'max-w-lg max-h-[90vh]'}`}>
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <h3 className="text-lg font-bold text-white">{editingId ? "Edit Document" : "Upload Document"}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => { setShow(false); resetForm(); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {err && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
                  {err}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Product Catalog 2026"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706] resize-none"
                />
              </div>

              {/* Document Type & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Document Type *</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="Brochure" className="bg-[#0a0a1a]">Brochure</option>
                    <option value="Catalog" className="bg-[#0a0a1a]">Catalog</option>
                    <option value="Drawing" className="bg-[#0a0a1a]">Drawing</option>
                    <option value="Installation Manual" className="bg-[#0a0a1a]">Installation Manual</option>
                    <option value="Warranty" className="bg-[#0a0a1a]">Warranty</option>
                    <option value="Technical Specification" className="bg-[#0a0a1a]">Technical Specification</option>
                    <option value="Test Report" className="bg-[#0a0a1a]">Test Report</option>
                    <option value="Other" className="bg-[#0a0a1a]">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]"
                  >
                    <option value="Restroom Cubicles" className="bg-[#0a0a1a]">Restroom Cubicles</option>
                    <option value="Toilet Partition" className="bg-[#0a0a1a]">Toilet Partition</option>
                    <option value="Shower Cubicle" className="bg-[#0a0a1a]">Shower Cubicle</option>
                    <option value="Locker Solution" className="bg-[#0a0a1a]">Locker Solution</option>
                    <option value="Changing Room" className="bg-[#0a0a1a]">Changing Room</option>
                    <option value="Custom Hardware" className="bg-[#0a0a1a]">Custom Hardware</option>
                    <option value="Other" className="bg-[#0a0a1a]">Other</option>
                  </select>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  File * <span className="text-gray-500">(PDF or Image)</span>
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {!fileUrl ? (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 text-sm disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {uploading ? "Uploading…" : "Choose File"}
                    </button>
                  ) : (
                    <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                        {fileType === "pdf" ? (
                          <FileText className="w-4 h-4 text-red-400" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-blue-400" />
                        )}
                        <span className="text-green-400">✓ Uploaded</span>
                        <span className="text-gray-500">
                          ({formatFileSize(fileSize)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-[#7FB706] hover:bg-white/10 transition-colors"
                        title="Edit File"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFileUrl(""); setFileSize(0); }}
                        className="p-2 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Delete File"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {fileUrl && fileType === "image" && (
                  <img
                    src={fileUrl}
                    alt="Preview"
                    className="mt-3 h-32 w-auto max-w-full rounded-lg object-contain border border-white/10 bg-black/50"
                  />
                )}
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Thumbnail <span className="text-gray-500">(optional, for PDF preview)</span>
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                  <input
                    ref={thumbRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
                  {!thumbnailUrl ? (
                    <button
                      type="button"
                      onClick={() => thumbRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 text-sm whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4" />Upload Thumbnail
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => thumbRef.current?.click()}
                        className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-[#7FB706] hover:bg-white/10 transition-colors"
                        title="Edit Thumbnail"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl("")}
                        className="p-2 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Delete Thumbnail"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <input
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="or paste URL"
                    className="w-full sm:flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]"
                  />
                </div>
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail"
                    className="mt-3 h-20 w-auto max-w-full rounded-lg object-contain bg-black/50"
                  />
                )}
              </div>

              {/* Link to Product (Optional) */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Link to Product/Service <span className="text-gray-500">(optional)</span>
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]"
                >
                  <option value="" disabled className="bg-[#0a0a1a]">
                    Select a service…
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0a0a1a]">
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 shrink-0">
              <button
                onClick={() => { setShow(false); resetForm(); }}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !title || !fileUrl}
                className="px-6 py-2 bg-[#7FB706] text-white rounded-xl hover:bg-[#6fa005] disabled:opacity-50 text-sm font-medium"
              >
                {saving ? "Saving…" : editingId ? "Save Changes" : "Upload Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewCatalog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl bg-[#0a0a1a] border border-white/10 rounded-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-white/10 gap-4">
              <div className="flex items-center gap-3">
                {previewCatalog.file_type === "pdf" ? (
                  <FileText className="w-5 h-5 text-red-400" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                )}
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{previewCatalog.title}</h3>
                  <p className="text-xs text-gray-500">
                    {previewCatalog.file_type.toUpperCase()} • {formatFileSize(previewCatalog.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={previewCatalog.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-gray-300 hover:bg-white/10 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />Open
                </a>
                <a
                  href={previewCatalog.file_url}
                  download
                  className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-3 py-1.5 bg-[#7FB706]/10 rounded-lg text-[#7FB706] hover:bg-[#7FB706]/20 text-sm"
                >
                  <Download className="w-4 h-4" />Download
                </a>
                <button
                  onClick={() => setPreviewCatalog(null)}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-gray-400 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-hidden p-4 bg-gray-900/50">
              {previewCatalog.file_type === "pdf" ? (
                <iframe
                  src={previewCatalog.file_url}
                  className="w-full h-full min-h-[60vh] rounded-xl border border-white/10"
                  title={previewCatalog.title}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <img
                    src={previewCatalog.file_url}
                    alt={previewCatalog.title}
                    className="max-w-full max-h-[70vh] rounded-xl object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
