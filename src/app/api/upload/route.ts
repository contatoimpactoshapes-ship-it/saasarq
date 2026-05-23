import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY! });

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.FAL_KEY) {
      console.error("[POST /api/upload] FAL_KEY env var not set");
      return NextResponse.json({ error: "Upload não configurado (FAL_KEY ausente)" }, { status: 500 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validação flexível: MIME type OU extensão do arquivo
    const isImageMime = file.type.startsWith("image/");
    const isImageExt  = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    if (!isImageMime && !isImageExt) {
      return NextResponse.json({ error: `Apenas imagens são aceitas (tipo recebido: ${file.type})` }, { status: 400 });
    }

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Imagem muito grande (máx 20MB)" }, { status: 400 });
    }

    // Materialize the Next.js stream-backed File into an in-memory Blob so
    // @fal-ai/client can use it as a fetch PUT body without stream-exhaustion errors.
    // Usamos Blob e não File pois a classe File não é global em todos os runtimes da Vercel.
    const arrayBuffer = await file.arrayBuffer();
    const mimeType    = file.type || "image/jpeg";
    const staticBlob  = new Blob([arrayBuffer], { type: mimeType });

    const url = await fal.storage.upload(staticBlob);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }
}
