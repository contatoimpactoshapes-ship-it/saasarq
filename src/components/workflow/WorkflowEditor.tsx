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
  SelectionMode,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { toast } from "sonner";
import { FolderOpen } from "lucide-react";

import { SourceNode, SourceNodeData } from "./nodes/SourceNode";
import { RenderNode, RenderNodeData, RenderStatus } from "./nodes/RenderNode";
import { ContextMenu, ContextMenuState } from "./ContextMenu";
import { WorkflowSidebar } from "./WorkflowSidebar";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { useCreditsStore } from "@/stores/useCreditsStore";
import { ImageEditor } from "@/components/tools/ImageEditor";

// ── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL  = 2000;
const RENDER_CREDITS = 120;
const SOURCE_X       = 80;
const RENDER_X       = 400;
const NODE_STEP_Y    = 280;

// ── Node type registry ────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  sourceNode: SourceNode,
  renderNode: RenderNode,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEdge(sourceId: string, targetId: string): Edge {
  return {
    id: `e-${sourceId}-${targetId}`,
    source: sourceId,
    sourceHandle: "output",
    target: targetId,
    targetHandle: "input",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#7c3aed", strokeWidth: 2, opacity: 0.7 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed", width: 16, height: 16 },
  };
}

function downloadUrl(url: string, filename = "render.png") {
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
}

// ── Inner component (needs ReactFlowProvider context) ──────────────────────

