import { auth, currentUser }  from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma }    from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

async function getDbUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const clerk  = await currentUser();
  const email  = clerk?.emailAddresses[0]?.emailAddress ?? "";
  let user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId, email, name: clerk?.fullName ?? null },
    });
  }
  return user;
}

// ── GET /api/assistant/analyses?spaceId=xxx&limit=20 ────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await getDbUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const spaceId  = searchParams.get("spaceId") ?? undefined;
    const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
    const limit    = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));

    const analyses = await prisma.promptAnalysis.findMany({
      where:   { userId: user.id, ...(spaceId ? { spaceId } : {}) },
      orderBy: { createdAt: "desc" },
      take:    limit,
      select: {
        id:                     true,
        spaceId:                true,
        imageUrl:               true,
        imageName:              true,
        prompt:                 true,
        imageSummary:           true,
        qualityScore:           true,
        recommendedModel:       true,
        recommendedAspectRatio: true,
        suggestions:            true,
        createdAt:              true,
        space: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ analyses });
  } catch (err) {
    console.error("[GET /api/assistant/analyses]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ── POST /api/assistant/analyses — save analysis + optional R2 upload ────────

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES     = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const user = await getDbUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();

    const spaceId              = (form.get("spaceId")              as string | null) ?? null;
    const prompt               = (form.get("prompt")               as string | null) ?? "";
    const imageSummary         = (form.get("imageSummary")         as string | null) ?? null;
    const qualityScoreRaw      = form.get("qualityScore");
    const qualityScore         = Math.min(100, Math.max(0, parseInt(String(qualityScoreRaw ?? "0"), 10)));
    const recommendedModel     = (form.get("recommendedModel")     as string | null) ?? "";
    const recommendedAspectRatio = (form.get("recommendedAspectRatio") as string | null) ?? "16:9";
    const suggestionsRaw       = (form.get("suggestions")          as string | null) ?? "[]";
    const imageFile            = form.get("image") as File | null;
    const imageName            = (form.get("imageName")            as string | null) ?? null;

    let suggestions: string[] = [];
    try { suggestions = JSON.parse(suggestionsRaw); } catch { /* keep [] */ }
    if (!Array.isArray(suggestions)) suggestions = [];

    if (!prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // ── Optional R2 upload ──────────────────────────────────────────────────
    let imageUrl: string | null = null;

    if (imageFile && imageFile.size > 0) {
      if (!ALLOWED_TYPES.has(imageFile.type)) {
        return NextResponse.json({ error: "Tipo de imagem não suportado." }, { status: 400 });
      }
      if (imageFile.size > MAX_BYTES) {
        return NextResponse.json({ error: "Imagem muito grande. Máx: 5 MB." }, { status: 400 });
      }
      const ext    = imageFile.type.split("/")[1] ?? "jpg";
      const key    = `prompt-analyses/${user.id}/${Date.now()}.${ext}`;
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      imageUrl     = await uploadToR2(key, buffer, imageFile.type);
    }

    const analysis = await prisma.promptAnalysis.create({
      data: {
        userId:                user.id,
        spaceId:               spaceId || null,
        imageUrl,
        imageName:             imageName || null,
        prompt:                prompt.trim(),
        imageSummary:          imageSummary || null,
        qualityScore,
        recommendedModel,
        recommendedAspectRatio,
        suggestions,
      },
    });

    return NextResponse.json({ analysis }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/assistant/analyses]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
