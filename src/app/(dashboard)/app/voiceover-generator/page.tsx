"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Play, Square } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { GeneratorPanel } from "@/components/tools/GeneratorPanel";
import { GalleryPanel } from "@/components/tools/GalleryPanel";
import { GenerateButton } from "@/components/tools/GenerateButton";
import { useGenerationStore, type GenerationItem } from "@/stores/useGenerationStore";
import { useCreditsStore } from "@/stores/useCreditsStore";

const VOICES = [
  { id: "pt-BR-AntonioNeural", label: "Antônio", description: "Masculino, formal" },
  { id: "pt-BR-FranciscaNeural", label: "Francisca", description: "Feminino, natural" },
  { id: "pt-BR-ThalitaNeural", label: "Thalita", description: "Feminino, jovem" },
  { id: "pt-PT-DuarteNeural", label: "Duarte", description: "Masculino, PT-Portugal" },
];

const CREDIT_COST = 100;
const POLL_INTERVAL = 2000;

export default function VoiceoverPage() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("pt-BR-AntonioNeural");

  const {
    generations, isGenerating,
    addGeneration, updateGeneration,
    setIsGenerating, setCurrentId, setPollingRef,
  } = useGenerationStore();

  const { credits, decrementCredits, refreshCredits } = useCreditsStore();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasEnoughCredits = credits >= CREDIT_COST;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback((generationId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/${generationId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "COMPLETED") {
          stopPolling();
          updateGeneration(generationId, { status: "COMPLETED", outputUrls: data.outputUrls ?? [] });
          setIsGenerating(false); setCurrentId(null); setPollingRef(null);
          refreshCredits();
          toast.success("Áudio gerado!");
        } else if (data.status === "FAILED") {
          stopPolling();
          updateGeneration(generationId, { status: "FAILED", errorMessage: data.error });
          setIsGenerating(false); setCurrentId(null); setPollingRef(null);
          refreshCredits();
          toast.error(data.error ?? "Falha na geração.");
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL);
    pollingRef.current = interval;
    setPollingRef(interval);
  }, [stopPolling, updateGeneration, setIsGenerating, setCurrentId, setPollingRef, refreshCredits]);

  async function handleGenerate() {
    if (!text.trim()) { toast.error("Digite o texto para narrar."); return; }
    if (!hasEnoughCredits) { toast.error(`Necessário: ${CREDIT_COST} cr`); return; }

    setIsGenerating(true);
    const optimisticId = `opt-${Date.now()}`;
    const optimistic: GenerationItem = {
      id: optimisticId, tool: "AUDIO_TTS", model: voice,
      prompt: text, status: "PENDING", outputUrls: [],
      creditsCost: CREDIT_COST, createdAt: new Date().toISOString(),
    };
    addGeneration(optimistic);
    decrementCredits(CREDIT_COST);

    try {
      const res = await fetch("/api/generate/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Erro ao iniciar geração");
      updateGeneration(optimisticId, { id: result.generationId, status: "PROCESSING" });
      setCurrentId(result.generationId);
      startPolling(result.generationId);
    } catch (err: unknown) {
      stopPolling(); setIsGenerating(false);
      updateGeneration(optimisticId, { status: "FAILED" });
      refreshCredits();
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        breadcrumb={[
          { label: "Ferramentas", href: "/app/tools/audio" },
          { label: "Texto para Voz" },
        ]}
      />

      <div className="flex flex-1 min-h-0">
        <GeneratorPanel>
          <div className="p-4 space-y-5">
            {/* Voice */}
            <section className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Voz
              </label>
              <div className="space-y-1">
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
                      voice === v.id
                        ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5"
                        : "border-[var(--border-default)] bg-white hover:border-[var(--text-muted)]"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
                      <Play className="w-3 h-3 text-[var(--text-muted)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)] text-xs">{v.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{v.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Text */}
            <section className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Texto
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Digite o texto que será narrado..."
                disabled={isGenerating}
                rows={6}
                className="w-full resize-none rounded-xl border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-colors disabled:opacity-50"
              />
              <p className="text-[10px] text-[var(--text-muted)] text-right">
                {text.length} caracteres
              </p>
            </section>

            <GenerateButton
              onClick={handleGenerate}
              isGenerating={isGenerating}
              creditsCost={CREDIT_COST}
              hasEnoughCredits={hasEnoughCredits}
              disabled={!text.trim()}
            />
          </div>
        </GeneratorPanel>

        <GalleryPanel
          generations={generations}
          isGenerating={isGenerating}
          tabs={["Narrações", "Favoritas"]}
          tool="audio"
        />
      </div>
    </div>
  );
}
