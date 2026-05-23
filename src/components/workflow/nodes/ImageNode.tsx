"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, NodeProps, NodeToolbar } from "@xyflow/react";
import {
  Loader2, AlertCircle, Download, Paintbrush, Trash2,
  Eye, RefreshCw, Copy, Maximize2, Play, Cpu, MoreHorizontal,
  FolderInput, Search, History, Upload,
} from "lucide-react";

import { useWorkflow } from "../WorkflowContext";

// ── Types ────────────────────────────────────────────────────────────────────

export type NodeKind   = "source" | "render";
export type NodeStatus = "pending" | "processing" | "completed" | "failed" | "ready";

export interface ImageNodeData extends Record<string, unknown> {
  nodeId:        string;
  nodeKind:      NodeKind;
  label?:        string;
  imageUrl?:     string;
  previewUrl?:   string;
  falUrl?:       string;
  status?:       NodeStatus;
  uploading?:    boolean;
  prompt?:       string;
  errorMessage?: string;
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_DOT: Record<NodeStatus, string> = {
  ready:      "bg-emerald-500",
  completed:  "bg-emerald-500",
  processing: "bg-blue-500 animate-pulse",
  pending:    "bg-amber-400",
  failed:     "bg-red-500",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  ready:      "Pronto",
  completed:  "Pronto",
  processing: "Gerando",
  pending:    "Fila",
  failed:     "Erro",
};

// ── Main component ────────────────────────────────────────────────────────────

function ImageNodeComponent({ data, selected }: NodeProps) {
  const d       = data as unknown as ImageNodeData;
  const actions = useWorkflow();
  const [menuOpen, setMenuOpen] = useState(false);

  const isSource     = d.nodeKind === "source";
  const status       = d.status ?? (d.falUrl && !d.uploading ? "ready" : "pending");
  const displayUrl   = d.imageUrl || d.previewUrl || "";
  const isCompleted  = status === "completed" || status === "ready";
  const isProcessing = status === "processing";
  const isFailed     = status === "failed";
  const isPending    = status === "pending";

  const borderColor = selected
    ? "ring-2 ring-[var(--color-brand)] shadow-[0_0_0_4px_rgba(249,115,22,0.12)]"
    : "ring-1 ring-gray-200 hover:ring-gray-300 hover:shadow-md";

  return (
    <>
      {/* ── NodeToolbar (visible on select) ── */}
      <NodeToolbar isVisible={selected} position={Position.Top} className="nodrag nopan">
        <Toolbar d={d} status={status} isSource={isSource} />
      </NodeToolbar>

      {/* ── Card ── */}
      <div
        className={`
          w-52 rounded-2xl overflow-visible select-none transition-all duration-150
          bg-white shadow-sm ${borderColor}
        `}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
              {isSource ? "Imagem" : STATUS_LABEL[status]}
            </span>
          </div>
          {/* ⋮ menu */}
          <div className="relative ml-auto">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors nodrag"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <DotMenu d={d} status={status} isSource={isSource} onClose={() => setMenuOpen(false)} />
            )}
          </div>
        </div>

        {/* ── Image area ── */}
        <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
          {displayUrl && !isProcessing && (!isPending || d.uploading) ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt={d.label ?? "imagem"}
                className="w-full h-full object-cover"
                draggable={false}
              />
              {/* Upload overlay */}
              {d.uploading && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-[var(--color-brand)] animate-spin" />
                  <span className="text-[10px] text-gray-500 font-medium">Enviando...</span>
                </div>
              )}
              {/* Hover overlay (completed only) */}
              {isCompleted && !d.uploading && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all duration-200
                  flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                  <OverlayBtn icon={<Eye className="w-3.5 h-3.5" />}        onClick={() => actions.onPreview(d.nodeId)}  title="Visualizar" />
                  <OverlayBtn icon={<Paintbrush className="w-3.5 h-3.5" />} onClick={() => actions.onEdit(d.nodeId)}     title="Editar" accent />
                  <OverlayBtn icon={<Download className="w-3.5 h-3.5" />}   onClick={() => actions.onDownload(d.nodeId)} title="Baixar" />
                </div>
              )}
            </>
          ) : isProcessing ? (
            <ProcessingState />
          ) : isPending && !displayUrl ? (
            <PendingState />
          ) : isFailed ? (
            <FailedState
              message={d.errorMessage}
              onRetry={() => isSource ? actions.onReplace(d.nodeId) : actions.onRender(d.nodeId)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <Upload className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-3 py-2 flex items-center gap-1.5">
          <p className="text-[10px] text-gray-400 truncate flex-1 font-medium" title={d.label ?? d.prompt}>
            {d.label ?? d.prompt?.slice(0, 30) ?? (isSource ? "imagem" : "render")}
          </p>
          {/* Quick actions */}
          {!d.uploading && (
            <div className="flex items-center gap-0.5 shrink-0">
              {isCompleted && (
                <QuickBtn icon={<Download className="w-3 h-3" />} title="Baixar" onClick={() => actions.onDownload(d.nodeId)} />
              )}
              <QuickBtn
                icon={isSource
                  ? <Cpu className="w-3 h-3" />
                  : <RefreshCw className="w-3 h-3" />
                }
                title={isSource ? "Renderizar" : "Re-renderizar"}
                onClick={() => actions.onRender(d.nodeId)}
                disabled={isProcessing || isPending || (isSource && !d.falUrl)}
                accent
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Handles ── */}
      {isSource && (
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={handleStyle("#F97316", "#ea580c")}
        />
      )}
      {!isSource && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            style={handleStyle("#F97316", "#ea580c")}
          />
          {isCompleted && (
            <Handle
              type="source"
              position={Position.Right}
              id="output"
              style={handleStyle("#F97316", "#ea580c")}
            />
          )}
        </>
      )}
    </>
  );
}

