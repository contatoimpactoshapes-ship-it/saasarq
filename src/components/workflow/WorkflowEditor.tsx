"use client";

import {
  useState, useCallback, useEffect, useRef,
  MouseEvent as ReactMouseEvent,
} from "react";
import {
  ReactFlow,
  Background, BackgroundVariant, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  NodeTypes, Node, Edge, Connection, ReactFlowProvider,
  useReactFlow, Panel,
  SelectionMode, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { sanitizeError } from "@/lib/errors";

import { ImageNode, ImageNodeData, NodeStatus } from "./nodes/ImageNode";
import { ContextMenu, ContextMenuState } from "./ContextMenu";
import { WorkflowSidebar } from "./WorkflowSidebar";
import { WorkflowContext } from "./WorkflowContext";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { ImageEditor } from "@/components/tools/ImageEditor";

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL  = 2000;
const RENDER_CREDITS = 120;
const SOURCE_X       = 80;
const RENDER_X       = 400;
const NODE_STEP_Y    = 260;

// ── Node type registry (single unified type) ──────────────────────────────────

const nodeTypes: NodeTypes = { imageNode: ImageNode };

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEdge(sourceId: string, targetId: string): Edge {
  return {
    id:           `e-${sourceId}-${targetId}`,
    source:       sourceId,
    sourceHandle: "output",
    target:       targetId,
    targetHandle: "input",
    type:         "default",          // ← bezier, more organic curve
    animated:     true,
    style:        { stroke: "#F97316", strokeWidth: 2, opacity: 0.8 },
    markerEnd:    { type: MarkerType.ArrowClosed, color: "#F97316", width: 14, height: 14 },
  };
}

function downloadUrl(url: string, filename = "render.png") {
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
}

// ── Inner component ───────────────────────────────────────────────────────────

function WorkflowEditorInner() {
  const { fitView } = useReactFlow();

  const { addGeneration, updateGeneration } = useGenerationStore();
  const { credits, decrementCredits, refreshCredits } = useCreditsStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [globalPrompt, setGlobalPrompt] = useState("");
  const [renderModel,  setRenderModel]  = useState("render-flux-dev");
  const [strength,     setStrength]     = useState(0.82);
  const [numOutputs,   setNumOutputs]   = useState(1);

  const [activeJobs, setActiveJobs] = useState(0);
  const [contextMenu,  setContextMenu]  = useState<ContextMenuState | null>(null);
  const [lightboxUrl,  setLightboxUrl]  = useState<string | null>(null);
  const [editorUrl,    setEditorUrl]    = useState<string | null>(null);

  const fileRef         = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);
  const pollingRef      = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // ── Polling ────────────────────────────────────────────────────────────────

  const stopPoll = useCallback((genId: string) => {
    const iv = pollingRef.current.get(genId);
    if (iv) { clearInterval(iv); pollingRef.current.delete(genId); }
  }, []);

  useEffect(() => () => pollingRef.current.forEach((iv) => clearInterval(iv)), []);

  const startPoll = useCallback((genId: string, nodeId: string) => {
    const iv = setInterval(async () => {
      try {
        const res  = await fetch(`/api/generate/${genId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "COMPLETED") {
          stopPoll(genId);
          const url = data.outputUrls?.[0] ?? "";
          updateGeneration(genId, { status: "COMPLETED", outputUrls: data.outputUrls ?? [] });
          setNodes((ns) => ns.map((n) => {
            if (n.id !== nodeId) return n;
            const d = n.data as unknown as ImageNodeData;
            return { ...n, data: { ...d, status: "completed" as NodeStatus, imageUrl: url } };
          }));
          refreshCredits();
          setActiveJobs((n) => Math.max(0, n - 1));
          toast.success("Render concluído!");
        } else if (data.status === "FAILED") {
          stopPoll(genId);
          updateGeneration(genId, { status: "FAILED", errorMessage: data.error });
          setNodes((ns) => ns.map((n) => {
            if (n.id !== nodeId) return n;
            const d = n.data as unknown as ImageNodeData;
            return { ...n, data: { ...d, status: "failed" as NodeStatus, errorMessage: data.error } };
          }));
          refreshCredits();
          setActiveJobs((n) => Math.max(0, n - 1));
          toast.error(data.error ?? "Falha na geração. Créditos reembolsados.");
        } else {
          setNodes((ns) => ns.map((n) => {
            if (n.id !== nodeId) return n;
            const d = n.data as unknown as ImageNodeData;
            if (d.status === "processing") return n;
            return { ...n, data: { ...d, status: "processing" as NodeStatus } };
          }));
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL);
    pollingRef.current.set(genId, iv);
  }, [stopPoll, updateGeneration, refreshCredits, setNodes]);

  // ── Node data builders ────────────────────────────────────────────────────

  function buildRenderData(nodeId: string, partial: Partial<ImageNodeData>): ImageNodeData {
    return {
      nodeKind: "render",
      status:   "pending",
      ...partial,
      nodeId,
    };
  }

  function buildSourceData(nodeId: string, partial: Partial<ImageNodeData>): ImageNodeData {
    return {
      nodeKind: "source",
      status:   partial.uploading ? "pending" : partial.falUrl ? "ready" : "pending",
      label:    "imagem",
      ...partial,
      nodeId,
    };
  }

  // ── Execute render ────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executeRender = useCallback(async (sourceNodeId: string) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;
    const sd = sourceNode.data as unknown as ImageNodeData;
    if (!sd.falUrl || sd.uploading) {
      toast.error("Imagem ainda sendo enviada...");
      return;
    }

    const cost = RENDER_CREDITS * numOutputs;
    if (credits < cost) {
      toast.error(`Créditos insuficientes: precisa de ${cost} cr`);
      return;
    }

    decrementCredits(cost);

    const existingRenderCount = edges.filter((e) => e.source === sourceNodeId).length;

    for (let i = 0; i < numOutputs; i++) {
      const renderNodeId = `rn-${Date.now()}-${sourceNodeId}-${i}`;
      const optId        = `opt-${Date.now()}-${i}`;
      setActiveJobs((n) => n + 1);

      // Position: stack to the right, offset vertically
      const col = Math.floor(i / 4);
      const row = existingRenderCount + i;

      const newNode: Node = {
        id:   renderNodeId,
        type: "imageNode",
        position: {
          x: RENDER_X + col * 240,
          y: sourceNode.position.y + (row % 4) * NODE_STEP_Y,
        },
        data: buildRenderData(renderNodeId, {
          status:  "pending",
          prompt:  globalPrompt || sd.label,
          label:   `Variação ${existingRenderCount + i + 1}`,
        }),
      };

      setNodes((ns) => [...ns, newNode]);
      setEdges((es) => [...es, makeEdge(sourceNodeId, renderNodeId)]);

      addGeneration({
        id: optId, tool: "IMAGE_EDIT", model: renderModel,
        prompt: globalPrompt || (sd.label ?? ""),
        status: "PENDING", outputUrls: [], creditsCost: RENDER_CREDITS,
        createdAt: new Date().toISOString(),
      });

      try {
        const res    = await fetch("/api/generate/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: sd.falUrl,
            prompt:   globalPrompt || sd.label,
            style:    "custom",
            strength, renderModel,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Erro ao renderizar");

        updateGeneration(optId, { id: result.generationId, status: "PROCESSING" });
        setNodes((ns) => ns.map((n) => {
          if (n.id !== renderNodeId) return n;
          const d = n.data as unknown as ImageNodeData;
          return { ...n, data: { ...d, status: "processing" as NodeStatus } };
        }));
        startPoll(result.generationId, renderNodeId);
      } catch (err) {
        const errorMessage = sanitizeError(err);
        updateGeneration(optId, { status: "FAILED" });
        setNodes((ns) => ns.map((n) => {
          if (n.id !== renderNodeId) return n;
          const d = n.data as unknown as ImageNodeData;
          return { ...n, data: { ...d, status: "failed" as NodeStatus, errorMessage } };
        }));
        refreshCredits();
        setActiveJobs((n) => Math.max(0, n - 1));
        toast.error(errorMessage);
      }
    }
  }, [nodes, edges, numOutputs, credits, globalPrompt, renderModel, strength,
      decrementCredits, addGeneration, updateGeneration, refreshCredits,
      startPoll, setNodes, setEdges]);

  // ── Render all ────────────────────────────────────────────────────────────

  const handleRenderAll = useCallback(async () => {
    const ready = nodes.filter((n) => {
      if (n.type !== "imageNode") return false;
      const d = n.data as unknown as ImageNodeData;
      return d.nodeKind === "source" && d.falUrl && !d.uploading;
    });
    if (!ready.length) { toast.info("Nenhuma imagem pronta para renderizar."); return; }
    for (const src of ready) await executeRender(src.id);
  }, [nodes, executeRender]);

  // ── File upload ───────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // ── Replace mode: swap image in an existing source node ──────────────────
    const replaceId = replaceTargetRef.current;
    if (replaceId) {
      replaceTargetRef.current = null;
      const file = files[0];
      const isImageMime = file.type.startsWith("image/");
      const isImageExt  = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
      if (!isImageMime && !isImageExt) { toast.error(`${file.name}: apenas imagens`); return; }
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name}: máx 20 MB`); return; }

      const previewUrl = URL.createObjectURL(file);
      const label      = file.name.replace(/\.[^/.]+$/, "");

      setNodes((ns) => ns.map((n) => {
        if (n.id !== replaceId) return n;
        const d = n.data as unknown as ImageNodeData;
        return { ...n, data: { ...d, label, previewUrl, falUrl: undefined, imageUrl: undefined, uploading: true, status: "pending" as NodeStatus } };
      }));

      (async () => {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res  = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setNodes((ns) => ns.map((n) => {
            if (n.id !== replaceId) return n;
            const d = n.data as unknown as ImageNodeData;
            return { ...n, data: { ...d, falUrl: data.url, uploading: false, status: "ready" as NodeStatus } };
          }));
        } catch (err) {
          const errorMessage = sanitizeError(err);
          setNodes((ns) => ns.map((n) => {
            if (n.id !== replaceId) return n;
            const d = n.data as unknown as ImageNodeData;
            return { ...n, data: { ...d, uploading: false, status: "failed" as NodeStatus, errorMessage } };
          }));
          toast.error(errorMessage);
        }
      })();
      return;
    }

    // ── Add mode: create new source nodes ────────────────────────────────────
    const existing = nodes.filter((n) => {
      const d = n.data as unknown as ImageNodeData;
      return d.nodeKind === "source";
    }).length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImageMime = file.type.startsWith("image/");
      const isImageExt  = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
      if (!isImageMime && !isImageExt) { toast.error(`${file.name}: apenas imagens`); continue; }
      if (file.size > 20 * 1024 * 1024)   { toast.error(`${file.name}: máx 20 MB`); continue; }
      if (existing + i >= 8)               { toast.error("Máximo de 8 imagens"); break; }

      const previewUrl = URL.createObjectURL(file);
      const nodeId     = `sn-${Date.now()}-${i}`;
      const label      = file.name.replace(/\.[^/.]+$/, "");

      const newNode: Node = {
        id:   nodeId,
        type: "imageNode",
        position: { x: SOURCE_X, y: 48 + (existing + i) * NODE_STEP_Y },
        data: buildSourceData(nodeId, { label, previewUrl, uploading: true }),
      };
      setNodes((ns) => [...ns, newNode]);

      (async () => {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res  = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setNodes((ns) => ns.map((n) => {
            if (n.id !== nodeId) return n;
            const d = n.data as unknown as ImageNodeData;
            return { ...n, data: { ...d, falUrl: data.url, uploading: false, status: "ready" as NodeStatus } };
          }));
        } catch (err) {
          const errorMessage = sanitizeError(err);
          console.error("[upload] falha ao enviar", label, err);
          setNodes((ns) => ns.map((n) => {
            if (n.id !== nodeId) return n;
            const d = n.data as unknown as ImageNodeData;
            return { ...n, data: { ...d, uploading: false, status: "failed" as NodeStatus, errorMessage } };
          }));
          toast.error(errorMessage);
        }
      })();
    }
  }, [nodes, setNodes, executeRender]);

  // ── Edge connection ───────────────────────────────────────────────────────

  const onConnect = useCallback((params: Connection) => {
    setEdges((es) => addEdge({
      ...params,
      type:      "default",
      animated:  true,
      style:     { stroke: "#F97316", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#F97316" },
    }, es));
  }, [setEdges]);

  // ── Context menu ──────────────────────────────────────────────────────────

  const onNodeContextMenu = useCallback((e: ReactMouseEvent, node: Node) => {
    e.preventDefault();
    const d = node.data as unknown as ImageNodeData;
    setContextMenu({
      x: e.clientX, y: e.clientY,
      nodeId:    node.id,
      nodeKind:  d.nodeKind ?? "source",
      nodeStatus: d.status,
    });
  }, []);

  const onPaneClick = useCallback(() => setContextMenu(null), []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Escape") { setContextMenu(null); setLightboxUrl(null); }
      if (e.key === "Delete" || e.key === "Backspace") {
        setNodes((ns) => {
          const toDelete = ns.filter((n) => n.selected).map((n) => n.id);
          if (!toDelete.length) return ns;
          setEdges((es) => es.filter((e) => !toDelete.includes(e.source) && !toDelete.includes(e.target)));
          return ns.filter((n) => !n.selected);
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        setNodes((ns) => {
          const selected = ns.filter((n) => n.selected);
          const clones: Node[] = selected.map((n) => {
            const nid = `${n.id}-dup-${Date.now()}`;
            return {
              ...n,
              id: nid, selected: false,
              position: { x: n.position.x + 20, y: n.position.y + 20 },
              data: { ...(n.data as Record<string, unknown>), nodeId: nid },
            };
          });
          return [...ns.map((n) => ({ ...n, selected: false })), ...clones];
        });
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        fitView({ duration: 400, padding: 0.15 });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fitView, setNodes, setEdges]);

  // ── Context menu handlers ─────────────────────────────────────────────────

  const ctxDelete = useCallback((id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  const ctxDuplicate = useCallback((id: string) => {
    setNodes((ns) => {
      const orig = ns.find((n) => n.id === id);
      if (!orig) return ns;
      const nid = `${id}-dup-${Date.now()}`;
      return [...ns, {
        ...orig,
        id: nid, selected: false,
        position: { x: orig.position.x + 20, y: orig.position.y + 20 },
        data: { ...(orig.data as Record<string, unknown>), nodeId: nid },
      }];
    });
  }, [setNodes]);

  const ctxReplace = useCallback((id: string) => {
    replaceTargetRef.current = id;
    fileRef.current?.click();
  }, []);
  const ctxMoveToFolder = useCallback((_id: string) => toast.info("Em breve: mover para pasta"), []);
  const ctxFindSimilar  = useCallback((_id: string) => toast.info("Em breve: similares"), []);
  const ctxHistory      = useCallback((_id: string) => toast.info("Em breve: histórico"), []);

  const ctxPreview = useCallback((id: string) => {
    const n = nodes.find((n) => n.id === id);
    if (!n) return;
    const d = n.data as unknown as ImageNodeData;
    setLightboxUrl(d.imageUrl || d.previewUrl || null);
  }, [nodes]);

  const ctxDownload = useCallback((id: string) => {
    const n = nodes.find((n) => n.id === id);
    if (!n) return;
    const d = n.data as unknown as ImageNodeData;
    const url = d.imageUrl || d.previewUrl;
    if (url) downloadUrl(url);
  }, [nodes]);

  const ctxEdit = useCallback((id: string) => {
    const n = nodes.find((n) => n.id === id);
    if (!n) return;
    const d = n.data as unknown as ImageNodeData;
    const url = d.imageUrl || d.previewUrl;
    if (url) setEditorUrl(url);
    else toast.info("Sem imagem disponível para edição.");
  }, [nodes]);

  const ctxRerender = useCallback((id: string) => {
    const parentEdge = edges.find((e) => e.target === id);
    if (parentEdge) executeRender(parentEdge.source);
    else {
      // Maybe it IS a source node — render it directly
      const n = nodes.find((n) => n.id === id);
      if (n) {
        const d = n.data as unknown as ImageNodeData;
        if (d.nodeKind === "source") executeRender(id);
        else toast.info("Sem nó de origem conectado.");
      }
    }
  }, [edges, nodes, executeRender]);

  const ctxRender = useCallback((id: string) => executeRender(id), [executeRender]);

  const ctxDisconnect = useCallback((id: string) => {
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
  }, [setEdges]);

  // ── Counts ────────────────────────────────────────────────────────────────

  const sourceCount = nodes.filter((n) => {
    const d = n.data as unknown as ImageNodeData;
    return d.nodeKind === "source";
  }).length;

  const readyCount = nodes.filter((n) => {
    const d = n.data as unknown as ImageNodeData;
    return d.nodeKind === "source" && d.falUrl && !d.uploading;
  }).length;

  // ── Render ────────────────────────────────────────────────────────────────

  const isGenerating = activeJobs > 0;

  const contextValue = {
    onPreview:      ctxPreview,
    onEdit:         ctxEdit,
    onDownload:     ctxDownload,
    onRender:       ctxRerender,
    onDelete:       ctxDelete,
    onDuplicate:    ctxDuplicate,
    onReplace:      ctxReplace,
    onMoveToFolder: ctxMoveToFolder,
    onFindSimilar:  ctxFindSimilar,
    onHistory:      ctxHistory,
  };

  return (
    <WorkflowContext.Provider value={contextValue}>
    <div className="flex flex-1 min-h-0 bg-[#f5f6fa]">
      {/* Sidebar */}
      <WorkflowSidebar
        prompt={globalPrompt}       onPromptChange={setGlobalPrompt}
        model={renderModel}         onModelChange={setRenderModel}
        strength={strength}         onStrengthChange={setStrength}
        numOutputs={numOutputs}     onNumOutputsChange={setNumOutputs}
        isGenerating={isGenerating}
        readyCount={readyCount}
        onRenderAll={handleRenderAll}
        onUpload={() => fileRef.current?.click()}
        nodeCount={sourceCount}
      />

      {/* Canvas */}
      <div
        className="flex-1 relative"
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode="Shift"
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.15}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type:      "default",
            animated:  true,
            style:     { stroke: "#F97316", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#F97316" },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            color="#d1d5db"
          />
          <Controls
            className="!bg-white !border !border-gray-200 !rounded-xl !shadow-sm"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-white !border !border-gray-200 !rounded-xl !shadow-sm"
            nodeColor="#F97316"
            maskColor="rgba(245,246,250,0.8)"
          />

          {/* Empty state */}
          {nodes.length === 0 && (
            <Panel position="top-center">
              <div className="mt-20 flex flex-col items-center gap-4 pointer-events-none select-none">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-gray-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-400 mb-1">
                    Nenhuma imagem no canvas
                  </p>
                  <p className="text-xs text-gray-300">
                    Arraste renders 3D aqui ou clique em{" "}
                    <span className="text-[var(--color-brand)]">Adicionar imagem</span>
                  </p>
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>

        {/* Context menu */}
        {contextMenu && (
          <ContextMenu
            menu={contextMenu}
            onClose={() => setContextMenu(null)}
            onDelete={ctxDelete}
            onDuplicate={ctxDuplicate}
            onPreview={ctxPreview}
            onDownload={ctxDownload}
            onEdit={ctxEdit}
            onRerender={ctxRerender}
            onRender={ctxRender}
            onDisconnect={ctxDisconnect}
            onFitView={() => fitView({ duration: 400, padding: 0.15 })}
            onHistory={ctxHistory}
            onFindSimilar={ctxFindSimilar}
            onMoveToFolder={ctxMoveToFolder}
          />
        )}
      </div>

      {/* File input */}
      <input
        ref={fileRef}
        type="file" accept="image/*" multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl} alt="preview"
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            draggable={false}
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
          <p className="absolute bottom-4 text-white/40 text-xs select-none">ESC para fechar</p>
        </div>
      )}

      {/* Inpainting editor */}
      {editorUrl && (
        <ImageEditor imageUrl={editorUrl} onClose={() => setEditorUrl(null)} />
      )}
    </div>
    </WorkflowContext.Provider>
  );
}

// ── Provider wrapper ──────────────────────────────────────────────────────────

export function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner />
    </ReactFlowProvider>
  );
}
