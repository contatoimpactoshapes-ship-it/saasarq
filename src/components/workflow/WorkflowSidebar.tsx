"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Cpu, Loader2,
  Settings2, Sliders, Upload, RefreshCw,
} from "lucide-react";

// ── Model definitions ────────────────────────────────────────────────────────

const RENDER_AI_MODELS = [
  { id: "render-flux-dev",         name: "Flux Dev",          desc: "Rápido · BFL",         group: "Flux" },
  { id: "render-flux-kontext-dev", name: "Kontext Dev",       desc: "Edição contextual",     group: "Flux" },
  { id: "render-flux-kontext-pro", name: "Kontext Pro",       desc: "Contextual premium",    group: "Flux" },
  { id: "render-flux-pro",         name: "Flux Pro Redux",    desc: "Fiel ao estilo",        group: "Flux" },
  { id: "render-nano-banana",      name: "Nano Banana",       desc: "Google · rápido",       group: "Google" },
  { id: "render-nano-banana-2",    name: "Nano Banana 2",     desc: "Gemini Flash",          group: "Google" },
  { id: "render-nano-banana-pro",  name: "Nano Banana Pro",   desc: "Gemini Pro",            group: "Google" },
  { id: "render-ideogram",         name: "Ideogram V2",       desc: "Alta fidelidade",       group: "Ideogram" },
  { id: "render-ideogram-v3",      name: "Ideogram V3",       desc: "Última versão",         group: "Ideogram" },
  { id: "render-qwen-pro",         name: "Qwen Pro",          desc: "Alibaba · produção",    group: "Alibaba" },
  { id: "render-gpt-image-2",      name: "GPT Image 2",       desc: "OpenAI · preciso",      group: "OpenAI" },
  { id: "render-sdxl",             name: "SDXL 1.0",          desc: "Stability · clássico",  group: "Stability" },
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
}

// ── Component ────────────────────────────────────────────────────────────────

export function WorkflowSidebar({
  prompt, onPromptChange,
  model, onModelChange,
  strength, onStrengthChange,
  numOutputs, onNumOutputsChange,
  isGenerating, readyCount,
  onRenderAll, onUpload,
  nodeCount,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const currentModel = RENDER_AI_MODELS.find((m) => m.id === model) ?? RENDER_AI_MODELS[0];

  // Group models by group
  const groups = Array.from(new Set(RENDER_AI_MODELS.map((m) => m.group)));

  return (
    <div
      className={`
        relative shrink-0 flex flex-col bg-[#111120] border-r border-white/5
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-12" : "w-64"}
      `}
    >
      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-[#1e1e30] border border-white/10
          flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-[#252540]
          shadow-lg transition-colors"
        title={collapsed ? "Expandir painel" : "Recolher painel"}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* ── Collapsed state: icon strip ── */}
      {collapsed && (
        <div className="flex flex-col items-center gap-3 pt-4 px-2">
          <button
            onClick={onUpload}
            title="Upload de imagem"
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={onRenderAll}
            disabled={isGenerating || readyCount === 0}
            title="Renderizar tudo"
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-30 transition-colors"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* ── Expanded state ── */}
      {!collapsed && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Workflow</p>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

            {/* ── Upload section ── */}
            <Section icon={<Upload className="w-3.5 h-3.5" />} title="Imagens">
              <button
                onClick={onUpload}
                className="w-full h-9 rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/40
                  text-[11px] font-medium text-white/30 hover:text-violet-300 flex items-center justify-center gap-2
                  transition-all hover:bg-violet-500/5"
              >
                <Upload className="w-3.5 h-3.5" />
                Adicionar imagem
              </button>
              {nodeCount > 0 && (
                <p className="text-[10px] text-white/20 text-center mt-1.5">
                  {nodeCount} imagem{nodeCount !== 1 ? "s" : ""} no canvas
                </p>
              )}
            </Section>

            {/* ── Prompt section ── */}
            <Section icon={<Settings2 className="w-3.5 h-3.5" />} title="Prompt global">
              <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Deixe vazio para usar prompt de cada nó...&#10;&#10;Ex: Fotografia hiper-realista, iluminação cinematográfica"
                rows={5}
                disabled={isGenerating}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5
                  text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none
                  focus:border-violet-500/50 resize-none transition-colors
                  leading-relaxed disabled:opacity-40 scrollbar-thin"
              />
            </Section>

            {/* ── Model section ── */}
            <Section icon={<Cpu className="w-3.5 h-3.5" />} title="Modelo de IA">
              <select
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                disabled={isGenerating}
                className="w-full h-9 rounded-xl border border-white/10 bg-[#1a1a30] px-3
                  text-[11px] text-white/70 focus:outline-none focus:border-violet-500/50
                  transition-colors disabled:opacity-40 cursor-pointer"
              >
                {groups.map((group) => (
                  <optgroup key={group} label={group} className="bg-[#1a1a30]">
                    {RENDER_AI_MODELS.filter((m) => m.group === group).map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#1a1a30]">
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-[10px] text-white/25 mt-1 px-1">
                {currentModel.desc}
              </p>
            </Section>

            {/* ── Params section ── */}
            <Section icon={<Sliders className="w-3.5 h-3.5" />} title="Parâmetros">
              {/* Strength */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-white/40 font-medium">Intensidade</label>
                  <span className="text-[10px] font-bold text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded-md">
                    {strength.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={1.0}
                  step={0.01}
                  value={strength}
                  onChange={(e) => onStrengthChange(parseFloat(e.target.value))}
                  disabled={isGenerating}
                  className="w-full accent-violet-500 disabled:opacity-40"
                />
                <div className="flex justify-between text-[9px] text-white/20">
                  <span>Conservador</span>
                  <span>Criativo</span>
                </div>
              </div>

              {/* Num outputs */}
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-white/40 font-medium">Variações</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => onNumOutputsChange(n)}
                        disabled={isGenerating}
                        className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-40
                          ${numOutputs === n
                            ? "bg-violet-600 text-white"
                            : "bg-white/5 text-white/40 hover:bg-white/10"
                          }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* ── Render All CTA ── */}
          <div className="p-3 border-t border-white/5">
            <button
              onClick={onRenderAll}
              disabled={isGenerating || readyCount === 0}
              className={`
                w-full h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-2
                transition-all disabled:opacity-30 disabled:cursor-not-allowed
                ${isGenerating
                  ? "bg-blue-600/30 text-blue-300"
                  : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-violet-500/25"
                }
              `}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
              ) : (
                <><Cpu className="w-4 h-4" />Renderizar tudo</>
              )}
            </button>
            {readyCount > 0 && !isGenerating && (
              <p className="text-[10px] text-white/20 text-center mt-1.5">
                {readyCount} imagem{readyCount !== 1 ? "s" : ""} pronta{readyCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon, title, children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-3 border-b border-white/5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-violet-400/60">{icon}</span>
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}
