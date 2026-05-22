"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Upload, X, Play, Loader2, AlertCircle, Download,
  Video, Image as ImageIcon, Sparkles, Film, ChevronDown,
  Check, MousePointerClick,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { GeneratorPanel } from "@/components/tools/GeneratorPanel";
import { GenerateButton } from "@/components/tools/GenerateButton";
import { useGenerationStore, type GenerationItem } from "@/stores/useGenerationStore";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { VIDEO_MODELS, getVideoModel } from "@/lib/models";
import { cn } from "@/lib/utils";

const POLL_INTERVAL = 4000;

// ── Ad creative presets ────────────────────────────────────────────────────────
const AD_PRESETS = [
  {
    id: "produto",
    label: "Produto",
    icon: "🛍️",
    prompt: "Produto em destaque com movimento suave de câmera, fundo clean, iluminação de estúdio profissional, qualidade cinematográfica para anúncio.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    icon: "✨",
    prompt: "Cena de lifestyle moderna, pessoas felizes interagindo com o produto, luz natural, atmosfera aspiracional, qualidade cinematográfica.",
  },
  {
    id: "arquitetura",
    label: "Arquitetura",
    icon: "🏛️",
    prompt: "Flythrough arquitetônico cinematográfico, câmera se move suavemente pelo espaço, iluminação natural, detalhes de acabamento em foco, qualidade editorial.",
  },
  {
    id: "interior",
    label: "Interior",
    icon: "🛋️",
    prompt: "Interior de luxo, câmera desliza lentamente revelando o ambiente, luz natural filtrada, materiais premium em destaque, atmosfera sofisticada.",
  },
  {
    id: "motion",
    label: "Motion",
    icon: "🎬",
    prompt: "Motion graphics elegante, animações fluidas, paleta de cores premium, transições suaves, identidade visual moderna para anúncio digital.",
  },
  {
    id: "luxo",
    label: "Luxo",
    icon: "💎",
    prompt: "Visual de luxo cinematográfico, iluminação dramática e sofisticada, materialidade premium, movimento de câmera lento e elegante, acabamento de alto padrão.",
  },
];

// ── Ad format presets ──────────────────────────────────────────────────────────
const FORMAT_PRESETS = [
  { id: "story",     label: "Story",       icon: "📱", ratio: "9:16",  desc: "Reels & Stories" },
  { id: "feed",      label: "Feed",        icon: "⬛", ratio: "1:1",   desc: "Feed Quadrado" },
  { id: "landscape", label: "Landscape",   icon: "🖥️", ratio: "16:9",  desc: "YouTube & TV" },
];

// ── Duration options ───────────────────────────────────────────────────────────
const ALL_DURATIONS = [3, 5, 8, 10, 15, 20];

function aspectClass(ratio: string) {
  if (ratio === "9:16") return "aspect-[9/16]";
  if (ratio === "1:1")  return "aspect-square";
  return "aspect-video";
}

