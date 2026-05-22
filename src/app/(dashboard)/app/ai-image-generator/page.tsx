"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Upload, X, Plus, Sun, Moon, Sofa, Palette, Image as ImageIcon,
  Loader2, AlertCircle, Download, ArrowRight, ChevronDown,
  ZoomIn, ZoomOut, RotateCcw, GripVertical, RefreshCw, Cpu,
  Sparkles, Home, Building2, MousePointerClick,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { GeneratorPanel } from "@/components/tools/GeneratorPanel";
import { GalleryPanel } from "@/components/tools/GalleryPanel";
import { ModelSelector } from "@/components/tools/ModelSelector";
import { PromptInput } from "@/components/tools/PromptInput";
import { AspectRatioPicker } from "@/components/tools/AspectRatioPicker";
import { QuantityPicker } from "@/components/tools/QuantityPicker";
import { GenerateButton } from "@/components/tools/GenerateButton";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { getImageModel } from "@/lib/models";

const POLL_INTERVAL = 2000;
const RENDER_CREDIT_COST = 120;

const SUGGESTIONS = [
  "Modern living room, floor-to-ceiling windows, marble floors, warm lighting",
  "Contemporary kitchen with island, pendant lights, high-gloss cabinets",
  "Minimalist bedroom, natural materials, indirect lighting, architectural interior",
  "Open office, exposed concrete, industrial design, natural light",
];

