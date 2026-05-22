"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityPickerProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function QuantityPicker({ value, onChange, min = 1, max = 8, disabled }: QuantityPickerProps) {
  return (
    <div className={cn("flex items-center gap-1", disabled && "opacity-50 pointer-events-none")}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-white hover:border-[var(--text-muted)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-8 text-center text-sm font-semibold text-[var(--text-primary)]">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-white hover:border-[var(--text-muted)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
