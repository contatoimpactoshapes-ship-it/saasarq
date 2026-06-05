// Browser-only: PDF → PNG (first page) and HEIC/HEIF → JPEG converters.
// Only call from client-side event handlers — never executed server-side.

export type ConversionResult = {
  file:           File;
  originalFormat: string;
  message?:       string;
};

const PDF_MIME  = "application/pdf";
const HEIC_MIMES = new Set(["image/heic", "image/heif"]);

export function needsConversion(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === PDF_MIME   || name.endsWith(".pdf")  ||
    HEIC_MIMES.has(file.type) || name.endsWith(".heic") || name.endsWith(".heif")
  );
}

export async function convertFileForUpload(file: File): Promise<ConversionResult> {
  const name = file.name.toLowerCase();

  if (file.type === PDF_MIME || name.endsWith(".pdf")) {
    return convertPdfFirstPage(file);
  }

  if (HEIC_MIMES.has(file.type) || name.endsWith(".heic") || name.endsWith(".heif")) {
    return convertHeicToJpeg(file);
  }

  return { file, originalFormat: file.type };
}

// ── PDF ───────────────────────────────────────────────────────────────────────

// Keep rendered PNG below Anthropic's 5 MB message limit.
const MAX_PNG_BYTES = 4.5 * 1024 * 1024;

async function convertPdfFirstPage(file: File): Promise<ConversionResult> {
  const pdfjs = await import("pdfjs-dist");

  // CDN worker URL, pinned to exact installed version.
  // pdfjs v6+ uses .mjs (ES module) workers.
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const bytes       = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) });
  const pdf         = await loadingTask.promise;
  const page        = await pdf.getPage(1);

  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não disponível neste navegador");

  // Start at 2× scale for quality; downscale until PNG fits under limit.
  let scale = 2.0;
  let blob: Blob | null = null;

  while (scale >= 0.75) {
    const viewport = page.getViewport({ scale });
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // pdfjs v6: render() requires both `canvas` and `canvasContext`
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Falha ao exportar canvas para PNG"))),
        "image/png",
      );
    });

    if (blob.size <= MAX_PNG_BYTES) break;
    scale -= 0.5;
  }

  // loadingTask.destroy() releases the worker transport; pdf.cleanup() frees fonts.
  await pdf.cleanup();
  await loadingTask.destroy();

  if (!blob) throw new Error("Não foi possível converter o PDF em imagem");

  const baseName  = file.name.replace(/\.pdf$/i, "");
  const converted = new File([blob], `${baseName}_p1.png`, { type: "image/png" });

  return {
    file:           converted,
    originalFormat: "application/pdf",
    message:        "PDF detectado — utilizando primeira página como referência visual.",
  };
}

// ── HEIC / HEIF ───────────────────────────────────────────────────────────────

async function convertHeicToJpeg(file: File): Promise<ConversionResult> {
  const { default: heic2any } = await import("heic2any");

  const result    = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob      = Array.isArray(result) ? result[0] : result;
  const baseName  = file.name.replace(/\.(heic|heif)$/i, "");
  const converted = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });

  return {
    file:           converted,
    originalFormat: file.type || "image/heic",
    message:        "HEIC convertido para JPEG.",
  };
}