// ── Render style options ───────────────────────────────────────────────────────
const RENDER_STYLES = [
  { id: "exterior-day",   label: "Fachada Dia",   icon: Sun,       desc: "Luz solar, céu azul" },
  { id: "exterior-night", label: "Fachada Noite",  icon: Moon,      desc: "Iluminação artificial" },
  { id: "interior-day",   label: "Interior Dia",   icon: Sofa,      desc: "Luz natural filtrada" },
  { id: "interior-night", label: "Interior Noite", icon: Moon,      desc: "Iluminação de ambiente" },
  { id: "artistic",       label: "Conceitual",     icon: Palette,   desc: "Visual de apresentação" },
  { id: "custom",         label: "Personalizado",  icon: ImageIcon, desc: "Apenas seu prompt" },
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

// ── Preset prompts ─────────────────────────────────────────────────────────────
const RENDER_PRESETS = [
  {
    id: "interior-dia",
    label: "Interior Dia",
    shortDesc: "Luz natural suave",
    icon: Sofa,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    prompt:
      "Converta este print 3D em fotografia hiper-realista de interiores, mantendo rigorosamente o mesmo enquadramento, ângulo, altura de câmera, distância focal e perspectiva. É proibido alterar composição, aproximar, afastar ou corrigir perspectiva. Iluminação natural diurna suave e difusa, sem incidência solar direta. Perfis de LED embutidos no teto com temperatura 3000K ativados. Fitas de LED sob armários superiores ativadas. Materiais com comportamento físico correto: porcelanato acetinado com reflexo sutil, madeira texturizada, vidros com leve reflexão interna. Sombras suaves e coerentes. Zero aparência CGI. Zero render look. Zero stylization. Qualidade fotográfica editorial de interiores contemporâneos.",
  },
  {
    id: "interior-noite",
    label: "Interior Noite",
    shortDesc: "Iluminação quente 3000K",
    icon: Moon,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    prompt:
      "Converta este print 3D em fotografia hiper-realista de interiores noturno, mantendo rigorosamente o mesmo enquadramento, câmera e perspectiva. Iluminação artificial exclusiva 3000K: LEDs lineares de teto acesos, fitas de LED sob armários superiores ativadas, luminárias decorativas e pendentes acesos. Atmosfera quente, aconchegante e sofisticada. Janelas escurecidas com reflexo sutil do ambiente interno. Materiais com comportamento físico correto. Sombras coerentes. Zero CGI. Zero render look. Qualidade fotográfica editorial de interiores contemporâneos brasileiros.",
  },
  {
    id: "exterior-dia",
    label: "Fachada Dia",
    shortDesc: "Céu azul, luz solar",
    icon: Sun,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    prompt:
      "Converta este print 3D em fotografia hiper-realista de fachada arquitetônica, mantendo rigorosamente o mesmo enquadramento, ângulo, distância focal e perspectiva. É proibido alterar composição ou ampliar campo de visão. Luz solar diurna entre 5500K e 6500K, incidência lateral natural gerando sombras fisicamente coerentes nas superfícies. Céu azul com nuvens suaves e naturais. Vegetação com textura realista em primeiro e segundo plano. Piso com reflexo acetinado sutil. Materiais com comportamento físico correto. Zero CGI. Zero render look. Qualidade fotográfica de arquitetura editorial.",
  },
  {
    id: "exterior-noite",
    label: "Fachada Noite",
    shortDesc: "Dramático e elegante",
    icon: Building2,
    iconBg: "bg-slate-50",
    iconColor: "text-slate-600",
    prompt:
      "Converta este print 3D em fotografia hiper-realista de fachada noturna, mantendo o mesmo enquadramento e perspectiva. Iluminação exterior fisicamente correta: spots embutidos no piso e solo destacando volumes arquitetônicos, iluminação indireta nas entradas e circulações, janelas com luz interna quente 3000K irradiando para o exterior. Céu com gradiente azul-escuro natural. Sombras coerentes e dramáticas. Vegetação discretamente iluminada. Materiais fotorrealistas. Zero CGI. Qualidade fotográfica editorial de arquitetura.",
  },
  {
    id: "apresentacao",
    label: "Apresentação",
    shortDesc: "Hero shot para cliente",
    icon: Sparkles,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    prompt:
      "Converta este print 3D em renderização hiper-realista de apresentação arquitetônica premium, mantendo o mesmo enquadramento e perspectiva. Iluminação cinematográfica elegante com contraste controlado, destacando os materiais e volumes arquitetônicos de forma sofisticada. Materiais com qualidade visual máxima e comportamento físico correto. Composição preservada integralmente. Atmosfera premium e sofisticada adequada para apresentação ao cliente final. Qualidade de portfólio arquitetônico.",
  },
  {
    id: "foto-pura",
    label: "Foto Pura",
    shortDesc: "Máximo realismo",
    icon: Home,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    prompt:
      "Converta exatamente este print 3D em fotografia real hiper-realista, mantendo rigorosamente mesmo enquadramento, ângulo, altura de câmera, distância focal e perspectiva. É absolutamente proibido alterar composição, aproximar, afastar, corrigir perspectiva ou ampliar campo de visão. A imagem deve parecer fotografada no mundo real com câmera full-frame lente 35–50mm. Iluminação fisicamente correta coerente com o ambiente. Alta faixa dinâmica. Materiais com comportamento físico real. Sombras coerentes. Reflexos realistas. Zero aparência CGI. Zero render look. Zero stylization. Zero oversharpen. Qualidade fotográfica máxima editorial.",
  },
];

// ── Node interface ─────────────────────────────────────────────────────────────
interface UploadedRender {
  id: string;
  file: File;
  previewUrl: string;
  falUrl?: string;
  uploading?: boolean;
  label: string;
  // Canvas position
  nodeX: number;
  nodeY: number;
  // Per-node prompt settings
  nodePrompt: string;
  nodePreset: string | null;
  nodeStyle: string;
}

// ── Main component ─────────────────────────────────────────────────────────────
function AIImageGeneratorInner() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "render3d" ? "render3d" : "text";
  const [mode, setMode] = useState<"text" | "render3d">(initialMode);

  // ── Text mode state ──────────────────────────────────────────
  const [model, setModel] = useState("auto");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quantity, setQuantity] = useState(1);

  // ── Render mode state ────────────────────────────────────────
  const [renders, setRenders] = useState<UploadedRender[]>([]);
  const [jobMap, setJobMap] = useState<Record<string, string[]>>({});

  // ── Per-node selection ───────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // ── Global rendering parameters (shared across all nodes) ────
  const [renderModel, setRenderModel]     = useState("render-flux-dev");
  const [strength, setStrength]           = useState(0.82);
  const [numOutputs, setNumOutputs]       = useState(1);

  // ── UI state ─────────────────────────────────────────────────
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [lightboxUrl, setLightboxUrl]     = useState<string | null>(null);
  const [zoom, setZoom]                   = useState(1);

  // ── Canvas drag state ────────────────────────────────────────
  const [draggingId, setDraggingId]         = useState<string | null>(null);
  const [dragNodeOffset, setDragNodeOffset] = useState({ x: 0, y: 0 });

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const canvasWrapRef  = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<HTMLDivElement>(null);

  const {
    generations, isGenerating,
    addGeneration, updateGeneration,
    setIsGenerating, setCurrentId, setPollingRef,
  } = useGenerationStore();
  const { credits, decrementCredits, refreshCredits } = useCreditsStore();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ──────────────────────────────────────────────────
  const selectedTextModel = getImageModel(model);
  const creditsCost       = (selectedTextModel?.credits ?? 50) * quantity;
  const hasEnoughCreditsText = credits >= creditsCost;
  const readyRenders  = renders.filter((r) => r.falUrl && !r.uploading);
  const uploadingCount = renders.filter((r) => r.uploading).length;

  // Selected node (null = none selected)
  const selectedNode = renders.find((r) => r.id === selectedNodeId) ?? null;

  // Current style info for the style dropdown
  const currentStyleObj = RENDER_STYLES.find((s) => s.id === (selectedNode?.nodeStyle ?? "exterior-day")) ?? RENDER_STYLES[0];
  const currentRenderAI = RENDER_AI_MODELS.find((m) => m.id === renderModel) ?? RENDER_AI_MODELS[0];
  const StyleIcon = currentStyleObj.icon;

  // ── Canvas dimensions ────────────────────────────────────────
  const canvasDims = renders.length > 0
    ? {
        w: Math.max(1600, Math.max(...renders.map((r) => r.nodeX + 100 + 208 + 60 + numOutputs * 192))),
        h: Math.max(800,  Math.max(...renders.map((r) => r.nodeY + 320))),
      }
    : { w: 1600, h: 800 };

  // ── Update selected node's prompt fields ─────────────────────
  function updateNodeField(id: string, updates: Partial<Pick<UploadedRender, "nodePrompt" | "nodePreset" | "nodeStyle">>) {
    setRenders((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
  }

  // ── Canvas zoom via Ctrl+scroll ──────────────────────────────
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

  // ── Global keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setLightboxUrl(null); setSelectedNodeId(null); }
      if (e.ctrlKey && e.key === "0") { e.preventDefault(); setZoom(1); }
      if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault(); setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10));
      }
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault(); setZoom((z) => Math.max(0.3, Math.round((z - 0.1) * 10) / 10));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Polling ──────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);
  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback((generationId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/${generationId}/status`);
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
            const res = await fetch(`/api/generate/${id}/status`);
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
    if (!hasEnoughCreditsText) { toast.error(`Créditos insuficientes: ${creditsCost} cr`); return; }
    setIsGenerating(true);
    const optimisticId = `opt-${Date.now()}`;
    addGeneration({ id: optimisticId, tool: "IMAGE_GENERATE", model, prompt, status: "PENDING", outputUrls: [], creditsCost, createdAt: new Date().toISOString() });
    decrementCredits(creditsCost);
    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, aspectRatio, numImages: quantity }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Erro ao iniciar geração");
      updateGeneration(optimisticId, { id: result.generationId, status: "PROCESSING" });
      setCurrentId(result.generationId);
      startPolling(result.generationId);
    } catch (err: unknown) {
      stopPolling(); setIsGenerating(false);
      updateGeneration(optimisticId, { status: "FAILED" });
      refreshCredits();
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  // ── File upload ──────────────────────────────────────────────
  async function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const newRenders: UploadedRender[] = [];
    let newIdx = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name}: apenas imagens`); continue; }
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name}: máx 20MB`); continue; }
      if (renders.length + newRenders.length >= 8) { toast.error("Máximo de 8 imagens"); break; }
      newRenders.push({
        id: `r-${Date.now()}-${Math.random()}`,
        file, previewUrl: URL.createObjectURL(file),
        uploading: true,
        label: file.name.replace(/\.[^/.]+$/, ""),
        nodeX: 48,
        nodeY: 48 + (renders.length + newIdx) * 260,
        // Per-node prompt settings (blank by default — user configures by clicking the node)
        nodePrompt: "",
        nodePreset: null,
        nodeStyle: "exterior-day",
      });
      newIdx++;
    }
    if (!newRenders.length) return;
    setRenders((prev) => [...prev, ...newRenders]);
    // Auto-select the first new node so the user lands on its settings
    if (newRenders.length > 0) setSelectedNodeId(newRenders[0].id);
    for (const render of newRenders) {
      try {
        const fd = new FormData();
        fd.append("file", render.file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setRenders((prev) => prev.map((r) => r.id === render.id ? { ...r, falUrl: data.url, uploading: false } : r));
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

  // ── Core: execute renders for a specific list of nodes ───────
  // Uses each node's own nodePrompt + nodeStyle; global strength + renderModel
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
          const res = await fetch("/api/generate/render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl:    render.falUrl,
              prompt:      render.nodePrompt,
              style:       render.nodeStyle,
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

  // ── Render only unrendered nodes ─────────────────────────────
  async function handleGenerateRender() {
    const pending = renders.filter((r) => r.falUrl && !r.uploading && !(jobMap[r.id]?.length > 0));
    if (!pending.length) {
      toast.info("Todas as imagens já foram renderizadas. Use o botão individual para gerar variações.");
      return;
    }
    const cost = RENDER_CREDIT_COST * pending.length * numOutputs;
    if (credits < cost) { toast.error(`Créditos insuficientes: ${cost} cr`); return; }
    await executeRenderJobs(pending);
  }

  // ── Render a single specific node ────────────────────────────
  async function handleGenerateRow(render: UploadedRender) {
    if (!render.falUrl || render.uploading) return;
    const cost = RENDER_CREDIT_COST * numOutputs;
    if (credits < cost) { toast.error(`Créditos insuficientes: ${cost} cr`); return; }
    await executeRenderJobs([render]);
  }

  // ── Re-render single output ──────────────────────────────────
  async function handleRerender(render: UploadedRender) {
    if (!render.falUrl) return;
    const optId = `opt-${Date.now()}-rerender`;
    addGeneration({ id: optId, tool: "IMAGE_EDIT", model: renderModel, prompt: "Re-render", status: "PENDING", outputUrls: [], creditsCost: RENDER_CREDIT_COST, createdAt: new Date().toISOString() });
    decrementCredits(RENDER_CREDIT_COST);
    try {
      const res = await fetch("/api/generate/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl:    render.falUrl,
          prompt:      render.nodePrompt,
          style:       render.nodeStyle,
          strength,
          renderModel,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Erro ao re-renderizar");
      updateGeneration(optId, { id: result.generationId, status: "PROCESSING" });
      setJobMap((prev) => ({ ...prev, [render.id]: [...(prev[render.id] ?? []), result.generationId] }));
      const genId = result.generationId;
      const iv = setInterval(async () => {
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

  // ── Free-form node drag ───────────────────────────────────────
  function handleNodeMouseDown(e: React.MouseEvent, render: UploadedRender) {
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

  function handleCanvasMouseMove(e: React.MouseEvent) {
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

  function handleCanvasMouseUp() { setDraggingId(null); }

  // ── File drop on canvas ───────────────────────────────────────
  function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files);
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-screen"
      onClick={() => { setShowStyleMenu(false); setShowModelMenu(false); }}
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
          <button onClick={() => setMode("text")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${mode === "text" ? "bg-[var(--text-primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
            Texto → Imagem
          </button>
          <button onClick={() => setMode("render3d")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${mode === "render3d" ? "bg-[var(--color-brand)] text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
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
                <PromptInput value={prompt} onChange={setPrompt} placeholder="Descreva o que você quer criar..." disabled={isGenerating} suggestions={SUGGESTIONS} />
              </section>
              <section className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Proporção</label>
                <AspectRatioPicker value={aspectRatio} onChange={setAspectRatio} disabled={isGenerating} />
              </section>
              <section className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Quantidade</label>
                <QuantityPicker value={quantity} onChange={setQuantity} max={4} disabled={isGenerating} />
              </section>
              <GenerateButton onClick={handleGenerateText} isGenerating={isGenerating} creditsCost={creditsCost} hasEnoughCredits={hasEnoughCreditsText} disabled={!prompt.trim()} />
            </div>
          </GeneratorPanel>
          <GalleryPanel generations={generations} isGenerating={isGenerating} tool="image" />
        </div>
      )}

      {/* ── 3D RENDER MODE ── */}
      {mode === "render3d" && (
        <div className="flex flex-1 min-h-0">

          {/* ══ LEFT PANEL ══ */}
          <div
            className="w-72 shrink-0 border-r border-[var(--border-subtle)] flex flex-col bg-white overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── SECTION 1: Per-node prompt (changes with selection) ── */}
            <div className="border-b border-[var(--border-subtle)]">
              {selectedNode ? (
                /* ── Node selected: show its prompt settings ── */
                <div className="p-4">
                  {/* Header showing which node is selected */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedNode.previewUrl}
                        alt={selectedNode.label}
                        className="w-7 h-7 rounded-lg object-cover border border-[var(--border-default)] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-[var(--color-brand)] uppercase tracking-widest leading-none mb-0.5">
                          Configurando
                        </p>
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {selectedNode.label}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      title="Fechar (ESC)"
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Style selector (per node) */}
                  <div className="relative mb-3">
                    <button
                      onClick={() => { setShowStyleMenu((v) => !v); setShowModelMenu(false); }}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-between h-8 px-3 rounded-xl border border-[var(--border-default)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--color-brand)] transition-colors disabled:opacity-50 bg-white"
                    >
                      <div className="flex items-center gap-2">
                        <StyleIcon className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                        <span>{currentStyleObj.label}</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </button>
                    {showStyleMenu && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-xl border border-[var(--border-default)] shadow-lg p-1.5 grid grid-cols-2 gap-1">
                        {RENDER_STYLES.map((s) => {
                          const Icon = s.icon;
                          return (
                            <button
                              key={s.id}
                              onClick={() => { updateNodeField(selectedNode.id, { nodeStyle: s.id }); setShowStyleMenu(false); }}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                                selectedNode.nodeStyle === s.id
                                  ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                                  : "hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <div>
                                <p className="font-semibold leading-tight">{s.label}</p>
                                <p className="text-[10px] opacity-60">{s.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Preset grid (per node) */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {RENDER_PRESETS.map((preset) => {
                      const Icon = preset.icon;
                      const isActive = selectedNode.nodePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => updateNodeField(selectedNode.id, { nodePrompt: preset.prompt, nodePreset: preset.id })}
                          className={`text-left p-2.5 rounded-xl border transition-all ${
                            isActive
                              ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5 shadow-sm"
                              : "border-[var(--border-default)] hover:border-[var(--color-brand)]/60 hover:bg-[var(--bg-hover)]"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg ${preset.iconBg} flex items-center justify-center mb-1.5`}>
                            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[var(--color-brand)]" : preset.iconColor}`} />
                          </div>
                          <p className={`text-xs font-semibold leading-tight ${isActive ? "text-[var(--color-brand)]" : "text-[var(--text-primary)]"}`}>
                            {preset.label}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{preset.shortDesc}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom prompt textarea (per node) */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">
                      {selectedNode.nodePreset ? "Edite ou personalize:" : "Ou escreva seu prompt:"}
                    </p>
                    <textarea
                      value={selectedNode.nodePrompt}
                      onChange={(e) => updateNodeField(selectedNode.id, { nodePrompt: e.target.value, nodePreset: null })}
                      placeholder="Ex: Fotografia hiper-realista, mesmo enquadramento, iluminação natural suave..."
                      rows={5}
                      disabled={isGenerating}
                      className="w-full rounded-xl border border-[var(--border-default)] px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand)] resize-none transition-colors leading-relaxed disabled:opacity-50 bg-white"
                    />
                    {selectedNode.nodePrompt && (
                      <button
                        onClick={() => updateNodeField(selectedNode.id, { nodePrompt: "", nodePreset: null })}
                        className="text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors"
                      >
                        ✕ Limpar prompt
                      </button>
                    )}
                  </div>

                  {/* Quick render this node */}
                  {selectedNode.falUrl && !selectedNode.uploading && (
                    <button
                      onClick={() => handleGenerateRow(selectedNode)}
                      disabled={isGenerating}
                      className={`w-full mt-3 h-8 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 ${
                        (jobMap[selectedNode.id]?.length ?? 0) > 0
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
                          : "brand-gradient text-white hover:opacity-90"
                      }`}
                    >
                      {isGenerating ? (
                        <><Loader2 className="w-3 h-3 animate-spin" />Renderizando...</>
                      ) : (jobMap[selectedNode.id]?.length ?? 0) > 0 ? (
                        <><RefreshCw className="w-3 h-3" /> Nova variação</>
                      ) : (
                        <>✦ Renderizar este ângulo</>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                /* ── No node selected: instructions ── */
                <div className="p-4">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4">
                    Prompt de renderização
                  </p>
                  {renders.length > 0 ? (
                    <div className="flex flex-col items-center py-6 text-center rounded-2xl border-2 border-dashed border-[var(--border-subtle)]">
                      <div className="w-11 h-11 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center mb-3">
                        <MousePointerClick className="w-5 h-5 text-[var(--text-muted)]" />
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                        Selecione uma imagem
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed max-w-[180px]">
                        Clique em um nó no canvas para configurar o prompt de cada ângulo individualmente.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 text-center">
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                        Envie imagens 3D no canvas para começar. Cada imagem terá seu próprio prompt.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── SECTION 2: Global parameters (always visible) ── */}
            <div className="p-4 space-y-4 flex-1">
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                Parâmetros globais
              </p>

              {/* AI Model */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Modelo de IA</label>
                <div className="relative">
                  <button
                    onClick={() => { setShowModelMenu((v) => !v); setShowStyleMenu(false); }}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-between h-9 px-3 rounded-xl border border-[var(--border-default)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--color-brand)] transition-colors disabled:opacity-50 bg-white"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Cpu className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
                      <span className="font-semibold truncate">{currentRenderAI.name}</span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  </button>
                  {showModelMenu && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-xl border border-[var(--border-default)] shadow-xl overflow-hidden max-h-72 overflow-y-auto scrollbar-thin">
                      {(() => {
                        const groups = Array.from(new Set(RENDER_AI_MODELS.map((m) => m.group)));
                        return groups.map((group) => (
                          <div key={group}>
                            <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{group}</p>
                            {RENDER_AI_MODELS.filter((m) => m.group === group).map((m) => (
                              <button
                                key={m.id}
                                onClick={() => { setRenderModel(m.id); setShowModelMenu(false); }}
                                className={`w-full flex items-center px-3 py-2 text-xs transition-colors ${
                                  renderModel === m.id
                                    ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                                    : "hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                                } ${"beta" in m && (m as { beta?: boolean }).beta ? "opacity-60" : ""}`}
                              >
                                <div className="text-left flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold">{m.name}</p>
                                    {"beta" in m && (m as { beta?: boolean }).beta && (
                                      <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-orange-100 text-orange-500 border border-orange-200">FIX</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] opacity-60 truncate">{m.desc}</p>
                                </div>
                                {renderModel === m.id && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] shrink-0 ml-2" />}
                              </button>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Strength */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Intensidade</label>
                  <span className="text-xs font-mono font-bold text-[var(--color-brand)]">{Math.round(strength * 100)}%</span>
                </div>
                <input
                  type="range" min={30} max={95} step={1}
                  value={Math.round(strength * 100)}
                  onChange={(e) => setStrength(Number(e.target.value) / 100)}
                  disabled={isGenerating}
                  className="w-full accent-[var(--color-brand)] disabled:opacity-50"
                />
                <p className="text-[10px] text-[var(--text-muted)]">Recomendado: 75–88%</p>
              </div>

              {/* Variations per image */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">Variações por imagem</label>
                <div className="flex gap-1 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumOutputs(n)}
                      disabled={isGenerating}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                        numOutputs === n
                          ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)] shadow-sm"
                          : "bg-white text-[var(--text-muted)] border-[var(--border-default)] hover:border-[var(--color-brand)]/50 hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Gera {numOutputs} renderização{numOutputs > 1 ? "ões" : ""} por imagem
                </p>
              </div>
            </div>

            {/* ── Generate all button ── */}
            <div className="p-4 border-t border-[var(--border-subtle)] space-y-2">
              {(() => {
                const pendingRenders = renders.filter((r) => r.falUrl && !r.uploading && !(jobMap[r.id]?.length > 0));
                const pendingCost   = RENDER_CREDIT_COST * pendingRenders.length * numOutputs;
                const allRendered   = readyRenders.length > 0 && pendingRenders.length === 0;
                return (
                  <>
                    <button
                      onClick={handleGenerateRender}
                      disabled={isGenerating || readyRenders.length === 0 || uploadingCount > 0}
                      className="w-full h-10 brand-gradient text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      {isGenerating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Renderizando...</>
                      ) : uploadingCount > 0 ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                      ) : allRendered ? (
                        <>✦ Tudo renderizado</>
                      ) : (
                        <>✦ Render novos ({pendingRenders.length})</>
                      )}
                    </button>

                    {allRendered && !isGenerating && (
                      <p className="text-[10px] text-emerald-600 text-center font-medium">
                        ✓ Clique num nó para gerar variações
                      </p>
                    )}

                    {pendingRenders.length > 0 && !isGenerating && (
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] px-1">
                        <span>{pendingRenders.length} nova{pendingRenders.length > 1 ? "s" : ""} × {numOutputs}</span>
                        <span className="font-semibold text-[var(--color-brand)]">{pendingCost} cr</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* ══ RIGHT: Free-form workflow canvas ══ */}
          <div
            ref={canvasWrapRef}
            className="flex-1 overflow-auto relative"
            style={{
              background: "#f0f0f2",
              cursor: draggingId ? "grabbing" : "default",
              userSelect: draggingId ? "none" : "auto",
            }}
            onDrop={handleCanvasDrop}
            onDragOver={(e) => e.preventDefault()}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <div
              ref={canvasInnerRef}
              style={{
                zoom,
                position: "relative",
                width:  renders.length > 0 ? canvasDims.w : "100%",
                height: renders.length > 0 ? canvasDims.h : "100%",
                backgroundImage: "radial-gradient(circle, #c6c6cc 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                minWidth:  "100%",
                minHeight: "100%",
              }}
              // Click empty canvas area → deselect
              onClick={() => setSelectedNodeId(null)}
            >

              {/* ── Empty state ── */}
              {renders.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-default)] hover:border-[var(--color-brand)] transition-colors cursor-pointer group bg-white/70 py-28 w-full max-w-lg"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white border border-[var(--border-default)] group-hover:border-[var(--color-brand)] flex items-center justify-center mb-4 transition-colors shadow-sm">
                      <Upload className="w-7 h-7 text-[var(--text-muted)] group-hover:text-[var(--color-brand)] transition-colors" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Envie sua imagem 3D</p>
                    <p className="text-xs text-[var(--text-muted)] mb-4">Arraste e solte aqui ou clique para selecionar</p>
                    <p className="text-[11px] text-[var(--text-subtle)] text-center max-w-xs leading-relaxed">
                      SketchUp · Revit · ArqCAD · 3ds Max · Blender
                      <br />PNG, JPG, WEBP · Máx 20MB · Até 8 imagens
                    </p>
                  </div>
                </div>
              )}

              {/* ── Workflow nodes ── */}
              {renders.map((render) => {
                const genIds    = jobMap[render.id] ?? [];
                const numSlots  = genIds.length > 0 ? genIds.length : numOutputs;
                const isDragging  = draggingId === render.id;
                const isDimmed    = draggingId !== null && !isDragging;
                const isRendered  = genIds.length > 0;
                const isSelected  = selectedNodeId === render.id;

                return (
                  <div
                    key={render.id}
                    style={{
                      position:   "absolute",
                      left:       render.nodeX,
                      top:        render.nodeY,
                      zIndex:     isDragging ? 100 : isSelected ? 10 : 1,
                      transform:  isDragging ? "scale(1.03)" : "scale(1)",
                      transition: isDragging ? "none" : "transform 0.1s ease, opacity 0.15s ease",
                      opacity:    isDimmed ? 0.5 : 1,
                      filter:     isDragging ? "drop-shadow(0 12px 32px rgba(0,0,0,0.18))" : "none",
                    }}
                    className="flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()} // prevent canvas deselect
                  >
                    {/* Drag handle */}
                    <div
                      onMouseDown={(e) => handleNodeMouseDown(e, render)}
                      title="Arrastar para mover"
                      className="cursor-grab active:cursor-grabbing text-[var(--border-default)] hover:text-[var(--color-brand)] transition-colors shrink-0 select-none p-1"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Source card — click to select */}
                    <div
                      onClick={() => setSelectedNodeId(render.id)}
                      className={`w-52 shrink-0 relative group rounded-xl overflow-hidden bg-white cursor-pointer transition-all ${
                        isSelected
                          ? "border-2 border-[var(--color-brand)] shadow-[0_0_0_3px_var(--color-brand)/15]"
                          : "border border-[var(--border-default)] shadow-sm hover:border-[var(--color-brand)]/50 hover:shadow-md"
                      }`}
                    >
                      {/* Selected indicator badge */}
                      {isSelected && (
                        <div className="absolute top-2 left-2 z-10 bg-[var(--color-brand)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          Selecionado
                        </div>
                      )}

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={render.previewUrl}
                        alt={render.label}
                        draggable={false}
                        className="w-52 h-36 object-cover"
                      />
                      {render.uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}

                      {/* Prompt indicator dot */}
                      {render.nodePrompt && (
                        <div className="absolute top-2 right-2 z-10 w-2 h-2 rounded-full bg-[var(--color-brand)] border-2 border-white" title="Prompt configurado" />
                      )}

                      <div className="px-2.5 py-1.5 border-t border-[var(--border-subtle)]">
                        <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">{render.label}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {render.uploading
                            ? "Enviando..."
                            : isRendered
                            ? `${genIds.length} render${genIds.length > 1 ? "s" : ""} gerado${genIds.length > 1 ? "s" : ""}`
                            : render.nodePrompt
                            ? "Prompt configurado ✓"
                            : "Clique para configurar"}
                        </p>
                      </div>

                      {/* Per-node render button */}
                      {!render.uploading && render.falUrl && (
                        <div className="px-2.5 pb-2.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleGenerateRow(render); }}
                            disabled={isGenerating}
                            className={`w-full h-7 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 ${
                              isRendered
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
                                : "brand-gradient text-white hover:opacity-90"
                            }`}
                          >
                            {isGenerating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isRendered ? (
                              <><RefreshCw className="w-3 h-3" /> Nova variação</>
                            ) : (
                              <>✦ Renderizar</>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeRender(render.id); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Connector */}
                    <div className="flex items-center shrink-0 w-14">
                      <div className={`flex-1 h-px border-t-2 ${isRendered ? "border-emerald-400 border-solid" : "border-dashed border-[var(--border-default)]"}`} />
                      <ArrowRight className={`w-4 h-4 shrink-0 -ml-1 ${isRendered ? "text-emerald-400" : "text-[var(--text-muted)]"}`} />
                    </div>

                    {/* Output cards */}
                    <div className="flex items-center gap-2">
                      {Array.from({ length: numSlots }).map((_, idx) => {
                        const genId = genIds[idx];
                        const gen   = genId ? generations.find((g) => g.id === genId) : undefined;

                        return (
                          <div key={idx} className="shrink-0">
                            {!gen ? (
                              <div className="w-44 h-36 rounded-xl border-2 border-dashed border-[var(--border-default)] bg-white/70 flex flex-col items-center justify-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-[var(--text-muted)]" />
                                </div>
                                <p className="text-[10px] text-[var(--text-subtle)] text-center">
                                  {numOutputs > 1 ? `Variação ${idx + 1}` : "Aguardando"}
                                </p>
                              </div>
                            ) : gen.status === "PENDING" || gen.status === "PROCESSING" ? (
                              <div className="w-44 h-36 rounded-xl border border-[var(--color-brand)]/30 bg-white shimmer flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 text-[var(--color-brand)] animate-spin" />
                                <p className="text-[11px] text-[var(--text-muted)]">Renderizando...</p>
                              </div>
                            ) : gen.status === "FAILED" ? (
                              <div className="w-44 h-36 rounded-xl border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-2 px-3">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                <p className="text-[10px] text-red-500 text-center leading-relaxed">
                                  {gen.errorMessage ?? "Falha na renderização"}
                                </p>
                                {render.falUrl && (
                                  <button
                                    onClick={() => handleRerender(render)}
                                    className="text-[10px] text-[var(--color-brand)] hover:underline font-semibold"
                                  >
                                    Tentar novamente
                                  </button>
                                )}
                              </div>
                            ) : gen.outputUrls[0] ? (
                              <div
                                className="relative group w-44 h-36 rounded-xl overflow-hidden shadow-sm border border-[var(--border-subtle)] cursor-zoom-in"
                                onClick={() => setLightboxUrl(gen.outputUrls[0])}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={gen.outputUrls[0]} alt="Render" draggable={false} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">Concluído</div>
                                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {render.falUrl && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRerender(render); }}
                                      title="Nova variação"
                                      className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                                    >
                                      <RefreshCw className="w-3 h-3 text-[var(--text-primary)]" />
                                    </button>
                                  )}
                                  <a
                                    href={gen.outputUrls[0]} download target="_blank" rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                                  </a>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Add more button */}
              {renders.length > 0 && renders.length < 8 && (
                <div style={{ position: "absolute", left: 48, top: Math.max(...renders.map((r) => r.nodeY)) + 260 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[var(--border-default)] hover:border-[var(--color-brand)] text-[var(--text-muted)] hover:text-[var(--color-brand)] transition-colors text-xs font-medium bg-white/60 hover:bg-white disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar ângulo ({renders.length}/8)
                  </button>
                </div>
              )}
            </div>

            {/* Zoom controls */}
            <div className="sticky bottom-4 flex justify-end pr-4 pointer-events-none">
              <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded-xl border border-[var(--border-default)] shadow-md p-1 pointer-events-auto">
                <button onClick={() => setZoom((z) => Math.max(0.3, Math.round((z - 0.1) * 10) / 10))} title="Ctrl+–" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-semibold text-[var(--text-primary)] w-10 text-center select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <button onClick={() => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10))} title="Ctrl++" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-[var(--border-subtle)] mx-0.5" />
                <button onClick={() => setZoom(1)} title="Ctrl+0" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
        onChange={(e) => { handleFileSelect(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }}
      />

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-5xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxUrl} alt="Visualização" className="max-h-[88vh] max-w-full object-contain rounded-2xl shadow-2xl" />
            <div className="absolute top-3 right-3 flex gap-2">
              <a href={lightboxUrl} download target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center text-white transition-colors">
                <Download className="w-4 h-4" />
              </a>
              <button onClick={() => setLightboxUrl(null)} className="w-9 h-9 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center text-white transition-colors">
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
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-6 h-6 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" /></div>}>
      <AIImageGeneratorInner />
    </Suspense>
  );
}
