"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Cpu, Loader2,
  Settings2, Sliders, Upload, Images, Trash2, RefreshCw,
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

const ASPECT_RATIOS = [
  { value: "1:1",  label: "1:1",  hint: "Quadrado" },
  { value: "16:9", label: "16:9", hint: "Paisagem" },
  { value: "9:16", label: "9:16", hint: "Retrato" },
  { value: "4:5",  label: "4:5",  hint: "Social" },
  { value: "3:2",  label: "3:2",  hint: "Foto" },
  { value: "2:3",  label: "2:3",  hint: "Vertical" },
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface SelectedSourceInfo {
  nodeId:        string;
  label?:        string;
  displayUrl?:   string;
  falUrl?:       string;
  status?:       string;
  uploading?:    boolean;
  prompt?:       string;
  aspectRatio?:  string;
  nodeModel?:    string;
  nodeStrength?: number;
  nodeOutputs?:  number;
}

interface Props {
  // Global settings
  prompt:             string;
  onPromptChange:     (v: string) => void;
  model:              string;
  onModelChange:      (v: string) => void;
  strength:           number;
  onStrengthChange:   (v: number) => void;
  numOutputs:         number;
  onNumOutputsChange: (v: number) => void;
  // Canvas state
  isGenerating: boolean;
  readyCount:   number;
  onRenderAll:  () => void;
  onUpload:     () => void;
  nodeCount:    number;
  saveStatus:   "idle" | "saving" | "saved" | "error";
  // Contextual selected source
  selectedSource:  SelectedSourceInfo | null;
  onUpdateSource:  (patch: Partial<SelectedSourceInfo>) => void;
  onRenderSource:  () => void;
  onReplaceSource: () => void;
  onDeleteSource:  () => void;
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
  selectedSource,
  onUpdateSource, onRenderSource, onReplaceSource, onDeleteSource,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

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
          <button onClick={onUpload} title="Upload de imagem"
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--color-brand)] hover:bg-orange-50 transition-colors">
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={selectedSource ? onRenderSource : onRenderAll}
            disabled={isGenerating || (!selectedSource && readyCount === 0)}
            title={selectedSource ? "Renderizar imagem" : "Renderizar tudo"}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--color-brand)] hover:bg-orange-50 disabled:opacity-30 transition-colors"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* ── Expanded ── */}
      {!collapsed && (
        <div className="flex flex-col h-full overflow-hidden">

          {/* ── Header ── */}
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate">
              {selectedSource ? "Imagem Selecionada" : "Workflow · 3D → Render"}
            </p>
            {saveStatus === "saving" && <span className="text-[9px] text-gray-400 shrink-0">Salvando...</span>}
            {saveStatus === "saved"  && <span className="text-[9px] text-emerald-500 font-medium shrink-0">Salvo ✓</span>}
            {saveStatus === "error"  && <span className="text-[9px] text-red-400 shrink-0">Erro ao salvar</span>}
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent min-h-0">
            {selectedSource
              ? <ContextualBody
                  source={selectedSource}
                  globalModel={model}
                  globalStrength={strength}
                  globalNumOutputs={numOutputs}
                  isGenerating={isGenerating}
                  onUpdate={onUpdateSource}
                />
              : <GlobalBody
                  prompt={prompt}            onPromptChange={onPromptChange}
                  model={model}              onModelChange={onModelChange}
                  strength={strength}        onStrengthChange={onStrengthChange}
                  numOutputs={numOutputs}    onNumOutputsChange={onNumOutputsChange}
                  isGenerating={isGenerating}
                  onUpload={onUpload}
                  nodeCount={nodeCount}
                />
            }
          </div>

          {/* ── Footer CTA ── */}
          {selectedSource
            ? <ContextualCTA
                source={selectedSource}
                isGenerating={isGenerating}
                onRender={onRenderSource}
                onReplace={onReplaceSource}
                onDelete={onDeleteSource}
              />
            : <GlobalCTA
                isGenerating={isGenerating}
                readyCount={readyCount}
                numOutputs={numOutputs}
                onRenderAll={onRenderAll}
              />
          }
        </div>
      )}
    </div>
  );
}

// ── Contextual panel body ─────────────────────────────────────────────────────

