"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Bot, Send, Sparkles, User, Upload, X, Copy, Check,
  ImagePlus, ArrowRight, RefreshCw, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import type { PromptArchitectResponse } from "@/lib/assistant/prompt-architect";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id:           string;
  role:         "user" | "assistant";
  content:      string;
  imagePreview?: string;
  result?:      PromptArchitectResponse;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES     = 5 * 1024 * 1024;

const STARTERS = [
  "Analise minha referência e crie um prompt",
  "Gere prompt para sala moderna minimalista",
  "Prompt para fachada contemporânea ao pôr do sol",
  "Interior de escritório com luz natural e concreto exposto",
];

// ── PromptBlock — copiable result ─────────────────────────────────────────────

function PromptBlock({
  result,
  onRefine,
  onClear,
}: {
  result: PromptArchitectResponse;
  onRefine: (prompt: string) => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function copyPrompt() {
    navigator.clipboard.writeText(result.prompt).then(() => {
      setCopied(true);
      toast.success("Prompt copiado!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function sendToGenerator() {
    router.push(`/app/ai-image-generator?prompt=${encodeURIComponent(result.prompt)}`);
  }

  return (
    <div className="space-y-3 w-full">
      {/* Prompt copiável */}
      <div className="rounded-xl border border-[var(--border-default)] bg-white overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Prompt Gerado
          </span>
          <button
            onClick={copyPrompt}
            className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--color-brand)] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <p className="px-3 py-3 text-sm font-mono text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
          {result.prompt}
        </p>
      </div>

      {/* Análise da imagem */}
      {result.imageSummary && (
        <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
            Análise da Imagem
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{result.imageSummary}</p>
        </div>
      )}

      {/* Sugestões */}
      {result.suggestions.length > 0 && (
        <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Sugestões de Refinamento
          </p>
          <ul className="space-y-1">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                <span className="text-[var(--color-brand)] mt-0.5 shrink-0">·</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags: modelo + ratio */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
          Modelo: {result.recommendedModel}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-zinc-50 text-zinc-500 border border-zinc-100 font-medium">
          Ratio: {result.recommendedAspectRatio}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={copyPrompt}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-white hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-all"
        >
          <Copy className="w-3 h-3" />
          Copiar prompt
        </button>

        <button
          onClick={sendToGenerator}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-brand)] text-white hover:opacity-90 transition-opacity"
        >
          <ArrowRight className="w-3 h-3" />
          Gerar Imagem
        </button>

        <button
          onClick={() => onRefine(result.prompt)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-white hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Refinar
        </button>

        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-100 bg-white text-red-400 hover:bg-red-50 transition-all"
        >
          <Trash2 className="w-3 h-3" />
          Limpar
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [image, setImage]       = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Image handling ──────────────────────────────────────────────────────────

  const applyImage = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo não suportado. Use JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande. Máximo: 5 MB.");
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }, [imagePreview]);

  function removeImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) applyImage(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyImage(file);
  }

  // ── Send ────────────────────────────────────────────────────────────────────

  async function handleSend(text = input) {
    const content = text.trim();
    if ((!content && !image) || loading) return;

    setInput("");
    const previewForMsg = imagePreview;

    const userMsg: Message = {
      id:           `u-${Date.now()}`,
      role:         "user",
      content:      content || "📎 Imagem enviada",
      imagePreview: previewForMsg ?? undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const form = new FormData();
      form.append("mode", image ? "image_to_prompt" : "chat");
      if (content) form.append("message", content);
      if (image)   form.append("image", image);

      // Clear image after submitting
      removeImage();

      const res = await fetch("/api/assistant/prompt-architect", {
        method: "POST",
        body:   form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const result = await res.json() as PromptArchitectResponse;

      setMessages((prev) => [
        ...prev,
        {
          id:      `a-${Date.now()}`,
          role:    "assistant",
          content: result.prompt,
          result,
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        {
          id:      `a-${Date.now()}`,
          role:    "assistant",
          content: "Desculpe, ocorreu um erro. Tente novamente.",
        },
      ]);
    }

    setLoading(false);
  }

  function handleRefine(prompt: string) {
    setInput(`Refine este prompt para torná-lo mais detalhado: ${prompt}`);
    textareaRef.current?.focus();
  }

  function handleClear() {
    setMessages([]);
    setInput("");
    removeImage();
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen">
      <TopBar breadcrumb={[{ label: "Prompt Architect" }]} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex flex-col flex-1 min-h-0 max-w-2xl w-full mx-auto px-4">

        {/* ── Messages ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-6 space-y-4">

          {/* Empty state */}
          {isEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center pt-8"
            >
              <div className="w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center mb-4">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-bold text-lg text-[var(--text-primary)] mb-1">Prompt Architect</h2>
              <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs">
                Envie uma imagem de referência ou descreva o ambiente — gero o prompt profissional para renderização.
              </p>

              {/* Upload zone (empty state) */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer mb-5 p-6 flex flex-col items-center gap-2 ${
                  dragOver
                    ? "border-[var(--color-brand)] bg-indigo-50"
                    : "border-[var(--border-default)] hover:border-[var(--color-brand)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                {imagePreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-auto rounded-xl object-cover shadow-sm"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">{image?.name}</p>
                  </div>
                ) : (
                  <>
                    <ImagePlus className="w-7 h-7 text-[var(--text-muted)]" />
                    <p className="text-sm font-medium text-[var(--text-secondary)]">
                      Arraste ou clique para carregar imagem
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">JPG, PNG, WebP, GIF — máx. 5 MB</p>
                  </>
                )}
              </div>

              {/* Suggestion cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-white hover:border-[var(--color-brand)] hover:shadow-[var(--shadow-card)] transition-all text-xs text-[var(--text-secondary)]"
                  >
                    <Sparkles className="w-3 h-3 text-[var(--color-brand)] inline mr-1.5 mb-0.5" />
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message thread */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === "assistant" ? "brand-gradient" : "bg-[var(--bg-secondary)]"
                }`}>
                  {msg.role === "assistant"
                    ? <Bot  className="w-3.5 h-3.5 text-white" />
                    : <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                </div>

                {/* Bubble */}
                {msg.role === "user" ? (
                  <div className="max-w-[80%] space-y-1.5">
                    {msg.imagePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={msg.imagePreview}
                        alt="Referência enviada"
                        className="max-h-40 w-auto rounded-xl object-cover shadow-sm ml-auto block"
                      />
                    )}
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed bg-[var(--color-brand)] text-white">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[88%] px-3.5 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                    {msg.result ? (
                      <PromptBlock
                        result={msg.result}
                        onRefine={handleRefine}
                        onClear={handleClear}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-7 h-7 rounded-full brand-gradient flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-secondary)] flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Image preview strip (active conversation) ─────────────────── */}
        {imagePreview && !isEmpty && (
          <div className="shrink-0 mb-2 flex items-center gap-2 p-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Imagem selecionada"
              className="h-10 w-10 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-secondary)] truncate">{image?.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {image ? `${(image.size / 1024).toFixed(0)} KB` : ""}
              </p>
            </div>
            <button
              onClick={removeImage}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-white hover:text-red-500 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Input bar ────────────────────────────────────────────────────── */}
        <div className="pb-4 shrink-0">
          <div className="flex items-end gap-2 p-1.5 rounded-2xl border border-[var(--border-default)] bg-white focus-within:border-[var(--color-brand)] transition-colors">
            {/* Upload icon button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Carregar imagem"
              className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--color-brand)] hover:bg-[var(--bg-secondary)] transition-all"
            >
              <Upload className="w-4 h-4" />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder={image ? "Adicione instruções ou envie diretamente..." : "Descreva o ambiente ou carregue uma imagem..."}
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none max-h-32 overflow-y-auto"
            />

            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !image) || loading}
              className="w-8 h-8 flex items-center justify-center rounded-xl brand-gradient text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-[var(--text-muted)] mt-1.5">
            Enter para enviar · Shift+Enter para nova linha · ícone de upload para imagem
          </p>
        </div>
      </div>
    </div>
  );
}
