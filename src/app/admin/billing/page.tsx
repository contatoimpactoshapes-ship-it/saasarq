"use client";

import { useEffect, useState } from "react";
import { CreditCard, Package, TrendingUp, RefreshCw, ExternalLink } from "lucide-react";

interface PackRevenue {
  allTime:    number;
  last30d:    number;
  last7d:     number;
  today:      number;
  count:      number;
  count30d:   number;
  count7d:    number;
  countToday: number;
}

interface Purchase {
  id:              string;
  userEmail:       string;
  userName:        string | null;
  userPlan:        string;
  packId:          string;
  packName:        string;
  creditsTotal:    number;
  amountPaidBRL:   number;
  stripeSessionId: string;
  createdAt:       string;
}

interface BillingData {
  mrr:             number;
  arr:             number;
  packRevenue:     PackRevenue;
  recentPurchases: Purchase[];
  note:            string;
  computedAt:      string;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const PLAN_BADGE: Record<string, string> = {
  FREE:         "text-zinc-400 bg-zinc-400/10",
  ESSENTIAL:    "text-blue-400 bg-blue-400/10",
  PREMIUM:      "text-violet-400 bg-violet-400/10",
  PREMIUM_PLUS: "text-purple-400 bg-purple-400/10",
  PRO:          "text-amber-400 bg-amber-400/10",
};

export default function BillingPage() {
  const [data,    setData]    = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Revenue</h1>
          <p className="text-zinc-400 text-sm mt-1">Pack purchases e estimativas de receita.</p>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 animate-pulse">
              <div className="w-24 h-3 bg-white/5 rounded mb-4" />
              <div className="w-32 h-7 bg-white/5 rounded mb-2" />
              <div className="w-20 h-2 bg-white/5 rounded" />
            </div>
          ))
        ) : data ? (
          <>
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium">Receita de Packs Hoje</span>
              </div>
              <div className="text-3xl font-bold text-white">{brl(data.packRevenue.today)}</div>
              <div className="mt-2 text-xs text-zinc-500">
                {data.packRevenue.countToday} venda{data.packRevenue.countToday !== 1 ? "s" : ""} hoje
                &nbsp;·&nbsp;{brl(data.packRevenue.last7d)} nos últimos 7 dias
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Packs Vendidos (30d)</span>
              </div>
              <div className="text-3xl font-bold text-white">{data.packRevenue.count30d}</div>
              <div className="mt-2 text-xs text-zinc-500">
                {brl(data.packRevenue.last30d)} em receita
                &nbsp;·&nbsp;{data.packRevenue.count} total histórico
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">MRR Estimado</span>
              </div>
              <div className="text-3xl font-bold text-white">{brl(data.mrr)}</div>
              <div className="mt-2 text-xs text-zinc-500">
                ARR {brl(data.arr)}&nbsp;·&nbsp;estimado por plano ativo
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Note about data limitations */}
      {data && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg px-4 py-2.5 text-xs text-amber-400/70">
          {data.note}
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Últimas Compras de Pack</h2>
          {data && (
            <span className="text-xs text-zinc-500">{data.recentPurchases.length} registros</span>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-white/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 animate-pulse flex items-center justify-between">
                <div className="space-y-2">
                  <div className="w-40 h-3 bg-white/5 rounded" />
                  <div className="w-64 h-2 bg-white/5 rounded" />
                </div>
                <div className="w-24 h-3 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : !data || data.recentPurchases.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-600 text-sm">Nenhuma compra registrada</div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.recentPurchases.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-200 text-sm">{p.packName}</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PLAN_BADGE[p.userPlan] ?? "text-zinc-400 bg-zinc-400/10"}`}>
                      {p.userPlan}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 truncate">
                    {p.userEmail}
                    &nbsp;·&nbsp;{p.creditsTotal.toLocaleString("pt-BR")} cr
                    &nbsp;·&nbsp;
                    <span className="font-mono text-zinc-600 text-[10px]">{p.stripeSessionId.slice(0, 20)}…</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-emerald-400">{brl(p.amountPaidBRL)}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">{fmtDate(p.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data && (
        <div className="text-[10px] text-zinc-600 font-mono text-right">
          Atualizado: {new Date(data.computedAt).toLocaleString("pt-BR")}
        </div>
      )}
    </div>
  );
}
