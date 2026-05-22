import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/credits";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  // null = remove from folder; string = assign to project
  projectId: z.string().nullable(),
});

// PATCH /api/generations/[id] — move to / remove from project
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user      = await getOrCreateUser(clerkId, email);
    const { id }    = await params;

    // Verify ownership
    const gen = await prisma.generation.findFirst({ where: { id, userId: user.id } });
    if (!gen) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body   = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // If assigning to a project, verify the project belongs to this user
    if (parsed.data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: parsed.data.projectId, userId: user.id },
      });
      if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    const updated = await prisma.generation.update({
      where: { id },
      data:  { projectId: parsed.data.projectId },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/generations/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
