"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Copy, Trash2, RefreshCw, Download, Paintbrush, Eye,
  Maximize2, Cpu, Unlink, Layers, FolderInput,
  Search, History,
} from "lucide-react";
import { NodeStatus } from "./nodes/ImageNode";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  nodeKind: "source" | "render";
  nodeStatus?: NodeStatus;
}

interface Props {
  menu: ContextMenuState;
  onClose: () => void;
  onDelete:       (id: string) => void;
  onDuplicate:    (id: string) => void;
  onPreview:      (id: string) => void;
  onDownload:     (id: string) => void;
  onEdit:         (id: string) => void;
  onRerender:     (id: string) => void;
  onRender:       (id: string) => void;
  onDisconnect:   (id: string) => void;
  onFitView:      () => void;
  onHistory:      (id: string) => void;
  onFindSimilar:  (id: string) => void;
  onMoveToFolder: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ContextMenu({
  menu, onClose,
  onDelete, onDuplicate, onPreview,
  onDownload, onEdit, onRerender,
  onRender, onDisconnect, onFitView,
  onHistory, onFindSimilar, onMoveToFolder,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: menu.x, y: menu.y });

  // C8 — clamp to viewport after first paint (no visual flicker via useLayoutEffect)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      x: Math.min(menu.x, window.innerWidth  - width  - 8),
      y: Math.min(menu.y, window.innerHeight - height - 8),
    });
  }, [menu.x, menu.y]);

  // Click-outside + Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const id          = menu.nodeId;
  const isCompleted = menu.nodeStatus === "completed" || menu.nodeStatus === "ready";
  const isFailed    = menu.nodeStatus === "failed";
  const isSource    = menu.nodeKind === "source";
  // C6 — re-render only meaningful for completed/failed nodes, not pending/processing
  const canRerender = isFailed || (!isSource && isCompleted);

  return (
    <div
      ref={ref}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[9999] min-w-[185px] rounded-xl overflow-hidden
        bg-white border border-gray-200 shadow-xl shadow-black/8
        animate-in fade-in zoom-in-95 duration-100"
    >
      {/* ── View ── */}
      <MenuSection label="Visualizar" />
      <MenuItem icon={<Eye className="w-3.5 h-3.5" />}         label="Visualizar"          onClick={() => { onPreview(id); onClose(); }} />
      {isCompleted && (
        <>
          <MenuItem icon={<Maximize2 className="w-3.5 h-3.5" />}  label="Tela cheia"        onClick={() => { onPreview(id); onClose(); }} />
          <MenuItem icon={<Paintbrush className="w-3.5 h-3.5" />} label="Editar / Inpaint"  onClick={() => { onEdit(id); onClose(); }}    accent />
          <MenuItem icon={<Download className="w-3.5 h-3.5" />}   label="Baixar"            onClick={() => { onDownload(id); onClose(); }} />
        </>
      )}

      {/* ── Actions ── */}
      <div className="border-t border-gray-100 my-0.5" />
      <MenuSection label="Ações" />
      {isSource && (
        <MenuItem icon={<Cpu className="w-3.5 h-3.5" />}        label="Renderizar"          onClick={() => { onRender(id); onClose(); }}   accent />
      )}
      {canRerender && (
        <MenuItem icon={<RefreshCw className="w-3.5 h-3.5" />}  label="Re-renderizar"       onClick={() => { onRerender(id); onClose(); }} />
      )}
      <MenuItem icon={<Search className="w-3.5 h-3.5" />}       label="Descobrir similares" onClick={() => { onFindSimilar(id); onClose(); }} />
      <MenuItem icon={<FolderInput className="w-3.5 h-3.5" />}  label="Mover para pasta"   onClick={() => { onMoveToFolder(id); onClose(); }} />
      <MenuItem icon={<History className="w-3.5 h-3.5" />}      label="Histórico"           onClick={() => { onHistory(id); onClose(); }} />

      {/* ── Node ── */}
      <div className="border-t border-gray-100 my-0.5" />
      <MenuSection label="Nó" />
      <MenuItem icon={<Copy className="w-3.5 h-3.5" />}         label="Duplicar"            onClick={() => { onDuplicate(id); onClose(); }} />
      <MenuItem icon={<Unlink className="w-3.5 h-3.5" />}       label="Desconectar"         onClick={() => { onDisconnect(id); onClose(); }} />

      {/* ── Canvas ── */}
      <div className="border-t border-gray-100 my-0.5" />
      <MenuSection label="Canvas" />
      <MenuItem icon={<Layers className="w-3.5 h-3.5" />}       label="Ajustar visualização" onClick={() => { onFitView(); onClose(); }} />

      {/* ── Delete ── */}
      <div className="border-t border-gray-100 my-0.5" />
      <MenuItem icon={<Trash2 className="w-3.5 h-3.5" />}       label="Excluir nó (Del)"   onClick={() => { onDelete(id); onClose(); }}  danger />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MenuSection({ label }: { label: string }) {
  return (
    <div className="px-3 pt-2 pb-0.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-300">{label}</span>
    </div>
  );
}

function MenuItem({
  icon, label, onClick, accent = false, danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium transition-colors text-left
        ${danger  ? "text-red-500 hover:bg-red-50"
          : accent ? "text-[var(--color-brand)] hover:bg-orange-50"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
      `}
    >
      <span className={`shrink-0 ${danger ? "text-red-400" : accent ? "text-[var(--color-brand)]" : "text-gray-400"}`}>
        {icon}
      </span>
      {label}
    </button>
  );
}