// ── Toolbar (shown on node select) ───────────────────────────────────────────

function Toolbar({ d, status, isSource }: { d: ImageNodeData; status: NodeStatus; isSource: boolean }) {
  const actions      = useWorkflow();
  const isCompleted  = status === "completed" || status === "ready";
  const isProcessing = status === "processing";

  return (
    <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl px-1.5 py-1 shadow-lg shadow-black/5">
      <TBtn icon={<Eye className="w-3.5 h-3.5" />}        title="Visualizar"       onClick={() => actions.onPreview(d.nodeId)}   disabled={!isCompleted} />
      {isCompleted && (
        <>
          <TBtn icon={<Maximize2 className="w-3.5 h-3.5" />}  title="Tela cheia"       onClick={() => actions.onPreview(d.nodeId)}   />
          <TBtn icon={<Paintbrush className="w-3.5 h-3.5" />} title="Editar / Inpaint" onClick={() => actions.onEdit(d.nodeId)}      accent />
        </>
      )}
      <TDivider />
      <TBtn
        icon={isSource ? <Cpu className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
        title={isSource ? "Renderizar" : "Re-renderizar"}
        onClick={() => actions.onRender(d.nodeId)}
        disabled={isProcessing || (isSource && !d.falUrl)}
        accent={isSource}
      />
      {isCompleted && (
        <TBtn icon={<Download className="w-3.5 h-3.5" />}  title="Baixar"        onClick={() => actions.onDownload(d.nodeId)}  />
      )}
      <TBtn icon={<Copy className="w-3.5 h-3.5" />}        title="Duplicar"      onClick={() => actions.onDuplicate(d.nodeId)} />
      {isSource && (
        <TBtn icon={<Upload className="w-3.5 h-3.5" />}    title="Substituir"    onClick={() => actions.onReplace(d.nodeId)}   />
      )}
      <TDivider />
      <TBtn icon={<Trash2 className="w-3.5 h-3.5" />}      title="Deletar (Del)" onClick={() => actions.onDelete(d.nodeId)}    danger />
    </div>
  );
}

// ── Dot menu (⋮ dropdown) ─────────────────────────────────────────────────────

function DotMenu({
  d, status, isSource, onClose,
}: { d: ImageNodeData; status: NodeStatus; isSource: boolean; onClose: () => void }) {
  const actions     = useWorkflow();
  const ref         = useRef<HTMLDivElement>(null);
  const isCompleted = status === "completed" || status === "ready";

  // C4 — close when clicking outside the dropdown (capture phase avoids RF interference)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [onClose]);

  function item(label: string, icon: React.ReactNode, onClick: () => void, accent = false, danger = false) {
    return (
      <button
        key={label}
        onClick={(e) => { e.stopPropagation(); onClick(); onClose(); }}
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-left transition-colors
          ${danger  ? "text-red-500 hover:bg-red-50"
            : accent ? "text-[var(--color-brand)] hover:bg-orange-50"
            : "text-gray-600 hover:bg-gray-50"
          }`}
      >
        <span className="shrink-0 text-gray-400">{icon}</span>
        {label}
      </button>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-7 z-50 min-w-[170px] bg-white border border-gray-200
        rounded-xl shadow-xl shadow-black/8 overflow-hidden animate-in fade-in zoom-in-95 duration-100 nodrag"
      onClick={(e) => e.stopPropagation()}
    >
      {item("Visualizar", <Eye className="w-3.5 h-3.5" />, () => actions.onPreview(d.nodeId))}
      {isCompleted && item("Editar / Inpaint", <Paintbrush className="w-3.5 h-3.5" />, () => actions.onEdit(d.nodeId), true)}
      {isCompleted && item("Baixar", <Download className="w-3.5 h-3.5" />, () => actions.onDownload(d.nodeId))}
      <div className="border-t border-gray-100 my-0.5" />
      {item(
        isSource ? "Renderizar" : "Re-renderizar",
        isSource ? <Cpu className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />,
        () => actions.onRender(d.nodeId), true,
      )}
      {item("Descobrir similares", <Search className="w-3.5 h-3.5" />,    () => actions.onFindSimilar(d.nodeId))}
      {item("Mover para pasta",    <FolderInput className="w-3.5 h-3.5" />, () => actions.onMoveToFolder(d.nodeId))}
      {item("Histórico",           <History className="w-3.5 h-3.5" />,    () => actions.onHistory(d.nodeId))}
      <div className="border-t border-gray-100 my-0.5" />
      {item("Duplicar", <Copy className="w-3.5 h-3.5" />, () => actions.onDuplicate(d.nodeId))}
      {isSource && item("Substituir imagem", <Upload className="w-3.5 h-3.5" />, () => actions.onReplace(d.nodeId))}
      <div className="border-t border-gray-100 my-0.5" />
      {item("Excluir", <Trash2 className="w-3.5 h-3.5" />, () => actions.onDelete(d.nodeId), false, true)}
    </div>
  );
}

// ── State visuals ─────────────────────────────────────────────────────────────

function ProcessingState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--color-brand)]/20 animate-ping" />
        <div className="absolute inset-1 rounded-full border border-[var(--color-brand)]/30 animate-ping [animation-delay:0.3s]" />
        <Loader2 className="w-6 h-6 text-[var(--color-brand)] animate-spin" />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)]/50 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-[10px] text-gray-400 font-medium">Gerando...</span>
    </div>
  );
}

function PendingState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300 bg-gray-50">
      <Play className="w-8 h-8" />
      <span className="text-[10px] font-medium">Na fila</span>
    </div>
  );
}

function FailedState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-50 px-3">
      <AlertCircle className="w-7 h-7 text-red-400" />
      <p className="text-[9px] text-center leading-relaxed text-red-400 line-clamp-3">
        {message ?? "Erro na geração"}
      </p>
      {onRetry && (
        <button
          onClick={(e) => { e.stopPropagation(); onRetry(); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-500 text-[9px] font-semibold transition-colors nodrag"
        >
          <RefreshCw className="w-3 h-3" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function TBtn({
  icon, title, onClick, accent = false, danger = false, disabled = false,
}: {
  icon: React.ReactNode; title: string;
  onClick?: () => void;
  accent?: boolean; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      title={title}
      disabled={disabled}
      className={`
        w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed
        ${accent ? "text-[var(--color-brand)] hover:bg-orange-50"
          : danger ? "text-gray-300 hover:bg-red-50 hover:text-red-500"
          : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}
      `}
    >
      {icon}
    </button>
  );
}

function TDivider() {
  return <div className="w-px h-4 bg-gray-200 mx-0.5" />;
}

function OverlayBtn({
  icon, onClick, title, accent = false,
}: { icon: React.ReactNode; onClick: () => void; title: string; accent?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className={`
        w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors nodrag
        ${accent
          ? "bg-[var(--color-brand)] text-white hover:bg-orange-600"
          : "bg-white text-gray-700 hover:bg-gray-50"
        }
      `}
    >
      {icon}
    </button>
  );
}

function QuickBtn({
  icon, title, onClick, disabled = false, accent = false,
}: { icon: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; accent?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      disabled={disabled}
      className={`
        w-6 h-6 rounded-md flex items-center justify-center transition-colors nodrag
        disabled:opacity-30 disabled:cursor-not-allowed
        ${accent
          ? "text-[var(--color-brand)] hover:bg-orange-50"
          : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"}
      `}
    >
      {icon}
    </button>
  );
}

function handleStyle(bg: string, border: string): React.CSSProperties {
  return {
    width: 12, height: 12,
    background: bg,
    border: `2px solid ${border}`,
    boxShadow: `0 0 0 3px ${bg}30`,
  };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const ImageNode = memo(ImageNodeComponent);
