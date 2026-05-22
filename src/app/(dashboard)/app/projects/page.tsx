"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  FolderOpen, Folder, Plus, Loader2, Download,
  MoreHorizontal, Pencil, Trash2, Check, X,
  FolderInput, Image as ImageIcon, Grid3X3, ChevronRight,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────
interface Project {
  id:        string;
  name:      string;
  color:     string;
  createdAt: string;
  _count:    { generations: number };
}

interface Generation {
  id:          string;
  tool:        string;
  model:       string;
  prompt:      string;
  status:      "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  outputUrls:  string[];
  creditsCost: number;
  errorMessage?: string | null;
  createdAt:   string;
  projectId:   string | null;
}

// ── Preset folder colors ───────────────────────────────────────
const COLORS = [
  "#F97316", "#8B5CF6", "#3B82F6", "#22C55E",
  "#EF4444", "#EAB308", "#EC4899", "#6B7280",
];

// ── Small helpers ──────────────────────────────────────────────
function toolLabel(tool: string) {
  if (tool === "IMAGE_EDIT")    return "Render 3D";
  if (tool === "VIDEO_GENERATE") return "Vídeo";
  if (tool === "AUDIO_TTS")     return "Narração";
  return "Imagem";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ── Move-to-folder popover ─────────────────────────────────────
function MovePopover({
  generation, projects, onMove, onClose,
}: {
  generation: Generation;
  projects:   Project[];
  onMove:     (genId: string, projectId: string | null) => void;
  onClose:    () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-8 right-0 z-30 w-48 bg-white rounded-xl border border-[var(--border-default)] shadow-xl py-1 text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
        Mover para
      </p>

      {/* Sem pasta */}
      <button
        onClick={() => { onMove(generation.id, null); onClose(); }}
        className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors ${
          !generation.projectId ? "text-[var(--color-brand)]" : "text-[var(--text-primary)]"
        }`}
      >
        <FolderOpen className="w-3.5 h-3.5 shrink-0 opacity-50" />
        <span className="truncate">Sem pasta</span>
        {!generation.projectId && <Check className="w-3 h-3 ml-auto shrink-0" />}
      </button>

      {projects.length > 0 && <div className="mx-2 my-1 border-t border-[var(--border-subtle)]" />}

      {projects.map((p) => (
        <button
          key={p.id}
          onClick={() => { onMove(generation.id, p.id); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors ${
            generation.projectId === p.id ? "text-[var(--color-brand)]" : "text-[var(--text-primary)]"
          }`}
        >
          <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: p.color }} />
          <span className="truncate">{p.name}</span>
          {generation.projectId === p.id && <Check className="w-3 h-3 ml-auto shrink-0" />}
        </button>
      ))}
    </div>
  );
}

