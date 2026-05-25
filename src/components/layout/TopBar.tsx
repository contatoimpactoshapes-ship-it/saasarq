"use client";

import Link from "next/link";
import { ChevronRight, Zap, AlertTriangle } from "lucide-react";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { PromoBanner } from "./PromoBanner";
import { PLAN_LABELS, PLAN_CREDITS } from "@/lib/plans";
import { LOW_BALANCE_THRESHOLD_PCT } from "@/lib/economy";

interface Crumb {
  label: string;
  href?: string;
}

interface TopBarProps {
  breadcrumb?: Crumb[];
  showBanner?: boolean;
}

export function TopBar({ breadcrumb = [], showBanner = true }: TopBarProps) {
  const { credits, plan } = useCreditsStore();

  const planAllocation = PLAN_CREDITS[plan as keyof typeof PLAN_CREDITS] ?? 0;
  const isLowBalance   = plan !== "FREE" && planAllocation > 0
    && (credits / planAllocation) < LOW_BALANCE_THRESHOLD_PCT;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[var(--border-subtle)] h-12 flex items-center px-4 gap-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-[var(--text-muted)] shrink-0">
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-[var(--text-primary)] transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-[var(--text-primary)] font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Promo banner — centro */}
      {showBanner && (
        <div className="flex-1 flex justify-center">
          <PromoBanner />
        </div>
      )}

      {/* Actions — direita */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <Link href="/app/credits">
          <div className={`hidden sm:flex items-center gap-1 text-xs rounded-full px-3 py-1 transition-colors ${
            isLowBalance
              ? "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
              : "bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
          }`}>
            {isLowBalance
              ? <AlertTriangle className="w-3 h-3 text-amber-500" />
              : <Zap className="w-3 h-3 text-[var(--color-brand)]" />
            }
            <span className={`font-semibold ${isLowBalance ? "text-amber-700" : "text-[var(--text-primary)]"}`}>
              {credits.toLocaleString("pt-BR")}
            </span>
            <span>cr</span>
          </div>
        </Link>
        {plan === "FREE" || plan === "ESSENTIAL" ? (
          <Link href="/pricing">
            <button className="h-7 px-3 text-xs font-semibold rounded-full brand-gradient text-white hover:opacity-90 transition-opacity whitespace-nowrap">
              Fazer upgrade
            </button>
          </Link>
        ) : isLowBalance ? (
          <Link href="/app/credits">
            <button className="h-7 px-3 text-xs font-semibold rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-colors whitespace-nowrap">
              Recarregar
            </button>
          </Link>
        ) : (
          <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-full">
            {PLAN_LABELS[plan as keyof typeof PLAN_LABELS]}
          </span>
        )}
      </div>
    </header>
  );
}
