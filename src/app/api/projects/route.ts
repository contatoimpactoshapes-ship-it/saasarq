import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/credits";

export const dynamic = "force-dynamic";

// GET /api/projects — list projects with generation count
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user      = await getOrCreateUser(clerkId, email);

    const projects = await prisma.project.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { generations: true } },
      },
    });

    return NextResponse.json(projects);
  } catch (err) {
    console.error("[GET /api/projects]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const createSchema = z.object({
  name:  z.string().min(1).max(80).trim(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#F97316"),
});

// POST /api/projects — create project
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const email     = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const user      = await getOrCreateUser(clerkId, email);

    const body   = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, color } = parsed.data;

    const project = await prisma.project.create({
      data: { name, color, userId: user.id },
      include: { _count: { select: { generations: true } } },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
