import { useState, useRef } from "react";
import { supabase, uploadImage } from "@/lib/supabase";
import { useAdminCoreServices } from "@/lib/hooks";
import type { CoreService } from "@/lib/database.types";
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

export default function AdminCoreServices() {
  const { data: services, loading, refetch } = useAdminCoreServices();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { title: string; description: string }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function getEdit(svc: CoreService) {
    return edits[svc.id] !== undefined
      ? edits[svc.id]
      : { title: svc.title, description: svc.description };
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith("image/")) {
        showToast("error", `"${file.name}" is not an image file.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        showToast("error", `"${file.name}" exceeds 10 MB limit.`);
        continue;
      }

      const url = await uploadImage(file, "core_services");
      if (!url) {
        showToast("error", `Failed to upload "${file.name}". Check Supabase Storage bucket.`);
        continue;
      }

      const nextOrder = (services[services.length - 1]?.sort_order ?? -1) + 1 + i;
      const { error } = await supabase
        .from("core_services")
        .insert({
          title: "New Core Service",
          description: "Add a description here.",
          image_url: url,
          sort_order: nextOrder,
        });

      if (error) {
        showToast("error", `DB error: ${error.message}`);
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      showToast("success", `${successCount} service${successCount > 1 ? "s" : ""} added successfully!`);
      refetch();
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSaveDetails(svc: CoreService) {
    const newEdit = getEdit(svc);
    setSavingId(svc.id);

    const { error } = await supabase
      .from("core_services")
      .update({ title: newEdit.title, description: newEdit.description })
      .eq("id", svc.id);

    if (error) {
      showToast("error", `Save failed: ${error.message}`);
    } else {
      showToast("success", "Details saved!");
      setEditingId(null);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[svc.id];
        return next;
      });
      refetch();
    }

    setSavingId(null);
  }

  async function handleDelete(svc: CoreService) {
    if (!confirm("Delete this core service?")) return;
    setDeletingId(svc.id);

    const { error } = await supabase.from("core_services").delete().eq("id", svc.id);
    if (error) {
      showToast("error", `Delete failed: ${error.message}`);
    } else {
      showToast("success", "Service deleted.");
      refetch();
    }

    setDeletingId(null);
  }

  async function handleMove(svc: CoreService, direction: "up" | "down") {
    const idx = services.findIndex((i) => i.id === svc.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= services.length) return;

    const other = services[swapIdx];

    await Promise.all([
      supabase.from("core_services").update({ sort_order: other.sort_order }).eq("id", svc.id),
      supabase.from("core_services").update({ sort_order: svc.sort_order }).eq("id", other.id),
    ]);

    refetch();
  }

  return (
    <div className="max-w-4xl mx-auto">
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Our Core Services</h1>
          <p className="text-gray-400 text-sm">
            Manage the core services displayed on the home page. Upload an image, add a title and description.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[#7FB706]/15 text-[#7FB706]">
            {services.length} Services
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#7FB706] text-white rounded-xl text-sm font-semibold hover:bg-[#6fa005] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#7FB706]/20"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Uploading…" : "Add Core Service"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <p className="text-xs text-gray-500 font-medium ml-2 hidden sm:block">Recommended: 800×500 px (16:10)</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading core services…
        </div>
      ) : services.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center py-20 cursor-pointer hover:border-[#7FB706]/40 hover:bg-[#7FB706]/5 transition-all group"
        >
          <ImageIcon className="w-12 h-12 text-gray-600 group-hover:text-[#7FB706]/60 mb-4 transition-colors" />
          <p className="text-gray-400 text-base font-medium mb-1">No core services yet</p>
          <p className="text-gray-600 text-sm">Click to upload an image and create the first service</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {services.map((svc, idx) => {
            const isEditing = editingId === svc.id;
            const isSaving = savingId === svc.id;
            const editState = getEdit(svc);

            return (
              <div
                key={svc.id}
                className="flex gap-4 bg-[#0a0a1a] border border-white/8 rounded-2xl overflow-hidden hover:border-[#7FB706]/20 transition-all"
              >
                <div className="relative w-48 shrink-0 aspect-video">
                  <img
                    src={svc.image_url}
                    alt={svc.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                    #{idx + 1}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between py-3 pr-4 gap-3">
                  <div className="flex flex-col gap-2">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                            Title
                          </label>
                          <input
                            type="text"
                            value={editState.title}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [svc.id]: { ...getEdit(svc), title: e.target.value },
                              }))
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#7FB706]/50 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">
                            Description
                          </label>
                          <textarea
                            rows={2}
                            value={editState.description}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [svc.id]: { ...getEdit(svc), description: e.target.value },
                              }))
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white resize-none focus:outline-none focus:border-[#7FB706]/50 transition-colors"
                          />
                        </div>
                      </>
                    ) : (
                      <div
                        className="cursor-pointer group"
                        onClick={() => setEditingId(svc.id)}
                      >
                        <h3 className="text-white font-bold text-lg group-hover:text-[#7FB706] transition-colors">
                          {svc.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {svc.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveDetails(svc)}
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
                              setEdits((prev) => {
                                const next = { ...prev };
                                delete next[svc.id];
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
                          onClick={() => setEditingId(svc.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit Details
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMove(svc, "up")}
                        disabled={idx === 0}
                        className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(svc, "down")}
                        disabled={idx === services.length - 1}
                        className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(svc)}
                        disabled={deletingId === svc.id}
                        className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50 transition-colors"
                        title="Delete service"
                      >
                        {deletingId === svc.id ? (
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
    </div>
  );
}
