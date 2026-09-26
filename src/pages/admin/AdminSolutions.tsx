import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import { supabase, uploadImage } from "@/lib/supabase";
import { useAdminSolutions } from "@/lib/hooks";
import type { Solution } from "@/lib/database.types";
import { Plus, Pencil, Trash2, X, Upload, Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react";
import Editor from "react-simple-wysiwyg";
import type { ProductColor } from "@/lib/database.types";

function toSlug(t: string) { return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

const ICONS = ["Plane", "ShoppingBag", "Building2", "Home", "Factory", "Globe", "Shield", "Award", "Target", "Lightbulb"];

const empty = { slug: "", title: "", subtitle: "", description: "", bottom_description: "", icon_name: "Building2", image_url: "", additional_images: [] as string[], features: [] as string[], clients: [] as string[], colors: [] as ProductColor[], sort_order: 0, published: false };

export default function AdminSolutions() {
  const { data: solutions, loading, refetch } = useAdminSolutions();
  const [editing, setEditing] = useState<Solution | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [isExpanded, setIsExpanded] = useState(false);
  const colorFileRef = useRef<HTMLInputElement>(null);
  const [colorName, setColorName] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [newFeat, setNewFeat] = useState("");
  const [newClient, setNewClient] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const PREDEFINED_TITLES = ["Corporates", "Malls", "Airports", "Metro and railways", "Hospitals", "Schools & Colleges", "Others"];

  const openCreate = () => { setEditing(null); setForm({ ...empty, sort_order: solutions.length + 1 }); setCustomTitle(""); setShow(true); setIsExpanded(false); setErr(""); };
  const openEdit = (s: Solution) => { 
    setEditing(s); 
    const isCustom = s.title && !PREDEFINED_TITLES.includes(s.title);
    setForm({ slug: s.slug, title: isCustom ? "Others" : s.title, subtitle: s.subtitle, description: s.description, bottom_description: s.bottom_description || "", icon_name: s.icon_name, image_url: s.image_url, additional_images: s.additional_images || [], features: [...s.features], clients: [...s.clients], colors: s.colors || [], sort_order: s.sort_order, published: s.published }); 
    setCustomTitle(isCustom ? s.title : "");
    setShow(true); 
    setErr(""); 
  };

  const additionalFileRef = useRef<HTMLInputElement>(null);
  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadImage(f, "solutions"); if (url) setForm(p => ({ ...p, image_url: url })); };
  const handleAdditionalImg = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; if (form.additional_images.length >= 4) { setErr("Max 4 additional images."); return; } const url = await uploadImage(f, "solutions"); if (url) setForm(p => ({ ...p, additional_images: [...p.additional_images, url] })); };

  const save = async () => {
    setSaving(true); setErr("");
    const finalTitle = form.title === "Others" && customTitle.trim() !== "" ? customTitle.trim() : form.title;
    const slug = form.slug || toSlug(finalTitle);
    const payload = { ...form, title: finalTitle, slug };
    try {
      if (editing) {
        const { error: err } = await supabase.from("solutions").update(payload as any).eq("id", editing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("solutions").insert(payload as any);
        if (err) throw err;
      }
      refetch(); return { success: true, slug };
    } catch (e: any) { setErr(e.message); return { success: false, slug: null }; } finally { setSaving(false); }
  };

  
  const handleSaveAndClose = async () => {
    const res = await save();
    if (res?.success) setShow(false);
  };

  const handleSaveAndPreview = async () => {
    const res = await save();
    if (res?.success && res.slug) {
      window.open(`/solutions/${res.slug}`, "_blank");
      setShow(false);
    }
  };

  const handleColorImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await uploadImage(f, "solutions");
    if (url) {
      if (!colorName.trim()) {
        setErr("Please enter a color name before uploading.");
        return;
      }
      setForm((p) => ({
        ...p,
        colors: [...(p.colors || []), { name: colorName.trim(), image_url: url }],
      }));
      setColorName("");
      if (colorFileRef.current) colorFileRef.current.value = "";
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this solution?")) return;
    try {
      const { error } = await supabase.from("solutions").delete().eq("id", id);
      if (error) throw error;
      refetch();
    } catch (e: any) {
      alert("Delete failed: " + (e?.message || "Unknown error"));
    }
  };
  const toggle = async (s: Solution) => { await supabase.from("solutions").update({ published: !s.published } as any).eq("id", s.id); refetch(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Solutions</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] text-white rounded-xl hover:bg-[#6fa005] text-sm font-medium"><Plus className="w-4 h-4" />Add Solution</button>
      </div>
      {loading ? <div className="text-gray-400 text-center py-20">Loading…</div> : solutions.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center"><p className="text-gray-400 mb-4">No solutions yet</p><button onClick={openCreate} className="text-[#7FB706] hover:underline text-sm">Create your first →</button></div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-gray-400 text-left"><th className="px-4 py-3 font-medium">Solution</th><th className="px-4 py-3 font-medium hidden sm:table-cell">Icon</th><th className="px-4 py-3 font-medium text-center">Status</th><th className="px-4 py-3 font-medium text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {solutions.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3"><div className="flex items-center gap-3">{s.image_url && <img src={s.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}<div><p className="text-white font-medium">{s.title}</p><p className="text-gray-500 text-xs">{s.subtitle}</p></div></div></td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{s.icon_name}</td>
                    <td className="px-4 py-3 text-center"><button onClick={() => toggle(s)}>{s.published ? <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-500/15 text-green-400 rounded-full"><Eye className="w-3 h-3" />Live</span> : <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-500/15 text-gray-400 rounded-full"><EyeOff className="w-3 h-3" />Draft</span>}</button></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-end gap-2"><button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><Pencil className="w-4 h-4" /></button><button onClick={() => del(s.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 overflow-hidden p-4 sm:p-6">
          <div className={`w-full bg-[#0a0a1a] border border-white/10 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${isExpanded ? "max-w-[98vw] h-[95vh]" : "max-w-3xl max-h-[85vh]"}`}>
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <h3 className="text-lg font-bold text-white">{editing ? "Edit Solution" : "New Solution"}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white" title={isExpanded ? "Collapse" : "Expand"}>
                  {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button onClick={() => setShow(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{err}</div>}
              <div><label className="block text-sm text-gray-300 mb-1">Title *</label><select value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2.5 bg-[#0a0a1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]"><option value="" className="bg-[#0a0a1a]">Select an Industry</option><option value="Corporates" className="bg-[#0a0a1a]">Corporates</option><option value="Malls" className="bg-[#0a0a1a]">Malls</option><option value="Airports" className="bg-[#0a0a1a]">Airports</option><option value="Metro and railways" className="bg-[#0a0a1a]">Metro and railways</option><option value="Hospitals" className="bg-[#0a0a1a]">Hospitals</option><option value="Schools & Colleges" className="bg-[#0a0a1a]">Schools & Colleges</option><option value="Others" className="bg-[#0a0a1a]">Others</option></select>
              {form.title === "Others" && <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Enter custom industry" className="w-full mt-2 px-4 py-2.5 bg-[#0a0a1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" />}</div>
              <div><label className="block text-sm text-gray-300 mb-1">Slug</label><input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" placeholder={toSlug(form.title === "Others" ? customTitle : form.title) || "auto-generated-from-title"} /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Subtitle</label><input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" /></div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Description <span className="text-xs text-gray-500">(bold, italic, lists, headings — drag corner to resize)</span></label>
                <div className="bg-[#0a0a1a] border border-white/10 rounded-xl overflow-auto resize-y min-h-[200px] max-h-[800px] flex flex-col [&_.rsw-editor]:flex-1 [&_.rsw-editor]:text-white [&_.rsw-toolbar]:bg-white/5 [&_.rsw-toolbar]:border-b [&_.rsw-toolbar]:border-white/10 [&_.rsw-btn]:text-gray-300 hover:[&_.rsw-btn]:text-white [&_.rsw-btn[data-active='true']]:bg-[#7FB706] [&_.rsw-btn[data-active='true']]:text-white">
                  <Editor value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="block text-sm text-gray-300">Icon</label>
                <select value={form.icon_name} onChange={e => setForm(f => ({ ...f, icon_name: e.target.value }))} className="flex-1 px-4 py-2.5 bg-[#0a0a1a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]">{ICONS.map(i => <option key={i} value={i} className="bg-[#0a0a1a]">{i}</option>)}</select>
              </div>
              <div><label className="block text-sm text-gray-300 mb-1">Image</label><div className="flex items-center gap-3"><input ref={fileRef} type="file" accept="image/*" onChange={handleImg} className="hidden" /><button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 text-sm"><Upload className="w-4 h-4" />Upload</button><input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="or paste URL" className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" /></div><p className="text-xs text-gray-500 mt-1 font-medium">Recommended: 800×600 px (4:3 ratio)</p>{form.image_url && <img src={form.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover" />}</div>
              <div><label className="block text-sm text-gray-300 mb-1">Additional Images (Max 4)</label><div className="flex items-center gap-3"><input ref={additionalFileRef} type="file" accept="image/*" onChange={handleAdditionalImg} className="hidden" /><button type="button" onClick={() => additionalFileRef.current?.click()} disabled={form.additional_images.length >= 4} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 text-sm disabled:opacity-50"><Upload className="w-4 h-4" />Upload Additional</button></div>{form.additional_images.length > 0 && <div className="flex gap-2 mt-2 flex-wrap">{form.additional_images.map((img, i) => <div key={i} className="relative group"><img src={img} alt="" className="h-24 w-24 rounded-lg object-cover border border-white/10" /><button type="button" onClick={() => setForm(f => ({ ...f, additional_images: f.additional_images.filter((_, j) => j !== i) }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X className="w-3 h-3" /></button></div>)}</div>}</div>
              <div><label className="block text-sm text-gray-300 mb-1">Features <span className="text-xs text-gray-500">(shown as numbered list)</span></label><div className="flex gap-2 mb-2"><input value={newFeat} onChange={e => setNewFeat(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), newFeat.trim() && (setForm(f => ({ ...f, features: [...f.features, newFeat.trim()] })), setNewFeat("")))} placeholder="Add a feature and press Enter" className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" /><button onClick={() => { if (!newFeat.trim()) return; setForm(f => ({ ...f, features: [...f.features, newFeat.trim()] })); setNewFeat(""); }} className="px-3 py-2 bg-[#7FB706]/20 text-[#7FB706] rounded-xl text-sm">Add</button></div><div className="space-y-1.5">{form.features.map((f, i) => <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2"><span className="w-5 h-5 rounded-full bg-[#7FB706]/20 text-[#7FB706] text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span><span className="text-xs text-gray-300 flex-1">{f}</span><button onClick={() => setForm(p => ({ ...p, features: p.features.filter((_, j) => j !== i) }))} className="hover:text-red-400 text-gray-500 shrink-0"><X className="w-3 h-3" /></button></div>)}</div></div>
              <div><label className="block text-sm text-gray-300 mb-1">Clients</label><div className="flex gap-2 mb-2"><input value={newClient} onChange={e => setNewClient(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), newClient.trim() && (setForm(f => ({ ...f, clients: [...f.clients, newClient.trim()] })), setNewClient("")))} placeholder="Add client name" className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" /><button onClick={() => { if (!newClient.trim()) return; setForm(f => ({ ...f, clients: [...f.clients, newClient.trim()] })); setNewClient(""); }} className="px-3 py-2 bg-[#7FB706]/20 text-[#7FB706] rounded-xl text-sm">Add</button></div><div className="flex flex-wrap gap-2">{form.clients.map((c, i) => <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">{c}<button onClick={() => setForm(p => ({ ...p, clients: p.clients.filter((_, j) => j !== i) }))} className="hover:text-red-400"><X className="w-3 h-3" /></button></span>)}</div></div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"><input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} className="accent-[#7FB706] w-4 h-4" />Published</label>
                <div className="flex items-center gap-2"><label className="text-sm text-gray-300">Sort</label><input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm text-center focus:outline-none focus:border-[#7FB706]" /></div>
              </div>
              {/* Bottom Description */}
              <div className="border-t border-white/5 pt-4">
                <label className="block text-sm font-semibold text-white mb-1">Bottom Description <span className="text-xs font-normal text-gray-500">(shown below features — drag corner to resize)</span></label>
                <div className="bg-[#0a0a1a] border border-white/10 rounded-xl overflow-auto resize-y min-h-[150px] max-h-[600px] flex flex-col [&_.rsw-editor]:flex-1 [&_.rsw-editor]:text-white [&_.rsw-toolbar]:bg-white/5 [&_.rsw-toolbar]:border-b [&_.rsw-toolbar]:border-white/10 [&_.rsw-btn]:text-gray-300 hover:[&_.rsw-btn]:text-white [&_.rsw-btn[data-active='true']]:bg-[#7FB706] [&_.rsw-btn[data-active='true']]:text-white">
                  <Editor value={form.bottom_description || ""} onChange={(e) => setForm((f) => ({ ...f, bottom_description: e.target.value }))} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Additional paragraphs, bullet points, or disclaimers shown after the features section.</p>
              </div>


              {/* Colors */}
              <div className="border-t border-white/5 pt-4">
                <label className="block text-sm font-semibold text-white mb-2">Colors & Finishes</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="Color Name (e.g. Matte Black)" className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" />
                  <input ref={colorFileRef} type="file" accept="image/*" onChange={handleColorImg} className="hidden" />
                  <button type="button" onClick={() => colorFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-[#7FB706]/20 text-[#7FB706] rounded-xl text-sm">
                    <Upload className="w-4 h-4" /> Upload Swatch
                  </button>
                </div>
                {form.colors && form.colors.length > 0 && (
                  <div className="flex flex-wrap gap-4 mt-4">
                    {form.colors.map((c, i) => (
                      <div key={i} className="relative group flex flex-col items-center gap-1">
                        <img src={c.image_url} alt={c.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                        <span className="text-xs text-gray-400">{c.name}</span>
                        <button type="button" onClick={() => setForm((p) => ({ ...p, colors: (p.colors || []).filter((_, j) => j !== i) }))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-white/10 shrink-0">
              <button onClick={() => setShow(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
              <div className="flex items-center gap-3">
                <button onClick={handleSaveAndPreview} disabled={saving || !form.title} className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 text-sm font-medium transition-colors">Save & Preview</button>
                <button onClick={handleSaveAndClose} disabled={saving || !form.title} className="px-6 py-2 bg-[#7FB706] text-white rounded-xl hover:bg-[#6fa005] disabled:opacity-50 text-sm font-medium transition-colors">{saving ? "Saving…" : editing ? "Update" : "Create"}</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
