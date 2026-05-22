"use client";

import { memo } from "react";
import { Handle, Position, NodeProps, NodeToolbar } from "@xyflow/react";
import {
  Upload, X, RefreshCw, Loader2, Cpu, Play,
  Download, Copy, Trash2, Eye,
} from "lucide-react";

export interface SourceNodeData extends Record<string, unknown> {
  label: string;
  previewUrl: string;
  falUrl?: string;
  uploading?: boolean;
  // callbacks stored in node data
  onDelete: () => void;
  onReplace: () => void;
  onRender: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
}

function SourceNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as SourceNodeData;

  return (
    <>
      {/* ── Floating Toolbar ── */}
      <NodeToolbar isVisible={selected} position={Position.Top} className="nodrag nopan">
        <div className="flex items-center gap-0.5 bg-[#1a1a2e] border border-[#2d2d4e] rounded-xl px-1.5 py-1 shadow-2xl">
          <ToolbarBtn icon={<Eye className="w-3.5 h-3.5" />}    title="Visualizar (V)"   onClick={d.onPreview}   />
          <ToolbarBtn icon={<Play className="w-3.5 h-3.5" />}   title="Renderizar (R)"  onClick={d.onRender}    accent />
          <ToolbarDivider />
          <ToolbarBtn icon={<RefreshCw className="w-3.5 h-3.5" />} title="Substituir"   onClick={d.onReplace}  />
          <ToolbarBtn icon={<Download className="w-3.5 h-3.5" />}  title="Baixar"       onClick={d.onDownload} />
          <ToolbarBtn icon={<Copy className="w-3.5 h-3.5" />}      title="Duplicar"     onClick={d.onDuplicate}/>
          <ToolbarDivider />
          <ToolbarBtn icon={<Trash2 className="w-3.5 h-3.5" />}    title="Deletar (Del)"onClick={d.onDelete}   danger />
        </div>
      </NodeToolbar>

      {/* ── Node body ── */}
      <div
        className={`
          w-52 rounded-2xl overflow-hidden shadow-2xl select-none transition-all duration-150
          ${selected
            ? "ring-2 ring-[#7c3aed] shadow-[0_0_24px_rgba(124,58,237,0.4)]"
            : "ring-1 ring-white/10 hover:ring-white/20"
          }
          bg-gradient-to-b from-[#1e1e30] to-[#16162a]
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#252540] border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]" />
            <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">Source</span>
          </div>
          <div className="flex items-center gap-1">
            {d.uploading && <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />}
            {d.falUrl && !d.uploading && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            <button
              onClick={(e) => { e.stopPropagation(); d.onDelete(); }}
              className="w-5 h-5 rounded-md flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Remover"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Image preview */}
        <div className="relative w-full aspect-square bg-[#0f0f1a] overflow-hidden">
          {d.previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={d.previewUrl}
              alt={d.label}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
              <Upload className="w-8 h-8 mb-2" />
              <span className="text-xs">Carregando...</span>
            </div>
          )}
          {d.uploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              <span className="text-[10px] text-white/70">Enviando...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2">
          <p className="text-[10px] text-white/50 truncate font-medium" title={d.label}>{d.label}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); d.onRender(); }}
              disabled={!d.falUrl || d.uploading}
              className="flex-1 h-6 rounded-lg text-[10px] font-bold bg-violet-600/80 hover:bg-violet-600 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center gap-1 transition-colors"
            >
              <Cpu className="w-2.5 h-2.5" />
              Renderizar
            </button>
          </div>
        </div>
      </div>

      {/* ── Output Handle ── */}
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
    </>
  );
}

// ── Toolbar helpers ─────────────────────────────────────────────────────────

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

export const SourceNode = memo(SourceNodeComponent);
