"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Activity, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, Package, Zap, Shield, ShoppingCart,
} from "lucide-react";
import type { PlanFeatureFlags, CreditPack } from "@/lib/economy/pricing";
import type { ModelMarginSummary, UserMarginSummary } from "@/lib/economy/cost-engine";
import type { DailyCostRow, PackMetrics } from "@/lib/economy/margin-engine";

// ── Response shape ────────────────────────────────────────────────────────────

interface CreditValueRow {
  plan: string; name: string; priceMonthly: number; credits: number; brlPerCredit: number;
}

interface Platform {
  windowDays: number; totalGens: number;
  totalCostUSD: number; totalCostBRL: number;
  totalRevBRL: number; totalRevUSD: number;
  marginBRL: number; marginUSD: number;
  marginPct: number; roiPct: number;
  deficitUserCount: number;
}

interface EconomyData {
  platform:         Platform;
  modelMargins:     ModelMarginSummary[];
  deficitUsers:     UserMarginSummary[];
  dailyCosts:       DailyCostRow[];
  packMetrics:      PackMetrics;
  creditValueTable: CreditValueRow[];
  planFeatures:     Record<string, PlanFeatureFlags>;
  creditPacks:      CreditPack[];
  usdBrlRate:       number;
  computedAt:       string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtUSD(n: number, digits = 4) {
  return `$${n.toFixed(digits)}`;
}

const PLAN_ORDER = ["FREE", "ESSENTIAL", "PREMIUM", "PREMIUM_PLUS", "PRO"];

const FEATURE_LABELS: Record<keyof PlanFeatureFlags, string> = {
  videoGenerate: "Vídeo IA",
  audioGenerate: "Áudio IA",
  spaces:        "Spaces",
  inpaint:       "Inpainting",
  upscale:       "Upscale",
  creditPacks:   "Credit Packs",
  priorityQueue: "Fila Prioritária",
  soraAccess:    "Sora 2",
  premiumVideos: "Vídeos Premium",
};

function MarginBadge({ pct }: { pct: number }) {
  if (pct === -999) return <span className="text-zinc-600 text-[10px]">free</span>;
  const color = pct > 50 ? "text-emerald-400" : pct > 0 ? "text-amber-400" : "text-rose-400";
  return <span className={`font-mono text-xs font-bold ${color}`}>{pct.toFixed(1)}%</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EconomyPage() {
  const [data,    setData]    = useState<EconomyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/economy");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const p = data?.platform;
  const maxDailyCost = data?.dailyCosts.length
    ? Math.max(...data.dailyCosts.map((d) => d.costBRL), 0.01)
    : 1;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Credit Economy Engine</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Margem por modelo, usuários deficitários, ROI IA — janela de 30 dias.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white bg-white/5 border border-white/10 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">{error}</div>
      )}

