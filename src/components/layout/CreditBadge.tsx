"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { formatCredits } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PLAN_CREDITS } from "@/lib/plans";

export function CreditBadge() {
  const { credits, plan, isLoading, refreshCredits } = useCreditsStore();

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  if (isLoading) {
    return (
      <div className="px-3 py-2 rounded-lg bg-muted/50 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  const maxCredits = PLAN_CREDITS[plan] || 1;
  const percentage = Math.min((credits / maxCredits) * 100, 100);
  const planLabel: Record<string, string> = {
    FREE: "Free",
    ESSENTIAL: "Essential",
    PREMIUM: "Premium",
    PREMIUM_PLUS: "Premium+",
    PRO: "Pro",
  };

  return (
    <Link href="/pricing">
      <div className="px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Zap className="w-3 h-3 text-[var(--brand)]" />
            {planLabel[plan] ?? plan}
          </div>
          <span className="text-xs font-semibold text-foreground">
            {formatCredits(credits)} cr
          </span>
        </div>
        {plan !== "FREE" && <Progress value={percentage} className="h-1.5" />}
      </div>
    </Link>
  );
}
