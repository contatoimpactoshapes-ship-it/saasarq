"use client";

import { memo } from "react";
import { Handle, Position, NodeProps, NodeToolbar } from "@xyflow/react";
import {
  Loader2, AlertCircle, Download, Paintbrush, Trash2,
  Eye, RefreshCw, Copy, Maximize2, ZoomIn, CheckCircle2,
  Play,
} from "lucide-react";

export type RenderStatus = "pending" | "processing" | "completed" | "failed";

export interface RenderNodeData extends Record<string, unknown> {
  status: RenderStatus;
  imageUrl?: string;
  prompt?: string;
  model?: string;
  errorMessage?: string;
  sourceLabel?: string;
  // callbacks
  onDelete: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  onRerender: () => void;
  onZoomIn: () => void;
}

function RenderNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as RenderNodeData;

  const statusColor = {
    pending:    "bg-yellow-500",
    processing: "bg-blue-400",
    completed:  "bg-emerald-400",
    failed:     "bg-red-400",
  }[d.status];

  const statusGlow = {
    pending:    "",
    processing: "shadow-[0_0_6px_rgba(96,165,250,0.8)] animate-pulse",
    completed:  "shadow-[0_0_6px_rgba(52,211,153,0.8)]",
    failed:     "shadow-[0_0_6px_rgba(248,113,113,0.8)]",
  }[d.status];

  const ringColor = selected
    ? "ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.35)]"
    : "ring-1 ring-white/10 hover:ring-white/20";

  return (
    <>
      {/* ── Floating Toolbar ── */}
      <NodeToolbar isVisible={selected} position={Position.Top} className="nodrag nopan">
        <div className="flex items-center gap-0.5 bg-[#1a1a2e] border border-[#2d2d4e] rounded-xl px-1.5 py-1 shadow-2xl">
          {d.status === "completed" && (
            <>
              <ToolbarBtn icon={<Eye className="w-3.5 h-3.5" />}         title="Visualizar"        onClick={d.onPreview}   />
              <ToolbarBtn icon={<Maximize2 className="w-3.5 h-3.5" />}   title="Ampliar"           onClick={d.onZoomIn}    />
              <ToolbarBtn icon={<Paintbrush className="w-3.5 h-3.5" />}  title="Editar / Inpaint"  onClick={d.onEdit}      accent />
              <ToolbarDivider />
              <ToolbarBtn icon={<Download className="w-3.5 h-3.5" />}    title="Baixar"            onClick={d.onDownload}  />
              <ToolbarBtn icon={<Copy className="w-3.5 h-3.5" />}        title="Duplicar nó"       onClick={d.onDuplicate} />
              <ToolbarBtn icon={<RefreshCw className="w-3.5 h-3.5" />}   title="Re-renderizar"     onClick={d.onRerender}  />
              <ToolbarDivider />
            </>
          )}
          {d.status === "failed" && (
            <>
              <ToolbarBtn icon={<RefreshCw className="w-3.5 h-3.5" />}   title="Tentar novamente"  onClick={d.onRerender}  accent />
              <ToolbarDivider />
            </>
          )}
          <ToolbarBtn icon={<Trash2 className="w-3.5 h-3.5" />}          title="Deletar (Del)"     onClick={d.onDelete}    danger />
        </div>
      </NodeToolbar>

      {/* ── Node body ── */}
      <div
        className={`
          w-48 rounded-2xl overflow-hidden shadow-2xl select-none transition-all duration-150
          ${ringColor}
          bg-gradient-to-b from-[#1e2030] to-[#161a28]
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#21253a] border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor} ${statusGlow}`} />
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest">Render</span>
          </div>
          <StatusBadge status={d.status} />
        </div>

        {/* Image / State area */}
        <div className="relative w-full aspect-square bg-[#0d1020] overflow-hidden">
          {d.status === "completed" && d.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.imageUrl}
                alt="render"
                className="w-full h-full object-cover"
                draggable={false}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100 gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); d.onPreview(); }}
                  className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-black shadow-lg hover:bg-white transition-colors"
                  title="Visualizar"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); d.onEdit(); }}
                  className="w-8 h-8 rounded-full bg-violet-500/90 flex items-center justify-center text-white shadow-lg hover:bg-violet-500 transition-colors"
                  title="Editar"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : d.status === "processing" ? (
            <ProcessingState />
          ) : d.status === "pending" ? (
            <PendingState />
          ) : d.status === "failed" ? (
            <FailedState message={d.errorMessage} />
          ) : null}
        </div>

        {/* Footer */}
        {d.status === "completed" && (
          <div className="px-3 py-2 flex items-center justify-between">
            <p className="text-[9px] text-white/30 truncate flex-1" title={d.prompt}>
              {d.prompt?.slice(0, 40) || "Renderizado"}
            </p>
            <div className="flex items-center gap-0.5 ml-1 shrink-0">
              <QuickBtn icon={<Download className="w-2.5 h-2.5" />} title="Baixar" onClick={d.onDownload} />
              <QuickBtn icon={<RefreshCw className="w-2.5 h-2.5" />} title="Re-render" onClick={d.onRerender} />
            </div>
          </div>
        )}
        {d.status === "failed" && (
          <div className="px-3 py-2 flex items-center justify-between">
            <p className="text-[9px] text-red-400/70 truncate flex-1">Falha na geração</p>
            <button
              onClick={(e) => { e.stopPropagation(); d.onRerender(); }}
              className="flex items-center gap-1 px-2 h-5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-[9px] text-red-300 font-bold transition-colors"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Tentar
            </button>
          </div>
        )}
        {(d.status === "pending" || d.status === "processing") && (
          <div className="px-3 py-2">
            <p className="text-[9px] text-white/30 text-center">
              {d.status === "pending" ? "Na fila..." : "Processando..."}
            </p>
          </div>
        )}
      </div>

      {/* ── Input Handle ── */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          width: 10, height: 10, left: -5,
          background: "#06b6d4",
          border: "2px solid #0e7490",
          boxShadow: "0 0 8px rgba(6,182,212,0.6)",
        }}
      />

      {/* ── Output Handle (for chaining) ── */}
      {d.status === "completed" && (
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{
            width: 10, height: 10, right: -5,
            background: "#7c3aed",
            border: "2px solid #4c1d95",
            boxShadow: "0 0 8px rgba(124,58,237,0.6)",
          }}
        />
      )}
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RenderStatus }) {
  const map: Record<RenderStatus, { label: string; cls: string }> = {
    pending:    { label: "Fila",        cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    processing: { label: "Gerando",     cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    completed:  { label: "Pronto",      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    failed:     { label: "Erro",        cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${cls}`}>
      {label}
    </span>
  );
}

function ProcessingState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      {/* Animated shimmer */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent animate-[shimmer_2s_infinite]" />
      {/* Animated rings */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-ping" />
        <div className="absolute inset-1 rounded-full border border-blue-500/30 animate-ping [animation-delay:0.3s]" />
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function PendingState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/20">
      <Play className="w-8 h-8" />
      <span className="text-[10px]">Na fila</span>
    </div>
  );
}

function FailedState({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-400/50 px-3">
      <AlertCircle className="w-7 h-7" />
      <p className="text-[9px] text-center leading-relaxed text-red-400/40 line-clamp-3">
        {message ?? "Erro na geração"}
      </p>
    </div>
  );
}

function ToolbarBtn({
  icon, title, onClick, accent = false, danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      title={title}
      className={`
        w-7 h-7 rounded-lg flex items-center justify-center transition-colors
        ${accent ? "text-violet-300 hover:bg-violet-500/20 hover:text-violet-200"
          : danger ? "text-white/30 hover:bg-red-500/20 hover:text-red-400"
          : "text-white/40 hover:bg-white/10 hover:text-white/80"}
      `}
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-white/10 mx-0.5" />;
}

function QuickBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className="w-5 h-5 rounded-md flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/10 transition-colors"
    >
      {icon}
    </button>
  );
}

export const RenderNode = memo(RenderNodeComponent);
