import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { logAndSanitize } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Read FAL_KEY at request time — do not capture at module load (stale value risk)
    if (!process.env.FAL_KEY) {
      console.error("[POST /api/upload] FAL_KEY não configurada");
      return NextResponse.json({ error: "Serviço de upload não configurado (FAL_KEY ausente)" }, { status: 500 });
    }

    // Recreate client per-request so credentials are always fresh
    fal.config({ credentials: process.env.FAL_KEY });

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Accept by MIME type OR extension (WhatsApp / system drag-and-drop may omit MIME)
    const isImageMime = file.type.startsWith("image/");
    const isImageExt  = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    if (!isImageMime && !isImageExt) {
      return NextResponse.json(
        { error: `Apenas imagens são aceitas (tipo recebido: "${file.type || "vazio"}", nome: "${file.name}")` },
        { status: 400 }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Imagem muito grande (máx 20 MB)" }, { status: 400 });
    }

    // Materialize stream-backed File into in-memory Blob before FAL upload.
    // Next.js Route Handler File objects are backed by ReadableStream; passing them
    // directly as a fetch PUT body can exhaust the stream mid-upload.
    // Blob is always available in Node.js 18+ and Vercel's runtime.
    const arrayBuffer = await file.arrayBuffer();
    const mimeType    = file.type || "image/jpeg";
    const blob        = new Blob([arrayBuffer], { type: mimeType });

    const url = await fal.storage.upload(blob);

    return NextResponse.json({ url });
  } catch (error) {
    const friendly = logAndSanitize("POST /api/upload", error);
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