// ── Model dropdown ─────────────────────────────────────────────────────────────
function VideoModelDropdown({
  value, onChange, disabled,
}: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const selected = VIDEO_MODELS.find((m) => m.id === value) ?? VIDEO_MODELS[0];

  const groups = Array.from(new Set(VIDEO_MODELS.map((m) => m.group)));

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
          {selected.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-brand)] text-white font-semibold shrink-0">
              {selected.badge}
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)] shrink-0">{selected.credits} cr</span>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-[var(--border-default)] rounded-xl shadow-xl overflow-auto max-h-72">
            {groups.map((group) => (
              <div key={group}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  {group}
                </div>
                {VIDEO_MODELS.filter((m) => m.group === group).map((model) => {
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
                          {model.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-brand)] text-white font-semibold">
                              {model.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] truncate">{model.description}</p>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] shrink-0">{model.credits} cr</span>
                      {active && <Check className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Video card ─────────────────────────────────────────────────────────────────
function VideoCard({ gen }: { gen: GenerationItem }) {
  const params = (gen as GenerationItem & { parameters?: { aspectRatio?: string; duration?: number } }).parameters;
  const ratio   = params?.aspectRatio ?? "16:9";
  const dur     = params?.duration ?? 5;

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-xl overflow-hidden">
      {/* Video area */}
      <div className={cn("relative bg-[var(--bg-secondary)] w-full", aspectClass(ratio))}>
        {gen.status === "COMPLETED" && gen.outputUrls[0] ? (
          <video
            src={gen.outputUrls[0]}
            controls
            className="absolute inset-0 w-full h-full object-contain"
            playsInline
          />
        ) : gen.status === "FAILED" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-500 p-4">
            <AlertCircle className="w-8 h-8" />
            <p className="text-xs text-center">{gen.errorMessage ?? "Falha na geração"}</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--color-brand)] border-t-transparent animate-spin" />
              <Film className="absolute inset-0 m-auto w-5 h-5 text-[var(--color-brand)]" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-[var(--text-primary)]">Gerando vídeo…</p>
              {gen.model === "sora-2" && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Sora pode levar 5–20 min</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-3 space-y-2">
        <p className="text-xs text-[var(--text-primary)] line-clamp-2 leading-relaxed">
          {gen.prompt || "—"}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-muted)] font-medium">
              {gen.model}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-muted)]">
              {ratio} · {dur}s
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-muted)]">
              {gen.creditsCost} cr
            </span>
          </div>
          {gen.status === "COMPLETED" && gen.outputUrls[0] && (
            <a
              href={gen.outputUrls[0]}
              download
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AIVideoGeneratorPage() {
  const [videoModel, setVideoModel]         = useState("kling-2.1-pro");
  const [mode, setMode]                     = useState<"text" | "image">("text");
  const [prompt, setPrompt]                 = useState("");
  const [aspectRatio, setAspectRatio]       = useState("16:9");
  const [duration, setDuration]             = useState(5);
  const [refImageUrl, setRefImageUrl]       = useState<string | null>(null);
  const [refImageFile, setRefImageFile]     = useState<File | null>(null);
  const [uploadingRef, setUploadingRef]     = useState(false);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  const {
    generations, isGenerating,
    addGeneration, updateGeneration,
    setIsGenerating, setCurrentId, setPollingRef,
  } = useGenerationStore();

  const { credits, decrementCredits, refreshCredits } = useCreditsStore();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const modelDef    = getVideoModel(videoModel);
  const creditsCost = modelDef?.credits ?? 500;
  const hasEnough   = credits >= creditsCost;

  // Clamp duration to model max
  useEffect(() => {
    if (modelDef && duration > modelDef.maxDuration) {
      setDuration(Math.min(modelDef.maxDuration, 10));
    }
  }, [videoModel, modelDef, duration]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback(
    (generationId: string) => {
      const interval = setInterval(async () => {
        try {
          const res  = await fetch(`/api/generate/${generationId}/status`);
          if (!res.ok) return;
          const data = await res.json() as { status: string; outputUrls?: string[]; error?: string };

          if (data.status === "COMPLETED") {
            stopPolling();
            updateGeneration(generationId, { status: "COMPLETED", outputUrls: data.outputUrls ?? [] });
            setIsGenerating(false);
            setCurrentId(null);
            setPollingRef(null);
            refreshCredits();
            toast.success("Vídeo gerado com sucesso!");
          } else if (data.status === "FAILED") {
            stopPolling();
            updateGeneration(generationId, { status: "FAILED", errorMessage: data.error });
            setIsGenerating(false);
            setCurrentId(null);
            setPollingRef(null);
            refreshCredits();
            toast.error(data.error ?? "Falha na geração. Créditos reembolsados.");
          } else {
            updateGeneration(generationId, { status: "PROCESSING" });
          }
        } catch {
          // keep polling
        }
      }, POLL_INTERVAL);

      pollingRef.current = interval;
      setPollingRef(interval);
    },
    [stopPolling, updateGeneration, setIsGenerating, setCurrentId, setPollingRef, refreshCredits]
  );

  // Upload reference image to get a URL
  async function handleRefImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefImageFile(file);

    // Preview locally
    const localUrl = URL.createObjectURL(file);
    setRefImageUrl(localUrl);

    // Upload to get a public URL
    setUploadingRef(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        setRefImageUrl(url);
      }
    } catch {
      // keep local URL — API will handle upload if needed
    } finally {
      setUploadingRef(false);
    }
  }

  function removeRefImage() {
    setRefImageUrl(null);
    setRefImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerate() {
    if (!prompt.trim() && mode === "text") {
      toast.error("Descreva o que você quer gerar.");
      return;
    }
    if (mode === "image" && !refImageUrl) {
      toast.error("Envie uma imagem de referência.");
      return;
    }
    if (!hasEnough) {
      toast.error(`Créditos insuficientes. Necessário: ${creditsCost} cr`);
      return;
    }

    setIsGenerating(true);
    const optimisticId = `opt-${Date.now()}`;
    const optimistic: GenerationItem = {
      id: optimisticId,
      tool: "VIDEO_GENERATE",
      model: videoModel,
      prompt,
      status: "PENDING",
      outputUrls: [],
      creditsCost,
      createdAt: new Date().toISOString(),
    };
    addGeneration(optimistic);
    decrementCredits(creditsCost);

    try {
      const res = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          videoModel,
          aspectRatio,
          duration,
          ...(mode === "image" && refImageUrl ? { imageUrl: refImageUrl } : {}),
        }),
      });

      const result = await res.json() as { generationId?: string; error?: string };
      if (!res.ok) throw new Error(result.error ?? "Erro ao iniciar geração");

      updateGeneration(optimisticId, { id: result.generationId!, status: "PROCESSING" });
      setCurrentId(result.generationId!);
      startPolling(result.generationId!);
    } catch (err: unknown) {
      stopPolling();
      setIsGenerating(false);
      updateGeneration(optimisticId, { status: "FAILED" });
      refreshCredits();
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  const videoGenerations = generations.filter((g) => g.tool === "VIDEO_GENERATE");
  const availableDurations = modelDef
    ? ALL_DURATIONS.filter((d) => d <= modelDef.maxDuration)
    : [3, 5];

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        breadcrumb={[
          { label: "Ferramentas", href: "/app/tools" },
          { label: "Gerador de Vídeo" },
        ]}
      />

      <div className="flex flex-1 min-h-0">
        {/* ── Left panel ──────────────────────────────────────────────────────── */}
        <GeneratorPanel>
          <div className="p-4 space-y-5">

            {/* Mode toggle */}
            <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
              <button
                onClick={() => setMode("text")}
                disabled={isGenerating}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                  mode === "text"
                    ? "bg-[var(--text-primary)] text-white"
                    : "bg-white text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Texto → Vídeo
              </button>
              <button
                onClick={() => setMode("image")}
                disabled={isGenerating}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-l border-[var(--border-default)]",
                  mode === "image"
                    ? "bg-[var(--text-primary)] text-white"
                    : "bg-white text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                )}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Imagem → Vídeo
              </button>
            </div>

            {/* Reference image (image mode) */}
            {mode === "image" && (
              <section className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  Imagem de Referência
                </label>
                {refImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-[var(--border-default)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={refImageUrl} alt="Ref" className="w-full h-32 object-cover" />
                    {uploadingRef && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                    <button
                      onClick={removeRefImage}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGenerating}
                    className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)]/5 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">Clique para enviar imagem</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleRefImageChange}
                />
              </section>
            )}

            {/* Prompt */}
            <section className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="Descreva o movimento, a cena e o estilo do vídeo…"
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30 focus:border-[var(--color-brand)] placeholder:text-[var(--text-muted)] disabled:opacity-50"
              />
            </section>

            {/* Ad presets */}
            <section className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Criativo de Anúncio
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {AD_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    disabled={isGenerating}
                    onClick={() => setPrompt(preset.prompt)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-colors",
                      prompt === preset.prompt
                        ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5 text-[var(--color-brand)]"
                        : "border-[var(--border-default)] bg-white text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <span className="text-base">{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Format */}
            <section className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Formato
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {FORMAT_PRESETS.map((fmt) => (
                  <button
                    key={fmt.id}
                    disabled={isGenerating}
                    onClick={() => setAspectRatio(fmt.ratio)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-colors",
                      aspectRatio === fmt.ratio
                        ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5 text-[var(--color-brand)]"
                        : "border-[var(--border-default)] bg-white text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <span className="text-base">{fmt.icon}</span>
                    <span>{fmt.label}</span>
                    <span className="text-[10px] opacity-70">{fmt.ratio}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Duration */}
            <section className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Duração
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {availableDurations.map((d) => (
                  <button
                    key={d}
                    onClick={() => !isGenerating && setDuration(d)}
                    disabled={isGenerating}
                    className={cn(
                      "flex-1 min-w-[3rem] h-8 rounded-lg text-xs font-medium border transition-colors",
                      duration === d
                        ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
                        : "border-[var(--border-default)] bg-white text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </section>

            {/* Model */}
            <section className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Modelo de IA
              </label>
              <VideoModelDropdown value={videoModel} onChange={setVideoModel} disabled={isGenerating} />
            </section>

            {/* Generate */}
            <GenerateButton
              onClick={handleGenerate}
              isGenerating={isGenerating}
              creditsCost={creditsCost}
              hasEnoughCredits={hasEnough}
              disabled={mode === "text" ? !prompt.trim() : !refImageUrl}
            />

            {!hasEnough && (
              <p className="text-xs text-center text-[var(--text-muted)]">
                <a href="/pricing" className="text-[var(--color-brand)] hover:underline font-medium">
                  Fazer upgrade
                </a>{" "}
                para continuar gerando
              </p>
            )}
          </div>
        </GeneratorPanel>

        {/* ── Right gallery ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-secondary)]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] bg-white">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Vídeos Gerados</span>
              {videoGenerations.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                  {videoGenerations.length}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {videoGenerations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-[var(--border-default)] flex items-center justify-center">
                  <MousePointerClick className="w-7 h-7 text-[var(--text-muted)]" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Nenhum vídeo ainda</p>
                  <p className="text-xs text-[var(--text-muted)] max-w-xs">
                    Configure o prompt e clique em Gerar para criar seu primeiro vídeo de anúncio
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {FORMAT_PRESETS.map((fmt) => (
                    <span key={fmt.id} className="text-[10px] px-2 py-1 rounded-full border border-[var(--border-default)] text-[var(--text-muted)]">
                      {fmt.icon} {fmt.label} {fmt.ratio}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                {videoGenerations.map((gen) => (
                  <div key={gen.id} className="break-inside-avoid">
                    <VideoCard gen={gen} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
