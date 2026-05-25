"use client";

import { Lock } from "lucide-react";

interface Props {
  minPlan:    string;
  onUpgrade?: () => void;
  className?: string;
}

const PLAN_LABELS: Record<string, string> = {
  ESSENTIAL:    "Essential",
  PREMIUM:      "Premium",
  PREMIUM_PLUS: "Premium+",
  PRO:          "Pro",
};

export function PremiumLockBadge({ minPlan, onUpgrade, className = "" }: Props) {
  const label = PLAN_LABELS[minPlan] ?? minPlan;

  return (
    <div
      className={`absolute inset-0 rounded-lg flex items-center justify-center bg-black/60 backdrop-blur-[2px] z-10 ${className}`}
      onClick={(e) => { e.stopPropagation(); onUpgrade?.(); }}
    >
      <div className="flex flex-col items-center gap-1.5 text-center px-3">
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
          <Lock className="w-4 h-4 text-zinc-400" />
        </div>
        <span className="text-[11px] font-medium text-white/80">
          Plano {label}+
        </span>
        {onUpgrade && (
          <button className="text-[10px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">
            Fazer upgrade
          </button>
        )}
      </div>
    </div>
  );
}
