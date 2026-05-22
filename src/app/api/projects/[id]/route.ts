import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/credits";

export const dynamic = "force-dynamic";

async function getProjectAndVerify(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } });
}

const updateSchema = z.object({
  name:  z.string().min(1).max(80).trim().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// PATCH /api/projects/[id] — rename / recolor
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user      = await getOrCreateUser(clerkId, email);
    const { id }    = await params;

    const project = await getProjectAndVerify(id, user.id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const updated = await prisma.project.update({
      where: { id },
      data:  parsed.data,
      include: { _count: { select: { generations: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/projects/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — delete folder (generations become unassigned)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user      = await getOrCreateUser(clerkId, email);
    const { id }    = await params;

    const project = await getProjectAndVerify(id, user.id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
