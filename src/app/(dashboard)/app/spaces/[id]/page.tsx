"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2,
  Check, X, Layout, ExternalLink,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type WorkflowMeta = {
  id:        string;
  name:      string;
  createdAt: string;
};

type CanvasLike = {
  workflows?: Record<string, WorkflowMeta>;
  [key: string]: unknown;
};

type SpaceDetail = {
  id:           string;
  name:         string;
  thumbnailUrl: string | null;
  canvasData:   unknown;
  createdAt:    string;
  updatedAt:    string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return `há ${Math.floor(d / 30)}mes`;
}

function genId() {
  return `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getWorkflows(canvasData: unknown): Record<string, WorkflowMeta> {
  return ((canvasData ?? {}) as CanvasLike).workflows ?? {};
}

// ── WorkflowCard ──────────────────────────────────────────────────────────────

function WorkflowCard({
  wf,
  isEditing,
  editName,
  isDeletePending,
  isDeleting,
  onStartEdit,
  onEditName,
  onSaveEdit,
  onCancelEdit,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
  onOpen,
}: {
  wf:              WorkflowMeta;
  isEditing:       boolean;
  editName:        string;
  isDeletePending: boolean;
  isDeleting:      boolean;
  onStartEdit:     () => void;
  onEditName:      (n: string) => void;
  onSaveEdit:      () => void;
  onCancelEdit:    () => void;
  onStartDelete:   () => void;
  onConfirmDelete: () => void;
  onCancelDelete:  () => void;
  onOpen:          () => void;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-[var(--border-default)] bg-white overflow-hidden hover:border-[var(--color-brand)] hover:shadow-md transition-all">
      {/* Icon area */}
      <div className="h-24 bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
        <Layout className="w-8 h-8 text-purple-300" />
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-1.5">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={editName}
              onChange={(e) => onEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              className="flex-1 min-w-0 border border-[var(--border-default)] rounded-lg px-2 py-0.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
            <button onClick={onSaveEdit} className="p-0.5 text-green-600 hover:bg-green-50 rounded shrink-0">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={onCancelEdit} className="p-0.5 text-gray-400 hover:bg-gray-100 rounded shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{wf.name}</p>
        )}

        <p className="text-[10px] text-[var(--text-muted)]">{fmtRelative(wf.createdAt)}</p>

        {isDeletePending ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-red-500 font-medium flex-1">Remover ambiente?</span>
            <button
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="text-[10px] px-2 py-0.5 bg-red-500 text-white rounded font-medium hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? "..." : "Sim"}
            </button>
            <button
              onClick={onCancelDelete}
              className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium hover:bg-gray-200"
            >
              Não
            </button>
          </div>
        ) : !isEditing && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpen}
              className="flex-1 h-6 text-[10px] font-semibold brand-gradient text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              Abrir canvas
            </button>
            <button
              onClick={onStartEdit}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={onStartDelete}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SpaceDetailPage() {
  const router  = useRouter();
  const params  = useParams();
  const spaceId = params.id as string;

  const [space,     setSpace]     = useState<SpaceDetail | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowMeta[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  // Space rename
  const [editingSpace, setEditingSpace] = useState(false);
  const [spaceName,    setSpaceName]    = useState("");
  const [savingSpace,  setSavingSpace]  = useState(false);

  // Workflow create
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating,   setCreating]   = useState(false);

  // Workflow edit/delete (one at a time)
  const [editingWfId,  setEditingWfId]  = useState<string | null>(null);
  const [editWfName,   setEditWfName]   = useState("");
  const [deleteWfId,   setDeleteWfId]   = useState<string | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── Data helpers ────────────────────────────────────────────────────────────

  function sortedWorkflows(map: Record<string, WorkflowMeta>): WorkflowMeta[] {
    return Object.values(map).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async function patchWorkflows(updated: Record<string, WorkflowMeta>) {
    const res = await fetch(`/api/spaces/${spaceId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ canvasData: { workflows: updated } }),
    });
    if (!res.ok) throw new Error("patch failed");
    // Update local canvasData mirror so subsequent operations read fresh data
    setSpace((s) => {
      if (!s) return s;
      const existing = (s.canvasData ?? {}) as CanvasLike;
      return { ...s, canvasData: { ...existing, workflows: updated } };
    });
    setWorkflows(sortedWorkflows(updated));
  }

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadSpace = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/spaces/${spaceId}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error();
      const data: SpaceDetail = await res.json();
      setSpace(data);
      setSpaceName(data.name);
      setWorkflows(sortedWorkflows(getWorkflows(data.canvasData)));
    } catch {
      toast.error("Erro ao carregar Space");
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => { loadSpace(); }, [loadSpace]);

  // ── Space rename ────────────────────────────────────────────────────────────

  async function handleRenameSpace() {
    const name = spaceName.trim();
    if (!name) { cancelSpaceEdit(); return; }
    if (name === space?.name) { setEditingSpace(false); return; }
    setSavingSpace(true);
    try {
      const res = await fetch(`/api/spaces/${spaceId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      setSpace((s) => s ? { ...s, name } : s);
      setEditingSpace(false);
    } catch {
      toast.error("Erro ao renomear Space");
    } finally {
      setSavingSpace(false);
    }
  }

  function cancelSpaceEdit() {
    setSpaceName(space?.name ?? "");
    setEditingSpace(false);
  }

  // ── Workflow CRUD ────────────────────────────────────────────────────────────

  async function handleCreateWorkflow() {
    const name = createName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const id    = genId();
      const newWf: WorkflowMeta = { id, name, createdAt: new Date().toISOString() };
      const current = getWorkflows(space?.canvasData);
      await patchWorkflows({ ...current, [id]: newWf });
      setCreateName("");
      setShowCreate(false);
      toast.success("Ambiente criado");
    } catch {
      toast.error("Erro ao criar ambiente");
    } finally {
      setCreating(false);
    }
  }

  async function handleRenameWorkflow(wf: WorkflowMeta) {
    const name = editWfName.trim();
    if (!name) { setEditingWfId(null); return; }
    if (name === wf.name) { setEditingWfId(null); return; }
    try {
      const current = getWorkflows(space?.canvasData);
      await patchWorkflows({ ...current, [wf.id]: { ...wf, name } });
      setEditingWfId(null);
    } catch {
      toast.error("Erro ao renomear ambiente");
    }
  }

  async function handleDeleteWorkflow(wfId: string) {
    setDeleting(true);
    try {
      const current = { ...getWorkflows(space?.canvasData) };
      delete current[wfId];
      await patchWorkflows(current);
      setDeleteWfId(null);
      toast.success("Ambiente removido");
    } catch {
      toast.error("Erro ao remover ambiente");
    } finally {
      setDeleting(false);
    }
  }

  function handleOpenWorkflow(wfId: string) {
    router.push(`/app/spaces/${spaceId}/canvas/${wfId}`);
  }

  // ── Render states ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar breadcrumb={[{ label: "Spaces", href: "/app/spaces" }, { label: "..." }]} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
        </div>
      </div>
    );
  }

  if (notFound || !space) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar breadcrumb={[{ label: "Spaces", href: "/app/spaces" }, { label: "Não encontrado" }]} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-[var(--text-muted)] text-sm">Space não encontrado.</p>
          <Link href="/app/spaces" className="text-sm font-medium text-[var(--color-brand)] hover:underline">
            Voltar para Spaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[
        { label: "Spaces", href: "/app/spaces" },
        { label: space.name },
      ]} />

      <div className="flex-1 p-6 max-w-5xl space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/app/spaces"
              className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {editingSpace ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSpace();
                    if (e.key === "Escape") cancelSpaceEdit();
                  }}
                  className="border border-[var(--border-default)] rounded-lg px-2 py-0.5 text-xl font-bold text-[var(--text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] w-64"
                />
                <button
                  onClick={handleRenameSpace}
                  disabled={savingSpace}
                  className="p-1 rounded text-green-600 hover:bg-green-50 shrink-0"
                >
                  {savingSpace
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" />}
                </button>
                <button onClick={cancelSpaceEdit} className="p-1 rounded text-gray-400 hover:bg-gray-100 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingSpace(true)}
                className="group flex items-center gap-2 text-xl font-bold text-[var(--text-primary)] hover:text-[var(--color-brand)] transition-colors min-w-0"
              >
                <span className="truncate">{space.name}</span>
                <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </button>
            )}
          </div>

          <button
            onClick={() => { setCreateName(""); setShowCreate(true); }}
            className="h-9 px-4 flex items-center gap-2 rounded-xl brand-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Ambiente
          </button>
        </div>

        {/* Workflow grid / empty state */}
        {workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[var(--border-default)] rounded-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
              <Layout className="w-7 h-7 text-purple-600" />
            </div>
            <h2 className="font-bold text-[var(--text-primary)] mb-1">Nenhum ambiente ainda</h2>
            <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-5">
              Crie ambientes para organizar seus fluxos de renderização — Sala, Cozinha, Fachada...
            </p>
            <button
              onClick={() => { setCreateName(""); setShowCreate(true); }}
              className="h-9 px-5 rounded-xl brand-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Criar primeiro ambiente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {workflows.map((wf) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                isEditing={editingWfId === wf.id}
                editName={editWfName}
                isDeletePending={deleteWfId === wf.id}
                isDeleting={deleting}
                onStartEdit={() => { setEditingWfId(wf.id); setEditWfName(wf.name); setDeleteWfId(null); }}
                onEditName={(n) => setEditWfName(n)}
                onSaveEdit={() => handleRenameWorkflow(wf)}
                onCancelEdit={() => setEditingWfId(null)}
                onStartDelete={() => { setDeleteWfId(wf.id); setEditingWfId(null); }}
                onConfirmDelete={() => handleDeleteWorkflow(wf.id)}
                onCancelDelete={() => setDeleteWfId(null)}
                onOpen={() => handleOpenWorkflow(wf.id)}
              />
            ))}

            {/* Inline add card */}
            <button
              onClick={() => { setCreateName(""); setShowCreate(true); }}
              className="flex flex-col items-center justify-center gap-2 h-40 border-2 border-dashed border-[var(--border-default)] rounded-2xl text-[var(--text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs font-medium">Novo Ambiente</span>
            </button>
          </div>
        )}
      </div>

      {/* Create workflow modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-[var(--text-primary)] mb-1">Novo Ambiente</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Qual cômodo ou área deste projeto?
            </p>
            <input
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateWorkflow();
                if (e.key === "Escape") setShowCreate(false);
              }}
              placeholder="Ex: Sala de Estar, Fachada, Cozinha..."
              className="w-full border border-[var(--border-default)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="h-9 px-4 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)] rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateWorkflow}
                disabled={!createName.trim() || creating}
                className="h-9 px-4 text-sm font-semibold brand-gradient text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
