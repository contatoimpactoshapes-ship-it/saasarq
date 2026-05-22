"use client";

import { useState } from "react";
import { X, ExternalLink } from "lucide-react";

export function PromoBanner() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] bg-transparent">
      <span className="font-medium text-[var(--text-muted)] hidden md:inline">
        ↗ Upscale Conf SF 2026
      </span>
      <span className="hidden md:inline text-[var(--text-muted)]">·</span>
      <span className="text-[var(--text-muted)] hidden lg:inline">3 a 4 de junho · São Francisco</span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--text-primary)] text-white rounded-full font-semibold text-[10px]">
        50% OFF
      </span>
      <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
        <ExternalLink className="w-3 h-3" />
      </button>
      <button
        onClick={() => setClosed(true)}
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
