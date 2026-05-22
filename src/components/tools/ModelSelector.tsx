"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMAGE_MODELS } from "@/lib/models";
import { useCreditsStore } from "@/stores/useCreditsStore";

interface ModelSelectorProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { plan } = useCreditsStore();
  const selected = IMAGE_MODELS.find((m) => m.id === value) ?? IMAGE_MODELS[0];
  const premiumPlans = ["PREMIUM", "PREMIUM_PLUS", "PRO"];

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
                const locked = "premium" in model && model.premium && !premiumPlans.includes(plan);
                const active = model.id === value;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      if (!locked) { onChange(model.id); setOpen(false); }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[var(--bg-hover)] transition-colors text-left",
                      locked && "opacity-50 cursor-not-allowed",
                      active && "bg-[var(--bg-secondary)]"
                    )}
                  >
                    <span className="text-[var(--color-brand)] font-mono font-bold text-base w-5 shrink-0">
                      {model.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[var(--text-primary)]">{model.name}</span>
                        {locked && <Lock className="w-3 h-3 text-[var(--text-muted)]" />}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate">{model.description}</p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">{model.credits} cr</span>
                    {active && <Check className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
