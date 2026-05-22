"use client";

import { cn } from "@/lib/utils";
import { ASPECT_RATIOS } from "@/lib/models";

interface AspectRatioPickerProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function AspectRatioPicker({ value, onChange, disabled }: AspectRatioPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ASPECT_RATIOS.map((r) => (
        <button
          key={r.value}
          onClick={() => !disabled && onChange(r.value)}
          disabled={disabled}
          className={cn(
            "h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors",
            value === r.value
              ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
              : "border-[var(--border-default)] bg-white text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