function WorkflowEditorInner() {
  const { fitView } = useReactFlow();

  // ── Stores ─────────────────────────────────────────────────────────────
  const { addGeneration, updateGeneration } = useGenerationStore();
  const { credits, decrementCredits, refreshCredits }        = useCreditsStore();

  // ── Nodes / Edges ───────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // ── Sidebar state ───────────────────────────────────────────────────────
  const [globalPrompt,  setGlobalPrompt]  = useState("");
  const [renderModel,   setRenderModel]   = useState("render-flux-dev");
  const [strength,      setStrength]      = useState(0.82);
  const [numOutputs,    setNumOutputs]    = useState(1);

  // ── UI state ────────────────────────────────────────────────────────────
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [contextMenu,   setContextMenu]   = useState<ContextMenuState | null>(null);
  const [lightboxUrl,   setLightboxUrl]   = useState<string | null>(null);
  const [editorUrl,     setEditorUrl]     = useState<string | null>(null);

  // ── File input ref ──────────────────────────────────────────────────────
  const fileRef   = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // ── Stop a specific polling interval ────────────────────────────────────
  const stopPoll = useCallback((genId: string) => {
    const iv = pollingRef.current.get(genId);
    if (iv) { clearInterval(iv); pollingRef.current.delete(genId); }
  }, []);

  useEffect(() => () => pollingRef.current.forEach((iv) => clearInterval(iv)), []);

  // ── Start polling for a render node ────────────────────────────────────
  const startPoll = useCallback((genId: string, renderNodeId: string) => {
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
            if (n.id !== renderNodeId) return n;
            const d = n.data as unknown as RenderNodeData;
            return {
              ...n,
              data: { ...d, status: "completed" as RenderStatus, imageUrl: url },
            };
          }));
          refreshCredits();
          // Check if all render nodes are done
          setIsGenerating(false);
        } else if (data.status === "FAILED") {
          stopPoll(genId);
          updateGeneration(genId, { status: "FAILED", errorMessage: data.error });
          setNodes((ns) => ns.map((n) => {
            if (n.id !== renderNodeId) return n;
            const d = n.data as unknown as RenderNodeData;
            return {
              ...n,
              data: { ...d, status: "failed" as RenderStatus, errorMessage: data.error },
            };
          }));
          refreshCredits();
          setIsGenerating(false);
          toast.error(data.error ?? "Falha na geração. Créditos reembolsados.");
        } else {
          setNodes((ns) => ns.map((n) => {
            if (n.id !== renderNodeId) return n;
            const d = n.data as unknown as RenderNodeData;
            if (d.status === "processing") return n;
            return { ...n, data: { ...d, status: "processing" as RenderStatus } };
          }));
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL);
    pollingRef.current.set(genId, iv);
  }, [stopPoll, updateGeneration, refreshCredits, setNodes]);

  // ── Execute render for a specific source node ───────────────────────────
  const executeRender = useCallback(async (sourceNodeId: string) => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;
    const sd = sourceNode.data as SourceNodeData;
    if (!sd.falUrl || sd.uploading) {
      toast.error("Imagem ainda sendo enviada...");
      return;
    }

    const cost = RENDER_CREDITS * numOutputs;
    if (credits < cost) {
      toast.error(`Créditos insuficientes: precisa de ${cost} cr`);
      return;
    }

    setIsGenerating(true);
    decrementCredits(cost);

    for (let i = 0; i < numOutputs; i++) {
      const renderNodeId = `rn-${Date.now()}-${sourceNodeId}-${i}`;
      const optId = `opt-${Date.now()}-${i}`;

      // Create render node in the graph
      const yOffset = (edges.filter((e) => e.source === sourceNodeId).length) * NODE_STEP_Y;

      // We create stable callbacks using closure over renderNodeId
      const nodeToAdd: Node = {
        id:       renderNodeId,
        type:     "renderNode",
        position: {
          x: RENDER_X + Math.floor(i / 2) * 220,
          y: (sourceNode.position.y) + (i % 2) * NODE_STEP_Y + yOffset,
        },
        data: buildRenderNodeData(
          renderNodeId, "pending", undefined,
          globalPrompt || sd.label,
          renderModel,
          undefined,
          sd.label,
        ),
      };

      setNodes((ns) => [...ns, nodeToAdd]);
      setEdges((es) => [...es, makeEdge(sourceNodeId, renderNodeId)]);

      addGeneration({
        id: optId, tool: "IMAGE_EDIT", model: renderModel,
        prompt: globalPrompt || sd.label,
        status: "PENDING", outputUrls: [], creditsCost: RENDER_CREDITS,
        createdAt: new Date().toISOString(),
      });

      try {
        const res    = await fetch("/api/generate/render", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl:    sd.falUrl,
            prompt:      globalPrompt || sd.label,
            style:       "custom",
            strength,
            renderModel,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Erro ao renderizar");

        updateGeneration(optId, { id: result.generationId, status: "PROCESSING" });

        // Update render node to processing
        setNodes((ns) => ns.map((n) => {
          if (n.id !== renderNodeId) return n;
          const d = n.data as unknown as RenderNodeData;
          return { ...n, data: { ...d, status: "processing" as RenderStatus } };
        }));

        startPoll(result.generationId, renderNodeId);
      } catch (err) {
        updateGeneration(optId, { status: "FAILED" });
        setNodes((ns) => ns.map((n) => {
          if (n.id !== renderNodeId) return n;
          const d = n.data as unknown as RenderNodeData;
          return { ...n, data: { ...d, status: "failed" as RenderStatus } };
        }));
        refreshCredits();
        setIsGenerating(false);
        toast.error(err instanceof Error ? err.message : "Erro ao renderizar");
      }
    }
  }, [nodes, edges, numOutputs, credits, globalPrompt, renderModel, strength,
      decrementCredits, addGeneration, updateGeneration, refreshCredits,
      startPoll, setNodes, setEdges]);

  // ── Render all ready source nodes ──────────────────────────────────────
  const handleRenderAll = useCallback(async () => {
    const sourcesReady = nodes.filter((n) => {
      if (n.type !== "sourceNode") return false;
      const d = n.data as unknown as SourceNodeData;
      return d.falUrl && !d.uploading;
    });
    if (!sourcesReady.length) {
      toast.info("Nenhuma imagem pronta para renderizar.");
      return;
    }
    for (const src of sourcesReady) {
      await executeRender(src.id);
    }
  }, [nodes, executeRender]);

  // ── Build stable node data using refs ──────────────────────────────────
  // We use a factory function so callbacks are stable via node ID closure
  function buildRenderNodeData(
    nodeId: string,
    status: RenderStatus,
    imageUrl?: string,
    prompt?: string,
    model?: string,
    errorMessage?: string,
    sourceLabel?: string,
  ): RenderNodeData {
    return {
      status, imageUrl, prompt, model, errorMessage, sourceLabel,
      onDelete:    () => setNodes((ns) => ns.filter((n) => n.id !== nodeId)),
      onEdit:      () => imageUrl && setEditorUrl(imageUrl),
      onDownload:  () => imageUrl && downloadUrl(imageUrl),
      onDuplicate: () => {
        setNodes((ns) => {
          const orig = ns.find((n) => n.id === nodeId);
          if (!orig) return ns;
          const d    = orig.data as unknown as RenderNodeData;
          const newId = `rn-dup-${Date.now()}`;
          return [...ns, {
            ...orig,
            id:       newId,
            selected: false,
            position: { x: orig.position.x + 20, y: orig.position.y + 20 },
            data:     buildRenderNodeData(newId, d.status, d.imageUrl, d.prompt, d.model, d.errorMessage, d.sourceLabel),
          }];
        });
      },
      onPreview:   () => imageUrl && setLightboxUrl(imageUrl),
      onZoomIn:    () => imageUrl && setLightboxUrl(imageUrl),
      onRerender:  () => {
        // Re-render means find parent source and re-execute
        const parentEdge = edges.find((e) => e.target === nodeId);
        if (parentEdge) executeRender(parentEdge.source);
        else toast.info("Sem nó de origem conectado.");
      },
    };
  }

  function buildSourceNodeData(nodeId: string, existing: Partial<SourceNodeData>): SourceNodeData {
    return {
      label:      existing.label ?? "render",
      previewUrl: existing.previewUrl ?? "",
      falUrl:     existing.falUrl,
      uploading:  existing.uploading,
      onDelete:   () => {
        setNodes((ns) => ns.filter((n) => n.id !== nodeId));
        setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
      },
      onReplace:  () => fileRef.current?.click(),
      onRender:   () => executeRender(nodeId),
      onDownload: () => existing.previewUrl && downloadUrl(existing.previewUrl, existing.label),
      onDuplicate: () => {
        setNodes((ns) => {
          const orig = ns.find((n) => n.id === nodeId);
          if (!orig) return ns;
          const d    = orig.data as unknown as SourceNodeData;
          const newId = `sn-dup-${Date.now()}`;
          return [...ns, {
            ...orig,
            id:       newId,
            selected: false,
            position: { x: orig.position.x + 20, y: orig.position.y + 20 },
            data:     buildSourceNodeData(newId, d),
          }];
        });
      },
      onPreview: () => existing.previewUrl && setLightboxUrl(existing.previewUrl),
    };
  }

  // ── File upload ─────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const existing = nodes.filter((n) => n.type === "sourceNode").length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) { toast.error(`${file.name}: apenas imagens`); continue; }
      if (file.size > 20 * 1024 * 1024)   { toast.error(`${file.name}: máx 20 MB`); continue; }
      if (existing + i >= 8)               { toast.error("Máximo de 8 imagens"); break; }

      const previewUrl = URL.createObjectURL(file);
      const nodeId     = `sn-${Date.now()}-${i}`;
      const label      = file.name.replace(/\.[^/.]+$/, "");

      const nodeData = buildSourceNodeData(nodeId, {
        label, previewUrl, uploading: true,
      });

      const newNode: Node = {
        id:       nodeId,
        type:     "sourceNode",
        position: { x: SOURCE_X, y: 48 + (existing + i) * NODE_STEP_Y },
        data:     nodeData,
      };
      setNodes((ns) => [...ns, newNode]);

      // Upload to FAL
      (async () => {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res  = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setNodes((ns) => ns.map((n) => {
            if (n.id !== nodeId) return n;
            const d = n.data as unknown as SourceNodeData;
            return {
              ...n,
              data: {
                ...d,
                falUrl:   data.url,
                uploading: false,
                onRender:  () => executeRender(nodeId),
              },
            };
          }));
        } catch {
          setNodes((ns) => ns.filter((n) => n.id !== nodeId));
          toast.error(`Falha ao enviar ${label}`);
        }
      })();
    }
  }, [nodes, setNodes, executeRender]);

  // ── Edge connection ──────────────────────────────────────────────────────
  const onConnect = useCallback((params: Connection) => {
    setEdges((es) => addEdge({
      ...params,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#7c3aed", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed" },
    }, es));
  }, [setEdges]);

  // ── Context menu ────────────────────────────────────────────────────────
  const onNodeContextMenu = useCallback((e: ReactMouseEvent, node: Node) => {
    e.preventDefault();
    const d = node.data as unknown as (SourceNodeData | RenderNodeData);
    const nodeType = node.type === "sourceNode" ? "source" : "render";
    const nodeStatus = nodeType === "render" ? (d as RenderNodeData).status : undefined;
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id, nodeType, nodeStatus });
  }, []);

  const onPaneClick = useCallback(() => setContextMenu(null), []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA";
      if (isTyping) return;

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
          const clones: Node[] = selected.map((n) => ({
            ...n,
            id:       `${n.id}-dup-${Date.now()}`,
            selected: true,
            position: { x: n.position.x + 20, y: n.position.y + 20 },
          }));
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

  // ── Context menu action handlers ────────────────────────────────────────
  const ctxDelete = useCallback((id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  const ctxDuplicate = useCallback((id: string) => {
    setNodes((ns) => {
      const orig = ns.find((n) => n.id === id);
      if (!orig) return ns;
      const newId = `${id}-dup-${Date.now()}`;
      return [...ns, { ...orig, id: newId, selected: false, position: { x: orig.position.x + 20, y: orig.position.y + 20 } }];
    });
  }, [setNodes]);

  const ctxPreview = useCallback((id: string) => {
    const n = nodes.find((n) => n.id === id);
    if (!n) return;
    if (n.type === "sourceNode") setLightboxUrl((n.data as unknown as SourceNodeData).previewUrl ?? null);
    if (n.type === "renderNode") setLightboxUrl((n.data as unknown as RenderNodeData).imageUrl ?? null);
  }, [nodes]);

  const ctxDownload = useCallback((id: string) => {
    const n = nodes.find((n) => n.id === id);
    if (!n) return;
    const url = n.type === "renderNode" ? (n.data as unknown as RenderNodeData).imageUrl : (n.data as unknown as SourceNodeData).previewUrl;
    if (url) downloadUrl(url);
  }, [nodes]);

  const ctxEdit = useCallback((id: string) => {
    const n = nodes.find((n) => n.id === id);
    if (!n || n.type !== "renderNode") return;
    const url = (n.data as unknown as RenderNodeData).imageUrl;
    if (url) setEditorUrl(url);
  }, [nodes]);

  const ctxRerender = useCallback((id: string) => {
    const parentEdge = edges.find((e) => e.target === id);
    if (parentEdge) executeRender(parentEdge.source);
    else toast.info("Sem nó de origem conectado.");
  }, [edges, executeRender]);

  const ctxRender = useCallback((id: string) => executeRender(id), [executeRender]);

  const ctxDisconnect = useCallback((id: string) => {
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
  }, [setEdges]);

  // ── Drop on pane ────────────────────────────────────────────────────────
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  // ── Source count for sidebar ────────────────────────────────────────────
  const sourceCount = nodes.filter((n) => n.type === "sourceNode").length;
  const readyCount  = nodes.filter((n) => {
    if (n.type !== "sourceNode") return false;
    const d = n.data as unknown as SourceNodeData;
    return d.falUrl && !d.uploading;
  }).length;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 min-h-0" style={{ background: "#0a0a14" }}>
      {/* ── Sidebar ── */}
      <WorkflowSidebar
        prompt={globalPrompt}          onPromptChange={setGlobalPrompt}
        model={renderModel}            onModelChange={setRenderModel}
        strength={strength}            onStrengthChange={setStrength}
        numOutputs={numOutputs}        onNumOutputsChange={setNumOutputs}
        isGenerating={isGenerating}
        readyCount={readyCount}
        onRenderAll={handleRenderAll}
        onUpload={() => fileRef.current?.click()}
        nodeCount={sourceCount}
      />

      {/* ── Canvas ── */}
      <div className="flex-1 relative" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
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
          deleteKeyCode={null}   // handled manually
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
            style: { stroke: "#7c3aed", strokeWidth: 2 },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.5}
            color="#ffffff08"
          />
          <Controls
            className="!bg-[#1a1a2e] !border !border-white/10 !rounded-xl !shadow-xl"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-[#0f0f1e] !border !border-white/10 !rounded-xl"
            nodeColor="#7c3aed"
            maskColor="rgba(10,10,20,0.7)"
          />

          {/* ── Empty state hint ── */}
          {nodes.length === 0 && (
            <Panel position="top-center">
              <div className="mt-16 flex flex-col items-center gap-4 pointer-events-none select-none">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <FolderOpen className="w-8 h-8 text-white/20" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white/30 mb-1">Nenhuma imagem no canvas</p>
                  <p className="text-xs text-white/15">
                    Arraste imagens aqui ou clique em{" "}
                    <span className="text-violet-400/50">Adicionar imagem</span>
                  </p>
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>

        {/* ── Context menu ── */}
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
          />
        )}
      </div>

      {/* ── Hidden file input ── */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="preview"
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            draggable={false}
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Inpainting Editor ── */}
      {editorUrl && (
        <ImageEditor
          imageUrl={editorUrl}
          onClose={() => setEditorUrl(null)}
        />
      )}
    </div>
  );
}

// ── Exported wrapper with provider ──────────────────────────────────────────

export function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner />
    </ReactFlowProvider>
  );
}
