"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Upload, X, Plus, Image as ImageIcon,
  Loader2, AlertCircle, Download, ArrowRight, ChevronDown,
  ZoomIn, ZoomOut, RotateCcw, GripVertical, RefreshCw, Cpu,
  MousePointerClick, Hand, MousePointer, Trash2, Paintbrush,
} from "lucide-react";
import { ImageEditor } from "@/components/tools/ImageEditor";
import { WorkflowEditor } from "@/components/workflow/WorkflowEditor";
import { TopBar } from "@/components/layout/TopBar";
import { GeneratorPanel } from "@/components/tools/GeneratorPanel";
import { GalleryPanel } from "@/components/tools/GalleryPanel";
import { ModelSelector } from "@/components/tools/ModelSelector";
import { PromptInput } from "@/components/tools/PromptInput";
import { AspectRatioPicker } from "@/components/tools/AspectRatioPicker";
import { QuantityPicker } from "@/components/tools/QuantityPicker";
import { GenerateButton } from "@/components/tools/GenerateButton";
import { InsufficientCreditsModal } from "@/components/economy/InsufficientCreditsModal";
import { LowBalanceWarning } from "@/components/economy/LowBalanceWarning";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { getImageModel } from "@/lib/models";
import { PLAN_CREDITS } from "@/lib/plans";
import { useRouter } from "next/navigation";

const POLL_INTERVAL = 2000;
const RENDER_CREDIT_COST = 120;

const SUGGESTIONS = [
  "Modern living room, floor-to-ceiling windows, marble floors, warm lighting",
  "Contemporary kitchen with island, pendant lights, high-gloss cabinets",
  "Minimalist bedroom, natural materials, indirect lighting, architectural interior",
  "Open office, exposed concrete, industrial design, natural light",
];

// ── AI model options ───────────────────────────────────────────────────────────
const RENDER_AI_MODELS = [
  { id: "render-flux-dev",         name: "Flux Dev",          desc: "Black Forest Labs · rápido",      group: "Flux" },
  { id: "render-flux-kontext-dev", name: "Flux Kontext Dev",  desc: "Edição contextual · open",        group: "Flux" },
  { id: "render-flux-kontext-pro", name: "Flux Kontext Pro",  desc: "Edição contextual · premium",     group: "Flux" },
  { id: "render-flux-pro",         name: "Flux Pro Redux",    desc: "Pipeline Redux · fiel ao estilo", group: "Flux" },
  { id: "render-nano-banana",      name: "Nano Banana",       desc: "Google · $0.039/img",             group: "Google" },
  { id: "render-nano-banana-2",    name: "Nano Banana 2",     desc: "Google Gemini · $0.08/img",       group: "Google" },
  { id: "render-nano-banana-pro",  name: "Nano Banana Pro",   desc: "Google premium · $0.15/img",      group: "Google" },
  { id: "render-ideogram",         name: "Ideogram V2",       desc: "Alta fidelidade",                 group: "Ideogram" },
  { id: "render-ideogram-v3",      name: "Ideogram V3",       desc: "Última versão · $0.09/img",       group: "Ideogram" },
  { id: "render-qwen-pro",         name: "Qwen Image Pro",    desc: "Alibaba · produção · $0.075/img", group: "Alibaba" },
  { id: "render-gpt-image-2",      name: "GPT Image 2",       desc: "OpenAI · edição precisa",         group: "OpenAI" },
  { id: "render-sdxl",             name: "SDXL 1.0",          desc: "Stability AI · clássico",         group: "Stability" },
];

// ── Node interface ─────────────────────────────────────────────────────────────
interface UploadedRender {
  id: string;
  file: File;
  previewUrl: string;
  falUrl?: string;
  uploading?: boolean;
  label: string;
  nodeX: number;
  nodeY: number;
  nodePrompt: string;
}

