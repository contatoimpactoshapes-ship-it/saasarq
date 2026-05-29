"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Upload, X, ImagePlus, Send, Copy, Check,
  RefreshCw, Trash2, Sparkles, Zap, Cpu,
  Maximize2, Lightbulb, ScanLine, ChevronRight,
  Clock, FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import type { PromptArchitectResponse } from "@/lib/assistant/prompt-architect";

// ── Types ─────────────────────────────────────────────────────────────────────

type SpaceItem = { id: string; name: string };

type AnalysisItem = {
  id: string;
  spaceId: string | null;
  imageUrl: string | null;
  imageName: string | null;
  prompt: string;
  imageSummary: string | null;
  qualityScore: number;
  recommendedModel: string;
  recommendedAspectRatio: string;
  suggestions: string[];
  createdAt: string;
  space: { id: string; name: string } | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES     = 5 * 1024 * 1024;

const STARTERS = [
  "Analise a referência e converta para prompt fotográfico",
  "Interior moderno com iluminação difusa e materiais naturais",
  "Fachada contemporânea brasileira ao entardecer",
  "Escritório open-space, concreto exposto, luz zenital",
];

const MODEL_TO_ID: Record<string, string> = {
  "Nano Banana Pro": "nano-banana-pro",
  "Nano Banana 2":   "nano-banana-2",
  "Flux Pro":        "flux2-pro",
  "Recraft":         "recraft-v4-1",
  "Luma Uni":        "luma-uni-1",
};

const RATIO_REMAP: Record<string, string> = { "4:5": "3:4", "3:2": "4:3" };
function remapRatio(r: string): string { return RATIO_REMAP[r] ?? r; }

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreStyle(score: number) {
  if (score >= 80) return { num: "text-emerald-600", bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "Excellent" };
  if (score >= 50) return { num: "text-amber-500",   bar: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border border-amber-200",   label: "Adequate" };
  return           { num: "text-rose-500",    bar: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border border-rose-200",     label: "Limited"  };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-100 bg-zinc-50/80">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function QualityScore({ score }: { score: number }) {
  const s = scoreStyle(score);
  return (
    <div className="bg-white border border-zinc-200/80 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Architectural Quality Score</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
      </div>
      <div className="flex items-end gap-1.5 mb-3">
        <span className={`text-5xl font-bold leading-none tabular-nums ${s.num}`}>{score}</span>
        <span className="text-lg text-zinc-300 font-light mb-0.5">/100</span>
      </div>
      <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${s.bar} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="mt-3 flex gap-3 text-[10px] text-zinc-400">
        <span>Fidelidade</span><span>·</span>
        <span>Materiais</span><span>·</span>
        <span>Iluminação</span><span>·</span>
        <span>Composição</span><span>·</span>
        <span>Realismo</span>
      </div>
    </div>
  );
}

function RecommendationsPanel({ model, aspectRatio }: { model: string; aspectRatio: string }) {
  return (
    <Section label="Recommendations">
      <div className="space-y-2">
        <div className="flex items-center justify-between py-2 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-400">Model</span>
          </div>
          <span className="text-xs font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-md">{model}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-400">Aspect Ratio</span>
          </div>
          <span className="text-xs font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-md font-mono">{aspectRatio}</span>
        </div>
      </div>
    </Section>
  );
}

function StudioResults({
  result,
  onRefine,
  onClear,
}: {
  result: PromptArchitectResponse;
  onRefine: (prompt: string) => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function copyPrompt() {
    navigator.clipboard.writeText(result.prompt).then(() => {
      setCopied(true);
      toast.success("Prompt copiado para a área de transferência.");
      setTimeout(() => setCopied(false), 2200);
    });
  }

  function deployToWorkspace() {
    const modelId = MODEL_TO_ID[result.recommendedModel] ?? "auto";
    const ratio   = remapRatio(result.recommendedAspectRatio);
    router.push(
      `/app/ai-image-generator?prompt=${encodeURIComponent(result.prompt)}&model=${encodeURIComponent(modelId)}&aspectRatio=${encodeURIComponent(ratio)}`
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 space-y-4 max-w-2xl"
    >
      <QualityScore score={result.qualityScore} />

      {result.imageSummary && (
        <Section label="Detected Elements">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {["Ambiente", "Materiais", "Iluminação"].map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <ScanLine className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">{result.imageSummary}</p>
          </div>
        </Section>
      )}

      <RecommendationsPanel model={result.recommendedModel} aspectRatio={result.recommendedAspectRatio} />

      <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 bg-zinc-50/80">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Generated Prompt</span>
          <button
            onClick={copyPrompt}
            className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {copied
              ? <><Check className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">Copied</span></>
              : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs font-mono text-zinc-700 leading-relaxed whitespace-pre-wrap break-words selection:bg-indigo-100">
            {result.prompt}
          </p>
        </div>
      </div>

      {result.suggestions.length > 0 && (
        <Section label="Refinement Suggestions">
          <ul className="space-y-2.5">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-[10px] font-bold text-zinc-300 tabular-nums shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-600 leading-relaxed">{s}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={copyPrompt}
          className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 transition-all font-medium"
        >
          <Copy className="w-3 h-3" />Copiar prompt
        </button>
        <button
          onClick={deployToWorkspace}
          className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors font-medium"
        >
          <Zap className="w-3 h-3" />Deploy to Workspace
          <ChevronRight className="w-3 h-3 opacity-60" />
        </button>
        <button
          onClick={() => onRefine(result.prompt)}
          className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 transition-all font-medium"
        >
          <RefreshCw className="w-3 h-3" />Refinar
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg border border-red-100 bg-white text-red-400 hover:bg-red-50 hover:border-red-200 transition-all font-medium"
        >
          <Trash2 className="w-3 h-3" />Limpar
        </button>
      </div>
    </motion.div>
  );
}

function AnalyzingSkeleton() {
  return (
    <div className="p-6 space-y-4 max-w-2xl animate-pulse">
      <div className="bg-white border border-zinc-200/80 rounded-xl p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-2.5 w-40 bg-zinc-100 rounded" />
          <div className="h-2.5 w-16 bg-zinc-100 rounded-full" />
        </div>
        <div className="h-10 w-24 bg-zinc-100 rounded" />
        <div className="h-1 w-full bg-zinc-100 rounded-full" />
      </div>
      {[120, 80, 160].map((h, i) => (
        <div key={i} className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden">
          <div className="h-9 bg-zinc-50 border-b border-zinc-100" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-full bg-zinc-100 rounded" />
            <div className={`h-3 ${h < 100 ? "w-2/3" : "w-5/6"} bg-zinc-100 rounded`} />
            {h > 100 && <div className="h-3 w-3/4 bg-zinc-100 rounded" />}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <div className="h-8 w-28 bg-zinc-100 rounded-lg" />
        <div className="h-8 w-40 bg-zinc-900/10 rounded-lg" />
      </div>
    </div>
  );
}

// ── History item ──────────────────────────────────────────────────────────────

function HistoryItem({
  item,
  active,
  onClick,
  onDelete,
}: {
  item: AnalysisItem;
  active: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const s = scoreStyle(item.qualityScore);
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left rounded-lg px-2.5 py-2 transition-all hover:bg-zinc-100 ${active ? "bg-zinc-100 ring-1 ring-zinc-300" : ""}`}
    >
      <div className="flex items-start gap-2">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="w-8 h-8 rounded object-cover shrink-0 bg-zinc-200"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-zinc-100 shrink-0 flex items-center justify-center">
            <ScanLine className="w-3 h-3 text-zinc-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-zinc-700 leading-snug line-clamp-2 break-words">
            {item.prompt.slice(0, 80)}{item.prompt.length > 80 ? "…" : ""}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[9px] font-bold tabular-nums ${s.num}`}>{item.qualityScore}</span>
            <span className="text-[9px] text-zinc-300">·</span>
            <span className="text-[9px] text-zinc-400">{item.recommendedModel}</span>
            <span className="text-[9px] text-zinc-300">·</span>
            <span className="text-[9px] text-zinc-400">{relativeTime(item.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-zinc-400 hover:text-red-500"
          title="Excluir"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </button>
  );
}

// ── Space selector ────────────────────────────────────────────────────────────

function SpaceSelector({
  spaces,
  value,
  onChange,
}: {
  spaces: SpaceItem[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100">
      <FolderOpen className="w-3 h-3 text-zinc-400 shrink-0" />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="flex-1 text-[11px] text-zinc-600 bg-transparent border-none outline-none cursor-pointer truncate"
      >
        <option value="">Todos os spaces</option>
        {spaces.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const router = useRouter();

  // Pending input
  const [pendingImage,   setPendingImage]   = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Studio state
  const [studioImage,     setStudioImage]     = useState<string | null>(null);
  const [studioImageName, setStudioImageName] = useState<string>("");
  const [studioResult,    setStudioResult]    = useState<PromptArchitectResponse | null>(null);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  // Persistence state
  const [spaces,          setSpaces]          = useState<SpaceItem[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [history,         setHistory]         = useState<AnalysisItem[]>([]);
  const [historyLoading,  setHistoryLoading]  = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  const hasStudio = studioResult !== null || loading;

  // ── Load spaces ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/spaces")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (Array.isArray(data)) setSpaces(data as SpaceItem[]);
      })
      .catch(console.error);
  }, []);

  // ── Load history ─────────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const qs  = selectedSpaceId ? `spaceId=${selectedSpaceId}&limit=30` : "limit=30";
      const res = await fetch(`/api/assistant/analyses?${qs}`);
      if (!res.ok) return;
      const data = await res.json() as { analyses?: AnalysisItem[] };
      setHistory(data.analyses ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedSpaceId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Image handling ───────────────────────────────────────────────────────────

  const applyImage = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo não suportado. Use JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande. Máximo: 5 MB.");
      return;
    }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingImage(file);
    setPendingPreview(URL.createObjectURL(file));
  }, [pendingPreview]);

  function removePending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingImage(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) applyImage(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyImage(file);
  }

  // ── Save analysis ─────────────────────────────────────────────────────────────

  async function saveAnalysis(
    result: PromptArchitectResponse,
    imageFile: File | null,
    imageName: string,
  ) {
    try {
      const form = new FormData();
      if (selectedSpaceId) form.append("spaceId", selectedSpaceId);
      form.append("prompt",                result.prompt);
      form.append("qualityScore",          String(result.qualityScore));
      form.append("recommendedModel",      result.recommendedModel);
      form.append("recommendedAspectRatio", result.recommendedAspectRatio);
      form.append("suggestions",           JSON.stringify(result.suggestions));
      if (result.imageSummary) form.append("imageSummary", result.imageSummary);
      if (imageFile)           form.append("image",        imageFile);
      if (imageName)           form.append("imageName",    imageName);

      const res = await fetch("/api/assistant/analyses", { method: "POST", body: form });
      if (!res.ok) return;
      const data = await res.json() as { analysis: AnalysisItem };
      const saved = data.analysis;
      setHistory((prev) => [saved, ...prev]);
      setActiveAnalysisId(saved.id);
    } catch (e) {
      console.error("[saveAnalysis]", e);
    }
  }

  // ── Analyze ──────────────────────────────────────────────────────────────────

  async function handleAnalyze(text = input) {
    const content    = text.trim();
    const imageFile  = pendingImage;
    const previewUrl = pendingPreview;
    const imageName  = pendingImage?.name ?? "";

    if ((!content && !imageFile) || loading) return;

    setStudioImage(previewUrl);
    setStudioImageName(imageName);
    setPendingImage(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setInput("");
    setLoading(true);
    setStudioResult(null);
    setActiveAnalysisId(null);

    try {
      const form = new FormData();
      form.append("mode", imageFile ? "image_to_prompt" : "chat");
      if (content)   form.append("message", content);
      if (imageFile) form.append("image",   imageFile);

      const res = await fetch("/api/assistant/prompt-architect", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const result = await res.json() as PromptArchitectResponse;
      setStudioResult(result);

      // Fire-and-forget save (does not block UI)
      saveAnalysis(result, imageFile, imageName).catch(console.error);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao analisar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleRefine(prompt: string) {
    setInput(`Refine e aprofunde este prompt, mantendo a arquitetura original: ${prompt}`);
    textareaRef.current?.focus();
  }

  function handleClear() {
    if (studioImage?.startsWith("blob:")) URL.revokeObjectURL(studioImage);
    setStudioImage(null);
    setStudioImageName("");
    setStudioResult(null);
    setActiveAnalysisId(null);
    removePending();
    setInput("");
  }

  // ── Restore from history ──────────────────────────────────────────────────────

  function restoreAnalysis(item: AnalysisItem) {
    if (studioImage?.startsWith("blob:")) URL.revokeObjectURL(studioImage);
    setStudioImage(item.imageUrl);
    setStudioImageName(item.imageName ?? "");
    setStudioResult({
      prompt:                 item.prompt,
      imageSummary:           item.imageSummary,
      qualityScore:           item.qualityScore,
      recommendedModel:       item.recommendedModel,
      recommendedAspectRatio: item.recommendedAspectRatio,
      suggestions:            item.suggestions,
    });
    setActiveAnalysisId(item.id);
    setLoading(false);
  }

  async function deleteAnalysis(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/assistant/analyses/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao excluir análise."); return; }
    } catch {
      toast.error("Erro de rede ao excluir análise.");
      return;
    }
    setHistory((prev) => prev.filter((a) => a.id !== id));
    if (activeAnalysisId === id) handleClear();
  }

  // ── Upload zone ───────────────────────────────────────────────────────────────

  const uploadZone = (compact = false) => (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        relative cursor-pointer border-2 border-dashed rounded-xl transition-all
        flex flex-col items-center justify-center gap-2 text-center
        ${compact ? "py-5 px-3" : "py-10 px-6"}
        ${dragOver
          ? "border-zinc-400 bg-zinc-50"
          : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/50"}
      `}
    >
      {pendingPreview ? (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingPreview} alt="Preview" className={`${compact ? "h-20" : "h-32"} w-auto rounded-lg object-cover`} />
          <button
            onClick={(e) => { e.stopPropagation(); removePending(); }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
          <p className="mt-1.5 text-[10px] text-zinc-400 truncate max-w-[120px]">{pendingImage?.name}</p>
        </div>
      ) : (
        <>
          <div className={`${compact ? "w-8 h-8" : "w-10 h-10"} rounded-xl bg-zinc-100 flex items-center justify-center`}>
            <ImagePlus className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-zinc-400`} />
          </div>
          {!compact && (
            <>
              <p className="text-sm font-medium text-zinc-600">Drop reference image here</p>
              <p className="text-xs text-zinc-400">JPG, PNG, WebP, GIF — max 5 MB</p>
            </>
          )}
          {compact && <p className="text-xs text-zinc-400">Upload reference</p>}
        </>
      )}
    </div>
  );

  // ── Input bar ─────────────────────────────────────────────────────────────────

  const inputBar = (
    <div className="flex items-end gap-2 p-1.5 rounded-xl border border-zinc-200 bg-white focus-within:border-zinc-400 transition-colors">
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Upload reference image"
        className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
      >
        <Upload className="w-3.5 h-3.5" />
      </button>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAnalyze(); }
        }}
        placeholder={pendingImage ? "Add instructions or analyze directly…" : "Describe the space or upload a reference…"}
        rows={1}
        disabled={loading}
        className="flex-1 resize-none bg-transparent px-1 py-1 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none max-h-24 overflow-y-auto"
      />
      <button
        onClick={() => handleAnalyze()}
        disabled={(!input.trim() && !pendingImage) || loading}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
      >
        <Send className="w-3 h-3" />
      </button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
      <TopBar breadcrumb={[{ label: "Prompt Architect" }]} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
      />

      <AnimatePresence mode="wait">
        {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
        {!hasStudio && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex-1 flex min-h-0"
          >
            {/* Left: history sidebar */}
            <aside className="w-64 shrink-0 border-r border-zinc-200 flex flex-col bg-white">
              <SpaceSelector
                spaces={spaces}
                value={selectedSpaceId}
                onChange={setSelectedSpaceId}
              />
              <div className="px-3 py-2 border-b border-zinc-100 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">History</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {historyLoading ? (
                  <div className="space-y-2 p-2 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-zinc-100 rounded-lg" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                    <p className="text-xs text-zinc-400">Nenhuma análise salva.</p>
                    <p className="text-[10px] text-zinc-300 mt-1">As análises aparecem aqui.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      active={activeAnalysisId === item.id}
                      onClick={() => restoreAnalysis(item)}
                      onDelete={(e) => deleteAnalysis(item.id, e)}
                    />
                  ))
                )}
              </div>
            </aside>

            {/* Right: main empty state */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
              <div className="w-full max-w-lg space-y-5">
                <div className="text-center space-y-1.5">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-900 mb-3">
                    <ScanLine className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Prompt Architect Studio</h1>
                  <p className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
                    Upload an architectural reference — the engine converts it into a professional photorealistic prompt.
                  </p>
                </div>
                {uploadZone(false)}
                <div className="grid grid-cols-2 gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleAnalyze(s)}
                      disabled={loading}
                      className="text-left px-3 py-2.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 transition-all text-xs text-zinc-600 disabled:opacity-40"
                    >
                      <Sparkles className="w-3 h-3 text-zinc-400 inline mr-1.5 mb-0.5" />
                      {s}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {inputBar}
                  <p className="text-center text-[10px] text-zinc-400">
                    Enter to analyze · Shift+Enter for new line · upload icon for image
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STUDIO STATE ─────────────────────────────────────────────────── */}
        {hasStudio && (
          <motion.div
            key="studio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex min-h-0"
          >
            {/* LEFT: Reference + history */}
            <aside className="w-64 shrink-0 border-r border-zinc-200 flex flex-col bg-white">
              <SpaceSelector
                spaces={spaces}
                value={selectedSpaceId}
                onChange={setSelectedSpaceId}
              />

              {/* Reference image */}
              <div className="px-3 pt-3 pb-2">
                {studioImage ? (
                  <div className="space-y-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={studioImage}
                      alt="Reference"
                      className="w-full rounded-xl object-cover aspect-[4/3] bg-zinc-100"
                    />
                    {studioImageName && (
                      <p className="text-[10px] text-zinc-400 truncate">{studioImageName}</p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200 border-dashed flex items-center justify-center aspect-[4/3]">
                    <p className="text-xs text-zinc-400">Text analysis</p>
                  </div>
                )}
                <div className="mt-2">{uploadZone(true)}</div>
              </div>

              {/* History section */}
              <div className="px-3 py-2 border-t border-b border-zinc-100 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">History</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {historyLoading ? (
                  <div className="space-y-2 p-1 animate-pulse">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-zinc-100 rounded-lg" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 text-center py-4">Sem análises salvas.</p>
                ) : (
                  history.map((item) => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      active={activeAnalysisId === item.id}
                      onClick={() => restoreAnalysis(item)}
                      onDelete={(e) => deleteAnalysis(item.id, e)}
                    />
                  ))
                )}
              </div>

              {/* Input at bottom */}
              <div className="p-3 border-t border-zinc-100 space-y-1.5">
                {inputBar}
                <p className="text-[10px] text-zinc-400 text-center leading-tight">Enter to re-analyze</p>
              </div>
            </aside>

            {/* RIGHT: Analysis results */}
            <main className="flex-1 overflow-y-auto bg-zinc-50/60">
              {loading ? <AnalyzingSkeleton /> : studioResult ? (
                <StudioResults result={studioResult} onRefine={handleRefine} onClear={handleClear} />
              ) : null}
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
