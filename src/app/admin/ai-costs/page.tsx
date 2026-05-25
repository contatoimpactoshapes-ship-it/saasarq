"use client";

import { useEffect, useState } from "react";
import { Activity, Server, AlertOctagon, RefreshCw, TrendingUp } from "lucide-react";

interface CostRow {
  model:    string;
  tool:     string;
  provider: string;
  count:    number;
  costUSD:  number;
  costBRL:  number;
}

interface CostWindow {
  totalUSD: number;
  totalBRL: number;
  byModel:  CostRow[];
}

interface TopUser {
  userId:         string;
  email:          string;
  plan:           string;
  creditsUsed24h: number;
}

interface CostsData {
  costs24h:             CostWindow;
  costs7d:              CostWindow;
  costs30d:             CostWindow;
  topExpensiveUsers24h: TopUser[];
  usdBrlRate:           number;
  costNote:             string;
  computedAt:           string;
}

type Window = "24h" | "7d" | "30d";

export default function AiCostsPage() {
  const [data,    setData]    = useState<CostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [win,     setWin]     = useState<Window>("30d");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/costs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const current: CostWindow | null = data
    ? win === "24h" ? data.costs24h : win === "7d" ? data.costs7d : data.costs30d
    : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Costs &amp; Margins</h1>
          <p className="text-zinc-500 text-sm mt-1">Custo estimado por modelo e usuários de maior impacto.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={win}
            onChange={(e) => setWin(e.target.value as Window)}
            className="bg-[#050505] border border-white/10 rounded-md text-sm text-zinc-300 px-3 py-1.5 outline-none focus:border-indigo-500/50"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="bg-[#050505] border border-white/10 rounded-md p-1.5 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">{error}</div>
      )}

      {/* Executive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 text-zinc-400">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Cost (USD)</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {loading ? <span className="animate-pulse text-zinc-600">…</span> : `$${current?.totalUSD.toFixed(2) ?? "0.00"}`}
          </div>
          <div className="mt-2 text-xs text-zinc-500">{win}</div>
        </div>

        <div className="bg-[#0a0a0a] border border-indigo-500/20 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-4 text-indigo-400">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Cost (BRL)</span>
            <Server className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {loading ? <span className="animate-pulse text-zinc-600">…</span> : `R$${current?.totalBRL.toFixed(2) ?? "0.00"}`}
          </div>
          <div className="text-[10px] text-zinc-500 mt-2">
            Taxa: {data ? `1 USD = R$ ${data.usdBrlRate}` : ""}
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 text-zinc-400">
            <span className="text-xs uppercase tracking-wider font-semibold">Modelos Ativos</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {loading ? <span className="animate-pulse text-zinc-600">…</span> : current?.byModel.length ?? 0}
          </div>
          <div className="mt-2 text-xs text-zinc-500">com gerações completadas</div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 text-zinc-400">
            <span className="text-xs uppercase tracking-wider font-semibold">Modelo Top Custo</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono truncate">
            {loading ? <span className="animate-pulse text-zinc-600">…</span> : (current?.byModel[0]?.model ?? "—")}
          </div>
          <div className="mt-2 text-xs text-rose-400">
            {loading ? "" : current?.byModel[0] ? `$${current.byModel[0].costUSD.toFixed(4)}` : ""}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost by Model Table */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Custo por Modelo ({win})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#050505] border-b border-white/5 text-[10px] uppercase text-zinc-600 font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3">Modelo</th>
                  <th className="px-5 py-3">Tool</th>
                  <th className="px-5 py-3 text-right">Gerações</th>
                  <th className="px-5 py-3 text-right">USD</th>
                  <th className="px-5 py-3 text-right">BRL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-5 py-3"><div className="h-3 bg-white/5 rounded w-16" /></td>
                      ))}
                    </tr>
                  ))
                  : !current || current.byModel.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-zinc-600 text-sm">
                        Nenhuma geração completada no período
                      </td>
                    </tr>
                  )
                  : current.byModel.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 font-mono text-zinc-300 max-w-[180px] truncate">{row.model}</td>
                      <td className="px-5 py-3 text-zinc-500">{row.tool}</td>
                      <td className="px-5 py-3 text-right text-zinc-300 font-mono">{row.count}</td>
                      <td className="px-5 py-3 text-right text-rose-400 font-mono">${row.costUSD.toFixed(4)}</td>
                      <td className="px-5 py-3 text-right text-zinc-400 font-mono">R${row.costBRL.toFixed(2)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Expensive Users */}
        <div className="bg-[#0a0a0a] border border-rose-500/20 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="px-5 py-4 border-b border-rose-500/10 flex items-center gap-2 bg-rose-500/5">
            <AlertOctagon className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-medium text-rose-500">Top Consumidores 24h</h2>
          </div>
          <div className="divide-y divide-white/5 flex-1 overflow-y-auto">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-5 animate-pulse space-y-2">
                  <div className="w-3/4 h-3 bg-white/5 rounded" />
                  <div className="w-1/2 h-2 bg-white/5 rounded" />
                </div>
              ))
              : !data || data.topExpensiveUsers24h.length === 0
              ? (
                <div className="p-5 text-center text-zinc-600 text-sm py-8">
                  Sem dados nas últimas 24h
                </div>
              )
              : data.topExpensiveUsers24h.map((u, i) => (
                <div key={i} className="p-5 hover:bg-white/[0.02]">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-zinc-200 font-medium truncate max-w-[140px]">{u.email}</div>
                    <div className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 shrink-0 ml-2">{u.plan}</div>
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    Créditos: <span className="text-zinc-300">{u.creditsUsed24h.toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              ))
            }
          </div>
          {data && (
            <div className="px-5 py-3 border-t border-white/5 text-[10px] text-zinc-600">
              {data.costNote}
            </div>
          )}
        </div>
      </div>

      {data && (
        <div className="text-[10px] text-zinc-600 font-mono text-right">
          Atualizado: {new Date(data.computedAt).toLocaleString("pt-BR")}
        </div>
      )}
    </div>
  );
}
