// Browser-only: PDF → PNG (first page) and HEIC/HEIF → JPEG converters.
// Only call from client-side event handlers — never executed server-side.

export type ConversionResult = {
  file:           File;
  originalFormat: string;
  message?:       string;
};

const PDF_MIME   = "application/pdf";
const HEIC_MIMES = new Set(["image/heic", "image/heif"]);

export function needsConversion(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === PDF_MIME    || name.endsWith(".pdf")  ||
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

const MAX_PNG_BYTES      = 4.5 * 1024 * 1024; // stay under Anthropic 5 MB limit
const PDF_LOAD_TIMEOUT   = 20_000;             // ms — catches blocked CDN workers

async function convertPdfFirstPage(file: File): Promise<ConversionResult> {
  const kb = (file.size / 1024).toFixed(1);
  console.log(`[file-converter] PDF: iniciando conversão de "${file.name}" (${kb} KB)`);

  const pdfjs = await import("pdfjs-dist");

  // CDN worker URL, pinned to exact installed version.
  // pdfjs v6+ uses .mjs (ES module) workers.
  // Known limitation: may be blocked on corporate networks — shows timeout error.
  const workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  console.log(`[file-converter] PDF: worker = ${workerSrc}`);
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const bytes       = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) });

  // Race against a timeout — catches CDN-blocked / hanging workers.
  const pdf = await Promise.race([
    loadingTask.promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(
          "Tempo esgotado ao carregar PDF. " +
          "Se estiver em rede corporativa ou VPN, o CDN pode estar bloqueado — " +
          "converta o PDF para JPG antes de enviar."
        )),
        PDF_LOAD_TIMEOUT,
      ),
    ),
  ]);

  const page   = await pdf.getPage(1);
  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas 2D não disponível neste navegador");

  // Start at 2× scale; downscale automatically to stay under MAX_PNG_BYTES.
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

  // Release worker transport and font cache.
  await pdf.cleanup();
  await loadingTask.destroy();

  if (!blob) throw new Error("Não foi possível converter o PDF em imagem");

  const outKb = (blob.size / 1024).toFixed(1);
  console.log(`[file-converter] PDF: concluído — scale=${scale.toFixed(2)} saída=${outKb} KB`);

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
  const kb = (file.size / 1024).toFixed(1);
  console.log(`[file-converter] HEIC: iniciando conversão de "${file.name}" (${kb} KB)`);

  const { default: heic2any } = await import("heic2any");

  let result: Blob | Blob[];
  try {
    result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Falha ao converter HEIC: ${msg}. ` +
      "Tente abrir a imagem no app Fotos do iPhone e compartilhar como JPEG.",
    );
  }

  const blob     = Array.isArray(result) ? result[0] : result;
  const baseName = file.name.replace(/\.(heic|heif)$/i, "");
  const outKb    = (blob.size / 1024).toFixed(1);

  console.log(`[file-converter] HEIC: concluído — saída=${outKb} KB`);

  const converted = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });

  return {
    file:           converted,
    originalFormat: file.type || "image/heic",
    message:        "HEIC convertido para JPEG.",
  };
}
