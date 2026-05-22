"use client";

import { useEffect, useRef } from "react";
import {
  Copy, Trash2, RefreshCw, Download, Paintbrush, Eye,
  Maximize2, Play, Unlink, Layers,
} from "lucide-react";

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  nodeType: "source" | "render";
  nodeStatus?: "pending" | "processing" | "completed" | "failed";
}

interface Props {
  menu: ContextMenuState;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPreview: (id: string) => void;
  onDownload: (id: string) => void;
  onEdit: (id: string) => void;
  onRerender: (id: string) => void;
  onRender: (id: string) => void;
  onDisconnect: (id: string) => void;
  onFitView: () => void;
}

export function ContextMenu({
  menu, onClose,
  onDelete, onDuplicate, onPreview,
  onDownload, onEdit, onRerender,
  onRender, onDisconnect, onFitView,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const id = menu.nodeId;
  const isCompleted = menu.nodeStatus === "completed";
  const isFailed    = menu.nodeStatus === "failed";
  const isSource    = menu.nodeType === "source";

  return (
    <div
      ref={ref}
      style={{ left: menu.x, top: menu.y }}
      className="fixed z-[9999] min-w-[180px] rounded-xl overflow-hidden
        bg-[#1a1a2e] border border-[#2d2d4e] shadow-2xl
        animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Section: View */}
      {(isCompleted || isSource) && (
        <>
          <MenuSection label="Visualizar" />
          {isCompleted && (
            <>
              <MenuItem icon={<Eye className="w-3.5 h-3.5" />}         label="Visualizar"         onClick={() => { onPreview(id); onClose(); }} />
              <MenuItem icon={<Maximize2 className="w-3.5 h-3.5" />}   label="Tela cheia"         onClick={() => { onPreview(id); onClose(); }} />
            </>
          )}
          {isSource && (
            <MenuItem icon={<Eye className="w-3.5 h-3.5" />}           label="Ver imagem"         onClick={() => { onPreview(id); onClose(); }} />
          )}
        </>
      )}

      {/* Section: Actions */}
      <MenuSection label="Ações" />
      {isSource && (
        <MenuItem icon={<Play className="w-3.5 h-3.5" />}              label="Renderizar"         onClick={() => { onRender(id); onClose(); }}   accent />
      )}
      {(isFailed || isCompleted) && (
        <MenuItem icon={<RefreshCw className="w-3.5 h-3.5" />}         label="Re-renderizar"      onClick={() => { onRerender(id); onClose(); }} />
      )}
      {isCompleted && (
        <MenuItem icon={<Paintbrush className="w-3.5 h-3.5" />}        label="Editar / Inpaint"   onClick={() => { onEdit(id); onClose(); }}     accent />
      )}
      {isCompleted && (
        <MenuItem icon={<Download className="w-3.5 h-3.5" />}          label="Baixar"             onClick={() => { onDownload(id); onClose(); }} />
      )}

      {/* Section: Node */}
      <MenuSection label="Nó" />
      <MenuItem icon={<Copy className="w-3.5 h-3.5" />}                label="Duplicar"           onClick={() => { onDuplicate(id); onClose(); }} />
      <MenuItem icon={<Unlink className="w-3.5 h-3.5" />}              label="Desconectar arestas" onClick={() => { onDisconnect(id); onClose(); }} />

      {/* Section: Canvas */}
      <MenuSection label="Canvas" />
      <MenuItem icon={<Layers className="w-3.5 h-3.5" />}              label="Ajustar visualização" onClick={() => { onFitView(); onClose(); }} />

      {/* Divider + Delete */}
      <div className="border-t border-white/5 my-0.5" />
      <MenuItem icon={<Trash2 className="w-3.5 h-3.5" />}              label="Deletar nó (Del)"   onClick={() => { onDelete(id); onClose(); }}  danger />
    </div>
  );
}

function MenuSection({ label }: { label: string }) {
  return (
    <div className="px-3 pt-2 pb-0.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">{label}</span>
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
        ${danger  ? "text-red-400 hover:bg-red-500/10"
          : accent ? "text-violet-300 hover:bg-violet-500/10"
          : "text-white/60 hover:bg-white/5 hover:text-white/90"}
      `}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </button>
  );
}
