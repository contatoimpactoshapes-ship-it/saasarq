"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, History, Filter, UserPlus, Zap, CreditCard, ArrowDownLeft, RotateCcw, RefreshCw } from "lucide-react";

interface AuditEvent {
  id:         string;
  type:       string;
  actorId:    string;
  actorEmail: string;
  targetId:   string;
  summary:    string;
  metadata:   Record<string, unknown>;
  timestamp:  string;
}

interface AuditResponse {
  events:     AuditEvent[];
  total:      number;
  note:       string;
  computedAt: string;
}

const EVENT_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  USER_SIGNUP:      { icon: UserPlus,      color: "text-emerald-400", bg: "bg-emerald-400/10" },
  GENERATION:       { icon: Zap,           color: "text-rose-400",    bg: "bg-rose-400/10"    },
  CREDIT_PURCHASE:  { icon: CreditCard,    color: "text-indigo-400",  bg: "bg-indigo-400/10"  },
  CREDIT_DEBIT:     { icon: ArrowDownLeft, color: "text-zinc-400",    bg: "bg-zinc-800"       },
  CREDIT_REFUND:    { icon: RotateCcw,     color: "text-amber-400",   bg: "bg-amber-400/10"   },
};

const TYPE_OPTS = ["", "USER_SIGNUP", "GENERATION", "CREDIT_PURCHASE", "CREDIT_DEBIT", "CREDIT_REFUND"];

export default function AuditPage() {
  const [data,    setData]    = useState<AuditResponse | null>(null);
  const [items,   setItems]   = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState("");
  const [type,    setType]    = useState("");

  const load = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (type) params.set("type", type);
      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: AuditResponse = await res.json();
      setData(d);
      if (reset) setItems(d.events);
      else       setItems((prev) => [...prev, ...d.events]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const visible = search.trim()
    ? items.filter((e) =>
        e.actorEmail.toLowerCase().includes(search.toLowerCase()) ||
        e.summary.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit Log</h1>
          <p className="text-zinc-500 text-sm mt-1">Trilha sintética gerada a partir de eventos reais da plataforma.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar email, ID, evento..."
              className="bg-[#050505] border border-white/10 rounded-md py-1.5 pl-9 pr-4 text-sm text-zinc-200 outline-none focus:border-indigo-500/50 transition-colors w-64"
            />
          </div>
          <button
            onClick={() => load()}
            disabled={loading}
            className="bg-[#050505] border border-white/10 rounded-md p-1.5 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2 pb-2 overflow-x-auto border-b border-white/5">
        <Filter className="w-4 h-4 text-zinc-600 shrink-0" />
        {TYPE_OPTS.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 border ${
              type === t
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                : "border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-white/20"
            }`}
          >
            {t || "Todos"}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">{error}</div>
      )}

      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden shadow-2xl relative min-h-[500px]">
        {/* Timeline line */}
        <div className="absolute left-[39px] top-6 bottom-0 w-px bg-white/5 pointer-events-none" />

        <div className="p-6">
          {loading ? (
            <div className="space-y-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-6 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
                  <div className="flex-1 bg-white/[0.01] border border-white/5 rounded-lg p-4 space-y-2">
                    <div className="w-48 h-3 bg-white/5 rounded" />
                    <div className="w-72 h-2 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-sm">
              Nenhum evento encontrado
            </div>
          ) : (
            <div className="space-y-6">
              {visible.map((event) => {
                const meta = EVENT_META[event.type] ?? EVENT_META["CREDIT_DEBIT"];
                const Icon = meta.icon;
                return (
                  <div key={event.id} className="flex gap-6 relative group">
                    <div className={`w-8 h-8 rounded-full ${meta.bg} border border-white/5 flex items-center justify-center z-10 shrink-0 ring-4 ring-[#0a0a0a]`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 bg-white/[0.01] border border-white/5 rounded-lg p-4 group-hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{event.summary}</div>
                          <div className="text-xs text-zinc-500 mt-1">
                            <span className="text-zinc-300 font-mono">{event.actorEmail}</span>
                            <span className="mx-2 text-zinc-700">·</span>
                            <span className="text-zinc-600 font-mono">{event.targetId.slice(0, 16)}{event.targetId.length > 16 ? "…" : ""}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-zinc-500 font-mono">
                            {new Date(event.timestamp).toLocaleString("pt-BR")}
                          </div>
                          <div className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">{event.type}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => load()}
              disabled={loading}
              className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white px-4 py-2 rounded-full border border-white/10 bg-[#050505] transition-colors disabled:opacity-50"
            >
              <History className="w-4 h-4" />
              Recarregar
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div className="text-[10px] text-zinc-600 space-y-0.5">
          <div className="font-mono">{data.note}</div>
          <div className="font-mono">Atualizado: {new Date(data.computedAt).toLocaleString("pt-BR")} · {items.length} eventos</div>
        </div>
      )}
    </div>
  );
}