// ── Main component ─────────────────────────────────────────────────────────────
function AIImageGeneratorInner() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "render3d" ? "render3d" : "text";
  const [mode, setMode] = useState<"text" | "render3d">(initialMode);

  // ── Text mode state ──────────────────────────────────────────
  const [model, setModel]           = useState(searchParams.get("model") ?? "auto");
  const [prompt, setPrompt]         = useState(searchParams.get("prompt") ?? "");
  const [aspectRatio, setAspectRatio] = useState(searchParams.get("aspectRatio") ?? "1:1");
  const [quantity, setQuantity]     = useState(1);

  // ── Render mode state ────────────────────────────────────────
  const [renders, setRenders]   = useState<UploadedRender[]>([]);
  const [jobMap, setJobMap]     = useState<Record<string, string[]>>({});

  // ── Per-node selection ───────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // ── Global rendering parameters ──────────────────────────────
  const [renderModel, setRenderModel] = useState(searchParams.get("renderModel") ?? "render-flux-dev");
  const [strength, setStrength]       = useState(0.82);
  const [numOutputs, setNumOutputs]   = useState(1);

  // ── Canvas tool (Select = V, Hand = H) ───────────────────────
  const [canvasTool, setCanvasTool] = useState<"select" | "hand">("select");

  // ── UI state ─────────────────────────────────────────────────
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [lightboxUrl, setLightboxUrl]     = useState<string | null>(null);
  const [editorUrl, setEditorUrl]         = useState<string | null>(null);
  const [zoom, setZoom]                   = useState(1);

  // ── Node drag state (select tool) ────────────────────────────
  const [draggingId, setDraggingId]           = useState<string | null>(null);
  const [dragNodeOffset, setDragNodeOffset]   = useState({ x: 0, y: 0 });

  // ── Canvas pan state (hand tool) ─────────────────────────────
  const [isPanning, setIsPanning]             = useState(false);
  const [panStartMouse, setPanStartMouse]     = useState({ x: 0, y: 0 });
  const [panStartScroll, setPanStartScroll]   = useState({ left: 0, top: 0 });

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const canvasWrapRef  = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<HTMLDivElement>(null);

  const {
    generations, isGenerating,
    addGeneration, updateGeneration, removeGeneration,
    setIsGenerating, setCurrentId, setPollingRef,
  } = useGenerationStore();
  const { credits, plan, decrementCredits, refreshCredits } = useCreditsStore();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const [creditsModal, setCreditsModal] = useState({ open: false, required: 0, current: 0 });

  // ── Derived ──────────────────────────────────────────────────
  const selectedTextModel    = getImageModel(model);
  const creditsCost          = (selectedTextModel?.credits ?? 50) * quantity;
  const hasEnoughCreditsText = credits >= creditsCost;
  const planAllocation       = PLAN_CREDITS[plan as keyof typeof PLAN_CREDITS] ?? 0;
  const readyRenders         = renders.filter((r) => r.falUrl && !r.uploading);
  const uploadingCount       = renders.filter((r) => r.uploading).length;
  const selectedNode         = renders.find((r) => r.id === selectedNodeId) ?? null;
  const currentRenderAI      = RENDER_AI_MODELS.find((m) => m.id === renderModel) ?? RENDER_AI_MODELS[0];

  // ── Canvas dimensions ────────────────────────────────────────
  const canvasDims = renders.length > 0
    ? {
        w: Math.max(1600, Math.max(...renders.map((r) => r.nodeX + 100 + 208 + 64 + 2 * 192))),
        h: Math.max(900,  Math.max(...renders.map((r) => {
          const slots = jobMap[r.id]?.length || numOutputs;
          return r.nodeY + Math.max(300, Math.ceil(slots / 2) * 164 + 60);
        }))),
      }
    : { w: 1600, h: 900 };

  // ── Update selected node prompt ──────────────────────────────
  function updateNodePrompt(id: string, nodePrompt: string) {
    setRenders((prev) => prev.map((r) => r.id === id ? { ...r, nodePrompt } : r));
  }

  // ── Ctrl+scroll zoom ─────────────────────────────────────────
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el || mode !== "render3d") return;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom((z) => Math.min(2, Math.max(0.3, Math.round((z + delta) * 10) / 10)));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [mode]);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA";

      if (e.key === "Escape") { setLightboxUrl(null); setSelectedNodeId(null); }
      if (e.ctrlKey && e.key === "0") { e.preventDefault(); setZoom(1); }
      if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault(); setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10));
      }
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault(); setZoom((z) => Math.max(0.3, Math.round((z - 0.1) * 10) / 10));
      }
      // Tool shortcuts — only when not typing
      if (!isTyping && (e.key === "h" || e.key === "H")) setCanvasTool("hand");
      if (!isTyping && (e.key === "v" || e.key === "V")) setCanvasTool("select");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Polling helpers ───────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);
  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback((generationId: string) => {
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`/api/generate/${generationId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "COMPLETED") {
          stopPolling();
          updateGeneration(generationId, { status: "COMPLETED", outputUrls: data.outputUrls ?? [] });
          setIsGenerating(false); setCurrentId(null); setPollingRef(null);
          refreshCredits(); toast.success("Geração concluída!");
        } else if (data.status === "FAILED") {
          stopPolling();
          updateGeneration(generationId, { status: "FAILED", errorMessage: data.error });
          setIsGenerating(false); setCurrentId(null); setPollingRef(null);
          refreshCredits(); toast.error(data.error ?? "Falha na geração. Créditos reembolsados.");
        } else {
          updateGeneration(generationId, { status: "PROCESSING" });
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL);
    pollingRef.current = interval;
    setPollingRef(interval);
  }, [stopPolling, updateGeneration, setIsGenerating, setCurrentId, setPollingRef, refreshCredits]);

  const startBatchPolling = useCallback((generationIds: string[]) => {
    const pending = new Set(generationIds);
    const interval = setInterval(async () => {
      await Promise.allSettled(
        Array.from(pending).map(async (id) => {
          try {
            const res  = await fetch(`/api/generate/${id}/status`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.status === "COMPLETED") {
              pending.delete(id);
              updateGeneration(id, { status: "COMPLETED", outputUrls: data.outputUrls ?? [] });
            } else if (data.status === "FAILED") {
              pending.delete(id);
              updateGeneration(id, { status: "FAILED", errorMessage: data.error });
              toast.error(data.error ?? "Falha na renderização. Créditos reembolsados.");
            }
          } catch { /* keep polling */ }
        })
      );
      if (pending.size === 0) {
        clearInterval(interval); pollingRef.current = null;
        setPollingRef(null); setIsGenerating(false); setCurrentId(null);
        refreshCredits(); toast.success("Renderizações concluídas!");
      }
    }, POLL_INTERVAL);
    pollingRef.current = interval;
    setPollingRef(interval);
  }, [updateGeneration, setIsGenerating, setCurrentId, setPollingRef, refreshCredits]);

  // ── Text → Image ─────────────────────────────────────────────
  async function handleGenerateText() {
    if (!prompt.trim()) { toast.error("Descreva o que você quer gerar."); return; }
    if (!hasEnoughCreditsText) {
      setCreditsModal({ open: true, required: creditsCost, current: credits });
      return;
    }
    setIsGenerating(true);
    const optimisticId = `opt-${Date.now()}`;
    addGeneration({ id: optimisticId, tool: "IMAGE_GENERATE", model, prompt, status: "PENDING", outputUrls: [], creditsCost, createdAt: new Date().toISOString() });
    decrementCredits(creditsCost);
    try {
      const res    = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, aspectRatio, numImages: quantity }),
      });
      const result = await res.json() as { generationId?: string; error?: string; code?: string; required?: number; current?: number; };
      if (!res.ok) {
        if (result.code === "INSUFFICIENT_CREDITS") {
          setIsGenerating(false);
          updateGeneration(optimisticId, { status: "FAILED" });
          refreshCredits();
          setCreditsModal({ open: true, required: result.required ?? creditsCost, current: result.current ?? credits });
          return;
        }
        throw new Error(result.error ?? "Erro ao iniciar geração");
      }
      updateGeneration(optimisticId, { id: result.generationId!, status: "PROCESSING" });
      setCurrentId(result.generationId!);
      startPolling(result.generationId!);
    } catch (err: unknown) {
      stopPolling(); setIsGenerating(false);
      updateGeneration(optimisticId, { status: "FAILED" });
      refreshCredits();
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  // ── File upload ───────────────────────────────────────────────
  async function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const newRenders: UploadedRender[] = [];
    let newIdx = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name}: apenas imagens`); continue; }
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name}: máx 20MB`); continue; }
      if (renders.length + newRenders.length >= 8) { toast.error("Máximo de 8 imagens"); break; }
      newRenders.push({
        id:         `r-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        uploading:  true,
        label:      file.name.replace(/\.[^/.]+$/, ""),
        nodeX:      48,
        nodeY:      48 + (renders.length + newIdx) * 280,
        nodePrompt: "",
      });
      newIdx++;
    }
    if (!newRenders.length) return;
    setRenders((prev) => [...prev, ...newRenders]);
    if (newRenders.length > 0) setSelectedNodeId(newRenders[0].id);
    for (const render of newRenders) {
      try {
        const fd = new FormData();
        fd.append("file", render.file);
        const res  = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setRenders((prev) =>
          prev.map((r) => r.id === render.id ? { ...r, falUrl: data.url, uploading: false } : r)
        );
      } catch {
        setRenders((prev) => prev.filter((r) => r.id !== render.id));
        toast.error(`Falha ao enviar ${render.label}`);
      }
    }
  }

  function removeRender(id: string) {
    setRenders((prev) => {
      const r = prev.find((r) => r.id === id);
      if (r) URL.revokeObjectURL(r.previewUrl);
      return prev.filter((r) => r.id !== id);
    });
    setJobMap((prev) => { const next = { ...prev }; delete next[id]; return next; });
    if (selectedNodeId === id) setSelectedNodeId(null);
  }

  // ── Delete a single generated output ─────────────────────────
  function handleDeleteOutput(renderId: string, genId: string) {
    removeGeneration(genId);
    setJobMap((prev) => {
      const next = { ...prev };
      next[renderId] = (next[renderId] ?? []).filter((id) => id !== genId);
      return next;
    });
  }

  // ── Execute render jobs ───────────────────────────────────────
  async function executeRenderJobs(targets: UploadedRender[]) {
    if (!targets.length) return;
    setIsGenerating(true);
    decrementCredits(RENDER_CREDIT_COST * targets.length * numOutputs);
    const allIds: string[] = [];
    const newJobMap: Record<string, string[]> = {};
    for (const render of targets) {
      newJobMap[render.id] = [];
      for (let i = 0; i < numOutputs; i++) {
        const optId = `opt-${Date.now()}-${render.id}-${i}`;
        addGeneration({ id: optId, tool: "IMAGE_EDIT", model: renderModel, prompt: render.nodePrompt || render.label, status: "PENDING", outputUrls: [], creditsCost: RENDER_CREDIT_COST, createdAt: new Date().toISOString() });
        try {
          const res    = await fetch("/api/generate/render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl:    render.falUrl,
              prompt:      render.nodePrompt,
              style:       "custom",
              strength,
              renderModel,
            }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error ?? "Erro ao renderizar");
          updateGeneration(optId, { id: result.generationId, status: "PROCESSING" });
          newJobMap[render.id].push(result.generationId);
          allIds.push(result.generationId);
        } catch (err: unknown) {
          updateGeneration(optId, { status: "FAILED" });
          toast.error(err instanceof Error ? err.message : "Erro ao renderizar");
        }
      }
    }
    if (!allIds.length) { setIsGenerating(false); refreshCredits(); return; }
    setJobMap((prev) => {
      const merged = { ...prev };
      for (const [k, v] of Object.entries(newJobMap)) {
        merged[k] = [...(merged[k] ?? []), ...v];
      }
      return merged;
    });
    setCurrentId(allIds[0]);
    startBatchPolling(allIds);
  }

  async function handleGenerateRender() {
    const pending = renders.filter((r) => r.falUrl && !r.uploading && !(jobMap[r.id]?.length > 0));
    if (!pending.length) {
      toast.info("Todas as imagens já foram renderizadas. Use o botão individual para gerar variações.");
      return;
    }
    const cost = RENDER_CREDIT_COST * pending.length * numOutputs;
    if (credits < cost) {
      setCreditsModal({ open: true, required: cost, current: credits });
      return;
    }
    await executeRenderJobs(pending);
  }

  async function handleGenerateRow(render: UploadedRender) {
    if (!render.falUrl || render.uploading) return;
    const cost = RENDER_CREDIT_COST * numOutputs;
    if (credits < cost) {
      setCreditsModal({ open: true, required: cost, current: credits });
      return;
    }
    await executeRenderJobs([render]);
  }

  async function handleRerender(render: UploadedRender) {
    if (!render.falUrl) return;
    const optId = `opt-${Date.now()}-rerender`;
    addGeneration({ id: optId, tool: "IMAGE_EDIT", model: renderModel, prompt: "Re-render", status: "PENDING", outputUrls: [], creditsCost: RENDER_CREDIT_COST, createdAt: new Date().toISOString() });
    decrementCredits(RENDER_CREDIT_COST);
    try {
      const res    = await fetch("/api/generate/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl:    render.falUrl,
          prompt:      render.nodePrompt,
          style:       "custom",
          strength,
          renderModel,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Erro ao re-renderizar");
      updateGeneration(optId, { id: result.generationId, status: "PROCESSING" });
      setJobMap((prev) => ({ ...prev, [render.id]: [...(prev[render.id] ?? []), result.generationId] }));
      const genId = result.generationId;
      const iv    = setInterval(async () => {
        try {
          const r = await fetch(`/api/generate/${genId}/status`);
          if (!r.ok) return;
          const d = await r.json();
          if (d.status === "COMPLETED") {
            clearInterval(iv);
            updateGeneration(genId, { status: "COMPLETED", outputUrls: d.outputUrls ?? [] });
            refreshCredits(); toast.success("Re-render concluído!");
          } else if (d.status === "FAILED") {
            clearInterval(iv);
            updateGeneration(genId, { status: "FAILED", errorMessage: d.error });
            refreshCredits(); toast.error("Falha no re-render.");
          }
        } catch { /* keep polling */ }
      }, POLL_INTERVAL);
    } catch (err) {
      updateGeneration(optId, { status: "FAILED" });
      refreshCredits();
      toast.error(err instanceof Error ? err.message : "Erro ao re-renderizar");
    }
  }

  // ── Node drag (select tool only) ─────────────────────────────
  function handleNodeMouseDown(e: React.MouseEvent, render: UploadedRender) {
    if (canvasTool !== "select") return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasInnerRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setDragNodeOffset({
      x: (e.clientX - rect.left) / zoom - render.nodeX,
      y: (e.clientY - rect.top)  / zoom - render.nodeY,
    });
    setDraggingId(render.id);
  }

  // ── Canvas pan (hand tool) ─────────────────────────────────────
  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (canvasTool !== "hand") return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea")) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStartMouse({ x: e.clientX, y: e.clientY });
    const wrapper = canvasWrapRef.current;
    if (wrapper) setPanStartScroll({ left: wrapper.scrollLeft, top: wrapper.scrollTop });
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (isPanning && canvasTool === "hand") {
      const wrapper = canvasWrapRef.current;
      if (!wrapper) return;
      wrapper.scrollLeft = panStartScroll.left - (e.clientX - panStartMouse.x);
      wrapper.scrollTop  = panStartScroll.top  - (e.clientY - panStartMouse.y);
      return;
    }
    if (!draggingId) return;
    const canvas = canvasInnerRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const newX = Math.max(0, (e.clientX - rect.left) / zoom - dragNodeOffset.x);
    const newY = Math.max(0, (e.clientY - rect.top)  / zoom - dragNodeOffset.y);
    setRenders((prev) =>
      prev.map((r) => r.id === draggingId ? { ...r, nodeX: newX, nodeY: newY } : r)
    );
  }

  function handleCanvasMouseUp() {
    setDraggingId(null);
    setIsPanning(false);
  }

  // ── File drop on canvas ───────────────────────────────────────
  function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files);
  }

  // ── Canvas cursor ─────────────────────────────────────────────
  const canvasCursor = isPanning
    ? "grabbing"
    : canvasTool === "hand"
    ? "grab"
    : draggingId
    ? "grabbing"
    : "default";

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-screen"
      onClick={() => setShowModelMenu(false)}
    >
      <TopBar
        breadcrumb={[
          { label: "Ferramentas", href: "/app/tools/image" },
          { label: "Gerar Imagens" },
        ]}
      />

      {/* ── Mode toggle ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-[var(--border-subtle)] bg-white">
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <button
            onClick={() => setMode("text")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              mode === "text"
                ? "bg-[var(--text-primary)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Texto → Imagem
          </button>
          <button
            onClick={() => setMode("render3d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              mode === "render3d"
                ? "bg-[var(--color-brand)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            3D → Render
          </button>
        </div>
      </div>

      {/* ── TEXT MODE ── */}
      {mode === "text" && (
        <div className="flex flex-1 min-h-0">
          <GeneratorPanel>
            <div className="p-4 space-y-4">
              <section className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Modelo</label>
                <ModelSelector value={model} onChange={setModel} disabled={isGenerating} />
              </section>
              <section className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Prompt</label>
                <PromptInput
                  value={prompt}
                  onChange={setPrompt}
                  placeholder="Descreva o que você quer criar..."
                  disabled={isGenerating}
                  suggestions={SUGGESTIONS}
                />
              </section>
              <section className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Proporção</label>
                <AspectRatioPicker value={aspectRatio} onChange={setAspectRatio} disabled={isGenerating} />
              </section>
              <section className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Quantidade</label>
                <QuantityPicker value={quantity} onChange={setQuantity} max={4} disabled={isGenerating} />
              </section>
              <LowBalanceWarning
                credits={credits}
                planAllocation={planAllocation}
                onBuyPack={() => router.push("/app/credits")}
              />
              <GenerateButton
                onClick={handleGenerateText}
                isGenerating={isGenerating}
                creditsCost={creditsCost}
                hasEnoughCredits={hasEnoughCreditsText}
                disabled={!prompt.trim()}
              />
            </div>
          </GeneratorPanel>
          <GalleryPanel generations={generations} isGenerating={isGenerating} tool="image" />
        </div>
      )}

      {/* ── 3D RENDER MODE ── */}
      {mode === "render3d" && (
        <WorkflowEditor initialPrompt={searchParams.get("prompt") ?? undefined} />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFileSelect(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }}
      />

      {/* Insufficient credits modal */}
      <InsufficientCreditsModal
        open={creditsModal.open}
        required={creditsModal.required}
        current={creditsModal.current}
        onClose={() => setCreditsModal((s) => ({ ...s, open: false }))}
        onUpgrade={() => { setCreditsModal((s) => ({ ...s, open: false })); router.push("/pricing"); }}
        onBuyPack={() => { setCreditsModal((s) => ({ ...s, open: false })); router.push("/app/credits"); }}
      />

      {/* Image Editor (inpainting) */}
      {editorUrl && (
        <ImageEditor
          imageUrl={editorUrl}
          onClose={() => setEditorUrl(null)}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && !editorUrl && (
        <div className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-5xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxUrl} alt="Visualização" className="max-h-[88vh] max-w-full object-contain rounded-2xl shadow-2xl" />
            <div className="absolute top-3 right-3 flex gap-2">
              <a
                href={lightboxUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-9 h-9 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center text-white transition-colors"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={() => setLightboxUrl(null)}
                className="w-9 h-9 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-[11px] select-none">ESC para fechar</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIImageGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AIImageGeneratorInner />
    </Suspense>
  );
}
