"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers, Plus, Pencil, Trash2, Loader2, Check, X,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { toast } from "sonner";

type SpaceItem = {
  id:           string;
  name:         string;
  thumbnailUrl: string | null;
  createdAt:    string;
  updatedAt:    string;
};

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

const CARD_GRADIENTS = [
  "from-purple-200 to-purple-100",
  "from-orange-200 to-orange-100",
  "from-blue-200 to-blue-100",
  "from-green-200 to-green-100",
  "from-pink-200 to-pink-100",
  "from-amber-200 to-amber-100",
];

function cardGradient(id: string) {
  const sum = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[sum % CARD_GRADIENTS.length];
}

// ── SpaceCard ─────────────────────────────────────────────────────────────────

function SpaceCard({
  space,
  onRename,
  onDelete,
}: {
  space:    SpaceItem;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editMode,       setEditMode]       = useState(false);
  const [editName,       setEditName]       = useState(space.name);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [saving,         setSaving]         = useState(false);

  const gradient = cardGradient(space.id);
  const letter   = space.name.charAt(0).toUpperCase();

  async function saveRename() {
    const name = editName.trim();
    if (!name) { cancelEdit(); return; }
    if (name === space.name) { setEditMode(false); return; }
    setSaving(true);
    await onRename(space.id, name);
    setSaving(false);
    setEditMode(false);
  }

  function cancelEdit() {
    setEditName(space.name);
    setEditMode(false);
  }

  async function doDelete() {
    setSaving(true);
    await onDelete(space.id);
  }

  return (
    <div className="group relative flex flex-col rounded-2xl border border-[var(--border-default)] bg-white overflow-hidden hover:border-[var(--color-brand)] hover:shadow-md transition-all">
      {/* Thumbnail */}
      <Link href={`/app/spaces/${space.id}`} className="block shrink-0">
        <div className={`h-28 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          {space.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={space.thumbnailUrl} alt={space.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl font-bold text-white/50 select-none">{letter}</span>
          )}
        </div>
      </Link>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-1.5">
        {editMode ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") cancelEdit();
              }}
              className="flex-1 min-w-0 border border-[var(--border-default)] rounded-lg px-2 py-0.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
            <button
              onClick={saveRename}
              disabled={saving}
              className="p-0.5 text-green-600 hover:bg-green-50 rounded shrink-0"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
            <button onClick={cancelEdit} className="p-0.5 text-gray-400 hover:bg-gray-100 rounded shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <Link href={`/app/spaces/${space.id}`}>
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate hover:text-[var(--color-brand)] transition-colors">
              {space.name}
            </p>
          </Link>
        )}

        <p className="text-[10px] text-[var(--text-muted)]">{fmtRelative(space.updatedAt)}</p>

        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-red-500 font-medium flex-1">Remover Space?</span>
            <button
              onClick={doDelete}
              disabled={saving}
              className="text-[10px] px-2 py-0.5 bg-red-500 text-white rounded font-medium hover:bg-red-600 disabled:opacity-50"
            >
              {saving ? "..." : "Sim"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium hover:bg-gray-200"
            >
              Não
            </button>
          </div>
        ) : !editMode && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => { setEditMode(true); setEditName(space.name); }}
              className="flex-1 h-6 text-[10px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <Pencil className="w-2.5 h-2.5" />
              Renomear
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
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

export default function SpacesPage() {
  const router = useRouter();

  const [spaces,     setSpaces]     = useState<SpaceItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName,    setNewName]    = useState("Novo Projeto");
  const [creating,   setCreating]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/spaces");
        if (!res.ok) throw new Error();
        setSpaces(await res.json());
      } catch {
        toast.error("Erro ao carregar Spaces");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function openCreate() {
    setNewName("Novo Projeto");
    setShowCreate(true);
  }

  async function createSpace() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/spaces", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const space: SpaceItem = await res.json();
      setShowCreate(false);
      router.push(`/app/spaces/${space.id}`);
    } catch {
      toast.error("Erro ao criar Space");
      setCreating(false);
    }
  }

  async function handleRename(id: string, name: string) {
    try {
      const res = await fetch(`/api/spaces/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      setSpaces((ss) => ss.map((s) => s.id === id ? { ...s, name } : s));
    } catch {
      toast.error("Erro ao renomear Space");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/spaces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSpaces((ss) => ss.filter((s) => s.id !== id));
      toast.success("Space removido");
    } catch {
      toast.error("Erro ao remover Space");
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[{ label: "Spaces" }]} />

      <div className="flex-1 p-6 max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Spaces</h1>
            {!loading && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                {spaces.length === 0
                  ? "Nenhum projeto ainda"
                  : `${spaces.length} ${spaces.length === 1 ? "projeto" : "projetos"}`}
              </p>
            )}
          </div>
          <button
            onClick={openCreate}
            className="h-9 px-4 flex items-center gap-2 rounded-xl brand-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Novo Space
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[var(--border-default)] rounded-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
              <Layers className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="font-bold text-[var(--text-primary)] mb-1">Nenhum Space ainda</h2>
            <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-6">
              Crie um Space para organizar seus projetos arquitetônicos por cliente ou obra
            </p>
            <button
              onClick={openCreate}
              className="h-9 px-5 rounded-xl brand-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Criar primeiro Space
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {spaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
            <button
              onClick={openCreate}
              className="flex flex-col items-center justify-center gap-2 h-40 border-2 border-dashed border-[var(--border-default)] rounded-2xl text-[var(--text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs font-medium">Novo Space</span>
            </button>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-[var(--text-primary)] mb-1">Novo Space</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">Nome do cliente, obra ou projeto</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createSpace();
                if (e.key === "Escape") setShowCreate(false);
              }}
              placeholder="Ex: Casa Alphaville, Escritório BH..."
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
                onClick={createSpace}
                disabled={!newName.trim() || creating}
                className="h-9 px-4 text-sm font-semibold brand-gradient text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Criar e abrir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
