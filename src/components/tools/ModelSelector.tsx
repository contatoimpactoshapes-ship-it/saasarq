"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMAGE_MODELS } from "@/lib/models";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { meetsMinPlan } from "@/lib/economy";
import type { PlanId } from "@/lib/plans";

const MIN_PLAN_LABELS: Record<string, string> = {
  ESSENTIAL:    "Essential",
  PREMIUM:      "Premium",
  PREMIUM_PLUS: "Premium+",
  PRO:          "Pro",
};

interface ModelSelectorProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { plan } = useCreditsStore();
  const router = useRouter();
  const selected = IMAGE_MODELS.find((m) => m.id === value) ?? IMAGE_MODELS[0];

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-white text-sm hover:border-[var(--text-muted)] transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[var(--color-brand)] font-mono font-bold text-base shrink-0">
            {selected.icon}
          </span>
          <span className="font-medium text-[var(--text-primary)] truncate">{selected.name}</span>
          <span className="text-xs text-[var(--text-muted)] shrink-0">{selected.credits} cr</span>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-dropdown)] overflow-hidden"
            >
              {IMAGE_MODELS.map((model) => {
                const minPlan = ("minPlan" in model ? model.minPlan : null) as PlanId | null;
                const locked = !!minPlan && !meetsMinPlan(plan, minPlan);
                const active = model.id === value;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      if (locked) {
                        router.push("/pricing");
                        setOpen(false);
                        return;
                      }
                      onChange(model.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left",
                      locked
                        ? "bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)] cursor-pointer"
                        : "hover:bg-[var(--bg-hover)]",
                      active && !locked && "bg-[var(--bg-secondary)]"
                    )}
                  >
                    <span className={cn(
                      "font-mono font-bold text-base w-5 shrink-0",
                      locked ? "opacity-40" : "text-[var(--color-brand)]"
                    )}>
                      {model.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("font-medium", locked ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]")}>
                          {model.name}
                        </span>
                        {locked && minPlan && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-600 font-semibold whitespace-nowrap">
                            {MIN_PLAN_LABELS[minPlan]}+
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate">{model.description}</p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">{model.credits} cr</span>
                    {locked
                      ? <Lock className="w-3 h-3 text-[var(--text-muted)]/60 shrink-0" />
                      : active
                      ? <Check className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
                      : null
                    }
                  </button>
                );
              })}

              <div className="px-3 py-2 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <button
                  onClick={() => { router.push("/pricing"); setOpen(false); }}
                  className="w-full text-center text-[10px] text-[var(--color-brand)] font-medium hover:underline"
                >
                  Ver todos os planos e modelos disponíveis →
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
