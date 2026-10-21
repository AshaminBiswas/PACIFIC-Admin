import React, { useState } from "react";
import {
  X,
  Tag,
  Plus,
  Edit2,
  Check,
  Eye,
  EyeOff,
  FolderTree,
  CheckCircle2,
} from "lucide-react";
import { upApi } from "../../../api/upApi";
import type { UPCategory } from "../../../types/admin";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: UPCategory[];
  onRefresh: () => void;
}

export function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
  onRefresh,
}: CategoryManagerModalProps) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatSort, setNewCatSort] = useState("0");
  const [isAdding, setIsAdding] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSort, setEditSort] = useState("0");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setError(null);

    try {
      setIsAdding(true);
      await upApi.createCategory({
        name: newCatName.trim(),
        sortOrder: parseInt(newCatSort, 10) || 0,
      });
      setNewCatName("");
      setNewCatSort("0");
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "Failed to add category");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdate = async (id: string, active?: boolean) => {
    setError(null);
    try {
      await upApi.updateCategory(id, {
        ...(editingCatId === id && {
          name: editName.trim(),
          sortOrder: parseInt(editSort, 10) || 0,
        }),
        ...(active !== undefined && { active }),
      });
      setEditingCatId(null);
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "Failed to update category");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#030213] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823]">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Expense Categories Master</h3>
              <p className="text-[11px] text-gray-400">Total {categories.length} Categories Configured</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Quick Add Form */}
          <form onSubmit={handleCreate} className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
              + Add New Expense Category
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name (e.g. Tools, Transport)"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/15 focus:border-[#7FB706] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none transition min-h-[40px]"
                required
              />
              <input
                type="number"
                value={newCatSort}
                onChange={(e) => setNewCatSort(e.target.value)}
                placeholder="Sort"
                title="Sort Order"
                className="w-16 px-2 py-2 bg-white/5 border border-white/15 focus:border-[#7FB706] rounded-xl text-xs text-white text-center focus:outline-none transition min-h-[40px]"
              />
              <button
                type="submit"
                disabled={isAdding}
                className="py-2 px-3.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-black font-bold text-xs transition flex items-center gap-1 shrink-0 min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Category List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Existing Categories
            </span>
            {categories.map((c) => {
              const isEditing = editingCatId === c.id;

              return (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs text-white"
                        autoFocus
                      />
                      <input
                        type="number"
                        value={editSort}
                        onChange={(e) => setEditSort(e.target.value)}
                        className="w-14 px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs text-white text-center"
                      />
                      <button
                        onClick={() => handleUpdate(c.id)}
                        className="p-1.5 rounded-lg bg-[#7FB706] text-black"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="p-1.5 rounded-lg bg-white/10 text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-[#7FB706]" />
                        <span className={`font-bold ${c.active ? "text-white" : "text-gray-500 line-through"}`}>
                          {c.name}
                        </span>
                        {c.expenseCount !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-gray-400 font-mono">
                            {c.expenseCount} tx
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCatId(c.id);
                            setEditName(c.name);
                            setEditSort(String(c.sortOrder || 0));
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleUpdate(c.id, !c.active)}
                          className={`p-1.5 rounded-lg transition ${
                            c.active ? "text-emerald-400 hover:bg-emerald-500/10" : "text-gray-500 hover:bg-white/5"
                          }`}
                          title={c.active ? "Deactivate" : "Activate"}
                        >
                          {c.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition min-h-[40px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
