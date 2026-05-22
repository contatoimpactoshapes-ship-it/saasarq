"use client";

import { useRef } from "react";
import { Plus, X, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Reference {
  type: "style" | "person" | "custom";
  url: string;
  file?: File;
}

interface ReferenceSlotsProps {
  references: Reference[];
  onAdd: (ref: Reference) => void;
  onRemove: (index: number) => void;
  max?: number;
  disabled?: boolean;
}

export function ReferenceSlots({ references, onAdd, onRemove, max = 8, disabled }: ReferenceSlotsProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onAdd({ type: "custom", url, file });
    e.target.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
          REFERÊNCIAS
        </span>
        <span className="text-xs text-[var(--text-muted)]">{references.length}/{max}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* Preset slots */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled || references.some((r) => r.type === "style")}
          className={cn(
            "h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] text-xs text-[var(--text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Star className="w-3 h-3" />
          Estilo
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled || references.some((r) => r.type === "person")}
          className={cn(
            "h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] text-xs text-[var(--text-muted)] hover:border-[var(--color-action)] hover:text-[var(--color-action)] transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <User className="w-3 h-3" />
          Pessoa
        </button>

        {/* Uploaded refs */}
        {references.map((ref, i) => (
          <div key={i} className="relative w-8 h-8 rounded-lg overflow-hidden border border-[var(--border-default)] group">
            <Image src={ref.url} alt="" fill className="object-cover" />
            <button
              onClick={() => onRemove(i)}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}

        {/* Add more */}
        {references.length < max && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
