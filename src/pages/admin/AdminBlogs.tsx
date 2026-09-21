import { useState, useRef } from "react";
import { supabase, uploadImage } from "@/lib/supabase";
import { useAdminBlogs } from "@/lib/hooks";
import type { Blog } from "@/lib/database.types";
import { Plus, Pencil, Trash2, X, Upload, Eye, EyeOff, Maximize, Minimize } from "lucide-react";
import Editor, {
  EditorProvider,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnStrikeThrough,
  BtnNumberedList,
  BtnBulletList,
  BtnLink,
  BtnClearFormatting,
  BtnStyles,
  Separator
} from 'react-simple-wysiwyg';

function toSlug(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const empty = { slug: "", title: "", excerpt: "", content: "", cover_image_url: "", author: "Pacific Team", category: "", tags: [] as string[], published: false, published_at: null as string | null };

export default function AdminBlogs() {
  const { data: blogs, loading, refetch } = useAdminBlogs();
  const [editing, setEditing] = useState<Blog | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [show, setShow] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [newTag, setNewTag] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const contentImgRef = useRef<HTMLInputElement>(null);
  const [uploadingContentImg, setUploadingContentImg] = useState(false);

  const openCreate = () => { setEditing(null); setForm({ ...empty }); setShow(true); setErr(""); };
  const openEdit = (b: Blog) => { setEditing(b); setForm({ slug: b.slug, title: b.title, excerpt: b.excerpt, content: b.content, cover_image_url: b.cover_image_url, author: b.author, category: b.category, tags: [...b.tags], published: b.published, published_at: b.published_at }); setShow(true); setErr(""); };

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadImage(f, "blogs"); if (url) setForm(p => ({ ...p, cover_image_url: url })); };
  
  const handleContentImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingContentImg(true);
    const url = await uploadImage(f, "blogs");
    if (url) {
      const imgHtml = `<img src="${url}" alt="Blog Image" style="max-width: 100%; border-radius: 0.5rem; margin: 1rem 0;" />`;
      setForm(p => ({ ...p, content: p.content + imgHtml }));
    }
    setUploadingContentImg(false);
    if (contentImgRef.current) contentImgRef.current.value = "";
  };

  const addTag = () => { if (!newTag.trim()) return; setForm(f => ({ ...f, tags: [...f.tags, newTag.trim()] })); setNewTag(""); };

  const save = async () => {
    setSaving(true); setErr("");
    const slug = form.slug || toSlug(form.title);
    const payload = { ...form, slug, published_at: form.published && !form.published_at ? new Date().toISOString() : form.published_at };
    try {
      if (editing) { const { error } = await supabase.from("blogs").update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("blogs").insert(payload); if (error) throw error; }
      setShow(false); refetch();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  const del = async (id: string) => { if (!confirm("Delete this blog post?")) return; await supabase.from("blogs").delete().eq("id", id); refetch(); };
  const toggle = async (b: Blog) => { const u: Partial<Blog> = { published: !b.published }; if (!b.published) u.published_at = new Date().toISOString(); await supabase.from("blogs").update(u).eq("id", b.id); refetch(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Blog Posts</h1>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] text-white rounded-xl hover:bg-[#6fa005] text-sm font-medium"><Plus className="w-4 h-4" />New Post</button>
      </div>
      {loading ? <div className="text-gray-400 text-center py-20">Loading…</div> : blogs.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center"><p className="text-gray-400 mb-4">No posts yet</p><button onClick={openCreate} className="text-[#7FB706] hover:underline text-sm">Write your first post →</button></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blogs.map(b => (
            <div key={b.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
              {b.cover_image_url && <img src={b.cover_image_url} alt="" className="w-full h-36 object-cover" />}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#7FB706] font-medium">{b.category || "Uncategorized"}</span>
                  <button onClick={() => toggle(b)}>{b.published ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full"><Eye className="w-3 h-3" />Live</span> : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-500/15 text-gray-400 rounded-full"><EyeOff className="w-3 h-3" />Draft</span>}</button>
                </div>
                <h3 className="text-white font-semibold mb-1 line-clamp-2">{b.title}</h3>
                <p className="text-gray-500 text-xs mb-3 line-clamp-2">{b.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">{b.author}</span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(b.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 overflow-y-auto p-4 pt-12">
          <div className={`w-full bg-[#0a0a1a] border border-white/10 ${isFullscreen ? 'max-w-full min-h-screen rounded-none m-0 p-0 -mt-12 -mx-4' : 'max-w-4xl rounded-2xl'}`}>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">{editing ? "Edit Post" : "New Post"}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
                <button onClick={() => setShow(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className={`p-6 space-y-4 ${isFullscreen ? 'h-[calc(100vh-160px)]' : 'max-h-[70vh]'} overflow-y-auto`}>
              {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{err}</div>}
              <div><label className="block text-sm text-gray-300 mb-1">Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: editing ? f.slug : toSlug(e.target.value) }))} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-300 mb-1">Author</label><input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" /></div>
                <div><label className="block text-sm text-gray-300 mb-1">Category</label><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" placeholder="Guides, Industry" /></div>
              </div>
              <div><label className="block text-sm text-gray-300 mb-1">Excerpt</label><textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={2} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706] resize-none" /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-gray-300">Content</label>
                  <button 
                    type="button"
                    onClick={() => contentImgRef.current?.click()}
                    disabled={uploadingContentImg}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7FB706]/20 text-[#7FB706] hover:bg-[#7FB706]/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingContentImg ? "Uploading..." : "Insert Image from Device"}
                  </button>
                  <input type="file" ref={contentImgRef} onChange={handleContentImg} accept="image/*" className="hidden" />
                </div>
                <div className="bg-white rounded-xl overflow-hidden text-black">
                  <EditorProvider>
                    <Editor 
                      value={form.content} 
                      onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                      containerProps={{ style: { minHeight: '300px' } }}
                    >
                      <Toolbar>
                        <BtnBold />
                        <BtnItalic />
                        <BtnUnderline />
                        <BtnStrikeThrough />
                        <Separator />
                        <BtnNumberedList />
                        <BtnBulletList />
                        <Separator />
                        <BtnLink />
                        <BtnClearFormatting />
                        <BtnStyles />
                      </Toolbar>
                    </Editor>
                  </EditorProvider>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Cover Image</label>
                <div className="flex items-center gap-3">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} className="hidden" />
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 text-sm">
                    <Upload className="w-4 h-4" />Upload
                  </button>
                  <input value={form.cover_image_url} onChange={e => setForm(f => ({ ...f, cover_image_url: e.target.value }))} placeholder="or paste URL" className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" />
                </div>
                {form.cover_image_url && (
                  <div className="relative mt-2 inline-block">
                    <img src={form.cover_image_url} alt="Cover" className="h-32 rounded-lg object-cover border border-white/10" />
                    <button 
                      type="button" 
                      onClick={() => setForm(f => ({ ...f, cover_image_url: "" }))} 
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-lg transition-colors backdrop-blur-sm"
                      title="Remove Cover Image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div><label className="block text-sm text-gray-300 mb-1">Tags</label><div className="flex gap-2 mb-2"><input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add tag" className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#7FB706]" /><button onClick={addTag} className="px-3 py-2 bg-[#7FB706]/20 text-[#7FB706] rounded-xl text-sm">Add</button></div><div className="flex flex-wrap gap-2">{form.tags.map((t, i) => <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">{t}<button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))} className="hover:text-red-400"><X className="w-3 h-3" /></button></span>)}</div></div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"><input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} className="accent-[#7FB706] w-4 h-4" />Published</label>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button onClick={() => setShow(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
              <button onClick={save} disabled={saving || !form.title} className="px-6 py-2 bg-[#7FB706] text-white rounded-xl hover:bg-[#6fa005] disabled:opacity-50 text-sm font-medium">{saving ? "Saving…" : editing ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
