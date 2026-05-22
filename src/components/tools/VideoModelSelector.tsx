"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { VIDEO_MODELS } from "@/lib/models";

interface VideoModelSelectorProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function VideoModelSelector({ value, onChange, disabled }: VideoModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = VIDEO_MODELS.find((m) => m.id === value) ?? VIDEO_MODELS[0];

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
          <span className="font-medium text-[var(--text-primary)] truncate">{selected.name}</span>
          {"badge" in selected && selected.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-brand)] text-white font-semibold shrink-0">
              {selected.badge}
            </span>
          )}
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
              {VIDEO_MODELS.map((model) => {
                const active = model.id === value;
                return (
                  <button
                    key={model.id}
                    onClick={() => { onChange(model.id); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[var(--bg-hover)] transition-colors text-left",
                      active && "bg-[var(--bg-secondary)]"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-[var(--text-primary)]">{model.name}</span>
                        {"badge" in model && model.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-brand)] text-white font-semibold">
                            {model.badge}
                          </span>
                        )}
                      </div>
                      {"description" in model && model.description && (
                        <p className="text-xs text-[var(--text-muted)] truncate">{model.description}</p>
                      )}
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
