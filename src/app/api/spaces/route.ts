import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/credits";

export const dynamic = "force-dynamic";

// GET /api/spaces — list spaces for current user
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user      = await getOrCreateUser(clerkId, email);

    const spaces = await prisma.space.findMany({
      where:   { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select:  { id: true, name: true, thumbnailUrl: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json(spaces);
  } catch (err) {
    console.error("[GET /api/spaces]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(80).trim().default("Workflow"),
});

// POST /api/spaces — create a new space
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user      = await getOrCreateUser(clerkId, email);

    const body   = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const space = await prisma.space.create({
      data: { name: parsed.data.name, userId: user.id, canvasData: {} },
    });

    return NextResponse.json(space, { status: 201 });
  } catch (err) {
    console.error("[POST /api/spaces]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
