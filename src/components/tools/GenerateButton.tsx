"use client";

import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  creditsCost: number;
  hasEnoughCredits: boolean;
  disabled?: boolean;
}

export function GenerateButton({
  onClick,
  isGenerating,
  creditsCost,
  hasEnoughCredits,
  disabled,
}: GenerateButtonProps) {
  const isDisabled = isGenerating || !hasEnoughCredits || disabled;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all",
        !isDisabled
          ? "brand-gradient hover:opacity-90 active:scale-[0.99]"
          : "bg-[var(--border-default)] text-[var(--text-muted)] cursor-not-allowed"
      )}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          Gerar
          <Sparkles className="w-4 h-4" />
          {creditsCost > 0 && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              !isDisabled ? "bg-white/20" : "bg-[var(--border-subtle)]"
            )}>
              {creditsCost}
            </span>
          )}
        </>
      )}
    </button>
  );
}
