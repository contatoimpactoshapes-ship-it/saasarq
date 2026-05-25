"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Zap, Check, Star, ArrowRight, TrendingUp, Shield, Clock } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { CREDIT_PACKS, meetsMinPlan, PLAN_ORDER } from "@/lib/economy";
import { PLAN_CREDITS, PLAN_LABELS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

function CreditsPageInner() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const { credits, plan, refreshCredits } = useCreditsStore();
  const [buying, setBuying] = useState<string | null>(null);

  const planAllocation = PLAN_CREDITS[plan as PlanId] ?? 0;
  const pctUsed        = planAllocation > 0 ? Math.max(0, 1 - credits / planAllocation) : 0;

  // Handle post-purchase redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      refreshCredits();
    }
  }, [searchParams, refreshCredits]);

  async function handleBuy(packId: string) {
    setBuying(packId);
    try {
      const res  = await fetch("/api/checkout/pack", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ packId }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erro ao iniciar checkout");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      alert(msg);
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-secondary)]">
      <TopBar breadcrumb={[{ label: "Início", href: "/app" }, { label: "Créditos" }]} />

      <div className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full space-y-8">

        {/* ── Success banner ──────────────────────────────────────────────── */}
        {searchParams.get("success") === "true" && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <Check className="w-4 h-4 shrink-0" />
            <span>Compra concluída! Seus créditos serão adicionados em instantes.</span>
          </div>
        )}

        {/* ── Balance card ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-[var(--border-default)] rounded-2xl p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                Saldo atual · {PLAN_LABELS[plan as PlanId] ?? plan}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[var(--text-primary)] tabular-nums">
                  {credits.toLocaleString("pt-BR")}
                </span>
                <span className="text-sm text-[var(--text-muted)] font-medium">créditos</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/pricing")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-[var(--border-default)] rounded-full hover:border-[var(--text-muted)] transition-colors text-[var(--text-secondary)]"
              >
                Ver planos
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {planAllocation > 0 && (
            <div className="mt-5 space-y-1.5">
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Consumidos no ciclo</span>
                <span>{Math.round(pctUsed * 100)}% de {planAllocation.toLocaleString("pt-BR")} cr/mês</span>
              </div>
              <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    pctUsed > 0.8 ? "bg-rose-400" : pctUsed > 0.6 ? "bg-amber-400" : "bg-[var(--color-brand)]"
                  )}
                  style={{ width: `${Math.min(pctUsed * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Value props ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, label: "1000 cr = R$39",   sub: "Taxa de varejo oficial" },
            { icon: Shield,     label: "Créditos extras",  sub: "Sem perder o plano" },
            { icon: Clock,      label: "Sem expiração",    sub: "Válido enquanto assinar" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-white border border-[var(--border-default)] rounded-xl p-4 text-center">
              <Icon className="w-5 h-5 mx-auto mb-2 text-[var(--color-brand)]" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Pack grid ────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
            Packs de créditos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CREDIT_PACKS.map((pack) => {
              const planIdx       = PLAN_ORDER.indexOf(plan as PlanId);
              const minPlanIdx    = PLAN_ORDER.indexOf(pack.minPlan as PlanId);
              const isLocked      = planIdx < minPlanIdx;
              const isBuying      = buying === pack.id;
              const totalCredits  = pack.credits + pack.bonus;
              const isBestValue   = pack.id === "pack-power";
              const isMostPopular = pack.id === "pack-boost";

              return (
                <div
                  key={pack.id}
                  className={cn(
                    "relative bg-white border rounded-2xl p-5 shadow-[var(--shadow-card)] transition-all",
                    isBestValue
                      ? "border-[var(--color-brand)] ring-1 ring-[var(--color-brand)]/20"
                      : "border-[var(--border-default)]",
                    isLocked && "opacity-60"
                  )}
                >
                  {/* Badge */}
                  {isBestValue && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--color-brand)] text-white text-[10px] font-bold shadow-sm whitespace-nowrap">
                        <Star className="w-3 h-3" />
                        Melhor valor
                      </span>
                    </div>
                  )}
                  {isMostPopular && !isBestValue && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-zinc-800 text-white text-[10px] font-bold shadow-sm whitespace-nowrap">
                        Mais popular
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)] text-base">{pack.name}</h3>
                      {isLocked && (
                        <span className="text-[10px] text-amber-600 font-medium">
                          Requer {PLAN_LABELS[pack.minPlan as PlanId]}+
                        </span>
                      )}
                    </div>
                    {pack.discountPct > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-semibold">
                        -{pack.discountPct}%
                      </span>
                    )}
                  </div>

                  {/* Credits display */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                        {pack.credits.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">cr</span>
                    </div>
                    {pack.bonus > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                          <Zap className="w-3 h-3 text-emerald-500" />
                          <span className="text-[11px] text-emerald-600 font-semibold">
                            +{pack.bonus.toLocaleString("pt-BR")} bônus
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          = {totalCredits.toLocaleString("pt-BR")} total
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-1.5 mb-5 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>R${pack.brlPer1k.toFixed(1)}/1000 cr (vs R$39 varejo)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Válido em todos os modelos do plano</span>
                    </div>
                    {pack.bonus > 0 && (
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{pack.bonus.toLocaleString("pt-BR")} créditos bônus grátis</span>
                      </div>
                    )}
                  </div>

                  {/* Price + CTA */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-2xl font-bold text-[var(--text-primary)]">
                        R${pack.priceBRL.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-1">uma vez</span>
                    </div>
                    {isLocked ? (
                      <button
                        onClick={() => router.push("/pricing")}
                        className="flex-1 max-w-[140px] h-9 px-4 text-xs font-semibold rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        Fazer upgrade
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuy(pack.id)}
                        disabled={isBuying}
                        className={cn(
                          "flex-1 max-w-[140px] h-9 px-4 text-xs font-semibold rounded-xl transition-all",
                          isBestValue
                            ? "brand-gradient text-white hover:opacity-90"
                            : "bg-[var(--text-primary)] text-white hover:opacity-85",
                          isBuying && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        {isBuying ? "Abrindo…" : "Comprar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Enterprise note ──────────────────────────────────────────────── */}
        <div className="bg-white border border-[var(--border-default)] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
              Precisa de volume maior?
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Pack Enterprise: 50.000 + 10.000 bônus por R$1.490 (R$29.8/1k cr, -24%)
            </p>
          </div>
          <button
            onClick={() => handleBuy("pack-enterprise")}
            disabled={!meetsMinPlan(plan, "PRO" as PlanId) || buying === "pack-enterprise"}
            className={cn(
              "shrink-0 h-9 px-5 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap",
              meetsMinPlan(plan, "PRO" as PlanId)
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white hover:opacity-85"
                : "border-[var(--border-default)] text-[var(--text-muted)] cursor-not-allowed",
            )}
          >
            {buying === "pack-enterprise" ? "Abrindo…" : "Adquirir Enterprise"}
          </button>
        </div>

        {/* ── Rate card ────────────────────────────────────────────────────── */}
        <div className="text-center pb-4">
          <p className="text-[11px] text-[var(--text-muted)]">
            Créditos do assinante têm taxa mais vantajosa que a de varejo (R$39/1k).
            Packs são complementares ao plano e não substituem a assinatura mensal.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CreditsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreditsPageInner />
    </Suspense>
  );
}
