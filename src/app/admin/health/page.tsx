"use client";

import { useEffect, useState } from "react";
import { HeartPulse, CheckCircle2, AlertTriangle, ShieldAlert, Database, Cloud, RefreshCw, XCircle } from "lucide-react";
import { useAdminEvents } from "@/hooks/useAdminEvents";
import { LiveBadge } from "@/components/admin/LiveBadge";
import { LiveFeed, toFeedEntry, prependEntry, type FeedEntry } from "@/components/admin/LiveFeed";

interface StuckGeneration {
  id:           string;
  model:        string;
  tool:         string;
  falRequestId: string | null;
  createdAt:    string;
  updatedAt:    string;
  user:         { id: string; email: string };
}

interface HealthData {
  stuckCount:       number;
  stuckGenerations: StuckGeneration[];
  pendingCount:     number;
  processingCount:  number;
  failedRate2h:     number;
  recentWindow: {
    hours:      number;
    total:      number;
    completed:  number;
    failed:     number;
    pending:    number;
    processing: number;
  };
  timestamp: string;
}

export default function HealthPage() {
  const [data,    setData]    = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [live,    setLive]    = useState(false);
  const [feed,    setFeed]    = useState<FeedEntry[]>([]);

  useAdminEvents({
    onConnect:    () => setLive(true),
    onDisconnect: () => setLive(false),
    onHeartbeat: (stats) => {
      setData((prev) => prev
        ? { ...prev, pendingCount: stats.pendingCount, processingCount: stats.processingCount, stuckCount: stats.stuckCount }
        : prev
      );
    },
    onEvent: (event) => {
      const entry = toFeedEntry(event);
      if (entry) setFeed((prev) => prependEntry(prev, entry));
    },
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const overallOk = data
    ? data.stuckCount === 0 && data.failedRate2h < 20
    : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Health &amp; Ops</h1>
          <p className="text-zinc-500 text-sm mt-1">Status da fila, taxa de falha e gerações travadas.</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge live={live} />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white bg-white/5 border border-white/10 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      <LiveFeed entries={feed} live={live} />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm flex gap-2">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Global Status Banner */}
      {loading ? (
        <div className="w-full border border-white/5 bg-white/[0.02] rounded-xl p-4 animate-pulse h-16" />
      ) : (
        <div className={`w-full border rounded-xl p-4 flex items-center justify-between ${
          overallOk
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-rose-500/20 bg-rose-500/5"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${overallOk ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
              <HeartPulse className={`w-5 h-5 ${overallOk ? "text-emerald-400" : "text-rose-400"}`} />
            </div>
            <div>
              <div className={`font-bold tracking-wide ${overallOk ? "text-emerald-400" : "text-rose-400"}`}>
                {overallOk ? "All Systems Operational" : "Atenção: Anomalias Detectadas"}
              </div>
              <div className={`text-xs ${overallOk ? "text-emerald-500/70" : "text-rose-500/70"}`}>
                {data ? `Falha 2h: ${data.failedRate2h}% · Travados: ${data.stuckCount} · Pendentes: ${data.pendingCount}` : ""}
              </div>
            </div>
          </div>
          {data && (
            <div className="hidden sm:block text-right">
              <div className="text-xs font-mono text-zinc-500">
                {new Date(data.timestamp).toLocaleTimeString("pt-BR")}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest px-1">Janela de 2 horas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Completed */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-medium">Completadas</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-mono text-white">
                  {loading ? <span className="animate-pulse">…</span> : data?.recentWindow.completed ?? 0}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total no período</div>
              </div>
            </div>

            {/* Failure Rate */}
            <div className={`bg-[#0a0a0a] rounded-xl p-5 relative overflow-hidden border ${
              !data || data.failedRate2h < 10
                ? "border-white/5"
                : data.failedRate2h < 30
                ? "border-amber-500/20"
                : "border-rose-500/20"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-zinc-400" />
                  <span className="text-white font-medium">Taxa de Falha</span>
                </div>
                {!data || data.failedRate2h < 10
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : data.failedRate2h < 30
                  ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                  : <XCircle className="w-4 h-4 text-rose-500" />
                }
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className={`text-2xl font-mono ${loading ? "text-white" : data && data.failedRate2h > 30 ? "text-rose-400" : data && data.failedRate2h > 10 ? "text-amber-400" : "text-white"}`}>
                    {loading ? <span className="animate-pulse">…</span> : `${data?.failedRate2h ?? 0}%`}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Últimas 2h ({data?.recentWindow.total ?? 0} total)</div>
                </div>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-zinc-400" />
                  <span className="text-white font-medium">Fila PENDING</span>
                </div>
                {!data || data.pendingCount < 20
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <AlertTriangle className="w-4 h-4 text-amber-500" />
                }
              </div>
              <div className="text-2xl font-mono text-white">
                {loading ? <span className="animate-pulse">…</span> : data?.pendingCount ?? 0}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Aguardando processamento</div>
            </div>

            {/* Processing */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-zinc-400" />
                  <span className="text-white font-medium">Em Processamento</span>
                </div>
              </div>
              <div className="text-2xl font-mono text-white">
                {loading ? <span className="animate-pulse">…</span> : data?.processingCount ?? 0}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Status PROCESSING agora</div>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest px-1 mt-8">Queue &amp; Anomalias</h2>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl divide-y divide-white/5">
            <div className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
              <div>
                <div className="text-white font-medium text-sm">Stuck Jobs (FAL.ai)</div>
                <div className="text-xs text-zinc-500 mt-1">Gerações paradas em Processing &gt; 30 min</div>
              </div>
              <div className={`font-mono font-medium px-3 py-1 rounded-md text-sm ${
                !data || data.stuckCount === 0
                  ? "text-emerald-400 bg-emerald-400/10"
                  : data.stuckCount < 5
                  ? "text-amber-400 bg-amber-400/10"
                  : "text-rose-400 bg-rose-400/10"
              }`}>
                {loading ? "…" : `${data?.stuckCount ?? 0} stuck`}
              </div>
            </div>
            <div className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
              <div>
                <div className="text-white font-medium text-sm">Falharam nas últimas 2h</div>
                <div className="text-xs text-zinc-500 mt-1">Total de gerações com status FAILED no período</div>
              </div>
              <div className={`font-mono font-medium px-3 py-1 rounded-md text-sm ${
                !data || data.recentWindow.failed === 0
                  ? "text-emerald-400 bg-emerald-400/10"
                  : "text-rose-400 bg-rose-400/10"
              }`}>
                {loading ? "…" : data?.recentWindow.failed ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* Stuck Feed */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-2xl">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-medium text-white">Gerações Travadas</h2>
          </div>
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-1">
                  <div className="w-full h-3 bg-white/5 rounded" />
                  <div className="w-3/4 h-2 bg-white/5 rounded" />
                </div>
              ))
            ) : !data || data.stuckGenerations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" />
                <div className="text-sm text-zinc-400">Nenhuma geração travada</div>
                <div className="text-xs text-zinc-600 mt-1">Tudo saudável!</div>
              </div>
            ) : (
              data.stuckGenerations.map((g) => (
                <div key={g.id} className="relative pl-4 border-l border-amber-500/30">
                  <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500" />
                  <div className="text-xs text-zinc-500 font-mono mb-1">
                    {new Date(g.updatedAt).toLocaleTimeString("pt-BR")}
                  </div>
                  <div className="text-xs text-zinc-200 font-mono">{g.id.slice(0, 12)}…</div>
                  <div className="text-[10px] text-zinc-500">{g.user.email} · {g.model}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
