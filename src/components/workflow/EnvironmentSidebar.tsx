"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, ChevronLeft, ChevronRight, Pencil, Trash2,
  Check, X, Loader2, Layers,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type EnvMeta = { id: string; name: string; createdAt: string };
type CanvasLike = { workflows?: Record<string, EnvMeta>; [key: string]: unknown };

// ── Pure helpers ──────────────────────────────────────────────────────────────

function sortEnvs(map: Record<string, EnvMeta>): EnvMeta[] {
  return Object.values(map).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function genId(): string {
  return `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  spaceId:   string;
  activeId:  string;
  spaceName: string;
  onSwitch:  (wfId: string) => void;
}

// ── EnvironmentSidebar ────────────────────────────────────────────────────────

export function EnvironmentSidebar({ spaceId, activeId, spaceName, onSwitch }: Props) {
  const [collapsed,       setCollapsed]       = useState(false);
  const [envs,            setEnvs]            = useState<EnvMeta[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [editingId,       setEditingId]       = useState<string | null>(null);
  const [editName,        setEditName]        = useState("");
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [creating,        setCreating]        = useState(false);
  const [createName,      setCreateName]      = useState("");
  const [saving,          setSaving]          = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/spaces/${spaceId}`);
      if (!res.ok) return;
      const data = await res.json() as { canvasData?: unknown };
      const wfMap = ((data.canvasData ?? {}) as CanvasLike).workflows ?? {};
      setEnvs(sortEnvs(wfMap));
    } catch { /* keep list empty — non-fatal */ }
    finally { setLoading(false); }
  }, [spaceId]);

  useEffect(() => { load(); }, [load]);

  // ── Patch helper ──────────────────────────────────────────────────────────

  function currentMap(): Record<string, EnvMeta> {
    return Object.fromEntries(envs.map((e) => [e.id, e]));
  }

  async function patchWorkflows(updated: Record<string, EnvMeta>) {
    const res = await fetch(`/api/spaces/${spaceId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ canvasData: { workflows: updated } }),
    });
    if (!res.ok) throw new Error("patch failed");
    setEnvs(sortEnvs(updated));
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async function handleCreate() {
    const name = createName.trim();
    if (!name) { setCreating(false); return; }
    setSaving(true);
    try {
      const id = genId();
      await patchWorkflows({
        ...currentMap(),
        [id]: { id, name, createdAt: new Date().toISOString() },
      });
      setCreating(false);
      setCreateName("");
      onSwitch(id);
    } catch {
      toast.error("Erro ao criar ambiente.");
    } finally {
      setSaving(false);
    }
  }

  // ── Rename ────────────────────────────────────────────────────────────────

  async function handleRename(env: EnvMeta) {
    const name = editName.trim();
    setEditingId(null);
    if (!name || name === env.name) return;
    try {
      await patchWorkflows({ ...currentMap(), [env.id]: { ...env, name } });
    } catch {
      toast.error("Erro ao renomear ambiente.");
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (envs.length <= 1) {
      toast.error("Não é possível remover o único ambiente.");
      setDeletePendingId(null);
      return;
    }
    setSaving(true);
    try {
      const updated = { ...currentMap() };
      delete updated[id];
      await patchWorkflows(updated);
      setDeletePendingId(null);
      if (id === activeId) {
        const first = sortEnvs(updated)[0];
        if (first) onSwitch(first.id);
      }
    } catch {
      toast.error("Erro ao remover ambiente.");
    } finally {
      setSaving(false);
    }
  }

  // ── Shared reset ──────────────────────────────────────────────────────────

  function cancelAll() {
    setEditingId(null);
    setDeletePendingId(null);
    setCreating(false);
    setCreateName("");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`
        relative shrink-0 flex flex-col bg-white border-r border-[var(--border-subtle)]
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-10" : "w-48"}
      `}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expandir ambientes" : "Recolher ambientes"}
        className="absolute -right-3 top-5 z-20 w-6 h-6 rounded-full bg-white border border-[var(--border-subtle)]
          flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]
          shadow-sm hover:shadow transition-all"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* ── COLLAPSED strip ── */}
      {collapsed && (
        <div className="flex flex-col items-center gap-1.5 pt-12 px-1.5">
          <Layers className="w-3.5 h-3.5 text-gray-300 mb-1 shrink-0" />
          {envs.map((env) => (
            <button
              key={env.id}
              onClick={() => onSwitch(env.id)}
              title={env.name}
              className={`
                w-7 h-7 rounded-lg flex items-center justify-center
                text-[9px] font-bold uppercase tracking-wide transition-colors
                ${env.id === activeId
                  ? "bg-[var(--color-brand)] text-white shadow-sm shadow-orange-200"
                  : "text-[var(--text-muted)] hover:bg-orange-50 hover:text-[var(--color-brand)]"
                }
              `}
            >
              {env.name.slice(0, 2)}
            </button>
          ))}
          <button
            onClick={() => { cancelAll(); setCollapsed(false); setCreating(true); }}
            title="Novo Ambiente"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-[var(--color-brand)] hover:bg-orange-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── EXPANDED ── */}
      {!collapsed && (
        <div className="flex flex-col h-full min-h-0">

          {/* Header */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Layers className="w-3 h-3 text-[var(--color-brand)]/50 shrink-0" />
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                Ambientes
              </span>
            </div>
            {spaceName && (
              <p className="text-[10px] font-semibold text-[var(--text-primary)] truncate leading-snug">
                {spaceName}
              </p>
            )}
          </div>

          <div className="h-px bg-[var(--border-subtle)] mx-2 shrink-0" />

          {/* Environment list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent min-h-0 py-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
              </div>
            ) : envs.length === 0 ? (
              <div className="px-3 py-5 text-center">
                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                  Nenhum ambiente ainda.
                </p>
              </div>
            ) : (
              envs.map((env) => (
                <EnvRow
                  key={env.id}
                  env={env}
                  isActive={env.id === activeId}
                  isEditing={editingId === env.id}
                  editName={editName}
                  isDeletePending={deletePendingId === env.id}
                  isSaving={saving}
                  canDelete={envs.length > 1}
                  onSelect={() => { cancelAll(); onSwitch(env.id); }}
                  onStartEdit={() => {
                    cancelAll();
                    setEditingId(env.id);
                    setEditName(env.name);
                  }}
                  onEditName={setEditName}
                  onSaveEdit={() => handleRename(env)}
                  onCancelEdit={() => setEditingId(null)}
                  onStartDelete={() => { cancelAll(); setDeletePendingId(env.id); }}
                  onConfirmDelete={() => handleDelete(env.id)}
                  onCancelDelete={() => setDeletePendingId(null)}
                />
              ))
            )}
          </div>

          {/* Footer — create */}
          <div className="border-t border-[var(--border-subtle)] p-2 shrink-0">
            {creating ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")  handleCreate();
                    if (e.key === "Escape") { setCreating(false); setCreateName(""); }
                  }}
                  placeholder="Nome do ambiente..."
                  className="flex-1 min-w-0 border border-[var(--border-default)] rounded-lg px-2 py-1
                    text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                    focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
                <button
                  onClick={handleCreate}
                  disabled={!createName.trim() || saving}
                  title="Confirmar"
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-green-600 hover:bg-green-50 disabled:opacity-40 shrink-0 transition-colors"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => { setCreating(false); setCreateName(""); }}
                  title="Cancelar"
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 shrink-0 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { cancelAll(); setCreating(true); }}
                className="w-full h-8 flex items-center gap-2 px-2 rounded-xl text-[11px] font-medium
                  text-[var(--text-muted)] hover:text-[var(--color-brand)] hover:bg-orange-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                Novo Ambiente
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── EnvRow ────────────────────────────────────────────────────────────────────

interface EnvRowProps {
  env:             EnvMeta;
  isActive:        boolean;
  isEditing:       boolean;
  editName:        string;
  isDeletePending: boolean;
  isSaving:        boolean;
  canDelete:       boolean;
  onSelect:        () => void;
  onStartEdit:     () => void;
  onEditName:      (n: string) => void;
  onSaveEdit:      () => void;
  onCancelEdit:    () => void;
  onStartDelete:   () => void;
  onConfirmDelete: () => void;
  onCancelDelete:  () => void;
}

function EnvRow({
  env, isActive, isEditing, editName, isDeletePending, isSaving, canDelete,
  onSelect, onStartEdit, onEditName, onSaveEdit, onCancelEdit,
  onStartDelete, onConfirmDelete, onCancelDelete,
}: EnvRowProps) {

  // Editing state
  if (isEditing) {
    return (
      <div className="px-2 py-1">
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")  onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            className="flex-1 min-w-0 border border-[var(--border-default)] rounded-lg px-2 py-0.5
              text-[11px] font-medium text-[var(--text-primary)]
              focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
          <button
            onClick={onSaveEdit}
            title="Salvar"
            className="w-5 h-5 flex items-center justify-center rounded text-green-600 hover:bg-green-50 shrink-0 transition-colors"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={onCancelEdit}
            title="Cancelar"
            className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 shrink-0 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Delete confirmation state
  if (isDeletePending) {
    return (
      <div className="mx-1 px-2 py-2 mb-0.5 rounded-xl bg-red-50">
        <p className="text-[9px] text-red-500 font-medium mb-1.5 truncate">
          Remover &ldquo;{env.name}&rdquo;?
        </p>
        <div className="flex gap-1">
          <button
            onClick={onConfirmDelete}
            disabled={isSaving}
            className="flex-1 h-5 text-[9px] font-semibold bg-red-500 text-white rounded-lg
              hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "..." : "Remover"}
          </button>
          <button
            onClick={onCancelDelete}
            className="flex-1 h-5 text-[9px] font-medium bg-white text-gray-600 border border-gray-200
              rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Default row
  return (
    <div
      onClick={onSelect}
      className={`
        group flex items-center gap-1.5 px-2 py-1.5 mx-1 mb-0.5 rounded-xl cursor-pointer transition-colors
        ${isActive
          ? "bg-orange-50 text-[var(--color-brand)]"
          : "text-[var(--text-muted)] hover:bg-gray-50 hover:text-[var(--text-primary)]"
        }
      `}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors
          ${isActive ? "bg-[var(--color-brand)]" : "bg-gray-200 group-hover:bg-gray-300"}
        `}
      />
      <span className={`flex-1 text-[11px] truncate ${isActive ? "font-semibold" : "font-medium"}`}>
        {env.name}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
          title="Renomear"
          className="w-4 h-4 rounded flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onStartDelete(); }}
            title="Remover"
            className="w-4 h-4 rounded flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}
