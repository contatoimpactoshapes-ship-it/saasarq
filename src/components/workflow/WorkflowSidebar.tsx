"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Cpu, Loader2,
  Settings2, Sliders, Upload, Images,
} from "lucide-react";

// ── Model definitions ────────────────────────────────────────────────────────

const RENDER_AI_MODELS = [
  { id: "render-flux-dev",         name: "Flux Dev",          desc: "Rápido · BFL",          group: "Flux" },
  { id: "render-flux-kontext-dev", name: "Kontext Dev",        desc: "Edição contextual",      group: "Flux" },
  { id: "render-flux-kontext-pro", name: "Kontext Pro",        desc: "Contextual premium",     group: "Flux" },
  { id: "render-flux-pro",         name: "Flux Pro Redux",     desc: "Fiel ao estilo",         group: "Flux" },
  { id: "render-nano-banana",      name: "Nano Banana",        desc: "Google · rápido",        group: "Google" },
  { id: "render-nano-banana-2",    name: "Nano Banana 2",      desc: "Gemini Flash",           group: "Google" },
  { id: "render-nano-banana-pro",  name: "Nano Banana Pro",    desc: "Gemini Pro",             group: "Google" },
  { id: "render-ideogram",         name: "Ideogram V2",        desc: "Alta fidelidade",        group: "Ideogram" },
  { id: "render-ideogram-v3",      name: "Ideogram V3",        desc: "Última versão",          group: "Ideogram" },
  { id: "render-qwen-pro",         name: "Qwen Pro",           desc: "Alibaba · produção",     group: "Alibaba" },
  { id: "render-gpt-image-2",      name: "GPT Image 2",        desc: "OpenAI · preciso",       group: "OpenAI" },
  { id: "render-sdxl",             name: "SDXL 1.0",           desc: "Stability · clássico",   group: "Stability" },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  prompt: string;
  onPromptChange: (v: string) => void;
  model: string;
  onModelChange: (v: string) => void;
  strength: number;
  onStrengthChange: (v: number) => void;
  numOutputs: number;
  onNumOutputsChange: (v: number) => void;
  isGenerating: boolean;
  readyCount: number;
  onRenderAll: () => void;
  onUpload: () => void;
  nodeCount: number;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

// ── Component ────────────────────────────────────────────────────────────────

export function WorkflowSidebar({
  prompt, onPromptChange,
  model, onModelChange,
  strength, onStrengthChange,
  numOutputs, onNumOutputsChange,
  isGenerating, readyCount,
  onRenderAll, onUpload,
  nodeCount, saveStatus,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const currentModel = RENDER_AI_MODELS.find((m) => m.id === model) ?? RENDER_AI_MODELS[0];
  const groups = Array.from(new Set(RENDER_AI_MODELS.map((m) => m.group)));

  return (
    <div
      className={`
        relative shrink-0 flex flex-col bg-white border-r border-[var(--border-subtle)]
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-12" : "w-64"}
      `}
    >
      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-white border border-[var(--border-subtle)]
          flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]
          shadow-sm hover:shadow transition-all"
        title={collapsed ? "Expandir painel" : "Recolher painel"}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* ── Collapsed icon strip ── */}
      {collapsed && (
        <div className="flex flex-col items-center gap-3 pt-4 px-2">
          <button
            onClick={onUpload}
            title="Upload de imagem"
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--color-brand)] hover:bg-orange-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={onRenderAll}
            disabled={isGenerating || readyCount === 0}
            title="Renderizar tudo"
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--color-brand)] hover:bg-orange-50 disabled:opacity-30 transition-colors"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* ── Expanded ── */}
      {!collapsed && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              Workflow · 3D → Render
            </p>
            {saveStatus === "saving" && (
              <span className="text-[9px] text-gray-400 shrink-0">Salvando...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-[9px] text-emerald-500 font-medium shrink-0">Salvo ✓</span>
            )}
            {saveStatus === "error" && (
              <span className="text-[9px] text-red-400 shrink-0">Erro ao salvar</span>
            )}
          </div>

          {/* Scrollable */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">

            {/* ── Upload ── */}
            <Section icon={<Upload className="w-3.5 h-3.5" />} title="Imagens">
              <button
                onClick={onUpload}
                className="w-full h-9 rounded-xl border-2 border-dashed border-[var(--border-subtle)]
                  hover:border-[var(--color-brand)]/40 text-[11px] font-medium text-[var(--text-muted)]
                  hover:text-[var(--color-brand)] flex items-center justify-center gap-2
                  transition-all hover:bg-orange-50/50"
              >
                <Upload className="w-3.5 h-3.5" />
                Adicionar imagem
              </button>
              {nodeCount > 0 && (
                <p className="text-[10px] text-[var(--text-muted)] text-center mt-1.5">
                  {nodeCount} imagem{nodeCount !== 1 ? "s" : ""} no canvas
                </p>
              )}
            </Section>

            {/* ── Prompt ── */}
            <Section icon={<Settings2 className="w-3.5 h-3.5" />} title="Prompt Global (fallback)">
              <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder={"Ex: Fotografia hiper-realista, iluminação natural suave"}
                rows={4}
                disabled={isGenerating}
                className="w-full rounded-xl border border-[var(--border-default)] bg-white px-3 py-2.5
                  text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none
                  focus:border-[var(--color-brand)] resize-none transition-colors
                  leading-relaxed disabled:opacity-40 scrollbar-thin"
              />
              <p className="text-[9px] text-[var(--text-muted)] mt-1 px-0.5 leading-relaxed">
                Usado apenas quando a imagem não tem prompt próprio.
              </p>
            </Section>

            {/* ── Model ── */}
            <Section icon={<Cpu className="w-3.5 h-3.5" />} title="Modelo de IA">
              <select
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={isGenerating}
                className="w-full h-9 rounded-xl border border-[var(--border-default)] bg-white px-3
                  text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]
                  transition-colors disabled:opacity-40 cursor-pointer"
              >
                {groups.map((group) => (
                  <optgroup key={group} label={group}>
                    {RENDER_AI_MODELS.filter((m) => m.group === group).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 px-0.5">{currentModel.desc}</p>
            </Section>

            {/* ── Variações 1–10 ── */}
            <Section icon={<Images className="w-3.5 h-3.5" />} title="Variações por imagem">
              <VariationsPicker
                value={numOutputs}
                onChange={onNumOutputsChange}
                disabled={isGenerating}
              />
            </Section>

            {/* ── Intensidade ── */}
            <Section icon={<Sliders className="w-3.5 h-3.5" />} title="Intensidade do render">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)]">Conservador → Criativo</span>
                  <span className="text-[10px] font-bold text-[var(--color-brand)] bg-orange-50 px-2 py-0.5 rounded-lg">
                    {strength.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range" min={0.3} max={1.0} step={0.01}
                  value={strength}
                  onChange={(e) => onStrengthChange(parseFloat(e.target.value))}
                  disabled={isGenerating}
                  className="w-full accent-[#F97316] disabled:opacity-40"
                />
                <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
                  <span>0.30</span>
                  <span>1.00</span>
                </div>
              </div>
            </Section>
          </div>

          {/* ── Render All CTA ── */}
          <div className="p-3 border-t border-[var(--border-subtle)]">
            <button
              onClick={onRenderAll}
              disabled={isGenerating || readyCount === 0}
              className={`
                w-full h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-2
                transition-all disabled:opacity-30 disabled:cursor-not-allowed
                ${isGenerating
                  ? "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                  : "brand-gradient text-white shadow-sm hover:shadow-md hover:opacity-95"
                }
              `}
            >
              {isGenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                : <><Cpu className="w-4 h-4" />Renderizar tudo</>
              }
            </button>
            {readyCount > 0 && !isGenerating && (
              <p className="text-[10px] text-[var(--text-muted)] text-center mt-1.5">
                {readyCount} imagem{readyCount !== 1 ? "s" : ""} pronta{readyCount !== 1 ? "s" : ""} ·{" "}
                {readyCount * numOutputs} variação{readyCount * numOutputs !== 1 ? "ões" : ""} no total
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Variations picker 1–10 ───────────────────────────────────────────────────

function VariationsPicker({
  value, onChange, disabled,
}: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="space-y-2">
      {/* Grid 5×2 */}
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            disabled={disabled}
            title={`${n} variação${n !== 1 ? "ões" : ""}`}
            className={`
              h-8 rounded-lg text-[11px] font-bold transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              ${value === n
                ? "bg-[var(--color-brand)] text-white shadow-sm shadow-orange-200"
                : "bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-orange-50 hover:text-[var(--color-brand)] border border-transparent hover:border-[var(--color-brand)]/20"
              }
            `}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed">
        {value === 1
          ? "Gera 1 variação por imagem"
          : `Gera ${value} variações por imagem`}
      </p>
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-3 border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[var(--color-brand)]/60">{icon}</span>
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  );
}
