import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, MapPin, Monitor, Mail, Download, RefreshCw, Globe,
  Smartphone, Laptop, Tablet, CheckCircle2, XCircle, ChevronDown,
  ChevronUp, Search, Trash2, AlertTriangle,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface VisitorLead {
  id: string;
  created_at: string;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  email: string | null;
  age: number | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  screen_resolution: string | null;
  referrer: string | null;
  consent_given: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function DeviceIcon({ type }: { type: string | null }) {
  if (type === "Mobile") return <Smartphone className="w-4 h-4" />;
  if (type === "Tablet") return <Tablet className="w-4 h-4" />;
  return <Laptop className="w-4 h-4" />;
}

function exportCSV(leads: VisitorLead[]) {
  const headers = [
    "Date", "Email", "Age", "Country", "City", "Region",
    "IP Address", "Device", "Browser", "OS", "Screen",
    "Referrer", "Consent",
  ];
  const rows = leads.map((l) => [
    new Date(l.created_at).toLocaleString(),
    l.email ?? "", l.age ?? "", l.country ?? "", l.city ?? "",
    l.region ?? "", l.ip_address ?? "", l.device_type ?? "",
    l.browser ?? "", l.os ?? "", l.screen_resolution ?? "",
    l.referrer ?? "", l.consent_given ? "Yes" : "No",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `visitor-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = "#7FB706" }: {
  label: string; value: number | string; icon: React.ElementType; color?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#0a0a1a] border border-white/8 rounded-xl p-4 flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-500 text-xs">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────

function ConfirmModal({ count, onConfirm, onCancel }: {
  count: number; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Confirm Delete</h3>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          Are you sure you want to delete <strong className="text-white">{count}</strong> lead{count > 1 ? "s" : ""}? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >Cancel</button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
          >Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Lead Row ──────────────────────────────────────────────────────────────────

function LeadRow({ lead, index, selected, onToggle, onDelete }: {
  lead: VisitorLead; index: number; selected: boolean;
  onToggle: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`bg-[#0a0a1a] border rounded-xl overflow-hidden transition-colors ${selected ? "border-red-500/40 bg-red-500/5" : "border-white/8"}`}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Checkbox */}
        <label className="flex items-center justify-center shrink-0 cursor-pointer">
          <input type="checkbox" checked={selected} onChange={onToggle}
            className="w-4 h-4 rounded border-gray-600 bg-transparent text-[#7FB706] focus:ring-[#7FB706] focus:ring-offset-0 cursor-pointer accent-[#7FB706]"
          />
        </label>

        {/* Expandable row button */}
        <button onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-3 text-left hover:bg-white/[0.02] rounded-lg transition-colors min-w-0"
        >
          {/* Consent */}
          {lead.consent_given ? (
            <CheckCircle2 className="w-4 h-4 text-[#7FB706] shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}

          {/* Date */}
          <span className="text-gray-500 text-xs w-36 shrink-0">
            {new Date(lead.created_at).toLocaleString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>

          {/* Email */}
          <span className="text-gray-300 text-sm flex-1 truncate">
            {lead.email ?? <span className="text-gray-600 italic">No email</span>}
          </span>

          {/* Location */}
          <span className="hidden sm:flex items-center gap-1.5 text-gray-400 text-xs shrink-0 w-32 truncate">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            {lead.city ? `${lead.city}, ${lead.country}` : lead.country ?? "—"}
          </span>

          {/* Device */}
          <span className="hidden md:flex items-center gap-1.5 text-gray-400 text-xs shrink-0 w-20">
            <DeviceIcon type={lead.device_type} />
            {lead.device_type ?? "—"}
          </span>

          {/* Expand */}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
        </button>

        {/* Individual delete */}
        <button onClick={onDelete} title="Delete this lead"
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 border-t border-white/5 pt-4">
              {[
                { label: "IP Address", value: lead.ip_address },
                { label: "Country", value: lead.country },
                { label: "City", value: lead.city },
                { label: "Region", value: lead.region },
                { label: "Age", value: lead.age },
                { label: "Browser", value: lead.browser },
                { label: "OS", value: lead.os },
                { label: "Screen", value: lead.screen_resolution },
                { label: "Device", value: lead.device_type },
                { label: "Referrer", value: lead.referrer ? (() => { try { return new URL(lead.referrer.startsWith("http") ? lead.referrer : `https://${lead.referrer}`).hostname; } catch { return lead.referrer; } })() : null },
                { label: "Consent", value: lead.consent_given ? "✓ Given" : "✗ Declined" },
                { label: "Email", value: lead.email },
              ].map(({ label, value }) => (
                <div key={label} className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-0.5">{label}</p>
                  <p className="text-gray-300 text-xs truncate">{value ?? "—"}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminLeads() {
  const [leads, setLeads] = useState<VisitorLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "consented" | "declined">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[] } | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await (supabase as any)
        .from("visitor_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (err) throw err;
      setLeads(data ?? []);
      setSelectedIds(new Set());
    } catch (e: any) {
      setError(e.message ?? "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Delete logic ───────────────────────────────────────
  const executeDelete = async (ids: string[]) => {
    setDeleting(true);
    setConfirmDelete(null);
    try {
      const { error: err, data } = await (supabase as any)
        .from("visitor_leads")
        .delete()
        .in("id", ids)
        .select("id");

      if (err) throw err;

      // Supabase RLS may silently block deletes — verify rows were actually removed
      const deletedIds = (data ?? []).map((r: any) => r.id);
      if (deletedIds.length === 0 && ids.length > 0) {
        throw new Error(
          "Delete was blocked by database policies. Please check that RLS policies allow authenticated users to delete from visitor_leads."
        );
      }

      setLeads((prev) => prev.filter((l) => !deletedIds.includes(l.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id: string) => next.delete(id));
        return next;
      });
    } catch (e: any) {
      alert("Delete failed: " + (e.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = (id: string) => {
    setConfirmDelete({ ids: [id] });
  };

  const handleDeleteBulk = () => {
    if (selectedIds.size === 0) return;
    setConfirmDelete({ ids: Array.from(selectedIds) });
  };

  // ── Filtering ──────────────────────────────────────────
  const filtered = leads.filter((l) => {
    if (filter === "consented" && !l.consent_given) return false;
    if (filter === "declined" && l.consent_given) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.email?.toLowerCase().includes(q) ||
        l.country?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.ip_address?.includes(q) ||
        false
      );
    }
    return true;
  });

  // ── Select helpers ─────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;

  // Stats
  const totalConsented = leads.filter((l) => l.consent_given).length;
  const withEmail = leads.filter((l) => l.email).length;
  const countries = new Set(leads.map((l) => l.country).filter(Boolean)).size;
  const mobileUsers = leads.filter((l) => l.device_type === "Mobile").length;

  return (
    <div className="space-y-6">
      {/* Confirm Modal */}
      {confirmDelete && (
        <ConfirmModal
          count={confirmDelete.ids.length}
          onConfirm={() => executeDelete(confirmDelete.ids)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#7FB706]/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#7FB706]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Visitor Leads</h1>
            <p className="text-gray-400 text-sm">
              {leads.length} total leads collected via cookie consent
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchLeads}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#7FB706] hover:bg-[#6fa005] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Consented" value={totalConsented} icon={CheckCircle2} color="#7FB706" />
        <StatCard label="With Email" value={withEmail} icon={Mail} color="#3B82F6" />
        <StatCard label="Countries" value={countries} icon={Globe} color="#8B5CF6" />
        <StatCard label="Mobile Users" value={mobileUsers} icon={Smartphone} color="#F59E0B" />
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
          >
            <span className="text-sm text-red-300 font-medium">
              {selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex-1" />
            <button onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
            >Clear Selection</button>
            <button onClick={handleDeleteBulk} disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, country, city, IP…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#7FB706] transition-colors"
          />
        </div>
        <div className="flex rounded-xl border border-white/10 overflow-hidden">
          {(["all", "consented", "declined"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? "bg-[#7FB706] text-white" : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-[#7FB706] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-2">
            Make sure the <code className="text-gray-300">visitor_leads</code> table exists in Supabase.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-400">No leads yet</p>
          <p className="text-sm mt-1">Leads will appear here as visitors accept the cookie consent.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table header with Select All */}
          <div className="flex items-center gap-3 px-4 pb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            <label className="flex items-center justify-center shrink-0 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-600 bg-transparent text-[#7FB706] focus:ring-[#7FB706] focus:ring-offset-0 cursor-pointer accent-[#7FB706]"
              />
            </label>
            <span className="w-4 shrink-0" />
            <span className="w-36 shrink-0 hidden sm:block">Date</span>
            <span className="flex-1">Email</span>
            <span className="w-32 shrink-0 hidden sm:block">Location</span>
            <span className="w-20 shrink-0 hidden md:block">Device</span>
            <span className="w-4 shrink-0" />
            <span className="w-8 shrink-0" />
          </div>

          {filtered.map((lead, i) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              index={i}
              selected={selectedIds.has(lead.id)}
              onToggle={() => toggleSelect(lead.id)}
              onDelete={() => handleDeleteSingle(lead.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
