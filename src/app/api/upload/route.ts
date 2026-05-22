import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY! });

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Only allow image files
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Apenas imagens são aceitas" }, { status: 400 });
    }

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Imagem muito grande (máx 20MB)" }, { status: 400 });
    }

    // Upload to FAL storage — returns a persistent URL usable by FAL models
    const url = await fal.storage.upload(file);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }
}
