"use client";

import Link from "next/link";
import { ChevronRight, Zap } from "lucide-react";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { PromoBanner } from "./PromoBanner";
import { PLAN_LABELS } from "@/lib/plans";

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
        <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-full px-3 py-1">
          <Zap className="w-3 h-3 text-[var(--color-brand)]" />
          <span className="font-semibold text-[var(--text-primary)]">
            {credits.toLocaleString("pt-BR")}
          </span>
          <span>cr</span>
        </div>
        {plan === "FREE" || plan === "ESSENTIAL" ? (
          <Link href="/pricing">
            <button className="h-7 px-3 text-xs font-semibold rounded-full brand-gradient text-white hover:opacity-90 transition-opacity whitespace-nowrap">
              Fazer upgrade
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