// ── Generation card ────────────────────────────────────────────
function GenCard({
  gen, projects, onMove,
}: {
  gen:      Generation;
  projects: Project[];
  onMove:   (genId: string, projectId: string | null) => void;
}) {
  const [showMove, setShowMove] = useState(false);

  return (
    <div className="group relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-white hover:shadow-md transition-all">
      {/* Image */}
      {gen.outputUrls[0] ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--bg-secondary)]">
          <Image
            src={gen.outputUrls[0]}
            alt={gen.prompt ?? ""}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Hover actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Move to folder */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMove((v) => !v); }}
                title="Mover para pasta"
                className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm hover:bg-white transition-colors"
              >
                <FolderInput className="w-3.5 h-3.5 text-[var(--text-primary)]" />
              </button>
              {showMove && (
                <MovePopover
                  generation={gen}
                  projects={projects}
                  onMove={onMove}
                  onClose={() => setShowMove(false)}
                />
              )}
            </div>
            {/* Download */}
            <a
              href={gen.outputUrls[0]}
              download
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[var(--text-primary)]" />
            </a>
          </div>
          {/* Folder badge */}
          {gen.projectId && (() => {
            const p = projects.find((pr) => pr.id === gen.projectId);
            return p ? (
              <div
                className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white"
                style={{ background: p.color + "cc" }}
              >
                <Folder className="w-2.5 h-2.5" />
                {p.name}
              </div>
            ) : null;
          })()}
        </div>
      ) : gen.status === "FAILED" ? (
        <div className="aspect-[4/3] bg-red-50 flex flex-col items-center justify-center gap-1">
          <X className="w-5 h-5 text-red-400" />
          <p className="text-[10px] text-red-400 font-medium">Falhou</p>
        </div>
      ) : (
        <div className="aspect-[4/3] bg-[var(--bg-secondary)] shimmer flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
        </div>
      )}

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="text-[11px] text-[var(--text-primary)] line-clamp-2 leading-relaxed font-medium">
          {gen.prompt ?? "(sem prompt)"}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-[var(--text-muted)]">
            {toolLabel(gen.tool)} · {fmtDate(gen.createdAt)}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            gen.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700"
            : gen.status === "FAILED"  ? "bg-red-50 text-red-700"
            : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
          }`}>
            {gen.status === "COMPLETED" ? "Concluído"
              : gen.status === "FAILED" ? "Falhou"
              : "Processando"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Folder sidebar item ────────────────────────────────────────
function FolderItem({
  project, count, isActive, onClick, onRename, onDelete,
}: {
  project:  Project | null; // null = "Todos" or "Sem pasta"
  count:    number;
  isActive: boolean;
  onClick:  () => void;
  onRename?: (name: string, color: string) => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing]   = useState(false);
  const [name, setName]         = useState(project?.name ?? "");
  const [color, setColor]       = useState(project?.color ?? "#F97316");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function saveEdit() {
    if (name.trim() && onRename) onRename(name.trim(), color);
    setEditing(false);
  }

  const isSpecial = !project; // "Todos" rows
  const colorHex  = project?.color ?? "#9CA3AF";

  return (
    <div className="relative group/item">
      {editing ? (
        <div className="px-3 py-2 space-y-2">
          <div className="flex gap-1 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-5 h-5 rounded-md border-2 transition-all"
                style={{ background: c, borderColor: color === c ? "#000" : "transparent" }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 h-7 text-xs px-2 rounded-lg border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-brand)]"
            />
            <button onClick={saveEdit} className="w-6 h-6 flex items-center justify-center rounded-md bg-[var(--color-brand)] text-white">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => setEditing(false)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onClick}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors text-xs font-medium ${
            isActive
              ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
              : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          {isSpecial ? (
            <Grid3X3 className="w-3.5 h-3.5 shrink-0 opacity-60" />
          ) : (
            <div className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ background: colorHex }} />
          )}
          <span className="flex-1 truncate">{project?.name ?? "Todos"}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
            isActive ? "bg-[var(--color-brand)]/20 text-[var(--color-brand)]" : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
          }`}>
            {count}
          </span>
          {/* ⋮ menu button — only for real folders */}
          {!isSpecial && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
              className="w-5 h-5 flex items-center justify-center rounded-md opacity-0 group-hover/item:opacity-100 hover:bg-[var(--bg-hover)] transition-all shrink-0"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          )}
        </button>
      )}

      {/* Folder context menu */}
      {showMenu && !isSpecial && (
        <div
          ref={menuRef}
          className="absolute left-full top-0 ml-1 z-20 w-36 bg-white rounded-xl border border-[var(--border-default)] shadow-xl py-1 text-xs"
        >
          <button
            onClick={() => { setEditing(true); setName(project!.name); setColor(project!.color); setShowMenu(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
          >
            <Pencil className="w-3.5 h-3.5" />Renomear
          </button>
          <button
            onClick={() => { if (onDelete) onDelete(); setShowMenu(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />Excluir pasta
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function ProjectsPage() {
  const [projects, setProjects]       = useState<Project[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedId, setSelectedId]   = useState<string | "all" | "none">("all");

  // New folder creation
  const [creatingFolder, setCreatingFolder]   = useState(false);
  const [newFolderName, setNewFolderName]     = useState("");
  const [newFolderColor, setNewFolderColor]   = useState(COLORS[0]);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/generations").then((r) => r.json()),
    ]).then(([projs, gens]) => {
      setProjects(Array.isArray(projs) ? projs : []);
      setGenerations(Array.isArray(gens) ? gens : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (creatingFolder) setTimeout(() => newFolderInputRef.current?.focus(), 50);
  }, [creatingFolder]);

  // ── Computed counts ────────────────────────────────────────
  const totalCount  = generations.length;
  const noFolderCount = generations.filter((g) => !g.projectId).length;

  function projectCount(projectId: string) {
    return generations.filter((g) => g.projectId === projectId).length;
  }

  // ── Filtered view ──────────────────────────────────────────
  const visible = selectedId === "all"  ? generations
    : selectedId === "none" ? generations.filter((g) => !g.projectId)
    : generations.filter((g) => g.projectId === selectedId);

  const activeProject = selectedId !== "all" && selectedId !== "none"
    ? projects.find((p) => p.id === selectedId)
    : null;

  // ── CRUD handlers ──────────────────────────────────────────
  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const res  = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newFolderColor }),
      });
      const proj = await res.json();
      if (!res.ok) throw new Error(proj.error);
      setProjects((prev) => [...prev, proj]);
      setSelectedId(proj.id);
      setCreatingFolder(false);
      setNewFolderName("");
      toast.success(`Pasta "${name}" criada`);
    } catch {
      toast.error("Falha ao criar pasta");
    }
  }

  async function renameFolder(id: string, name: string, color: string) {
    try {
      const res  = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      const proj = await res.json();
      if (!res.ok) throw new Error(proj.error);
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, name: proj.name, color: proj.color } : p));
      toast.success("Pasta renomeada");
    } catch {
      toast.error("Falha ao renomear");
    }
  }

  async function deleteFolder(id: string) {
    if (!confirm("Excluir esta pasta? As gerações dentro dela serão mantidas.")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setGenerations((prev) => prev.map((g) => g.projectId === id ? { ...g, projectId: null } : g));
      if (selectedId === id) setSelectedId("all");
      toast.success("Pasta excluída");
    } catch {
      toast.error("Falha ao excluir pasta");
    }
  }

  async function moveGeneration(genId: string, projectId: string | null) {
    try {
      const res = await fetch(`/api/generations/${genId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error();
      setGenerations((prev) =>
        prev.map((g) => g.id === genId ? { ...g, projectId } : g)
      );
      const project = projectId ? projects.find((p) => p.id === projectId) : null;
      toast.success(project ? `Movido para "${project.name}"` : "Removido da pasta");
    } catch {
      toast.error("Falha ao mover geração");
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen">
      <TopBar breadcrumb={[{ label: "Projetos" }]} />

      <div className="flex flex-1 min-h-0">

        {/* ══ LEFT SIDEBAR ══ */}
        <div className="w-56 shrink-0 border-r border-[var(--border-subtle)] flex flex-col bg-white overflow-y-auto py-3 gap-0.5 px-2">
          <p className="px-3 mb-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            Pastas
          </p>

          {/* Todos */}
          <FolderItem
            project={null}
            count={totalCount}
            isActive={selectedId === "all"}
            onClick={() => setSelectedId("all")}
          />

          {/* Sem pasta */}
          <button
            onClick={() => setSelectedId("none")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors text-xs font-medium ${
              selectedId === "none"
                ? "bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <span className="flex-1">Sem pasta</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
              selectedId === "none" ? "bg-[var(--color-brand)]/20 text-[var(--color-brand)]" : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
            }`}>
              {noFolderCount}
            </span>
          </button>

          {/* Separator */}
          {projects.length > 0 && (
            <div className="mx-3 my-1 border-t border-[var(--border-subtle)]" />
          )}

          {/* Project folders */}
          {projects.map((p) => (
            <FolderItem
              key={p.id}
              project={p}
              count={projectCount(p.id)}
              isActive={selectedId === p.id}
              onClick={() => setSelectedId(p.id)}
              onRename={(name, color) => renameFolder(p.id, name, color)}
              onDelete={() => deleteFolder(p.id)}
            />
          ))}

          {/* Create folder inline */}
          {creatingFolder ? (
            <div className="px-3 py-2 space-y-2 mt-1">
              <div className="flex gap-1 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewFolderColor(c)}
                    className="w-5 h-5 rounded-md border-2 transition-all"
                    style={{ background: c, borderColor: newFolderColor === c ? "#000" : "transparent" }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <input
                  ref={newFolderInputRef}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setCreatingFolder(false); }}
                  placeholder="Nome da pasta"
                  className="flex-1 h-7 text-xs px-2 rounded-lg border border-[var(--border-default)] focus:outline-none focus:border-[var(--color-brand)]"
                />
                <button
                  onClick={createFolder}
                  disabled={!newFolderName.trim()}
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-[var(--color-brand)] text-white disabled:opacity-40"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setCreatingFolder(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreatingFolder(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--color-brand)] hover:bg-[var(--bg-hover)] transition-colors mt-1 w-full"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova pasta
            </button>
          )}
        </div>

        {/* ══ RIGHT CONTENT ══ */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-5 max-w-7xl">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                <span
                  className="font-semibold text-[var(--text-primary)] cursor-pointer hover:text-[var(--color-brand)]"
                  onClick={() => setSelectedId("all")}
                >
                  Projetos
                </span>
                {activeProject && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: activeProject.color }} />
                      <span className="font-semibold text-[var(--text-primary)]">{activeProject.name}</span>
                    </div>
                  </>
                )}
                {selectedId === "none" && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[var(--text-primary)]">Sem pasta</span>
                  </>
                )}
                <span className="text-[var(--text-muted)]">· {visible.length} geraç{visible.length === 1 ? "ão" : "ões"}</span>
              </div>
              <a href="/app/ai-image-generator">
                <button className="h-9 px-4 flex items-center gap-2 rounded-xl brand-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  <Plus className="w-4 h-4" />
                  Nova geração
                </button>
              </a>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
              </div>
            )}

            {/* Empty state */}
            {!loading && visible.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[var(--border-default)] rounded-2xl text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center mb-3">
                  {activeProject ? (
                    <div className="w-7 h-7 rounded-lg" style={{ background: activeProject.color + "33" }}>
                      <Folder className="w-full h-full p-1" style={{ color: activeProject.color }} />
                    </div>
                  ) : (
                    <ImageIcon className="w-6 h-6 text-[var(--text-muted)]" />
                  )}
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  {activeProject ? `"${activeProject.name}" está vazio` : "Nenhuma geração aqui"}
                </p>
                <p className="text-xs text-[var(--text-muted)] mb-4 max-w-xs">
                  {activeProject
                    ? "Mova gerações para esta pasta clicando no ícone de pasta em cada imagem"
                    : "Crie sua primeira geração para ver aqui"}
                </p>
                {!activeProject && (
                  <a href="/app/ai-image-generator">
                    <button className="h-8 px-4 rounded-xl brand-gradient text-white text-xs font-semibold hover:opacity-90 transition-opacity">
                      Gerar imagem
                    </button>
                  </a>
                )}
              </div>
            )}

            {/* Grid */}
            {!loading && visible.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {visible.map((gen) => (
                  <GenCard
                    key={gen.id}
                    gen={gen}
                    projects={projects}
                    onMove={moveGeneration}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
