import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { loadFAQs, saveFAQs, resetFAQs, getCategories, type FAQ } from "@/lib/faq-data";
import { supabase } from "@/lib/supabase";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeId() {
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706] transition-colors text-sm";
const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2";

// ── FAQ Form (add / edit) ────────────────────────────────────────────────────

interface FormState {
  question: string;
  answer: string;
  category: string;
  categoryCustom: string;
}

function FAQForm({
  initial,
  existingCategories,
  onSave,
  onCancel,
}: {
  initial?: FAQ;
  existingCategories: string[];
  onSave: (data: Omit<FAQ, "id" | "sort_order">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    question: initial?.question || "",
    answer: initial?.answer || "",
    category: initial?.category || (existingCategories[0] ?? "General"),
    categoryCustom: "",
  });
  const [useCustomCat, setUseCustomCat] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const change = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    const errs: typeof errors = {};
    if (!form.question.trim()) errs.question = "Question is required";
    if (!form.answer.trim()) errs.answer = "Answer is required";
    const cat = useCustomCat ? form.categoryCustom.trim() : form.category.trim();
    if (!cat) errs.categoryCustom = "Category is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ question: form.question.trim(), answer: form.answer.trim(), category: cat });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-6 space-y-5"
    >
      <h3 className="text-lg font-bold text-white">{initial ? "Edit FAQ" : "Add New FAQ"}</h3>

      {/* Question */}
      <div>
        <label className={labelCls}>Question *</label>
        <textarea
          rows={2}
          value={form.question}
          onChange={(e) => change("question", e.target.value)}
          className={`${inputCls} resize-none ${errors.question ? "border-red-500" : ""}`}
          placeholder="What is your question?"
        />
        {errors.question && <p className="text-red-400 text-xs mt-1">{errors.question}</p>}
      </div>

      {/* Answer */}
      <div>
        <label className={labelCls}>Answer *</label>
        <textarea
          rows={4}
          value={form.answer}
          onChange={(e) => change("answer", e.target.value)}
          className={`${inputCls} resize-none ${errors.answer ? "border-red-500" : ""}`}
          placeholder="Provide a detailed answer…"
        />
        {errors.answer && <p className="text-red-400 text-xs mt-1">{errors.answer}</p>}
      </div>

      {/* Category */}
      <div>
        <label className={labelCls}>Category *</label>
        <div className="flex gap-3 flex-wrap mb-2">
          {existingCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setUseCustomCat(false); change("category", cat); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                !useCustomCat && form.category === cat
                  ? "bg-[#7FB706] border-[#7FB706] text-white"
                  : "border-white/10 text-gray-400 hover:border-[#7FB706]/50 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUseCustomCat(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              useCustomCat
                ? "bg-[#7FB706] border-[#7FB706] text-white"
                : "border-white/10 text-gray-400 hover:border-[#7FB706]/50 hover:text-white"
            }`}
          >
            + New category
          </button>
        </div>
        {useCustomCat && (
          <input
            type="text"
            value={form.categoryCustom}
            onChange={(e) => change("categoryCustom", e.target.value)}
            className={`${inputCls} ${errors.categoryCustom ? "border-red-500" : ""}`}
            placeholder="e.g. Technical Support"
            autoFocus
          />
        )}
        {errors.categoryCustom && (
          <p className="text-red-400 text-xs mt-1">{errors.categoryCustom}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={submit}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Save className="w-4 h-4" />
          {initial ? "Update" : "Add FAQ"}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-5 py-2.5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-xl text-sm font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ── FAQ Row ──────────────────────────────────────────────────────────────────

function FAQRow({
  faq,
  index,
  total,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  faq: FAQ;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="bg-[#0a0a1a] border border-white/8 rounded-xl overflow-hidden"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Order badge */}
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7FB706]/15 border border-[#7FB706]/30 text-[#7FB706] text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>

        {/* Question + category */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-left w-full text-white font-medium text-sm leading-snug hover:text-[#7FB706] transition-colors"
          >
            {faq.question}
          </button>
          <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#7FB706] bg-[#7FB706]/10 px-2 py-0.5 rounded-full">
            {faq.category}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-500 hover:text-[#7FB706] hover:bg-[#7FB706]/10 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable preview */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <p className="px-4 pb-4 pl-[3.25rem] text-gray-400 text-xs leading-relaxed border-t border-white/5 pt-3">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Admin FAQ Page ──────────────────────────────────────────────────────

export default function AdminFAQ() {
  const [faqs, setFAQs] = useState<FAQ[]>(() => loadFAQs());
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const categories = getCategories(faqs);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const persist = useCallback((updated: FAQ[]) => {
    setFAQs(updated);
    saveFAQs(updated);
  }, []);

  const handleAdd = (data: Omit<FAQ, "id" | "sort_order">) => {
    const maxOrder = faqs.reduce((m, f) => Math.max(m, f.sort_order), 0);
    const newFaq: FAQ = { id: makeId(), sort_order: maxOrder + 1, ...data };
    persist([...faqs, newFaq]);
    setShowAdd(false);
    showToast("FAQ added successfully");
  };

  const handleUpdate = (id: string, data: Omit<FAQ, "id" | "sort_order">) => {
    persist(faqs.map((f) => (f.id === id ? { ...f, ...data } : f)));
    setEditingId(null);
    showToast("FAQ updated successfully");
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    persist(faqs.filter((f) => f.id !== id));
    (async () => {
      try {
        await supabase.from('faqs').delete().eq('id', id);
      } catch {}
    })();
    showToast("FAQ deleted");
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const arr = [...faqs];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    // Fix sort_order
    arr.forEach((f, i) => (f.sort_order = i + 1));
    persist(arr);
  };

  const moveDown = (index: number) => {
    if (index === faqs.length - 1) return;
    const arr = [...faqs];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    arr.forEach((f, i) => (f.sort_order = i + 1));
    persist(arr);
  };

  const handleReset = () => {
    const defaults = resetFAQs();
    setFAQs(defaults);
    setConfirmReset(false);
    showToast("FAQs reset to defaults");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#7FB706]/15 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-[#7FB706]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">FAQ Management</h1>
            <p className="text-gray-400 text-sm">
              {faqs.length} question{faqs.length !== 1 ? "s" : ""} · stored in browser (no database)
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded-xl text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add FAQ
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-[#7FB706]/8 border border-[#7FB706]/20 rounded-xl p-4">
        <HelpCircle className="w-4 h-4 text-[#7FB706] mt-0.5 flex-shrink-0" />
        <p className="text-gray-400 text-sm leading-relaxed">
          FAQs are saved in your browser's <strong className="text-gray-300">localStorage</strong> — no database required. Changes persist across page reloads on this device. Use{" "}
          <strong className="text-gray-300">Reset to Defaults</strong> to restore the original FAQs.
        </p>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <FAQForm
            existingCategories={categories}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>

      {/* FAQ List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {faqs
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((faq, index) =>
              editingId === faq.id ? (
                <motion.div
                  key={`edit-${faq.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <FAQForm
                    initial={faq}
                    existingCategories={categories}
                    onSave={(data) => handleUpdate(faq.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </motion.div>
              ) : (
                <FAQRow
                  key={faq.id}
                  faq={faq}
                  index={index}
                  total={faqs.length}
                  onEdit={() => { setEditingId(faq.id); setShowAdd(false); }}
                  onDelete={() => handleDelete(faq.id)}
                  onMoveUp={() => moveUp(index)}
                  onMoveDown={() => moveDown(index)}
                />
              )
            )}
        </AnimatePresence>
      </div>

      {/* Confirm Reset Modal */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmReset(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Reset FAQs?</h3>
                  <p className="text-gray-400 text-sm">This will discard all your changes.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-2.5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium z-50 ${
              toast.type === "success"
                ? "bg-[#7FB706] text-white"
                : "bg-red-500 text-white"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