      {/* ── Executive KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total AI Cost */}
        <div className="bg-[#0a0a0a] border border-rose-500/20 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3 text-rose-400">
            <span className="text-[10px] uppercase tracking-widest font-semibold">Custo IA (30d)</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loading ? <span className="animate-pulse text-zinc-600">…</span> : fmtBRL(p?.totalCostBRL ?? 0)}
          </div>
          <div className="mt-1 text-[10px] text-zinc-600 font-mono">
            {loading ? "" : fmtUSD(p?.totalCostUSD ?? 0, 2)} USD
          </div>
        </div>

        {/* Estimated Revenue */}
        <div className="bg-[#0a0a0a] border border-emerald-500/20 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3 text-emerald-400">
            <span className="text-[10px] uppercase tracking-widest font-semibold">Receita Est. (30d)</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {loading ? <span className="animate-pulse text-zinc-600">…</span> : fmtBRL(p?.totalRevBRL ?? 0)}
          </div>
          <div className="mt-1 text-[10px] text-zinc-600 font-mono">
            {loading ? "" : `${p?.totalGens?.toLocaleString("pt-BR") ?? 0} gerações`}
          </div>
        </div>

        {/* Gross Margin */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3 text-zinc-400">
            <span className="text-[10px] uppercase tracking-widest font-semibold">Margem Bruta</span>
            {loading ? null : (p?.marginBRL ?? 0) >= 0
              ? <TrendingUp className="w-4 h-4 text-emerald-400" />
              : <TrendingDown className="w-4 h-4 text-rose-400" />
            }
          </div>
          <div className={`text-2xl font-bold font-mono ${
            loading ? "text-zinc-600" :
            (p?.marginBRL ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}>
            {loading ? <span className="animate-pulse">…</span> : fmtBRL(p?.marginBRL ?? 0)}
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {loading ? "" : (
              <MarginBadge pct={p?.marginPct ?? -999} />
            )}
          </div>
        </div>

        {/* ROI */}
        <div className="bg-[#0a0a0a] border border-indigo-500/20 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3 text-indigo-400">
            <span className="text-[10px] uppercase tracking-widest font-semibold">ROI IA</span>
            <Zap className="w-4 h-4" />
          </div>
          <div className={`text-2xl font-bold font-mono ${
            loading ? "text-zinc-600" :
            (p?.roiPct ?? 0) >= 0 ? "text-indigo-400" : "text-rose-400"
          }`}>
            {loading ? <span className="animate-pulse">…</span> : `${(p?.roiPct ?? 0).toFixed(1)}%`}
          </div>
          <div className="mt-1 text-[10px] text-zinc-600">
            {loading ? "" : `${p?.deficitUserCount ?? 0} usuários deficitários`}
          </div>
        </div>
      </div>

      {/* ── Model Margins + Deficit Users ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Model Margins Table */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Margem por Modelo (30d)</h2>
            <span className="text-[10px] text-zinc-600 font-mono">custo API vs receita créditos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#050505] border-b border-white/5 text-[10px] uppercase text-zinc-600 font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3 text-right">Gens</th>
                  <th className="px-4 py-3 text-right">Custo/gen</th>
                  <th className="px-4 py-3 text-right">Receita/gen</th>
                  <th className="px-4 py-3 text-right">Margem BRL</th>
                  <th className="px-4 py-3 text-right">Margem %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-3 bg-white/5 rounded w-16" /></td>
                      ))}
                    </tr>
                  ))
                  : !data || data.modelMargins.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-sm">
                        Nenhuma geração completada nos últimos 30 dias
                      </td>
                    </tr>
                  )
                  : data.modelMargins.map((m, i) => (
                    <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${m.isDeficit ? "bg-rose-500/[0.02]" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {m.isDeficit
                            ? <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                            : <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          }
                          <span className="font-mono text-zinc-300 truncate max-w-[160px]">{m.model}</span>
                          <span className="text-[9px] text-zinc-600 uppercase">{m.provider}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-300 font-mono">{m.totalCount.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-right text-rose-400 font-mono">{fmtUSD(m.avgCostPerGen, 4)}</td>
                      <td className="px-4 py-3 text-right text-zinc-400 font-mono">R${m.avgRevPerGen.toFixed(4)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${m.marginBRL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {fmtBRL(m.marginBRL)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MarginBadge pct={m.marginPct} />
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Deficit Users */}
        <div className="bg-[#0a0a0a] border border-rose-500/20 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="px-5 py-4 border-b border-rose-500/10 flex items-center gap-2 bg-rose-500/5">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-medium text-rose-400">Usuários Deficitários</h2>
          </div>
          <div className="flex-1 divide-y divide-white/5 overflow-y-auto max-h-[420px]">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse space-y-2">
                  <div className="w-3/4 h-3 bg-white/5 rounded" />
                  <div className="w-1/2 h-2 bg-white/5 rounded" />
                </div>
              ))
              : !data || data.deficitUsers.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" />
                  <div className="text-sm text-zinc-400">Nenhum usuário deficitário</div>
                  <div className="text-xs text-zinc-600 mt-1">Plataforma lucrativa</div>
                </div>
              )
              : data.deficitUsers.map((u, i) => (
                <div key={i} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-zinc-200 font-medium truncate max-w-[150px]">{u.email}</span>
                    <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                      {u.plan}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-600">{u.totalGens} gens</span>
                    <span className="text-rose-400 font-mono font-semibold">{fmtBRL(u.marginBRL)}</span>
                  </div>
                  <div className="mt-1.5 w-full bg-white/5 rounded-full h-1">
                    <div
                      className="bg-rose-500/60 h-1 rounded-full"
                      style={{ width: `${Math.min(100, Math.abs(u.marginPct === -999 ? 100 : u.marginPct))}%` }}
                    />
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* ── Daily Cost + Credit Value Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Daily cost (7 days) */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-sm font-medium text-white">Custo Diário — Últimos 7 dias</h2>
          </div>
          <div className="p-6 space-y-3">
            {loading
              ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-20 h-3 bg-white/5 rounded" />
                  <div className="flex-1 h-3 bg-white/5 rounded" />
                  <div className="w-16 h-3 bg-white/5 rounded" />
                </div>
              ))
              : !data || data.dailyCosts.length === 0
              ? <div className="text-center text-zinc-600 text-sm py-6">Sem dados no período</div>
              : data.dailyCosts.map((row, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-500 font-mono w-24 shrink-0">{row.day}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-rose-500/60 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(2, (row.costBRL / maxDailyCost) * 100)}%` }}
                    />
                  </div>
                  <div className="text-right w-24 shrink-0">
                    <span className="text-zinc-300 font-mono">{fmtBRL(row.costBRL)}</span>
                    <span className="text-zinc-600 ml-1">({row.genCount})</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Credit value per plan */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-sm font-medium text-white">Valor do Crédito por Plano</h2>
          </div>
          <div className="divide-y divide-white/5">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex justify-between">
                  <div className="w-24 h-3 bg-white/5 rounded" />
                  <div className="w-16 h-3 bg-white/5 rounded" />
                </div>
              ))
              : data?.creditValueTable.map((row) => (
                <div key={row.plan} className="px-6 py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-200 font-medium">{row.name}</span>
                    <span className="text-zinc-600 ml-2 font-mono">
                      R${row.priceMonthly}/mês · {row.credits.toLocaleString("pt-BR")} créditos
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-300 font-mono">
                      {row.brlPerCredit === 0
                        ? <span className="text-zinc-600">—</span>
                        : `R$ ${row.brlPerCredit.toFixed(6)}/cr`
                      }
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* ── Credit Packs ── */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-medium text-white">Credit Packs — Arquitetura de Receita Adicional</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 animate-pulse space-y-3">
                <div className="h-4 bg-white/5 rounded w-20" />
                <div className="h-6 bg-white/5 rounded w-16" />
                <div className="h-3 bg-white/5 rounded w-24" />
              </div>
            ))
            : data?.creditPacks.map((pack) => {
              // Margin: AI cost to serve pack credits ≈ credits × avg cost per credit
              // Using ESSENTIAL rate (R$0.00125/credit) as proxy cost floor
              const estAICostBRL  = pack.credits * 0.001; // ~1 BRL per 1000 credits
              const packMarginBRL = pack.priceBRL - estAICostBRL;
              const packMarginPct = (packMarginBRL / pack.priceBRL) * 100;

              return (
                <div key={pack.id} className="p-6 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white">{pack.name}</span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest">
                      {pack.minPlan}+
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono mb-1">
                    R${pack.priceBRL}
                  </div>
                  <div className="text-xs text-zinc-500 mb-3">
                    {pack.credits.toLocaleString("pt-BR")} créditos
                    {pack.bonus > 0 && (
                      <span className="text-emerald-500 ml-1">+{pack.bonus.toLocaleString("pt-BR")} bônus</span>
                    )}
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between text-zinc-600">
                      <span>Custo IA est.</span>
                      <span className="text-rose-400 font-mono">~R${estAICostBRL.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>Margem</span>
                      <span className="text-emerald-400 font-mono">{packMarginPct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* ── Pack Revenue ── */}
      <div className="bg-[#0a0a0a] border border-indigo-500/20 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-indigo-500/10 flex items-center gap-2 bg-indigo-500/5">
          <ShoppingCart className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-medium text-indigo-300">Pack Revenue — Recargas</h2>
          <span className="ml-auto text-[10px] text-indigo-500 font-mono">histórico completo</span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-white/5 border-b border-white/5">
          {[
            {
              label: "Total Vendas",
              value: loading ? "…" : (data?.packMetrics.totalPurchases ?? 0).toString(),
              sub:   loading ? "" : `${data?.packMetrics.last30DayCount ?? 0} últimos 30d`,
              color: "text-indigo-400",
            },
            {
              label: "Receita Total",
              value: loading ? "…" : fmtBRL(data?.packMetrics.totalRevenueBRL ?? 0),
              sub:   loading ? "" : `${fmtBRL(data?.packMetrics.last30DayRevBRL ?? 0)} (30d)`,
              color: "text-emerald-400",
            },
            {
              label: "Créditos Vendidos",
              value: loading ? "…" : (data?.packMetrics.totalCreditsAdded ?? 0).toLocaleString("pt-BR"),
              sub:   "histórico total",
              color: "text-zinc-300",
            },
            {
              label: "Receita Média",
              value: loading ? "…" : (
                (data?.packMetrics.totalPurchases ?? 0) > 0
                  ? fmtBRL((data!.packMetrics.totalRevenueBRL) / data!.packMetrics.totalPurchases)
                  : "—"
              ),
              sub:   "por compra",
              color: "text-amber-400",
            },
            {
              label: "30d vs Total",
              value: loading ? "…" : (
                (data?.packMetrics.totalPurchases ?? 0) > 0
                  ? `${Math.round(((data?.packMetrics.last30DayCount ?? 0) / data!.packMetrics.totalPurchases) * 100)}%`
                  : "—"
              ),
              sub:   "das vendas",
              color: "text-zinc-400",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="p-5">
              <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">{kpi.label}</div>
              <div className={`text-xl font-bold font-mono ${loading ? "text-zinc-600 animate-pulse" : kpi.color}`}>
                {kpi.value}
              </div>
              <div className="text-[10px] text-zinc-600 mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Per-pack breakdown */}
        {!loading && data && Object.keys(data.packMetrics.byPack).length > 0 && (
          <div className="px-6 py-4 border-b border-white/5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-3">Por Pack</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.values(data.packMetrics.byPack).map((entry) => {
                const pack = data.creditPacks.find((p) => p.id === entry.packId);
                return (
                  <div key={entry.packId} className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
                    <p className="text-xs font-semibold text-zinc-300 mb-1">{pack?.name ?? entry.packId}</p>
                    <div className="flex items-baseline gap-1 mb-0.5">
                      <span className="text-lg font-bold font-mono text-emerald-400">{fmtBRL(entry.revenueBRL)}</span>
                    </div>
                    <p className="text-[10px] text-zinc-600">{entry.count} vendas · {entry.totalCredits.toLocaleString("pt-BR")} cr</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent purchases */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-white/5 text-[10px] uppercase text-zinc-600 font-semibold tracking-wider bg-[#050505]">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Pack</th>
                <th className="px-4 py-3 text-right">Créditos</th>
                <th className="px-4 py-3 text-right">Bônus</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-white/5 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
                : !data || data.packMetrics.recentPurchases.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-sm">
                      Nenhuma compra de pack ainda
                    </td>
                  </tr>
                )
                : data.packMetrics.recentPurchases.map((p) => {
                  const pack = data.creditPacks.find((c) => c.id === p.packId);
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-zinc-300 font-mono text-[10px] max-w-[160px] truncate">
                        {p.userEmail ?? p.userId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {pack?.name ?? p.packId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">
                        {p.creditsAdded.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-500">
                        {p.bonusCredits > 0 ? `+${p.bonusCredits.toLocaleString("pt-BR")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                        {fmtBRL(p.amountPaidBRL)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 font-mono text-[10px]">
                        {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Feature Flags Matrix ── */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-medium text-white">Feature Flags por Plano</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">Feature</th>
                {PLAN_ORDER.map((plan) => (
                  <th key={plan} className="px-4 py-3 text-center text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                    {plan.replace("_", "+")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading
                ? Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-3"><div className="h-3 bg-white/5 rounded w-24" /></td>
                    {PLAN_ORDER.map((p) => (
                      <td key={p} className="px-4 py-3 text-center"><div className="h-4 w-4 bg-white/5 rounded-full mx-auto" /></td>
                    ))}
                  </tr>
                ))
                : data && Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <tr key={key} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-zinc-400 font-medium">{label}</td>
                    {PLAN_ORDER.map((plan) => {
                      const enabled = data.planFeatures[plan]?.[key as keyof PlanFeatureFlags] ?? false;
                      return (
                        <td key={plan} className="px-4 py-3 text-center">
                          {enabled
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            : <XCircle className="w-4 h-4 text-zinc-700 mx-auto" />
                          }
                        </td>
                      );
                    })}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {data && (
        <div className="text-[10px] text-zinc-600 font-mono text-right">
          Atualizado: {new Date(data.computedAt).toLocaleString("pt-BR")} · USD/BRL: {data.usdBrlRate}
        </div>
      )}
    </div>
  );
}
