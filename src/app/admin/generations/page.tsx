"use client";

import { useEffect, useState, useCallback } from "react";
import { Filter, RotateCcw, Clock, Zap, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import { LiveBadge } from "@/components/admin/LiveBadge";

interface Generation {
  id:                string;
  tool:              string;
  model:             string;
  prompt:            string | null;
  status:            string;
  creditsCost:       number;
  outputUrls:        string[];
  errorMessage:      string | null;
  falRequestId:      string | null;
  createdAt:         string;
  updatedAt:         string;
  estimatedCostUSD:  number;
  provider:          string;
  latencyMs:         number | null;
  latencySeconds:    number | null;
  user: { id: string; email: string; plan: string };
}

interface GenResponse {
  generations: Generation[];
  nextCursor:  string | null;
  hasMore:     boolean;
}

const STATUS_STYLES: Record<string, string> = {
  PROCESSING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FAILED:     "bg-rose-500/10 text-rose-400 border-rose-500/20",
  PENDING:    "bg-zinc-800 text-zinc-400 border-white/5",
};

const STATUS_OPTS = ["", "PENDING", "PROCESSING", "COMPLETED", "FAILED"];

export default function GenerationsPage() {
  const [data,        setData]       = useState<GenResponse | null>(null);
  const [items,       setItems]      = useState<Generation[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]      = useState<string | null>(null);
  const [status,      setStatus]     = useState("");
  const [failedOnly,  setFailedOnly] = useState(false);
  const [stuckOnly,   setStuckOnly]  = useState(false);
  const [live,        setLive]       = useState(false);
  const [newActivity, setNewActivity] = useState(0);

  useAdminEvents({
    onConnect:    () => setLive(true),
    onDisconnect: () => setLive(false),
    onEvent: (event) => {
      if (event.type === "generation:started" || event.type === "generation:completed" || event.type === "generation:failed") {
        setNewActivity((n) => n + 1);
      }
    },
  });

  const buildParams = useCallback((cursor?: string) => {
    const p = new URLSearchParams({ limit: "30" });
    if (status)         p.set("status", status);
    if (failedOnly)     p.set("failedOnly", "true");
    if (stuckOnly)      p.set("stuckOnly",  "true");
    if (cursor)         p.set("cursor", cursor);
    return p.toString();
  }, [status, failedOnly, stuckOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/generations?${buildParams()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: GenResponse = await res.json();
      setData(d);
      setItems(d.generations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  async function loadMore() {
    if (!data?.nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/generations?${buildParams(data.nextCursor)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: GenResponse = await res.json();
      setData(d);
      setItems((prev) => [...prev, ...d.generations]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar mais");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  function applyFilter(newStatus: string, failed: boolean, stuck: boolean) {
    setStatus(newStatus);
    setFailedOnly(failed);
    setStuckOnly(stuck);
  }

  const activeFilter = stuckOnly ? "Stuck" : failedOnly ? "Falhas" : status || "All";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Monitoramento de Gerações</h1>
          <p className="text-zinc-500 text-sm mt-1">Feed de inferências com latência, custo e status.</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge live={live} />
          {newActivity > 0 && (
            <button
              onClick={() => { setNewActivity(0); load(); }}
              className="flex items-center gap-1.5 text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 rounded-md px-3 py-1.5 transition-colors animate-in fade-in duration-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              {newActivity} nova{newActivity !== 1 ? "s" : ""} — Atualizar
            </button>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="bg-[#050505] border border-white/10 rounded-md px-3 py-1.5 text-zinc-400 hover:text-white flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 pb-2 overflow-x-auto border-b border-white/5">
        <Filter className="w-4 h-4 text-zinc-600 shrink-0" />
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            onClick={() => applyFilter(s, false, false)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 border ${
              status === s && !failedOnly && !stuckOnly
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                : "border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-white/20"
            }`}
          >
            {s || "Todos"}
          </button>
        ))}
        <button
          onClick={() => applyFilter("", true, false)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 border ${
            failedOnly ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          Falhas
        </button>
        <button
          onClick={() => applyFilter("", false, true)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 border ${
            stuckOnly ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          Travados
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#050505] border-b border-white/5 text-[10px] uppercase text-zinc-600 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">ID / Usuário</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Modelo</th>
                <th className="px-6 py-4">Métricas</th>
                <th className="px-6 py-4">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-28 h-3 bg-white/5 rounded mb-1"/><div className="w-20 h-2 bg-white/5 rounded"/></td>
                    <td className="px-6 py-4"><div className="w-20 h-5 bg-white/5 rounded"/></td>
                    <td className="px-6 py-4"><div className="w-32 h-5 bg-white/5 rounded"/></td>
                    <td className="px-6 py-4"><div className="w-32 h-3 bg-white/5 rounded"/></td>
                    <td className="px-6 py-4"><div className="w-24 h-3 bg-white/5 rounded"/></td>
                  </tr>
                ))
                : items.map((gen) => (
                  <tr key={gen.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-300 text-xs">{gen.id.slice(0, 12)}...</span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">{gen.user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[gen.status] ?? STATUS_STYLES["PENDING"]}`}>
                        {gen.status === "PROCESSING" && <Zap className="w-3 h-3 mr-1 animate-pulse" />}
                        {gen.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 text-[11px] font-mono max-w-[160px] truncate">
                        {gen.model}
                      </span>
                      <div className="text-[10px] text-zinc-600 mt-0.5">{gen.tool}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-xs">
                        {gen.latencySeconds !== null && (
                          <div className="flex items-center gap-1 text-zinc-400">
                            <Clock className="w-3 h-3" />{gen.latencySeconds}s
                          </div>
                        )}
                        <div className="text-indigo-400 font-medium">{gen.creditsCost} cr</div>
                        <div className="text-emerald-400/70">${gen.estimatedCostUSD}</div>
                      </div>
                      {gen.errorMessage && (
                        <div className="text-[10px] text-rose-400 mt-1 max-w-[200px] truncate">{gen.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-xs">
                      {new Date(gen.createdAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-white/5 bg-[#050505] flex items-center justify-center">
          {data?.hasMore ? (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white px-4 py-2 rounded-full border border-white/10 bg-[#0a0a0a] transition-colors disabled:opacity-50"
            >
              {loadingMore ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Carregar mais
            </button>
          ) : (
            <div className="text-xs text-zinc-600">
              {loading ? "Carregando..." : `${items.length} gerações exibidas`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
