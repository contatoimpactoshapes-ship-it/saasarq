"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Users, CreditCard, RefreshCw } from "lucide-react";

interface RevenueData {
  mrr:              number;
  arr:              number;
  totalUsers:       number;
  paidUsers:        number;
  freeUsers:        number;
  conversionRate:   number;
  usersByPlan:      Record<string, number>;
  creditsIssued30d: number;
  creditsIssued7d:  number;
  purchaseCount30d: number;
  purchaseCount7d:  number;
  transactionTypes: { purchase: number; debit: number; refund: number; bonus: number };
  dataNote:         string;
  computedAt:       string;
}

function fmtBRL(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PLAN_COLORS: Record<string, string> = {
  PRO:          "bg-indigo-500",
  PREMIUM_PLUS: "bg-violet-500",
  PREMIUM:      "bg-purple-500",
  ESSENTIAL:    "bg-emerald-500",
  FREE:         "bg-zinc-600",
};

export default function RevenuePage() {
  const [data,    setData]    = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/revenue");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const arpu = data && data.paidUsers > 0 ? data.mrr / data.paidUsers : 0;

  const totalPlanUsers = data
    ? Object.values(data.usersByPlan).reduce((s, v) => s + v, 0)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Revenue &amp; Billing Analytics</h1>
          <p className="text-zinc-500 text-sm mt-1">MRR, ARR, conversão e créditos.</p>
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
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MRR",           value: loading ? "…" : fmtBRL(data?.mrr ?? 0),          icon: DollarSign, note: "estimado",             color: "" },
          { label: "ARR",           value: loading ? "…" : fmtBRL(data?.arr ?? 0),           icon: TrendingUp, note: "MRR × 12",             color: "" },
          { label: "Conversão",     value: loading ? "…" : `${data?.conversionRate ?? 0}%`,  icon: Users,      note: "usuários pagantes",     color: "" },
          { label: "ARPU",          value: loading ? "…" : fmtBRL(arpu),                     icon: CreditCard, note: "receita por pagante",   color: "" },
        ].map((card, i) => (
          <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 text-zinc-400">
              <span className="text-xs uppercase tracking-wider font-semibold">{card.label}</span>
              <card.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{card.value}</div>
            <div className="mt-2 text-xs text-zinc-500">{card.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Créditos & Compras */}
        <div className="xl:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Atividade de Créditos</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-white/5 rounded" />)}
              </div>
            ) : data ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Créditos Emitidos 30d</div>
                    <div className="text-xl font-bold text-white font-mono">{data.creditsIssued30d.toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-zinc-600 mt-1">{data.purchaseCount30d} compras</div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Créditos Emitidos 7d</div>
                    <div className="text-xl font-bold text-white font-mono">{data.creditsIssued7d.toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-zinc-600 mt-1">{data.purchaseCount7d} compras</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Transações por Tipo</div>
                  {Object.entries(data.transactionTypes).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400 capitalize">{type}</span>
                      <span className="text-white font-mono font-medium">{count.toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Distribuição de planos */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-xl shadow-2xl flex flex-col">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-sm font-medium text-white">Distribuição de Planos</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-between mb-1">
                    <div className="w-20 h-3 bg-white/5 rounded" />
                    <div className="w-12 h-3 bg-white/5 rounded" />
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full" />
                </div>
              ))
            ) : data ? (
              Object.entries(data.usersByPlan)
                .sort(([, a], [, b]) => b - a)
                .map(([plan, count]) => {
                  const pct = totalPlanUsers > 0 ? Math.round((count / totalPlanUsers) * 100) : 0;
                  return (
                    <div key={plan}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-zinc-300">{plan}</span>
                        <span className="text-white font-mono">{count} <span className="text-zinc-600">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div
                          className={`${PLAN_COLORS[plan] ?? "bg-zinc-500"} h-1.5 rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : null}
            {data && (
              <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-zinc-500">
                <TrendingDown className="w-3 h-3 inline mr-1 text-zinc-600" />
                {data.dataNote}
              </div>
            )}
          </div>
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
