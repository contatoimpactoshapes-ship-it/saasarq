import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/credits";

export const dynamic = "force-dynamic";

async function resolveUser(clerkId: string) {
  const clerkUser = await currentUser();
  const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  return getOrCreateUser(clerkId, email);
}

// GET /api/spaces/[id] — fetch one space (full canvasData)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user      = await resolveUser(clerkId);
    const { id }    = await params;

    const space = await prisma.space.findFirst({ where: { id, userId: user.id } });
    if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(space);
  } catch (err) {
    console.error("[GET /api/spaces/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  name:         z.string().min(1).max(80).trim().optional(),
  canvasData:   z.record(z.unknown()).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
});

// PATCH /api/spaces/[id] — shallow-merge canvasData to preserve coexisting keys
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user   = await resolveUser(clerkId);
    const { id } = await params;

    const space = await prisma.space.findFirst({ where: { id, userId: user.id } });
    if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body   = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const updated = await prisma.space.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.thumbnailUrl !== undefined && { thumbnailUrl: parsed.data.thumbnailUrl }),
        // Shallow-merge so WorkflowEditor (which sends nodes/edges/settings) and the
        // Space detail page (which sends only workflows) can coexist without clobbering each other.
        ...(parsed.data.canvasData !== undefined && {
          canvasData: {
            ...((space.canvasData ?? {}) as Record<string, unknown>),
            ...parsed.data.canvasData,
          } as Prisma.InputJsonValue,
        }),
      },
    });

    return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt });
  } catch (err) {
    console.error("[PATCH /api/spaces/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/spaces/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user   = await resolveUser(clerkId);
    const { id } = await params;

    const space = await prisma.space.findFirst({ where: { id, userId: user.id } });
    if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.space.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/spaces/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
