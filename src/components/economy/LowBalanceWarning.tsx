"use client";

import { AlertTriangle, Zap } from "lucide-react";
import { LOW_BALANCE_THRESHOLD_PCT } from "@/lib/economy";

interface Props {
  credits:         number;
  planAllocation:  number;
  onBuyPack?:      () => void;
}

export function LowBalanceWarning({ credits, planAllocation, onBuyPack }: Props) {
  const fraction = planAllocation > 0 ? credits / planAllocation : 0;
  if (fraction >= LOW_BALANCE_THRESHOLD_PCT) return null;

  const pct = Math.round(fraction * 100);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-lg text-sm">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="text-amber-200 flex-1">
        Saldo baixo — <span className="font-medium">{credits.toLocaleString()} créditos</span> restantes ({pct}% do plano)
      </span>
      {onBuyPack && (
        <button
          onClick={onBuyPack}
          className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
        >
          <Zap className="w-3 h-3" />
          Recarregar
        </button>
      )}
    </div>
  );
}
