"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, ArrowLeft, Infinity } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(planId: string) {
    if (planId === "FREE") return;
    setLoading(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billing: annual ? "annual" : "monthly" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Erro ao iniciar checkout");
      }
    } catch {
      toast.error("Erro ao processar pagamento");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Back */}
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao app
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/5 text-[var(--color-brand)] text-sm font-medium">
            <Zap className="w-3.5 h-3.5" />
            Planos e Preços
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
            Escolha seu plano
          </h1>
          <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto">
            Crie com IA de alta qualidade. Cancele quando quiser.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={cn("text-sm font-medium", !annual ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
            Mensal
          </span>
          <button
            onClick={() => setAnnual((v) => !v)}
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors",
              annual ? "bg-[var(--color-brand)]" : "bg-[var(--border-default)]"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
              annual ? "translate-x-6" : "translate-x-0.5"
            )} />
          </button>
          <span className={cn("text-sm font-medium", annual ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
            Anual
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
              -25%
            </span>
          </span>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PLANS.map((plan, i) => {
            const price = annual ? plan.priceAnnual : plan.priceMonthly;
            const isHighlighted = plan.highlighted;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-5",
                  isHighlighted
                    ? "border-[var(--color-brand)] shadow-[0_0_0_1px_var(--color-brand),0_8px_32px_rgba(79,105,242,0.12)] bg-white"
                    : "border-[var(--border-default)] bg-white"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full brand-gradient text-white whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Name + description */}
                <div className="mb-4">
                  <h3 className="font-bold text-base text-[var(--text-primary)]">{plan.name}</h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {plan.priceMonthly === 0 ? (
                    <p className="text-2xl font-bold text-[var(--text-primary)]">Grátis</p>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-bold text-[var(--text-primary)]">
                          R${price.toFixed(0)}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] mb-1">/mês</span>
                      </div>
                      {annual && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          R${(price * 12).toFixed(0)} cobrado anualmente
                        </p>
                      )}
                    </>
                  )}
                  {plan.credits > 0 && (
                    <p className="text-[var(--color-brand)] text-xs font-semibold mt-1">
                      {plan.credits.toLocaleString("pt-BR")} cr/mês
                    </p>
                  )}
                </div>

                {/* Unlimited models */}
                {plan.unlimitedModels && plan.unlimitedModels.length > 0 && (
                  <div className="mb-3 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Infinity className="w-3 h-3 text-[var(--color-brand)]" />
                      <span className="text-[10px] font-bold text-[var(--color-brand)] uppercase tracking-wide">
                        Ilimitado em {plan.unlimitedModels.length} modelos
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Gere sem se preocupar com créditos
                    </p>
                  </div>
                )}

                {/* Features */}
                <ul className="space-y-1.5 flex-1 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-[var(--text-muted)] leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id || plan.id === "FREE"}
                  className={cn(
                    "w-full h-9 rounded-xl text-sm font-semibold transition-all",
                    plan.id === "FREE"
                      ? "bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-default"
                      : isHighlighted
                      ? "brand-gradient text-white hover:opacity-90 active:scale-[0.99]"
                      : "border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] bg-white",
                    loading === plan.id && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {loading === plan.id
                    ? "Processando..."
                    : plan.id === "FREE"
                    ? "Plano gratuito"
                    : "Assinar agora"}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-[var(--text-muted)] text-xs mt-8">
          Pagamento seguro via Stripe · Cancele a qualquer momento · Sem taxas ocultas
        </p>
      </div>
    </div>
  );
}