function ContextualBody({
  source, globalModel, globalStrength, globalNumOutputs, isGenerating, onUpdate,
}: {
  source: SelectedSourceInfo;
  globalModel: string; globalStrength: number; globalNumOutputs: number;
  isGenerating: boolean;
  onUpdate: (patch: Partial<SelectedSourceInfo>) => void;
}) {
  const groups = Array.from(new Set(RENDER_AI_MODELS.map((m) => m.group)));
  const effectiveModel    = source.nodeModel    ?? globalModel;
  const effectiveStrength = source.nodeStrength ?? globalStrength;
  const effectiveOutputs  = source.nodeOutputs  ?? globalNumOutputs;
  const effectiveAspect   = source.aspectRatio  ?? "1:1";

  return (
    <>
      {/* Preview */}
      <div className="px-3 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
            {source.displayUrl
              ? /* eslint-disable-next-line @next/next/no-img-element */
                <img src={source.displayUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Upload className="w-5 h-5" />
                </div>
            }
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
              {source.label ?? "imagem"}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] mt-0.5 capitalize">
              {source.status ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Prompt */}
      <Section icon={<Settings2 className="w-3.5 h-3.5" />} title="Prompt desta imagem">
        <textarea
          value={source.prompt ?? ""}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          placeholder="Descreva o estilo desta imagem..."
          rows={4}
          disabled={isGenerating}
          className="w-full rounded-xl border border-[var(--border-default)] bg-white px-3 py-2.5
            text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none
            focus:border-[var(--color-brand)] resize-none transition-colors leading-relaxed
            disabled:opacity-40 scrollbar-thin"
        />
      </Section>

      {/* Aspect ratio */}
      <Section icon={<Images className="w-3.5 h-3.5" />} title="Proporção">
        <div className="grid grid-cols-3 gap-1.5">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.value}
              onClick={() => onUpdate({ aspectRatio: ar.value })}
              disabled={isGenerating}
              title={ar.hint}
              className={`
                h-9 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center transition-all
                disabled:opacity-30 disabled:cursor-not-allowed leading-tight
                ${effectiveAspect === ar.value
                  ? "bg-[var(--color-brand)] text-white shadow-sm shadow-orange-200"
                  : "bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-orange-50 hover:text-[var(--color-brand)] border border-transparent hover:border-[var(--color-brand)]/20"
                }
              `}
            >
              {ar.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Model */}
      <Section icon={<Cpu className="w-3.5 h-3.5" />} title="Modelo">
        <select
          value={effectiveModel}
          onChange={(e) => onUpdate({ nodeModel: e.target.value })}
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
      </Section>

      {/* Variations */}
      <Section icon={<Images className="w-3.5 h-3.5" />} title="Variações">
        <VariationsPicker value={effectiveOutputs} onChange={(v) => onUpdate({ nodeOutputs: v })} disabled={isGenerating} />
      </Section>

      {/* Strength */}
      <Section icon={<Sliders className="w-3.5 h-3.5" />} title="Intensidade">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)]">Conservador → Criativo</span>
            <span className="text-[10px] font-bold text-[var(--color-brand)] bg-orange-50 px-2 py-0.5 rounded-lg">
              {effectiveStrength.toFixed(2)}
            </span>
          </div>
          <input
            type="range" min={0.3} max={1.0} step={0.01}
            value={effectiveStrength}
            onChange={(e) => onUpdate({ nodeStrength: parseFloat(e.target.value) })}
            disabled={isGenerating}
            className="w-full accent-[#F97316] disabled:opacity-40"
          />
          <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
            <span>0.30</span><span>1.00</span>
          </div>
        </div>
      </Section>
    </>
  );
}

// ── Contextual footer CTA ─────────────────────────────────────────────────────

function ContextualCTA({
  source, isGenerating, onRender, onReplace, onDelete,
}: {
  source: SelectedSourceInfo;
  isGenerating: boolean;
  onRender: () => void; onReplace: () => void; onDelete: () => void;
}) {
  const canRender = !!(source.falUrl && !source.uploading);

  return (
    <div className="p-3 border-t border-[var(--border-subtle)] space-y-2 shrink-0">
      <button
        onClick={onRender}
        disabled={isGenerating || !canRender}
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
          : <><Cpu className="w-4 h-4" />Renderizar imagem</>
        }
      </button>
      <div className="flex gap-2">
        <button
          onClick={onReplace}
          disabled={isGenerating}
          className="flex-1 h-8 rounded-xl text-[11px] font-medium text-[var(--text-muted)]
            bg-[var(--bg-secondary)] hover:bg-gray-100 disabled:opacity-30
            flex items-center justify-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />Substituir
        </button>
        <button
          onClick={onDelete}
          disabled={isGenerating}
          className="flex-1 h-8 rounded-xl text-[11px] font-medium text-red-400
            bg-red-50 hover:bg-red-100 disabled:opacity-30
            flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3 h-3" />Remover
        </button>
      </div>
    </div>
  );
}

// ── Global panel body ─────────────────────────────────────────────────────────

function GlobalBody({
  prompt, onPromptChange,
  model, onModelChange,
  strength, onStrengthChange,
  numOutputs, onNumOutputsChange,
  isGenerating, onUpload, nodeCount,
}: {
  prompt: string; onPromptChange: (v: string) => void;
  model: string;  onModelChange: (v: string) => void;
  strength: number; onStrengthChange: (v: number) => void;
  numOutputs: number; onNumOutputsChange: (v: number) => void;
  isGenerating: boolean; onUpload: () => void; nodeCount: number;
}) {
  const groups = Array.from(new Set(RENDER_AI_MODELS.map((m) => m.group)));
  const currentModel = RENDER_AI_MODELS.find((m) => m.id === model) ?? RENDER_AI_MODELS[0];

  return (
    <>
      {/* Upload */}
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

      {/* Global prompt */}
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
          Usado apenas quando a imagem não possui prompt próprio.
        </p>
      </Section>

      {/* Model (global default) */}
      <Section icon={<Cpu className="w-3.5 h-3.5" />} title="Modelo padrão">
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

      {/* Variations (global default) */}
      <Section icon={<Images className="w-3.5 h-3.5" />} title="Variações padrão">
        <VariationsPicker value={numOutputs} onChange={onNumOutputsChange} disabled={isGenerating} />
      </Section>

      {/* Strength (global default) */}
      <Section icon={<Sliders className="w-3.5 h-3.5" />} title="Intensidade padrão">
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
            <span>0.30</span><span>1.00</span>
          </div>
        </div>
      </Section>
    </>
  );
}

// ── Global footer CTA ─────────────────────────────────────────────────────────

function GlobalCTA({
  isGenerating, readyCount, numOutputs, onRenderAll,
}: {
  isGenerating: boolean; readyCount: number; numOutputs: number; onRenderAll: () => void;
}) {
  return (
    <div className="p-3 border-t border-[var(--border-subtle)] shrink-0">
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
          Selecione uma para configurar individualmente
        </p>
      )}
    </div>
  );
}

// ── Variations picker ────────────────────────────────────────────────────────

function VariationsPicker({
  value, onChange, disabled,
}: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="space-y-2">
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
        {value === 1 ? "1 variação por imagem" : `${value} variações por imagem`}
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
