"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { useCreditsStore } from "@/stores/useCreditsStore";

export function CreditsBadge() {
  const { credits, refreshCredits } = useCreditsStore();

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  return (
    <Link href="/pricing">
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] rounded-full px-3 py-1.5 cursor-pointer transition-colors">
        <Zap className="w-3 h-3 text-[var(--color-brand)]" />
        <span className="font-semibold text-[var(--text-primary)]">
          {credits.toLocaleString("pt-BR")}
        </span>
        <span>créditos</span>
      </div>
    </Link>
  );
}
