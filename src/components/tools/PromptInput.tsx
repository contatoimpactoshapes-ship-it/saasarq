"use client";

import { useState } from "react";
import { Bot, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  suggestions?: string[];
}

export function PromptInput({
  value,
  onChange,
  placeholder = "Descreva sua imagem...",
  disabled,
  suggestions = [],
}: PromptInputProps) {
  const [aiEnhance, setAiEnhance] = useState(false);

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
          className={cn(
            "w-full resize-none rounded-xl border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>

      {/* AI enhance toggle */}
      <button
        onClick={() => setAiEnhance((v) => !v)}
        className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <Bot className="w-3.5 h-3.5" />
        <span>Prompt com IA</span>
        <div className={cn(
          "w-6 h-3.5 rounded-full transition-colors relative",
          aiEnhance ? "bg-[var(--color-brand)]" : "bg-[var(--border-default)]"
        )}>
          <div className={cn(
            "absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform",
            aiEnhance ? "translate-x-3" : "translate-x-0.5"
          )} />
        </div>
      </button>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-1">
          {suggestions.slice(0, 3).map((s, i) => (
            <button
              key={i}
              onClick={() => onChange(s)}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)] transition-colors text-left group"
            >
              <span className="text-xs text-[var(--text-muted)] truncate group-hover:text-[var(--text-primary)]">
                {s}
              </span>
              <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
