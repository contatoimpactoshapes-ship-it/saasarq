"use client";

/**
 * ImageEditor — inpainting modal
 *
 * Flow:
 *  1. User opens with a generated image URL
 *  2. Paints a mask with the brush (pink overlay = areas to change)
 *  3. Types a prompt describing what to put there
 *  4. Clicks Generate → uploads mask → calls /api/generate/inpaint → polls status
 *  5. Result appears in history strip; user can pick any version and Save
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { X, Download, Loader2, Eraser, Paintbrush, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

// We upload the mask via our own /api/upload route (keeps FAL key server-side)
async function uploadMaskBlob(blob: Blob): Promise<string> {
  const fd   = new FormData();
  fd.append("file", new File([blob], "mask.png", { type: "image/png" }));
  const res  = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Falha no upload da máscara");
  return data.url as string;
}

const POLL_INTERVAL = 2500;
const BRUSH_SIZES   = [8, 16, 28, 44, 64];

interface HistoryEntry {
  url:   string;
  label: string;
}

interface Props {
  imageUrl: string;
  onClose:  () => void;
  /** Called when user clicks Salvar — returns the chosen image URL */
  onSave?:  (url: string) => void;
}

export function ImageEditor({ imageUrl, onClose, onSave }: Props) {
  // ── Canvas refs ──────────────────────────────────────────────
  const containerRef  = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0, nw: 0, nh: 0 });

  // ── Brush state ──────────────────────────────────────────────
  const [brushIdx, setBrushIdx]     = useState(1); // index into BRUSH_SIZES
  const [isErasing, setIsErasing]   = useState(false);
  const [isDrawing, setIsDrawing]   = useState(false);
  const [hasMask, setHasMask]       = useState(false);

  // ── Generation state ─────────────────────────────────────────
  const [prompt, setPrompt]             = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── History: list of image URLs (first = original) ───────────
  const [history, setHistory]   = useState<HistoryEntry[]>([{ url: imageUrl, label: "Original" }]);
  const [activeIdx, setActiveIdx] = useState(0);

  // ── Image being previewed (current active entry) ─────────────
  const currentUrl = history[activeIdx]?.url ?? imageUrl;

  // ── Cleanup polling on unmount ────────────────────────────────
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  // ── Load image and size the mask canvas ───────────────────────
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = Math.min(img.naturalWidth,  840);
      const maxH = Math.min(img.naturalHeight, 540);
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
      const nw = Math.round(img.naturalWidth  * scale);
      const nh = Math.round(img.naturalHeight * scale);
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight, nw, nh });
      const canvas = maskCanvasRef.current;
      if (!canvas) return;
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      // Clear
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    img.src = currentUrl;
  // Only re-size when the base imageUrl changes (not on every preview switch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // ── Clear mask ────────────────────────────────────────────────
  function clearMask() {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasMask(false);
  }

  // ── Brush drawing helpers ─────────────────────────────────────
  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = maskCanvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  function paintAt(x: number, y: number) {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext("2d")!;
    const radius = BRUSH_SIZES[brushIdx];
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (isErasing) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(236, 72, 153, 0.65)"; // pink-500 @ 65%
    }
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    setHasMask(true);
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    const p = getCanvasPos(e);
    paintAt(p.x, p.y);
  }
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const p = getCanvasPos(e);
    paintAt(p.x, p.y);
  }
  function onMouseUp()   { setIsDrawing(false); }
  function onMouseLeave(){ setIsDrawing(false); }

  // ── Export mask as white-on-black PNG blob ────────────────────
  async function exportMask(): Promise<Blob> {
    const maskCanvas = maskCanvasRef.current!;
    const out        = document.createElement("canvas");
    out.width  = maskCanvas.width;
    out.height = maskCanvas.height;
    const ctx  = out.getContext("2d")!;

    // Black background (keep)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, out.width, out.height);

    // Where there's a stroke → white (fill)
    const maskData = maskCanvas.getContext("2d")!.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const outData  = ctx.createImageData(out.width, out.height);
    for (let i = 0; i < maskData.data.length; i += 4) {
      const alpha = maskData.data[i + 3];
      const v     = alpha > 10 ? 255 : 0;
      outData.data[i]     = v;
      outData.data[i + 1] = v;
      outData.data[i + 2] = v;
      outData.data[i + 3] = 255;
    }
    ctx.putImageData(outData, 0, 0);

    return new Promise<Blob>((resolve, reject) =>
      out.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas export falhou"))),
        "image/png"
      )
    );
  }

  // ── Generate inpainted image ──────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!hasMask) { toast.error("Pincele uma área na imagem primeiro"); return; }
    if (!prompt.trim()) { toast.error("Descreva o que colocar na área selecionada"); return; }
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      // 1. Export mask
      const maskBlob = await exportMask();

      // 2. Upload mask
      let maskUrl: string;
      try {
        maskUrl = await uploadMaskBlob(maskBlob);
      } catch {
        toast.error("Falha ao enviar máscara");
        setIsGenerating(false);
        return;
      }

      // 3. Call inpaint API
      const res    = await fetch("/api/generate/inpaint", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ imageUrl, maskUrl, prompt: prompt.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Erro ao gerar");
        setIsGenerating(false);
        return;
      }

      const generationId = result.generationId as string;
      const versionLabel = `v${history.length}`;

      // 4. Poll status
      let errCount = 0;
      pollingRef.current = setInterval(async () => {
        try {
          const sr   = await fetch(`/api/generate/${generationId}/status`);
          if (!sr.ok) {
            errCount++;
            if (errCount > 3) {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              setIsGenerating(false);
              toast.error("Erro crítico na comunicação com o servidor de IA.");
            }
            return;
          }
          errCount = 0; // reseta contador em caso de sucesso na request
          const sd   = await sr.json();
          if (sd.status === "COMPLETED" && sd.outputUrls?.[0]) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            const newUrl = sd.outputUrls[0] as string;
            setHistory((prev) => [...prev, { url: newUrl, label: versionLabel }]);
            setActiveIdx((prev) => prev + 1); // auto-select new version
            clearMask();
            setIsGenerating(false);
            toast.success("Edição concluída!");
          } else if (sd.status === "FAILED") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setIsGenerating(false);
            toast.error(sd.error ?? "Falha na edição. Créditos reembolsados.");
          }
        } catch { /* keep polling */ }
      }, POLL_INTERVAL);
    } catch (err) {
      setIsGenerating(false);
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMask, prompt, isGenerating, imageUrl, history.length]);

  const brushSize = BRUSH_SIZES[brushIdx];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-w-4xl max-h-[95vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-3">
            <Paintbrush className="w-4 h-4 text-[var(--color-brand)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Editor de imagens</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Canvas area ── */}
        <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center bg-[#f0f0f2] p-4 min-h-0">
          <div
            className="relative select-none"
            style={{ width: imgSize.nw || "auto", height: imgSize.nh || "auto" }}
          >
            {/* Base image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUrl}
              alt="Editar"
              draggable={false}
              crossOrigin="anonymous"
              className="block rounded-xl shadow-lg"
              style={{ width: imgSize.nw || "auto", height: imgSize.nh || "auto", maxWidth: "100%" }}
            />

            {/* Mask canvas overlay */}
            <canvas
              ref={maskCanvasRef}
              className="absolute inset-0 rounded-xl"
              style={{
                width:   imgSize.nw || "100%",
                height:  imgSize.nh || "100%",
                cursor:  isErasing ? "cell" : "crosshair",
                touchAction: "none",
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseLeave}
            />

            {/* Generating overlay */}
            {isGenerating && (
              <div className="absolute inset-0 rounded-xl bg-black/50 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <p className="text-white text-sm font-semibold">Gerando edição...</p>
                <p className="text-white/60 text-xs">120 cr · ~15–30s</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom controls ── */}
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-white">

          {/* Prompt row */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-subtle)]">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="O que você quer mudar? Ex: adicionar abajure dourado na mesa lateral..."
              disabled={isGenerating}
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              className="flex-1 h-9 rounded-xl border border-[var(--border-default)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !hasMask || !prompt.trim()}
              className="h-9 px-4 brand-gradient text-white text-sm font-semibold rounded-xl flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 shrink-0"
            >
              {isGenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                : <>✦ Gerar</>
              }
            </button>
          </div>

          {/* Brush tools row */}
          <div className="flex items-center gap-3 px-4 py-2.5">
            {/* Draw / Erase toggle */}
            <div className="flex rounded-xl border border-[var(--border-default)] overflow-hidden">
              <button
                onClick={() => setIsErasing(false)}
                className={`flex items-center gap-1.5 px-3 h-8 text-xs font-semibold transition-colors ${
                  !isErasing ? "bg-[var(--color-brand)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5" />
                Substituir
              </button>
              <button
                onClick={() => setIsErasing(true)}
                className={`flex items-center gap-1.5 px-3 h-8 text-xs font-semibold transition-colors border-l border-[var(--border-default)] ${
                  isErasing ? "bg-[var(--color-brand)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                Apagar
              </button>
            </div>

            {/* Brush size */}
            <div className="flex items-center gap-1.5">
              {BRUSH_SIZES.map((sz, i) => (
                <button
                  key={sz}
                  onClick={() => setBrushIdx(i)}
                  title={`${sz}px`}
                  className={`flex items-center justify-center rounded-full border transition-all ${
                    brushIdx === i
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)]/10"
                      : "border-[var(--border-default)] hover:border-[var(--color-brand)]/50"
                  }`}
                  style={{ width: 28, height: 28 }}
                >
                  <div
                    className={`rounded-full ${brushIdx === i ? "bg-[var(--color-brand)]" : "bg-[var(--text-muted)]"}`}
                    style={{ width: Math.max(4, sz / 5), height: Math.max(4, sz / 5) }}
                  />
                </button>
              ))}
              <span className="text-[10px] text-[var(--text-muted)] font-mono ml-1">{brushSize}px</span>
            </div>

            {/* Clear mask */}
            {hasMask && (
              <button
                onClick={clearMask}
                className="flex items-center gap-1 px-2.5 h-8 rounded-xl border border-[var(--border-default)] text-xs text-[var(--text-muted)] hover:text-red-500 hover:border-red-200 transition-colors ml-auto"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>

          {/* History strip + Save */}
          <div className="flex items-center gap-2 px-4 pb-3">
            {/* Scroll left */}
            {history.length > 4 && (
              <button
                onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Thumbnails */}
            <div className="flex gap-1.5 flex-1 overflow-hidden">
              {history.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  title={entry.label}
                  className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    activeIdx === i
                      ? "border-[var(--color-brand)] shadow-md"
                      : "border-[var(--border-subtle)] hover:border-[var(--color-brand)]/50"
                  }`}
                  style={{ width: 56, height: 40 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.url}
                    alt={entry.label}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold py-0.5 ${
                    activeIdx === i ? "bg-[var(--color-brand)] text-white" : "bg-black/40 text-white"
                  }`}>
                    {entry.label}
                  </div>
                </button>
              ))}
            </div>

            {history.length > 4 && (
              <button
                onClick={() => setActiveIdx((i) => Math.min(history.length - 1, i + 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Actions */}
            <div className="flex gap-1.5 shrink-0 ml-2">
              <a
                href={currentUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              {onSave && (
                <button
                  onClick={() => { onSave(currentUrl); onClose(); }}
                  disabled={activeIdx === 0}
                  className="h-8 px-4 brand-gradient text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-40"
                >
                  Salvar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hint */}
      <p className="mt-2 text-white/40 text-[11px] text-center select-none">
        Pincele a área que quer mudar → descreva → Gerar · 120 cr por edição
      </p>
    </div>
  );
}
